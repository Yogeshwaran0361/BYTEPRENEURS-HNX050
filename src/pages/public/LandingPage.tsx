import React from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Shield,
  ArrowRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-[75vh] flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8">
      {/* ========================================================================= */}
      {/* BIG UNIQUE BRAND TITLE IN CENTER */}
      {/* ========================================================================= */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-10 md:mb-14">
        <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black tracking-tight text-nest-ink uppercase select-none leading-none">
          NEST<span className="text-terracotta-500">CARE</span>
        </h1>
        <p className="text-lg sm:text-2xl font-bold text-nest-ink-muted">
          {t('landing.tagline', 'Select your portal to sign in or register')}
        </p>
      </div>

      {/* ========================================================================= */}
      {/* TWO SEPARATE ACTION CARDS: SENIOR VS CARETAKER */}
      {/* ========================================================================= */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 🏡 SENIOR PORTAL CARD */}
        <div className="rounded-tactile-2xl bg-white border-3 border-terracotta-400 p-8 sm:p-10 shadow-tactile-md flex flex-col justify-between space-y-8">
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-tactile-xl bg-terracotta-500 text-white flex items-center justify-center shadow-tactile-sm">
              <User className="w-10 h-10" />
            </div>
            <div>
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-terracotta-50 text-terracotta-700 border border-terracotta-200 mb-2">
                🏡 {t('landing.forSeniors', 'For Older Adults')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-nest-ink tracking-tight">
                {t('landing.seniorPortal', 'Senior Portal')}
              </h2>
            </div>
          </div>

          {/* SENIOR SIGN IN & REGISTER BUTTONS */}
          <div className="space-y-3.5">
            <Link
              to="/senior/login"
              className="w-full py-4 px-6 rounded-tactile bg-terracotta-600 text-white font-extrabold text-lg hover:bg-terracotta-700 shadow-tactile flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
            >
              <LogIn className="w-6 h-6" />
              <span>{t('auth.seniorSignIn', 'Senior Sign In')}</span>
              <ArrowRight className="w-5 h-5 ml-auto" />
            </Link>

            <Link
              to="/senior/register"
              className="w-full py-3.5 px-6 rounded-tactile bg-terracotta-50 text-terracotta-800 border-2 border-terracotta-300 font-bold text-base hover:bg-terracotta-100 flex items-center justify-center gap-2.5 transition-all"
            >
              <UserPlus className="w-5 h-5 text-terracotta-600" />
              <span>{t('landing.newSeniorRegister', 'New Senior? Register Here')}</span>
            </Link>
          </div>
        </div>

        {/* 🛡️ CARETAKER PORTAL CARD */}
        <div className="rounded-tactile-2xl bg-white border-3 border-[#2A5438] p-8 sm:p-10 shadow-tactile-md flex flex-col justify-between space-y-8">
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 mx-auto rounded-tactile-xl bg-[#1D3B27] text-white flex items-center justify-center shadow-tactile-sm">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div>
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-[#F2F7F3] text-[#1D3B27] border border-[#A4CAAE] mb-2">
                🛡️ {t('landing.forCaregivers', 'For Family & Caretakers')}
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-nest-ink tracking-tight">
                {t('landing.caretakerPortal', 'Caretaker Portal')}
              </h2>
            </div>
          </div>

          {/* CARETAKER SIGN IN & REGISTER BUTTONS */}
          <div className="space-y-3.5">
            <Link
              to="/caretaker/login"
              className="w-full py-4 px-6 rounded-tactile bg-[#1D3B27] text-white font-extrabold text-lg hover:bg-[#152C1D] shadow-tactile flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
            >
              <LogIn className="w-6 h-6 text-white" />
              <span className="text-white">{t('auth.caretakerSignIn', 'Caretaker Sign In')}</span>
              <ArrowRight className="w-5 h-5 ml-auto text-white" />
            </Link>

            <Link
              to="/caregiver/register"
              className="w-full py-3.5 px-6 rounded-tactile bg-[#F2F7F3] text-[#1D3B27] border-2 border-[#A4CAAE] font-bold text-base hover:bg-[#E2EEE5] flex items-center justify-center gap-2.5 transition-all"
            >
              <UserPlus className="w-5 h-5 text-[#1D3B27]" />
              <span>{t('landing.newCaretakerRegister', 'New Caretaker? Register Here')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
