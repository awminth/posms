import React from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Percent,
  Coins,
  Store,
  ExternalLink,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';

export const BranchManagement: React.FC = () => {
  const { branches, currentBranch, setCurrentBranchId } = usePOS();

  return (
    <div id="branches-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200 shrink-0">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-teal-600" />
          <span>Multi-Branch Store Outlets & Configuration</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage physical locations, tax rates, contact channels, and localized receipt templates.
        </p>
      </div>

      {/* Branches List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((b) => {
            const isCurrent = b.id === currentBranch.id;

            return (
              <div
                key={b.id}
                className={`bg-white rounded-3xl border transition-all duration-200 p-6 flex flex-col justify-between shadow-xs ${
                  isCurrent
                    ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                          isCurrent
                            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{b.name}</h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          Code: {b.code} • {b.type}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-5 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-4">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>{b.address}, {b.city}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{b.phone}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{b.email}</span>
                    </div>
                  </div>

                  {/* Tax & Currency Pill */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      <Percent className="w-3 h-3 text-teal-500" />
                      <span>Tax Rate: {b.taxRate}%</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                      <Coins className="w-3 h-3 text-amber-500" />
                      <span>Currency: {b.currency}</span>
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Status: <span className="font-semibold text-emerald-600">Online & Synchronized</span>
                  </div>

                  {!isCurrent ? (
                    <button
                      onClick={() => setCurrentBranchId(b.id)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs"
                    >
                      Switch to This Branch
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Currently Operating</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
