import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  PauseCircle,
  Clock,
  Search,
  ScanLine,
  CheckCircle2,
  Trash2,
  Play,
  Languages,
  Menu,
  Bot,
  Sparkles,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';

interface TopHeaderProps {
  onSearchQueryChange?: (q: string) => void;
  searchQuery?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onSearchQueryChange, searchQuery = '' }) => {
  const {
    branches,
    accessibleBranches,
    currentBranch,
    setCurrentBranchId,
    canAccessAllBranches,
    heldOrders,
    resumeHeldOrder,
    deleteHeldOrder,
    toggleMobileMenu,
  } = usePOS();
  const { language, toggleLanguage, t } = useLanguage();

  const [time, setTime] = useState<string>('');
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showHeldDropdown, setShowHeldDropdown] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      id="top-header"
      className="relative h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none shrink-0 shadow-xs z-40"
    >
      {/* Left: Mobile Hamburger & Branch Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          id="mobile-drawer-trigger"
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5 text-slate-800" />
        </button>

        {/* Branch Switcher Button */}
        <div className="relative">
          <button
            id="branch-switcher-button"
            onClick={() => {
              if (!canAccessAllBranches && accessibleBranches.length <= 1) return;
              setShowBranchDropdown(!showBranchDropdown);
              setShowHeldDropdown(false);
            }}
            className={`flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-800 text-sm font-semibold shadow-xs min-h-[40px] ${
              !canAccessAllBranches && accessibleBranches.length <= 1
                ? 'cursor-default opacity-90'
                : 'cursor-pointer'
            }`}
          >
            <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="stack-copy text-left min-w-0">
              <div className="stack-copy-sub text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {t('header.active_branch')}
              </div>
              <div className="stack-copy-title text-xs font-bold text-slate-900 max-w-[90px] xs:max-w-[130px] sm:max-w-[180px]">
                {currentBranch.name}
              </div>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 transition-transform ${
                showBranchDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Branch Dropdown Menu */}
          {showBranchDropdown && (
            <div className="absolute left-0 mt-2 w-72 max-w-[90vw] rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-[60] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                {t('header.quick_switch_branch')}
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {accessibleBranches.map((b) => (
                  <button
                    key={b.id}
                    id={`branch-select-${b.id}`}
                    onClick={() => {
                      setCurrentBranchId(b.id);
                      setShowBranchDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-teal-50/60 transition-colors cursor-pointer ${
                      b.id === currentBranch.id
                        ? 'bg-teal-50 text-teal-900 font-semibold'
                        : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>{b.name}</span>
                        {b.type === 'WAREHOUSE' && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                            WH
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.city} • Code: {b.code}
                      </div>
                    </div>
                    {b.id === currentBranch.id && (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Terminal status badge (desktop only) */}
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 pl-2 border-l border-slate-200">
          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
            POS Terminal 01
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {t('nav.system_online')}
          </span>
        </div>
      </div>

      {/* Center: Search & Barcode Input */}
      {onSearchQueryChange && (
        <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="pos-search-barcode-input"
              type="text"
              placeholder={t('header.search_placeholder')}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-2 sm:pr-16 py-1.5 sm:py-2 bg-slate-100/90 border border-slate-200/80 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
            <div className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shadow-2xs font-mono">
              <ScanLine className="w-3 h-3 text-teal-500" />
              <span>SCAN</span>
            </div>
          </div>
        </div>
      )}

      {/* Right: Language, Held Orders, Clock & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Language Toggle Button */}
        <button
          id="top-language-toggle"
          onClick={toggleLanguage}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer min-h-[38px]"
          title="Toggle Language / ဘာသာစကားပြောင်းလဲရန်"
        >
          <Languages className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="hidden xs:inline">{language === 'my' ? '🇲🇲 မြန်မာ' : '🇬🇧 EN'}</span>
          <span className="xs:hidden font-bold">{language === 'my' ? '🇲🇲' : 'EN'}</span>
        </button>

        {/* Gemini AI Guide Button */}
        <button
          id="top-ai-guide-button"
          onClick={() => window.dispatchEvent(new CustomEvent('omnipos:open-ai-chat'))}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-100 hover:to-emerald-100 text-teal-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer min-h-[38px] group"
          title="Gemini AI Software Guide & Manual"
        >
          <Bot className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
          <span className="hidden md:inline font-semibold">AI Guide</span>
          <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
        </button>

        {/* Held Orders Popover */}
        <div className="relative">
          <button
            id="held-orders-button"
            onClick={() => {
              setShowHeldDropdown(!showHeldDropdown);
              setShowBranchDropdown(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[38px] ${
              heldOrders.length > 0
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100/80'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PauseCircle
              className={`w-4 h-4 ${heldOrders.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}
            />
            <span className="hidden sm:inline">{t('header.held_orders')}</span>
            {heldOrders.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </button>

          {showHeldDropdown && (
            <div
              id="held-orders-dropdown"
              className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl bg-white border border-slate-200 shadow-2xl py-2 z-[60] ring-1 ring-slate-900/5"
            >
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{t('header.held_orders')}</span>
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                  {heldOrders.length} {language === 'my' ? 'ခု' : 'Pending'}
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {heldOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {t('header.no_held_orders')}
                  </div>
                ) : (
                  heldOrders.map((held) => (
                    <div
                      key={held.id}
                      className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{held.tag}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {held.items.length} items • {held.savedAt}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            resumeHeldOrder(held.id);
                            setShowHeldDropdown(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs cursor-pointer min-h-[32px]"
                        >
                          <Play className="w-3 h-3" />
                          <span>{t('header.resume')}</span>
                        </button>
                        <button
                          onClick={() => deleteHeldOrder(held.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Clock (tablet landscape and desktop) */}
        <div className="hidden md:flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-mono font-medium text-slate-700 min-h-[38px]">
          <Clock className="w-3.5 h-3.5 text-teal-500" />
          <span>{time || '--:--:--'}</span>
        </div>
      </div>
    </header>
  );
};
