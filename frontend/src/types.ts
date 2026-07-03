export type RoleName = 'ADMIN' | 'SUPERVISOR' | 'CONSULTA';

export type AssetStatus =
  | 'ACTIVO'
  | 'EN_MANTENIMIENTO'
  | 'EN_REPARACION'
  | 'DADO_DE_BAJA'
  | 'EXTRAVIADO';

export interface Role {
  id: string;
  name: RoleName;
  description?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  role: Role;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  location?: string;
  isActive: boolean;
}

export interface Responsable {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  position?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  depreciationRate: number;
}

export interface Asset {
  id: string;
  code: string;
  description: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  value: number;
  purchaseDate?: string;
  status: AssetStatus;
  observations?: string;
  category?: Category;
  department?: Department;
  responsable?: Responsable;
  createdAt: string;
  updatedAt: string;
}

export interface AssetPage {
  items: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetMovement {
  id: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  user?: User;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  user?: User;
  createdAt: string;
}

export interface CountByLabel {
  label: string;
  count: number;
  value: number;
}

export interface DashboardStats {
  totalAssets: number;
  activeAssets: number;
  retiredAssets: number;
  maintenanceAssets: number;
  totalValue: number;
  totalDepartments: number;
  totalCategories: number;
  byDepartment: CountByLabel[];
  byCategory: CountByLabel[];
  byStatus: CountByLabel[];
  monthlyMovements: { month: string; count: number }[];
}

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  ACTIVO: 'Activo',
  EN_MANTENIMIENTO: 'En mantenimiento',
  EN_REPARACION: 'En reparacion',
  DADO_DE_BAJA: 'Dado de baja',
  EXTRAVIADO: 'Extraviado',
};
