// src/lib/permissions.ts
import { ROLE_PERMISSIONS } from './constants';
import type { User } from '@/types/auth';
import type { Permission } from './constants';

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role];
  return userPermissions?.includes(permission) || false;
}

export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some(p => hasPermission(user, p));
}

export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every(p => hasPermission(user, p));
}