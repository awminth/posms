import React, { useState } from 'react';
import {
  ReceiptText,
  Search,
  Printer,
  Trash2,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Order } from '../../types/pos';
import { ReceiptModal } from '../pos/ReceiptModal';
import { useLanguage } from '../../context/LanguageContext';
import { Pagination } from '../common/Pagination';
import { SearchableSelect } from '../common/SearchableSelect';
import { showSuccess, showError, showConfirm } from '../../utils/swal';
import { formatVoucherDateTime } from '../../utils/datetime';

export const OrderHistory: React.FC = () => {
  const { orders, branches, deleteOrder } = usePOS();
  const { language } = useLanguage();

  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(10);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredOrders = orders.filter((order) => {
    if (order.orderStatus === 'VOIDED') return false;
    const matchesBranch = branchFilter === 'all' || order.branchId === branchFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      order.orderNumber.toLowerCase().includes(query) ||
      (order.customer?.name.toLowerCase().includes(query) ?? false) ||
      order.cashierName.toLowerCase().includes(query);
    return matchesBranch && matchesSearch;
  });

  const paginatedOrders = filteredOrders.slice(
    (orderPage - 1) * orderPageSize,
    orderPage * orderPageSize
  );

  const getBranch = (id: string) => branches.find((b) => b.id === id);

  const handleDelete = async (order: Order) => {
    const ok = await showConfirm({
      title: language === 'my' ? 'ဘောင်ချာ ဖျက်မည်လား?' : 'Delete this order?',
      text:
        language === 'my'
          ? `${order.orderNumber} ကို ဖျက်ပါက ရောင်းထားသော ပစ္စည်းများ inventory ထဲ ပြန်ဝင်ပါမည်။`
          : `Deleting ${order.orderNumber} will restock all sold items back into inventory.`,
      isDangerous: true,
      confirmButtonText: language === 'my' ? 'ဖျက်မည်' : 'Delete',
    });
    if (!ok) return;

    setDeletingId(order.id);
    try {
      await deleteOrder(order.id);
      showSuccess(
        language === 'my' ? 'ဖျက်ပြီးပါပြီ' : 'Order deleted',
        language === 'my'
          ? 'ပစ္စည်းများ inventory ထဲ ပြန်ဝင်ပြီးပါပြီ။'
          : 'Items have been restored to inventory.'
      );
    } catch (err: any) {
      showError(
        language === 'my' ? 'ဖျက်မရပါ' : 'Delete failed',
        err?.message || 'Unable to delete order'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div id="orders-history-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-3.5 sm:p-6 bg-white border-b border-slate-200 shrink-0 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ReceiptText className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600" />
              <span>{language === 'my' ? 'အရောင်းဘောက်ချာများ' : 'Sales Orders'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'my'
                ? 'ဘောင်ချာကြည့်ရှု / ပရင့်ထုတ် / ဖျက်ခြင်း (inventory ပြန်ဝင်)'
                : 'View, print, or delete orders (restocks inventory).'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">
              {language === 'my' ? 'ဆိုင်ခွဲ:' : 'Branch:'}
            </span>
            <SearchableSelect
              value={branchFilter}
              onChange={(v) => {
                setBranchFilter(v);
                setOrderPage(1);
              }}
              className="min-w-[11rem]"
              options={[
                {
                  value: 'all',
                  label: language === 'my' ? 'အားလုံး' : 'All Branches',
                },
                ...branches.map((b) => ({ value: b.id, label: b.name })),
              ]}
            />
          </div>
        </div>

        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              language === 'my'
                ? 'ဘောင်ချာ #, ဖောက်သည်, ကက်ရှီယာ...'
                : 'Search Order #, Customer, Cashier...'
            }
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOrderPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-900"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">{language === 'my' ? 'ဘောင်ချာ / အချိန်' : 'Order / Time'}</th>
                  <th className="py-3 px-4">{language === 'my' ? 'ဆိုင်' : 'Branch'}</th>
                  <th className="py-3 px-4">{language === 'my' ? 'ဖောက်သည်' : 'Customer'}</th>
                  <th className="py-3 px-4">{language === 'my' ? 'ပစ္စည်း' : 'Items'}</th>
                  <th className="py-3 px-4">{language === 'my' ? 'ငွေပေးချေမှု' : 'Payment'}</th>
                  <th className="py-3 px-4 font-mono text-right">{language === 'my' ? 'စုစုပေါင်း' : 'Total'}</th>
                  <th className="py-3 px-4 text-center">{language === 'my' ? 'အခြေအနေ' : 'Status'}</th>
                  <th className="py-3 px-4 text-right">{language === 'my' ? 'လုပ်ဆောင်ချက်' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {language === 'my' ? 'ဘောင်ချာ မရှိသေးပါ။' : 'No orders found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const branch = getBranch(order.branchId);
                    const payment = order.payments[0];

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 font-mono">{order.orderNumber}</div>
                          <div className="text-[11px] text-slate-400">
                            {formatVoucherDateTime(order.createdAt)} • {order.cashierName}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{branch?.name || order.branchId}</span>
                          <div className="text-[10px] text-slate-400">{branch?.city}</div>
                        </td>
                        <td className="py-3 px-4">
                          {order.customer ? (
                            <div className="font-semibold text-slate-800">{order.customer.name}</div>
                          ) : (
                            <span className="text-slate-400 italic">
                              {language === 'my' ? 'လမ်းလျှောက်ဖောက်သည်' : 'Walk-in'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-700 font-medium">
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)} pcs
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              payment?.method === 'CREDIT'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-teal-50 text-teal-700'
                            }`}
                          >
                            {payment ? payment.method.replace('_', ' ') : 'PAID'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-sm text-slate-900">
                          {order.grandTotal.toLocaleString()} {branch?.currency || 'MMK'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {order.orderStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForModal(order)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-teal-600 hover:bg-teal-50"
                              title={language === 'my' ? 'ဘောင်ချာ' : 'Receipt'}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === order.id}
                              onClick={() => handleDelete(order)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              title={language === 'my' ? 'ဖျက်မည်' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredOrders.length > 0 && (
            <Pagination
              currentPage={orderPage}
              totalItems={filteredOrders.length}
              pageSize={orderPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setOrderPage}
              onPageSizeChange={setOrderPageSize}
            />
          )}
        </div>
      </div>

      <ReceiptModal order={selectedOrderForModal} onClose={() => setSelectedOrderForModal(null)} />
    </div>
  );
};
