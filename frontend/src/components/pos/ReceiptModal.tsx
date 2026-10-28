import React, { useState, useRef } from 'react';
import { Printer, X, Copy, Check } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { usePOS } from '../../context/POSContext';
import { Order } from '../../types/pos';
import { showToast } from '../../utils/swal';
import { formatVoucherDateTime } from '../../utils/datetime';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

/**
 * Myanmar-style sales voucher:
 * - plain header meta (no boxes)
 * - one continuous table for items + costs + tax + paid + change
 */
export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
  const { branches } = usePOS();
  const [language, setLanguage] = useState<'my' | 'en'>('my');
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const branch = branches.find((b) => b.id === order.branchId) || branches[0];
  const currency = branch?.currency || 'MMK';
  const my = language === 'my';

  const paidTotal = order.payments.reduce((s, p) => s + (p.amount || 0), 0);
  const tenderedTotal = order.payments.reduce((s, p) => s + (p.amountTendered || 0), 0);
  const changeTotal = order.payments.reduce((s, p) => s + (p.changeGiven || 0), 0);
  const paymentMethods = order.payments.map((p) => paymentLabel(p.method, language)).join(', ');
  const displayDate = formatVoucherDateTime(order.createdAt);

  function paymentLabel(method: string, lang: 'my' | 'en') {
    const map: Record<string, { my: string; en: string }> = {
      CASH: { my: 'ငွေသား', en: 'Cash' },
      CREDIT: { my: 'အကြွေး', en: 'Credit' },
      KBZ_PAY: { my: 'KBZ Pay', en: 'KBZ Pay' },
      WAVE_PAY: { my: 'Wave Pay', en: 'Wave Pay' },
      AYAPAY: { my: 'AYA Pay', en: 'AYA Pay' },
      CREDIT_CARD: { my: 'ကတ်', en: 'Card' },
    };
    return map[method]?.[lang] || method.replace(/_/g, ' ');
  }

  const handlePrint = () => window.print();

  const generateReceiptText = () => {
    const line = '--------------------------------';
    let t = `${(branch?.name || 'SHOP').toUpperCase()}\n`;
    if (branch?.address) t += `${branch.address}\n`;
    if (branch?.phone) t += `Tel: ${branch.phone}\n`;
    t += `${line}\n`;
    t += `${my ? 'ဘောင်ချာ' : 'Invoice'}: ${order.orderNumber}\n`;
    t += `${my ? 'ရက်စွဲ' : 'Date'}: ${displayDate}\n`;
    t += `${my ? 'ကက်ရှီယာ' : 'Cashier'}: ${order.cashierName}\n`;
    t += `${my ? 'ကောင်တာ' : 'Terminal'}: ${order.registerName}\n`;
    if (order.customer) t += `${my ? 'ဖောက်သည်' : 'Customer'}: ${order.customer.name}\n`;
    t += `${line}\n`;
    order.items.forEach((item) => {
      const lineTotal = (item.unitPrice - (item.discount || 0)) * item.quantity;
      t += `${item.product.name}\n`;
      t += `  ${item.quantity} x ${item.unitPrice.toLocaleString()} = ${lineTotal.toLocaleString()}\n`;
    });
    t += `${line}\n`;
    t += `${my ? 'ပစ္စည်းပေါင်း' : 'Subtotal'}: ${order.subtotal.toLocaleString()}\n`;
    if (order.discountAmount > 0) {
      t += `${my ? 'လျှော့ဈေး' : 'Discount'}: -${order.discountAmount.toLocaleString()}\n`;
    }
    if (order.taxAmount > 0) {
      t += `${my ? 'အခွန်' : 'Tax'}: ${order.taxAmount.toLocaleString()}\n`;
    }
    t += `${my ? 'ပေးရမည့်ငွေ' : 'TOTAL'}: ${order.grandTotal.toLocaleString()} ${currency}\n`;
    t += `${my ? 'ပေးငွေ' : 'Paid'} (${paymentMethods}): ${paidTotal.toLocaleString()}\n`;
    if (tenderedTotal > 0) {
      t += `${my ? 'လက်ခံငွေ' : 'Tendered'}: ${tenderedTotal.toLocaleString()}\n`;
    }
    t += `${my ? 'ပြန်အမ်းငွေ' : 'Change'}: ${changeTotal.toLocaleString()}\n`;
    return t;
  };

  const handleCopyVoucher = async () => {
    const el = receiptRef.current;
    if (!el) return;
    setCopying(true);
    const plain = generateReceiptText();
    try {
      const blob = await toBlob(el, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      if (blob && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob,
              'text/plain': new Blob([plain], { type: 'text/plain' }),
            }),
          ]);
        } catch {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        }
        setCopied(true);
        showToast(my ? 'ဘောင်ချာပုံ ကူးယူပြီးပါပြီ' : 'Voucher image copied');
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${order.orderNumber}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopied(true);
        showToast(my ? 'ဘောင်ချာပုံ သိမ်းပြီးပါပြီ' : 'Voucher image saved');
      } else {
        await navigator.clipboard.writeText(plain);
        setCopied(true);
        showToast(my ? 'စာသား ကူးယူပြီးပါပြီ' : 'Text copied');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(plain);
        setCopied(true);
        showToast(my ? 'စာသား ကူးယူပြီးပါပြီ' : 'Text copied');
      } catch {
        showToast(my ? 'ကူးယူမရပါ' : 'Copy failed', 'error');
      }
    } finally {
      setCopying(false);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const iconBtn =
    'inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors cursor-pointer disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[96vh]">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div>
            <div className="text-sm font-bold">{my ? 'အရောင်းဘောင်ချာ' : 'Sales Voucher'}</div>
            <div className="text-[10px] text-slate-400 font-mono">{order.orderNumber}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLanguage(my ? 'en' : 'my')}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 min-h-[36px]"
            >
              {my ? 'EN' : 'မြန်မာ'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`${iconBtn} border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800`}
              title={my ? 'ပိတ်မည်' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 overflow-y-auto bg-slate-200/80 flex justify-center">
          <div
            ref={receiptRef}
            id="mm-thermal-voucher"
            className="w-full max-w-[340px] bg-white shadow-md border border-slate-300 text-slate-900 text-[11px] leading-relaxed"
            style={{
              fontFamily:
                '"Outfit", "Noto Sans Myanmar", "Pyidaungsu", "Myanmar Text", system-ui, sans-serif',
            }}
          >
            <div className="px-3 py-4">
              {/* Shop name — plain */}
              <div className="text-center pb-2 mb-2 border-b border-dashed border-slate-300">
                <div className="text-sm font-bold tracking-wide uppercase leading-snug">
                  {branch?.name || 'SHOP'}
                </div>
                {branch?.address && (
                  <div className="text-[10px] text-slate-600 mt-1 leading-snug">{branch.address}</div>
                )}
                <div className="text-[10px] text-slate-600 mt-0.5">
                  {branch?.phone ? `Tel: ${branch.phone}` : ''}
                  {branch?.city ? ` · ${branch.city}` : ''}
                </div>
              </div>

              {/* Meta — plain text, no boxes */}
              <div className="space-y-0.5 text-[10px] mb-3 pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{my ? 'ဘောင်ချာ နံပါတ်' : 'Invoice No'}</span>
                  <span className="font-mono font-bold text-right">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{my ? 'ရက်စွဲ / အချိန်' : 'Date / Time'}</span>
                  <span className="text-right">{displayDate}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{my ? 'ကက်ရှီယာ' : 'Cashier'}</span>
                  <span className="font-semibold text-right">{order.cashierName}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{my ? 'ကောင်တာ' : 'Terminal'}</span>
                  <span className="text-right">{order.registerName}</span>
                </div>
                {order.customer && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{my ? 'ဖောက်သည်' : 'Customer'}</span>
                    <span className="font-semibold text-right">{order.customer.name}</span>
                  </div>
                )}
              </div>

              {/* One continuous table: items + costs + tax + paid + change */}
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-1.5 text-left font-bold">{my ? 'ပစ္စည်း' : 'Item'}</th>
                    <th className="py-1.5 text-center font-bold w-10">{my ? 'အရေ' : 'Qty'}</th>
                    <th className="py-1.5 text-right font-bold w-14">{my ? 'ဈေး' : 'Price'}</th>
                    <th className="py-1.5 text-right font-bold w-16">{my ? 'ပေါင်း' : 'Amt'}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => {
                    const lineTotal = (item.unitPrice - (item.discount || 0)) * item.quantity;
                    return (
                      <tr key={`${item.product.id}-${idx}`} className="border-b border-dashed border-slate-200">
                        <td className="py-2 pr-1 align-top">
                          <div className="font-semibold text-[11px] leading-snug">{item.product.name}</div>
                          {item.product.sku && (
                            <div className="text-[9px] text-slate-400 font-mono">{item.product.sku}</div>
                          )}
                          {item.discount > 0 && (
                            <div className="text-[9px] text-rose-600">
                              {my ? 'လျှော့' : 'Disc'} -
                              {(item.discount * item.quantity).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-center align-middle font-mono font-semibold">
                          {item.quantity}
                        </td>
                        <td className="py-2 text-right align-middle font-mono">
                          {item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2 text-right align-middle font-mono font-bold">
                          {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="border-t border-slate-400">
                    <td colSpan={3} className="pt-2 pb-0.5 text-slate-600">
                      {my ? 'ပစ္စည်းပေါင်း' : 'Subtotal'}
                    </td>
                    <td className="pt-2 pb-0.5 text-right font-mono font-semibold">
                      {order.subtotal.toLocaleString()}
                    </td>
                  </tr>
                  {order.discountAmount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-0.5 text-rose-600">
                        {my ? 'လျှော့ဈေး' : 'Discount'}
                      </td>
                      <td className="py-0.5 text-right font-mono font-semibold text-rose-700">
                        -{order.discountAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  {order.taxAmount > 0 && (
                    <tr>
                      <td colSpan={3} className="py-0.5 text-slate-600">
                        {my ? 'အခွန်' : 'Tax'}
                      </td>
                      <td className="py-0.5 text-right font-mono font-semibold">
                        {order.taxAmount.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-slate-800">
                    <td colSpan={3} className="py-2 font-bold text-xs">
                      {my ? 'ပေးရမည့်ငွေ' : 'TOTAL'}
                    </td>
                    <td className="py-2 text-right font-mono font-black text-xs">
                      {order.grandTotal.toLocaleString()} {currency}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-0.5 text-slate-600">
                      {my ? 'ပေးငွေ' : 'Paid'}
                      {paymentMethods ? ` (${paymentMethods})` : ''}
                    </td>
                    <td className="py-0.5 text-right font-mono font-semibold">
                      {paidTotal.toLocaleString()}
                    </td>
                  </tr>
                  {tenderedTotal > 0 && (
                    <tr>
                      <td colSpan={3} className="py-0.5 text-slate-500">
                        {my ? 'လက်ခံငွေ' : 'Tendered'}
                      </td>
                      <td className="py-0.5 text-right font-mono">{tenderedTotal.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="border-b border-dashed border-slate-300">
                    <td colSpan={3} className="py-0.5 pb-2 text-slate-600">
                      {my ? 'ပြန်အမ်းငွေ' : 'Change'}
                    </td>
                    <td className="py-0.5 pb-2 text-right font-mono font-semibold">
                      {changeTotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="text-center text-[10px] text-slate-500 pt-3">
                {my ? 'ဝယ်ယူအားပေးမှုကို ကျေးဇူးတင်ပါသည်' : 'Thank you for your purchase'}
                <div className="mt-0.5">{my ? 'ထပ်မံလာရောက်လည်ပတ်ပါ' : 'Please come again'}</div>
                {branch?.receiptFooter && (
                  <div className="text-[9px] text-slate-400 mt-1">{branch.receiptFooter}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Copy + Print only — close is header X */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 print:hidden">
          <button
            type="button"
            disabled={copying}
            onClick={handleCopyVoucher}
            className={`${iconBtn} border-slate-200 text-slate-700 hover:bg-slate-50`}
            title={my ? 'ကူးယူမည်' : 'Copy'}
          >
            {copied ? <Check className="w-4.5 h-4.5 text-emerald-600" /> : <Copy className="w-4.5 h-4.5" />}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className={`${iconBtn} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`}
            title={my ? 'ပရင့်ထုတ်မည်' : 'Print'}
          >
            <Printer className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #mm-thermal-voucher, #mm-thermal-voucher * { visibility: visible !important; }
          #mm-thermal-voucher {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
};
