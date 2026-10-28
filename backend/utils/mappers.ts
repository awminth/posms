import { bool, num, formatDateTime } from './helpers.js';
import { permissionsForRole } from './permissions.js';

export function mapBranch(row: any) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
    address: row.address,
    city: row.city,
    phone: row.phone,
    email: row.email || '',
    taxRate: num(row.tax_rate),
    currency: row.currency || 'MMK',
    receiptHeader: row.receipt_header || '',
    receiptFooter: row.receipt_footer || '',
    isActive: bool(row.is_active),
  };
}

export function mapUser(row: any) {
  let permissions = permissionsForRole(row.role);
  if (row.permissions) {
    try {
      const parsed = typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions;
      if (parsed && typeof parsed === 'object') permissions = { ...permissions, ...parsed };
    } catch {
      /* keep role defaults */
    }
  }
  return {
    id: row.id,
    branchId: row.branch_id ?? null,
    username: row.username,
    fullName: row.full_name,
    email: row.email || '',
    phone: row.phone || '',
    role: row.role,
    avatar: row.avatar_url || '',
    pinCode: row.pin_code,
    password: undefined,
    isActive: bool(row.is_active),
    permissions,
    createdAt: row.created_at ? String(row.created_at).slice(0, 10) : undefined,
  };
}

export function mapCategory(row: any) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon || 'Package',
    color: row.color_code || '#4F46E5',
  };
}

export function mapProduct(row: any) {
  let packagingConfig = undefined;
  if (row.packaging_config) {
    try {
      packagingConfig =
        typeof row.packaging_config === 'string'
          ? JSON.parse(row.packaging_config)
          : row.packaging_config;
    } catch {
      packagingConfig = undefined;
    }
  }
  return {
    id: row.id,
    categoryId: row.category_id,
    sku: row.sku,
    barcode: row.barcode || '',
    name: row.name,
    description: row.description || '',
    costPrice: num(row.cost_price),
    sellingPrice: num(row.selling_price),
    unit: row.unit || 'pcs',
    imageUrl: row.image_url || '',
    packagingConfig,
  };
}

export function mapStock(row: any) {
  return {
    branchId: row.branch_id,
    productId: row.product_id,
    quantity: num(row.quantity_on_hand),
    reorderLevel: num(row.reorder_level, 10),
    shelfLocation: row.shelf_location || '',
  };
}

export function mapCustomer(row: any) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    tier: row.loyalty_tier || 'REGULAR',
    points: num(row.loyalty_points),
    totalSpent: num(row.total_spent),
    visitsCount: num(row.total_visits),
    creditLimit: num(row.credit_limit, 300000),
    currentCredit: num(row.current_credit, 0),
  };
}

export function mapShift(row: any) {
  return {
    id: row.id,
    branchId: row.branch_id,
    registerName: row.register_name || row.registerName || 'Terminal',
    cashierName: row.cashier_name || row.cashierName || '',
    openedAt: row.opened_at ? String(row.opened_at) : '',
    closedAt: row.closed_at ? String(row.closed_at) : undefined,
    openingFloat: num(row.opening_float),
    currentCash: num(row.expected_cash),
    expectedCash: num(row.expected_cash),
    actualCash: row.actual_cash != null ? num(row.actual_cash) : undefined,
    difference: row.difference != null ? num(row.difference) : undefined,
    cashSales: num(row.cash_sales),
    mobileWalletSales: num(row.mobile_sales),
    cardSales: num(row.card_sales),
    totalSales: num(row.total_sales_amount),
    ordersCount: num(row.total_orders_count),
    status: row.status,
    notes: row.notes || undefined,
  };
}

export function mapExpense(row: any) {
  return {
    id: row.id,
    expenseNumber: row.expense_number,
    category: row.category,
    title: row.title,
    amount: num(row.amount),
    branchId: row.branch_id,
    date: row.date ? String(row.date).slice(0, 10) : '',
    paymentMethod: row.payment_method,
    recordedBy: row.recorded_by,
    notes: row.notes || undefined,
  };
}

export function mapSupplier(row: any) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    email: row.email || '',
    address: row.address || '',
    category: row.category || 'General',
    totalPurchased: num(row.total_purchased),
    totalPaid: num(row.total_paid),
    balancePayable: num(row.balance_payable),
    paymentTermsDays: num(row.payment_terms_days, 30),
    createdAt: row.created_at ? String(row.created_at).slice(0, 10) : '',
  };
}

export function mapSupplierBill(row: any) {
  return {
    id: row.id,
    billNumber: row.bill_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    branchId: row.branch_id,
    totalAmount: num(row.total_amount),
    paidAmount: num(row.paid_amount),
    balanceDue: num(row.balance_due),
    status: row.status,
    billDate: row.bill_date ? String(row.bill_date).slice(0, 10) : '',
    dueDate: row.due_date ? String(row.due_date).slice(0, 10) : '',
    notes: row.notes || undefined,
    itemsSummary: row.items_summary || '',
  };
}

export function mapSupplierPayment(row: any) {
  return {
    id: row.id,
    paymentNumber: row.payment_number,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    amount: num(row.amount),
    paymentMethod: row.payment_method,
    referenceNo: row.reference_no || undefined,
    bankName: row.bank_name || undefined,
    paidDate: row.paid_date ? String(row.paid_date).slice(0, 10) : '',
    paidBy: row.paid_by,
    notes: row.notes || undefined,
  };
}

export function mapTransfer(row: any) {
  return {
    id: row.id,
    transferNumber: row.transfer_number,
    sourceBranchId: row.source_branch_id,
    destBranchId: row.destination_branch_id,
    productId: row.product_id,
    productName: row.product_name || '',
    quantity: num(row.quantity ?? row.quantity_requested),
    status: row.status,
    requestedBy: row.requested_by_name || row.requested_by || '',
    createdAt: row.created_at ? formatDateTime(row.created_at) : '',
    notes: row.notes || undefined,
  };
}
