// src/types/auth.ts
export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;      // Match database schema
  last_name: string;       // Match database schema
  role: 'administrator' | 'trial_secretary';
  club_name?: string;      // Match database schema
  phone?: string;          // Match database schema
  is_active: boolean;      // Match database schema
  created_at?: string;
  updated_at?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface AuthContextType extends AuthState {
  signOut: () => void;
  getFullName: () => string;
  getDisplayInfo: () => {
    fullName: string;
    role: string;
    clubName: string;
    email: string;
    isActive: boolean;
  } | null;
}