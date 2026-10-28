import { Router } from 'express';
import * as c from '../controllers/posController.js';

const router = Router();

router.get('/health', c.health);
router.get('/db-status', c.dbStatus);
router.get('/bootstrap', c.bootstrap);

router.post('/auth/login', c.login);

router.get('/users', c.getUsers);
router.post('/users', c.postUser);
router.patch('/users/:id', c.patchUser);
router.delete('/users/:id', c.removeUser);

router.get('/branches', c.getBranches);
router.post('/branches', c.postBranch);
router.patch('/branches/:id', c.patchBranch);

router.get('/categories', c.getCategories);
router.post('/categories', c.postCategory);
router.patch('/categories/:id', c.patchCategory);
router.delete('/categories/:id', c.removeCategory);

router.get('/units', c.getUnits);
router.post('/units', c.postUnit);
router.delete('/units/:id', c.removeUnit);

router.get('/products', c.getProducts);
router.post('/products', c.postProduct);
router.patch('/products/:id', c.patchProduct);

router.get('/stocks', c.getStocks);
router.put('/stocks/adjust', c.putAdjustStock);
router.get('/stock-lots', c.getStockLots);

router.get('/customers', c.getCustomers);
router.post('/customers', c.postCustomer);
router.patch('/customers/:id', c.patchCustomer);
router.post('/customers/:id/settle-credit', c.settleCredit);

router.get('/orders', c.getOrders);
router.post('/orders', c.postOrder);
router.delete('/orders/:id', c.deleteOrder);

router.get('/shifts', c.getShifts);
router.get('/registers', c.getRegisters);
router.post('/shifts/open', c.openShift);
router.post('/shifts/:id/close', c.closeShift);
router.post('/shifts/:id/cash-movement', c.cashMovement);

router.get('/transfers', c.getTransfers);
router.post('/transfers', c.postTransfer);
router.post('/transfers/:id/receive', c.receiveTransfer);
router.post('/inventory/distribute', c.distribute);
router.post('/inventory/grn', c.postGrn);
router.get('/purchases', c.getPurchases);
router.patch('/purchases/:id', c.patchPurchase);
router.get('/purchases/summary', c.getPurchaseSummary);
router.get('/inventory/closing-value', c.getClosingStockValue);
router.get('/inventory/opening-balances', c.getOpeningBalances);
router.post('/inventory/opening-balances', c.postOpeningBalance);
router.get('/other-income', c.getOtherIncome);
router.post('/other-income', c.postOtherIncome);

router.get('/expenses', c.getExpenses);
router.post('/expenses', c.postExpense);
router.delete('/expenses/:id', c.removeExpense);

router.get('/suppliers', c.getSuppliers);
router.post('/suppliers', c.postSupplier);
router.patch('/suppliers/:id', c.patchSupplier);
router.get('/suppliers/bills', c.getSupplierBills);
router.get('/suppliers/payments', c.getSupplierPayments);
router.post('/suppliers/:id/payments', c.postSupplierPayment);

router.get('/sale-returns', c.getSaleReturns);
router.post('/sale-returns', c.postSaleReturn);

router.get('/purchase-returns', c.getPurchaseReturns);
router.post('/purchase-returns', c.postPurchaseReturn);

router.get('/reports/financial-summary', c.financialSummary);
router.get('/financial/summary', c.financialSummary);

router.get('/audit-logs', c.getAuditLogs);

export default router;
