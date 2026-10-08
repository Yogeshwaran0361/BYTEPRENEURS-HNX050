import React, { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Logo } from '../shared/Logo';
import { AccessibilityControls } from '../shared/AccessibilityControls';
import { LanguageSelector } from '../shared/LanguageSelector';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  Users,
  Bell,
  Clock,
  UserCheck,
  Menu,
  X,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { alertService } from '../../services/alertService';

export const CaregiverShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAlertCount, setOpenAlertCount] = useState<number>(0);
  const { t } = useLanguage();

  React.useEffect(() => {
    async function fetchCounts() {
      const res = await alertService.getAlerts(undefined, 'OPEN');
      setOpenAlertCount(res.data?.length || 0);
    }
    fetchCounts();
  }, []);

  const caregiverNavItems = [
    { label: t('nav.dashboard', 'Dashboard'), to: '/caregiver/dashboard', icon: LayoutDashboard, exact: true },
    { label: t('nav.olderAdults', 'Older Adults'), to: '/caregiver/adults', icon: Users },
    { label: t('nav.alerts', 'Alerts'), to: '/caregiver/alerts', icon: Bell, badge: openAlertCount > 0 ? openAlertCount : undefined },
    { label: t('nav.history', 'History'), to: '/caregiver/history', icon: Clock },
    { label: t('nav.profile', 'Profile'), to: '/caregiver/profile', icon: UserCheck },
    { label: t('nav.settings', 'Settings'), to: '/caregiver/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-nest-bg text-nest-ink font-sans">
      <a
        href="#caregiver-main-content"
        className="sr-only sr-only-focusable z-50 p-3 bg-olive-600 text-white font-bold"
      >
        {t('nav.skipToContent', 'Skip to main content')}
      </a>

      {/* Top Header */}
      <header className="bg-nest-surface border-b border-nest-border sticky top-0 z-30 shadow-tactile-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-tactile text-nest-ink hover:bg-nest-surface-subtle border border-nest-border"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Logo size="large" to="/caregiver/dashboard" />
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-olive-50 text-olive-700 border border-olive-200">
              {t('portal.caregiverSpace', 'Caregiver Portal')}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="header" />
            <AccessibilityControls />
            <Link
              to="/caregiver/alerts"
              className="relative p-2 rounded-tactile hover:bg-nest-surface-subtle text-nest-ink transition-colors"
              aria-label="Alerts"
            >
              <Bell className="w-5 h-5" />
              {openAlertCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amberwarm-500 ring-2 ring-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Body with responsive layout */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col lg:flex-row gap-8">
        {/* Desktop Sidebar Navigation */}
        <aside
          className={`lg:w-64 shrink-0 ${
            mobileMenuOpen ? 'block' : 'hidden lg:block'
          }`}
          aria-label="Caregiver sidebar navigation"
        >
          <div className="bg-nest-surface border border-nest-border rounded-tactile-lg p-4 shadow-tactile-sm sticky top-24">
            <div className="text-xs font-bold uppercase tracking-wider text-nest-ink-muted px-3 py-2">
              Caregiver Navigation
            </div>
            <nav className="space-y-1 mt-1">
              {caregiverNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-tactile text-base font-semibold transition-colors ${
                        isActive
                          ? 'bg-olive-50 text-olive-800 border border-olive-200'
                          : 'text-nest-ink hover:bg-nest-surface-subtle hover:text-nest-ink border border-transparent'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amberwarm-100 text-amberwarm-800 border border-amberwarm-300">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-8 pt-4 border-t border-nest-border">
              <div className="p-3 rounded-tactile bg-nest-surface-subtle border border-nest-border text-xs text-nest-ink-muted space-y-1">
                <div className="font-bold text-nest-ink flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-terracotta-500" />
                  <span>Care Support Focus</span>
                </div>
                <p>Prioritizing delayed or unconfirmed routines across all connected adults.</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main id="caregiver-main-content" className="flex-1 min-w-0 pb-32 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Caregiver Focus: 5 destinations with safe area insets) */}
      <nav
        aria-label="Caregiver mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-nest-surface border-t-2 border-nest-border shadow-tactile-lg safe-bottom-nav"
      >
        <div className="grid grid-cols-5 h-20 max-w-lg mx-auto">
          {caregiverNavItems.slice(0, 5).map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 text-center select-none transition-colors touch-target-lg relative ${
                    isActive
                      ? 'text-olive-800 font-bold bg-olive-50/80 border-t-3 border-olive-600 -mt-[2px]'
                      : 'text-nest-ink-muted hover:text-nest-ink'
                  }`
                }
              >
                <div className="relative">
                  <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 text-[10px] font-extrabold rounded-full bg-amberwarm-500 text-white leading-tight">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold tracking-tight leading-tight truncate max-w-[64px]">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
