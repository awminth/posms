import { api } from './client';
import type {
  Branch,
  CashierUser,
  Category,
  Product,
  BranchStock,
  Customer,
  Order,
  OrderPayment,
  Shift,
  StockTransfer,
  Supplier,
  SupplierBill,
  SupplierPayment,
  SaleReturn,
  OperatingExpense,
  GRNItem,
  GoodsReceivedNote,
  PaymentMethod,
  PurchaseRecord,
  PurchaseSummary,
  PurchaseReturn,
  InventoryOpeningBalance,
  OtherIncome,
  StockLot,
} from '../types/pos';

export type BootstrapData = {
  branches: Branch[];
  categories: Category[];
  products: Product[];
  stocks: BranchStock[];
  customers: Customer[];
  users: CashierUser[];
  orders: Order[];
  transfers: StockTransfer[];
  expenses: OperatingExpense[];
  suppliers: Supplier[];
  supplierBills: SupplierBill[];
  supplierPayments: SupplierPayment[];
  saleReturns: SaleReturn[];
  purchaseReturns?: PurchaseReturn[];
  shifts: Shift[];
  registers: { id: string; branchId: string; name: string; terminalCode: string }[];
  units: { id: string; name: string; displayOrder: number }[];
  purchases?: PurchaseRecord[];
  purchaseSummary?: PurchaseSummary;
  openingBalances?: InventoryOpeningBalance[];
  otherIncome?: OtherIncome[];
  closingStockValue?: number;
  stockLots?: StockLot[];
};

export const posApi = {
  health: () => api.get<{ status: string }>('/health'),
  dbStatus: () => api.get<Record<string, unknown>>('/db-status'),
  bootstrap: () => api.get<BootstrapData>('/bootstrap'),

  login: (payload: { username?: string; password?: string; pin?: string; branchId?: string }) =>
    api.post<{ user: CashierUser; branchId?: string }>('/auth/login', payload),

  getBranches: () => api.get<Branch[]>('/branches'),
  createBranch: (data: Partial<Branch>) => api.post<Branch>('/branches', data),
  updateBranch: (id: string, data: Partial<Branch>) => api.patch<Branch>(`/branches/${id}`, data),

  getCategories: () => api.get<Category[]>('/categories'),
  createCategory: (data: { name: string; color?: string; icon?: string; slug?: string }) =>
    api.post<Category>('/categories', data),
  updateCategory: (id: string, data: Partial<Category> & { color?: string }) =>
    api.patch<Category>(`/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete<void>(`/categories/${id}`),

  getUnits: () => api.get<{ id: string; name: string; displayOrder: number }[]>('/units'),
  createUnit: (data: { name: string; displayOrder?: number }) =>
    api.post<{ id: string; name: string; displayOrder: number }>('/units', data),
  deleteUnit: (id: string) => api.delete<void>(`/units/${id}`),

  getProducts: () => api.get<Product[]>('/products'),
  createProduct: (data: Omit<Product, 'id'> & { initialStocks?: Record<string, number> }) =>
    api.post<Product>('/products', data),
  updateProduct: (id: string, data: Partial<Product>) => api.patch<Product>(`/products/${id}`, data),

  getStocks: (branchId?: string) =>
    api.get<BranchStock[]>(branchId ? `/stocks?branchId=${encodeURIComponent(branchId)}` : '/stocks'),
  getStockLots: (opts?: { branchId?: string; productId?: string; remainingOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (opts?.branchId) q.set('branchId', opts.branchId);
    if (opts?.productId) q.set('productId', opts.productId);
    if (opts?.remainingOnly) q.set('remainingOnly', '1');
    const qs = q.toString();
    return api.get<import('../types/pos').StockLot[]>(qs ? `/stock-lots?${qs}` : '/stock-lots');
  },
  adjustStock: (branchId: string, productId: string, quantity: number) =>
    api.put<BranchStock>('/stocks/adjust', { branchId, productId, quantity }),

  getCustomers: () => api.get<Customer[]>('/customers'),
  createCustomer: (data: Partial<Customer>) => api.post<Customer>('/customers', data),
  updateCustomer: (id: string, data: Partial<Customer>) => api.patch<Customer>(`/customers/${id}`, data),
  settleCustomerCredit: (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string,
    branchId?: string
  ) =>
    api.post<Customer>(`/customers/${customerId}/settle-credit`, {
      amount,
      paymentMethod,
      notes,
      branchId,
    }),

  getOrders: (branchId?: string) =>
    api.get<Order[]>(branchId ? `/orders?branchId=${encodeURIComponent(branchId)}` : '/orders'),
  createOrder: (payload: {
    branchId: string;
    registerId?: string;
    shiftId?: string;
    cashierId: string;
    customerId?: string;
    items: {
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      costPrice?: number;
      quantity: number;
      discountAmount?: number;
    }[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    grandTotal: number;
    payments: OrderPayment[];
    notes?: string;
  }) => api.post<Order>('/orders', payload),
  deleteOrder: (orderId: string) => api.delete<{ id: string; orderNumber: string; restored: boolean }>(`/orders/${orderId}`),

  getShifts: (branchId?: string) =>
    api.get<Shift[]>(branchId ? `/shifts?branchId=${encodeURIComponent(branchId)}` : '/shifts'),
  openShift: (payload: {
    branchId: string;
    registerId?: string;
    cashierId: string;
    openingFloat: number;
  }) => api.post<Shift>('/shifts/open', payload),
  closeShift: (id: string, actualCash: number, notes?: string) =>
    api.post<Shift>(`/shifts/${id}/close`, { actualCash, notes }),
  cashMovement: (id: string, amount: number, type: 'CASH_IN' | 'CASH_OUT', reason: string) =>
    api.post<Shift>(`/shifts/${id}/cash-movement`, { amount, type, reason }),

  getTransfers: () => api.get<StockTransfer[]>('/transfers'),
  createTransfer: (payload: {
    sourceBranchId: string;
    destBranchId: string;
    productId: string;
    quantity: number;
    requestedBy: string;
    notes?: string;
  }) => api.post<StockTransfer>('/transfers', payload),
  receiveTransfer: (id: string, receivedBy?: string) =>
    api.post<StockTransfer>(`/transfers/${id}/receive`, { receivedBy }),

  getExpenses: (branchId?: string) =>
    api.get<OperatingExpense[]>(
      branchId ? `/expenses?branchId=${encodeURIComponent(branchId)}` : '/expenses'
    ),
  createExpense: (data: Omit<OperatingExpense, 'id' | 'expenseNumber'>) =>
    api.post<OperatingExpense>('/expenses', data),
  deleteExpense: (id: string) => api.delete<void>(`/expenses/${id}`),

  getSuppliers: () => api.get<Supplier[]>('/suppliers'),
  createSupplier: (data: Partial<Supplier>) => api.post<Supplier>('/suppliers', data),
  updateSupplier: (id: string, data: Partial<Supplier>) =>
    api.patch<Supplier>(`/suppliers/${id}`, data),
  settleSupplierPayment: (payload: {
    supplierId: string;
    amount: number;
    paymentMethod: SupplierPayment['paymentMethod'];
    referenceNo?: string;
    bankName?: string;
    notes?: string;
    paidBy: string;
  }) => api.post<SupplierPayment>(`/suppliers/${payload.supplierId}/payments`, payload),
  getSupplierBills: () => api.get<SupplierBill[]>('/suppliers/bills'),
  getSupplierPayments: () => api.get<SupplierPayment[]>('/suppliers/payments'),

  receiveGrn: (payload: {
    supplierId: string;
    supplierName: string;
    destBranchId: string;
    items: GRNItem[];
    paymentType: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
    notes?: string;
    receivedBy: string;
    shippingCost?: number;
    paidAmount?: number;
    purchaseDate?: string;
  }) => api.post<GoodsReceivedNote>('/inventory/grn', payload),

  getPurchases: () => api.get<import('../types/pos').PurchaseRecord[]>('/purchases'),
  updatePurchase: (
    id: string,
    data: {
      purchaseDate?: string;
      notes?: string | null;
      receivedBy?: string | null;
      paymentType?: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
      paidAmount?: number;
      shippingCost?: number;
      items?: {
        id: string;
        quantity?: number;
        unitCost?: number;
        sellingPrice?: number;
      }[];
    }
  ) => api.patch<import('../types/pos').PurchaseRecord>(`/purchases/${id}`, data),
  getPurchaseSummary: () =>
    api.get<import('../types/pos').PurchaseSummary>('/purchases/summary'),
  getClosingStockValue: () => api.get<{ value: number }>('/inventory/closing-value'),
  getOpeningBalances: () =>
    api.get<import('../types/pos').InventoryOpeningBalance[]>('/inventory/opening-balances'),
  saveOpeningBalance: (data: {
    periodLabel: string;
    periodStart: string;
    periodEnd?: string;
    openingStockValue: number;
    notes?: string;
    createdBy?: string;
  }) => api.post<import('../types/pos').InventoryOpeningBalance>('/inventory/opening-balances', data),
  getOtherIncome: () => api.get<import('../types/pos').OtherIncome[]>('/other-income'),
  createOtherIncome: (data: Partial<import('../types/pos').OtherIncome> & { title: string; amount: number }) =>
    api.post<import('../types/pos').OtherIncome>('/other-income', data),

  distributeStock: (payload: {
    productId: string;
    sourceBranchId?: string;
    distributions: { destBranchId: string; quantity: number }[];
    notes?: string;
    requestedBy: string;
  }) => api.post<StockTransfer[]>('/inventory/distribute', payload),

  getSaleReturns: () => api.get<SaleReturn[]>('/sale-returns'),
  createSaleReturn: (data: Omit<SaleReturn, 'id' | 'returnNumber' | 'createdAt'>) =>
    api.post<SaleReturn>('/sale-returns', data),

  getPurchaseReturns: () => api.get<PurchaseReturn[]>('/purchase-returns'),
  createPurchaseReturn: (data: {
    purchaseId: string;
    items: { productId: string; quantityReturned: number }[];
    settlementMethod?: 'REDUCE_CREDIT' | 'CASH_REFUND';
    reason?: string;
    notes?: string;
    stockDeducted?: boolean;
    createdBy?: string;
  }) => api.post<PurchaseReturn>('/purchase-returns', data),

  getUsers: () => api.get<CashierUser[]>('/users'),
  createUser: (data: Omit<CashierUser, 'id' | 'createdAt'>) => api.post<CashierUser>('/users', data),
  updateUser: (id: string, data: Partial<CashierUser>) => api.patch<CashierUser>(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete<void>(`/users/${id}`),

  getAuditLogs: (params?: { page?: number; pageSize?: number; branchId?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    if (params?.branchId) q.set('branchId', params.branchId);
    const qs = q.toString();
    return api.get<{
      rows: {
        id: string;
        branchId: string | null;
        userId: string | null;
        userName: string | null;
        userUsername: string | null;
        action: string;
        tableName: string | null;
        recordId: string | null;
        description: string;
        details: Record<string, unknown> | null;
        createdAt: string;
      }[];
      total: number;
    }>(`/audit-logs${qs ? `?${qs}` : ''}`);
  },

  financialSummary: (branchId?: string, startDate?: string, endDate?: string) => {
    const q = new URLSearchParams();
    if (branchId && branchId !== 'ALL') q.set('branchId', branchId);
    if (startDate) q.set('startDate', startDate);
    if (endDate) q.set('endDate', endDate);
    const qs = q.toString();
    return api.get<Record<string, unknown>>(`/reports/financial-summary${qs ? `?${qs}` : ''}`);
  },
};
