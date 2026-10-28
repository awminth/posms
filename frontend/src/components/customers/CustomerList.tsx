import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  X,
  Pencil,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Customer } from '../../types/pos';
import { Pagination } from '../common/Pagination';
import { showSuccess, showWarning } from '../../utils/swal';

export const CustomerList: React.FC = () => {
  const { customers, addNewCustomer, updateCustomer, currentBranch, settleCustomerCredit } =
    usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<Customer['tier']>('REGULAR');
  const [creditLimit, setCreditLimit] = useState<number>(300000);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [settleModalCust, setSettleModalCust] = useState<Customer | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'CASH' | 'KBZ_PAY' | 'WAVE_PAY'>('CASH');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetForm = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setTier('REGULAR');
    setCreditLimit(300000);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setEmail(cust.email || '');
    setTier(cust.tier);
    setCreditLimit(cust.creditLimit || 300000);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      showWarning('အချက်အလက် မပြည့်စုံပါ', 'Customer အမည်နှင့် ဖုန်းနံပါတ်ကို ဖြည့်သွင်းပေးပါ');
      return;
    }
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name,
          phone,
          email,
          tier,
          creditLimit: Number(creditLimit) || 300000,
        });
        showSuccess('ပြင်ဆင်ပြီးပါပြီ', `${name} ကို ပြင်ဆင်ပြီးပါပြီ`);
      } else {
        await addNewCustomer({
          name,
          phone,
          email,
          tier,
          creditLimit: Number(creditLimit) || 300000,
          currentCredit: 0,
        });
        showSuccess('Customer အသစ် ထည့်သွင်းပြီးပါပြီ', `${name} ကို စာရင်းထဲသို့ ထည့်သွင်းပြီးပါပြီ`);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      showWarning('မအောင်မြင်ပါ', err?.message || 'Error');
    }
  };

  const handleSettleDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleModalCust || settleAmount <= 0) return;
    settleCustomerCredit(settleModalCust.id, settleAmount, settleMethod);
    showSuccess(
      'ကြွေးကျန် ပေးချေမှု အောင်မြင်ပါသည်',
      `${settleModalCust.name} အတွက် ${settleAmount.toLocaleString()} MMK ပေးချေမှတ်တမ်းတင်ပြီးပါပြီ`
    );
    setSettleModalCust(null);
    setSettleAmount(0);
  };

  return (
    <div id="customers-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-600" />
            <span>Customers & Loyalty</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Member profiles, tiers, and credit balances — edit anytime after create.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm shadow-teal-600/20 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="px-6 py-3 bg-white/70 border-b border-slate-200/80">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customers by name, mobile number..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-900"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
            No customer accounts found matching your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCustomers.map((cust) => (
              <div
                key={cust.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{cust.name}</h4>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 ${
                          cust.tier === 'VIP'
                            ? 'bg-purple-100 text-purple-800'
                            : cust.tier === 'GOLD'
                              ? 'bg-amber-100 text-amber-800'
                              : cust.tier === 'SILVER'
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-teal-50 text-teal-700'
                        }`}
                      >
                        {cust.tier} Member
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(cust)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                        title="Edit customer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block text-[10px]">Points</span>
                        <span className="text-sm font-extrabold font-mono text-amber-600">
                          {cust.points} pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.phone}</span>
                    </div>
                    {cust.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{cust.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Spent</span>
                    <span className="font-mono font-bold text-slate-900">
                      {cust.totalSpent.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Visits</span>
                    <span className="font-mono font-bold text-slate-700">
                      {cust.visitsCount} visits
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-dashed border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Unpaid Debt (အကြွေးကျန်)</span>
                    <span
                      className={`font-mono font-extrabold text-xs ${
                        (cust.currentCredit || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {(cust.currentCredit || 0).toLocaleString()} {currentBranch.currency}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      Limit: {(cust.creditLimit || 300000).toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  {(cust.currentCredit || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSettleModalCust(cust);
                        setSettleAmount(cust.currentCredit || 0);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] border border-slate-200 transition-colors cursor-pointer"
                    >
                      Settle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredCustomers.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              pageSize={pageSize}
              pageSizeOptions={[8, 16, 24]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {settleModalCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Settle Customer Debt</h4>
              <button
                type="button"
                onClick={() => setSettleModalCust(null)}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSettleDebt} className="space-y-3">
              <p className="text-xs text-slate-600">
                {settleModalCust.name} · due{' '}
                {(settleModalCust.currentCredit || 0).toLocaleString()} MMK
              </p>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Amount</label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 block mb-1">Method</label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value as typeof settleMethod)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                >
                  <option value="CASH">Cash</option>
                  <option value="KBZ_PAY">KBZPay</option>
                  <option value="WAVE_PAY">WavePay</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettleModalCust(null)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="cursor-pointer"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone</label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as Customer['tier'])}
                    className="w-full px-3 py-2 border rounded-xl text-sm"
                  >
                    <option value="REGULAR">REGULAR</option>
                    <option value="SILVER">SILVER</option>
                    <option value="GOLD">GOLD</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Credit Limit</label>
                <input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  {editingCustomer ? 'Save changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
