import React, { useState, useEffect } from 'react';
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
  Shield,
} from 'lucide-react';
import { alertService } from '../../services/alertService';

export const CaretakerShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openAlertCount, setOpenAlertCount] = useState<number>(0);
  const { t } = useLanguage();

  useEffect(() => {
    async function fetchCounts() {
      const res = await alertService.getAlerts(undefined, 'OPEN');
      setOpenAlertCount(res.data?.length || 0);
    }
    fetchCounts();
  }, []);

  const caretakerNavItems = [
    { label: t('nav.dashboard', 'Overview'), to: '/caretaker/dashboard', icon: LayoutDashboard, exact: true },
    { label: t('nav.olderAdults', 'Monitored Adults'), to: '/caretaker/adults', icon: Users },
    { label: t('nav.alerts', 'Active Alerts'), to: '/caretaker/alerts', icon: Bell, badge: openAlertCount > 0 ? openAlertCount : undefined },
    { label: t('nav.history', 'Care History'), to: '/caretaker/history', icon: Clock },
    { label: t('nav.profile', 'Caretaker Profile'), to: '/caretaker/profile', icon: UserCheck },
    { label: t('nav.settings', 'Settings'), to: '/caretaker/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9F6] text-nest-ink font-sans">
      <a
        href="#caretaker-main-content"
        className="sr-only sr-only-focusable z-50 p-3 bg-olive-700 text-white font-bold"
      >
        Skip to main content
      </a>

      {/* Top Header with distinctive Caretaker Portal Sign */}
      <header className="bg-white border-b-2 border-olive-200/80 sticky top-0 z-30 shadow-tactile-sm">
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
            <Logo size="large" to="/caretaker/dashboard" />
            
            {/* Distinct Caretaker Portal Sign / Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-tactile bg-olive-50 border border-olive-300 text-olive-900 shadow-xs">
              <Shield className="w-4 h-4 text-olive-700" />
              <span className="text-xs font-extrabold uppercase tracking-wider">
                {t('portal.caretakerSpace', 'Caretaker Portal')}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-olive-500 animate-pulse ml-0.5" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="header" />
            <AccessibilityControls />
            <Link
              to="/caretaker/alerts"
              className="relative p-2 rounded-tactile hover:bg-olive-50 text-nest-ink transition-colors border border-transparent hover:border-olive-200"
              aria-label="Alerts"
            >
              <Bell className="w-5 h-5 text-olive-800" />
              {openAlertCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amberwarm-500 ring-2 ring-white" />
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Body with sidebar + main content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col lg:flex-row gap-8">
        {/* Desktop Sidebar Navigation */}
        <aside
          className={`lg:w-64 shrink-0 ${
            mobileMenuOpen ? 'block' : 'hidden lg:block'
          }`}
          aria-label="Caretaker sidebar navigation"
        >
          <div className="bg-white border-2 border-olive-200/70 rounded-tactile-xl p-4 shadow-tactile-sm sticky top-24 space-y-4">
            <div className="px-3 py-2 border-b border-nest-border/70 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-olive-800">
                Caretaker Hub
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-olive-100 text-olive-800">
                Connected
              </span>
            </div>

            <nav className="space-y-1">
              {caretakerNavItems.map(item => {
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
                          ? 'bg-olive-100/80 text-olive-900 border-2 border-olive-400 font-bold shadow-tactile-sm'
                          : 'text-nest-ink hover:bg-nest-surface-subtle hover:text-nest-ink border-2 border-transparent'
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

            <div className="pt-4 border-t border-nest-border/80">
              <div className="p-3.5 rounded-tactile bg-olive-50/60 border border-olive-200 text-xs text-nest-ink-muted space-y-1.5">
                <div className="font-bold text-olive-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-olive-700" />
                  <span>Care Oversight Engine</span>
                </div>
                <p className="text-[11px] leading-relaxed text-nest-ink/80">
                  Real-time status updates and medication activity alerts for your connected older adults.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main id="caretaker-main-content" className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
