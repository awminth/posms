import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  User,
  PauseCircle,
  CreditCard,
  ChevronDown,
  X,
  ArrowLeft,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';

interface CartTicketProps {
  onOpenCheckout: () => void;
  isMobileDrawer?: boolean;
}

export const CartTicket: React.FC<CartTicketProps> = ({ onOpenCheckout }) => {
  const {
    cart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartDiscount,
    cartTax,
    cartGrandTotal,
    cartItemCount,
    currentBranch,
    selectedCustomer,
    setSelectedCustomer,
    customers,
    holdCurrentOrder,
    setIsMobileCartOpen,
  } = usePOS();
  const { t } = useLanguage();
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  return (
    <div
      id="cart-ticket-panel"
      className="w-full lg:w-[22rem] xl:w-[26rem] bg-white border-l border-slate-200 flex flex-col h-full shrink-0 shadow-lg select-none z-0 max-h-screen"
    >
      {/* Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ShoppingBag className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 leading-snug">
                {t('pos.current_ticket')}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {cartItemCount} {t('pos.units')} · {currentBranch.code}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                title={t('pos.clear_cart')}
                className="btn btn-danger-ghost p-2 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(false)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer */}
        <div className="relative">
          <button
            type="button"
            id="cart-customer-selector"
            onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors text-left text-xs cursor-pointer min-h-[44px]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 truncate block text-[13px] leading-snug">
                  {selectedCustomer ? selectedCustomer.name : t('pos.walk_in')}
                </span>
                {selectedCustomer && (
                  <span className="text-[10px] text-teal-600 font-semibold truncate block mt-0.5">
                    {selectedCustomer.tier} · {selectedCustomer.points} {t('pos.points_suffix')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(undefined);
                  }}
                  className="text-slate-400 hover:text-rose-500 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showCustomerDropdown ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {showCustomerDropdown && (
            <div className="absolute left-0 right-0 mt-1.5 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 max-h-56 overflow-y-auto">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                {t('pos.select_member')}
              </div>
              {customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(c);
                    setShowCustomerDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50 flex items-center justify-between border-b border-slate-50 last:border-0 cursor-pointer min-h-[44px]"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.phone}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {c.tier}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {c.points} {t('pos.points_suffix')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Items — clear compact rows */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">{t('pos.cart_empty')}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">
              {t('pos.cart_empty_sub')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cart.map((item) => {
              const lineTotal = item.unitPrice * item.quantity;
              const lineKey = `${item.product.id}:${item.stockLotId || 'none'}:${item.unitPrice}`;
              return (
                <li key={lineKey} className="px-3.5 sm:px-4 py-3 hover:bg-slate-50/80">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-slate-900 leading-snug break-words">
                        {item.product.name}
                      </div>
                      <div className="mt-1 text-[12px] font-medium text-slate-600 font-mono tabular-nums">
                        {item.unitPrice.toLocaleString()} {currentBranch.currency}
                        <span className="text-slate-400 mx-1">×</span>
                        {item.quantity}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[13px] font-extrabold text-slate-900 font-mono tabular-nums">
                        {lineTotal.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {currentBranch.currency}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQuantity(
                            item.product.id,
                            item.quantity - 1,
                            item.stockLotId
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 flex items-center justify-center shadow-sm cursor-pointer border border-transparent hover:border-rose-100"
                        aria-label="Decrease"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-bold font-mono text-slate-900 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartItemQuantity(
                            item.product.id,
                            item.quantity + 1,
                            item.stockLotId
                          )
                        }
                        className="w-8 h-8 rounded-lg bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-700 flex items-center justify-center shadow-sm cursor-pointer border border-transparent hover:border-teal-100"
                        aria-label="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id, item.stockLotId)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      aria-label={t('pos.remove_item')}
                      title={t('pos.remove_item')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Totals + actions */}
      <div className="p-4 border-t border-slate-200 bg-[#f7f6f3] shrink-0 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="bg-white border border-slate-200 px-4 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              {t('pos.grand_total')}
            </span>
            <div className="text-right">
              <span className="text-2xl font-semibold font-mono tabular-nums tracking-tight text-slate-900">
                {cartGrandTotal.toLocaleString()}
              </span>
              <span className="text-[11px] font-medium text-slate-400 ml-1.5">
                {currentBranch.currency}
              </span>
            </div>
          </div>
          {(cartDiscount > 0 || cartTax > 0) && (
            <div className="mt-2 flex flex-wrap gap-x-3 text-[10px] text-slate-400 font-mono border-t border-dashed border-slate-200 pt-2">
              <span>
                {t('pos.subtotal')} {cartSubtotal.toLocaleString()}
              </span>
              {cartDiscount > 0 && <span className="text-teal-700">−{cartDiscount.toLocaleString()}</span>}
              {cartTax > 0 && <span>+{cartTax.toLocaleString()}</span>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-0 border border-slate-200 overflow-hidden">
          <button
            type="button"
            id="hold-order-button"
            disabled={cart.length === 0}
            onClick={() => holdCurrentOrder()}
            className="col-span-1 h-12 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 cursor-pointer border-r border-amber-700/30 transition-colors"
          >
            <PauseCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('pos.hold_bill')}</span>
          </button>

          <button
            type="button"
            id="checkout-trigger-button"
            disabled={cart.length === 0}
            onClick={onOpenCheckout}
            className="col-span-2 h-12 bg-teal-800 hover:bg-teal-900 text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>{t('pos.checkout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
