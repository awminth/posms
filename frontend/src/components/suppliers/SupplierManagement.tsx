import React, { useMemo, useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  DollarSign,
  User,
  X,
  Phone,
  Mail,
  Package,
  Eye,
  Warehouse,
  RotateCcw,
  Pencil,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { PurchaseRecord, Supplier, SupplierPayment } from '../../types/pos';
import { useLanguage } from '../../context/LanguageContext';
import { Pagination } from '../common/Pagination';
import { showSuccess, showWarning } from '../../utils/swal';
import { PurchaseVoucherModal } from './PurchaseVoucherModal';
import { PurchaseReturnModal } from './PurchaseReturnModal';
import { PurchaseReceiptModal } from './PurchaseReceiptModal';
import { formatVoucherDateTime } from '../../utils/datetime';

type Tab = 'purchases' | 'suppliers' | 'payments' | 'returns';

export const SupplierManagement: React.FC = () => {
  const {
    suppliers,
    supplierPayments,
    purchases,
    purchaseSummary,
    purchaseReturns,
    addNewSupplier,
    updateSupplier,
    settleSupplierPayment,
  } = usePOS();
  const { language, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<Tab>('purchases');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isVoucherOpen, setIsVoucherOpen] = useState(false);
  const [voucherSupplierId, setVoucherSupplierId] = useState<string | undefined>();
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [purchaseViewEdit, setPurchaseViewEdit] = useState(false);
  const [returnPurchase, setReturnPurchase] = useState<PurchaseRecord | null>(null);
  const [selectedSupplierForPay, setSelectedSupplierForPay] = useState<Supplier | null>(null);

  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierPageSize, setSupplierPageSize] = useState(6);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPageSize, setPaymentPageSize] = useState(10);
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePageSize, setPurchasePageSize] = useState(10);
  const [returnPage, setReturnPage] = useState(1);
  const [returnPageSize, setReturnPageSize] = useState(10);

  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);

  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState<SupplierPayment['paymentMethod']>('BANK_TRANSFER');
  const [bankName, setBankName] = useState('KBZ Bank');
  const [referenceNo, setReferenceNo] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const totalPayables = suppliers.reduce((sum, s) => sum + s.balancePayable, 0);
  const totalPurchases = purchaseSummary?.totalPurchases || suppliers.reduce((s, x) => s + x.totalPurchased, 0);
  const totalPaid = purchaseSummary?.totalPaid || suppliers.reduce((s, x) => s + x.totalPaid, 0);
  const totalCredit = purchaseSummary?.totalCredit || 0;

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  const paginatedSuppliers = filteredSuppliers.slice(
    (supplierPage - 1) * supplierPageSize,
    supplierPage * supplierPageSize
  );

  const filteredPayments = supplierPayments.filter(
    (p) =>
      p.paymentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * paymentPageSize,
    paymentPage * paymentPageSize
  );

  const filteredPurchases = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (purchases || []).filter(
      (p) =>
        p.purchaseNumber.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q)
    );
  }, [purchases, searchQuery]);

  const paginatedPurchases = filteredPurchases.slice(
    (purchasePage - 1) * purchasePageSize,
    purchasePage * purchasePageSize
  );

  const filteredPurchaseReturns = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (purchaseReturns || []).filter(
      (r) =>
        r.returnNumber.toLowerCase().includes(q) ||
        r.purchaseNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q)
    );
  }, [purchaseReturns, searchQuery]);

  const paginatedPurchaseReturns = filteredPurchaseReturns.slice(
    (returnPage - 1) * returnPageSize,
    returnPage * returnPageSize
  );

  const openVoucher = (supplierId?: string) => {
    if (!suppliers.length) {
      showWarning(t('sup.no_supplier'), t('sup.no_supplier_hint'));
      setIsAddSupplierModalOpen(true);
      return;
    }
    setVoucherSupplierId(supplierId);
    setIsVoucherOpen(true);
  };

  const resetSupplierForm = () => {
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPaymentTermsDays(30);
  };

  const openEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setContactPerson(sup.contactPerson || '');
    setPhone(sup.phone || '');
    setEmail(sup.email || '');
    setAddress(sup.address || '');
    setPaymentTermsDays(sup.paymentTermsDays || 30);
    setIsAddSupplierModalOpen(true);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showWarning(t('sup.missing_info'), t('sup.missing_info_hint'));
      return;
    }

    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, {
        name,
        contactPerson: contactPerson || name,
        phone,
        email: email || undefined,
        address: address || undefined,
        paymentTermsDays,
      });
      showSuccess(t('sup.updated'), name);
      setIsAddSupplierModalOpen(false);
      setEditingSupplier(null);
      resetSupplierForm();
      return;
    }

    const created = await addNewSupplier({
      name,
      contactPerson: contactPerson || name,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@supplier.com`,
      address: address || 'Yangon, Myanmar',
      category: 'General FMCG & Wholesale',
      paymentTermsDays,
    });
    showSuccess(t('sup.saved'), `${name} ${t('sup.saved_hint')}`);
    setIsAddSupplierModalOpen(false);
    resetSupplierForm();
    openVoucher(created?.id);
  };

  const openPurchaseView = (p: PurchaseRecord, edit = false) => {
    setSelectedPurchase(p);
    setPurchaseViewEdit(edit);
  };

  const handleOpenPayModal = (supplier: Supplier) => {
    setSelectedSupplierForPay(supplier);
    setPayAmount(supplier.balancePayable);
    setReferenceNo(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsPaymentModalOpen(true);
  };

  const handleSettlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForPay || payAmount <= 0) return;
    settleSupplierPayment(
      selectedSupplierForPay.id,
      payAmount,
      payMethod,
      referenceNo,
      bankName,
      paymentNotes
    );
    showSuccess(
      t('sup.payment_ok'),
      language === 'my'
        ? `${selectedSupplierForPay.name} သို့ ${payAmount.toLocaleString()} MMK ပေးချေပြီးပါပြီ`
        : `Settled ${payAmount.toLocaleString()} MMK for ${selectedSupplierForPay.name}.`
    );
    setIsPaymentModalOpen(false);
    setSelectedSupplierForPay(null);
    setPayAmount(0);
    setPaymentNotes('');
  };

  const tabBtn = (id: Tab, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => {
        setActiveTab(id);
        setPurchasePage(1);
                setSupplierPage(1);
                setPaymentPage(1);
      }}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
        activeTab === id ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div id="supplier-management-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-teal-600" />
              <span>{t('sup.title')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('sup.subtitle')}</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                resetSupplierForm();
                setIsAddSupplierModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>{t('sup.add_supplier')}</span>
            </button>
            <button
              type="button"
              onClick={() => openVoucher()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold"
            >
              <Warehouse className="w-4 h-4" />
              <span>{t('sup.new_voucher')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700/80 uppercase tracking-wider block">
              {t('sup.payables')}
            </span>
            <div className="text-xl font-black font-mono mt-1 text-amber-900">
              {totalPayables.toLocaleString()} <span className="text-xs text-amber-600/70 font-sans">MMK</span>
            </div>
          </div>
          <div className="bg-teal-50 p-4 rounded-2xl border border-teal-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-teal-600/80 uppercase tracking-wider block">
              {t('sup.purchase_total')}
            </span>
            <div className="text-xl font-black font-mono mt-1 text-teal-950">
              {totalPurchases.toLocaleString()}
            </div>
            <span className="text-[10px] text-teal-600 font-bold">
              {(purchaseSummary?.purchaseCount || 0)} {t('sup.vouchers_count')} · {t('sup.ship')}{' '}
              {(purchaseSummary?.shippingCost || 0).toLocaleString()}
            </span>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700/80 uppercase tracking-wider block">
              {t('sup.paid')}
            </span>
            <div className="text-xl font-black font-mono mt-1 text-emerald-800">{totalPaid.toLocaleString()}</div>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200/80 shadow-xs">
            <span className="text-[11px] font-bold text-rose-600/80 uppercase tracking-wider block">
              {t('sup.credit')}
            </span>
            <div className="text-xl font-black font-mono mt-1 text-rose-800">{totalCredit.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
            {tabBtn('purchases', `${t('sup.tab_vouchers')} (${purchases?.length || 0})`)}
            {tabBtn('returns', `${t('sup.tab_returns')} (${purchaseReturns?.length || 0})`)}
            {tabBtn('suppliers', `${t('sup.tab_suppliers')} (${suppliers.length})`)}
            {tabBtn('payments', `${t('sup.tab_payments')} (${supplierPayments.length})`)}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('sup.search')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPurchasePage(1);
                setSupplierPage(1);
                setPaymentPage(1);
                setReturnPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-200 text-slate-900"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ========== PURCHASE VOUCHERS ========== */}
        {activeTab === 'purchases' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-teal-600 to-sky-600 flex items-center gap-2">
              <Package className="w-4 h-4 text-white" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-white">
                {t('sup.ledger')}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">{t('sup.col_voucher')}</th>
                  <th className="py-3 px-4">{t('sup.col_date')}</th>
                  <th className="py-3 px-4">{t('sup.col_supplier')}</th>
                  <th className="py-3 px-4 text-right">{t('sup.col_items')}</th>
                  <th className="py-3 px-4 text-right">{t('sup.col_shipping')}</th>
                  <th className="py-3 px-4 text-right">{t('sup.col_total')}</th>
                  <th className="py-3 px-4 text-right">{t('sup.col_paid')}</th>
                  <th className="py-3 px-4 text-right">{t('sup.col_credit')}</th>
                  <th className="py-3 px-4 text-center">{t('sup.col_detail')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-slate-400 text-xs">
                      {t('sup.empty_vouchers')}
                    </td>
                  </tr>
                ) : (
                  paginatedPurchases.map((p) => (
                    <tr
                      key={p.id}
                      className={`border-l-4 ${
                        p.creditAmount > 0
                          ? 'border-l-rose-400 bg-rose-50/40 hover:bg-rose-50/70'
                          : 'border-l-emerald-400 bg-emerald-50/30 hover:bg-emerald-50/60'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-teal-700">{p.purchaseNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{p.purchaseDate}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.supplierName}</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {(p.items || []).map((i) => i.productName).join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">{p.itemsSubtotal.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-cyan-700 font-semibold">
                        {p.shippingCost.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-teal-900">
                        {p.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                        {p.paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-rose-700">
                        {p.creditAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPurchaseView(p, false)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                            title={t('sup.view')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openPurchaseView(p, true)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                            title={t('sup.edit')}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReturnPurchase(p)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title={t('sup.return')}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredPurchases.length > 0 && (
              <Pagination
                currentPage={purchasePage}
                totalItems={filteredPurchases.length}
                pageSize={purchasePageSize}
                pageSizeOptions={[5, 10, 20, 50]}
                onPageChange={setPurchasePage}
                onPageSizeChange={setPurchasePageSize}
              />
            )}
          </div>
        )}

        {/* ========== PURCHASE RETURNS ========== */}
        {activeTab === 'returns' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-rose-600 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-white" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-white">
                {t('sup.tab_returns')}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-rose-50 border-b border-rose-100 text-rose-800 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">{t('sup.col_return_no')}</th>
                  <th className="py-3 px-4">{t('sup.col_po')}</th>
                  <th className="py-3 px-4">{t('sup.col_supplier')}</th>
                  <th className="py-3 px-4">{t('sup.col_items')}</th>
                  <th className="py-3 px-4 text-right">{t('sup.col_refund')}</th>
                  <th className="py-3 px-4">{t('sup.col_settlement')}</th>
                  <th className="py-3 px-4">{t('sup.col_date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchaseReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-14 text-center text-slate-400 text-xs">
                      {t('sup.empty_returns')}
                    </td>
                  </tr>
                ) : (
                  paginatedPurchaseReturns.map((r) => (
                    <tr key={r.id} className="hover:bg-rose-50/40 border-l-4 border-l-rose-400">
                      <td className="py-3 px-4 font-mono font-bold text-rose-800">{r.returnNumber}</td>
                      <td className="py-3 px-4 font-mono text-teal-700">{r.purchaseNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{r.supplierName}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.items.map((i) => `${i.productName}×${i.quantityReturned}`).join(', ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                        {r.totalRefundAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {r.settlementMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {formatVoucherDateTime(r.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredPurchaseReturns.length > 0 && (
              <Pagination
                currentPage={returnPage}
                totalItems={filteredPurchaseReturns.length}
                pageSize={returnPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
                onPageChange={setReturnPage}
                onPageSizeChange={setReturnPageSize}
              />
            )}
          </div>
        )}

        

        {/* ========== SUPPLIERS ========== */}
        {activeTab === 'suppliers' && (
          <>
            {filteredSuppliers.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                {t('sup.empty_suppliers')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedSuppliers.map((sup) => (
                  <div
                    key={sup.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                            {sup.code}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{sup.name}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{sup.contactPerson}</span>
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            sup.balancePayable > 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          }`}
                        >
                          {sup.balancePayable > 0 ? t('sup.has_debt') : t('sup.clear')}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sup.phone}</span>
                        </div>
                        {sup.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{sup.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div>
                          <span className="text-[10px] text-teal-500 font-bold uppercase block">
                            {t('sup.total_purchased')}
                          </span>
                          <span className="font-mono font-bold text-teal-900">
                            {sup.totalPurchased.toLocaleString()} MMK
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-rose-500 font-bold uppercase block">
                            {t('sup.balance_payable')}
                          </span>
                          <span
                            className={`font-mono font-extrabold text-sm ${
                              sup.balancePayable > 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {sup.balancePayable.toLocaleString()} MMK
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openEditSupplier(sup)}
                        className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        {t('sup.edit')}
                      </button>

                      {sup.balancePayable > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenPayModal(sup)}
                          className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          {t('sup.settle')}
                        </button>
                      ) : (
                        <div className="w-full py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100">
                          {t('sup.no_dues')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredSuppliers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <Pagination
                  currentPage={supplierPage}
                  totalItems={filteredSuppliers.length}
                  pageSize={supplierPageSize}
                  pageSizeOptions={[6, 9, 12, 24]}
                  onPageChange={setSupplierPage}
                  onPageSizeChange={setSupplierPageSize}
                />
              </div>
            )}
          </>
        )}

        {/* ========== PAYMENTS ========== */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-emerald-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-white" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-white">
                {t('sup.tab_payments')}
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-emerald-50 border-b border-emerald-100 text-emerald-800 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">{t('sup.col_pay_voucher')}</th>
                  <th className="py-3 px-4">{t('sup.col_supplier')}</th>
                  <th className="py-3 px-4">{t('sup.col_method_bank')}</th>
                  <th className="py-3 px-4">{t('sup.col_txn_ref')}</th>
                  <th className="py-3 px-4 font-mono text-right">{t('sup.col_amount_paid')}</th>
                  <th className="py-3 px-4">{t('sup.col_paid_by')}</th>
                  <th className="py-3 px-4 text-center">{t('sup.col_date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      {t('sup.empty_payments')}
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-emerald-50/40 border-l-4 border-l-emerald-400">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">{pay.paymentNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{pay.supplierName}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {pay.paymentMethod.replace('_', ' ')}
                        </span>
                        {pay.bankName && (
                          <span className="text-[10px] text-slate-400 block">{pay.bankName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{pay.referenceNo || 'N/A'}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-sm text-emerald-700">
                        {pay.amount.toLocaleString()} MMK
                      </td>
                      <td className="py-3 px-4 text-slate-600">{pay.paidBy}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">{pay.paidDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filteredPayments.length > 0 && (
              <Pagination
                currentPage={paymentPage}
                totalItems={filteredPayments.length}
                pageSize={paymentPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
                onPageChange={setPaymentPage}
                onPageSizeChange={setPaymentPageSize}
              />
            )}
          </div>
        )}
      </div>

      <PurchaseReceiptModal
        purchase={selectedPurchase}
        startInEdit={purchaseViewEdit}
        onClose={() => {
          setSelectedPurchase(null);
          setPurchaseViewEdit(false);
        }}
        onReturn={(p) => {
          setReturnPurchase(p);
          setSelectedPurchase(null);
          setPurchaseViewEdit(false);
        }}
      />

      <PurchaseVoucherModal
        open={isVoucherOpen}
        onClose={() => {
          setIsVoucherOpen(false);
          setVoucherSupplierId(undefined);
          setActiveTab('purchases');
        }}
        presetSupplierId={voucherSupplierId}
      />

      <PurchaseReturnModal
        open={!!returnPurchase}
        purchase={returnPurchase}
        onClose={() => setReturnPurchase(null)}
      />

      {isPaymentModalOpen && selectedSupplierForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">{t('sup.settle_title')}</h4>
                <p className="text-xs text-slate-500">
                  {t('sup.payee')}: {selectedSupplierForPay.name}
                </p>
              </div>
              <button type="button" onClick={() => setIsPaymentModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSettlePayment} className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-bold">{t('sup.current_balance')}</span>
                <span className="text-xl font-mono font-black text-slate-900">
                  {selectedSupplierForPay.balancePayable.toLocaleString()} MMK
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.amount_to_pay')}</label>
                <input
                  type="number"
                  min={1}
                  max={selectedSupplierForPay.balancePayable}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono font-bold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.payment_method')}</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as SupplierPayment['paymentMethod'])}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="BANK_TRANSFER">{t('sup.method_bank')}</option>
                    <option value="KBZ_PAY">{t('sup.method_kbz')}</option>
                    <option value="CASH">{t('sup.method_cash')}</option>
                    <option value="CHEQUE">{t('sup.method_cheque')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.bank_name')}</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.reference_no')}</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.payment_notes')}</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl"
                >
                  {t('sup.confirm_payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {editingSupplier ? t('sup.edit_supplier') : t('sup.register_title')}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {editingSupplier ? t('sup.edit_supplier_hint') : t('sup.register_hint')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddSupplierModalOpen(false);
                  setEditingSupplier(null);
                  resetSupplierForm();
                }}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.field_name')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.field_contact')}</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.field_phone')}</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.field_email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.field_address')}</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{t('sup.field_terms')}</label>
                <input
                  type="number"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSupplierModalOpen(false);
                    setEditingSupplier(null);
                    resetSupplierForm();
                  }}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl"
                >
                  {editingSupplier ? t('sup.save_supplier') : t('sup.save_open_voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
