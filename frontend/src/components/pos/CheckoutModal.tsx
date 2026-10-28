import React, { useEffect, useState } from 'react';
import {
  X,
  Banknote,
  Smartphone,
  Check,
  BookOpen,
  AlertTriangle,
  ShieldAlert,
  Waves,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { PaymentMethod, OrderPayment } from '../../types/pos';
import { useLanguage } from '../../context/LanguageContext';
import { showWarning } from '../../utils/swal';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Compact form-row: label left, control right */
const FormRow: React.FC<{
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  align?: 'center' | 'start';
}> = ({ label, htmlFor, children, align = 'center' }) => (
  <div
    className={`grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr] gap-x-3 gap-y-1 ${
      align === 'center' ? 'items-center' : 'items-start'
    }`}
  >
    <label
      htmlFor={htmlFor}
      className="text-xs sm:text-sm font-medium text-slate-600 leading-snug pt-0.5"
    >
      {label}
    </label>
    <div className="min-w-0">{children}</div>
  </div>
);

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    currentBranchStock,
    cartSubtotal,
    cartDiscount,
    cartTax,
    cartGrandTotal,
    currentBranch,
    processCheckout,
    selectedCustomer,
    canUserPerformAction,
    setOrderDiscount,
    setOrderTax,
  } = usePOS();
  const { language, t } = useLanguage();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [transactionRef, setTransactionRef] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [taxInput, setTaxInput] = useState('');
  const [creditDueDate, setCreditDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payMethods: { id: PaymentMethod; labelKey: string; icon: React.ElementType }[] = [
    { id: 'CASH', labelKey: 'checkout.cash', icon: Banknote },
    { id: 'KBZ_PAY', labelKey: 'checkout.kbzpay', icon: Smartphone },
    { id: 'WAVE_PAY', labelKey: 'checkout.wavepay', icon: Waves },
    { id: 'CREDIT', labelKey: 'checkout.credit', icon: BookOpen },
  ];

  useEffect(() => {
    if (!isOpen) return;
    setTenderedAmount(cartGrandTotal);
    setDiscountInput(cartDiscount > 0 ? String(cartDiscount) : '');
    setTaxInput(cartTax > 0 ? String(cartTax) : '');
    setPaymentMethod('CASH');
    setTransactionRef('');
  }, [isOpen]);

  useEffect(() => {
    if (paymentMethod !== 'CREDIT') setTenderedAmount(cartGrandTotal);
  }, [cartGrandTotal, paymentMethod]);

  if (!isOpen) return null;

  const changeAmount = Math.max(0, tenderedAmount - cartGrandTotal);
  const shortfall = Math.max(0, cartGrandTotal - tenderedAmount);
  const canSellCredit = canUserPerformAction('canSellCredit');
  const customerAvailableCredit = selectedCustomer
    ? (selectedCustomer.creditLimit || 200000) - (selectedCustomer.currentCredit || 0)
    : 0;
  const isCreditExceeded = !!(selectedCustomer && cartGrandTotal > customerAvailableCredit);

  const isSufficient =
    paymentMethod === 'CREDIT'
      ? !!selectedCustomer && canSellCredit && !isCreditExceeded
      : paymentMethod === 'CASH'
        ? tenderedAmount >= cartGrandTotal
        : true;

  const applyDiscount = (raw: string) => {
    setDiscountInput(raw);
    setOrderDiscount(Math.max(0, parseInt(raw, 10) || 0));
  };

  const applyTax = (raw: string) => {
    setTaxInput(raw);
    setOrderTax(Math.max(0, parseInt(raw, 10) || 0));
  };

  const handleCompleteSale = async () => {
    if (isSubmitting || !isSufficient) return;

    // Strict stock verification before completing sale
    for (const item of cart) {
      const available = currentBranchStock(item.product.id);
      const totalItemQty = cart
        .filter((c) => c.product.id === item.product.id)
        .reduce((sum, c) => sum + c.quantity, 0);
      if (totalItemQty > available) {
        showWarning(
          language === 'my' ? 'လက်ကျန်မလုံလောက်ပါ' : 'Insufficient Stock',
          `${item.product.name} — ${language === 'my' ? `ဤဆိုင်ခွဲတွင် လက်ကျန် ${available} သာရှိပြီး Cart ထဲတွင် ${totalItemQty} ဖြစ်နေပါသည်` : `Available in branch: ${available}, In cart: ${totalItemQty}`}`
        );
        return;
      }
    }

    const payment: OrderPayment = {
      method: paymentMethod,
      amount: cartGrandTotal,
      amountTendered:
        paymentMethod === 'CREDIT' ? 0 : paymentMethod === 'CASH' ? tenderedAmount : cartGrandTotal,
      changeGiven: paymentMethod === 'CASH' ? changeAmount : 0,
      transactionRef:
        transactionRef ||
        (paymentMethod === 'CREDIT'
          ? `CR-${Date.now().toString().slice(-6)}`
          : paymentMethod === 'KBZ_PAY'
            ? `KPAY-${Date.now().toString().slice(-6)}`
            : paymentMethod === 'WAVE_PAY'
              ? `WAVE-${Date.now().toString().slice(-6)}`
              : undefined),
      dueDate: paymentMethod === 'CREDIT' ? creditDueDate : undefined,
    };

    const finalNotes =
      paymentMethod === 'CREDIT' ? `Credit Sale due on ${creditDueDate}` : undefined;

    setIsSubmitting(true);
    try {
      await processCheckout([payment], finalNotes);
      onClose();
    } catch (err: any) {
      showWarning(t('checkout.failed'), err?.message || t('checkout.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls =
    'w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-sm font-mono tabular-nums text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200';
  const textInputCls =
    'w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
      <button
        type="button"
        aria-label={t('checkout.cancel')}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/55"
      />

      <div className="relative w-full sm:max-w-lg bg-white sm:rounded-xl shadow-2xl flex flex-col max-h-[100vh] sm:max-h-[90vh] overflow-hidden border border-slate-200">
        <header className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{t('checkout.title')}</h3>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {currentBranch.name} · {selectedCustomer?.name || t('pos.walk_in')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-300"
            title={t('checkout.cancel')}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* 1. Bill */}
          <section className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
              {t('checkout.ledger')}
            </p>

            <FormRow label={t('pos.subtotal')}>
              <div className="h-9 flex items-center justify-end px-2.5 text-sm font-mono tabular-nums text-slate-700 bg-slate-50 rounded-lg border border-slate-100">
                {cartSubtotal.toLocaleString()} {currentBranch.currency}
              </div>
            </FormRow>

            <FormRow label={t('pos.discount')} htmlFor="checkout-discount">
              <div className="relative">
                <input
                  id="checkout-discount"
                  type="number"
                  min={0}
                  value={discountInput}
                  onChange={(e) => applyDiscount(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} pr-12`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                  {currentBranch.currency}
                </span>
              </div>
            </FormRow>

            <FormRow label={t('checkout.tax_mmk')} htmlFor="checkout-tax">
              <div className="relative">
                <input
                  id="checkout-tax"
                  type="number"
                  min={0}
                  value={taxInput}
                  onChange={(e) => applyTax(e.target.value)}
                  placeholder="0"
                  className={`${inputCls} pr-12`}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                  {currentBranch.currency}
                </span>
              </div>
            </FormRow>

            <FormRow label={t('checkout.amount_due')}>
              <div className="h-9 flex items-center justify-end px-2.5 text-sm font-semibold font-mono tabular-nums text-teal-800 bg-teal-50 rounded-lg border border-teal-100">
                {cartGrandTotal.toLocaleString()} {currentBranch.currency}
              </div>
            </FormRow>
          </section>

          {/* 2. Customer paid (cash) — above payment method */}
          {paymentMethod === 'CASH' && (
            <section className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
                {t('checkout.tendered')}
              </p>

              <FormRow label={t('checkout.tendered')} htmlFor="checkout-tendered">
                <div className="relative">
                  <input
                    id="checkout-tendered"
                    type="number"
                    value={tenderedAmount || ''}
                    onChange={(e) => setTenderedAmount(Number(e.target.value))}
                    className={`${inputCls} pr-12`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
                    {currentBranch.currency}
                  </span>
                </div>
              </FormRow>

              <FormRow label={isSufficient ? t('checkout.change') : t('checkout.shortfall')}>
                <div
                  className={`h-9 flex items-center justify-end px-2.5 text-sm font-semibold font-mono tabular-nums rounded-lg border ${
                    isSufficient
                      ? 'text-emerald-800 bg-emerald-50 border-emerald-100'
                      : 'text-rose-700 bg-rose-50 border-rose-100'
                  }`}
                >
                  {(isSufficient ? changeAmount : shortfall).toLocaleString()} {currentBranch.currency}
                </div>
              </FormRow>

              {!isSufficient && (
                <p className="text-xs text-rose-600 pl-[7.5rem] sm:pl-[9rem]">
                  {t('checkout.insufficient_cash')}
                </p>
              )}
            </section>
          )}

          {/* 3. Payment method — below customer paid */}
          <section className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
              {t('checkout.payment_method')}
            </p>

            <FormRow label={t('checkout.payment_method')} align="start">
              <div className="grid grid-cols-2 gap-1.5">
                {payMethods.map((m) => {
                  const Icon = m.icon;
                  const active = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(m.id);
                        setTransactionRef('');
                        if (m.id !== 'CREDIT') setTenderedAmount(cartGrandTotal);
                        else setTenderedAmount(0);
                      }}
                      className={`h-9 px-2 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                        active
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-teal-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {t(m.labelKey)}
                    </button>
                  );
                })}
              </div>
            </FormRow>

            {paymentMethod === 'CREDIT' && (
              <div className="space-y-2.5 pt-1">
                {!canSellCredit && (
                  <p className="flex items-center gap-2 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg px-3 py-2">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    {t('checkout.no_permission')}
                  </p>
                )}
                {!selectedCustomer ? (
                  <p className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {t('checkout.select_customer')}
                  </p>
                ) : (
                  <>
                    <FormRow label={t('checkout.credit_available')}>
                      <div className="h-9 flex items-center justify-between px-2.5 text-sm rounded-lg border border-slate-100 bg-slate-50">
                        <span className="text-slate-600 truncate mr-2">{selectedCustomer.name}</span>
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            isCreditExceeded ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {customerAvailableCredit.toLocaleString()}
                        </span>
                      </div>
                    </FormRow>
                    <FormRow label={t('checkout.due_date')} htmlFor="checkout-due">
                      <input
                        id="checkout-due"
                        type="date"
                        value={creditDueDate}
                        onChange={(e) => setCreditDueDate(e.target.value)}
                        className={textInputCls}
                      />
                    </FormRow>
                  </>
                )}
              </div>
            )}

            {(paymentMethod === 'KBZ_PAY' || paymentMethod === 'WAVE_PAY') && (
              <div className="space-y-2.5 pt-1">
                <p className="text-xs text-slate-500">{t('checkout.hint_digital')}</p>
                <FormRow label={t('checkout.ref_optional')} htmlFor="checkout-ref">
                  <input
                    id="checkout-ref"
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder={t('checkout.ref_optional')}
                    className={textInputCls}
                  />
                </FormRow>
              </div>
            )}
          </section>
        </div>

        <footer className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 shrink-0 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200/60"
          >
            {t('checkout.cancel')}
          </button>
          <button
            type="button"
            disabled={!isSufficient || isSubmitting}
            onClick={handleCompleteSale}
            className="flex-1 h-10 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-sm font-medium inline-flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{t('checkout.confirm')}</span>
            <span className="opacity-60">·</span>
            <span className="font-mono tabular-nums">
              {cartGrandTotal.toLocaleString()} {currentBranch.currency}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
};
