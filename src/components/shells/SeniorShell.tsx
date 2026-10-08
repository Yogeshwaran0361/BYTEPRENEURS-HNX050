import React from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Logo } from '../shared/Logo';
import { AccessibilityControls } from '../shared/AccessibilityControls';
import { LanguageSelector } from '../shared/LanguageSelector';
import { useLanguage } from '../../context/LanguageContext';
import {
  Home,
  Pill,
  Clock,
  User,
  Settings,
  HeartHandshake,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { connectionService } from '../../services/connectionService';
import { seniorService } from '../../services/seniorService';

export const SeniorShell: React.FC = () => {
  const { profile } = useAuth();
  const [caregiverInfo, setCaregiverInfo] = React.useState<{
    name: string;
    firstName: string;
    relationship: string;
    phone: string;
    isConnected: boolean;
  }>({
    name: '',
    firstName: 'Caregiver',
    relationship: '',
    phone: '',
    isConnected: false,
  });

  React.useEffect(() => {
    async function loadCaregiver() {
      try {
        const [connRes, adultRes] = await Promise.all([
          connectionService.getConnectionsForSenior(),
          seniorService.getProfile(),
        ]);
        const conns = connRes.data || [];
        const adult = adultRes.data;

        if (conns.length > 0 && conns[0].caregiver) {
          const cg = conns[0].caregiver;
          const full = cg.profile?.full_name || cg.relationship_type || 'Caregiver';
          const phone = cg.phone || cg.profile?.phone || adult?.emergency_contact_phone || adult?.emergency_phone || '';
          setCaregiverInfo({
            name: full,
            firstName: full.split(' ')[0],
            relationship: cg.relationship_type || 'Caregiver',
            phone,
            isConnected: true,
          });
        } else if (adult?.emergency_contact_name) {
          const full = adult.emergency_contact_name;
          const phone = adult.emergency_contact_phone || adult.emergency_phone || '';
          setCaregiverInfo({
            name: full,
            firstName: full.split(' ')[0],
            relationship: adult.emergency_contact_relationship || 'Emergency Contact',
            phone,
            isConnected: true,
          });
        }
      } catch (e) {
        // non-blocking
      }
    }
    loadCaregiver();
  }, []);

  const { t } = useLanguage();

  const seniorNavItems = [
    { label: t('nav.home', 'Home'), to: '/senior/dashboard', icon: Home, exact: true },
    { label: t('nav.medicines', 'Medicines'), to: '/senior/medicines', icon: Pill },
    { label: t('nav.history', 'History'), to: '/senior/history', icon: Clock },
    { label: t('nav.profile', 'Profile'), to: '/senior/profile', icon: User },
    { label: t('nav.settings', 'Settings'), to: '/senior/settings', icon: Settings },
  ];

  const mobileNavItems = [
    { label: t('nav.home', 'Home'), to: '/senior/dashboard', icon: Home, exact: true },
    { label: t('nav.medicines', 'Medicines'), to: '/senior/medicines', icon: Pill },
    { label: t('nav.history', 'History'), to: '/senior/history', icon: Clock },
    { label: t('nav.profile', 'Profile'), to: '/senior/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-nest-bg text-nest-ink font-sans pb-24 md:pb-8">
      <a
        href="#senior-main-content"
        className="sr-only sr-only-focusable z-50 p-3 bg-terracotta-500 text-white font-bold"
      >
        {t('nav.skipToContent', 'Skip to main content')}
      </a>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-nest-surface border-b border-nest-border sticky top-0 z-30 shadow-tactile-sm">
        <div className="px-4 h-18 flex items-center justify-between">
          <Logo size="default" to="/senior/dashboard" />
          <div className="flex items-center gap-2">
            <LanguageSelector variant="header" />
            <AccessibilityControls />
          </div>
        </div>
      </header>

      {/* Desktop Shell: Sidebar | Main Content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col md:flex-row gap-8">
        {/* Desktop Left Navigation Sidebar */}
        <aside
          className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 select-none"
          aria-label="Senior desktop navigation"
        >
          <div className="bg-nest-surface border border-nest-border rounded-tactile-xl p-5 shadow-tactile-sm sticky top-6 space-y-6">
            <div className="space-y-1 pb-4 border-b border-nest-border">
              <Logo size="large" to="/senior/dashboard" subtitle />
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-terracotta-50 text-terracotta-700 text-xs font-bold uppercase tracking-wider border border-terracotta-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t('portal.seniorSpace', 'Older Adult Space')}
                </span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-2" aria-label="Senior portal pages">
              {seniorNavItems.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `flex items-center gap-3.5 px-4 py-3.5 rounded-tactile text-lg font-bold transition-all ${
                        isActive
                          ? 'bg-terracotta-50 text-terracotta-700 border-2 border-terracotta-400 shadow-tactile-sm'
                          : 'text-nest-ink hover:bg-nest-surface-subtle border-2 border-transparent'
                      }`
                    }
                  >
                    <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Quick Connected Caregiver Summary - Dynamic Registered Caregiver */}
            <div className="pt-4 border-t border-nest-border">
              <div className="p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-nest-ink">
                  <HeartHandshake className="w-4 h-4 text-olive-600 shrink-0" />
                  <span>{caregiverInfo.isConnected ? t('senior.caregiverConnected', 'Caregiver Connected') : t('senior.caregiverLink', 'Caregiver Link')}</span>
                </div>

                {caregiverInfo.isConnected ? (
                  <>
                    <p className="text-xs text-nest-ink-muted">
                      <strong className="text-nest-ink">{caregiverInfo.name}</strong> ({caregiverInfo.relationship}) is connected and receives confirmation notices.
                    </p>
                    {caregiverInfo.phone ? (
                      <a
                        href={`tel:${caregiverInfo.phone}`}
                        className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-tactile bg-nest-surface hover:bg-white text-terracotta-700 border border-nest-border text-sm font-bold shadow-tactile-sm transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{t('senior.call', 'Call')} {caregiverInfo.firstName}</span>
                      </a>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className="text-xs text-nest-ink-muted">
                      {t('senior.codeInstructions', 'Connect with family or a caretaker to share routine medication updates.')}
                    </p>
                    <Link
                      to="/senior/profile"
                      className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-tactile bg-white hover:bg-nest-surface text-terracotta-700 border border-nest-border text-sm font-bold shadow-tactile-sm transition-colors"
                    >
                      <span>{t('senior.connectCaregiver', 'Connect Caregiver')}</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Language & Accessibility controls on sidebar */}
            <div className="pt-2 flex items-center justify-between text-xs text-nest-ink-muted border-t border-nest-border">
              <span className="font-semibold">{t('common.language', 'Language')}</span>
              <LanguageSelector variant="header" />
            </div>
            <div className="pt-2 flex items-center justify-between text-xs text-nest-ink-muted border-t border-nest-border">
              <span className="font-semibold">{t('common.textScaling', 'Text Scaling')}</span>
              <AccessibilityControls />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main id="senior-main-content" className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Large touch targets with clear text labels) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-nest-surface border-t-2 border-nest-border shadow-tactile-lg"
      >
        <div className="grid grid-cols-4 h-20 max-w-lg mx-auto">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 text-center select-none transition-colors touch-target-lg ${
                    isActive
                      ? 'text-terracotta-600 font-bold bg-terracotta-50/70 border-t-3 border-terracotta-500 -mt-[2px]'
                      : 'text-nest-ink-muted hover:text-nest-ink'
                  }`
                }
              >
                <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span className="text-xs font-semibold tracking-tight">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
