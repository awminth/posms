import React, { useEffect, useMemo, useState } from 'react';
import {
  Lock,
  Building2,
  ArrowRight,
  Languages,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  MonitorSmartphone,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { SearchableSelect } from '../common/SearchableSelect';

const REMEMBER_KEY = 'omnipos_remembered_login';

export const LoginPage: React.FC = () => {
  const { branches, currentBranch, setCurrentBranchId, loginWithCredentials, users } = usePOS();
  const { language, toggleLanguage, t } = useLanguage();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(currentBranch?.id || 'b-01');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [mismatchBranch, setMismatchBranch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REMEMBER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.rememberMe) {
        setRememberMe(true);
        if (saved.username) setUsername(saved.username);
        if (saved.password) setPassword(saved.password);
        if (saved.branchId) {
          setSelectedBranchId(saved.branchId);
          setCurrentBranchId(saved.branchId);
        }
      }
    } catch {
      /* ignore */
    }
  }, [setCurrentBranchId]);

  const matchedUser = useMemo(() => {
    const clean = username.trim().toLowerCase();
    if (!clean) return undefined;
    return users.find(
      (u) =>
        u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean)
    );
  }, [username, users]);

  const isLikelySuperAdmin =
    matchedUser?.role === 'SUPER_ADMIN' ||
    username.trim().toLowerCase() === 'superadmin' ||
    username.trim().toLowerCase() === 'admin';

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const handleBranchChange = (id: string) => {
    setSelectedBranchId(id);
    setCurrentBranchId(id);
    setErrorMessage('');
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const cleanUser = username.trim();
    if (!cleanUser) {
      setErrorMessage(language === 'my' ? 'Username ရိုက်ထည့်ပါ' : 'Please enter your username');
      return;
    }
    if (!password) {
      setErrorMessage(language === 'my' ? 'စကားဝှက် ရိုက်ထည့်ပါ' : 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginWithCredentials(
        cleanUser,
        password,
        selectedBranchId,
        rememberMe
      );

      if (result === 'BRANCH_MISMATCH') {
        const assigned = matchedUser
          ? branches.find((b) => b.id === matchedUser.branchId)
          : undefined;
        setMismatchBranch(assigned || null);
        setErrorMessage(
          language === 'my'
            ? `ဤအကောင့်သည် ${assigned ? `"${assigned.name}"` : 'မိမိတာဝန်ကျဆိုင်ခွဲ'} ကိုသာ ရွေးချယ်၍ ဝင်ရောက်ခွင့်ရှိပါသည်။`
            : `This account can only sign in to its assigned branch${assigned ? ` (${assigned.name})` : ''}.`
        );
        return;
      }

      setMismatchBranch(null);
      if (!result) {
        setErrorMessage(t('login.invalid_credentials'));
        return;
      }

      if (!rememberMe) localStorage.removeItem(REMEMBER_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="pos-login-page"
      className="min-h-screen w-screen flex flex-col lg:flex-row bg-slate-100 text-slate-900 select-none overflow-hidden"
    >
      {/* Left — brand + hero image */}
      <aside className="relative lg:w-[42%] xl:w-[40%] bg-teal-800 text-white flex flex-col justify-between px-6 py-5 sm:px-8 sm:py-7 shrink-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[radial-gradient(circle_at_20%_20%,#fff_0%,transparent_45%),radial-gradient(circle_at_80%_80%,#fff_0%,transparent_40%)]" />
        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-teal-600/40 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-bold text-lg tracking-wide shrink-0">
              OP
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-lg tracking-tight leading-tight">OmniPOS</div>
              <div className="text-teal-100/80 text-xs mt-0.5 truncate">
                {language === 'my' ? 'အရောင်းကောင်တာ စနစ်' : 'Point of Sale Terminal'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium shrink-0"
            title={t('login.language')}
          >
            <Languages className="w-3.5 h-3.5" />
            {language === 'my' ? 'EN' : 'မြန်မာ'}
          </button>
        </div>

        <div className="relative z-10 py-6 sm:py-8 flex flex-col items-center text-center lg:text-left lg:items-start">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-white/15 shadow-xl shadow-teal-950/30 bg-teal-900/30 mb-5">
            <img
              src="/pos-login-hero.png"
              alt=""
              className="w-full h-auto object-cover aspect-[4/3]"
              draggable={false}
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold leading-snug max-w-sm">
            {t('login.welcome')}
          </h1>
          <p className="mt-2 text-sm text-teal-100/85 max-w-sm leading-relaxed">
            {t('login.subtitle')}
          </p>
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-teal-50 bg-white/10 border border-white/15 rounded-lg px-3 py-2">
            <MonitorSmartphone className="w-3.5 h-3.5" />
            {t('login.terminal_ready')}
          </div>
          {selectedBranch && (
            <div className="text-xs text-teal-100/80 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {selectedBranch.name} · {selectedBranch.city}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Right — credentials only */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 overflow-hidden">
            <div className="px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                {language === 'my' ? 'အကောင့်ဝင်ရောက်ရန်' : 'Sign in'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'my'
                  ? 'Username နှင့် စကားဝှက်ဖြင့် ကောင်တာ ဖွင့်ပါ'
                  : 'Use your username and password to open the terminal'}
              </p>
            </div>

            <form onSubmit={handleCredentialsSubmit} className="p-5 sm:p-6 space-y-3.5">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-700" />
                  {t('login.select_branch')}
                </label>
                <div className="relative">
                  <SearchableSelect
                    value={selectedBranchId}
                    onChange={handleBranchChange}
                    options={branches.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.code})`,
                    }))}
                    className="w-full"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
                  {isLikelySuperAdmin
                    ? language === 'my'
                      ? 'Super Admin သည် ဆိုင်ခွဲအားလုံး ဝင်နိုင်သည်။'
                      : 'Super Admin can access all branches.'
                    : language === 'my'
                      ? 'မိမိတာဝန်ကျဆိုင်ခွဲကို ရွေးပါ။'
                      : 'Select your assigned branch.'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-teal-700" />
                  {t('login.username')}
                </label>
                <input
                  id="login-username-input"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="Username"
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-teal-700" />
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="••••••••"
                    className="w-full h-11 pl-3 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="login-remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
                />
                <span className="text-xs text-slate-600">
                  {language === 'my' ? 'အကောင့်မှတ်ထားမည်' : 'Remember me'}
                </span>
              </label>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </div>
                  {mismatchBranch && (
                    <button
                      type="button"
                      onClick={() => {
                        handleBranchChange(mismatchBranch.id);
                        setErrorMessage('');
                        setMismatchBranch(null);
                      }}
                      className="self-start text-[11px] font-bold px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>
                        {language === 'my'
                          ? `"${mismatchBranch.name}" သို့ ပြောင်းလဲမည်`
                          : `Switch to "${mismatchBranch.name}"`}
                      </span>
                    </button>
                  )}
                </div>
              )}

              <button
                id="login-submit-button"
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {language === 'my' ? 'စစ်ဆေးနေသည်…' : 'Signing in…'}
                  </>
                ) : (
                  <>
                    {t('login.sign_in')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-400">
            OmniPOS · v3.0 · {language === 'my' ? 'အရောင်းကောင်တာ' : 'Retail Terminal'}
          </p>
        </div>
      </main>
    </div>
  );
};
