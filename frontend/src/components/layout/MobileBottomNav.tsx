import React from 'react';
import {
  Store,
  Package,
  ReceiptText,
  Banknote,
  LayoutGrid,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { NavigationTab } from '../../types/pos';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, toggleMobileMenu, isMobileMenuOpen, cartItemCount } = usePOS();
  const { language, t } = useLanguage();

  const isOtherActive = [
    'customers',
    'suppliers',
    'users',
    'reports',
    'expenses',
    'other-income',
    'branches',
    'setup-categories',
    'setup-units',
    'setup-system-log',
  ].includes(activeTab);

  const navItems: {
    id: NavigationTab | 'menu';
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
    onClick: () => void;
    isActive: boolean;
  }[] = [
    {
      id: 'register',
      label: language === 'my' ? 'အရောင်း' : 'POS',
      icon: <Store className="w-5 h-5" />,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
      onClick: () => setActiveTab('register'),
      isActive: activeTab === 'register',
    },
    {
      id: 'orders',
      label: language === 'my' ? 'ဘောင်ချာ' : 'Orders',
      icon: <ReceiptText className="w-5 h-5" />,
      onClick: () => setActiveTab('orders'),
      isActive: activeTab === 'orders',
    },
    {
      id: 'inventory',
      label: language === 'my' ? 'စတော့' : 'Stock',
      icon: <Package className="w-5 h-5" />,
      onClick: () => setActiveTab('inventory'),
      isActive: activeTab === 'inventory',
    },
    {
      id: 'financial',
      label: language === 'my' ? 'ဘဏ္ဍာရေး' : 'P&L',
      icon: <Banknote className="w-5 h-5" />,
      onClick: () => setActiveTab('financial'),
      isActive: activeTab === 'financial',
    },
    {
      id: 'menu',
      label: language === 'my' ? 'မီနူး' : 'Menu',
      icon: <LayoutGrid className="w-5 h-5" />,
      badge: isOtherActive ? '•' : undefined,
      onClick: toggleMobileMenu,
      isActive: isMobileMenuOpen || isOtherActive,
    },
  ];

  return (
    <nav
      id="mobile-bottom-nav-bar"
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-400 select-none pb-[env(safe-area-inset-bottom,0px)] shadow-2xl"
    >
      <div className="grid grid-cols-5 items-center h-15 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-all duration-150 active:scale-95 cursor-pointer ${
                item.isActive
                  ? 'text-teal-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Active top glow indicator bar */}
              {item.isActive && (
                <span className="absolute top-0 w-8 h-1 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50" />
              )}

              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full text-[10px] font-mono font-bold flex items-center justify-center ${
                      typeof item.badge === 'number'
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-teal-500 text-white animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[64px] leading-relaxed">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
