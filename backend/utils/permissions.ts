export type Role = 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'CASHIER' | 'INVENTORY_CLERK';

export interface Permissions {
  canSell: boolean;
  canSellCredit: boolean;
  canReturnSale: boolean;
  canManageInventory: boolean;
  canTransferStock?: boolean;
  canDistributeStock?: boolean;
  canManageSuppliers: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canSwitchBranch: boolean;
  canViewSystemLog?: boolean;
}

export const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  SUPER_ADMIN: {
    canSell: true,
    canSellCredit: true,
    canReturnSale: true,
    canManageInventory: true,
    canDistributeStock: true,
    canTransferStock: true,
    canManageSuppliers: true,
    canViewReports: true,
    canManageUsers: true,
    canSwitchBranch: true,
    canViewSystemLog: true,
  },
  BRANCH_MANAGER: {
    canSell: true,
    canSellCredit: true,
    canReturnSale: true,
    canManageInventory: true,
    canDistributeStock: true,
    canTransferStock: false,
    canManageSuppliers: true,
    canViewReports: true,
    canManageUsers: true,
    canSwitchBranch: false,
    canViewSystemLog: false,
  },
  CASHIER: {
    canSell: true,
    canSellCredit: true,
    canReturnSale: true,
    canManageInventory: false,
    canDistributeStock: false,
    canTransferStock: false,
    canManageSuppliers: false,
    canViewReports: false,
    canManageUsers: false,
    canSwitchBranch: false,
    canViewSystemLog: false,
  },
  INVENTORY_CLERK: {
    canSell: false,
    canSellCredit: false,
    canReturnSale: false,
    canManageInventory: true,
    canDistributeStock: true,
    canTransferStock: false,
    canManageSuppliers: true,
    canViewReports: true,
    canManageUsers: false,
    canSwitchBranch: false,
    canViewSystemLog: false,
  },
};

export function permissionsForRole(role: string): Permissions {
  return ROLE_PERMISSIONS[(role as Role) || 'CASHIER'] || ROLE_PERMISSIONS.CASHIER;
}
