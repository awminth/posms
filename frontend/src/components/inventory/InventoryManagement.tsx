import React, { useState } from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  X,
  Warehouse,
  Share2,
  Boxes,
  Upload,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Product, PackagingUnitConfig } from '../../types/pos';
import { useLanguage } from '../../context/LanguageContext';
import { Pagination } from '../common/Pagination';
import { ClearableNumberInput } from '../common/ClearableNumberInput';
import { SearchableSelect } from '../common/SearchableSelect';
import { showError, showToast, showSuccess, showWarning } from '../../utils/swal';
import { resolveProductImage } from '../../utils/media';

const btnBase =
  'inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const btnPrimary = `${btnBase} bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/20`;
const btnSecondary = `${btnBase} bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300`;
const btnGhostIcon =
  'inline-flex items-center justify-center gap-1 p-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

export const InventoryManagement: React.FC = () => {
  const {
    products,
    branches,
    branchStocks,
    addNewProduct,
    updateProduct,
    categories,
    units,
    currentBranch,
    distributeFromMainStore,
    canUserPerformAction,
    stockLots,
    setActiveTab,
  } = usePOS();
  const { language, t } = useLanguage();

  const mainWarehouseBranch =
    branches.find((b) => b.type === 'WAREHOUSE') ||
    branches.find((b) => b.id === 'b-04') ||
    branches[0];
  const mainWarehouseId = mainWarehouseBranch?.id || 'b-04';

  const canManageInventory = canUserPerformAction('canManageInventory');
  const catalogCategories = categories.filter((c) => c.id !== 'all');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');

  // Stock Adjustment modal removed — branch qty only via Stock Share / distribute

  // Main Store Distribution Modal state
  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distProductId, setDistProductId] = useState(products[0]?.id || '');
  const [distQuantities, setDistQuantities] = useState<Record<string, number>>({});

  // Product create / edit modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProdName, setNewProdName] = useState('');
  const [newProdSku, setNewProdSku] = useState('');
  const [newProdCategory, setNewProdCategory] = useState(catalogCategories[0]?.id || '');
  const [newProdCost, setNewProdCost] = useState(2000);
  const [newProdPrice, setNewProdPrice] = useState(4500);
  const [newProdUnit, setNewProdUnit] = useState(units[0]?.name || 'sachets');
  const [newProdImage, setNewProdImage] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Packaging hierarchy config for new product
  const [hasMultiUnit, setHasMultiUnit] = useState(true);
  const [primaryUnitName, setPrimaryUnitName] = useState('Carton (ဖာ)');
  const [interUnitName, setInterUnitName] = useState('Pack (ကတ်/ပါကင်)');
  const [interMultiplier, setInterMultiplier] = useState(20);
  const [baseUnitName, setBaseUnitName] = useState('Sachet (အထုပ်)');
  const [baseMultiplier, setBaseMultiplier] = useState(30);

  const resetProductForm = () => {
    setEditingProduct(null);
    setNewProdName('');
    setNewProdSku('');
    setNewProdCategory(catalogCategories[0]?.id || '');
    setNewProdCost(2000);
    setNewProdPrice(4500);
    setNewProdUnit(units[0]?.name || 'sachets');
    setNewProdImage('');
    setHasMultiUnit(true);
    setPrimaryUnitName(units[2]?.name || units[0]?.name || 'carton');
    setInterUnitName(units[1]?.name || units[0]?.name || 'pack');
    setInterMultiplier(20);
    setBaseUnitName(units[0]?.name || 'pcs');
    setBaseMultiplier(30);
  };

  const openEditProduct = (product: Product) => {
    if (!canManageInventory) {
      showError(
        language === 'my' ? 'ခွင့်ပြုချက်မရှိပါ' : 'Permission Denied',
        language === 'my'
          ? 'သင်၏အကောင့်သည် ကုန်ပစ္စည်း ပြင်ဆင်ခွင့် မရှိပါ။'
          : 'Your account role does not have permission to edit products.'
      );
      return;
    }
    setEditingProduct(product);
    setNewProdName(product.name);
    setNewProdSku(product.sku);
    setNewProdCategory(product.categoryId);
    setNewProdCost(product.costPrice);
    setNewProdPrice(product.sellingPrice);
    setNewProdUnit(product.unit);
    setNewProdImage(product.imageUrl || '');
    if (product.packagingConfig) {
      setHasMultiUnit(true);
      setPrimaryUnitName(product.packagingConfig.primaryUnit || 'Carton (ဖာ)');
      setInterUnitName(product.packagingConfig.intermediateUnit || 'Pack (ကတ်/ပါကင်)');
      setInterMultiplier(product.packagingConfig.intermediateMultiplier || 20);
      setBaseUnitName(product.packagingConfig.baseUnit || product.unit);
      setBaseMultiplier(product.packagingConfig.baseMultiplier || 30);
    } else {
      setHasMultiUnit(false);
    }
    setIsProductModalOpen(true);
  };

  const openDistribute = (productId?: string) => {
    if (!canManageInventory) {
      showError(
        language === 'my' ? 'ခွင့်ပြုချက်မရှိပါ' : 'Permission Denied',
        language === 'my'
          ? 'သင်၏အကောင့်သည် ဂိုဒေါင်မှ စတော့ဖြန့်ဝေခွင့် မရှိပါ။'
          : 'Your account role does not have permission to distribute warehouse stock.'
      );
      return;
    }
    if (productId) setDistProductId(productId);
    const zeros: Record<string, number> = {};
    branches
      .filter((b) => b.id !== mainWarehouseId && b.type !== 'WAREHOUSE')
      .forEach((b) => {
        zeros[b.id] = 0;
      });
    setDistQuantities(zeros);
    setIsDistributeModalOpen(true);
  };

  // Handle local image file upload (converts to base64 Data URL)
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showWarning(
        language === 'my' ? 'ဖိုင်ဆိုဒ် ကြီးလွန်းပါသည်' : 'File Too Large',
        language === 'my' ? '၅ MB အောက် ဓာတ်ပုံဖိုင်ကိုသာ ရွေးချယ်ပေးပါ' : 'Please select an image file under 5MB'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNewProdImage(event.target.result as string);
        showToast(language === 'my' ? 'ဓာတ်ပုံ တင်သွင်းပြီးပါပြီ' : 'Image loaded successfully');
      }
    };
    reader.readAsDataURL(file);
  };

  const getStock = (branchId: string, productId: string) => {
    return (
      branchStocks.find((s) => s.branchId === branchId && s.productId === productId)?.quantity || 0
    );
  };

  const getTotalStockAcrossAllBranches = (productId: string) => {
    return branchStocks
      .filter((s) => s.productId === productId)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  const selectedDistProduct = products.find((p) => p.id === distProductId);
  const warehouseStock = getStock(mainWarehouseId, distProductId);
  const totalDistributeQty = Object.values(distQuantities).reduce((a, b) => a + b, 0);

  const handleExecuteDistribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory) {
      showError(
        language === 'my' ? 'ခွင့်ပြုချက်မရှိပါ' : 'Permission Denied',
        language === 'my'
          ? 'သင်၏အကောင့်သည် ဂိုဒေါင်မှ စတော့ဖြန့်ဝေခွင့် မရှိပါ။'
          : 'Your role does not have permission to distribute warehouse inventory.'
      );
      return;
    }
    if (!selectedDistProduct || totalDistributeQty <= 0) return;

    const allocations = Object.entries(distQuantities).map(([destBranchId, quantity]) => ({
      destBranchId,
      quantity,
    }));

    distributeFromMainStore(distProductId, allocations);
    showToast(
      language === 'my'
        ? 'ဆိုင်ခွဲများသို့ စတော့ဖြန့်ဝေပြီးပါပြီ'
        : 'Stock distributed to branches successfully!'
    );
    setIsDistributeModalOpen(false);
  };

  const formatPackagingBreakdown = (product: Product, quantity: number) => {
    if (!product.packagingConfig) {
      return `${quantity.toLocaleString()} ${product.unit}`;
    }
    const interMult = product.packagingConfig.intermediateMultiplier || product.packagingConfig.level2PerLevel1 || 20;
    const baseMult = product.packagingConfig.baseMultiplier || product.packagingConfig.level3PerLevel2 || 30;
    const cMultiplier = interMult * baseMult;
    const cartons = Math.floor(quantity / cMultiplier);
    const remainder = quantity % cMultiplier;
    const packs = Math.floor(remainder / baseMult);
    const sachets = remainder % baseMult;
    const pUnit = product.packagingConfig.primaryUnit || product.packagingConfig.level1Name || 'Carton';
    const iUnit = product.packagingConfig.intermediateUnit || product.packagingConfig.level2Name || 'Pack';
    const bUnit = product.packagingConfig.baseUnit || product.packagingConfig.level3Name || product.unit;

    return `${cartons} ${pUnit} : ${packs} ${iUnit} : ${sachets} ${bUnit}`;
  };

  const filteredProducts = products.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.barcode.toLowerCase().includes(query);

    const currentBranchQty = getStock(currentBranch.id, p.id);

    if (filterMode === 'low_stock') {
      return matchesSearch && currentBranchQty > 0 && currentBranchQty <= 10;
    }
    if (filterMode === 'out_of_stock') {
      return matchesSearch && currentBranchQty <= 0;
    }
    return matchesSearch;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const lowStockCount = products.filter((p) => {
    const qty = getStock(currentBranch.id, p.id);
    return qty > 0 && qty <= 10;
  }).length;

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageInventory) {
      showError(
        language === 'my' ? 'ခွင့်ပြုချက်မရှိပါ' : 'Permission Denied',
        language === 'my'
          ? 'သင်၏အကောင့်သည် ကုန်ပစ္စည်း စီမံခွင့် မရှိပါ။'
          : 'Your account role does not have permission to manage products.'
      );
      return;
    }
    if (catalogCategories.length === 0 || !newProdCategory) {
      showWarning(
        language === 'my' ? 'Category အရင် Setup လုပ်ပါ' : 'Set up Categories first',
        language === 'my'
          ? 'Setup → Categories တွင် အမျိုးအစားများ ထည့်ပြီးမှ ပြန်ကြိုးစားပါ။'
          : 'Add categories under Setup → Categories, then try again.'
      );
      setIsProductModalOpen(false);
      setActiveTab('setup-categories');
      return;
    }
    if (!newProdName || !newProdSku) return;

    const packagingConfig: PackagingUnitConfig | undefined = hasMultiUnit
      ? {
          hasPackagingLevels: true,
          primaryUnit: primaryUnitName,
          intermediateUnit: interUnitName,
          intermediateMultiplier: Number(interMultiplier) || 20,
          baseUnit: baseUnitName,
          baseMultiplier: Number(baseMultiplier) || 30,
          level1Name: primaryUnitName,
          level2Name: interUnitName,
          level2PerLevel1: Number(interMultiplier) || 20,
          level3Name: baseUnitName,
          level3PerLevel2: Number(baseMultiplier) || 30,
        }
      : undefined;

    const unitValue = hasMultiUnit ? baseUnitName : newProdUnit;

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: newProdName,
          sku: newProdSku,
          categoryId: newProdCategory,
          costPrice: Number(newProdCost),
          sellingPrice: Number(newProdPrice),
          unit: unitValue,
          imageUrl: newProdImage,
          description: editingProduct.description,
          packagingConfig,
        });
        showSuccess(
          language === 'my' ? 'ပြင်ဆင်ပြီးပါပြီ' : 'Product updated',
          language === 'my'
            ? `"${newProdName}" ကို အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။`
            : `"${newProdName}" was updated successfully.`
        );
        setIsProductModalOpen(false);
        resetProductForm();
      } else {
        await addNewProduct({
          name: newProdName,
          sku: newProdSku,
          barcode: `8850${Math.floor(100000 + Math.random() * 900000)}`,
          categoryId: newProdCategory,
          costPrice: Number(newProdCost),
          sellingPrice: Number(newProdPrice),
          unit: unitValue,
          description: `${newProdName} available across retail branches`,
          imageUrl: newProdImage,
          packagingConfig,
        });
        showSuccess(
          language === 'my' ? 'ကုန်ပစ္စည်းအသစ် ထည့်ပြီးပါပြီ' : 'Product Added',
          language === 'my'
            ? `"${newProdName}" စာရင်းသွင်းပြီးပါပြီ။ စတော့သွင်းရန် Suppliers → Purchase Voucher သုံးပါ။`
            : `"${newProdName}" added to catalog. Receive stock via Suppliers → Purchase Voucher.`
        );
        setIsProductModalOpen(false);
        resetProductForm();
      }
    } catch (err: any) {
      showWarning(
        language === 'my' ? 'မအောင်မြင်ပါ' : 'Failed',
        err?.message || 'Could not save product'
      );
    }
  };

  return (
    <div id="inventory-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header Controls */}
      <div className="p-5 sm:p-6 bg-white border-b border-slate-200 shrink-0 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-6 h-6 text-teal-600" />
              <span>{t('inv.title')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">{t('inv.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openDistribute()}
              disabled={!canManageInventory}
              className={`${btnSecondary} disabled:opacity-50`}
              title="Distribute Main Store stock to branches"
            >
              <Share2 className="w-4 h-4" />
              <span>{t('inv.distribute')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          <span className="font-semibold text-slate-700">{t('inv.hint_purchase')}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-semibold text-slate-700">{t('inv.hint_page')}</span>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                language === 'my' ? 'SKU / အမည် ရှာရန်...' : 'Search product SKU, name...'
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {language === 'my' ? 'အားလုံး' : 'All'} ({products.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('low_stock');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                filterMode === 'low_stock'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>
                {language === 'my' ? 'နည်းနေ' : 'Low'} ({lowStockCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterMode('out_of_stock');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterMode === 'out_of_stock'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {language === 'my' ? 'ကုန်နေ' : 'Out of stock'}
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Branch Inventory Matrix Table */}
      <div className="flex-1 overflow-auto p-5 sm:p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">{language === 'my' ? 'ပစ္စည်း' : 'Item & SKU'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'အမျိုးအစား' : 'Category'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'စျေး' : 'Price / Cost'}</th>
                {branches.map((b) => {
                  const isMainStore = b.id === 'b-04' || b.type === 'WAREHOUSE';
                  return (
                    <th
                      key={b.id}
                      className={`py-3 px-4 text-center ${
                        isMainStore
                          ? 'bg-slate-100 text-slate-800 border-x border-slate-200'
                          : b.id === currentBranch.id
                            ? 'bg-teal-50/80 text-teal-950'
                            : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {isMainStore && <Warehouse className="w-3.5 h-3.5 text-slate-500" />}
                        <span>
                          {isMainStore
                            ? language === 'my'
                              ? 'Main Store'
                              : 'Main Store'
                            : b.name.replace(' Branch', '')}
                        </span>
                      </div>
                      <div className="text-[9px] font-normal text-slate-400 normal-case tracking-normal">
                        {isMainStore
                          ? language === 'my'
                            ? 'Main Store'
                            : 'Main Store'
                          : b.code}
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-4 text-center font-black text-slate-900 bg-slate-50">
                  {language === 'my' ? 'စုစုပေါင်း' : 'Total'}
                </th>
                <th className="py-3 px-4 text-right">
                  {language === 'my' ? 'လုပ်ဆောင်ချက်' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.map((product) => {
                const totalStock = getTotalStockAcrossAllBranches(product.id);

                return (
                  <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={resolveProductImage(product.imageUrl)}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{product.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {product.sku} • {product.unit}
                          </div>
                          {product.packagingConfig && (
                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded">
                              <Boxes className="w-3 h-3 text-slate-400" />
                              <span>
                                1{' '}
                                {product.packagingConfig.primaryUnit ||
                                  product.packagingConfig.level1Name ||
                                  'Carton'}{' '}
                                ={' '}
                                {product.packagingConfig.intermediateMultiplier ||
                                  product.packagingConfig.level2PerLevel1 ||
                                  20}{' '}
                                {product.packagingConfig.intermediateUnit ||
                                  product.packagingConfig.level2Name ||
                                  'Pack'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        {categories.find((c) => c.id === product.categoryId)?.name || 'General'}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <div className="font-bold text-slate-900">
                        {product.sellingPrice.toLocaleString()} {currentBranch.currency}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Cost: {product.costPrice.toLocaleString()}
                      </div>
                    </td>

                    {branches.map((b) => {
                      const qty = getStock(b.id, product.id);
                      const isCurrent = b.id === currentBranch.id;
                      const isLow = qty > 0 && qty <= 10;
                      const isOut = qty <= 0;
                      const isMain = b.id === 'b-04' || b.type === 'WAREHOUSE';

                      return (
                        <td
                          key={b.id}
                          className={`py-3 px-4 text-center font-mono ${
                            isCurrent ? 'bg-teal-50/30' : isMain ? 'bg-slate-50/80' : ''
                          }`}
                        >
                          <div
                            title={
                              language === 'my'
                                ? 'စတော့ပြောင်းရန် Share / ဖြန့်ဝေ ခလုတ် သုံးပါ'
                                : 'Use Share / Distribute to move stock'
                            }
                            className={`inline-flex flex-col items-center justify-center min-w-[56px] px-2 py-1.5 rounded-lg text-xs font-bold ${
                              isOut
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : isLow
                                  ? 'bg-amber-50 text-amber-800 border border-amber-100'
                                  : 'bg-white text-slate-800 border border-slate-200'
                            }`}
                          >
                            <span>{qty}</span>
                            <span className="text-[9px] opacity-60">{product.unit.slice(0, 3)}</span>
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-3 px-4 text-center font-mono font-extrabold text-sm text-slate-900 bg-slate-50">
                      <div>
                        {totalStock.toLocaleString()} {product.unit}
                      </div>
                      {product.packagingConfig && (
                        <div className="text-[9px] font-medium text-slate-500 font-sans mt-0.5 whitespace-nowrap">
                          {formatPackagingBreakdown(product, totalStock)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          disabled={!canManageInventory}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-700 disabled:opacity-40"
                          title={language === 'my' ? 'ပစ္စည်း ပြင်မည်' : 'Edit product'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDistribute(product.id)}
                          disabled={!canManageInventory}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                          title={
                            language === 'my'
                              ? 'Main Store မှ ဆိုင်ခွဲသို့ ဖြန့်မည်'
                              : 'Distribute from Main Store'
                          }
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {language === 'my'
                ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော စတော့ မရှိပါ။'
                : 'No inventory records found matching your filters.'}
            </div>
          ) : (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredProducts.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal (XL) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  {editingProduct
                    ? language === 'my'
                      ? 'ကုန်ပစ္စည်း ပြင်ဆင်မည်'
                      : 'Edit Product'
                    : language === 'my'
                      ? 'ကုန်ပစ္စည်းအသစ် ထည့်သွင်းမည်'
                      : 'Add New Product'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingProduct
                    ? language === 'my'
                      ? 'အမည်၊ စျေး၊ Category စသည်ကို ပြင်နိုင်ပါသည်'
                      : 'Update name, pricing, category and photo'
                    : language === 'my'
                      ? 'စာရင်းသွင်းပြီးမှ Suppliers → Purchase Voucher ဖြင့် စတော့သွင်းပါ'
                      : 'Catalog only — stock via Suppliers → Purchase Voucher'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false);
                  resetProductForm();
                }}
                className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {language === 'my' ? 'ကုန်ပစ္စည်းအမည်' : 'Product Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vanilla Bean Frappe"
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">SKU Code</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. DRK-VAN-09"
                        value={newProdSku}
                        onChange={(e) => setNewProdSku(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Category</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProductModalOpen(false);
                            setActiveTab('setup-categories');
                          }}
                          className="text-[10px] font-bold text-teal-600 hover:underline cursor-pointer"
                        >
                          {language === 'my' ? 'Setup သို့' : 'Manage'}
                        </button>
                      </div>
                      <SearchableSelect
                        value={newProdCategory}
                        onChange={setNewProdCategory}
                        options={
                          catalogCategories.length === 0
                            ? [
                                {
                                  value: '',
                                  label:
                                    language === 'my' ? 'Category မရှိသေးပါ' : 'No categories yet',
                                  disabled: true,
                                },
                              ]
                            : catalogCategories.map((c) => ({
                                value: c.id,
                                label: c.name,
                              }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Cost (MMK)</label>
                      <ClearableNumberInput
                        value={newProdCost}
                        onChange={setNewProdCost}
                        min={0}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Selling (MMK)</label>
                      <ClearableNumberInput
                        value={newProdPrice}
                        onChange={setNewProdPrice}
                        min={0}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">Unit</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProductModalOpen(false);
                            setActiveTab('setup-units');
                          }}
                          className="text-[10px] font-bold text-teal-600 hover:underline cursor-pointer"
                        >
                          {language === 'my' ? 'Setup သို့' : 'Manage'}
                        </button>
                      </div>
                      {units.length > 0 ? (
                        <SearchableSelect
                          value={newProdUnit}
                          onChange={setNewProdUnit}
                          options={units.map((u) => ({ value: u.name, label: u.name }))}
                        />
                      ) : (
                        <input
                          type="text"
                          value={newProdUnit}
                          onChange={(e) => setNewProdUnit(e.target.value)}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm"
                          placeholder="sachets"
                        />
                      )}
                    </div>
                  </div>

                  {editingProduct && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                        {t('inv.stock_lots')}
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-slate-500 border-b border-slate-100">
                              <th className="text-left py-1.5 px-2 font-semibold">{t('inv.lot_date')}</th>
                              <th className="text-left py-1.5 px-2 font-semibold">{t('inv.lot_branch')}</th>
                              <th className="text-right py-1.5 px-2 font-semibold">{t('inv.lot_qty')}</th>
                              <th className="text-right py-1.5 px-2 font-semibold">{t('pv.buy_cost')}</th>
                              <th className="text-right py-1.5 px-2 font-semibold">{t('pv.lot_sell_price')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stockLots
                              .filter(
                                (l) =>
                                  l.productId === editingProduct.id && l.quantityRemaining > 0
                              )
                              .sort(
                                (a, b) =>
                                  new Date(a.receivedAt).getTime() -
                                  new Date(b.receivedAt).getTime()
                              )
                              .map((lot) => {
                                const br = branches.find((b) => b.id === lot.branchId);
                                return (
                                  <tr key={lot.id} className="border-b border-slate-50">
                                    <td className="py-1.5 px-2 font-mono text-slate-600">
                                      {String(lot.receivedAt).slice(0, 10)}
                                    </td>
                                    <td className="py-1.5 px-2 text-slate-700 truncate max-w-[6rem]">
                                      {br?.code || lot.branchId}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono font-semibold">
                                      {lot.quantityRemaining}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono">
                                      {lot.landedUnitCost.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-mono text-teal-800 font-semibold">
                                      {lot.sellingPrice.toLocaleString()}
                                    </td>
                                  </tr>
                                );
                              })}
                            {!stockLots.some(
                              (l) =>
                                l.productId === editingProduct.id && l.quantityRemaining > 0
                            ) && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-3 px-2 text-center text-slate-400"
                                >
                                  {t('inv.no_lots')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <p className="px-3 py-1.5 text-[10px] text-slate-400 bg-slate-50/80">
                        {t('inv.lot_fifo_hint')}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-teal-600" />
                      <span>
                        {language === 'my'
                          ? 'ကုန်ပစ္စည်း ဓာတ်ပုံ တင်မည်'
                          : 'Upload Product Photo'}
                      </span>
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">PNG, JPG, WebP (Max 5MB)</span>
                  </label>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl h-[calc(100%-1.5rem)] min-h-[140px]">
                    <div className="relative group shrink-0">
                      <img
                        src={resolveProductImage(newProdImage)}
                        alt="Product preview"
                        className="w-24 h-24 rounded-xl object-cover border border-slate-200 shadow-xs bg-white"
                      />
                      {newProdImage ? (
                        <button
                          type="button"
                          onClick={() => setNewProdImage('')}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer hover:bg-rose-700"
                          title={language === 'my' ? 'ဓာတ်ပုံ ဖျက်မည်' : 'Remove image'}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold border border-teal-200/80 cursor-pointer transition-colors shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {newProdImage
                            ? language === 'my'
                              ? 'ဓာတ်ပုံ အသစ်ပြောင်းမည်'
                              : 'Change Photo'
                            : language === 'my'
                              ? 'ပုံဖိုင် ရွေးချယ်တင်မည်'
                              : 'Browse Photo File'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        {newProdImage
                          ? language === 'my'
                            ? 'ဓာတ်ပုံ တင်သွင်းပြီးပါပြီ'
                            : 'Image loaded & ready'
                          : language === 'my'
                            ? 'မတင်ရင် default product logo ကို သုံးပါမည်'
                            : 'If empty, default product logo is used'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-tier Packaging Configuration */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-teal-950 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasMultiUnit}
                      onChange={(e) => setHasMultiUnit(e.target.checked)}
                      className="rounded text-teal-600 cursor-pointer"
                    />
                    <span>
                      {language === 'my'
                        ? 'အသေးဆုံး Units သတ်မှတ်ချက် (Multi-Unit Packaging)'
                        : 'Enable Multi-Tier Packaging'}
                    </span>
                  </label>
                  <span className="text-[10px] text-slate-400">e.g. Carton ➔ Pack ➔ Sachet</span>
                </div>

                {hasMultiUnit && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">L1 unit (Setup → Units)</label>
                        <select
                          value={primaryUnitName}
                          onChange={(e) => setPrimaryUnitName(e.target.value)}
                          className="w-full px-2.5 py-2 border rounded-lg text-xs bg-white font-mono"
                        >
                          {(units.length ? units : [{ id: 'x', name: primaryUnitName || 'carton' }]).map(
                            (u) => (
                              <option key={`l1-${u.name}`} value={u.name}>
                                {u.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">L2 per L1</label>
                        <ClearableNumberInput
                          integer
                          min={1}
                          value={interMultiplier}
                          onChange={setInterMultiplier}
                          className="w-full px-2.5 py-2 border rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">L2 unit</label>
                        <select
                          value={interUnitName}
                          onChange={(e) => setInterUnitName(e.target.value)}
                          className="w-full px-2.5 py-2 border rounded-lg text-xs bg-white font-mono"
                        >
                          {(units.length ? units : [{ id: 'y', name: interUnitName || 'pack' }]).map(
                            (u) => (
                              <option key={`l2-${u.name}`} value={u.name}>
                                {u.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">L3 per L2</label>
                        <ClearableNumberInput
                          integer
                          min={1}
                          value={baseMultiplier}
                          onChange={setBaseMultiplier}
                          className="w-full px-2.5 py-2 border rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1">L3 base unit</label>
                        <select
                          value={baseUnitName}
                          onChange={(e) => {
                            setBaseUnitName(e.target.value);
                            setNewProdUnit(e.target.value);
                          }}
                          className="w-full px-2.5 py-2 border rounded-lg text-xs bg-white font-mono"
                        >
                          {(units.length ? units : [{ id: 'z', name: baseUnitName || 'pcs' }]).map(
                            (u) => (
                              <option key={`l3-${u.name}`} value={u.name}>
                                {u.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div className="text-[11px] font-mono text-teal-700 bg-teal-50 p-2.5 rounded-lg border border-teal-100 leading-relaxed">
                        1 {primaryUnitName} = {interMultiplier} {interUnitName} ={' '}
                        {interMultiplier * baseMultiplier} {baseUnitName}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2 sticky bottom-0 bg-white pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    resetProductForm();
                  }}
                  className={btnSecondary}
                >
                  {language === 'my' ? 'မလုပ်တော့' : 'Cancel'}
                </button>
                <button type="submit" className={btnPrimary}>
                  {editingProduct
                    ? language === 'my'
                      ? 'ပြင်ဆင်ချက် သိမ်းမည်'
                      : 'Save changes'
                    : language === 'my'
                      ? 'စာရင်းသွင်းမည်'
                      : 'Save to catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Main Store Distribution Modal */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-amber-600" />
                  <span>{language === 'my' ? 'ဗဟိုဂိုဒေါင်မှ ဆိုင်ခွဲများသို့ ခွဲဝေဖြန့်ဖြူးခြင်း' : 'Distribute from Main Warehouse'}</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Source: {mainWarehouseBranch?.name || 'Central Logistics Warehouse'} ({mainWarehouseId})
                </p>
              </div>
              <button onClick={() => setIsDistributeModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleExecuteDistribution} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Product to Distribute</label>
                <SearchableSelect
                  value={distProductId}
                  onChange={setDistProductId}
                  options={products.map((p) => ({
                    value: p.id,
                    label: `${p.name} (WH: ${getStock(mainWarehouseId, p.id)} ${p.unit})`,
                    keywords: p.sku,
                  }))}
                />
              </div>

              {/* Warehouse Stock Info */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-900 block">Available in Central Warehouse:</span>
                  <span className="text-xs text-amber-700">Ready for dispatch</span>
                </div>
                <span className="text-xl font-mono font-black text-amber-900">
                  {warehouseStock.toLocaleString()} {selectedDistProduct?.unit}
                </span>
              </div>

              {/* Branch Allocation inputs */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-slate-700 block">
                  {language === 'my' ? 'ဆိုင်ခွဲအလိုက် ခွဲဝေမည့် အရေအတွက်' : 'Branch Distribution Quantities'}
                </label>
                {branches
                  .filter((b) => b.id !== mainWarehouseId && b.type !== 'WAREHOUSE')
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">{b.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Current Stock: {getStock(b.id, distProductId)} {selectedDistProduct?.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 w-32">
                        <ClearableNumberInput
                          integer
                          min={0}
                          value={distQuantities[b.id] ?? 0}
                          onChange={(n) =>
                            setDistQuantities((prev) => ({
                              ...prev,
                              [b.id]: n,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold bg-white text-right"
                        />
                        <span className="text-xs text-slate-500 font-medium">
                          {selectedDistProduct?.unit.slice(0, 3)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Total Dispatch Qty:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {totalDistributeQty.toLocaleString()} {selectedDistProduct?.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Remaining in Warehouse:</span>
                  <span
                    className={`font-mono font-bold ${
                      warehouseStock - totalDistributeQty < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {(warehouseStock - totalDistributeQty).toLocaleString()} {selectedDistProduct?.unit}
                  </span>
                </div>
              </div>

              {warehouseStock - totalDistributeQty < 0 && (
                <p className="text-xs text-rose-600 font-bold">
                  ⚠️ Error: Distribution quantity exceeds available warehouse stock!
                </p>
              )}

              <div className="pt-2 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={warehouseStock - totalDistributeQty < 0 || totalDistributeQty <= 0}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-600/20"
                >
                  Confirm Distribution to Branches
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
