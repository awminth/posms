import React, { useMemo, useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { PurchaseRecord } from '../../types/pos';
import { useLanguage } from '../../context/LanguageContext';
import { showSuccess, showWarning } from '../../utils/swal';

interface Props {
  open: boolean;
  purchase: PurchaseRecord | null;
  onClose: () => void;
}

export const PurchaseReturnModal: React.FC<Props> = ({ open, purchase, onClose }) => {
  const { processPurchaseReturn, purchaseReturns, currentUser } = usePOS();
  const { t } = useLanguage();
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Damaged / Wrong item');
  const [settlement, setSettlement] = useState<'REDUCE_CREDIT' | 'CASH_REFUND'>('REDUCE_CREDIT');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const alreadyReturned = useMemo(() => {
    const map: Record<string, number> = {};
    if (!purchase) return map;
    purchaseReturns
      .filter((r) => r.purchaseId === purchase.id)
      .forEach((r) => {
        r.items.forEach((it) => {
          map[it.productId] = (map[it.productId] || 0) + it.quantityReturned;
        });
      });
    return map;
  }, [purchase, purchaseReturns]);

  useEffect(() => {
    if (!purchase || !open) return;
    const init: Record<string, number> = {};
    purchase.items.forEach((it) => {
      const left = Math.max(0, it.quantity - (alreadyReturned[it.productId] || 0));
      init[it.productId] = left > 0 ? left : 0;
    });
    setQtyMap(init);
    setReason('Damaged / Wrong item');
    setSettlement('REDUCE_CREDIT');
    setNotes('');
  }, [purchase, open, alreadyReturned]);

  if (!open || !purchase) return null;

  const lines = purchase.items.map((it) => {
    const returned = alreadyReturned[it.productId] || 0;
    const maxQty = Math.max(0, it.quantity - returned);
    const qty = Math.min(maxQty, Math.max(0, qtyMap[it.productId] || 0));
    const refund = qty * (it.landedUnitCost || it.unitCost);
    return { ...it, returned, maxQty, qty, refund };
  });

  const totalRefund = lines.reduce((s, l) => s + l.refund, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = lines
      .filter((l) => l.qty > 0)
      .map((l) => ({ productId: l.productId, quantityReturned: l.qty }));
    if (!items.length) {
      showWarning(t('pr.select_items'), t('pr.select_qty'));
      return;
    }
    setSaving(true);
    try {
      const result = await processPurchaseReturn({
        purchaseId: purchase.id,
        items,
        settlementMethod: settlement,
        reason,
        notes,
        stockDeducted: true,
      });
      showSuccess(
        t('pr.saved'),
        `${result.returnNumber} · ${result.totalRefundAmount.toLocaleString()} MMK`
      );
      onClose();
    } catch (err: any) {
      showWarning(t('pr.failed'), err?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-rose-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            <div>
              <div className="text-sm font-extrabold">{t('pr.title')}</div>
              <div className="text-[10px] text-rose-100 font-mono">
                {purchase.purchaseNumber} · {purchase.supplierName}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-xl hover:bg-rose-500"
            title={t('prv.close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          <p className="text-[11px] text-slate-500">{t('pr.hint')}</p>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase text-slate-500 font-bold">
                  <th className="py-2 px-3">{t('pr.item')}</th>
                  <th className="py-2 px-2 text-right">{t('pr.bought')}</th>
                  <th className="py-2 px-2 text-right">{t('pr.returned')}</th>
                  <th className="py-2 px-2 text-right w-20">{t('pr.return_qty')}</th>
                  <th className="py-2 px-3 text-right">{t('pr.value')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l) => (
                  <tr key={l.productId} className={l.maxQty <= 0 ? 'opacity-40' : ''}>
                    <td className="py-2 px-3 font-semibold text-slate-800">{l.productName}</td>
                    <td className="py-2 px-2 text-right font-mono">{l.quantity}</td>
                    <td className="py-2 px-2 text-right font-mono text-slate-500">{l.returned}</td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        max={l.maxQty}
                        disabled={l.maxQty <= 0}
                        value={qtyMap[l.productId] ?? 0}
                        onChange={(e) =>
                          setQtyMap((m) => ({
                            ...m,
                            [l.productId]: Math.min(l.maxQty, Math.max(0, Number(e.target.value))),
                          }))
                        }
                        className="w-16 px-1.5 py-1 border border-slate-200 rounded-lg font-mono text-right"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                      {l.refund.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('pr.reason')}</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
              >
                <option value="Damaged / Wrong item">{t('pr.reason_damaged')}</option>
                <option value="Expired">{t('pr.reason_expired')}</option>
                <option value="Overstock / Excess">{t('pr.reason_overstock')}</option>
                <option value="Supplier agreement">{t('pr.reason_agreement')}</option>
                <option value="Other">{t('pr.reason_other')}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('pr.settlement')}</label>
              <select
                value={settlement}
                onChange={(e) => setSettlement(e.target.value as typeof settlement)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
              >
                <option value="REDUCE_CREDIT">{t('pr.settle_credit')}</option>
                <option value="CASH_REFUND">{t('pr.settle_cash')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('pr.notes')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              placeholder={t('pr.notes_ph')}
            />
          </div>

          <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 flex justify-between items-center">
            <span className="font-bold text-rose-800">{t('pr.return_value')}</span>
            <span className="font-mono font-black text-rose-900 text-sm">
              {totalRefund.toLocaleString(undefined, { maximumFractionDigits: 0 })} MMK
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || totalRefund <= 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {saving ? t('pr.saving') : t('pr.confirm')}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">By {currentUser.fullName}</p>
        </form>
      </div>
    </div>
  );
};
