import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Package,
  ReceiptText,
  Users,
  BarChart3,
  Building2,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  LogOut,
  Truck,
  UserCog,
  Banknote,
  X,
  Settings2,
  Tags,
  Ruler,
  ArrowLeftRight,
  Receipt,
  TrendingUp,
  ScrollText,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { NavigationTab } from '../../types/pos';
import { resolveAvatar } from '../../utils/media';

export const LeftVerticalMenu: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentBranch,
    currentUser,
    logout,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    canUserPerformAction,
  } = usePOS();
  const { language, t } = useLanguage();
  const setupOpenDefault =
    activeTab === 'setup-categories' ||
    activeTab === 'setup-units' ||
    activeTab === 'setup-system-log';
  const [setupOpen, setSetupOpen] = useState(true);
  const setupSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (setupOpenDefault) setSetupOpen(true);
  }, [setupOpenDefault]);

  useEffect(() => {
    if (!setupOpen) return;
    const t = window.setTimeout(() => {
      setupSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [setupOpen]);

  const menuItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'register', label: t('nav.register'), icon: <Store className="w-5 h-5" /> },
    { id: 'inventory', label: t('nav.inventory'), icon: <Package className="w-5 h-5" /> },
    { id: 'transfers', label: t('nav.transfers'), icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'orders', label: t('nav.orders'), icon: <ReceiptText className="w-5 h-5" /> },
    { id: 'customers', label: t('nav.customers'), icon: <Users className="w-5 h-5" /> },
    {
      id: 'suppliers',
      label: t('nav.suppliers'),
      icon: <Truck className="w-5 h-5" />,
    },
    {
      id: 'users',
      label: t('nav.users'),
      icon: <UserCog className="w-5 h-5" />,
    },
    { id: 'reports', label: t('nav.reports'), icon: <BarChart3 className="w-5 h-5" /> },
    {
      id: 'financial',
      label: t('nav.financial'),
      icon: <Banknote className="w-5 h-5" />,
    },
    {
      id: 'expenses',
      label: t('nav.expenses'),
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'other-income',
      label: t('nav.other_income'),
      icon: <TrendingUp className="w-5 h-5" />,
    },
    { id: 'branches', label: t('nav.branches'), icon: <Building2 className="w-5 h-5" /> },
  ];

  const setupItems: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'setup-categories',
      label: t('nav.setup_categories'),
      icon: <Tags className="w-4 h-4" />,
    },
    {
      id: 'setup-units',
      label: t('nav.setup_units'),
      icon: <Ruler className="w-4 h-4" />,
    },
    ...(canUserPerformAction('canViewSystemLog')
      ? [
          {
            id: 'setup-system-log' as NavigationTab,
            label: t('nav.setup_system_log'),
            icon: <ScrollText className="w-4 h-4" />,
          },
        ]
      : []),
  ];

  const renderNavButton = (
    item: { id: NavigationTab; label: string; icon: React.ReactNode },
    isMobile: boolean,
    compact = false
  ) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        id={`nav-item-${item.id}`}
        onClick={() => {
          setActiveTab(item.id);
          if (item.id.startsWith('setup-')) setSetupOpen(true);
          if (isMobile) setIsMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-3 ${
          compact ? 'px-3 py-2.5 ml-2' : 'px-3.5 py-3'
        } rounded-xl text-left transition-all duration-150 group cursor-pointer ${
          isActive
            ? 'bg-teal-600 text-white font-semibold shadow-md shadow-teal-600/30 ring-1 ring-teal-400/40'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        <div
          className={`p-1.5 rounded-lg transition-colors shrink-0 ${
            isActive
              ? 'bg-white/15 text-white'
              : 'bg-slate-800 text-slate-400 group-hover:text-teal-400 group-hover:bg-slate-700'
          }`}
        >
          {item.icon}
        </div>
        <span className="flex-1 text-sm font-medium tracking-tight leading-relaxed truncate">
          {item.label}
        </span>
        {isActive && <ChevronRight className="w-4 h-4 text-white/60 shrink-0" />}
      </button>
    );
  };

  const renderMenuContent = (isMobile = false) => (
    <div className="flex flex-col h-full">
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-800 via-teal-700 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-700/30 text-white font-bold text-lg tracking-wider ring-1 ring-white/20">
              OP
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-tight truncate">
                  OmniPOS
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  PRO
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Multi-Branch POS
              </p>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mt-3.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium gap-2">
            <span className="leading-relaxed">{t('header.active_branch')}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 shrink-0">
              {currentBranch.code}
            </span>
          </div>
          <div className="text-sm font-semibold text-white truncate leading-relaxed flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
            <span className="truncate">{currentBranch.name}</span>
          </div>
          <div className="text-[11px] text-slate-400 truncate leading-relaxed pl-4">
            {currentBranch.city} • Tax {currentBranch.taxRate}%
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 pb-8 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {language === 'my' ? 'ပင်မမီနူးများ' : 'Main Menu'}
        </div>
        {menuItems.map((item) => renderNavButton(item, isMobile))}

        <div className="pt-3 px-1" ref={setupSectionRef}>
          <button
            type="button"
            onClick={() => {
              setSetupOpen((o) => {
                const next = !o;
                if (next) {
                  setTimeout(() => {
                    setupSectionRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                    });
                  }, 50);
                }
                return next;
              });
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left cursor-pointer transition-colors ${
              setupOpenDefault
                ? 'bg-slate-800/80 text-white'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-slate-800 text-amber-400 shrink-0">
              <Settings2 className="w-5 h-5" />
            </div>
            <span className="flex-1 text-sm font-semibold leading-relaxed">
              {language === 'my' ? 'Setup စနစ်သတ်မှတ်ချက်' : 'Setup'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${setupOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {setupOpen && (
            <div className="mt-1 mb-4 space-y-1 border-l border-slate-700/80 ml-4 pl-1">
              {setupItems.map((item) => renderNavButton(item, isMobile, true))}
            </div>
          )}
        </div>
      </nav>

      <div className="p-3 sm:p-4 border-t border-slate-800/90 bg-slate-950/60 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={resolveAvatar(currentUser.avatar)}
              alt={currentUser.fullName}
              className="w-9 h-9 rounded-full ring-2 ring-teal-500/40 object-cover shrink-0"
            />
            <div className="stack-copy flex-1">
              <div className="stack-copy-title flex items-center gap-1.5 text-xs font-semibold text-white">
                <span className="truncate">{currentUser.fullName}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              </div>
              <p className="stack-copy-sub text-[11px] text-slate-400">
                {currentUser.role.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 border border-slate-700/60 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
            title={t('nav.logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-slate-300 font-medium truncate leading-relaxed">
              {language === 'my' ? 'အရောင်းကောင်တာ အဆင်သင့်' : 'Cashier Ready'}
            </span>
          </div>
          <span className="text-teal-400 font-mono text-[11px] shrink-0">
            {currentUser.role.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        id="left-vertical-menu"
        className="hidden lg:flex w-80 bg-slate-900 text-slate-200 flex-col h-screen select-none border-r border-slate-800 shrink-0 shadow-xl z-20"
      >
        {renderMenuContent(false)}
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative w-80 max-w-[85vw] bg-slate-900 text-slate-200 flex flex-col h-full shadow-2xl z-50 animate-in slide-in-from-left duration-200 select-none">
            {renderMenuContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
