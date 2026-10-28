import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Warehouse, X } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { PackagingUnitConfig, Product, Supplier } from '../../types/pos';
import { showSuccess, showWarning } from '../../utils/swal';
import {
  buildPackagingConfig,
  getPackLevels,
  toBaseUnits,
} from '../../utils/packaging';
import { ClearableNumberInput } from '../common/ClearableNumberInput';
import { SearchableSelect } from '../common/SearchableSelect';

const NEW_ITEM = '__new__';

type VoucherLine = {
  key: string;
  productId: string;
  qtyPrimary: number;
  qtyInter: number;
  qtyBase: number;
  unitCost: number;
  /** Sell price for this purchase batch (FIFO lot) */
  sellingPrice: number;
  // new-item draft fields
  newName: string;
  newCategoryId: string;
  unitMode: 'simple' | 'multi';
  baseUnit: string;
  primaryUnit: string;
  interUnit: string;
  interMul: number;
  baseMul: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  presetSupplierId?: string;
};

function emptyLine(defaults: {
  productId?: string;
  unitCost?: number;
  sellingPrice?: number;
  categoryId?: string;
  baseUnit?: string;
  units: { name: string }[];
}): VoucherLine {
  const u0 = defaults.units[0]?.name || 'pcs';
  const u1 = defaults.units[1]?.name || defaults.units[0]?.name || 'pack';
  const u2 = defaults.units[2]?.name || defaults.units[0]?.name || 'carton';
  const cost = defaults.unitCost || 0;
  return {
    key: `L-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: defaults.productId || '',
    qtyPrimary: 0,
    qtyInter: 0,
    qtyBase: 1,
    unitCost: cost,
    sellingPrice: defaults.sellingPrice ?? cost,
    newName: '',
    newCategoryId: defaults.categoryId || '',
    unitMode: 'simple',
    baseUnit: defaults.baseUnit || u0,
    primaryUnit: u2,
    interUnit: u1,
    interMul: 20,
    baseMul: 30,
  };
}

function linePackLevels(
  line: VoucherLine,
  product: Product | undefined
): ReturnType<typeof getPackLevels> {
  if (line.productId === NEW_ITEM) {
    if (line.unitMode !== 'multi') return null;
    return getPackLevels(null, {
      hasPackagingLevels: true,
      primaryUnit: line.primaryUnit,
      intermediateUnit: line.interUnit,
      intermediateMultiplier: line.interMul,
      baseUnit: line.baseUnit,
      baseMultiplier: line.baseMul,
    });
  }
  return getPackLevels(product);
}

export const PurchaseVoucherModal: React.FC<Props> = ({ open, onClose, presetSupplierId }) => {
  const {
    suppliers,
    products,
    categories,
    units,
    branches,
    receiveStockInward,
    addNewProduct,
    canUserPerformAction,
  } = usePOS();
  const { language, t } = useLanguage();
  const catalogCategories = categories.filter((c) => c.id !== 'all');

  const defaultWarehouseId = useMemo(() => {
    return (
      branches.find((b) => b.type === 'WAREHOUSE')?.id ||
      branches.find((b) => b.id === 'b-04')?.id ||
      branches[0]?.id ||
      'b-04'
    );
  }, [branches]);

  const [destBranchId, setDestBranchId] = useState(defaultWarehouseId);
  const [supplierId, setSupplierId] = useState(presetSupplierId || suppliers[0]?.id || '');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [shippingCost, setShippingCost] = useState(0);
  const [paymentType, setPaymentType] = useState<'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL'>(
    'CREDIT_BILL'
  );
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState<VoucherLine[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setSupplierId(presetSupplierId || suppliers[0]?.id || '');
    setDestBranchId(defaultWarehouseId);
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setShippingCost(0);
    setPaymentType('CREDIT_BILL');
    setPaidAmount(0);
    setNotes('');
    const p0 = products[0];
    const cat0 = categories.find((c) => c.id !== 'all')?.id || '';
    setLines([
      emptyLine({
        productId: p0?.id || '',
        unitCost: p0?.costPrice || 0,
        sellingPrice: p0?.sellingPrice || p0?.costPrice || 0,
        categoryId: cat0,
        baseUnit: p0?.unit || units[0]?.name || 'pcs',
        units,
      }),
    ]);
    // Reset form when modal opens / supplier preset changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presetSupplierId]);

  const supplier: Supplier | undefined = suppliers.find((s) => s.id === supplierId);

  const computedLines = useMemo(() => {
    return lines.map((line) => {
      const product =
        line.productId && line.productId !== NEW_ITEM
          ? products.find((p) => p.id === line.productId)
          : undefined;
      const levels = linePackLevels(line, product);
      const qty = toBaseUnits(levels, line.qtyPrimary, line.qtyInter, line.qtyBase);
      const lineTotal = qty * (Number(line.unitCost) || 0);
      const baseLabel = levels?.base || product?.unit || line.baseUnit || 'unit';
      return { ...line, product, levels, qty, lineTotal, baseLabel };
    });
  }, [lines, products]);

  const itemsSubtotal = computedLines.reduce((s, l) => s + l.lineTotal, 0);
  const grandTotal = itemsSubtotal + (Number(shippingCost) || 0);
  const effectivePaid =
    paymentType === 'CASH_ON_DELIVERY'
      ? grandTotal
      : paymentType === 'CREDIT_BILL'
        ? 0
        : Math.min(grandTotal, Math.max(0, Number(paidAmount) || 0));
  const creditAmount = Math.max(0, grandTotal - effectivePaid);

  if (!open) return null;

  const updateLine = (key: string, patch: Partial<VoucherLine>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.productId && patch.productId !== NEW_ITEM) {
          const p = products.find((x) => x.id === patch.productId);
          if (p) {
            next.unitCost = p.costPrice;
            next.sellingPrice = p.sellingPrice || p.costPrice;
            next.baseUnit = p.unit;
            const lv = getPackLevels(p);
            if (lv) {
              next.unitMode = 'multi';
              next.primaryUnit = lv.primary;
              next.interUnit = lv.intermediate;
              next.interMul = lv.interMul;
              next.baseMul = lv.baseMul;
              next.baseUnit = lv.base;
            } else {
              next.unitMode = 'simple';
            }
          }
        }
        return next;
      })
    );
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      emptyLine({
        productId: products[0]?.id || '',
        unitCost: products[0]?.costPrice || 0,
        sellingPrice: products[0]?.sellingPrice || products[0]?.costPrice || 0,
        categoryId: catalogCategories[0]?.id || '',
        units,
      }),
    ]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  };

  const ensureProductForLine = async (
    line: (typeof computedLines)[0]
  ): Promise<{ productId: string; productName: string; packagingConfig?: PackagingUnitConfig }> => {
    if (line.productId && line.productId !== NEW_ITEM && line.product) {
      return {
        productId: line.product.id,
        productName: line.product.name,
        packagingConfig: line.product.packagingConfig,
      };
    }

    const name = line.newName.trim();
    if (!name) throw new Error(t('pv.need_name'));
    if (!line.newCategoryId) {
      throw new Error(t('pv.need_category'));
    }
    if (!units.length && !line.baseUnit) {
      throw new Error(t('pv.need_units'));
    }

    const packagingConfig = buildPackagingConfig({
      mode: line.unitMode,
      baseUnit: line.baseUnit,
      primaryUnit: line.primaryUnit,
      interUnit: line.interUnit,
      interMul: line.interMul,
      baseMul: line.baseMul,
    });

    const sku = `SKU-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
    const created = await addNewProduct({
      name,
      sku,
      barcode: `8850${Math.floor(100000 + Math.random() * 900000)}`,
      categoryId: line.newCategoryId,
      costPrice: Number(line.unitCost) || 0,
      sellingPrice: Math.max(Number(line.sellingPrice) || Number(line.unitCost) || 0, 0),
      unit: line.baseUnit || units[0]?.name || 'pcs',
      description: name,
      imageUrl: '',
      packagingConfig,
    });

    return {
      productId: created.id,
      productName: created.name,
      packagingConfig: created.packagingConfig,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUserPerformAction('canManageInventory')) {
      showWarning(t('pv.no_permission'), t('pv.no_permission_hint'));
      return;
    }
    if (!supplier) {
      showWarning(t('pv.supplier_required'), t('pv.supplier_pick'));
      return;
    }

    setSaving(true);
    try {
      const items: {
        productId: string;
        productName: string;
        totalBaseUnitsReceived: number;
        unitCost: number;
        totalCost: number;
        sellingPrice: number;
      }[] = [];

      for (const line of computedLines) {
        if (line.qty <= 0) continue;
        const ensured = await ensureProductForLine(line);
        items.push({
          productId: ensured.productId,
          productName: ensured.productName,
          totalBaseUnitsReceived: line.qty,
          unitCost: Number(line.unitCost) || 0,
          totalCost: line.lineTotal,
          sellingPrice: Math.max(Number(line.sellingPrice) || Number(line.unitCost) || 0, 0),
        });
      }

      if (!items.length) {
        showWarning(t('pv.no_items'), t('pv.no_items_hint'));
        return;
      }

      const result = await receiveStockInward({
        supplierId: supplier.id,
        supplierName: supplier.name,
        destBranchId: destBranchId || defaultWarehouseId,
        items,
        paymentType,
        shippingCost: Number(shippingCost) || 0,
        paidAmount: effectivePaid,
        purchaseDate,
        notes: notes || `Purchase voucher — ${supplier.name}`,
      });

      showSuccess(
        t('pv.saved'),
        `${(result as any).purchaseNumber || (result as any).grnNumber || 'PO'}`
      );
      onClose();
    } catch (err: any) {
      showWarning(t('pv.failed'), err?.message || 'Save error');
    } finally {
      setSaving(false);
    }
  };

  const unitOptions =
    units.length > 0
      ? units
      : [
          { id: 'u-pcs', name: 'pcs' },
          { id: 'u-pack', name: 'pack' },
          { id: 'u-box', name: 'box' },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-teal-600 to-sky-600 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-extrabold flex items-center gap-2 text-white">
              <Warehouse className="w-4 h-4 text-white" />
              {t('pv.title')}
            </h3>
            <p className="text-[11px] text-teal-100 mt-0.5">{t('pv.subtitle')}</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">{t('pv.supplier')}</label>
              <SearchableSelect
                value={supplierId}
                onChange={setSupplierId}
                className="w-full"
                options={suppliers.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.code})`,
                  keywords: s.phone || '',
                }))}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'my' ? 'လက်ခံမည့် စတို/ဆိုင်ခွဲ' : 'Receiving Warehouse/Store'}
              </label>
              <select
                value={destBranchId}
                onChange={(e) => setDestBranchId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.type === 'WAREHOUSE' ? '(Main Store)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('pv.date')}</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono"
              />
            </div>
          </div>

          <div className="border border-teal-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="bg-teal-50 px-3 py-2 flex items-center justify-between border-b border-teal-100">
              <span className="font-extrabold text-teal-900 uppercase tracking-wide text-[10px]">
                {t('pv.lines')}
              </span>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('pv.add_line')}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {computedLines.map((line) => {
                const isNew = line.productId === NEW_ITEM;
                const levels = line.levels;
                return (
                  <div key={line.key} className="p-3 space-y-2.5 hover:bg-slate-50/80">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold">{t('pv.item')}</label>
                          <SearchableSelect
                            value={line.productId}
                            onChange={(v) => updateLine(line.key, { productId: v })}
                            placeholder={t('pv.select')}
                            className="w-full"
                            options={[
                              { value: NEW_ITEM, label: t('pv.add_new_item') },
                              ...products.map((p) => ({
                                value: p.id,
                                label: `${p.name} (${p.sku}) · ${p.unit}`,
                                keywords: `${p.sku} ${p.barcode || ''}`,
                              })),
                            ]}
                          />
                        </div>

                        {isNew && (
                          <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-2.5 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-500 font-bold">
                                  {t('pv.new_item_name')}
                                </label>
                                <input
                                  required={isNew}
                                  value={line.newName}
                                  onChange={(e) => updateLine(line.key, { newName: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                                  placeholder={language === 'my' ? 'ဥပမာ - UCC Coffee 3in1' : 'e.g. UCC Coffee 3in1'}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 font-bold">
                                  {t('pv.category')}
                                </label>
                                <SearchableSelect
                                  value={line.newCategoryId}
                                  onChange={(v) => updateLine(line.key, { newCategoryId: v })}
                                  options={catalogCategories.map((c) => ({
                                    value: c.id,
                                    label: c.name,
                                  }))}
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-500 font-bold">
                                {t('pv.unit_scheme')}
                              </label>
                              <select
                                value={line.unitMode}
                                onChange={(e) =>
                                  updateLine(line.key, {
                                    unitMode: e.target.value as 'simple' | 'multi',
                                  })
                                }
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                              >
                                <option value="simple">{t('pv.unit_simple')}</option>
                                <option value="multi">{t('pv.unit_multi')}</option>
                              </select>
                            </div>

                            {line.unitMode === 'simple' ? (
                              <div>
                                <label className="text-[10px] text-slate-500 font-bold">
                                  {t('pv.base_unit')}
                                </label>
                                <SearchableSelect
                                  value={line.baseUnit}
                                  onChange={(v) => updateLine(line.key, { baseUnit: v })}
                                  options={unitOptions.map((u) => ({
                                    value: u.name,
                                    label: u.name,
                                  }))}
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500">L1 unit</label>
                                  <SearchableSelect
                                    value={line.primaryUnit}
                                    onChange={(v) => updateLine(line.key, { primaryUnit: v })}
                                    options={unitOptions.map((u) => ({
                                      value: u.name,
                                      label: u.name,
                                    }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500">L2 unit</label>
                                  <SearchableSelect
                                    value={line.interUnit}
                                    onChange={(v) => updateLine(line.key, { interUnit: v })}
                                    options={unitOptions.map((u) => ({
                                      value: u.name,
                                      label: u.name,
                                    }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500">L3 (base)</label>
                                  <SearchableSelect
                                    value={line.baseUnit}
                                    onChange={(v) => updateLine(line.key, { baseUnit: v })}
                                    options={unitOptions.map((u) => ({
                                      value: u.name,
                                      label: u.name,
                                    }))}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500">L2 per L1</label>
                                  <ClearableNumberInput
                                    integer
                                    min={1}
                                    value={line.interMul}
                                    onChange={(n) => updateLine(line.key, { interMul: n || 1 })}
                                    className="w-full px-2 py-1.5 border rounded-lg font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500">L3 per L2</label>
                                  <ClearableNumberInput
                                    integer
                                    min={1}
                                    value={line.baseMul}
                                    onChange={(n) => updateLine(line.key, { baseMul: n || 1 })}
                                    className="w-full px-2 py-1.5 border rounded-lg font-mono"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="mt-5 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div
                      className={`grid gap-2 ${
                        levels ? 'grid-cols-2 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'
                      }`}
                    >
                      {levels ? (
                        <>
                          <div>
                            <label className="text-[10px] text-slate-500">{levels.primary}</label>
                            <ClearableNumberInput
                              integer
                              min={0}
                              value={line.qtyPrimary}
                              onChange={(n) => updateLine(line.key, { qtyPrimary: n })}
                              className="w-full px-2 py-1.5 border rounded-lg font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">{levels.intermediate}</label>
                            <ClearableNumberInput
                              integer
                              min={0}
                              value={line.qtyInter}
                              onChange={(n) => updateLine(line.key, { qtyInter: n })}
                              className="w-full px-2 py-1.5 border rounded-lg font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500">{levels.base}</label>
                            <ClearableNumberInput
                              integer
                              min={0}
                              value={line.qtyBase}
                              onChange={(n) => updateLine(line.key, { qtyBase: n })}
                              className="w-full px-2 py-1.5 border rounded-lg font-mono"
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="text-[10px] text-slate-500">
                            Qty ({line.baseLabel})
                          </label>
                          <ClearableNumberInput
                            integer
                            min={0}
                            value={line.qtyBase}
                            onChange={(n) => updateLine(line.key, { qtyBase: n })}
                            className="w-full px-2 py-1.5 border rounded-lg font-mono"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-[10px] text-slate-500">
                          {t('pv.buy_cost')} / {line.baseLabel}
                        </label>
                        <ClearableNumberInput
                          min={0}
                          value={line.unitCost}
                          onChange={(n) => updateLine(line.key, { unitCost: n })}
                          className="w-full px-2 py-1.5 border rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">{t('pv.lot_sell_price')}</label>
                        <ClearableNumberInput
                          min={0}
                          value={line.sellingPrice}
                          onChange={(n) => updateLine(line.key, { sellingPrice: n })}
                          className="w-full px-2 py-1.5 border rounded-lg font-mono border-teal-200 bg-teal-50/50"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">Line total</label>
                        <div className="px-2 py-1.5 rounded-lg bg-teal-50 border border-teal-100 font-mono font-bold text-teal-900">
                          {line.lineTotal.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          = {line.qty.toLocaleString()} {line.baseLabel}
                          {levels
                            ? ` (1 ${levels.primary} = ${levels.interMul} ${levels.intermediate} × ${levels.baseMul} ${levels.base})`
                            : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('pv.shipping')}</label>
              <ClearableNumberInput
                min={0}
                value={shippingCost}
                onChange={setShippingCost}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('pv.payment')}</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as typeof paymentType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl"
              >
                <option value="CREDIT_BILL">Credit</option>
                <option value="CASH_ON_DELIVERY">Cash</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </div>
            {paymentType === 'PARTIAL' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('pv.paid_amount')}</label>
                <ClearableNumberInput
                  min={0}
                  value={paidAmount}
                  onChange={setPaidAmount}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('pv.notes')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="rounded-2xl p-4 space-y-2 border border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/40">
            <div className="flex justify-between items-center">
              <span className="text-teal-700 font-bold text-[11px] uppercase">Items</span>
              <span className="font-mono font-semibold text-teal-950">{itemsSubtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-cyan-700 font-bold text-[11px] uppercase">Shipping</span>
              <span className="font-mono font-semibold text-cyan-800">
                +{(Number(shippingCost) || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center border-t border-teal-100 pt-2 font-bold">
              <span className="text-slate-800">Total</span>
              <span className="font-mono text-teal-900 text-sm bg-teal-100/80 px-2.5 py-1 rounded-lg">
                {grandTotal.toLocaleString()} MMK
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] pt-1">
              <span className="text-slate-500 font-bold uppercase">Paid / Credit</span>
              <span className="font-mono">
                <span className="text-emerald-700 font-semibold">{effectivePaid.toLocaleString()}</span>
                <span className="text-slate-400"> / </span>
                <span className="text-rose-700 font-semibold">{creditAmount.toLocaleString()}</span>
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !suppliers.length}
              className="px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold disabled:opacity-50"
            >
              {saving ? t('pv.saving') : t('pv.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
