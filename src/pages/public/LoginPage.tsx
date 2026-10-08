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
import { LogIn, ArrowRight, ShieldCheck, HeartHandshake, User } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const roleHint = searchParams.get('role') as UserRole | null;
  const returnUrl = searchParams.get('returnUrl');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleForgotPassword = () => {
    showToast(
      'Password reset request',
      'If an account exists for this email, password reset instructions will be sent.',
      'info'
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await login(email, password);
      if (res.success) {
        showToast('Welcome back', 'You are now signed in.', 'success');
        // Role-based redirection determined strictly by profile data
        if (returnUrl) {
          navigate(returnUrl);
        } else if (res.role === 'caregiver') {
          navigate('/caretaker/dashboard');
        } else {
          navigate('/senior/dashboard');
        }
      } else {
        setErrorMessage(
          res.error || "We couldn't sign you in. Please check your email and password and try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 md:py-16">
      <Card variant="default" className="shadow-tactile-md">
        <CardHeader>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-nest-surface-subtle text-nest-ink-muted text-xs font-bold uppercase tracking-wider mb-2 border border-nest-border">
              <LogIn className="w-3.5 h-3.5 text-terracotta-500" />
              <span>{t('common.signIn', 'Sign In')}</span>
            </div>
            <CardTitle>{t('common.signIn', 'Sign In')}</CardTitle>
            <CardDescription>
              {t('auth.welcome', 'Welcome to NESTCARE')}
            </CardDescription>
          </div>
        </CardHeader>

        {errorMessage && (
          <div
            role="alert"
            className="mx-6 mb-2 p-3.5 rounded-tactile bg-crimson-50 border border-crimson-200 text-crimson-700 text-sm leading-relaxed"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <FormField
              id="login-email"
              label={t('auth.enterEmail', 'Email Address')}
              required
            >
              <Input
                id="login-email"
                type="email"
                sizeVariant="large"
                placeholder="name@example.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
              />
            </FormField>

            <FormField
              id="login-password"
              label={t('auth.enterPassword', 'Password')}
              required
            >
              <PasswordInput
                id="login-password"
                sizeVariant="large"
                placeholder="••••••••"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
              />
            </FormField>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-nest-ink-muted hover:text-terracotta-600 hover:underline"
              >
                {t('auth.forgotPassword', 'Forgot your password?')}
              </button>
            </div>

          </CardContent>

          <CardFooter className="flex-col gap-3">
            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {isLoading ? t('common.loading', 'Loading...') : t('common.signIn', 'Sign In')}
            </Button>

            <div className="text-center text-sm text-nest-ink-muted pt-2">
              <span>{t('auth.noAccount', "Don't have an account?")} </span>
              <Link to="/" className="text-terracotta-600 font-bold hover:underline">
                {t('common.register', 'Register')}
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
