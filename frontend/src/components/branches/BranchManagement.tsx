import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Percent,
  Coins,
  Store,
  Plus,
  Edit2,
  X,
  Warehouse,
  FileText,
  Power,
  ShieldCheck,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { Branch } from '../../types/pos';
import { showSuccess, showError } from '../../utils/swal';

interface BranchFormData {
  id?: string;
  name: string;
  code: string;
  type: 'RETAIL' | 'WAREHOUSE';
  city: string;
  stateOrDivision: string;
  address: string;
  phone: string;
  email: string;
  taxRate: number;
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  isActive: boolean;
}

const INITIAL_FORM: BranchFormData = {
  name: '',
  code: '',
  type: 'RETAIL',
  city: 'Yangon',
  stateOrDivision: 'Yangon Region',
  address: '',
  phone: '',
  email: '',
  taxRate: 5,
  currency: 'MMK',
  receiptHeader: 'Thank you for shopping with OmniPOS!',
  receiptFooter: 'Goods sold are not returnable without receipt within 7 days.',
  isActive: true,
};

export const BranchManagement: React.FC = () => {
  const {
    branches,
    currentBranch,
    setCurrentBranchId,
    addBranch,
    updateBranch,
    isSuperAdmin,
  } = usePOS();
  const { language } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>(INITIAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setFormData({
      ...INITIAL_FORM,
      code: `BR-0${branches.length + 1}`,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      type: (branch.type as 'RETAIL' | 'WAREHOUSE') || 'RETAIL',
      city: branch.city || 'Yangon',
      stateOrDivision: branch.stateOrDivision || branch.city || 'Yangon Region',
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      taxRate: branch.taxRate ?? 5,
      currency: branch.currency || 'MMK',
      receiptHeader: branch.receiptHeader || '',
      receiptFooter: branch.receiptFooter || '',
      isActive: branch.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (branch: Branch) => {
    try {
      const nextStatus = !branch.isActive;
      await updateBranch(branch.id, { isActive: nextStatus });
      showSuccess(
        language === 'my'
          ? `"${branch.name}" ကို ${nextStatus ? 'ဖွင့်လှစ်ပြီးပါပြီ' : 'ယာယီပိတ်သိမ်းပြီးပါပြီ'}`
          : `Branch "${branch.name}" is now ${nextStatus ? 'Active' : 'Inactive'}`
      );
    } catch (err: any) {
      showError(err?.message || 'Failed to update branch status');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showError(language === 'my' ? 'ဆိုင်ခွဲအမည် ရိုက်ထည့်ပေးပါ' : 'Branch Name is required');
      return;
    }
    if (!formData.code.trim()) {
      showError(language === 'my' ? 'ဆိုင်ခွဲကုဒ် ရိုက်ထည့်ပေးပါ' : 'Branch Code is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, {
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          type: formData.type,
          city: formData.city.trim(),
          stateOrDivision: formData.stateOrDivision.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          taxRate: Number(formData.taxRate) || 0,
          currency: formData.currency.trim(),
          receiptHeader: formData.receiptHeader.trim(),
          receiptFooter: formData.receiptFooter.trim(),
          isActive: formData.isActive,
        });
        showSuccess(
          language === 'my'
            ? `ဆိုင်ခွဲ "${formData.name}" အချက်အလက်များကို ပြင်ဆင်ပြီးပါပြီ`
            : `Branch "${formData.name}" updated successfully`
        );
      } else {
        await addBranch({
          name: formData.name.trim(),
          code: formData.code.trim().toUpperCase(),
          type: formData.type,
          city: formData.city.trim(),
          stateOrDivision: formData.stateOrDivision.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          taxRate: Number(formData.taxRate) || 0,
          currency: formData.currency.trim(),
          receiptHeader: formData.receiptHeader.trim(),
          receiptFooter: formData.receiptFooter.trim(),
          isActive: formData.isActive,
        });
        showSuccess(
          language === 'my'
            ? `ဆိုင်ခွဲအသစ် "${formData.name}" အောင်မြင်စွာ ဖွင့်လှစ်ပြီးပါပြီ`
            : `New Branch "${formData.name}" created successfully`
        );
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('[BranchManagement] Save error:', err);
      showError(err?.message || 'Failed to save branch');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="branches-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-600" />
            <span>
              {language === 'my'
                ? 'ဆိုင်ခွဲများနှင့် ပင်မစတို စီမံခန့်ခွဲခြင်း (Multi-Branch Management)'
                : 'Multi-Branch Outlets & Warehouse Configuration'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'my'
              ? `လက်ရှိ စနစ်ထဲတွင် ဆိုင်ခွဲ/ဂိုဒေါင် စုစုပေါင်း (${branches.length}) ခု ရှိပါသည်။ ဆိုင်ခွဲအလိုက် သီးခြားစတော့နှင့် အခွန်နှုန်းထားများ သတ်မှတ်နိုင်ပါသည်။`
              : `Currently managing ${branches.length} outlets & storage facilities. Localized tax, receipts, and branch-specific inventory.`}
          </p>
        </div>

        {/* Add Branch Button (Accessible to Super Admin) */}
        {isSuperAdmin && (
          <button
            id="add-branch-button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'my' ? '+ ဆိုင်ခွဲအသစ် ဖွင့်မည်' : '+ Add New Branch'}</span>
          </button>
        )}
      </div>

      {/* Branches Grid */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {branches.map((b) => {
            const isCurrent = b.id === currentBranch?.id;
            const isWarehouse = b.type === 'WAREHOUSE';

            return (
              <div
                key={b.id}
                className={`bg-white rounded-3xl border transition-all duration-200 p-5 sm:p-6 flex flex-col justify-between shadow-xs ${
                  isCurrent
                    ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                    : b.isActive === false
                    ? 'border-slate-200 bg-slate-50/70 opacity-75'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  {/* Top Bar with Icon, Name & Action Badges */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                          isWarehouse
                            ? 'bg-amber-100 text-amber-800'
                            : isCurrent
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isWarehouse ? (
                          <Warehouse className="w-6 h-6" />
                        ) : (
                          <Store className="w-6 h-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 truncate">{b.name}</h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              CURRENT
                            </span>
                          )}
                          {b.isActive === false && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold shrink-0">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>Code: {b.code}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 text-[10px]">
                            {b.type || 'RETAIL'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Edit button */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleOpenEdit(b)}
                        className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
                        title={language === 'my' ? 'ဆိုင်ခွဲပြင်မည်' : 'Edit Branch'}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Address & Contact Details */}
                  <div className="mt-5 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">
                        {b.address || 'Address not set'}, {b.city}
                      </span>
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                    {b.email && (
                      <div className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate">{b.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Tax & Currency Badges */}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      <Percent className="w-3 h-3 text-teal-600" />
                      <span>Tax: {b.taxRate}%</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      <Coins className="w-3 h-3 text-amber-600" />
                      <span>Currency: {b.currency}</span>
                    </span>
                  </div>

                  {/* Receipt Header/Footer Preview */}
                  {(b.receiptHeader || b.receiptFooter) && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 space-y-1">
                      {b.receiptHeader && (
                        <div className="truncate flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="italic">"{b.receiptHeader}"</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {/* Active/Inactive Toggle Button */}
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(b)}
                      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        b.isActive !== false
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-600 bg-slate-200 hover:bg-slate-300'
                      }`}
                      title="Toggle active status"
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{b.isActive !== false ? 'Active' : 'Disabled'}</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-400">
                      {b.isActive !== false ? 'Status: Active' : 'Status: Inactive'}
                    </div>
                  )}

                  {/* Switch Branch Button */}
                  {!isCurrent ? (
                    <button
                      onClick={() => setCurrentBranchId(b.id)}
                      disabled={b.isActive === false}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                    >
                      {language === 'my' ? 'ဤဆိုင်ခွဲသို့ ပြောင်းမည်' : 'Switch Branch'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{language === 'my' ? 'လက်ရှိဆိုင်ခွဲ' : 'Operating'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Branch Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-teal-800 to-teal-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {editingBranch
                      ? language === 'my'
                        ? 'ဆိုင်ခွဲ အချက်အလက် ပြင်ဆင်ခြင်း'
                        : 'Edit Branch Outlet'
                      : language === 'my'
                      ? 'ဆိုင်ခွဲအသစ် ဖွင့်လှစ်သတ်မှတ်ခြင်း'
                      : 'Create New Branch Outlet'}
                  </h3>
                  <p className="text-[11px] text-teal-100/80">
                    {editingBranch ? `Branch ID: ${editingBranch.id}` : 'Fill in outlet details'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'ဆိုင်ခွဲအမည် *' : 'Branch Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Hledan Junction Outlet / ပင်မကုန်လှောင်ရုံ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Branch Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'ဆိုင်ခွဲကုဒ် *' : 'Branch Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. YGN-02"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'အမျိုးအစား *' : 'Facility Type *'}
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as 'RETAIL' | 'WAREHOUSE' })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  >
                    <option value="RETAIL">Retail Store Outlet (အရောင်းဆိုင်ခွဲ)</option>
                    <option value="WAREHOUSE">Central Logistics Warehouse (ပင်မစတို/ဂိုဒေါင်)</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'မြို့နယ်/မြို့ *' : 'City *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Yangon, Mandalay"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'ဖုန်းနံပါတ်' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 09-123456789"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'လိပ်စာအပြည့်အစုံ' : 'Full Address'}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. No. 123, Bogyoke Road, Downtown"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Tax Rate % */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'အခွန်နှုန်း (%)' : 'Tax Rate (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'ငွေကြေး' : 'Currency'}
                  </label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="MMK"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Receipt Header Note */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'ဘောက်ချာ ထိပ်ပိုင်းစာတန်း' : 'Receipt Header Note'}
                  </label>
                  <input
                    type="text"
                    value={formData.receiptHeader}
                    onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                    placeholder="Thank you for visiting OmniPOS!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Receipt Footer Note */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'my' ? 'ဘောက်ချာ အောက်ခြေစာတန်း' : 'Receipt Footer Note'}
                  </label>
                  <input
                    type="text"
                    value={formData.receiptFooter}
                    onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                    placeholder="Goods sold are not returnable without receipt."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                  />
                </div>

                {/* Active Checkbox */}
                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      {language === 'my'
                        ? 'ဆိုင်ခွဲကို ချက်ချင်း အသုံးပြုခွင့်ပေးမည် (Active Status)'
                        : 'Activate this branch for operations'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-teal-600/20 cursor-pointer flex items-center gap-2"
                >
                  {isSaving && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>
                    {editingBranch
                      ? language === 'my'
                        ? 'သိမ်းဆည်းမည်'
                        : 'Update Branch'
                      : language === 'my'
                      ? 'ဆိုင်ခွဲအသစ် ဖန်တီးမည်'
                      : 'Create Branch'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
