import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Plus,
  Search,
  KeyRound,
  Building2,
  Lock,
  Unlock,
  Check,
  X,
  Edit2,
  Sliders,
  Shield,
  UserPlus,
  Trash2,
  Key,
  Upload,
} from 'lucide-react';
import { usePOS } from '../../context/POSContext';
import { CashierUser, UserRole, UserPermissions } from '../../types/pos';
import { useLanguage } from '../../context/LanguageContext';
import { Pagination } from '../common/Pagination';
import { SearchableSelect } from '../common/SearchableSelect';
import { showSuccess, showWarning, confirmDialog, showToast } from '../../utils/swal';
import { resolveAvatar } from '../../utils/media';

export const UserManagement: React.FC = () => {
  const {
    users,
    currentUser,
    branches,
    addNewUser,
    updateUser,
    deleteUser,
    canUserPerformAction,
  } = usePOS();
  const { language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<CashierUser | null>(null);

  // Form state for creating new user
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [pinCode, setPinCode] = useState('1234');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [assignedBranchId, setAssignedBranchId] = useState<string>('b-01');
  const [newUserAvatar, setNewUserAvatar] = useState('');
  const [editAvatar, setEditAvatar] = useState('');

  // Edit user state
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Permissions state for new/editing user
  const [permissions, setPermissions] = useState<UserPermissions>({
    canSell: true,
    canSellCredit: false,
    canReturnSale: false,
    canManageInventory: false,
    canDistributeStock: false,
    canManageSuppliers: false,
    canViewReports: false,
    canManageUsers: false,
    canSwitchBranch: false,
    canViewSystemLog: false,
  });

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (newRole === 'SUPER_ADMIN') {
      setPermissions({
        canSell: true,
        canSellCredit: true,
        canReturnSale: true,
        canManageInventory: true,
        canDistributeStock: true,
        canManageSuppliers: true,
        canViewReports: true,
        canManageUsers: true,
        canSwitchBranch: true,
        canViewSystemLog: true,
      });
    } else if (newRole === 'BRANCH_MANAGER') {
      setPermissions({
        canSell: true,
        canSellCredit: true,
        canReturnSale: true,
        canManageInventory: true,
        canDistributeStock: true,
        canManageSuppliers: true,
        canViewReports: true,
        canManageUsers: false,
        canSwitchBranch: false,
        canViewSystemLog: false,
      });
    } else if (newRole === 'INVENTORY_CLERK') {
      setPermissions({
        canSell: false,
        canSellCredit: false,
        canReturnSale: false,
        canManageInventory: true,
        canDistributeStock: true,
        canManageSuppliers: true,
        canViewReports: false,
        canManageUsers: false,
        canSwitchBranch: true,
        canViewSystemLog: false,
      });
    } else {
      // CASHIER
      setPermissions({
        canSell: true,
        canSellCredit: false,
        canReturnSale: false,
        canManageInventory: false,
        canDistributeStock: false,
        canManageSuppliers: false,
        canViewReports: false,
        canManageUsers: false,
        canSwitchBranch: false,
        canViewSystemLog: false,
      });
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !fullName.trim() || !password) {
      showWarning(
        language === 'my' ? 'အချက်အလက် မပြည့်စုံပါ' : 'Missing Information',
        language === 'my' ? 'အမည်၊ အကောင့် Username နှင့် စကားဝှက် ဖြည့်ပေးပါ' : 'Please provide full name, username and password.'
      );
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      showWarning(
        language === 'my' ? 'အသုံးပြုသူအမည် ထပ်နေပါသည်' : 'Username Taken',
        language === 'my' ? `"${cleanUsername}" ဖြင့် အကောင့်ရှိပြီးဖြစ်ပါသည်။ အခြား Username ရွေးပါ။` : `The username "${cleanUsername}" is already taken.`
      );
      return;
    }

    addNewUser({
      username: cleanUsername,
      fullName: fullName.trim(),
      email: email || `${cleanUsername}@omnipos.com`,
      avatar: newUserAvatar || '',
      password,
      pinCode: pinCode || '1234',
      role,
      branchId: role === 'SUPER_ADMIN' ? null : assignedBranchId,
      permissions,
      isActive: true,
    });

    showSuccess(
      language === 'my' ? 'အကောင့်အသစ် ဖွင့်လှစ်ပြီးပါပြီ' : 'User Account Created',
      `${fullName.trim()} (@${cleanUsername})`
    );

    setIsAddUserModalOpen(false);
    setUsername('');
    setFullName('');
    setEmail('');
    setPassword('password123');
    setPinCode('1234');
    setRole('CASHIER');
    setNewUserAvatar('');
  };

  const handleSaveEditPermissions = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updates: Partial<CashierUser> = {
      fullName: editFullName,
      permissions: { ...permissions },
      role,
      branchId: role === 'SUPER_ADMIN' ? null : assignedBranchId,
      avatar: editAvatar || '',
    };

    if (editPassword.trim()) {
      updates.password = editPassword.trim();
    }

    updateUser(editingUser.id, updates);
    showSuccess(
      language === 'my' ? 'အကောင့်နှင့် လုပ်ပိုင်ခွင့်များ သိမ်းဆည်းပြီးပါပြီ' : 'Permissions Updated',
      `${editingUser.fullName} (@${editingUser.username})`
    );
    setEditingUser(null);
  };

  const openEditModal = (user: CashierUser) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditPassword('');
    setEditAvatar(user.avatar || '');
    setRole(user.role);
    setAssignedBranchId(user.branchId || 'b-01');
    setPermissions(
      user.permissions || {
        canSell: true,
        canSellCredit: false,
        canReturnSale: false,
        canManageInventory: false,
        canDistributeStock: false,
        canManageSuppliers: false,
        canViewReports: false,
        canManageUsers: false,
        canSwitchBranch: false,
        canViewSystemLog: false,
      }
    );
  };

  const handleAvatarFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'new' | 'edit'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showWarning(
        language === 'my' ? 'ဖိုင်ဆိုဒ် ကြီးလွန်းပါသည်' : 'File Too Large',
        language === 'my' ? '၅ MB အောက် ဓာတ်ပုံဖိုင်ကိုသာ ရွေးပါ' : 'Please select an image under 5MB'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        if (target === 'new') setNewUserAvatar(dataUrl);
        else setEditAvatar(dataUrl);
        showToast(language === 'my' ? 'ဓာတ်ပုံ တင်သွင်းပြီးပါပြီ' : 'Photo loaded');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteUser = async (user: CashierUser) => {
    if (user.id === currentUser.id) {
      showWarning(
        language === 'my' ? 'လုပ်ဆောင်၍ မရပါ' : 'Action Denied',
        language === 'my' ? 'လက်ရှိသုံးနေသော အကောင့်ကို ဖျက်၍မရပါ' : 'You cannot delete your own active account.'
      );
      return;
    }
    if (user.role === 'SUPER_ADMIN') {
      showWarning(
        language === 'my' ? 'လုပ်ဆောင်၍ မရပါ' : 'Action Denied',
        language === 'my' ? 'Super Admin အကောင့်ကို ဖျက်၍မရပါ' : 'Super Admin account cannot be deleted.'
      );
      return;
    }

    const confirmed = await confirmDialog(
      language === 'my' ? 'အကောင့် ဖျက်မည်မှာ သေချာပါသလား?' : 'Delete User Account?',
      language === 'my'
        ? `အသုံးပြုသူ "${user.fullName} (@${user.username})" ကို စနစ်ထဲမှ ဖျက်ပစ်ပါမည်။`
        : `Are you sure you want to delete "${user.fullName} (@${user.username})"?`,
      language === 'my' ? 'ဖျက်မည်' : 'Yes, Delete',
      language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'
    );

    if (confirmed) {
      deleteUser(user.id);
      showSuccess(
        language === 'my' ? 'အကောင့် ဖျက်ပြီးပါပြီ' : 'User Deleted',
        `${user.fullName} (@${user.username})`
      );
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const permissionKeys: { key: keyof UserPermissions; labelEn: string; labelMy: string }[] = [
    { key: 'canSell', labelEn: 'POS Cashier Sales', labelMy: 'အရောင်းပြုလုပ်ခွင့်' },
    { key: 'canSellCredit', labelEn: 'Sell on Credit / Debt', labelMy: 'အကြွေးရောင်းချခွင့်' },
    { key: 'canReturnSale', labelEn: 'Process Sale Returns', labelMy: 'ပစ္စည်းပြန်သွင်း/ငွေပြန်အမ်းခွင့်' },
    { key: 'canManageInventory', labelEn: 'Inventory & Restock', labelMy: 'စတော့စာရင်း ပြင်ဆင်ခွင့်' },
    { key: 'canDistributeStock', labelEn: 'Distribute from Main Store', labelMy: 'Main Store မှ ဆိုင်ခွဲများသို့ ဖြန့်ဝေခွင့်' },
    { key: 'canManageSuppliers', labelEn: 'Supplier Payables', labelMy: 'Supplier အကြွေးရှင်းခွင့်' },
    { key: 'canViewReports', labelEn: 'Sales Reports & Analytics', labelMy: 'အရောင်းစာရင်း ကြည့်ရှုခွင့်' },
    { key: 'canManageUsers', labelEn: 'Manage User Accounts', labelMy: 'အကောင့်များ စီမံခွင့်' },
    { key: 'canSwitchBranch', labelEn: 'Switch All Branches', labelMy: 'ဆိုင်ခွဲအားလုံး ဝင်ရောက်ခွင့်' },
    { key: 'canViewSystemLog', labelEn: 'View System Log History', labelMy: 'System Log History ကြည့်ခွင့်' },
  ];

  return (
    <div id="user-management-view" className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-white border-b border-slate-200 shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-teal-600" />
              <span>{language === 'my' ? 'အသုံးပြုသူ အကောင့်များနှင့် အခွင့်အရေးများ (RBAC)' : 'User Accounts & Role Permissions'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'my'
                ? 'ဆိုင်ခွဲအလိုက် Cashier, Manager နှင့် Admin အကောင့်များ စကားဝှက်ဖြင့် ဖောက်ပေးခြင်းနှင့် အခွင့်အရေး စီမံခြင်း'
                : 'Manage user logins, passwords, role assignments, and granular branch permissions.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="create-user-button"
              onClick={() => {
                handleRoleChange('CASHIER');
                setIsAddUserModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/25 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{language === 'my' ? 'အသုံးပြုသူအသစ် ဖောက်မည်' : 'Create User Account'}</span>
            </button>
          </div>
        </div>

        {/* Current Active User Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={resolveAvatar(currentUser.avatar)}
              alt={currentUser.fullName}
              className="w-10 h-10 rounded-xl object-cover border border-teal-400/40 shadow-md bg-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{currentUser.fullName}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/30 text-teal-300 border border-teal-500/40">
                  {currentUser.role}
                </span>
                <span className="text-[11px] text-emerald-400 font-mono">● Active Session</span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as @{currentUser.username} • Branch: {currentUser.branchId ? branches.find((b) => b.id === currentUser.branchId)?.name : 'All Store Branches'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <Key className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-400">Username:</span>
              <span className="font-mono text-white font-bold">@{currentUser.username}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={language === 'my' ? 'အမည်၊ အကောင့်အမည်၊ ရာထူး ရှာဖွေရန်...' : 'Search user by name, username or role...'}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl focus:outline-hidden text-slate-900"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Login Password</th>
                <th className="py-3 px-4">Permissions Overview</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No user accounts match your search.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                const assignedBranch = branches.find((b) => b.id === u.branchId);
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-teal-50/40' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={resolveAvatar(u.avatar)}
                          alt={u.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-white shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-[11px] text-slate-400">@{u.username} • {u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : u.role === 'BRANCH_MANAGER'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : u.role === 'INVENTORY_CLERK'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}
                      >
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {u.role === 'SUPER_ADMIN' || !u.branchId ? (
                        <span className="font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded">
                          All Branches (အားလုံး)
                        </span>
                      ) : (
                        <div className="font-semibold text-slate-800">
                          {assignedBranch?.name || u.branchId}
                          <div className="text-[10px] text-slate-400">{assignedBranch?.city}</div>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 text-[11px]">
                        ••••••••
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.permissions?.canSell && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Sell
                          </span>
                        )}
                        {u.permissions?.canSellCredit && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Credit
                          </span>
                        )}
                        {u.permissions?.canReturnSale && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Returns
                          </span>
                        )}
                        {u.permissions?.canManageInventory && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                            Stock
                          </span>
                        )}
                        {u.permissions?.canDistributeStock && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Distribute
                          </span>
                        )}
                        {u.permissions?.canManageSuppliers && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                            Suppliers
                          </span>
                        )}
                        {u.permissions?.canViewReports && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                            Reports
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Active
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Edit Permissions & Password"
                        >
                          <Sliders className="w-3.5 h-3.5 text-teal-600" />
                        </button>

                        {!isCurrent && u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>

          {filteredUsers.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              pageSizeOptions={[5, 10, 20]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>

      {/* Edit Permissions Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  {language === 'my' ? 'အခွင့်အရေးနှင့် စကားဝှက် ပြင်ဆင်မည်' : 'Edit User Permissions & Credentials'}
                </h4>
                <p className="text-xs text-slate-500">User: {editingUser.fullName} (@{editingUser.username})</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPermissions} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                <img
                  src={resolveAvatar(editAvatar)}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 bg-white"
                />
                <div className="flex-1 min-w-0">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold border border-teal-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'ဓာတ်ပုံ တင်မည်' : 'Upload photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarFileUpload(e, 'edit')}
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'my'
                      ? 'မတင်ရင် default logo သုံးပါမည် (URL မရပါ)'
                      : 'Default logo if empty (no URL upload)'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    New Password <span className="text-[10px] text-slate-400 font-normal">(Leave blank to keep)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="New password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">User Role</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="CASHIER">Cashier (အရောင်း)</option>
                    <option value="BRANCH_MANAGER">Branch Manager (ဆိုင်ခွဲမန်နေဂျာ)</option>
                    <option value="INVENTORY_CLERK">Inventory / Warehouse Clerk (စတော့တာဝန်ခံ)</option>
                    <option value="SUPER_ADMIN">Super Admin (ဆိုင်ခွဲအားလုံး စီမံခွင့်)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Branch</label>
                  <SearchableSelect
                    value={assignedBranchId}
                    onChange={setAssignedBranchId}
                    disabled={role === 'SUPER_ADMIN'}
                    options={branches.map((b) => ({
                      value: b.id,
                      label: `${b.name} (${b.city})`,
                    }))}
                  />
                </div>
              </div>

              {/* Granular Permissions Matrix */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  {language === 'my' ? 'ခွင့်ပြုချက် အသေးစိတ်များ (Granular Action Matrix)' : 'Granular Permissions Matrix'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-60 overflow-y-auto">
                  {permissionKeys.map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!permissions[item.key]}
                        onChange={(e) =>
                          setPermissions((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="rounded text-teal-600 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        {language === 'my' ? item.labelMy : item.labelEn}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-base font-bold text-slate-900">
                {language === 'my' ? 'အသုံးပြုသူ အကောင့်အသစ် ဖွင့်မည်' : 'Create New User Account'}
              </h4>
              <button onClick={() => setIsAddUserModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                <img
                  src={resolveAvatar(newUserAvatar)}
                  alt="Avatar preview"
                  className="w-14 h-14 rounded-full object-cover border border-slate-200 bg-white"
                />
                <div className="flex-1 min-w-0">
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold border border-teal-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'ဓာတ်ပုံ တင်မည်' : 'Upload photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAvatarFileUpload(e, 'new')}
                    />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {language === 'my'
                      ? 'ကွန်ပျူတာမှ ပုံတင်ပါ။ မတင်ရင် default logo သုံးမည်။'
                      : 'Upload from computer. Default logo if skipped.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ko Aung Kyaw"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Username (Login)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. aungkyaw"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Password (Login)</label>
                  <input
                    type="password"
                    required
                    placeholder="e.g. password123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="user@omnipos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  >
                    <option value="CASHIER">Cashier (အရောင်း)</option>
                    <option value="BRANCH_MANAGER">Branch Manager (မန်နေဂျာ)</option>
                    <option value="INVENTORY_CLERK">Warehouse Clerk (စတော့တာဝန်ခံ)</option>
                    <option value="SUPER_ADMIN">Super Admin (အားလုံးစီမံခွင့်)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Branch Assignment</label>
                  <SearchableSelect
                    value={assignedBranchId}
                    onChange={setAssignedBranchId}
                    disabled={role === 'SUPER_ADMIN'}
                    options={branches.map((b) => ({
                      value: b.id,
                      label: b.name,
                    }))}
                  />
                </div>
              </div>

              {/* Permissions checkboxes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Permissions Assigned</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-40 overflow-y-auto">
                  {permissionKeys.map((item) => (
                    <label key={item.key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!permissions[item.key]}
                        onChange={(e) =>
                          setPermissions((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        className="rounded text-teal-600 cursor-pointer"
                      />
                      <span>{language === 'my' ? item.labelMy : item.labelEn}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
