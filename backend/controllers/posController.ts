import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as auth from '../services/authService.js';
import * as catalog from '../services/catalogService.js';
import * as customers from '../services/customerService.js';
import * as orders from '../services/orderService.js';
import * as shifts from '../services/shiftService.js';
import * as transfers from '../services/transferService.js';
import * as expenseSupplier from '../services/expenseSupplierService.js';
import * as saleReturns from '../services/saleReturnService.js';
import * as purchaseReturns from '../services/purchaseReturnService.js';
import * as reports from '../services/reportService.js';
import * as purchases from '../services/purchaseService.js';
import * as stockLots from '../services/stockLotService.js';
import * as audit from '../services/auditService.js';
import { env } from '../config/env.js';

export const health = (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    service: 'OmniPOS Enterprise Backend API',
    backendPort: env.backendPort,
    frontendPort: env.frontendPort,
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  });
};

export const dbStatus = asyncHandler(async (_req, res) => {
  const data = await reports.getDbStatus();
  res.json({ success: true, data });
});

export const bootstrap = asyncHandler(async (_req, res) => {
  const data = await reports.getBootstrap();
  res.json({ success: true, data });
});

export const login = asyncHandler(async (req, res) => {
  const data = await auth.loginUser(req.body);
  res.json({ success: true, data });
});

export const getUsers = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await auth.listUsers() });
});
export const postUser = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await auth.createUser(req.body) });
});
export const patchUser = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await auth.updateUser(req.params.id, req.body) });
});
export const removeUser = asyncHandler(async (req, res) => {
  await auth.deleteUser(req.params.id);
  res.json({ success: true });
});

export const getBranches = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await catalog.listBranches() });
});
export const postBranch = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await catalog.createBranch(req.body) });
});
export const patchBranch = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await catalog.updateBranch(req.params.id, req.body) });
});

export const getCategories = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await catalog.listCategories() });
});
export const postCategory = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await catalog.createCategory(req.body) });
});
export const patchCategory = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await catalog.updateCategory(req.params.id, req.body) });
});
export const removeCategory = asyncHandler(async (req, res) => {
  await catalog.deleteCategory(req.params.id);
  res.json({ success: true });
});

export const getUnits = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await catalog.listUnits() });
});
export const postUnit = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await catalog.createUnit(req.body) });
});
export const removeUnit = asyncHandler(async (req, res) => {
  await catalog.deleteUnit(req.params.id);
  res.json({ success: true });
});

export const getProducts = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await catalog.listProducts() });
});
export const postProduct = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await catalog.createProduct(req.body) });
});
export const patchProduct = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await catalog.updateProduct(req.params.id, req.body) });
});

export const getStocks = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await catalog.listStocks(req.query.branchId as string | undefined),
  });
});
export const putAdjustStock = asyncHandler(async (req, res) => {
  const { branchId, productId, quantity } = req.body;
  res.json({
    success: true,
    data: await catalog.adjustStock(branchId, productId, Number(quantity)),
  });
});
export const getStockLots = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await stockLots.listStockLots({
      branchId: req.query.branchId as string | undefined,
      productId: req.query.productId as string | undefined,
      remainingOnly: req.query.remainingOnly === '1' || req.query.remainingOnly === 'true',
    }),
  });
});

export const getCustomers = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await customers.listCustomers() });
});
export const postCustomer = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await customers.createCustomer(req.body) });
});
export const patchCustomer = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await customers.updateCustomer(req.params.id, req.body) });
});
export const settleCredit = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, branchId } = req.body;
  res.json({
    success: true,
    data: await customers.settleCustomerCredit(
      req.params.id,
      Number(amount),
      paymentMethod,
      branchId
    ),
  });
});

export const getOrders = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await orders.listOrders(req.query.branchId as string | undefined),
  });
});
export const postOrder = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await orders.createOrder(req.body) });
});
export const deleteOrder = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await orders.deleteOrder(req.params.id) });
});

export const getShifts = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await shifts.listShifts(req.query.branchId as string | undefined),
  });
});
export const getRegisters = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await shifts.listRegisters(req.query.branchId as string | undefined),
  });
});
export const openShift = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await shifts.openShift(req.body) });
});
export const closeShift = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await shifts.closeShift(req.params.id, Number(req.body.actualCash), req.body.notes),
  });
});
export const cashMovement = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await shifts.cashMovement(
      req.params.id,
      Number(req.body.amount),
      req.body.type,
      req.body.reason,
      req.body.userId
    ),
  });
});

export const getTransfers = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await transfers.listTransfers() });
});
export const postTransfer = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await transfers.createTransfer(req.body) });
});
export const receiveTransfer = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await transfers.receiveTransfer(req.params.id, req.body.receivedBy),
  });
});
export const distribute = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await transfers.distributeStock(req.body) });
});

export const getExpenses = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await expenseSupplier.listExpenses(req.query.branchId as string | undefined),
  });
});
export const postExpense = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await expenseSupplier.createExpense(req.body) });
});
export const removeExpense = asyncHandler(async (req, res) => {
  await expenseSupplier.deleteExpense(req.params.id);
  res.json({ success: true });
});

export const getSuppliers = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await expenseSupplier.listSuppliers() });
});
export const postSupplier = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await expenseSupplier.createSupplier(req.body) });
});
export const patchSupplier = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await expenseSupplier.updateSupplier(req.params.id, req.body) });
});
export const getSupplierBills = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await expenseSupplier.listSupplierBills() });
});
export const getSupplierPayments = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await expenseSupplier.listSupplierPayments() });
});
export const postSupplierPayment = asyncHandler(async (req, res) => {
  res.status(201).json({
    success: true,
    data: await expenseSupplier.settleSupplierPayment({
      ...req.body,
      supplierId: req.params.id,
    }),
  });
});
export const postGrn = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await expenseSupplier.receiveGrn(req.body) });
});

export const getPurchases = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await purchases.listPurchases() });
});
export const patchPurchase = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await purchases.updatePurchase(req.params.id, req.body) });
});
export const getPurchaseSummary = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await purchases.purchaseSummary() });
});
export const getClosingStockValue = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { value: await purchases.currentClosingStockValue() } });
});
export const getOpeningBalances = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await purchases.listOpeningBalances() });
});
export const postOpeningBalance = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await purchases.upsertOpeningBalance(req.body) });
});
export const getOtherIncome = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await purchases.listOtherIncome() });
});
export const postOtherIncome = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await purchases.createOtherIncome(req.body) });
});

export const getSaleReturns = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await saleReturns.listSaleReturns() });
});
export const postSaleReturn = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await saleReturns.createSaleReturn(req.body) });
});

export const getPurchaseReturns = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await purchaseReturns.listPurchaseReturns() });
});
export const postPurchaseReturn = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await purchaseReturns.createPurchaseReturn(req.body) });
});

export const financialSummary = asyncHandler(async (req, res) => {
  const branchId = req.query.branchId as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  res.json({
    success: true,
    ...(await reports.financialSummary(branchId, startDate, endDate)),
  });
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 10);
  const branchId = req.query.branchId as string | undefined;
  const data = await audit.listAuditLogs({ branchId, page, pageSize });
  res.json({ success: true, data });
});
