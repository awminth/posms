import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeftRight, Package, AlertCircle } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { ClearableNumberInput } from '../common/ClearableNumberInput';
import { SearchableSelect } from '../common/SearchableSelect';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  defaultProductId,
}) => {
  const { branches, products, branchStocks, createStockTransfer } = usePOS();

  const defaultWarehouseId = branches.find((b) => b.type === 'WAREHOUSE')?.id || 'b-04';
  const defaultDestId = branches.find((b) => b.id !== defaultWarehouseId)?.id || 'b-01';
  const [sourceBranchId, setSourceBranchId] = useState<string>(defaultWarehouseId);
  const [destBranchId, setDestBranchId] = useState<string>(defaultDestId);
  const [productId, setProductId] = useState<string>(defaultProductId || products[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const sourceStock =
    branchStocks.find((s) => s.branchId === sourceBranchId && s.productId === productId)
      ?.quantity || 0;

  const isValidTransfer =
    sourceBranchId !== destBranchId && quantity > 0 && quantity <= sourceStock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidTransfer) return;
    createStockTransfer(sourceBranchId, destBranchId, productId, quantity, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                New Inter-Branch Stock Transfer
              </h3>
              <p className="text-xs text-slate-400">
                Move inventory between retail stores or warehouse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Source & Destination Branches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Source (Origin)
              </label>
              <SearchableSelect
                value={sourceBranchId}
                onChange={setSourceBranchId}
                options={branches.map((b) => ({
                  value: b.id,
                  label: `${b.name} (${b.code})`,
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Destination (Target)
              </label>
              <SearchableSelect
                value={destBranchId}
                onChange={setDestBranchId}
                options={branches
                  .filter((b) => b.id !== sourceBranchId)
                  .map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.code})`,
                  }))}
              />
            </div>
          </div>

          {/* Product Select */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Select Product to Transfer
            </label>
            <SearchableSelect
              value={productId}
              onChange={setProductId}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} — SKU: ${p.sku}`,
                keywords: p.sku,
              }))}
            />
          </div>

          {/* Quantity & Stock Check */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Transfer Quantity
              </label>
              <ClearableNumberInput
                integer
                min={0}
                max={sourceStock}
                value={quantity}
                onChange={setQuantity}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900"
              />
            </div>

            <div className="w-1/2 p-3 rounded-xl bg-teal-50 border border-teal-100">
              <span className="text-[11px] text-teal-700 font-semibold block">
                Available at Origin:
              </span>
              <span className="text-lg font-mono font-extrabold text-teal-950">
                {sourceStock} units
              </span>
            </div>
          </div>

          {quantity > sourceStock && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Requested quantity exceeds available stock at origin branch.</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Transfer Reason / Note
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent restock, weekly distribution, customer order..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValidTransfer}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-teal-600/30 flex items-center gap-2"
            >
              <span>Dispatch Transfer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
