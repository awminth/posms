import { getPool } from '../config/db.js';
import { num } from '../utils/helpers.js';
import * as catalog from './catalogService.js';
import * as auth from './authService.js';
import * as customers from './customerService.js';
import * as orders from './orderService.js';
import * as shifts from './shiftService.js';
import * as transfers from './transferService.js';
import * as expenseSupplier from './expenseSupplierService.js';
import * as saleReturns from './saleReturnService.js';
import * as purchaseReturns from './purchaseReturnService.js';
import * as purchase from './purchaseService.js';
import * as stockLots from './stockLotService.js';
import { env } from '../config/env.js';

export async function getDbStatus() {
  const pool = getPool();
  const [tables] = await pool.query('SHOW TABLES');
  const [branchCount]: any = await pool.query('SELECT COUNT(*) as count FROM branches');
  const [productCount]: any = await pool.query('SELECT COUNT(*) as count FROM products');
  const [userCount]: any = await pool.query('SELECT COUNT(*) as count FROM users');
  return {
    connected: true,
    database: env.db.name,
    host: env.db.host,
    tables,
    summary: {
      branches: branchCount[0].count,
      products: productCount[0].count,
      users: userCount[0].count,
    },
  };
}

export async function getBootstrap() {
  const [
    branches,
    categories,
    products,
    stocks,
    customersList,
    users,
    ordersList,
    transfersList,
    expenses,
    suppliers,
    supplierBills,
    supplierPayments,
    saleReturnsList,
    purchaseReturnsList,
    shiftsList,
    registers,
    units,
    purchasesList,
    purchaseSummary,
    openingBalances,
    otherIncome,
    closingStockValue,
    stockLotsList,
  ] = await Promise.all([
    catalog.listBranches(),
    catalog.listCategories(),
    catalog.listProducts(),
    catalog.listStocks(),
    customers.listCustomers(),
    auth.listUsers(),
    orders.listOrders(),
    transfers.listTransfers(),
    expenseSupplier.listExpenses(),
    expenseSupplier.listSuppliers().catch(() => []),
    expenseSupplier.listSupplierBills().catch(() => []),
    expenseSupplier.listSupplierPayments().catch(() => []),
    saleReturns.listSaleReturns().catch(() => []),
    purchaseReturns.listPurchaseReturns().catch(() => []),
    shifts.listShifts(),
    shifts.listRegisters(),
    catalog.listUnits().catch(() => []),
    purchase.listPurchases().catch(() => []),
    purchase.purchaseSummary().catch(() => ({
      itemsSubtotal: 0,
      shippingCost: 0,
      totalPurchases: 0,
      totalPaid: 0,
      totalCredit: 0,
      purchaseCount: 0,
    })),
    purchase.listOpeningBalances().catch(() => []),
    purchase.listOtherIncome().catch(() => []),
    purchase.currentClosingStockValue().catch(() => 0),
    stockLots.listStockLots().catch(() => []),
  ]);

  return {
    branches,
    categories,
    products,
    stocks,
    customers: customersList,
    users,
    orders: ordersList,
    transfers: transfersList,
    expenses,
    suppliers,
    supplierBills,
    supplierPayments,
    saleReturns: saleReturnsList,
    purchaseReturns: purchaseReturnsList,
    shifts: shiftsList,
    registers,
    units,
    purchases: purchasesList,
    purchaseSummary,
    openingBalances,
    otherIncome,
    closingStockValue,
    stockLots: stockLotsList,
  };
}

export async function financialSummary(branchId?: string, startDate?: string, endDate?: string) {
  const pool = getPool();

  const salesConditions = ["o.order_status <> 'VOIDED'"];
  const salesParams: any[] = [];
  if (branchId) {
    salesConditions.push("o.branch_id = ?");
    salesParams.push(branchId);
  }
  if (startDate) {
    salesConditions.push("DATE(o.created_at) >= ?");
    salesParams.push(startDate);
  }
  if (endDate) {
    salesConditions.push("DATE(o.created_at) <= ?");
    salesParams.push(endDate);
  }

  const salesSql = `SELECT
       COALESCE(SUM(o.subtotal),0) AS grossSales,
       COALESCE(SUM(o.discount_amount),0) AS discounts,
       COALESCE(SUM(o.grand_total),0) AS netCollected,
       COALESCE(SUM(o.tax_amount),0) AS taxCollected,
       COUNT(*) AS orderCount
     FROM orders o WHERE ${salesConditions.join(' AND ')}`;
  const [sales]: any = await pool.query(salesSql, salesParams);

  const cogsSql = `SELECT COALESCE(SUM(oi.cost_price * oi.quantity),0) AS cogs
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE ${salesConditions.join(' AND ')}`;
  const [cogsRows]: any = await pool.query(cogsSql, salesParams);

  const expConditions: string[] = ['1=1'];
  const expParams: any[] = [];
  if (branchId) {
    expConditions.push('branch_id = ?');
    expParams.push(branchId);
  }
  if (startDate) {
    expConditions.push('DATE(expense_date) >= ?');
    expParams.push(startDate);
  }
  if (endDate) {
    expConditions.push('DATE(expense_date) <= ?');
    expParams.push(endDate);
  }
  const expSql = `SELECT COALESCE(SUM(amount),0) AS expenses FROM operating_expenses WHERE ${expConditions.join(' AND ')}`;
  const [expRows]: any = await pool.query(expSql, expParams);

  const [arRows]: any = await pool.query(
    `SELECT COALESCE(SUM(current_credit),0) AS ar FROM customers`
  );

  let ap = 0;
  try {
    const [apRows]: any = await pool.query(
      `SELECT COALESCE(SUM(balance_payable),0) AS ap FROM suppliers`
    );
    ap = num(apRows[0]?.ap);
  } catch {
    ap = 0;
  }

  let returnsAmount = 0;
  try {
    const retConditions: string[] = ['1=1'];
    const retParams: any[] = [];
    if (branchId) {
      retConditions.push('branch_id = ?');
      retParams.push(branchId);
    }
    if (startDate) {
      retConditions.push('DATE(created_at) >= ?');
      retParams.push(startDate);
    }
    if (endDate) {
      retConditions.push('DATE(created_at) <= ?');
      retParams.push(endDate);
    }
    const [retRows]: any = await pool.query(
      `SELECT COALESCE(SUM(total_refund_amount),0) AS returns FROM sale_returns WHERE ${retConditions.join(' AND ')}`,
      retParams
    );
    returnsAmount = num(retRows[0]?.returns);
  } catch {
    returnsAmount = 0;
  }

  const purchaseSum = await purchase.purchaseSummary(startDate, endDate).catch(() => ({
    itemsSubtotal: 0,
    shippingCost: 0,
    totalPurchases: 0,
    totalPaid: 0,
    totalCredit: 0,
    purchaseCount: 0,
  }));
  const closingStock = await purchase.currentClosingStockValue().catch(() => 0);
  const openings = await purchase.listOpeningBalances().catch(() => []);
  const openingStock = openings[0]?.openingStockValue || 0;
  let otherIncomeList = await purchase.listOtherIncome().catch(() => [] as Awaited<ReturnType<typeof purchase.listOtherIncome>>);
  if (branchId) {
    otherIncomeList = otherIncomeList.filter((i) => !i.branchId || i.branchId === branchId);
  }
  if (startDate) {
    otherIncomeList = otherIncomeList.filter((i) => (i.incomeDate || '').slice(0, 10) >= startDate);
  }
  if (endDate) {
    otherIncomeList = otherIncomeList.filter((i) => (i.incomeDate || '').slice(0, 10) <= endDate);
  }
  const otherIncomeTotal = otherIncomeList.reduce((s, i) => s + i.amount, 0);

  // Inventory-method COGS (shipping already inside totalPurchases via landed cost)
  const inventoryCogs = Math.max(0, openingStock + purchaseSum.totalPurchases - closingStock);

  const grossSales = num(sales[0].grossSales);
  const discounts = num(sales[0].discounts);
  const netSales = Math.max(0, grossSales - discounts - returnsAmount);
  const salesCogs = num(cogsRows[0].cogs);
  // Prefer inventory method when purchases/opening exist; else fall back to sales COGS
  const cogs =
    purchaseSum.purchaseCount > 0 || openingStock > 0 ? inventoryCogs : salesCogs;
  const grossProfit = netSales - cogs;
  const operatingExpenses = num(expRows[0].expenses);
  const netOperatingProfit = grossProfit + otherIncomeTotal - operatingExpenses;

  const fiscalPeriod =
    startDate && endDate
      ? `${startDate} ~ ${endDate}`
      : new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return {
    currency: 'MMK',
    fiscalPeriod,
    data: {
      grossSales,
      salesDiscounts: discounts,
      returns: returnsAmount,
      netSales,
      openingStock,
      purchases: purchaseSum.totalPurchases,
      purchasesItemsSubtotal: purchaseSum.itemsSubtotal,
      shippingCost: purchaseSum.shippingCost,
      purchasesPaid: purchaseSum.totalPaid,
      purchasesCredit: purchaseSum.totalCredit,
      closingStock,
      inventoryCogs,
      salesCogs,
      cogs,
      grossProfit,
      grossMargin: netSales ? `${((grossProfit / netSales) * 100).toFixed(2)}%` : '0%',
      otherIncome: otherIncomeTotal,
      operatingExpenses,
      netOperatingProfit,
      netMargin: netSales ? `${((netOperatingProfit / netSales) * 100).toFixed(2)}%` : '0%',
      accountsReceivable: num(arRows[0].ar),
      accountsPayable: ap,
      commercialTaxCollected: num(sales[0].taxCollected),
      orderCount: num(sales[0].orderCount),
      purchaseCount: purchaseSum.purchaseCount,
      formula:
        'Net Sales = Gross − Discount − Returns; COGS = Opening + Purchases(incl. shipping) − Closing; Net Profit = Gross Profit + Other Income − OpEx',
    },
  };
}
