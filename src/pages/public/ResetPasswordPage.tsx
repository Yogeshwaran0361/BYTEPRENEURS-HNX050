import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState<string>(searchParams.get('email') || '');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [resolvedRole, setResolvedRole] = useState<UserRole>('senior');

  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Inspect if Supabase has session from recovery link
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          if (data.session.user.email) setEmail(data.session.user.email);
          const userRole = (data.session.user.user_metadata?.role as UserRole) || 'senior';
          setResolvedRole(userRole);
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('auth.enterEmail', 'Please enter your email address.'));
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage(t('auth.passwordMinLength', 'Password must be at least 6 characters long.'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.passwordsDoNotMatch', 'Passwords do not match. Please re-enter.'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await resetPassword(cleanEmail, newPassword);
      if (res.success) {
        if (res.role) setResolvedRole(res.role);
        setIsSuccess(true);
        showToast(
          t('auth.passwordResetSuccess', 'Password Reset Successfully!'),
          t('auth.passwordResetSuccessDesc', 'Your new password is now active.'),
          'success'
        );
      } else {
        setErrorMessage(res.error || 'Failed to update password. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while resetting your password.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginPath = resolvedRole === 'caregiver' ? '/caregiver/login' : '/senior/login';

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12 md:py-16">
      <Card variant="default" className="shadow-tactile-md">
        <CardHeader>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-nest-surface-subtle border border-nest-border text-nest-ink-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-terracotta-500" />
              <span>NESTCARE Account Security</span>
            </span>

            <CardTitle className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
              <KeyRound className="w-7 h-7 text-terracotta-500" />
              <span>{t('auth.forgotPasswordTitle', 'Create New Password')}</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base leading-relaxed">
              {t(
                'auth.forgotPasswordDesc',
                'Enter your new password below to secure your account.'
              )}
            </CardDescription>
          </div>
        </CardHeader>

        {isSuccess ? (
          <div>
            <CardContent className="space-y-6 pt-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-tactile-sm">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-nest-ink">
                  {t('auth.passwordResetSuccess', 'Password Reset Successfully!')}
                </h3>
                <p className="text-sm text-nest-ink-muted leading-relaxed">
                  {t(
                    'auth.passwordResetSuccessDesc',
                    'Your account password has been updated. You can now sign in with your new password.'
                  )}
                </p>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="button"
                variant="primary"
                size="large"
                fullWidth
                onClick={() => navigate(loginPath)}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {t('common.signIn', 'Sign In with New Password')}
              </Button>
            </CardFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {errorMessage && (
              <div
                role="alert"
                className="mx-6 mb-2 p-3.5 rounded-tactile bg-crimson-50 border border-crimson-200 text-crimson-800 text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 text-crimson-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <CardContent className="space-y-5 pt-4">
              <FormField
                id="reset-standalone-email"
                label={t('auth.enterEmail', 'Email Address')}
                required
              >
                <Input
                  id="reset-standalone-email"
                  type="email"
                  sizeVariant="large"
                  placeholder="user@example.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                />
              </FormField>

              <FormField
                id="reset-standalone-new-password"
                label={t('auth.newPassword', 'New Password')}
                required
                helperText={t('auth.passwordMinLength', 'Must be at least 6 characters long')}
              >
                <PasswordInput
                  id="reset-standalone-new-password"
                  sizeVariant="large"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                />
              </FormField>

              <FormField
                id="reset-standalone-confirm-password"
                label={t('auth.confirmNewPassword', 'Confirm New Password')}
                required
                helperText="Re-type your new password to verify"
              >
                <PasswordInput
                  id="reset-standalone-confirm-password"
                  sizeVariant="large"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                />
              </FormField>
            </CardContent>

            <CardFooter className="flex-col gap-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="large"
                fullWidth
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {isLoading
                  ? t('common.loading', 'Saving...')
                  : t('auth.saveNewPassword', 'Save New Password')}
              </Button>

              <div className="text-center text-sm text-nest-ink-muted pt-2">
                <Link to={loginPath} className="text-terracotta-600 font-bold hover:underline">
                  {t('auth.backToSignIn', 'Back to Sign In')}
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
};
