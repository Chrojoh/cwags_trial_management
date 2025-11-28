// src/types/navigation.ts
// Navigation-specific types for the C-WAGS Trial Management System

export interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: string;
  children?: NavigationItem[];
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
color: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  requiredPermission?: string;
}

export interface UserMenuAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'destructive';
  separator?: boolean;
}

export interface NavigationState {
  currentPath: string;
  breadcrumbs: BreadcrumbItem[];
  pageTitle?: string;
  sidebarOpen: boolean;
}

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  navigation: NavigationItem[];
  currentPath: string;
}

export interface SidebarProps {
  navigation: NavigationItem[];
  currentPath: string;
  quickStats?: {
    label: string;
    value: string | number;
    color?: 'default' | 'warning' | 'success' | 'error';
  }[];
}

export interface HeaderProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    club_name?: string;
  };
  notifications?: {
    count: number;
    items: Notification[];
  };
  onMenuClick: () => void;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Layout configuration
export interface LayoutConfig {
  showSidebar: boolean;
  showBreadcrumbs: boolean;
  showPageTitle: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// Route metadata for navigation
export interface RouteMetadata {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  requiredPermissions?: string[];
  layout?: LayoutConfig;
  description?: string;
}