import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText, RefreshCw, Building2, ShieldAlert } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { posApi } from '../../api/posApi';
import { Pagination } from '../common/Pagination';

type AuditRow = {
  id: string;
  branchId: string | null;
  userId: string | null;
  userName: string | null;
  userUsername: string | null;
  action: string;
  tableName: string | null;
  recordId: string | null;
  description: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

export const SystemLogHistory: React.FC = () => {
  const { language } = useLanguage();
  const {
    branches,
    accessibleBranches,
    canAccessAllBranches,
    canUserPerformAction,
    currentBranch,
  } = usePOS();

  const allowed = canUserPerformAction('canViewSystemLog');
  const [branchFilter, setBranchFilter] = useState(
    canAccessAllBranches ? 'ALL' : currentBranch?.id || ''
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError('');
    try {
      const data = await posApi.getAuditLogs({
        page,
        pageSize,
        branchId: branchFilter === 'ALL' ? undefined : branchFilter,
      });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to load logs');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [allowed, page, pageSize, branchFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!allowed) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center max-w-sm space-y-2">
          <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-900">
            {language === 'my' ? 'ခွင့်ပြုချက် မရှိပါ' : 'Permission required'}
          </h3>
          <p className="text-xs text-slate-500">
            {language === 'my'
              ? 'System Log ကြည့်ရန် canViewSystemLog ခွင့်ပြုချက် လိုအပ်သည်။'
              : 'You need the View System Log permission to open this page.'}
          </p>
        </div>
      </div>
    );
  }

  const branchName = (id: string | null) => {
    if (!id) return '—';
    return branches.find((b) => b.id === id)?.name || id;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-slate-700" />
            {language === 'my' ? 'System Log History' : 'System Log History'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'my'
              ? 'မည်သူက ဘယ်အချိန်တွင် ဘာလုပ်ခဲ့သည်ကို တိကျသော description ဖြင့် မှတ်တမ်းတင်ထားသည်'
              : 'Who did what, when — every mutating system action with a clear description.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl px-2.5 py-1.5 border border-slate-200 text-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
            >
              {canAccessAllBranches && (
                <option value="ALL">{language === 'my' ? 'အားလုံး' : 'All branches'}</option>
              )}
              {(accessibleBranches.length ? accessibleBranches : branches).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {language === 'my' ? 'ပြန်ဖတ်မည်' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {error && (
            <div className="px-4 py-2 text-xs text-rose-600 bg-rose-50 border-b border-rose-100">
              {error}
            </div>
          )}
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b">
              <tr>
                <th className="py-3 px-4">{language === 'my' ? 'အချိန်' : 'When'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'အသုံးပြုသူ' : 'Who'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'ဆိုင်ခွဲ' : 'Branch'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'Action' : 'Action'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'ဖော်ပြချက်' : 'Description'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    {language === 'my' ? 'မှတ်တမ်း မရှိသေးပါ' : 'No log entries yet'}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 align-top">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {r.userName || '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.userUsername ? `@${r.userUsername}` : r.userId || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{branchName(r.branchId)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold">
                        {r.action}
                      </span>
                      {r.tableName && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.tableName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 leading-relaxed max-w-xl">
                      {r.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {total > 0 && (
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setPageSize(n);
                setPage(1);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
