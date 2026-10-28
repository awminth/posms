import React, { useState } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  DollarSign,
  Lock,
  PlusCircle,
  X,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';

export const ShiftCashDrawer: React.FC = () => {
  const {
    currentShift,
    currentBranch,
    currentUser,
    recordCashMovement,
    closeShift,
    openShift,
  } = usePOS();

  const [isCashMovementModalOpen, setIsCashMovementModalOpen] = useState(false);
  const [cashMovementType, setCashMovementType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [movementAmount, setMovementAmount] = useState<number>(10000);
  const [movementReason, setMovementReason] = useState<string>('');

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [actualCashCount, setActualCashCount] = useState<number>(
    currentShift?.expectedCash || 100000
  );
  const [shiftNotes, setShiftNotes] = useState<string>('');

  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [newOpeningFloat, setNewOpeningFloat] = useState<number>(100000);

  const handleCashMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (movementAmount <= 0 || !movementReason) return;
    await recordCashMovement(movementAmount, cashMovementType, movementReason);
    setIsCashMovementModalOpen(false);
    setMovementReason('');
  };

  const handleCloseShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await closeShift(actualCashCount, shiftNotes);
    setIsCloseShiftModalOpen(false);
  };

  const handleOpenShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await openShift(newOpeningFloat);
    setIsOpenShiftModalOpen(false);
  };

  const isShiftOpen = currentShift?.status === 'OPEN';
  const cashDiscrepancy =
    currentShift?.difference !== undefined
      ? currentShift.difference
      : actualCashCount - (currentShift?.expectedCash || 0);

  return (
    <div id="shift-drawer-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-teal-600" />
            <span>Cash Register & Shift Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Drawer float balancing, cash-in/cash-out logging, and end-of-day reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isShiftOpen ? (
            <>
              <button
                onClick={() => {
                  setCashMovementType('CASH_IN');
                  setIsCashMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors"
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Cash In</span>
              </button>

              <button
                onClick={() => {
                  setCashMovementType('CASH_OUT');
                  setIsCashMovementModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                <span>Cash Out (Drop)</span>
              </button>

              <button
                onClick={() => {
                  setActualCashCount(currentShift?.expectedCash || 0);
                  setIsCloseShiftModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <Lock className="w-4 h-4 text-rose-400" />
                <span>Close Shift & Reconcile</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-md shadow-teal-600/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Open New Cashier Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Shift Dashboard Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status Banner */}
        <div
          className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isShiftOpen
              ? 'bg-gradient-to-r from-teal-900 via-teal-950 to-slate-900 text-white border-teal-800 shadow-lg'
              : 'bg-slate-200/80 text-slate-800 border-slate-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isShiftOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs uppercase font-bold tracking-wider opacity-80">
                Current Shift Status: {isShiftOpen ? 'Active Register' : 'Shift Closed'}
              </span>
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">
              {currentShift?.registerName || 'POS Terminal 01'} — {currentBranch.name}
            </h3>
            <p className="text-xs opacity-75">
              Cashier on Duty: {currentShift?.cashierName || currentUser.fullName} • Opened:{' '}
              {currentShift?.openedAt || 'N/A'}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xs opacity-80 uppercase font-semibold">
              Expected Physical Cash in Drawer
            </div>
            <div className="text-3xl font-mono font-black mt-0.5">
              {(currentShift?.currentCash || 0).toLocaleString()} {currentBranch.currency}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Opening Float
            </div>
            <div className="text-xl font-mono font-extrabold text-slate-900 mt-1">
              {(currentShift?.openingFloat || 0).toLocaleString()} {currentBranch.currency}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Initial base float for change
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Cash Sales
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-600 mt-1">
              +{(currentShift?.cashSales || 0).toLocaleString()} {currentBranch.currency}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Direct physical cash collected
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Mobile QR (KBZPay / Wave)
            </div>
            <div className="text-xl font-mono font-extrabold text-teal-600 mt-1">
              +{(currentShift?.mobileWalletSales || 0).toLocaleString()} {currentBranch.currency}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Settled directly to digital wallets
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Shift Gross
            </div>
            <div className="text-xl font-mono font-extrabold text-slate-900 mt-1">
              {(currentShift?.totalSales || 0).toLocaleString()} {currentBranch.currency}
            </div>
            <span className="text-[11px] text-teal-600 font-semibold mt-1 block">
              {currentShift?.ordersCount || 0} customer bills completed
            </span>
          </div>
        </div>

        {/* Reconciliation info if closed */}
        {!isShiftOpen && currentShift && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Last Shift Reconciliation Result</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border">
                <span className="text-slate-500 block text-[10px]">Expected Cash:</span>
                <span className="text-base font-bold text-slate-900">
                  {currentShift.expectedCash.toLocaleString()} {currentBranch.currency}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border">
                <span className="text-slate-500 block text-[10px]">Actual Counted:</span>
                <span className="text-base font-bold text-slate-900">
                  {(currentShift.actualCash || 0).toLocaleString()} {currentBranch.currency}
                </span>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  (currentShift.difference || 0) === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <span className="block text-[10px]">Difference / Variance:</span>
                <span className="text-base font-bold">
                  {(currentShift.difference || 0) >= 0 ? '+' : ''}
                  {(currentShift.difference || 0).toLocaleString()} {currentBranch.currency}
                  {(currentShift.difference || 0) === 0 ? ' (Balanced)' : ' (Discrepancy)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cash In / Out Movement Modal */}
      {isCashMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                {cashMovementType === 'CASH_IN' ? 'Register Cash In (Deposit)' : 'Cash Out (Withdrawal)'}
              </h4>
              <button onClick={() => setIsCashMovementModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCashMovementSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Amount ({currentBranch.currency})
                </label>
                <input
                  type="number"
                  min="100"
                  step="500"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-base font-bold font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Additional change coins, bought milk cartons, safe drop..."
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs text-slate-900"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCashMovementModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {isCloseShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">Close Shift & Cash Balancing</h4>
              <button onClick={() => setIsCloseShiftModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>System Calculated Cash:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {(currentShift?.expectedCash || 0).toLocaleString()} {currentBranch.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Actual Physical Cash Counted in Drawer:
                </label>
                <input
                  type="number"
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-lg font-bold font-mono text-slate-900"
                />
              </div>

              <div
                className={`p-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
                  cashDiscrepancy === 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <span>Calculated Variance:</span>
                <span>
                  {cashDiscrepancy >= 0 ? '+' : ''}
                  {cashDiscrepancy.toLocaleString()} {currentBranch.currency}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Shift Notes</label>
                <input
                  type="text"
                  placeholder="Notes for manager or next cashier..."
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCloseShiftModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700"
                >
                  Confirm Close Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 w-full max-w-sm p-6 space-y-4">
            <h4 className="text-base font-bold text-slate-900">Start Cashier Shift</h4>
            <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Starting Float Amount ({currentBranch.currency})
                </label>
                <input
                  type="number"
                  value={newOpeningFloat}
                  onChange={(e) => setNewOpeningFloat(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-base font-bold font-mono text-slate-900"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenShiftModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700"
                >
                  Open Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
