import React, { useState, useMemo } from 'react';
import {
  Banknote,
  TrendingUp,
  Calendar,
  Building2,
  Printer,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  PieChart,
  CreditCard,
  Smartphone,
  Truck,
  Users,
  FileSpreadsheet,
  Search,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { ExpenseCategory } from '../../types/pos';
import { showSuccess } from '../../utils/swal';
import { exportAoaToExcel } from '../../utils/excelExport';

type FinancialTab = 'pnl' | 'cashflow' | 'arap' | 'category' | 'purchases' | 'valuation';

type AppliedQuery = { branchId: string; month: string };

function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function inMonth(dateStr: string | undefined | null, start: string, end: string): boolean {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start && d <= end;
}

const thisMonth = () => new Date().toISOString().slice(0, 7);

export const FinancialReport: React.FC = () => {
  const {
    branches,
    accessibleBranches,
    canAccessAllBranches,
    currentBranch,
    categories,
    orders,
    products,
    saleReturns,
    expenses,
    customers,
    suppliers,
    supplierBills,
    supplierPayments,
    purchaseSummary,
    openingBalances,
    closingStockValue,
    otherIncome,
    purchases,
    saveOpeningBalance,
    setActiveTab,
  } = usePOS();
  const { language } = useLanguage();

  const defaultBranchId = canAccessAllBranches
    ? 'ALL'
    : currentBranch?.id || accessibleBranches[0]?.id || '';

  const [draftBranchId, setDraftBranchId] = useState(defaultBranchId);
  const [draftMonth, setDraftMonth] = useState(thisMonth());
  const [appliedQuery, setAppliedQuery] = useState<AppliedQuery>({
    branchId: defaultBranchId,
    month: thisMonth(),
  });
  const [activeSubTab, setActiveSubTab] = useState<FinancialTab>('pnl');

  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [obLabel, setObLabel] = useState('FY Opening');
  const [obStart, setObStart] = useState(new Date().toISOString().slice(0, 10));
  const [obValue, setObValue] = useState<number | ''>('');
  const [obNotes, setObNotes] = useState('');

  const selectedBranchId = appliedQuery.branchId;
  const { start: rangeStart, end: rangeEnd } = monthRange(appliedQuery.month);

  const applyQuery = () => {
    if (!draftBranchId || !draftMonth) return;
    setAppliedQuery({ branchId: draftBranchId, month: draftMonth });
    setActiveSubTab('pnl');
  };

  const matchBranch = (branchId: string | undefined | null) => {
    if (selectedBranchId === 'ALL') return true;
    return branchId === selectedBranchId;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (!matchBranch(o.branchId)) return false;
      if (!(o.orderStatus === 'COMPLETED' || o.orderStatus === 'PARTIALLY_RETURNED')) return false;
      return inMonth(o.createdAt, rangeStart, rangeEnd);
    });
  }, [orders, selectedBranchId, rangeStart, rangeEnd]);

  const filteredReturns = useMemo(() => {
    return saleReturns.filter((r) => {
      if (!matchBranch(r.branchId)) return false;
      return inMonth(r.createdAt, rangeStart, rangeEnd);
    });
  }, [saleReturns, selectedBranchId, rangeStart, rangeEnd]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!matchBranch(e.branchId)) return false;
      return inMonth(e.date, rangeStart, rangeEnd);
    });
  }, [expenses, selectedBranchId, rangeStart, rangeEnd]);

  const filteredOtherIncome = useMemo(() => {
    return (otherIncome || []).filter((i) => {
      if (selectedBranchId !== 'ALL' && i.branchId && i.branchId !== selectedBranchId) return false;
      return inMonth(i.incomeDate, rangeStart, rangeEnd);
    });
  }, [otherIncome, selectedBranchId, rangeStart, rangeEnd]);

  const filteredPurchases = useMemo(() => {
    return (purchases || []).filter((p: any) => {
      if (selectedBranchId !== 'ALL' && p.branchId && p.branchId !== selectedBranchId) return false;
      const d = p.purchaseDate || p.createdAt;
      return inMonth(d, rangeStart, rangeEnd);
    });
  }, [purchases, selectedBranchId, rangeStart, rangeEnd]);

  // ==========================================
  // Core Financial Calculations (period sales COGS)
  // ==========================================

  const grossSales = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.subtotal, 0);
  }, [filteredOrders]);

  const totalDiscounts = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.discountAmount || 0), 0);
  }, [filteredOrders]);

  const totalReturns = useMemo(() => {
    return filteredReturns.reduce((sum, r) => sum + r.totalRefundAmount, 0);
  }, [filteredReturns]);

  const netSalesRevenue = grossSales - totalDiscounts - totalReturns;

  const totalTaxCollected = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.taxAmount || 0), 0);
  }, [filteredOrders]);

  // Period P&L COGS = sold-line costs (FIFO snapshot / costPrice), not inventory equation
  const cogs = useMemo(() => {
    let totalCost = 0;
    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        const product = products.find((p) => p.id === item.product.id);
        const costPrice =
          item.costPrice ??
          item.product?.costPrice ??
          product?.costPrice ??
          item.unitPrice * 0.7;
        totalCost += costPrice * item.quantity;
      });
    });
    filteredReturns.forEach((r) => {
      r.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        const costPrice = product?.costPrice ?? item.unitPrice * 0.7;
        totalCost -= costPrice * item.quantityReturned;
      });
    });
    return Math.max(0, totalCost);
  }, [filteredOrders, filteredReturns, products]);

  const grossProfit = netSalesRevenue - cogs;
  const grossMargin = netSalesRevenue > 0 ? (grossProfit / netSalesRevenue) * 100 : 0;

  const opexByCategory = useMemo(() => {
    const summary: Record<ExpenseCategory, number> = {
      RENT: 0,
      UTILITIES: 0,
      SALARIES: 0,
      LOGISTICS: 0,
      PAYMENT_FEES: 0,
      PACKAGING: 0,
      MAINTENANCE: 0,
      MARKETING: 0,
      OTHER: 0,
    };
    filteredExpenses.forEach((e) => {
      summary[e.category] = (summary[e.category] || 0) + e.amount;
    });
    return summary;
  }, [filteredExpenses]);

  const totalOpex = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const otherIncomeTotal = useMemo(
    () => filteredOtherIncome.reduce((s, i) => s + i.amount, 0),
    [filteredOtherIncome]
  );
  const netProfit = grossProfit + otherIncomeTotal - totalOpex;
  const netMargin = netSalesRevenue > 0 ? (netProfit / netSalesRevenue) * 100 : 0;

  // ==========================================
  // Cash Flow Calculations
  // ==========================================
  const cashFlowStats = useMemo(() => {
    let cashTendered = 0;
    let kpay = 0;
    let wavepay = 0;
    let cards = 0;
    let creditSales = 0;

    filteredOrders.forEach((o) => {
      o.payments.forEach((p) => {
        if (p.method === 'CASH') cashTendered += p.amount;
        else if (p.method === 'KBZ_PAY') kpay += p.amount;
        else if (p.method === 'WAVE_PAY') wavepay += p.amount;
        else if (p.method === 'CREDIT_CARD') cards += p.amount;
        else if (p.method === 'CREDIT') creditSales += p.amount;
      });
    });

    const supplierPaid = supplierPayments.reduce((sum, sp) => sum + sp.amount, 0);
    const cashExpenses = filteredExpenses
      .filter((e) => e.paymentMethod === 'CASH')
      .reduce((sum, e) => sum + e.amount, 0);

    const digitalExpenses = filteredExpenses
      .filter((e) => e.paymentMethod !== 'CASH')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      cashTendered,
      kpay,
      wavepay,
      cards,
      creditSales,
      supplierPaid,
      cashExpenses,
      digitalExpenses,
      netCashDrawer: cashTendered - cashExpenses - totalReturns,
    };
  }, [filteredOrders, supplierPayments, filteredExpenses, totalReturns]);

  // ==========================================
  // Accounts Receivable (AR) & Payable (AP)
  // ==========================================
  const arBalance = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentCredit || 0), 0);
  }, [customers]);

  const apBalance = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.balancePayable || 0), 0);
  }, [suppliers]);

  // ==========================================
  // Category Profitability Analysis
  // ==========================================
  const categoryAnalysis = useMemo(() => {
    const map: Record<string, { name: string; sales: number; cogs: number; qty: number }> = {};

    filteredOrders.forEach((o) => {
      o.items.forEach((item) => {
        const catObj = categories.find((c) => c.id === item.product.categoryId);
        const cat = catObj?.name || 'General';
        if (!map[cat]) {
          map[cat] = { name: cat, sales: 0, cogs: 0, qty: 0 };
        }
        const itemRev = (item.unitPrice - (item.discount || 0)) * item.quantity;
        const costPrice =
          item.costPrice ?? item.product?.costPrice ?? item.unitPrice * 0.7;
        const itemCost = costPrice * item.quantity;
        map[cat].sales += itemRev;
        map[cat].cogs += itemCost;
        map[cat].qty += item.quantity;
      });
    });

    return Object.values(map).map((c) => {
      const profit = c.sales - c.cogs;
      const margin = c.sales > 0 ? (profit / c.sales) * 100 : 0;
      return { ...c, profit, margin };
    }).sort((a, b) => b.sales - a.sales);
  }, [filteredOrders, categories]);

  // Handle opening balance only (expenses / other income are separate screens)
  const handleSaveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obLabel.trim() || !obStart || Number(obValue) < 0) return;
    await saveOpeningBalance({
      periodLabel: obLabel.trim(),
      periodStart: obStart,
      openingStockValue: Number(obValue) || 0,
      notes: obNotes.trim() || undefined,
    });
    showSuccess(
      language === 'my' ? 'သိမ်းပြီးပါပြီ' : 'Saved',
      language === 'my' ? 'Opening stock value သိမ်းပြီးပါပြီ' : 'Opening stock value saved.'
    );
    setIsOpeningModalOpen(false);
    setObValue('');
    setObNotes('');
  };

  // Export to Excel (.xlsx via xlsx-js-style)
  const handleExportExcel = () => {
    const branchName =
      selectedBranchId === 'ALL'
        ? 'All Branches'
        : branches.find((b) => b.id === selectedBranchId)?.name || selectedBranchId;
    const rows: (string | number)[][] = [
      ['OMNIPOS ENTERPRISE - COMPREHENSIVE FINANCIAL REPORT'],
      ['Branch', branchName],
      ['Period', appliedQuery.month],
      ['Generated Date', new Date().toLocaleString()],
      ['Currency', currentBranch.currency],
      [],
      ['=== PROFIT & LOSS SUMMARY ==='],
      ['Metric', 'Amount (MMK)'],
      ['Gross Retail Sales', grossSales],
      ['Sales Discounts', -totalDiscounts],
      ['Sales Returns & Refunds', -totalReturns],
      ['Net Sales Revenue', netSalesRevenue],
      ['Cost of Goods Sold (COGS)', -cogs],
      ['Gross Profit', grossProfit],
      ['Gross Profit Margin (%)', `${grossMargin.toFixed(2)}%`],
      ['Other Income', otherIncomeTotal],
      ['Total Operating Expenses (OPEX)', -totalOpex],
      ['Net Profit', netProfit],
      ['Net Profit Margin (%)', `${netMargin.toFixed(2)}%`],
      ['Commercial Tax Collected', totalTaxCollected],
      [],
      ['=== OPERATING EXPENSES BREAKDOWN ==='],
      ['Expense Category', 'Amount (MMK)'],
      ...Object.entries(opexByCategory).map(([cat, val]) => [cat, val] as (string | number)[]),
      [],
      ['=== ACCOUNTS RECEIVABLE & PAYABLE ==='],
      ['Metric', 'Amount (MMK)'],
      ['Accounts Receivable (Customer Debt)', arBalance],
      ['Accounts Payable (Supplier Bills)', apBalance],
      ['Net Working Credit Position', arBalance - apBalance],
    ];

    exportAoaToExcel(
      rows,
      `OmniPOS_Financial_Report_${appliedQuery.month}_${selectedBranchId}.xlsx`,
      'Financial Report'
    );

    showSuccess(
      language === 'my' ? 'ဒေါင်းလုဒ်လုပ်ပြီးပါပြီ' : 'Export Complete',
      language === 'my'
        ? 'ဘဏ္ဍာရေး အစီရင်ခံစာ Excel ဖိုင်ကို ထုတ်ယူပြီးပါပြီ'
        : 'Financial report Excel (.xlsx) downloaded.'
    );
  };

  return (
    <div id="financial-report-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <div className="p-5 bg-white border-b border-slate-200 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold">
              <Banknote className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{language === 'my' ? 'ဘဏ္ဍာရေးနှင့် အရှုံးအမြတ် အသေးစိတ်ရှင်းတမ်း' : 'Enterprise Financial Report & P&L Statement'}</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Audited Ledger
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'my'
              ? 'အသားတင်အရောင်း၊ ရောင်းရကုန်ကျစရိတ် (COGS)၊ လည်ပတ်စရိတ် (OPEX)၊ အသားတင်အမြတ်နှင့် ငွေကြေးစီးဆင်းမှု စာရင်း'
              : 'Detailed Income Statement, Gross Margin, Operating Expenses, Cash Flow, and Balance Sheet Working Capital.'}
          </p>
        </div>

        {/* Global Filter Bar & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={draftBranchId}
              onChange={(e) => setDraftBranchId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer max-w-[12rem]"
            >
              {canAccessAllBranches && (
                <option value="ALL">
                  {language === 'my' ? 'ဆိုင်ခွဲအားလုံး (Consolidated)' : 'All Branches (Consolidated)'}
                </option>
              )}
              {(accessibleBranches.length ? accessibleBranches : branches).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="month"
              value={draftMonth}
              onChange={(e) => setDraftMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={applyQuery}
            disabled={!draftBranchId || !draftMonth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'ပြန်ဆွဲမည်' : 'Apply'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title={language === 'my' ? 'Excel ထုတ်ယူမည်' : 'Download Excel'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Print Financial Statement"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Header Cards — current month by default */}
      <div className="px-6 py-4 bg-white border-b border-slate-200">
        <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
          {selectedBranchId === 'ALL'
            ? language === 'my'
              ? 'ဆိုင်ခွဲအားလုံး'
              : 'All Branches'
            : branches.find((b) => b.id === selectedBranchId)?.name || selectedBranchId}{' '}
          · {appliedQuery.month} ({rangeStart} → {rangeEnd})
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Gross Revenue */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'my' ? 'စုစုပေါင်း အရောင်းရငွေ' : 'Gross Revenue'}
            </span>
            <div className="text-base font-extrabold font-mono text-slate-900 mt-1">
              {grossSales.toLocaleString()}{' '}
              <span className="text-[10px] font-sans text-slate-400">{currentBranch.currency}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {filteredOrders.length} {language === 'my' ? 'ကြိမ် ရောင်းချခဲ့သည်' : 'orders total'}
            </div>
          </div>

          {/* COGS */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'my' ? 'ရောင်းရ ကုန်ကျစရိတ် (COGS)' : 'Cost of Goods Sold'}
            </span>
            <div className="text-base font-extrabold font-mono text-rose-600 mt-1">
              -{cogs.toLocaleString()}{' '}
              <span className="text-[10px] font-sans text-slate-400">{currentBranch.currency}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {netSalesRevenue > 0 ? ((cogs / netSalesRevenue) * 100).toFixed(1) : 0}% of net revenue
            </div>
          </div>

          {/* Gross Profit */}
          <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100">
            <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wider block">
              {language === 'my' ? 'အကြမ်းဖျင်း အမြတ်ငွေ' : 'Gross Profit'}
            </span>
            <div className="text-base font-extrabold font-mono text-teal-700 mt-1">
              {grossProfit.toLocaleString()}{' '}
              <span className="text-[10px] font-sans text-teal-400">{currentBranch.currency}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-teal-600 font-bold mt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>Margin: {grossMargin.toFixed(1)}%</span>
            </div>
          </div>

          {/* Operating Expenses (OPEX) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'my' ? 'ဆိုင်လည်ပတ်စရိတ် (OPEX)' : 'Operating Expenses'}
            </span>
            <div className="text-base font-extrabold font-mono text-amber-700 mt-1">
              -{totalOpex.toLocaleString()}{' '}
              <span className="text-[10px] font-sans text-slate-400">{currentBranch.currency}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {filteredExpenses.length} {language === 'my' ? 'ကြိမ် အသုံးစရိတ်စာရင်း' : 'recorded expenses'}
            </div>
          </div>

          {/* Net Profit */}
          <div
            className={`p-3.5 rounded-2xl border ${
              netProfit >= 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}
          >
            <span
              className={`text-[10px] font-bold uppercase tracking-wider block ${
                netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {language === 'my' ? 'အသားတင် အမြတ်ငွေ (Net Profit)' : 'Net Operating Profit'}
            </span>
            <div
              className={`text-base font-extrabold font-mono mt-1 ${
                netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
              }`}
            >
              {netProfit.toLocaleString()}{' '}
              <span className="text-[10px] font-sans text-emerald-600">{currentBranch.currency}</span>
            </div>
            <div
              className={`flex items-center gap-1 text-[10px] font-bold mt-0.5 ${
                netMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Net Margin: {netMargin.toFixed(1)}%</span>
            </div>
          </div>

          {/* Tax Collected */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {language === 'my' ? 'ကောက်ခံရရှိ အခွန်' : 'Commercial Tax'}
            </span>
            <div className="text-base font-extrabold font-mono text-slate-800 mt-1">
              +{totalTaxCollected.toLocaleString()}{' '}
              <span className="text-[10px] font-sans text-slate-400">{currentBranch.currency}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Township Tax Authority</div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="px-6 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveSubTab('pnl')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'pnl'
                ? 'bg-white text-teal-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            <span>{language === 'my' ? 'အရှုံးအမြတ် ရှင်းတမ်း (P&L Ledger)' : 'Income Statement (P&L)'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('cashflow')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'cashflow'
                ? 'bg-white text-teal-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>{language === 'my' ? 'ငွေကြေးစီးဆင်းမှု (Cash Flow)' : 'Cash Flow & Tender'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('arap')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'arap'
                ? 'bg-white text-teal-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>{language === 'my' ? 'ရရန်/ပေးရန် အကြွေးစာရင်း (AR/AP)' : 'Accounts Receivable & Payable'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('category')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'category'
                ? 'bg-white text-teal-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4 text-purple-600" />
            <span>{language === 'my' ? 'အမျိုးအစားအလိုက် အမြတ် (Category Profit)' : 'Category Margins'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'purchases'
                ? 'bg-white text-teal-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4 text-cyan-600" />
            <span>{language === 'my' ? 'ကုန်ဝယ်မှတ်တမ်း (Purchases)' : 'Purchase Ledger'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('valuation')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'valuation'
                ? 'bg-white text-teal-700 shadow-2xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-teal-600" />
            <span>{language === 'my' ? 'Opening Stock' : 'Stock Valuation'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: FORMAL INCOME STATEMENT / PROFIT & LOSS (P&L) LEDGER */}
        {/* ========================================================================= */}
        {activeSubTab === 'pnl' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold tracking-wide uppercase">
                  {language === 'my' ? 'လုပ်ငန်း အရှုံးအမြတ် ရှင်းတမ်း' : 'Enterprise Income Statement (P&L)'}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {`Branch: ${
                    selectedBranchId === 'ALL'
                      ? language === 'my'
                        ? 'ဆိုင်ခွဲအားလုံး'
                        : 'All Branches'
                      : branches.find((b) => b.id === selectedBranchId)?.name || selectedBranchId
                  } · ${appliedQuery.month}`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  GAAP & IFRS Compliant Format
                </span>
              </div>
            </div>

            <div className="p-6 divide-y divide-slate-100 text-xs">
              {/* SECTION 1: REVENUE */}
              <div className="pb-5 space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  <span>1. REVENUE (အရောင်းရငွေ)</span>
                  <span>Amount ({currentBranch.currency})</span>
                </div>

                <div className="space-y-1.5 pt-1 pl-3">
                  <div className="flex justify-between items-center text-slate-800">
                    <span>Gross Retail Sales (ကောင်တာ စုစုပေါင်း အရောင်းရငွေ)</span>
                    <span className="font-mono font-bold">{grossSales.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-rose-600">
                    <span className="pl-2">Less: Customer Promotional Discounts (လျော့စျေး ပေးခဲ့မှု)</span>
                    <span className="font-mono">-{totalDiscounts.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center text-rose-600">
                    <span className="pl-2">Less: Sales Returns & Refunds (ပြန်အမ်းငွေ / ပစ္စည်းပြန်သွင်း)</span>
                    <span className="font-mono">-{totalReturns.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center font-extrabold text-sm text-slate-950 pt-2 border-t border-slate-200">
                    <span>NET SALES REVENUE (အသားတင် အရောင်းရငွေ)</span>
                    <span className="font-mono text-teal-700">{netSalesRevenue.toLocaleString()} {currentBranch.currency}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 2: COST OF GOODS SOLD */}
              <div className="py-5 space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  <span>2. COST OF GOODS SOLD - COGS (ရောင်းရကုန်ကျစရိတ်)</span>
                  <span>Amount ({currentBranch.currency})</span>
                </div>

                <div className="space-y-1.5 pt-1 pl-3">
                  <div className="flex justify-between items-center text-slate-800">
                    <span>
                      {language === 'my'
                        ? 'ရောင်းလိုင်း ကုန်ကျစရိတ် (FIFO / costPrice × qty)'
                        : 'Sold-line cost (FIFO snapshot / costPrice × qty)'}
                    </span>
                    <span className="font-mono text-rose-600 font-bold">−{cogs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <span className="pl-2">
                      {language === 'my'
                        ? 'ရွေးထားသော လ + ဆိုင်ခွဲ ကာလအတွင်းသာ'
                        : 'Scoped to selected month + branch'}
                    </span>
                    <span>
                      {netSalesRevenue > 0 ? ((cogs / netSalesRevenue) * 100).toFixed(1) : 0}% of Net Sales
                    </span>
                  </div>

                  {/* Inventory Equation Method Box */}
                  <div className="my-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1.5">
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-teal-600" />
                        <span>{language === 'my' ? 'စတော့ညီမျှခြင်းဖြင့် စစ်ဆေးချက်' : 'Periodic Inventory Method Equation'}</span>
                      </span>
                      <span className="font-mono text-slate-600 text-[10px]">COGS = (Opening + Purchase) − Closing</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 font-mono text-center">
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">{language === 'my' ? 'အဖွင့်စတော့' : 'Opening'}</span>
                        <span className="font-bold text-slate-800">{(openingBalances?.[0]?.openingStockValue || 0).toLocaleString()}</span>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">{language === 'my' ? '+ ဝယ်ယူမှုစုစုပေါင်း' : '+ Purchases'}</span>
                        <span className="font-bold text-slate-800">{(filteredPurchases.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0) || purchaseSummary?.totalPurchases || 0).toLocaleString()}</span>
                      </div>
                      <div className="p-1.5 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-sans">{language === 'my' ? '− လက်ကျန်စတော့' : '− Closing'}</span>
                        <span className="font-bold text-slate-800">{(closingStockValue || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px]">
                      <span className="text-slate-500 font-sans">{language === 'my' ? 'ညီမျှခြင်းဖြင့် ရရှိသော ကုန်ကျစရိတ်:' : 'Equation Calculated COGS:'}</span>
                      <span className="font-mono font-bold text-teal-700">
                        {Math.max(
                          0,
                          (openingBalances?.[0]?.openingStockValue || 0) +
                            (filteredPurchases.reduce((s: number, p: any) => s + (p.totalAmount || 0), 0) || purchaseSummary?.totalPurchases || 0) -
                            (closingStockValue || 0)
                        ).toLocaleString()} {currentBranch.currency}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center font-extrabold text-sm text-slate-950 pt-2 border-t border-slate-200">
                    <span>GROSS PROFIT (အကြမ်းဖျင်း အမြတ်ငွေ)</span>
                    <div className="text-right">
                      <span className="font-mono text-teal-700">
                        {grossProfit.toLocaleString()} {currentBranch.currency}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-normal">
                        Margin: {grossMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: OPERATING EXPENSES (OPEX) */}
              <div className="py-5 space-y-2">
                <div className="flex justify-between items-center text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                  <span>3. OPERATING EXPENSES - OPEX (ဆိုင်လည်ပတ်စရိတ်များ)</span>
                  <span>Amount ({currentBranch.currency})</span>
                </div>

                <div className="space-y-2 pt-1 pl-3">
                  <div className="flex justify-between items-center text-slate-700">
                    <span>🏢 Store Premises Rent & Lease (ဆိုင်ခန်း ငှားရမ်းခ)</span>
                    <span className="font-mono">-{opexByCategory.RENT.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>👥 Staff Salaries & Floor Wages (ဝန်ထမ်းလစာနှင့် နေ့တွက်စရိတ်)</span>
                    <span className="font-mono">-{opexByCategory.SALARIES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>⚡ Utilities & Generator Fuel (မီးခွန်၊ ရေခွန်၊ ဂျင်နရေတာဆီ)</span>
                    <span className="font-mono">-{opexByCategory.UTILITIES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>🚚 Logistics & Inter-branch Transfer Freight (သယ်ယူပို့ဆောင်ခ)</span>
                    <span className="font-mono">-{opexByCategory.LOGISTICS.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>🛍️ Bags & Thermal Paper Rolls (ထုပ်ပိုးစက္ကူနှင့် ပြေစာလိပ်များ)</span>
                    <span className="font-mono">-{opexByCategory.PACKAGING.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>🛠️ Hardware Maintenance & Servicing (ပြင်ဆင်ထိန်းသိမ်းမှု)</span>
                    <span className="font-mono">-{opexByCategory.MAINTENANCE.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>💳 Payment Gateway & Digital Merchant Charges (ငွေပေးချေမှု ဝန်ဆောင်ခ)</span>
                    <span className="font-mono">-{opexByCategory.PAYMENT_FEES.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>📣 Marketing (ကြော်ငြာ)</span>
                    <span className="font-mono">-{(opexByCategory.MARKETING || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-700">
                    <span>📦 Misc Supplies (အထွေထွေစရိတ်)</span>
                    <span className="font-mono">-{opexByCategory.OTHER.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between items-center font-extrabold text-xs text-rose-700 pt-2 border-t border-slate-200">
                    <span>TOTAL OPERATING EXPENSES (စုစုပေါင်း လည်ပတ်စရိတ်)</span>
                    <span className="font-mono">-{totalOpex.toLocaleString()} {currentBranch.currency}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('expenses')}
                    className="text-[11px] text-amber-700 font-bold underline underline-offset-2 pt-1"
                  >
                    {language === 'my'
                      ? 'အသုံးစရိတ် စာရင်းသွင်းရန် → Expenses မီနူး'
                      : 'Record expenses → Expenses menu'}
                  </button>
                </div>
              </div>

              {/* SECTION 4: OTHER INCOME + NET PROFIT */}
              <div className="pt-5 space-y-3">
                <div className="flex justify-between items-center text-emerald-700 text-xs pl-3">
                  <span>+ Other Income (အခြားဝင်ငွေ)</span>
                  <span className="font-mono font-bold">+{otherIncomeTotal.toLocaleString()}</span>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-teal-950 text-white flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      NET PROFIT (အသားတင် အမြတ်ငွေ)
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      Gross Profit + Other Income − Operating Expenses
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-extrabold font-mono text-emerald-400">
                      {netProfit.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-300 ml-1.5 font-bold font-sans">
                      {currentBranch.currency}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Net Margin:{' '}
                      <strong className="text-emerald-400 font-mono">{netMargin.toFixed(2)}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: PURCHASE LEDGER */}
        {/* ========================================================================= */}
        {activeSubTab === 'purchases' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold tracking-wide uppercase">
                  {language === 'my' ? 'Supplier-linked Purchase Ledger' : 'Supplier-linked Purchase Ledger'}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {purchaseSummary?.purchaseCount || 0} POs · Paid{' '}
                  {(purchaseSummary?.totalPaid || 0).toLocaleString()} · Credit{' '}
                  {(purchaseSummary?.totalCredit || 0).toLocaleString()} MMK
                </span>
              </div>
              <div className="text-xs font-mono text-cyan-300">
                Total {(purchaseSummary?.totalPurchases || 0).toLocaleString()} (incl. shipping{' '}
                {(purchaseSummary?.shippingCost || 0).toLocaleString()})
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">PO #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Items</th>
                    <th className="py-3 px-4 text-right">Shipping</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        {language === 'my'
                          ? 'Purchase မရှိသေးပါ — Inventory မှ GRN သွင်းပါ'
                          : 'No purchases yet — receive stock via Inventory GRN'}
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-teal-700">{p.purchaseNumber}</td>
                        <td className="py-3 px-4 text-slate-600">{p.purchaseDate}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{p.supplierName}</div>
                          <div className="text-[10px] text-slate-400">
                            {(p.items || []).map((i) => i.productName).join(', ').slice(0, 80)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono">{p.itemsSubtotal.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono">{p.shippingCost.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">{p.totalAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">{p.paidAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-mono text-amber-700">{p.creditAmount.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: OPENING / OTHER INCOME */}
        {/* ========================================================================= */}
        {activeSubTab === 'valuation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {language === 'my' ? 'Opening Stock Value' : 'Opening Stock Value'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'my'
                      ? 'Period P&L သည် ရောင်းလိုင်း cost ကို သုံးသည်။ Opening သည် ကိုးကားရန်သာ။'
                      : 'Period P&L uses sold-line cost. Opening is reference only. Closing now: '}{(closingStockValue || 0).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Set Opening
                </button>
              </div>
              <div className="space-y-2">
                {(openingBalances || []).length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No opening balance recorded</p>
                ) : (
                  (openingBalances || []).map((ob) => (
                    <div
                      key={ob.id}
                      className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{ob.periodLabel}</div>
                        <div className="text-slate-500">
                          {ob.periodStart}
                          {ob.periodEnd ? ` → ${ob.periodEnd}` : ''}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-teal-700">
                        {ob.openingStockValue.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {language === 'my' ? 'ကာလတွင်း Other Income' : 'Period Other Income'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'my'
                      ? 'စာရင်းသွင်းရန် Other Income မီနူးကို အသုံးပြုပါ · စုစုပေါင်း '
                      : 'Manage entries on the Other Income screen · Period total '}
                    {otherIncomeTotal.toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('other-income')}
                  className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shrink-0"
                >
                  {language === 'my' ? 'Other Income သို့' : 'Open module'}
                </button>
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {filteredOtherIncome.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    {language === 'my' ? 'ဤကာလအတွက် Other income မရှိပါ' : 'No other income in this period'}
                  </p>
                ) : (
                  filteredOtherIncome.map((oi) => (
                    <div
                      key={oi.id}
                      className="flex justify-between items-center p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{oi.title}</div>
                        <div className="text-slate-500">
                          {oi.incomeDate} · {oi.category}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-emerald-700">
                        +{oi.amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CASH FLOW & SETTLEMENTS */}
        {/* ========================================================================= */}
        {activeSubTab === 'cashflow' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash Inflows */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowDownRight className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-900">Cash Inflows & Payment Channels</h3>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Received
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span>Physical Cash in Drawer (ကောင်တာ ငွေသား)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {cashFlowStats.cashTendered.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Smartphone className="w-4 h-4 text-teal-600" />
                      <span>KBZPay Wallet Settlement</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {cashFlowStats.kpay.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Smartphone className="w-4 h-4 text-amber-500" />
                      <span>WavePay Wallet Settlement</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {cashFlowStats.wavepay.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      <span>Credit & Debit Card Merchants</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {cashFlowStats.cards.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Users className="w-4 h-4 text-rose-500" />
                      <span>Credit Account Sales (AR Debt Recorded)</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {cashFlowStats.creditSales.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash Outflows */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-slate-900">Cash Outflows & Disbursements</h3>
                  </div>
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    Disbursed
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Truck className="w-4 h-4 text-teal-600" />
                      <span>Supplier Bill Settlements (AP Payments)</span>
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      -{cashFlowStats.supplierPaid.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <ShoppingBag className="w-4 h-4 text-amber-600" />
                      <span>Direct Cash Operating Expenses</span>
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      -{cashFlowStats.cashExpenses.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>Bank/Wallet Transfer Operating Expenses</span>
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      -{cashFlowStats.digitalExpenses.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-700">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      <span>Customer Refund Disbursements</span>
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      -{totalReturns.toLocaleString()} {currentBranch.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ACCOUNTS RECEIVABLE & ACCOUNTS PAYABLE (AR/AP) */}
        {/* ========================================================================= */}
        {activeSubTab === 'arap' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Accounts Receivable (AR)
                </span>
                <div className="text-xl font-mono font-extrabold text-blue-600 mt-1">
                  {arBalance.toLocaleString()} {currentBranch.currency}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Total credit debt owed by customers across all stores
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Accounts Payable (AP)
                </span>
                <div className="text-xl font-mono font-extrabold text-rose-600 mt-1">
                  {apBalance.toLocaleString()} {currentBranch.currency}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Total pending invoices owed to product suppliers
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Net Working Capital Credit Position
                </span>
                <div className={`text-xl font-mono font-extrabold mt-1 ${arBalance - apBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(arBalance - apBalance).toLocaleString()} {currentBranch.currency}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  AR minus AP Working Capital cushion
                </p>
              </div>
            </div>

            {/* Indebted Customers & Suppliers Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customers with Debt */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Top Customer Receivables (AR)</span>
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  {customers
                    .filter((c) => (c.currentCredit || 0) > 0)
                    .map((c) => (
                      <div key={c.id} className="py-2 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900">{c.name}</span>
                          <span className="text-[10px] text-slate-400 block">{c.phone} • Limit: {c.creditLimit.toLocaleString()}</span>
                        </div>
                        <span className="font-mono font-bold text-blue-600">
                          {c.currentCredit.toLocaleString()} {currentBranch.currency}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Suppliers with Pending Balance */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-rose-600" />
                  <span>Vendor Payables Outstanding (AP)</span>
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  {suppliers
                    .filter((s) => (s.balancePayable || 0) > 0)
                    .map((s) => (
                      <div key={s.id} className="py-2 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-900">{s.name}</span>
                          <span className="text-[10px] text-slate-400 block">{s.contactPerson} • {s.phone}</span>
                        </div>
                        <span className="font-mono font-bold text-rose-600">
                          {s.balancePayable.toLocaleString()} {currentBranch.currency}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: CATEGORY MARGINS & ITEM PROFITABILITY */}
        {/* ========================================================================= */}
        {activeSubTab === 'category' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {language === 'my' ? 'ကုန်ပစ္စည်း အမျိုးအစားအလိုက် အမြတ်အစွန်း ခွဲခြမ်းစိတ်ဖြာမှု' : 'Category Sales, Cost & Margin Analysis'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed revenue contribution, procurement cost, and gross profit by category
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-slate-50/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Category Name</th>
                    <th className="py-3 px-4 text-center">Items Sold (Qty)</th>
                    <th className="py-3 px-4 text-right">Revenue ({currentBranch.currency})</th>
                    <th className="py-3 px-4 text-right">COGS Cost ({currentBranch.currency})</th>
                    <th className="py-3 px-4 text-right">Gross Profit ({currentBranch.currency})</th>
                    <th className="py-3 px-4 text-right">Profit Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryAnalysis.map((cat, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {cat.name}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {cat.qty} pcs
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {cat.sales.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600">
                        {cat.cogs.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-teal-700">
                        {cat.profit.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${cat.margin >= 30 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {cat.margin.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-teal-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Set Opening Stock Value</h3>
              <button type="button" onClick={() => setIsOpeningModalOpen(false)} className="text-teal-200 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveOpening} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Period label</label>
                <input
                  required
                  value={obLabel}
                  onChange={(e) => setObLabel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Period start</label>
                <input
                  type="date"
                  required
                  value={obStart}
                  onChange={(e) => setObStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Opening value (MMK)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={obValue}
                  onChange={(e) => setObValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={obNotes}
                  onChange={(e) => setObNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-teal-600 text-white font-bold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
