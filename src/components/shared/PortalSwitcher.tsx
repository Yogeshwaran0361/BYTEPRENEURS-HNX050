import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HeartHandshake, User, Sparkles, Shield, ArrowRightLeft } from 'lucide-react';

export const PortalSwitcher: React.FC = () => {
  const location = useLocation();
  const { switchRole } = useAuth();

  const isSeniorRoute = location.pathname.startsWith('/senior');
  const isCaretakerRoute = location.pathname.startsWith('/caretaker');
  const isCaregiverRoute = location.pathname.startsWith('/caregiver') && !isCaretakerRoute;

  return (
    <div className="bg-[#EFEAE1] border-b-2 border-nest-border text-xs text-nest-ink py-2 px-4 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Active Portal Signpost */}
        <div className="flex items-center gap-2">
          <span className="font-extrabold uppercase tracking-wider text-[11px] text-nest-ink/80 flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-nest-ink-muted" /> Active Portal:
          </span>

          {isSeniorRoute && (
            <span className="inline-flex items-center gap-1.5 font-black text-terracotta-800 bg-white px-3 py-1 rounded-tactile border-2 border-terracotta-300 shadow-tactile-sm">
              <User className="w-3.5 h-3.5 text-terracotta-600" />
              <span>🏡 SENIOR PORTAL</span>
              <span className="text-[10px] text-terracotta-600 font-semibold hidden sm:inline">(Older Adult Space)</span>
            </span>
          )}

          {(isCaretakerRoute || isCaregiverRoute) && (
            <span className="inline-flex items-center gap-1.5 font-black text-olive-900 bg-white px-3 py-1 rounded-tactile border-2 border-olive-400 shadow-tactile-sm">
              <Shield className="w-3.5 h-3.5 text-olive-700" />
              <span>🛡️ CARETAKER PORTAL</span>
              <span className="text-[10px] text-olive-700 font-semibold hidden sm:inline">(Family & Caregiver Oversight)</span>
            </span>
          )}

          {!isSeniorRoute && !isCaretakerRoute && !isCaregiverRoute && (
            <span className="inline-flex items-center gap-1 font-bold text-nest-ink bg-white px-2.5 py-0.5 rounded border border-nest-border">
              <Sparkles className="w-3.5 h-3.5 text-nest-ink-muted" /> Public Portal
            </span>
          )}
        </div>

        {/* Instant Portal Switcher Links */}
        <div className="flex items-center gap-2">
          <span className="text-nest-ink-muted font-bold hidden md:inline">Quick Switch:</span>

          <Link
            to="/senior/dashboard"
            onClick={() => switchRole('senior')}
            className={`px-3 py-1 rounded-tactile font-bold transition-all flex items-center gap-1.5 ${
              isSeniorRoute
                ? 'bg-terracotta-600 text-white shadow-tactile ring-2 ring-terracotta-400/40'
                : 'bg-white text-nest-ink hover:bg-terracotta-50 hover:text-terracotta-800 border border-nest-border shadow-xs'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Senior Portal</span>
          </Link>

          <Link
            to="/caretaker/dashboard"
            onClick={() => switchRole('caregiver')}
            className={`px-3 py-1 rounded-tactile font-bold transition-all flex items-center gap-1.5 ${
              isCaretakerRoute || isCaregiverRoute
                ? 'bg-olive-800 text-white shadow-tactile ring-2 ring-olive-400/40'
                : 'bg-white text-nest-ink hover:bg-olive-50 hover:text-olive-900 border border-nest-border shadow-xs'
            }`}
          >
            <Shield className="w-3 h-3" />
            <span>Caretaker Portal</span>
          </Link>

          <Link
            to="/"
            className="text-nest-ink-muted hover:text-nest-ink font-semibold underline pl-1.5 hidden lg:inline"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};
