import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Shield, ArrowRight } from 'lucide-react';

export const CaregiverLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await login(email.trim().toLowerCase(), password);
      if (res.success) {
        showToast('Welcome back', 'Opening Caretaker Command Center.', 'success');
        navigate('/caregiver/dashboard');
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
    <div className="max-w-lg mx-auto px-4 py-12 md:py-16">
      <div className="mb-4 text-center">
        <Link to="/" className="text-sm font-semibold text-nest-ink-muted hover:text-olive-800 transition-colors">
          ← Return to NESTCARE Home
        </Link>
      </div>

      <Card variant="default" className="shadow-tactile-md border-2 border-olive-300">
        <CardHeader className="bg-olive-50/50 pb-5 border-b border-nest-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-tactile bg-olive-800 text-white flex items-center justify-center font-bold shadow-tactile-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-white text-olive-800 text-xs font-bold uppercase tracking-wider mb-1 border border-olive-300">
                <span>🛡️ Caretaker Portal</span>
              </div>
              <CardTitle className="text-2xl font-black text-nest-ink">Caretaker Sign In</CardTitle>
            </div>
          </div>
          <CardDescription className="text-base text-nest-ink-muted mt-2">
            Sign in to review medication adherence, receive delay alerts, and support connected seniors.
          </CardDescription>
        </CardHeader>

        {errorMessage && (
          <div
            role="alert"
            className="mx-6 mt-4 p-3.5 rounded-tactile bg-crimson-50 border border-crimson-200 text-crimson-700 text-sm leading-relaxed"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 pt-6">
            <FormField
              id="caretaker-login-email"
              label="Email Address"
              required
              helperText="Enter your registered caretaker email"
            >
              <Input
                id="caretaker-login-email"
                type="email"
                sizeVariant="large"
                placeholder="caregiver@example.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
              />
            </FormField>

            <FormField
              id="caretaker-login-password"
              label="Password"
              required
              helperText="Your account password"
            >
              <PasswordInput
                id="caretaker-login-password"
                sizeVariant="large"
                placeholder="Enter your password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
              />
            </FormField>

            <div className="flex justify-end pt-1">
              <Link
                to={`/forgot-password?role=caregiver${email ? `&email=${encodeURIComponent(email)}` : ''}`}
                className="text-sm font-bold text-olive-800 hover:text-olive-900 hover:underline inline-flex items-center gap-1"
              >
                {t('auth.forgotPassword', 'Forgot password?')}
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-3 pt-2">
            <Button
              type="submit"
              variant="positive"
              size="large"
              fullWidth
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              {isLoading ? 'Signing you in...' : 'Sign In to Caretaker Portal'}
            </Button>

            <div className="flex flex-col sm:flex-row items-center justify-between w-full pt-4 border-t border-nest-border text-sm text-nest-ink-muted gap-2">
              <span>Need a caretaker account?</span>
              <Link to="/caregiver/register" className="text-olive-800 font-bold hover:underline">
                Register as Caretaker →
              </Link>
            </div>

            <div className="text-center pt-2">
              <span className="text-xs text-nest-ink-faint">Are you an Older Adult managing your routine? </span>
              <Link to="/senior/login" className="text-xs font-bold text-terracotta-700 hover:underline">
                Go to Senior Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

