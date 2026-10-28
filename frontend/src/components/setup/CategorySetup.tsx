import React, { useState } from 'react';
import { Tags, Plus, Trash2, Pencil, Check, X, Palette } from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { useLanguage } from '../../context/LanguageContext';
import { showSuccess, showWarning, confirmDialog } from '../../utils/swal';

const COLOR_PRESETS = ['#0f766e', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#EC4899'];

export const CategorySetup: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory, setActiveTab } = usePOS();
  const { language, t } = useLanguage();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addCategory({ name: name.trim(), color });
      setName('');
      showSuccess(
        language === 'my' ? 'Category ထည့်ပြီးပါပြီ' : 'Category added',
        name.trim()
      );
    } catch (err: any) {
      showWarning(language === 'my' ? 'မအောင်မြင်ပါ' : 'Failed', err?.message || 'Error');
    }
  };

  const startEdit = (id: string, currentName: string, currentColor: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditColor(currentColor || COLOR_PRESETS[0]);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCategory(editingId, { name: editName.trim(), color: editColor });
    setEditingId(null);
    showSuccess(language === 'my' ? 'သိမ်းဆည်းပြီးပါပြီ' : 'Saved');
  };

  const handleDelete = async (id: string, catName: string) => {
    const ok = await confirmDialog(
      language === 'my' ? 'Category ဖျက်မည်လား?' : 'Delete category?',
      catName,
      language === 'my' ? 'ဖျက်မည်' : 'Delete',
      language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'
    );
    if (!ok) return;
    try {
      await deleteCategory(id);
      showSuccess(language === 'my' ? 'ဖျက်ပြီးပါပြီ' : 'Deleted');
    } catch (err: any) {
      showWarning(language === 'my' ? 'မဖျက်နိုင်ပါ' : 'Cannot delete', err?.message || 'In use');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-6 bg-white border-b border-slate-200 shrink-0">
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Tags className="w-6 h-6 text-teal-600" />
          {t('setup.cat_title')}
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{t('setup.cat_hint')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
        >
          <div className="text-xs font-bold text-slate-700">
            {language === 'my' ? 'Category အသစ် ထည့်မည်' : 'Add new category'}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={language === 'my' ? 'ဥပမာ - အချိုရည်များ' : 'e.g. Beverages'}
              className="flex-1 px-3 py-2.5 border rounded-xl text-sm"
              required
            />
            <div className="flex items-center gap-1.5">
              <Palette className="w-4 h-4 text-slate-400" />
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-lg border-2 cursor-pointer ${
                    color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold cursor-pointer hover:bg-teal-500"
            >
              <Plus className="w-4 h-4" />
              {language === 'my' ? 'ထည့်မည်' : 'Add'}
            </button>
          </div>
        </form>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="py-3 px-4">Color</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-slate-400 text-xs">
                    {language === 'my' ? 'Category မရှိသေးပါ' : 'No categories yet'}
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span
                        className="inline-block w-5 h-5 rounded-md border border-slate-200"
                        style={{ backgroundColor: cat.color }}
                      />
                    </td>
                    <td className="py-3 px-4">
                      {editingId === cat.id ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="px-2 py-1.5 border rounded-lg text-xs flex-1"
                          />
                          <div className="flex gap-1">
                            {COLOR_PRESETS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditColor(c)}
                                className={`w-5 h-5 rounded border cursor-pointer ${
                                  editColor === c ? 'ring-2 ring-slate-800' : ''
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-900 leading-relaxed">{cat.name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        {editingId === cat.id ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(cat.id, cat.name, cat.color)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-teal-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cat.id, cat.name)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className="text-xs font-bold text-teal-600 hover:underline cursor-pointer"
        >
          {language === 'my' ? '→ Inventory သို့ သွား၍ ကုန်ပစ္စည်း ထည့်မည်' : '→ Go to Inventory to add products'}
        </button>
      </div>
    </div>
  );
};
