import React, { useState } from 'react';
import { ShoppingBag, ArrowRight, CreditCard } from 'lucide-react';
import { ProductGrid } from './ProductGrid';
import { CartTicket } from './CartTicket';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';

interface CashierTerminalProps {
  searchQuery?: string;
}

export const CashierTerminal: React.FC<CashierTerminalProps> = ({ searchQuery = '' }) => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const {
    activeReceiptOrder,
    setActiveReceiptOrder,
    cartItemCount,
    cartGrandTotal,
    currentBranch,
    isMobileCartOpen,
    setIsMobileCartOpen,
  } = usePOS();
  const { t } = useLanguage();

  return (
    <div id="cashier-terminal-view" className="flex-1 flex h-full overflow-hidden relative">
      {/* Product Catalog Column (Full width on mobile/tablet, flex-1 on desktop) */}
      <ProductGrid searchQuery={searchQuery} />

      {/* Desktop Cart Column (Visible on lg: 1024px and up) */}
      <div className="hidden lg:flex h-full">
        <CartTicket onOpenCheckout={() => setIsCheckoutOpen(true)} />
      </div>

      {/* Floating Bottom Cart Bar for Mobile & Tablet (when cart has items and drawer is closed) */}
      {cartItemCount > 0 && !isMobileCartOpen && (
        <div
          id="mobile-cart-floating-cta"
          onClick={() => setIsMobileCartOpen(true)}
          className="lg:hidden fixed bottom-17 left-3 right-3 sm:left-6 sm:right-6 max-w-xl sm:mx-auto z-30 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 border border-teal-500/40 text-white rounded-2xl shadow-2xl p-2.5 sm:p-3 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-200 cursor-pointer active:scale-[0.99] select-none"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/40 shrink-0">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                {cartItemCount}
              </span>
            </div>
            <div>
              <div className="text-[11px] text-slate-300 font-medium">
                {cartItemCount} {t('pos.items_selected')}
              </div>
              <div className="text-base sm:text-lg font-black font-mono text-emerald-400 leading-tight">
                {cartGrandTotal.toLocaleString()}{' '}
                <span className="text-xs font-bold text-slate-400 font-sans">
                  {currentBranch.currency}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMobileCartOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-teal-600/30 transition-all cursor-pointer shrink-0"
          >
            <span>{t('pos.view_ticket')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile & Tablet Slide-Over Cart Drawer */}
      {isMobileCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileCartOpen(false)}
            aria-hidden="true"
          />

          {/* Cart Drawer Container */}
          <div className="relative w-full sm:w-[420px] max-w-full h-full bg-white z-50 shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col">
            <CartTicket
              onOpenCheckout={() => {
                setIsCheckoutOpen(true);
                setIsMobileCartOpen(false);
              }}
              isMobileDrawer={true}
            />
          </div>
        </div>
      )}

      {/* Payment / Checkout Flow Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
      />
    </div>
  );
};
