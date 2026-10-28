import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  ArrowRight,
  PackageCheck,
  Search,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { StockTransferModal } from '../inventory/StockTransferModal';

export const BranchTransfersView: React.FC = () => {
  const { transfers, branches, receiveTransfer, currentBranch } = usePOS();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'IN_TRANSIT' | 'RECEIVED'>('ALL');

  const getBranchName = (id: string) => {
    return branches.find((b) => b.id === id)?.name || id;
  };

  const filteredTransfers = transfers.filter((t) => {
    if (filter === 'ALL') return true;
    return t.status === filter;
  });

  return (
    <div id="branch-transfers-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-teal-600" />
            <span>Inter-Branch Stock Transfers</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track and process stock movements across stores and central warehouse.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/25 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate Stock Transfer</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 bg-white/70 border-b border-slate-200/80 flex items-center gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
            filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Transfers ({transfers.length})
        </button>
        <button
          onClick={() => setFilter('IN_TRANSIT')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
            filter === 'IN_TRANSIT'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>In Transit ({transfers.filter((t) => t.status === 'IN_TRANSIT').length})</span>
        </button>
        <button
          onClick={() => setFilter('RECEIVED')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
            filter === 'RECEIVED'
              ? 'bg-emerald-600 text-white'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>Received ({transfers.filter((t) => t.status === 'RECEIVED').length})</span>
        </button>
      </div>

      {/* Transfers List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredTransfers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            No stock transfers matching this filter.
          </div>
        ) : (
          filteredTransfers.map((trf) => {
            const isDestinationCurrent = trf.destBranchId === currentBranch.id;
            const canReceive = trf.status === 'IN_TRANSIT' && isDestinationCurrent;

            return (
              <div
                key={trf.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {trf.transferNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        trf.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : trf.status === 'IN_TRANSIT'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {trf.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">• {trf.createdAt}</span>
                  </div>

                  {/* Product & Qty */}
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{trf.productName}</span>
                    <span className="text-xs font-mono font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-md">
                      Qty: {trf.quantity} units
                    </span>
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                    <div className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{getBranchName(trf.sourceBranchId)}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="flex items-center gap-1 font-bold text-teal-900">
                      <Building2 className="w-3.5 h-3.5 text-teal-500" />
                      <span>{getBranchName(trf.destBranchId)}</span>
                    </div>
                  </div>

                  {trf.notes && (
                    <p className="text-xs text-slate-400 mt-2 italic bg-slate-50 p-2 rounded-lg inline-block">
                      Note: {trf.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-2">
                  {trf.status === 'IN_TRANSIT' ? (
                    <button
                      onClick={() => receiveTransfer(trf.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Accept & Restock Branch</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Stock Restocked</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <StockTransferModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
