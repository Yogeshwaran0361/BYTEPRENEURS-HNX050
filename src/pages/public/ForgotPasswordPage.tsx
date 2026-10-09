import React, { useState } from 'react';
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
import {
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
  AlertCircle,
  Lock,
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'senior';
  const initialEmail = searchParams.get('email') || '';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState<string>(initialEmail);
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'email'>('direct');

  const { resetPassword, requestPasswordReset, verifyEmailAccount } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isSenior = role === 'senior';
  const loginPath = isSenior ? '/senior/login' : '/caregiver/login';
  const roleName = isSenior
    ? t('landing.seniorPortal', 'Senior Portal')
    : t('landing.caretakerPortal', 'Caretaker Portal');

  // Submit direct new password reset
  const handleDirectReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

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
      // 1. Verify that email exists
      const accountCheck = await verifyEmailAccount(cleanEmail);
      if (!accountCheck.exists) {
        setErrorMessage(t('auth.emailNotFound', 'No account found with this email address. Please check and try again.'));
        setIsLoading(false);
        return;
      }

      // 2. Perform the password reset
      const res = await resetPassword(cleanEmail, newPassword);
      if (res.success) {
        if (res.role) setRole(res.role);
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

  // Submit email reset link dispatch
  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage(t('auth.enterEmail', 'Please enter your email address.'));
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(cleanEmail);
      if (res.success) {
        setStatusMessage(
          res.message || 'Password reset link sent! Check your inbox to set a new password.'
        );
        showToast('Reset Link Sent', 'Please check your email inbox.', 'info');
      } else {
        setErrorMessage(res.error || 'Failed to send reset email. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-12 md:py-16">
      {/* Back button */}
      <div className="mb-4">
        <Link
          to={loginPath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-nest-ink-muted hover:text-nest-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('auth.backToSignIn', 'Back to Sign In')}</span>
        </Link>
      </div>

      <Card variant="default" className="shadow-tactile-md">
        <CardHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
                  isSenior
                    ? 'bg-terracotta-50 text-terracotta-700 border-terracotta-200'
                    : 'bg-olive-50 text-olive-800 border-olive-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{roleName}</span>
              </span>

              {/* Portal switcher toggle */}
              <div className="flex rounded-tactile bg-nest-surface-subtle p-0.5 border border-nest-border text-xs">
                <button
                  type="button"
                  onClick={() => setRole('senior')}
                  className={`px-2 py-1 rounded font-bold transition-colors ${
                    isSenior
                      ? 'bg-terracotta-500 text-white shadow-xs'
                      : 'text-nest-ink-muted hover:text-nest-ink'
                  }`}
                >
                  Senior
                </button>
                <button
                  type="button"
                  onClick={() => setRole('caregiver')}
                  className={`px-2 py-1 rounded font-bold transition-colors ${
                    !isSenior
                      ? 'bg-olive-700 text-white shadow-xs'
                      : 'text-nest-ink-muted hover:text-nest-ink'
                  }`}
                >
                  Caretaker
                </button>
              </div>
            </div>

            <CardTitle className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
              <KeyRound className={`w-7 h-7 ${isSenior ? 'text-terracotta-500' : 'text-olive-700'}`} />
              <span>{t('auth.forgotPasswordTitle', 'Reset Your Password')}</span>
            </CardTitle>
            <CardDescription className="text-sm sm:text-base leading-relaxed">
              {t(
                'auth.forgotPasswordDesc',
                'Enter your registered email and choose a new password for your account.'
              )}
            </CardDescription>
          </div>
        </CardHeader>

        {/* Success Confirmation View */}
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
                <div className="p-3 bg-nest-surface-subtle rounded-tactile border border-nest-border text-xs text-nest-ink font-semibold">
                  <span>Account: </span>
                  <strong className="text-nest-ink">{email}</strong>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="button"
                variant={isSenior ? 'primary' : 'positive'}
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
          <div>
            {/* Reset method tabs */}
            <div className="px-6 border-b border-nest-border">
              <div className="grid grid-cols-2 gap-2 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('direct');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-tactile border-2 flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'direct'
                      ? isSenior
                        ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-800'
                        : 'border-olive-600 bg-olive-50 text-olive-900'
                      : 'border-transparent text-nest-ink-muted hover:text-nest-ink hover:bg-nest-surface-subtle'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Set New Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('email');
                    setErrorMessage(null);
                    setStatusMessage(null);
                  }}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-tactile border-2 flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === 'email'
                      ? isSenior
                        ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-800'
                        : 'border-olive-600 bg-olive-50 text-olive-900'
                      : 'border-transparent text-nest-ink-muted hover:text-nest-ink hover:bg-nest-surface-subtle'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Reset Email</span>
                </button>
              </div>
            </div>

            {/* Error & Status banners */}
            {errorMessage && (
              <div
                role="alert"
                className="mx-6 mt-4 p-3.5 rounded-tactile bg-crimson-50 border border-crimson-200 text-crimson-800 text-sm flex items-start gap-2.5"
              >
                <AlertCircle className="w-5 h-5 text-crimson-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {statusMessage && (
              <div
                role="status"
                className="mx-6 mt-4 p-3.5 rounded-tactile bg-olive-50 border border-olive-300 text-olive-900 text-sm flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-5 h-5 text-olive-700 shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}

            {activeTab === 'direct' ? (
              /* TAB 1: DIRECT RESET (Creating new password) */
              <form onSubmit={handleDirectReset}>
                <CardContent className="space-y-5 pt-4">
                  <FormField
                    id="reset-email"
                    label={t('auth.enterEmail', 'Email Address')}
                    required
                    helperText="Enter the email associated with your account"
                  >
                    <Input
                      id="reset-email"
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
                    id="reset-new-password"
                    label={t('auth.newPassword', 'New Password')}
                    required
                    helperText={t('auth.passwordMinLength', 'Must be at least 6 characters long')}
                  >
                    <PasswordInput
                      id="reset-new-password"
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
                    id="reset-confirm-password"
                    label={t('auth.confirmNewPassword', 'Confirm New Password')}
                    required
                    helperText="Re-type your new password to verify"
                  >
                    <PasswordInput
                      id="reset-confirm-password"
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

                  {/* Password match indicator */}
                  {newPassword && confirmPassword && (
                    <div
                      className={`text-xs font-bold flex items-center gap-1.5 px-3 py-2 rounded-tactile ${
                        newPassword === confirmPassword
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amberwarm-50 text-amberwarm-800 border border-amberwarm-200'
                      }`}
                    >
                      {newPassword === confirmPassword ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Passwords match perfectly</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-amberwarm-600" />
                          <span>Passwords do not match yet</span>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex-col gap-3 pt-2">
                  <Button
                    type="submit"
                    variant={isSenior ? 'primary' : 'positive'}
                    size="large"
                    fullWidth
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    {isLoading
                      ? t('common.loading', 'Updating Password...')
                      : t('auth.saveNewPassword', 'Save New Password')}
                  </Button>

                  <div className="text-center text-sm text-nest-ink-muted pt-2">
                    <span>Remember your password? </span>
                    <Link to={loginPath} className="text-terracotta-600 font-bold hover:underline">
                      {t('common.signIn', 'Sign In')}
                    </Link>
                  </div>
                </CardFooter>
              </form>
            ) : (
              /* TAB 2: SEND RESET EMAIL VIA SUPABASE */
              <form onSubmit={handleEmailReset}>
                <CardContent className="space-y-5 pt-4">
                  <FormField
                    id="reset-email-link"
                    label={t('auth.enterEmail', 'Email Address')}
                    required
                    helperText="We will send a secure password reset link to this address"
                  >
                    <Input
                      id="reset-email-link"
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
                </CardContent>

                <CardFooter className="flex-col gap-3 pt-2">
                  <Button
                    type="submit"
                    variant={isSenior ? 'primary' : 'positive'}
                    size="large"
                    fullWidth
                    isLoading={isLoading}
                    rightIcon={<Mail className="w-5 h-5" />}
                  >
                    {isLoading
                      ? t('common.loading', 'Sending...')
                      : t('auth.sendResetEmail', 'Send Reset Link via Email')}
                  </Button>

                  <div className="text-center text-sm text-nest-ink-muted pt-2">
                    <span>Remember your password? </span>
                    <Link to={loginPath} className="text-terracotta-600 font-bold hover:underline">
                      {t('common.signIn', 'Sign In')}
                    </Link>
                  </div>
                </CardFooter>
              </form>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
