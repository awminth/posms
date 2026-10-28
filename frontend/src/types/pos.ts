export type BranchType = 'RETAIL' | 'WAREHOUSE' | 'EXPRESS';
export type UserRole = 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER' | 'INVENTORY_CLERK';
export type PaymentMethod = 'CASH' | 'CREDIT' | 'KBZ_PAY' | 'WAVE_PAY' | 'CREDIT_CARD' | 'AYAPAY';
export type OrderStatus = 'COMPLETED' | 'VOIDED' | 'HOLD' | 'RETURNED' | 'PARTIALLY_RETURNED';
export type NavigationTab = 
  | 'register'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'suppliers'
  | 'users'
  | 'reports'
  | 'financial'
  | 'expenses'
  | 'other-income'
  | 'branches'
  | 'setup-categories'
  | 'setup-units'
  | 'setup-system-log'
  | 'transfers';

export interface Branch {
  id: string;
  code: string;
  name: string;
  type: BranchType;
  address: string;
  city: string;
  stateOrDivision?: string;
  phone: string;
  email: string;
  taxRate: number; // in percentage e.g. 5%
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  isActive: boolean;
}

export interface UserPermissions {
  canSell: boolean;
  canSellCredit: boolean;
  canReturnSale: boolean;
  canManageInventory: boolean;
  canTransferStock?: boolean;
  canDistributeStock?: boolean; // Main Store မှ ဆိုင်ခွဲများသို့ စတော့ဖြန့်ဝေခွင့်
  canManageSuppliers: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canSwitchBranch: boolean;
  canProcessReturns?: boolean;
  canStockTransfer?: boolean;
  canViewSystemLog?: boolean;
}

export interface CashierUser {
  id: string;
  branchId: string | null; // null represents Super Admin with access across all branches
  username: string;
  fullName: string;
  password?: string;
  role: UserRole;
  avatar: string;
  pinCode?: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  permissions: UserPermissions;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

// Multi-tier Packaging Hierarchy: e.g. 1 Carton (ဖာ) = 20 Packs (ကတ်) = 30 Sachets (အထုပ်ငယ်/အသေးဆုံးယူနစ်) per pack
export interface PackagingUnitConfig {
  hasPackagingLevels?: boolean;
  level1Name?: string; // e.g. 'Carton (ဖာ)'
  level2Name?: string; // e.g. 'Pack (ကတ်/ထုပ်ကြီး)'
  level2PerLevel1?: number; // e.g. 20 packs in 1 carton
  level3Name?: string; // e.g. 'Sachet / Piece (အထုပ်ငယ်/အသေးဆုံးယူနစ်)'
  level3PerLevel2?: number; // e.g. 30 sachets in 1 pack
  primaryUnit?: string;
  intermediateUnit?: string;
  intermediateMultiplier?: number;
  baseUnit?: string;
  baseMultiplier?: number;
}

export interface Product {
  id: string;
  categoryId: string;
  sku: string;
  barcode: string;
  name: string;
  description: string;
  costPrice: number;
  sellingPrice: number;
  unit: string;
  imageUrl: string;
  packagingConfig?: PackagingUnitConfig;
}

export interface BranchStock {
  branchId: string;
  productId: string;
  quantity: number;
  reorderLevel: number;
  shelfLocation: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number; // fixed discount amount
  notes?: string;
  /** FIFO lot this line sells from — same SKU can appear twice at different prices */
  stockLotId?: string;
  costPrice?: number;
}

export interface StockLot {
  id: string;
  branchId: string;
  productId: string;
  purchaseId?: string;
  purchaseItemId?: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number;
  landedUnitCost: number;
  sellingPrice: number;
  receivedAt: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: 'REGULAR' | 'SILVER' | 'GOLD' | 'VIP';
  points: number;
  totalSpent: number;
  visitsCount: number;
  creditLimit: number; // Max allowed unpaid debt
  currentCredit: number; // Current unpaid balance
}

export interface OrderPayment {
  method: PaymentMethod;
  amount: number;
  amountTendered: number;
  changeGiven: number;
  transactionRef?: string;
  dueDate?: string; // For CREDIT payment
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  registerName: string;
  cashierName: string;
  customer?: Customer;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  discountType: 'PERCENTAGE' | 'FIXED';
  taxAmount: number;
  grandTotal: number;
  payments: OrderPayment[];
  orderStatus: OrderStatus;
  createdAt: string;
  notes?: string;
  creditDueDate?: string;
  creditStatus?: 'UNPAID' | 'PARTIAL' | 'SETTLED';
  creditPaidAmount?: number;
  returnedAmount?: number;
  isReturned?: boolean;
}

export type SaleReturnReason = 'DEFECTIVE' | 'WRONG_ITEM' | 'EXPIRED' | 'CUSTOMER_CHANGE' | 'OTHER';
export type RefundMethod = 'CASH' | 'CUSTOMER_CREDIT' | 'ORIGINAL_PAYMENT';

export interface SaleReturnItem {
  productId: string;
  productName: string;
  unit?: string;
  sku?: string;
  unitPrice: number;
  quantityReturned: number;
  refundAmount: number;
  condition?: 'GOOD' | 'DAMAGED';
}

export interface SaleReturn {
  id: string;
  returnNumber: string;
  originalOrderId?: string;
  originalOrderNumber?: string;
  orderNumber?: string;
  orderId?: string;
  branchId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  items: SaleReturnItem[];
  totalRefundAmount: number;
  refundMethod: RefundMethod | string;
  reason: SaleReturnReason | string;
  notes?: string;
  restockedToInventory: boolean;
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  totalPurchased: number;
  totalPaid: number;
  balancePayable: number; // ပေးရန်ကျန်ငွေ
  paymentTermsDays?: number;
  createdAt: string;
}

export interface SupplierBill {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
  billDate: string;
  dueDate: string;
  notes?: string;
  itemsSummary: string;
}

export interface SupplierPayment {
  id: string;
  paymentNumber: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  paymentMethod: 'CASH' | 'KBZ_PAY' | 'WAVE_PAY' | 'BANK_TRANSFER' | 'CHEQUE';
  referenceNo?: string;
  bankName?: string;
  paidDate: string;
  paidBy: string;
  notes?: string;
}

// Goods Received Note (GRN) for Central Warehouse Inward
export interface GRNItem {
  productId: string;
  productName: string;
  // Packaging breakdown
  cartonsReceived?: number;
  receivedCartons?: number;
  receivedPacks?: number;
  receivedBaseUnits?: number;
  packsPerCarton?: number;
  basePerPack?: number;
  totalBaseUnitsReceived: number;
  unitCost: number; // Cost per base unit
  totalCost: number;
  /** Sell price for this purchase batch (FIFO lot) */
  sellingPrice?: number;
}

export interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  purchaseNumber?: string;
  supplierId: string;
  supplierName: string;
  destBranchId: string;
  items: GRNItem[];
  itemsSubtotal?: number;
  shippingCost?: number;
  totalAmount: number;
  paidAmount?: number;
  creditAmount?: number;
  receivedDate: string;
  purchaseDate?: string;
  receivedBy: string;
  paymentType: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
  notes?: string;
}

export interface PurchaseRecord {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  destBranchId: string;
  purchaseDate: string;
  itemsSubtotal: number;
  shippingCost: number;
  totalAmount: number;
  paidAmount: number;
  creditAmount: number;
  paymentType: string;
  supplierBillId?: string;
  receivedBy?: string;
  notes?: string;
  items: {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    shippingAllocated: number;
    landedUnitCost: number;
    lineTotal: number;
    sellingPrice?: number;
  }[];
}

export interface PurchaseReturnItem {
  id?: string;
  productId: string;
  productName: string;
  quantityReturned: number;
  unitCost: number;
  landedUnitCost: number;
  refundAmount: number;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  totalRefundAmount: number;
  settlementMethod: 'REDUCE_CREDIT' | 'CASH_REFUND' | string;
  reason: string;
  notes?: string;
  stockDeducted: boolean;
  createdBy?: string;
  createdAt: string;
  items: PurchaseReturnItem[];
}

export interface PurchaseSummary {
  itemsSubtotal: number;
  shippingCost: number;
  totalPurchases: number;
  totalPaid: number;
  totalCredit: number;
  purchaseCount: number;
}

export interface InventoryOpeningBalance {
  id: string;
  periodLabel: string;
  periodStart: string;
  periodEnd?: string | null;
  openingStockValue: number;
  notes?: string;
}

export interface OtherIncome {
  id: string;
  incomeNumber: string;
  branchId?: string;
  title: string;
  category: string;
  amount: number;
  incomeDate: string;
  notes?: string;
}

export interface HeldOrder {
  id: string;
  tag: string;
  items: CartItem[];
  customer?: Customer;
  savedAt: string;
  notes?: string;
}

export interface Shift {
  id: string;
  branchId: string;
  registerName: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingFloat: number;
  currentCash: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  cashSales: number;
  mobileWalletSales: number;
  cardSales: number;
  totalSales: number;
  ordersCount: number;
  status: 'OPEN' | 'CLOSED';
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  destBranchId: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  requestedBy: string;
  createdAt: string;
  notes?: string;
}

export type ExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARIES'
  | 'LOGISTICS'
  | 'PAYMENT_FEES'
  | 'PACKAGING'
  | 'MAINTENANCE'
  | 'MARKETING'
  | 'OTHER';

export interface OperatingExpense {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  branchId: string;
  date: string;
  paymentMethod: PaymentMethod;
  recordedBy: string;
  notes?: string;
}

