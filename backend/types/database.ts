/**
 * OmniPOS Enterprise - Database Types & Relational Interfaces
 * These TypeScript definitions reflect the SQL database schema.
 */

export type BranchType = 'RETAIL' | 'WAREHOUSE' | 'EXPRESS';
export type UserRole = 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER' | 'INVENTORY_CLERK';
export type LoyaltyTier = 'REGULAR' | 'SILVER' | 'GOLD' | 'VIP';
export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
export type ShiftStatus = 'OPEN' | 'CLOSED';
export type OrderStatus = 'COMPLETED' | 'VOIDED' | 'HOLD';
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'KBZ_PAY' | 'WAVE_PAY' | 'CREDIT_CARD' | 'AYAPAY' | 'CB_PAY';

export interface DbBranch {
  id: string;
  code: string;
  name: string;
  type: BranchType;
  address: string;
  city: string;
  state_or_division: string;
  phone: string;
  email?: string;
  tax_rate: number; // e.g. 5.0%
  currency: string; // 'MMK', 'USD', etc.
  receipt_header?: string;
  receipt_footer?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbUser {
  id: string;
  branch_id: string | null; // null for Super Admin
  username: string;
  full_name: string;
  email?: string;
  password_hash: string;
  pin_code: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color_code: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbProduct {
  id: string;
  category_id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  cost_price: number;
  selling_price: number;
  unit: string;
  image_url?: string;
  track_stock: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBranchStock {
  id: string;
  branch_id: string;
  product_id: string;
  quantity_on_hand: number;
  reorder_level: number;
  ideal_stock: number;
  shelf_location?: string;
  last_counted_at?: string;
  updated_at: string;
}

export interface DbStockTransfer {
  id: string;
  transfer_number: string;
  source_branch_id: string;
  destination_branch_id: string;
  status: TransferStatus;
  requested_by: string;
  dispatched_by?: string;
  received_by?: string;
  dispatched_at?: string;
  received_at?: string;
  notes?: string;
  created_at: string;
}

export interface DbStockTransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity_requested: number;
  quantity_shipped: number;
  quantity_received: number;
  unit_cost: number;
}

export interface DbRegister {
  id: string;
  branch_id: string;
  name: string;
  terminal_code: string;
  is_active: boolean;
  created_at: string;
}

export interface DbShift {
  id: string;
  branch_id: string;
  register_id: string;
  cashier_id: string;
  opened_at: string;
  closed_at?: string;
  opening_float: number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  total_sales_amount: number;
  total_orders_count: number;
  status: ShiftStatus;
  notes?: string;
}

export interface DbCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  loyalty_tier: LoyaltyTier;
  loyalty_points: number;
  total_spent: number;
  total_visits: number;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string;
  order_number: string;
  branch_id: string;
  register_id: string;
  shift_id: string;
  cashier_id: string;
  customer_id?: string;
  subtotal: number;
  discount_amount: number;
  discount_type: 'FIXED' | 'PERCENTAGE';
  tax_amount: number;
  grand_total: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes?: string;
  created_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  discount_amount: number;
  total_price: number;
}

export interface DbPayment {
  id: string;
  order_id: string;
  branch_id: string;
  payment_method: PaymentMethod;
  amount: number;
  amount_tendered: number;
  change_given: number;
  transaction_ref?: string;
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED';
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  branch_id?: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  details?: Record<string, unknown>;
  created_at: string;
}
