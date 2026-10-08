export interface NavItem {
  label: string;
  href: string;
  iconName: string;
  badge?: number | string;
  description?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
