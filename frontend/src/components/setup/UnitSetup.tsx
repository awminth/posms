import React, { useState } from 'react';
import { Ruler, Plus, Trash2 } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { showSuccess, showWarning, confirmDialog } from '../../utils/swal';

export const UnitSetup: React.FC = () => {
  const { units, addUnit, deleteUnit } = usePOS();
  const { language, t } = useLanguage();
  const [name, setName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addUnit({ name: name.trim() });
      setName('');
      showSuccess(language === 'my' ? 'Unit ထည့်ပြီးပါပြီ' : 'Unit added', name.trim());
    } catch (err: any) {
      showWarning(language === 'my' ? 'မအောင်မြင်ပါ' : 'Failed', err?.message || 'Error');
    }
  };

  const handleDelete = async (id: string, unitName: string) => {
    const ok = await confirmDialog(
      language === 'my' ? 'Unit ဖျက်မည်လား?' : 'Delete unit?',
      unitName,
      language === 'my' ? 'ဖျက်မည်' : 'Delete',
      language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'
    );
    if (!ok) return;
    await deleteUnit(id);
    showSuccess(language === 'my' ? 'ဖျက်ပြီးပါပြီ' : 'Deleted');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-6 bg-white border-b border-slate-200 shrink-0">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Ruler className="w-6 h-6 text-teal-600" />
          {t('setup.units_title')}
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t('setup.units_hint')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={language === 'my' ? 'ဥပမာ - carton / အထုပ်' : 'e.g. carton'}
            className="flex-1 px-3 py-2.5 border rounded-xl text-sm"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer hover:bg-teal-500"
          >
            <Plus className="w-4 h-4" />
            {language === 'my' ? 'ထည့်မည်' : 'Add'}
          </button>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100">
          {units.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              {language === 'my' ? 'Unit မရှိသေးပါ' : 'No units yet'}
            </div>
          ) : (
            units.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold text-slate-900 font-mono text-sm">{u.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(u.id, u.name)}
                  className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
