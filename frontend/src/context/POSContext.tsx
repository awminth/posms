import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';
import {
  Branch,
  CashierUser,
  Category,
  Product,
  BranchStock,
  CartItem,
  Customer,
  Order,
  HeldOrder,
  Shift,
  StockTransfer,
  NavigationTab,
  OrderPayment,
  PaymentMethod,
  Supplier,
  SupplierBill,
  SupplierPayment,
  SaleReturn,
  GoodsReceivedNote,
  GRNItem,
  UserPermissions,
  OperatingExpense,
  PurchaseRecord,
  PurchaseSummary,
  PurchaseReturn,
  InventoryOpeningBalance,
  OtherIncome,
  StockLot,
} from '../types/pos';
import { CURRENT_USER } from '../mock/initialData';
import { posApi } from '../api/posApi';
import {
  LOGIN_PATH,
  navigateToPath,
  pathToTab,
  tabToPath,
} from '../utils/navigation';
import { setApiActor } from '../api/client';
import { showWarning } from '../utils/swal';

interface POSContextType {
  isLoading: boolean;
  apiOnline: boolean;
  refreshData: () => Promise<void>;
  branches: Branch[];
  currentBranch: Branch;
  setCurrentBranchId: (id: string) => void;
  currentUser: CashierUser;
  demoUsers: CashierUser[];
  users: CashierUser[];
  addNewUser: (user: Omit<CashierUser, 'id' | 'createdAt'>) => Promise<CashierUser>;
  updateUser: (userId: string, updates: Partial<CashierUser>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  canUserPerformAction: (action: keyof UserPermissions) => boolean;
  isSuperAdmin: boolean;
  canAccessAllBranches: boolean;
  accessibleBranches: Branch[];
  isAuthenticated: boolean;
  loginWithPin: (pin: string, branchId?: string, rememberMe?: boolean) => Promise<boolean | 'BRANCH_MISMATCH'>;
  loginWithCredentials: (
    username: string,
    password: string,
    branchId?: string,
    rememberMe?: boolean
  ) => Promise<boolean | 'BRANCH_MISMATCH'>;
  quickLoginAsUser: (userId: string, branchId?: string) => void;
  logout: () => void;
  categories: Category[];
  units: { id: string; name: string; displayOrder: number }[];
  addCategory: (data: { name: string; color?: string }) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category> & { color?: string }) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUnit: (data: { name: string }) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  products: Product[];
  branchStocks: BranchStock[];
  stockLots: StockLot[];
  currentBranchStock: (productId: string) => number;
  currentBranchStockItem: (productId: string) => BranchStock | undefined;
  /** FIFO lots with remaining qty for product at current branch */
  lotsForProduct: (productId: string) => StockLot[];
  /** Price range hint for POS grid when multiple lot sell prices */
  sellPriceHint: (productId: string) => { min: number; max: number; multi: boolean };
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateCartItemQuantity: (productId: string, quantity: number, stockLotId?: string) => void;
  updateCartItemDiscount: (productId: string, discount: number, stockLotId?: string) => void;
  removeFromCart: (productId: string, stockLotId?: string) => void;
  clearCart: () => void;
  orderDiscount: number;
  setOrderDiscount: (amount: number) => void;
  orderTax: number;
  setOrderTax: (amount: number) => void;
  selectedCustomer: Customer | undefined;
  setSelectedCustomer: (customer: Customer | undefined) => void;
  cartSubtotal: number;
  cartDiscount: number;
  cartTax: number;
  cartGrandTotal: number;
  cartItemCount: number;
  heldOrders: HeldOrder[];
  holdCurrentOrder: (tag?: string) => void;
  resumeHeldOrder: (heldId: string) => void;
  deleteHeldOrder: (heldId: string) => void;
  orders: Order[];
  processCheckout: (payments: OrderPayment[], notes?: string) => Promise<Order>;
  activeReceiptOrder: Order | null;
  setActiveReceiptOrder: (order: Order | null) => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  isMobileCartOpen: boolean;
  setIsMobileCartOpen: (open: boolean) => void;
  toggleMobileCart: () => void;
  currentShift: Shift | undefined;
  recordCashMovement: (amount: number, type: 'CASH_IN' | 'CASH_OUT', reason: string) => Promise<void>;
  closeShift: (actualCash: number, notes?: string) => Promise<void>;
  openShift: (openingFloat: number) => Promise<void>;
  transfers: StockTransfer[];
  createStockTransfer: (
    sourceId: string,
    destId: string,
    productId: string,
    quantity: number,
    notes?: string
  ) => Promise<void>;
  receiveTransfer: (transferId: string) => Promise<void>;
  adjustStock: (branchId: string, productId: string, newQty: number) => Promise<void>;
  addNewProduct: (
    product: Omit<Product, 'id'>,
    initialStocks?: Record<string, number>
  ) => Promise<Product>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  receiveStockInward: (grnData: {
    supplierId: string;
    supplierName: string;
    destBranchId: string;
    items: GRNItem[];
    paymentType: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
    notes?: string;
    shippingCost?: number;
    paidAmount?: number;
    purchaseDate?: string;
  }) => Promise<GoodsReceivedNote>;
  distributeFromMainStore: (
    productId: string,
    distributions: { destBranchId: string; quantity: number }[],
    notes?: string
  ) => Promise<void>;
  saleReturns: SaleReturn[];
  processSaleReturn: (
    data: Omit<SaleReturn, 'id' | 'returnNumber' | 'createdAt' | 'cashierName'>
  ) => Promise<SaleReturn>;
  deleteOrder: (orderId: string) => Promise<void>;
  purchaseReturns: PurchaseReturn[];
  processPurchaseReturn: (data: {
    purchaseId: string;
    items: { productId: string; quantityReturned: number }[];
    settlementMethod?: 'REDUCE_CREDIT' | 'CASH_REFUND';
    reason?: string;
    notes?: string;
    stockDeducted?: boolean;
  }) => Promise<PurchaseReturn>;
  customers: Customer[];
  addNewCustomer: (
    customer: Omit<Customer, 'id' | 'points' | 'totalSpent' | 'visitsCount'>
  ) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  settleCustomerCredit: (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => Promise<void>;
  suppliers: Supplier[];
  supplierBills: SupplierBill[];
  supplierPayments: SupplierPayment[];
  addNewSupplier: (
    supplier: Omit<
      Supplier,
      'id' | 'code' | 'totalPurchased' | 'totalPaid' | 'balancePayable' | 'createdAt'
    >
  ) => Promise<Supplier>;
  updateSupplier: (
    id: string,
    data: Partial<
      Omit<Supplier, 'id' | 'code' | 'totalPurchased' | 'totalPaid' | 'balancePayable' | 'createdAt'>
    >
  ) => Promise<Supplier>;
  settleSupplierPayment: (
    supplierId: string,
    amount: number,
    paymentMethod: SupplierPayment['paymentMethod'],
    referenceNo?: string,
    bankName?: string,
    notes?: string
  ) => Promise<SupplierPayment>;
  purchases: PurchaseRecord[];
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
  ) => Promise<PurchaseRecord>;
  purchaseSummary: PurchaseSummary;
  openingBalances: InventoryOpeningBalance[];
  otherIncome: OtherIncome[];
  closingStockValue: number;
  saveOpeningBalance: (data: {
    periodLabel: string;
    periodStart: string;
    periodEnd?: string;
    openingStockValue: number;
    notes?: string;
  }) => Promise<void>;
  addOtherIncome: (data: {
    title: string;
    amount: number;
    category?: string;
    notes?: string;
    branchId?: string;
    incomeDate?: string;
  }) => Promise<void>;
  expenses: OperatingExpense[];
  addExpense: (expense: Omit<OperatingExpense, 'id' | 'expenseNumber'>) => Promise<OperatingExpense>;
  deleteExpense: (id: string) => Promise<void>;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const emptyBranch: Branch = {
  id: '',
  code: '',
  name: 'Loading…',
  type: 'RETAIL',
  address: '',
  city: '',
  phone: '',
  email: '',
  taxRate: 5,
  currency: 'MMK',
  receiptHeader: '',
  receiptFooter: '',
  isActive: true,
};

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchId, setCurrentBranchId] = useState<string>('b-01');
  const [currentUser, setCurrentUser] = useState<CashierUser>(CURRENT_USER);
  const [users, setUsers] = useState<CashierUser[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string; displayOrder: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [branchStocks, setBranchStocks] = useState<BranchStock[]>([]);
  const [stockLots, setStockLots] = useState<StockLot[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [shiftsList, setShiftsList] = useState<Shift[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierBills, setSupplierBills] = useState<SupplierBill[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [saleReturns, setSaleReturns] = useState<SaleReturn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [expenses, setExpenses] = useState<OperatingExpense[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary>({
    itemsSubtotal: 0,
    shippingCost: 0,
    totalPurchases: 0,
    totalPaid: 0,
    totalCredit: 0,
    purchaseCount: 0,
  });
  const [openingBalances, setOpeningBalances] = useState<InventoryOpeningBalance[]>([]);
  const [otherIncome, setOtherIncome] = useState<OtherIncome[]>([]);
  const [closingStockValue, setClosingStockValue] = useState(0);
  const [registers, setRegisters] = useState<
    { id: string; branchId: string; name: string; terminalCode: string }[]
  >([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscountState] = useState(0);
  const [orderTax, setOrderTaxState] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTabState] = useState<NavigationTab>(() => {
    if (typeof window === 'undefined') return 'register';
    return pathToTab(window.location.pathname) || 'register';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const SESSION_KEY = 'omnipos_session';
  const REMEMBER_KEY = 'omnipos_remembered_login';

  const applyBootstrap = (data: Awaited<ReturnType<typeof posApi.bootstrap>>) => {
    setBranches(data.branches || []);
    setCategories(data.categories || []);
    setUnits(data.units || []);
    setProducts(data.products || []);
    setBranchStocks(data.stocks || []);
    setStockLots(data.stockLots || []);
    setCustomers(data.customers || []);
    setUsers(data.users || []);
    setOrders(data.orders || []);
    setTransfers(data.transfers || []);
    setExpenses(data.expenses || []);
    setSuppliers(data.suppliers || []);
    setSupplierBills(data.supplierBills || []);
    setSupplierPayments(data.supplierPayments || []);
    setSaleReturns(data.saleReturns || []);
    setPurchaseReturns(data.purchaseReturns || []);
    setShiftsList(data.shifts || []);
    setRegisters(data.registers || []);
    setPurchases(data.purchases || []);
    setPurchaseSummary(
      data.purchaseSummary || {
        itemsSubtotal: 0,
        shippingCost: 0,
        totalPurchases: 0,
        totalPaid: 0,
        totalCredit: 0,
        purchaseCount: 0,
      }
    );
    setOpeningBalances(data.openingBalances || []);
    setOtherIncome(data.otherIncome || []);
    setClosingStockValue(data.closingStockValue || 0);
    if (data.branches?.length && !data.branches.find((b) => b.id === currentBranchId)) {
      setCurrentBranchId(data.branches[0].id);
    }
  };

  const refreshData = async () => {
    const data = await posApi.bootstrap();
    applyBootstrap(data);
    setApiOnline(true);
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = () => {
      try {
        const saved =
          localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
        if (!saved) return;
        const session = JSON.parse(saved);
        if (session?.user) {
          const user = session.user as CashierUser;
          const locked =
            user.role !== 'SUPER_ADMIN' && user.branchId
              ? user.branchId
              : session.branchId || user.branchId || 'b-01';
          setCurrentUser(user);
          setCurrentBranchId(locked);
          setIsAuthenticated(true);
          setApiActor({
            userId: user.id,
            fullName: user.fullName,
            username: user.username,
            role: user.role,
            branchId: locked,
          });
        }
      } catch (err) {
        console.error('[POS] Session restore failed', err);
      }
    };

    restoreSession();

    (async () => {
      try {
        await refreshData();
      } catch (err) {
        console.error('[POS] Failed to load from API', err);
        if (!cancelled) setApiOnline(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const resolveWorkingBranchId = (user: CashierUser, requestedBranchId?: string) => {
    if (user.role !== 'SUPER_ADMIN' && user.branchId) return user.branchId;
    if (requestedBranchId) return requestedBranchId;
    return branches.find((b) => b.isActive)?.id || branches[0]?.id || 'b-01';
  };

  /** Branch staff must select their assigned store; Super Admin may pick any. */
  const assertBranchAllowed = (user: CashierUser, requestedBranchId?: string): boolean => {
    if (user.role === 'SUPER_ADMIN') return true;
    if (!user.branchId) return true;
    return !!requestedBranchId && requestedBranchId === user.branchId;
  };

  const persistSession = (
    user: CashierUser,
    branchId?: string,
    rememberMe = true,
    password?: string
  ) => {
    const payload = JSON.stringify({
      user,
      branchId: branchId || user.branchId,
      rememberMe,
    });
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (rememberMe) {
      localStorage.setItem(SESSION_KEY, payload);
      localStorage.setItem(
        REMEMBER_KEY,
        JSON.stringify({
          username: user.username,
          password: password || '',
          branchId: branchId || user.branchId || '',
          rememberMe: true,
        })
      );
    } else {
      sessionStorage.setItem(SESSION_KEY, payload);
      localStorage.removeItem(REMEMBER_KEY);
    }
  };

  const canUserPerformAction = (action: keyof UserPermissions): boolean => {
    if (currentUser.role === 'SUPER_ADMIN') return true;
    return !!currentUser.permissions?.[action];
  };

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const canAccessAllBranches =
    isSuperAdmin || !!currentUser.permissions?.canSwitchBranch;
  /** null = all branches (admin / switch permitted) */
  const scopeBranchId = canAccessAllBranches ? null : currentUser.branchId;

  const accessibleBranches = useMemo(() => {
    if (canAccessAllBranches) return branches;
    if (!currentUser.branchId) return branches;
    return branches.filter((b) => b.id === currentUser.branchId);
  }, [branches, canAccessAllBranches, currentUser.branchId]);

  const syncActor = (user: CashierUser, branchId: string) => {
    setApiActor({
      userId: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      branchId: branchId || user.branchId || '',
    });
  };

  const setCurrentBranchIdGuarded = (id: string) => {
    if (!canAccessAllBranches && currentUser.branchId && id !== currentUser.branchId) {
      return;
    }
    setCurrentBranchId(id);
    syncActor(currentUser, id);
  };

  const currentBranch = useMemo(
    () => branches.find((b) => b.id === currentBranchId) || branches[0] || emptyBranch,
    [branches, currentBranchId]
  );

  const scopedOrders = useMemo(
    () => (scopeBranchId ? orders.filter((o) => o.branchId === scopeBranchId) : orders),
    [orders, scopeBranchId]
  );
  const scopedExpenses = useMemo(
    () => (scopeBranchId ? expenses.filter((e) => e.branchId === scopeBranchId) : expenses),
    [expenses, scopeBranchId]
  );
  const scopedSaleReturns = useMemo(
    () => (scopeBranchId ? saleReturns.filter((r) => r.branchId === scopeBranchId) : saleReturns),
    [saleReturns, scopeBranchId]
  );
  const scopedBranchStocks = useMemo(
    () =>
      scopeBranchId ? branchStocks.filter((s) => s.branchId === scopeBranchId) : branchStocks,
    [branchStocks, scopeBranchId]
  );
  const scopedStockLots = useMemo(
    () => (scopeBranchId ? stockLots.filter((l) => l.branchId === scopeBranchId) : stockLots),
    [stockLots, scopeBranchId]
  );
  const scopedOtherIncome = useMemo(
    () =>
      scopeBranchId
        ? (otherIncome || []).filter((i) => !i.branchId || i.branchId === scopeBranchId)
        : otherIncome,
    [otherIncome, scopeBranchId]
  );
  const scopedPurchases = useMemo(
    () =>
      scopeBranchId
        ? (purchases || []).filter((p: any) => !p.branchId || p.branchId === scopeBranchId)
        : purchases,
    [purchases, scopeBranchId]
  );
  const scopedTransfers = useMemo(
    () =>
      scopeBranchId
        ? transfers.filter(
            (t) => t.sourceBranchId === scopeBranchId || t.destBranchId === scopeBranchId
          )
        : transfers,
    [transfers, scopeBranchId]
  );
  const scopedUsers = useMemo(
    () =>
      scopeBranchId
        ? users.filter((u) => u.role === 'SUPER_ADMIN' || u.branchId === scopeBranchId)
        : users,
    [users, scopeBranchId]
  );
  const scopedSupplierBills = useMemo(
    () =>
      scopeBranchId
        ? supplierBills.filter((b) => b.branchId === scopeBranchId)
        : supplierBills,
    [supplierBills, scopeBranchId]
  );
  const scopedPurchaseReturns = useMemo(
    () =>
      scopeBranchId
        ? (purchaseReturns || []).filter(
            (r: any) => !r.branchId || r.branchId === scopeBranchId
          )
        : purchaseReturns,
    [purchaseReturns, scopeBranchId]
  );

  const currentShift = useMemo(
    () => shiftsList.find((s) => s.branchId === currentBranchId && s.status === 'OPEN'),
    [shiftsList, currentBranchId]
  );

  const demoUsers = scopedUsers;

  const currentBranchStock = (productId: string) =>
    scopedBranchStocks.find((s) => s.branchId === currentBranchId && s.productId === productId)
      ?.quantity || 0;

  const currentBranchStockItem = (productId: string) =>
    scopedBranchStocks.find((s) => s.branchId === currentBranchId && s.productId === productId);

  const lotsForProduct = (productId: string) =>
    scopedStockLots
      .filter(
        (l) =>
          l.branchId === currentBranchId &&
          l.productId === productId &&
          (l.quantityRemaining ?? 0) > 0
      )
      .sort((a, b) => String(a.receivedAt || '').localeCompare(String(b.receivedAt || '')));

  const sellPriceHint = (productId: string) => {
    const lots = lotsForProduct(productId);
    if (!lots.length) {
      const p = products.find((x) => x.id === productId);
      const price = p?.sellingPrice || 0;
      return { min: price, max: price, multi: false };
    }
    const prices = lots.map((l) => l.sellingPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, multi: min !== max };
  };

  /** Allocate qty across FIFO lots → cart line patches (same SKU different prices = separate lines) */
  const allocateLotsToCartLines = (
    product: Product,
    quantity: number,
    existingCart: CartItem[]
  ): CartItem[] => {
    const lots = lotsForProduct(product.id).map((l) => {
      const alreadyInCart = existingCart
        .filter((c) => c.product.id === product.id && c.stockLotId === l.id)
        .reduce((s, c) => s + c.quantity, 0);
      return { ...l, available: Math.max(0, l.quantityRemaining - alreadyInCart) };
    });

    let need = quantity;
    const additions: CartItem[] = [];

    for (const lot of lots) {
      if (need <= 0) break;
      if (lot.available <= 0) continue;
      const take = Math.min(lot.available, need);
      additions.push({
        product,
        quantity: take,
        unitPrice: lot.sellingPrice,
        costPrice: lot.landedUnitCost || lot.unitCost,
        stockLotId: lot.id,
        discount: 0,
      });
      need -= take;
    }

    // Fallback if no lots / insufficient lot qty — use master price
    if (need > 0) {
      additions.push({
        product,
        quantity: need,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        discount: 0,
      });
    }

    return additions;
  };

  const mergeCartAdditions = (prev: CartItem[], additions: CartItem[]): CartItem[] => {
    const next = [...prev];
    for (const add of additions) {
      const idx = next.findIndex(
        (i) =>
          i.product.id === add.product.id &&
          (i.stockLotId || '') === (add.stockLotId || '') &&
          i.unitPrice === add.unitPrice
      );
      if (idx > -1) {
        next[idx] = { ...next[idx], quantity: next[idx].quantity + add.quantity };
      } else {
        next.push(add);
      }
    }
    return next;
  };

  const addToCart = (product: Product, quantity = 1) => {
    const available = currentBranchStock(product.id);
    const inCartAlready = cart
      .filter((i) => i.product.id === product.id)
      .reduce((s, i) => s + i.quantity, 0);

    if (inCartAlready + quantity > available) {
      showWarning(
        'လက်ကျန်မလုံလောက်ပါ',
        `${product.name} — ဆိုင်ခွဲလက်ကျန် ${available} သာရှိပါသည်`
      );
      return;
    }

    setCart((prev) => {
      const additions = allocateLotsToCartLines(product, quantity, prev);
      return mergeCartAdditions(prev, additions);
    });
  };

  const removeFromCart = (productId: string, stockLotId?: string) =>
    setCart((prev) =>
      prev.filter((i) => {
        if (i.product.id !== productId) return true;
        if (stockLotId !== undefined) return (i.stockLotId || '') !== stockLotId;
        return false;
      })
    );

  const updateCartItemQuantity = (productId: string, quantity: number, stockLotId?: string) => {
    if (quantity <= 0) return removeFromCart(productId, stockLotId);

    const available = currentBranchStock(productId);
    const otherInCart = cart
      .filter(
        (i) =>
          i.product.id === productId &&
          (stockLotId !== undefined ? (i.stockLotId || '') !== stockLotId : !!i.stockLotId)
      )
      .reduce((s, i) => s + i.quantity, 0);

    const maxAllowed = Math.max(0, available - otherInCart);
    if (quantity > maxAllowed) {
      showWarning(
        'လက်ကျန်မလုံလောက်ပါ',
        `ဤပစ္စည်းအတွက် ဆိုင်ခွဲလက်ကျန် အများဆုံး ${available} သာရှိပါသည်`
      );
    }
    const effectiveQty = Math.min(quantity, maxAllowed);
    if (effectiveQty <= 0) return removeFromCart(productId, stockLotId);

    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        if (stockLotId !== undefined && (i.stockLotId || '') !== stockLotId) return i;
        if (stockLotId === undefined && i.stockLotId) return i;
        return { ...i, quantity: effectiveQty };
      })
    );
  };

  const updateCartItemDiscount = (productId: string, discount: number, stockLotId?: string) =>
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id !== productId) return i;
        if (stockLotId !== undefined && (i.stockLotId || '') !== stockLotId) return i;
        return { ...i, discount: Math.max(0, discount) };
      })
    );

  const clearCart = () => {
    setCart([]);
    setOrderDiscountState(0);
    setOrderTaxState(0);
    setSelectedCustomer(undefined);
  };

  const cartSubtotal = useMemo(
    () => cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    [cart]
  );

  const setOrderDiscount = (amount: number) => {
    setOrderDiscountState(Math.max(0, Math.min(Number(amount) || 0, cartSubtotal)));
  };

  const setOrderTax = (amount: number) => {
    setOrderTaxState(Math.max(0, Number(amount) || 0));
  };

  // Bill-level discount / tax only (tax is manual — default 0)
  const cartDiscount = orderDiscount;
  const cartTax = orderTax;
  const cartGrandTotal = useMemo(
    () => Math.max(0, cartSubtotal - cartDiscount) + cartTax,
    [cartSubtotal, cartDiscount, cartTax]
  );
  const cartItemCount = useMemo(() => cart.reduce((c, i) => c + i.quantity, 0), [cart]);

  const setActiveTab = (tab: NavigationTab) => {
    setActiveTabState(tab);
    setIsMobileMenuOpen(false);
    navigateToPath(tabToPath(tab));
  };

  // Keep URL ↔ activeTab in sync (back/forward + deep links)
  useEffect(() => {
    const syncFromUrl = () => {
      const path = window.location.pathname;
      if (path === LOGIN_PATH) return;
      const tab = pathToTab(path);
      if (tab) {
        setActiveTabState(tab);
      } else if (path === '/' || path === '') {
        navigateToPath(tabToPath('register'), true);
        setActiveTabState('register');
      }
    };

    // Normalize bare "/" on first load when already authenticated later
    if (window.location.pathname === '/' || window.location.pathname === '') {
      navigateToPath(tabToPath(activeTab), true);
    } else if (!pathToTab(window.location.pathname) && window.location.pathname !== LOGIN_PATH) {
      navigateToPath(tabToPath('register'), true);
      setActiveTabState('register');
    }

    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only URL bootstrap
  }, []);

  const goToAppAfterLogin = () => {
    const tab = pathToTab(window.location.pathname) || activeTab || 'register';
    navigateToPath(tabToPath(tab), true);
    setActiveTabState(tab);
  };

  const loginWithPin = async (
    pin: string,
    branchId?: string,
    rememberMe = true
  ): Promise<boolean | 'BRANCH_MISMATCH'> => {
    try {
      const data = await posApi.login({ pin, branchId });
      if (!assertBranchAllowed(data.user, branchId)) return 'BRANCH_MISMATCH';
      const workingBranch = resolveWorkingBranchId(data.user, branchId || data.branchId);
      setCurrentUser(data.user);
      setCurrentBranchId(workingBranch);
      setIsAuthenticated(true);
      syncActor(data.user, workingBranch);
      persistSession(data.user, workingBranch, rememberMe, pin);
      goToAppAfterLogin();
      return true;
    } catch {
      return false;
    }
  };

  const loginWithCredentials = async (
    username: string,
    password: string,
    branchId?: string,
    rememberMe = true
  ): Promise<boolean | 'BRANCH_MISMATCH'> => {
    try {
      const data = await posApi.login({ username, password, branchId });
      if (!assertBranchAllowed(data.user, branchId)) return 'BRANCH_MISMATCH';
      const workingBranch = resolveWorkingBranchId(data.user, branchId || data.branchId);
      setCurrentUser(data.user);
      setCurrentBranchId(workingBranch);
      setIsAuthenticated(true);
      syncActor(data.user, workingBranch);
      persistSession(data.user, workingBranch, rememberMe, password);
      goToAppAfterLogin();
      return true;
    } catch {
      return false;
    }
  };

  const quickLoginAsUser = (userId: string, branchId?: string) => {
    const user = users.find((u) => u.id === userId) || users[0];
    if (!user) return;
    if (!assertBranchAllowed(user, branchId)) return;
    const workingBranch = resolveWorkingBranchId(user, branchId);
    setCurrentUser(user);
    setCurrentBranchId(workingBranch);
    setIsAuthenticated(true);
    syncActor(user, workingBranch);
    persistSession(user, workingBranch, true);
    goToAppAfterLogin();
  };

  const logout = () => {
    setIsAuthenticated(false);
    setApiActor(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    navigateToPath(LOGIN_PATH, true);
    // Keep remembered username preference; only clear if user had not opted in
    try {
      const remembered = localStorage.getItem(REMEMBER_KEY);
      if (remembered) {
        const parsed = JSON.parse(remembered);
        if (!parsed?.rememberMe) localStorage.removeItem(REMEMBER_KEY);
      }
    } catch {
      /* ignore */
    }
  };

  const holdCurrentOrder = (tag?: string) => {
    if (!cart.length) return;
    setHeldOrders((prev) => [
      {
        id: `hold-${Date.now()}`,
        tag: tag || `Order #${prev.length + 1} (${selectedCustomer?.name || 'Walk-in'})`,
        items: [...cart],
        customer: selectedCustomer,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
    clearCart();
  };

  const resumeHeldOrder = (heldId: string) => {
    const held = heldOrders.find((h) => h.id === heldId);
    if (!held) return;
    setCart(held.items);
    setSelectedCustomer(held.customer);
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
  };

  const deleteHeldOrder = (heldId: string) =>
    setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));

  const processCheckout = async (payments: OrderPayment[], notes?: string) => {
    const register = registers.find((r) => r.branchId === currentBranchId);
    const order = await posApi.createOrder({
      branchId: currentBranchId,
      registerId: register?.id,
      shiftId: currentShift?.id,
      cashierId: currentUser.id,
      customerId: selectedCustomer?.id,
      items: cart.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        sku: i.product.sku,
        unitPrice: i.unitPrice,
        costPrice: i.costPrice ?? i.product.costPrice,
        quantity: i.quantity,
        discountAmount: 0,
        stockLotId: i.stockLotId,
      })),
      subtotal: cartSubtotal,
      discountAmount: cartDiscount,
      taxAmount: cartTax,
      grandTotal: cartGrandTotal,
      payments,
      notes,
    });
    clearCart();
    setActiveReceiptOrder(order);
    await refreshData();
    return order;
  };

  const openShift = async (openingFloat: number) => {
    await posApi.openShift({
      branchId: currentBranchId,
      cashierId: currentUser.id,
      openingFloat,
      registerId: registers.find((r) => r.branchId === currentBranchId)?.id,
    });
    await refreshData();
  };

  const closeShift = async (actualCash: number, notes?: string) => {
    if (!currentShift) return;
    await posApi.closeShift(currentShift.id, actualCash, notes);
    await refreshData();
  };

  const recordCashMovement = async (
    amount: number,
    type: 'CASH_IN' | 'CASH_OUT',
    reason: string
  ) => {
    if (!currentShift) return;
    await posApi.cashMovement(currentShift.id, amount, type, reason);
    await refreshData();
  };

  const createStockTransfer = async (
    sourceId: string,
    destId: string,
    productId: string,
    quantity: number,
    notes?: string
  ) => {
    await posApi.createTransfer({
      sourceBranchId: sourceId,
      destBranchId: destId,
      productId,
      quantity,
      requestedBy: currentUser.id,
      notes,
    });
    await refreshData();
  };

  const receiveTransfer = async (transferId: string) => {
    await posApi.receiveTransfer(transferId, currentUser.id);
    await refreshData();
  };

  const adjustStock = async (branchId: string, productId: string, newQty: number) => {
    await posApi.adjustStock(branchId, productId, newQty);
    await refreshData();
  };

  const addNewProduct = async (
    productData: Omit<Product, 'id'>,
    initialStocks: Record<string, number> = {}
  ) => {
    const created = await posApi.createProduct({ ...productData, initialStocks });
    await refreshData();
    return created;
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    await posApi.updateProduct(id, data);
    await refreshData();
  };

  const addCategory = async (data: { name: string; color?: string }) => {
    const cat = await posApi.createCategory(data);
    await refreshData();
    return cat;
  };

  const updateCategory = async (id: string, data: Partial<Category> & { color?: string }) => {
    await posApi.updateCategory(id, data);
    await refreshData();
  };

  const deleteCategory = async (id: string) => {
    await posApi.deleteCategory(id);
    await refreshData();
  };

  const addUnit = async (data: { name: string }) => {
    await posApi.createUnit(data);
    await refreshData();
  };

  const deleteUnit = async (id: string) => {
    await posApi.deleteUnit(id);
    await refreshData();
  };

  const addNewCustomer = async (
    custData: Omit<Customer, 'id' | 'points' | 'totalSpent' | 'visitsCount'>
  ) => {
    const customer = await posApi.createCustomer(custData);
    setSelectedCustomer(customer);
    await refreshData();
    return customer;
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    await posApi.updateCustomer(id, data);
    await refreshData();
  };

  const settleCustomerCredit = async (
    customerId: string,
    amount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => {
    await posApi.settleCustomerCredit(customerId, amount, paymentMethod, notes, currentBranchId);
    await refreshData();
  };

  const receiveStockInward = async (grnData: {
    supplierId: string;
    supplierName: string;
    destBranchId: string;
    items: GRNItem[];
    paymentType: 'CASH_ON_DELIVERY' | 'CREDIT_BILL' | 'PARTIAL';
    notes?: string;
    shippingCost?: number;
    paidAmount?: number;
    purchaseDate?: string;
  }) => {
    const grn = await posApi.receiveGrn({
      ...grnData,
      receivedBy: currentUser.fullName,
    });
    await refreshData();
    return grn;
  };

  const saveOpeningBalance = async (data: {
    periodLabel: string;
    periodStart: string;
    periodEnd?: string;
    openingStockValue: number;
    notes?: string;
  }) => {
    await posApi.saveOpeningBalance({ ...data, createdBy: currentUser.fullName });
    await refreshData();
  };

  const addOtherIncome = async (data: {
    title: string;
    amount: number;
    category?: string;
    notes?: string;
    branchId?: string;
    incomeDate?: string;
  }) => {
    await posApi.createOtherIncome({
      ...data,
      branchId: data.branchId || currentBranchId,
      incomeDate: data.incomeDate || new Date().toISOString().slice(0, 10),
      createdBy: currentUser.fullName,
    } as any);
    await refreshData();
  };

  const distributeFromMainStore = async (
    productId: string,
    distributions: { destBranchId: string; quantity: number }[],
    notes?: string
  ) => {
    await posApi.distributeStock({
      productId,
      sourceBranchId: 'b-04',
      distributions,
      notes,
      requestedBy: currentUser.id,
    });
    await refreshData();
  };

  const processSaleReturn = async (
    data: Omit<SaleReturn, 'id' | 'returnNumber' | 'createdAt' | 'cashierName'>
  ) => {
    const result = await posApi.createSaleReturn({
      ...data,
      cashierName: currentUser.fullName,
    });
    await refreshData();
    return result;
  };

  const deleteOrder = async (orderId: string) => {
    await posApi.deleteOrder(orderId);
    await refreshData();
  };

  const processPurchaseReturn = async (data: {
    purchaseId: string;
    items: { productId: string; quantityReturned: number }[];
    settlementMethod?: 'REDUCE_CREDIT' | 'CASH_REFUND';
    reason?: string;
    notes?: string;
    stockDeducted?: boolean;
  }) => {
    const result = await posApi.createPurchaseReturn({
      ...data,
      createdBy: currentUser.fullName,
    });
    await refreshData();
    return result;
  };

  const addNewSupplier = async (
    supplierData: Omit<
      Supplier,
      'id' | 'code' | 'totalPurchased' | 'totalPaid' | 'balancePayable' | 'createdAt'
    >
  ) => {
    const supplier = await posApi.createSupplier(supplierData);
    await refreshData();
    return supplier;
  };

  const updateSupplier = async (
    id: string,
    data: Partial<
      Omit<Supplier, 'id' | 'code' | 'totalPurchased' | 'totalPaid' | 'balancePayable' | 'createdAt'>
    >
  ) => {
    const supplier = await posApi.updateSupplier(id, data);
    await refreshData();
    return supplier;
  };

  const updatePurchase = async (
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
  ) => {
    const purchase = await posApi.updatePurchase(id, data);
    await refreshData();
    return purchase;
  };

  const settleSupplierPayment = async (
    supplierId: string,
    amount: number,
    paymentMethod: SupplierPayment['paymentMethod'],
    referenceNo?: string,
    bankName?: string,
    notes?: string
  ) => {
    const payment = await posApi.settleSupplierPayment({
      supplierId,
      amount,
      paymentMethod,
      referenceNo,
      bankName,
      notes,
      paidBy: currentUser.fullName,
    });
    await refreshData();
    return payment;
  };

  const addExpense = async (expenseData: Omit<OperatingExpense, 'id' | 'expenseNumber'>) => {
    const expense = await posApi.createExpense(expenseData);
    await refreshData();
    return expense;
  };

  const deleteExpense = async (id: string) => {
    await posApi.deleteExpense(id);
    await refreshData();
  };

  const addNewUser = async (userData: Omit<CashierUser, 'id' | 'createdAt'>) => {
    const user = await posApi.createUser(userData);
    await refreshData();
    return user;
  };

  const updateUser = async (userId: string, updates: Partial<CashierUser>) => {
    await posApi.updateUser(userId, updates);
    if (currentUser.id === userId) setCurrentUser((prev) => ({ ...prev, ...updates }));
    await refreshData();
  };

  const deleteUser = async (userId: string) => {
    await posApi.deleteUser(userId);
    await refreshData();
  };

  return (
    <POSContext.Provider
      value={{
        isLoading,
        apiOnline,
        refreshData,
        branches: !isAuthenticated || canAccessAllBranches ? branches : accessibleBranches,
        currentBranch,
        setCurrentBranchId: setCurrentBranchIdGuarded,
        currentUser,
        demoUsers,
        users: scopedUsers,
        addNewUser,
        updateUser,
        deleteUser,
        canUserPerformAction,
        isSuperAdmin,
        canAccessAllBranches,
        accessibleBranches,
        isAuthenticated,
        loginWithPin,
        loginWithCredentials,
        quickLoginAsUser,
        logout,
        categories,
        units,
        addCategory,
        updateCategory,
        deleteCategory,
        addUnit,
        deleteUnit,
        products,
        branchStocks: scopedBranchStocks,
        stockLots: scopedStockLots,
        currentBranchStock,
        currentBranchStockItem,
        lotsForProduct,
        sellPriceHint,
        cart,
        addToCart,
        updateCartItemQuantity,
        updateCartItemDiscount,
        removeFromCart,
        clearCart,
        orderDiscount,
        setOrderDiscount,
        orderTax,
        setOrderTax,
        selectedCustomer,
        setSelectedCustomer,
        cartSubtotal,
        cartDiscount,
        cartTax,
        cartGrandTotal,
        cartItemCount,
        heldOrders,
        holdCurrentOrder,
        resumeHeldOrder,
        deleteHeldOrder,
        orders: scopedOrders,
        processCheckout,
        activeReceiptOrder,
        setActiveReceiptOrder,
        activeTab,
        setActiveTab,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toggleMobileMenu: () => setIsMobileMenuOpen((p) => !p),
        isMobileCartOpen,
        setIsMobileCartOpen,
        toggleMobileCart: () => setIsMobileCartOpen((p) => !p),
        currentShift,
        recordCashMovement,
        closeShift,
        openShift,
        transfers: scopedTransfers,
        createStockTransfer,
        receiveTransfer,
        adjustStock,
        addNewProduct,
        updateProduct,
        receiveStockInward,
        distributeFromMainStore,
        saleReturns: scopedSaleReturns,
        processSaleReturn,
        deleteOrder,
        purchaseReturns: scopedPurchaseReturns,
        processPurchaseReturn,
        customers,
        addNewCustomer,
        updateCustomer,
        settleCustomerCredit,
        suppliers,
        supplierBills: scopedSupplierBills,
        supplierPayments,
        addNewSupplier,
        updateSupplier,
        settleSupplierPayment,
        purchases: scopedPurchases,
        updatePurchase,
        purchaseSummary,
        openingBalances,
        otherIncome: scopedOtherIncome,
        closingStockValue,
        saveOpeningBalance,
        addOtherIncome,
        expenses: scopedExpenses,
        addExpense,
        deleteExpense,
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) throw new Error('usePOS must be used within a POSProvider');
  return context;
};
