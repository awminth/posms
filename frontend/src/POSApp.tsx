import React, { useState, useEffect } from 'react';
import { usePOS } from './context/POSContext';
import { LoginPage } from './components/auth/LoginPage';
import { LeftVerticalMenu } from './components/layout/LeftVerticalMenu';
import { TopHeader } from './components/layout/TopHeader';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { CashierTerminal } from './components/pos/CashierTerminal';
import { InventoryManagement } from './components/inventory/InventoryManagement';
import { OrderHistory } from './components/orders/OrderHistory';
import { CustomerList } from './components/customers/CustomerList';
import { SupplierManagement } from './components/suppliers/SupplierManagement';
import { UserManagement } from './components/users/UserManagement';
import { AnalyticsDashboard } from './components/reports/AnalyticsDashboard';
import { FinancialReport } from './components/reports/FinancialReport';
import { ExpenseManagement } from './components/finance/ExpenseManagement';
import { OtherIncomeManagement } from './components/finance/OtherIncomeManagement';
import { BranchManagement } from './components/branches/BranchManagement';
import { CategorySetup } from './components/setup/CategorySetup';
import { UnitSetup } from './components/setup/UnitSetup';
import { SystemLogHistory } from './components/setup/SystemLogHistory';
import { BranchTransfersView } from './components/transfers/BranchTransfersView';
import { AIChatBot } from './components/common/AIChatBot';
import { LOGIN_PATH, navigateToPath, tabToPath } from './utils/navigation';

export const POSApp: React.FC = () => {
  const { activeTab, isAuthenticated, isLoading, apiOnline } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigateToPath(LOGIN_PATH, true);
      return;
    }
    if (window.location.pathname === LOGIN_PATH || window.location.pathname === '/') {
      navigateToPath(tabToPath(activeTab), true);
    }
  }, [isAuthenticated, isLoading, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center space-y-2">
          <div className="text-lg font-bold">OmniPOS</div>
          <div className="text-sm text-slate-400">Connecting to database…</div>
        </div>
      </div>
    );
  }

  if (!apiOnline) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-200 p-6">
        <div className="max-w-md text-center space-y-3">
          <div className="text-lg font-bold text-rose-300">API / Database offline</div>
          <p className="text-sm text-slate-400">
            Backend ကို <code className="text-teal-300">cd backend && npm run dev</code> ဖြင့် စတင်ပြီး MySQL
            (`mt_posms`) ချိတ်ဆက်မှုကို စစ်ဆေးပါ။
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'register':
        return <CashierTerminal searchQuery={searchQuery} />;
      case 'inventory':
        return <InventoryManagement />;
      case 'transfers':
        return <BranchTransfersView />;
      case 'orders':
        return <OrderHistory />;
      case 'customers':
        return <CustomerList />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'users':
        return <UserManagement />;
      case 'reports':
        return <AnalyticsDashboard />;
      case 'financial':
        return <FinancialReport />;
      case 'expenses':
        return <ExpenseManagement />;
      case 'other-income':
        return <OtherIncomeManagement />;
      case 'branches':
        return <BranchManagement />;
      case 'setup-categories':
        return <CategorySetup />;
      case 'setup-units':
        return <UnitSetup />;
      case 'setup-system-log':
        return <SystemLogHistory />;
      default:
        return <CashierTerminal searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-900 font-sans overflow-hidden select-none">
      <LeftVerticalMenu />

      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 overflow-hidden relative">
        <TopHeader searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />

        <main className="flex-1 flex overflow-hidden relative pb-15 lg:pb-0">
          {renderActiveView()}
        </main>

        <MobileBottomNav />
      </div>

      {/* Floating Gemini AI Assistant */}
      <AIChatBot />
    </div>
  );
};
