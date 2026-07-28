/**
 * @fintranact/types — shared types & DTOs used by backend, web, and desktop.
 */

// ---- Identity & access ----
export type ID = string;

export interface Company {
  id: ID;
  name: string;
  legalName: string;
  createdAt: string;
}

export interface Branch {
  id: ID;
  companyId: ID;
  name: string;
  gstin: string | null;
  stateCode: string | null;
}

export interface User {
  id: ID;
  email: string;
  name: string;
  status: 'active' | 'suspended';
  mfaEnabled: boolean;
}

/** Roles shipped by default (see PRD §7.2.1). Custom roles are allowed. */
export type RoleKey =
  | 'admin'
  | 'controller'
  | 'accountant'
  | 'operator'
  | 'supervisor'
  | 'payroll'
  | 'compliance'
  | 'auditor'
  | 'employee';

/** Granular permission tuple `{module}:{action}` (see PRD §7.2). */
export type Permission = string; // e.g. "voucher:create", "payment:approve"

export interface Role {
  id: ID;
  key: RoleKey | string;
  name: string;
  permissions: Permission[];
}

/** A user's role scoped to a company/branch. */
export interface UserRoleAssignment {
  userId: ID;
  companyId: ID;
  branchId: ID | null;
  roleId: ID;
}

// ---- Auth ----
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number; // seconds
}

export interface SessionContext {
  userId: ID;
  companyId: ID;
  branchId: ID | null;
  roles: string[];
  permissions: Permission[];
}

// ---- API envelope (see PRD §10.1) ----
export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  meta?: Record<string, unknown>;
  errors?: ApiError[];
}
