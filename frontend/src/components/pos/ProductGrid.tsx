import React, { useState } from 'react';
import {
  Coffee,
  Croissant,
  Utensils,
  Cookie,
  ShoppingBag,
  LayoutGrid,
  Plus,
  AlertTriangle,
  Check,
  Package,
  Grid2X2,
  Grid3X3,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { Product } from '../../types/pos';
import { useLanguage } from '../../context/LanguageContext';
import { resolveProductImage } from '../../utils/media';
import { showWarning } from '../../utils/swal';

interface ProductGridProps {
  searchQuery?: string;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ searchQuery = '' }) => {
  const { categories, products, currentBranchStock, addToCart, currentBranch, sellPriceHint, cart } =
    usePOS();
  const { language, t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [isCompactView, setIsCompactView] = useState<boolean>(true); // Compact by default for tablet & mobile efficiency

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coffee':
        return <Coffee className="w-3.5 h-3.5" />;
      case 'Croissant':
        return <Croissant className="w-3.5 h-3.5" />;
      case 'Utensils':
        return <Utensils className="w-3.5 h-3.5" />;
      case 'Cookie':
        return <Cookie className="w-3.5 h-3.5" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-3.5 h-3.5" />;
      default:
        return <LayoutGrid className="w-3.5 h-3.5" />;
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.barcode.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = (product: Product, stock: number) => {
    if (stock <= 0) {
      showWarning(
        language === 'my' ? 'ပစ္စည်းလက်ကျန်မရှိပါ' : 'Out of Stock',
        `${product.name} — ${language === 'my' ? 'ဤဆိုင်ခွဲတွင် လက်ကျန် (၀) ဖြစ်နေပါသည်' : 'Current branch has 0 available'}`
      );
      return;
    }
    const currentInCart = cart
      .filter((i) => i.product.id === product.id)
      .reduce((s, i) => s + i.quantity, 0);
    if (currentInCart >= stock) {
      showWarning(
        language === 'my' ? 'လက်ကျန်မလုံလောက်ပါ' : 'Insufficient Stock',
        `${product.name} — ${language === 'my' ? `လက်ကျန် ${stock} သာရှိပြီး Cart ထဲသို့ အားလုံးထည့်ထားပြီးပါပြီ` : `Only ${stock} available in this branch`}`
      );
      return;
    }
    addToCart(product, 1);
    setRecentlyAddedId(product.id);
    setTimeout(() => setRecentlyAddedId(null), 500);
  };

  return (
    <div id="product-grid-container" className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/60">
      {/* Category Pills Header with Density Switcher */}
      <div className="px-2.5 sm:px-4 lg:px-6 py-2 border-b border-slate-200/80 bg-white flex items-center justify-between gap-2 shrink-0">
        {/* Category List */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`cat-pill-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 min-h-[34px] cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-800'
                    : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <span className={isSelected ? 'text-teal-400' : 'text-slate-500'}>
                  {getCategoryIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* View Density Toggle (Compact vs Standard) */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setIsCompactView(true)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isCompactView
                ? 'bg-white text-teal-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title={t('pos.compact_view_hint')}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">
              {t('pos.compact_view')}
            </span>
          </button>
          <button
            onClick={() => setIsCompactView(false)}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              !isCompactView
                ? 'bg-white text-teal-700 shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title={t('pos.standard_view_hint')}
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">
              {t('pos.standard_view')}
            </span>
          </button>
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 lg:p-5 pb-28 lg:pb-6">
        {filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No items found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              No products match "{searchQuery}" in this category for {currentBranch.name}.
            </p>
          </div>
        ) : (
          <div
            className={`grid ${
              isCompactView
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5 lg:gap-4'
            }`}
          >
            {filteredProducts.map((product) => {
              const stock = currentBranchStock(product.id);
              const isLowStock = stock > 0 && stock <= 10;
              const isOutOfStock = stock <= 0;
              const isJustAdded = recentlyAddedId === product.id;

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => handleProductClick(product, stock)}
                  className={`group relative bg-white rounded-xl sm:rounded-2xl border transition-all duration-150 flex flex-col overflow-hidden text-left ${
                    isOutOfStock
                      ? 'border-slate-200 opacity-55 cursor-not-allowed bg-slate-50'
                      : 'border-slate-200/90 hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]'
                  } ${isJustAdded ? 'ring-2 ring-teal-500 border-teal-500' : ''}`}
                >
                  {/* Product Image (Compact aspect on tablet/mobile) */}
                  <div
                    className={`relative w-full bg-slate-100 overflow-hidden ${
                      isCompactView
                        ? 'h-22 sm:h-26 md:h-24 lg:h-26'
                        : 'aspect-4/3'
                    }`}
                  >
                    <img
                      src={resolveProductImage(product.imageUrl)}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Stock status badge */}
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                      {isOutOfStock ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600/90 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider shadow-2xs">
                          Sold Out
                        </span>
                      ) : isLowStock ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/95 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-0.5 shadow-2xs">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>{stock} left</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-medium shadow-2xs">
                          {stock} {product.unit}
                        </span>
                      )}
                    </div>

                    {/* Quick Add Overlay */}
                    {!isOutOfStock && (
                      <div className="absolute inset-0 bg-teal-600/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-lg transform translate-y-1 group-hover:translate-y-0 transition-transform">
                          {isJustAdded ? (
                            <Check className="w-4 h-4 animate-bounce" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Product Details (Compact padding & clean typography) */}
                  <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="truncate max-w-[70%]">{product.sku}</span>
                        <span className="uppercase text-[9px]">{product.unit}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-2 leading-relaxed group-hover:text-teal-600 transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-baseline justify-between gap-1">
                      <div className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                        {(() => {
                          const hint = sellPriceHint(product.id);
                          if (hint.multi) {
                            return (
                              <>
                                {hint.min.toLocaleString()}–{hint.max.toLocaleString()}{' '}
                              </>
                            );
                          }
                          return <>{(hint.min || product.sellingPrice).toLocaleString()} </>;
                        })()}
                        <span className="text-[10px] font-bold text-slate-500 font-sans">
                          {currentBranch.currency}
                        </span>
                      </div>
                      <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1 py-0.2 rounded shrink-0">
                        +{product.unit}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
