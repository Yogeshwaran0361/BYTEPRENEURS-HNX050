import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { User, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';

export const ChooseRolePage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('senior');
  const { switchRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleContinue = async () => {
    await switchRole(selectedRole);
    if (selectedRole === 'senior') {
      navigate('/senior/register');
    } else {
      navigate('/caregiver/register');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      <PageHeader
        title={t('role.title', 'How will you use NESTCARE?')}
        subtitle={t('role.subtitle', 'Choose your role to get started with an experience tailored for you.')}
        breadcrumbs={[
          { label: t('nav.home', 'Home'), href: '/' },
          { label: t('auth.chooseRole', 'Choose Role') },
        ]}
      />

      {/* Two Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8" role="radiogroup" aria-label="Select your role">
        {/* Choice 1: Older Adult */}
        <div
          role="radio"
          aria-checked={selectedRole === 'senior'}
          tabIndex={0}
          onClick={() => setSelectedRole('senior')}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setSelectedRole('senior');
            }
          }}
          className={`group block text-left rounded-tactile-xl transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-500 ${
            selectedRole === 'senior'
              ? 'ring-3 ring-terracotta-500 shadow-tactile-md bg-terracotta-50/30'
              : 'hover:border-nest-border-strong opacity-90 hover:opacity-100'
          }`}
        >
          <Card
            variant={selectedRole === 'senior' ? 'highlight' : 'default'}
            className="h-full border-2 p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div
                  className={`w-14 h-14 rounded-tactile flex items-center justify-center transition-colors ${
                    selectedRole === 'senior'
                      ? 'bg-terracotta-500 text-white shadow-tactile-sm'
                      : 'bg-terracotta-50 text-terracotta-700 border border-terracotta-200'
                  }`}
                >
                  <User className="w-7 h-7" aria-hidden="true" />
                </div>
                {selectedRole === 'senior' && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-terracotta-700 bg-white/90 px-2.5 py-1 rounded border border-terracotta-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('role.selected', 'Selected')}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-nest-ink mb-2">
                {t('landing.forSeniors', 'Older Adult')}
              </h2>

              <p className="text-lg text-nest-ink-muted leading-relaxed mb-6">
                {t('role.seniorDesc', 'Manage your medication routine with greater clarity and confidence.')}
              </p>
            </div>

            <Button
              variant={selectedRole === 'senior' ? 'primary' : 'secondary'}
              size="large"
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRole('senior');
                switchRole('senior');
                navigate('/senior/register');
              }}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {t('role.continueSenior', 'Continue as Older Adult')}
            </Button>
          </Card>
        </div>

        {/* Choice 2: Caregiver */}
        <div
          role="radio"
          aria-checked={selectedRole === 'caregiver'}
          tabIndex={0}
          onClick={() => setSelectedRole('caregiver')}
          onKeyDown={e => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              setSelectedRole('caregiver');
            }
          }}
          className={`group block text-left rounded-tactile-xl transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive-500 ${
            selectedRole === 'caregiver'
              ? 'ring-3 ring-olive-600 shadow-tactile-md bg-olive-50/30'
              : 'hover:border-nest-border-strong opacity-90 hover:opacity-100'
          }`}
        >
          <Card
            variant={selectedRole === 'caregiver' ? 'warm' : 'default'}
            className="h-full border-2 p-7 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-5">
                <div
                  className={`w-14 h-14 rounded-tactile flex items-center justify-center transition-colors ${
                    selectedRole === 'caregiver'
                      ? 'bg-olive-600 text-white shadow-tactile-sm'
                      : 'bg-olive-50 text-olive-700 border border-olive-200'
                  }`}
                >
                  <HeartHandshake className="w-7 h-7" aria-hidden="true" />
                </div>
                {selectedRole === 'caregiver' && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-olive-800 bg-white/90 px-2.5 py-1 rounded border border-olive-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('role.selected', 'Selected')}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-nest-ink mb-2">
                {t('role.caregiverTitle', 'Caregiver / Caretaker')}
              </h2>

              <p className="text-lg text-nest-ink-muted leading-relaxed mb-6">
                {t('role.caregiverDesc', 'Stay aware of medication activity, manage schedules, and know when support may be needed.')}
              </p>
            </div>

            <Button
              variant={selectedRole === 'caregiver' ? 'positive' : 'secondary'}
              size="large"
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRole('caregiver');
                switchRole('caregiver');
                navigate('/caregiver/register');
              }}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {t('role.continueCaregiver', 'Continue as Caretaker')}
            </Button>
          </Card>
        </div>
      </div>

      <div className="text-center pt-2 text-base text-nest-ink-muted">
        <span>{t('auth.haveAccount', 'Already have an account?')} </span>
        <Link to="/login" className="text-terracotta-600 font-bold hover:underline">
          {t('auth.loginInstead', 'Sign in here')}
        </Link>
      </div>
    </div>
  );
};
