import React, { useMemo, useState } from 'react';
import { Plus, TrendingUp, Building2 } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { Pagination } from '../common/Pagination';
import { SearchableSelect } from '../common/SearchableSelect';
import { ClearableNumberInput } from '../common/ClearableNumberInput';
import { showSuccess } from '../../utils/swal';

export const OtherIncomeManagement: React.FC = () => {
  const { branches, otherIncome, addOtherIncome, currentBranch } = usePOS();
  const { language } = useLanguage();

  const [branchFilter, setBranchFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('OTHER');
  const [branchId, setBranchId] = useState(currentBranch?.id || branches[0]?.id || '');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const filtered = useMemo(
    () =>
      (otherIncome || []).filter((i) =>
        branchFilter === 'ALL' ? true : (i.branchId || '') === branchFilter
      ),
    [otherIncome, branchFilter]
  );

  const total = filtered.reduce((s, i) => s + i.amount, 0);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;
    await addOtherIncome({
      title: title.trim(),
      amount,
      category,
      notes: notes || undefined,
      branchId,
      incomeDate,
    } as any);
    showSuccess(
      language === 'my' ? 'Other Income သိမ်းပြီး' : 'Other income saved',
      title
    );
    setOpen(false);
    setTitle('');
    setAmount(0);
    setNotes('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            {language === 'my' ? 'အခြားဝင်ငွေ (Other Income)' : 'Other Income'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'my'
              ? 'အရောင်းမဟုတ်သော ဝင်ငွေကို သီးခြား စာရင်းသွင်းရန်'
              : 'Non-sales income recorded separately from the P&L query screen.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <SearchableSelect
              value={branchFilter}
              onChange={(v) => {
                setBranchFilter(v);
                setPage(1);
              }}
              className="min-w-[10rem]"
              options={[
                { value: 'ALL', label: language === 'my' ? 'အားလုံး' : 'All branches' },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            {language === 'my' ? 'ဝင်ငွေအသစ်' : 'Add income'}
          </button>
        </div>
      </div>

      <div className="px-5 py-3 bg-white border-b border-slate-100 text-xs font-mono font-bold text-emerald-700">
        {language === 'my' ? 'စုစုပေါင်း' : 'Total'}: +{total.toLocaleString()}{' '}
        {currentBranch.currency}
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">{language === 'my' ? 'ရက်' : 'Date'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'ခေါင်းစဉ်' : 'Title'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'အမျိုးအစား' : 'Category'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'ဆိုင်' : 'Branch'}</th>
                <th className="py-3 px-4 text-right">{language === 'my' ? 'ပမာဏ' : 'Amount'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    {language === 'my' ? 'Other income မရှိသေးပါ' : 'No other income yet'}
                  </td>
                </tr>
              ) : (
                rows.map((oi) => (
                  <tr key={oi.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold">{oi.incomeNumber}</td>
                    <td className="py-3 px-4">{oi.incomeDate}</td>
                    <td className="py-3 px-4 font-semibold">{oi.title}</td>
                    <td className="py-3 px-4">{oi.category}</td>
                    <td className="py-3 px-4">
                      {branches.find((b) => b.id === oi.branchId)?.name || oi.branchId || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      +{oi.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filtered.length > 0 && (
            <Pagination
              currentPage={page}
              totalItems={filtered.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-5 space-y-3 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-slate-900">
              {language === 'my' ? 'Other Income အသစ်' : 'New other income'}
            </h3>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'my' ? 'ခေါင်းစဉ်' : 'Title'}
              className="w-full px-3 py-2 border rounded-xl text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <ClearableNumberInput
                min={0}
                value={amount}
                onChange={setAmount}
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
              />
              <input
                type="date"
                value={incomeDate}
                onChange={(e) => setIncomeDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
              />
            </div>
            <SearchableSelect
              value={branchId}
              onChange={setBranchId}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
            <SearchableSelect
              value={category}
              onChange={setCategory}
              options={[
                { value: 'OTHER', label: 'OTHER' },
                { value: 'SERVICE', label: 'SERVICE' },
                { value: 'RENTAL', label: 'RENTAL' },
                { value: 'INTEREST', label: 'INTEREST' },
              ]}
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'my' ? 'မှတ်ချက်' : 'Notes'}
              className="w-full px-3 py-2 border rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-2 border rounded-xl text-xs font-bold"
              >
                {language === 'my' ? 'မလုပ်တော့' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                {language === 'my' ? 'သိမ်းမည်' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
