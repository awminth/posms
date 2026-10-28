import React, { useEffect, useRef, useState } from 'react';
import { Printer, X, Copy, Check, RotateCcw, Pencil } from 'lucide-react';
import { toBlob } from 'html-to-image';
import { usePOS } from '../../context/POSContext';
import { PurchaseRecord } from '../../types/pos';
import { useLanguage } from '../../context/LanguageContext';
import { showToast, showSuccess, showWarning } from '../../utils/swal';
import { formatVoucherDate } from '../../utils/datetime';
import { ClearableNumberInput } from '../common/ClearableNumberInput';

interface Props {
  purchase: PurchaseRecord | null;
  onClose: () => void;
  onReturn?: (purchase: PurchaseRecord) => void;
  /** Open directly in edit mode */
  startInEdit?: boolean;
}

function paymentTypeLabel(type: string, t: (k: string) => string) {
  const map: Record<string, string> = {
    CASH_ON_DELIVERY: t('prv.pay_cash'),
    CREDIT_BILL: t('prv.pay_credit'),
    PARTIAL: t('prv.pay_partial'),
  };
  return map[type] || type;
}

export const PurchaseReceiptModal: React.FC<Props> = ({
  purchase,
  onClose,
  onReturn,
  startInEdit = false,
}) => {
  const { branches, currentBranch, products, updatePurchase } = usePOS();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(startInEdit);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const [purchaseDate, setPurchaseDate] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<
    'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL'
  >('CASH_ON_DELIVERY');
  const [paidAmount, setPaidAmount] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [editLines, setEditLines] = useState<
    { id: string; productName: string; quantity: number; unitCost: number; sellingPrice: number }[]
  >([]);

  useEffect(() => {
    setEditing(startInEdit);
  }, [startInEdit, purchase?.id]);

  useEffect(() => {
    if (!purchase) return;
    setPurchaseDate(purchase.purchaseDate || '');
    setReceivedBy(purchase.receivedBy || '');
    setNotes(purchase.notes || '');
    setPaymentType(
      (purchase.paymentType as 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL') ||
        'CASH_ON_DELIVERY'
    );
    setPaidAmount(purchase.paidAmount || 0);
    setShippingCost(purchase.shippingCost || 0);
    setEditLines(
      (purchase.items || []).map((item) => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: item.unitCost,
        sellingPrice:
          item.sellingPrice && item.sellingPrice > 0
            ? item.sellingPrice
            : products.find((p) => p.id === item.productId)?.sellingPrice || item.unitCost,
      }))
    );
  }, [purchase, products]);

  if (!purchase) return null;

  const branch =
    branches.find((b) => b.id === purchase.destBranchId) || currentBranch || branches[0];
  const currency = branch?.currency || 'MMK';
  const displayDate = formatVoucherDate(purchase.purchaseDate);
  const skuOf = (productId: string) =>
    products.find((p) => p.id === productId)?.sku ||
    products.find((p) => p.id === productId)?.barcode ||
    '';
  const displaySell = (item: PurchaseRecord['items'][number]) => {
    if (item.sellingPrice != null && item.sellingPrice > 0) return item.sellingPrice;
    return products.find((p) => p.id === item.productId)?.sellingPrice || 0;
  };

  const editSubtotal = editLines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const editTotal = editSubtotal + Math.max(0, shippingCost);
  const editPaid =
    paymentType === 'CASH_ON_DELIVERY' ? editTotal : Math.min(editTotal, Math.max(0, paidAmount));
  const editCredit = Math.max(0, editTotal - editPaid);

  const updateLine = (
    id: string,
    patch: Partial<{ quantity: number; unitCost: number; sellingPrice: number }>
  ) => {
    setEditLines((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const generateText = () => {
    const line = '--------------------------------';
    let text = `${(branch?.name || 'SHOP').toUpperCase()}\n`;
    if (branch?.address) text += `${branch.address}\n`;
    text += `${line}\n`;
    text += `${t('prv.voucher_title')}: ${purchase.purchaseNumber}\n`;
    text += `${t('prv.datetime')}: ${displayDate}\n`;
    text += `Supplier: ${purchase.supplierName}\n`;
    text += `${line}\n`;
    (purchase.items || []).forEach((item) => {
      const sell = displaySell(item);
      text += `${item.productName}\n`;
      text += `  ${t('prv.qty')} ${item.quantity} | ${t('prv.buy_cost')} ${item.unitCost.toLocaleString()} | ${t('prv.sell_price')} ${sell.toLocaleString()} | ${item.lineTotal.toLocaleString()}\n`;
    });
    text += `${line}\n`;
    text += `${t('prv.subtotal')}: ${purchase.itemsSubtotal.toLocaleString()}\n`;
    if (purchase.shippingCost > 0) {
      text += `${t('prv.shipping')}: ${purchase.shippingCost.toLocaleString()}\n`;
    }
    text += `${t('prv.total')}: ${purchase.totalAmount.toLocaleString()} ${currency}\n`;
    text += `${t('prv.paid')}: ${purchase.paidAmount.toLocaleString()}\n`;
    text += `${t('prv.credit')}: ${purchase.creditAmount.toLocaleString()}\n`;
    return text;
  };

  const handleCopy = async () => {
    const el = receiptRef.current;
    if (!el) return;
    setCopying(true);
    const plain = generateText();
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
        showToast(t('prv.copied_img'));
      } else if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${purchase.purchaseNumber}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setCopied(true);
        showToast(t('prv.saved_img'));
      } else {
        await navigator.clipboard.writeText(plain);
        setCopied(true);
        showToast(t('prv.copied_text'));
      }
    } catch {
      try {
        await navigator.clipboard.writeText(plain);
        setCopied(true);
        showToast(t('prv.copied_text'));
      } catch {
        showToast(t('prv.copy_fail'), 'error');
      }
    } finally {
      setCopying(false);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSave = async () => {
    if (editLines.some((l) => l.quantity < 1)) {
      showWarning(t('sup.voucher_update_failed'), t('prv.qty'));
      return;
    }
    setSaving(true);
    try {
      await updatePurchase(purchase.id, {
        purchaseDate,
        receivedBy: receivedBy || null,
        notes: notes || null,
        paymentType,
        shippingCost: Math.max(0, shippingCost),
        paidAmount: editPaid,
        items: editLines.map((l) => ({
          id: l.id,
          quantity: l.quantity,
          unitCost: l.unitCost,
          sellingPrice: l.sellingPrice,
        })),
      });
      showSuccess(t('sup.voucher_updated'), purchase.purchaseNumber);
      setEditing(false);
      onClose();
    } catch (err: any) {
      showWarning(t('sup.voucher_update_failed'), err?.message || purchase.purchaseNumber);
    } finally {
      setSaving(false);
    }
  };

  const iconBtn =
    'inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors cursor-pointer disabled:opacity-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[96vh]">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div>
            <div className="text-sm font-bold">
              {editing ? t('sup.edit_voucher') : t('prv.voucher_title')}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">{purchase.purchaseNumber}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`${iconBtn} border-slate-700 text-amber-300 hover:bg-slate-800`}
                title={t('sup.edit')}
              >
                <Pencil className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`${iconBtn} border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800`}
              title={t('prv.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-5 overflow-y-auto bg-slate-100/90">
          {editing ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.col_date')}</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('sup.received_by')}
                  </label>
                  <input
                    type="text"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {t('sup.payment_method')}
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => {
                      const next = e.target.value as typeof paymentType;
                      setPaymentType(next);
                      if (next === 'CASH_ON_DELIVERY') setPaidAmount(editTotal);
                      if (next === 'CREDIT_BILL') setPaidAmount(0);
                    }}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="CASH_ON_DELIVERY">{t('prv.pay_cash')}</option>
                    <option value="CREDIT_BILL">{t('prv.pay_credit')}</option>
                    <option value="PARTIAL">{t('prv.pay_partial')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('prv.paid')}</label>
                  <input
                    type="number"
                    min={0}
                    max={editTotal}
                    disabled={paymentType === 'CASH_ON_DELIVERY'}
                    value={paymentType === 'CASH_ON_DELIVERY' ? editTotal : paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono disabled:bg-slate-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t('prv.credit')}: {editCredit.toLocaleString()} {currency}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('prv.shipping')}</label>
                  <input
                    type="number"
                    min={0}
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('prv.notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-xl text-sm resize-none"
                />
              </div>
              <p className="text-[11px] text-teal-800 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2">
                {t('sup.edit_voucher_hint')}
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-[11px] min-w-[560px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left py-2 px-2">{t('prv.item')}</th>
                      <th className="text-right py-2 px-2 w-20">{t('prv.qty')}</th>
                      <th className="text-right py-2 px-2 w-24">{t('prv.buy_cost')}</th>
                      <th className="text-right py-2 px-2 w-24">{t('prv.sell_price')}</th>
                      <th className="text-right py-2 px-2 w-24">{t('prv.line_total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editLines.map((line) => (
                      <tr key={line.id} className="border-t border-slate-100">
                        <td className="py-2 px-2 font-semibold text-slate-800">{line.productName}</td>
                        <td className="py-2 px-2">
                          <ClearableNumberInput
                            integer
                            min={1}
                            value={line.quantity}
                            onChange={(n) => updateLine(line.id, { quantity: Math.max(1, n) })}
                            className="w-full px-1.5 py-1 border border-amber-200 bg-amber-50/50 rounded-lg font-mono text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <ClearableNumberInput
                            min={0}
                            value={line.unitCost}
                            onChange={(n) => updateLine(line.id, { unitCost: n })}
                            className="w-full px-1.5 py-1 border border-amber-200 bg-amber-50/50 rounded-lg font-mono text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <ClearableNumberInput
                            min={0}
                            value={line.sellingPrice}
                            onChange={(n) => updateLine(line.id, { sellingPrice: n })}
                            className="w-full px-1.5 py-1 border border-teal-200 bg-teal-50/50 rounded-lg font-mono text-right text-teal-900 font-semibold"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold">
                          {(line.quantity * line.unitCost).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/80">
                      <td colSpan={4} className="py-2 px-2 text-right text-slate-600">
                        {t('prv.subtotal')}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-semibold">
                        {editSubtotal.toLocaleString()}
                      </td>
                    </tr>
                    <tr className="bg-slate-50/80">
                      <td colSpan={4} className="py-1 px-2 text-right text-slate-600">
                        {t('prv.shipping')}
                      </td>
                      <td className="py-1 px-2 text-right font-mono">{shippingCost.toLocaleString()}</td>
                    </tr>
                    <tr className="border-t border-slate-300 bg-slate-50">
                      <td colSpan={4} className="py-2 px-2 text-right font-bold">
                        {t('prv.total')}
                      </td>
                      <td className="py-2 px-2 text-right font-mono font-black">
                        {editTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {saving ? '…' : t('sup.save_changes')}
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={receiptRef}
              id="mm-purchase-thermal-voucher"
              className="w-full bg-white shadow-md border border-slate-200 rounded-2xl text-slate-900 text-[12px] leading-relaxed overflow-hidden"
              style={{
                fontFamily:
                  '"Outfit", "Noto Sans Myanmar", "Pyidaungsu", "Myanmar Text", system-ui, sans-serif',
              }}
            >
              <div className="px-4 sm:px-5 py-5">
                <div className="text-center pb-3 mb-3 border-b border-dashed border-slate-300">
                  <div className="text-base font-bold tracking-wide uppercase leading-snug">
                    {branch?.name || 'SHOP'}
                  </div>
                  {branch?.address && (
                    <div className="text-[11px] text-slate-600 mt-1 leading-snug">{branch.address}</div>
                  )}
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {branch?.phone ? `Tel: ${branch.phone}` : ''}
                    {branch?.city ? ` · ${branch.city}` : ''}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] mb-4 pb-3 border-b border-dashed border-slate-300">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t('prv.voucher_no')}</span>
                    <span className="font-mono font-bold text-right">{purchase.purchaseNumber}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t('prv.datetime')}</span>
                    <span className="text-right">{displayDate}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t('sup.col_supplier')}</span>
                    <span className="font-semibold text-right">{purchase.supplierName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t('prv.payment')}</span>
                    <span className="text-right">{paymentTypeLabel(purchase.paymentType, t)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t('sup.received_by')}</span>
                    <span className="text-right">{purchase.receivedBy || '—'}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">{t('prv.destination')}</span>
                    <span className="text-right">{t('prv.main_store')}</span>
                  </div>
                </div>

                <div className="overflow-x-auto -mx-1">
                  <table className="w-full border-collapse text-[11px] min-w-[520px]">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="py-2 text-left font-bold">{t('prv.item')}</th>
                        <th className="py-2 text-center font-bold w-12">{t('prv.qty')}</th>
                        <th className="py-2 text-right font-bold w-16">{t('prv.buy_cost')}</th>
                        <th className="py-2 text-right font-bold w-16">{t('prv.sell_price')}</th>
                        <th className="py-2 text-right font-bold w-16">{t('prv.landed')}</th>
                        <th className="py-2 text-right font-bold w-18">{t('prv.line_total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(purchase.items || []).map((item) => {
                        const sku = skuOf(item.productId);
                        const sell = displaySell(item);
                        return (
                          <tr key={item.id} className="border-b border-dashed border-slate-200">
                            <td className="py-2.5 pr-2 align-top">
                              <div className="font-semibold text-[12px] leading-snug">
                                {item.productName}
                              </div>
                              {sku && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  SKU: {sku}
                                </div>
                              )}
                              {item.shippingAllocated > 0 && (
                                <div className="text-[10px] text-slate-400">
                                  {t('prv.ship_unit')}:{' '}
                                  {item.shippingAllocated.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 text-center align-middle font-mono font-semibold">
                              {item.quantity}
                            </td>
                            <td className="py-2.5 text-right align-middle font-mono font-semibold text-slate-800">
                              {item.unitCost.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right align-middle font-mono text-teal-800 font-bold">
                              {sell.toLocaleString()}
                            </td>
                            <td className="py-2.5 text-right align-middle font-mono text-slate-600">
                              {item.landedUnitCost.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="py-2.5 text-right align-middle font-mono font-bold">
                              {item.lineTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="border-t border-slate-400">
                        <td colSpan={5} className="pt-3 pb-0.5 text-slate-600">
                          {t('prv.subtotal')}
                        </td>
                        <td className="pt-3 pb-0.5 text-right font-mono font-semibold">
                          {purchase.itemsSubtotal.toLocaleString()}
                        </td>
                      </tr>
                      {purchase.shippingCost > 0 && (
                        <tr>
                          <td colSpan={5} className="py-0.5 text-slate-600">
                            {t('prv.shipping')}
                          </td>
                          <td className="py-0.5 text-right font-mono font-semibold">
                            {purchase.shippingCost.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t border-slate-800">
                        <td colSpan={5} className="py-2.5 font-bold text-sm">
                          {t('prv.total')}
                        </td>
                        <td className="py-2.5 text-right font-mono font-black text-sm">
                          {purchase.totalAmount.toLocaleString()} {currency}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={5} className="py-0.5 text-slate-600">
                          {t('prv.paid')}
                        </td>
                        <td className="py-0.5 text-right font-mono font-semibold text-emerald-700">
                          {purchase.paidAmount.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b border-dashed border-slate-300">
                        <td colSpan={5} className="py-0.5 pb-3 text-slate-600">
                          {t('prv.credit')}
                        </td>
                        <td className="py-0.5 pb-3 text-right font-mono font-semibold text-rose-700">
                          {purchase.creditAmount.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {purchase.notes && (
                  <div className="text-[11px] text-slate-600 pt-3 border-t border-dashed border-slate-200 mt-2">
                    <span className="font-bold text-slate-700">{t('prv.notes')}:</span>{' '}
                    {purchase.notes}
                  </div>
                )}

                <div className="text-center text-[11px] text-slate-500 pt-4">
                  {t('prv.record')}
                  <div className="mt-0.5">{t('prv.into_store')}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!editing && (
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-end gap-2 shrink-0 print:hidden">
            {onReturn && (
              <button
                type="button"
                onClick={() => onReturn(purchase)}
                className={`${iconBtn} border-rose-200 text-rose-600 hover:bg-rose-50`}
                title={t('sup.return')}
              >
                <RotateCcw className="w-4.5 h-4.5" />
              </button>
            )}
            <button
              type="button"
              disabled={copying}
              onClick={handleCopy}
              className={`${iconBtn} border-slate-200 text-slate-700 hover:bg-slate-50`}
              title={t('prv.copy')}
            >
              {copied ? (
                <Check className="w-4.5 h-4.5 text-emerald-600" />
              ) : (
                <Copy className="w-4.5 h-4.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${iconBtn} border-slate-900 bg-slate-900 text-white hover:bg-slate-800`}
              title={t('prv.print')}
            >
              <Printer className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #mm-purchase-thermal-voucher, #mm-purchase-thermal-voucher * { visibility: visible !important; }
          #mm-purchase-thermal-voucher {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
