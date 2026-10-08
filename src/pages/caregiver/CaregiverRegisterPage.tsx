import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { StepProgress } from '../../components/ui/StepProgress';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { connectionService } from '../../services/connectionService';
import {
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Users,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Connect Adult' },
  { id: 3, label: 'Finish' },
];

export const CaregiverRegisterPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Account
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [relationshipType, setRelationshipType] = useState('Daughter');

  // Step 2: Connection
  const [connectionCode, setConnectionCode] = useState('');
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [connectedAdultName, setConnectedAdultName] = useState<string | null>(null);

  // Status
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { registerCaregiver, completeOnboarding, profile, caregiver } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.';
    }

    if (!email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Please create a password.';
    } else if (password.length < 8) {
      newErrors.password = 'For your security, please use at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match. Please enter the same password in both fields.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextFromStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1()) return;

    setIsLoading(true);
    setErrors({});
    try {
      const res = await registerCaregiver({
        fullName,
        email,
        password,
        phone,
        relationshipType,
      });

      if (!res.success) {
        setErrors({ form: res.error || 'Registration failed. Please try again.' });
        return;
      }

      showToast('Account created', 'Welcome to the Caregiver Portal.', 'success');
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionCode.trim()) {
      setErrors({ code: 'Please enter a connection code.' });
      return;
    }

    setIsLoading(true);
    setErrors({});
    try {
      const activeCgId = caregiver?.id || profile?.id || localStorage.getItem('nestcare_active_user_id') || '';
      const res = await connectionService.verifyAndConnect(
        activeCgId,
        connectionCode,
        relationshipType
      );

      if (res.error) {
        setErrors({ code: res.error });
        return;
      }

      setConnectionSuccess(true);
      setConnectedAdultName(res.data?.older_adult?.preferred_name || 'Older Adult');
      showToast('Connected successfully', 'Older adult connected to your care dashboard.', 'success');
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipConnection = () => {
    setCurrentStep(3);
  };

  const handleFinishAndEnter = async () => {
    await completeOnboarding();
    navigate('/caregiver/dashboard');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      <StepProgress steps={STEPS} currentStep={currentStep} className="mb-6" />

      {errors.form && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-tactile bg-crimson-50 border border-crimson-200 text-crimson-700 text-base flex items-center gap-2"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{errors.form}</span>
        </div>
      )}

      {/* STEP 1: Account */}
      {currentStep === 1 && (
        <Card variant="default">
          <CardHeader>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-olive-700 block">
                Step 1 of 3
              </span>
              <CardTitle>Caregiver Registration</CardTitle>
              <CardDescription>
                Create your care account to stay aware of medication activity.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleNextFromStep1}>
            <CardContent className="space-y-5">
              <FormField
                id="caregiver-fullname"
                label="Full Name"
                required
                errorMessage={errors.fullName}
                helperText="How should we address you?"
              >
                <Input
                  id="caregiver-fullname"
                  sizeVariant="large"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={e => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                  }}
                  hasError={Boolean(errors.fullName)}
                  required
                />
              </FormField>

              <FormField
                id="caregiver-email"
                label="Email Address"
                required
                errorMessage={errors.email}
                helperText="Used for login and urgent attention alerts"
              >
                <Input
                  id="caregiver-email"
                  type="email"
                  sizeVariant="large"
                  placeholder="caregiver@example.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  hasError={Boolean(errors.email)}
                  required
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="caregiver-password"
                  label="Password"
                  required
                  errorMessage={errors.password}
                  helperText="At least 8 characters"
                >
                  <PasswordInput
                    id="caregiver-password"
                    sizeVariant="large"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                    }}
                    hasError={Boolean(errors.password)}
                    required
                  />
                </FormField>

                <FormField
                  id="caregiver-confirm-password"
                  label="Confirm Password"
                  required
                  errorMessage={errors.confirmPassword}
                  helperText="Re-enter password"
                >
                  <PasswordInput
                    id="caregiver-confirm-password"
                    sizeVariant="large"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                    }}
                    hasError={Boolean(errors.confirmPassword)}
                    required
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="caregiver-phone"
                  label="Mobile Phone (Optional)"
                  helperText="For critical SMS escalation"
                >
                  <Input
                    id="caregiver-phone"
                    type="tel"
                    sizeVariant="large"
                    placeholder="(555) 000-0000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                </FormField>

                <FormField
                  id="caregiver-rel"
                  label="Relationship to Older Adult"
                  required
                  helperText="Specify your connection"
                >
                  <Select
                    id="caregiver-rel"
                    sizeVariant="large"
                    value={relationshipType}
                    onChange={e => setRelationshipType(e.target.value)}
                    options={[
                      { value: 'Daughter', label: 'Daughter' },
                      { value: 'Son', label: 'Son' },
                      { value: 'Spouse', label: 'Spouse / Partner' },
                      { value: 'Grandchild', label: 'Grandchild' },
                      { value: 'Relative', label: 'Relative' },
                      { value: 'Friend', label: 'Friend / Neighbor' },
                      { value: 'Professional caregiver', label: 'Professional Caregiver' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                </FormField>
              </div>
            </CardContent>

            <CardFooter className="flex-col sm:flex-row justify-between gap-4">
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="secondary" size="large" fullWidth>
                  Back to Home
                </Button>
              </Link>
              <Button
                type="submit"
                variant="positive"
                size="large"
                isLoading={isLoading}
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Create Account & Continue
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* STEP 2: Connect Older Adult */}
      {currentStep === 2 && (
        <Card variant="default">
          <CardHeader>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-olive-700 block">
                Step 2 of 3
              </span>
              <CardTitle>Connect an Older Adult</CardTitle>
              <CardDescription>
                NESTCARE lets you connect to an older adult so you can see the medication activity they choose to share with you.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleConnectCode}>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-tactile bg-olive-50 border border-olive-200 text-sm text-nest-ink flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-olive-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-nest-ink font-semibold">How to get a connection code:</strong>
                  <span className="text-nest-ink-muted">
                    Ask the older adult to look in their NESTCARE profile for their 6-character connection code (formatted like <code>NC-7K4P-29</code>).
                  </span>
                </div>
              </div>

              <FormField
                id="caregiver-connect-code"
                label="Connection Code"
                errorMessage={errors.code}
                helperText="Enter the code provided by the older adult"
              >
                <Input
                  id="caregiver-connect-code"
                  sizeVariant="large"
                  placeholder="e.g., NC-7K4P-29"
                  value={connectionCode}
                  onChange={e => {
                    setConnectionCode(e.target.value.toUpperCase());
                    if (errors.code) setErrors(prev => ({ ...prev, code: '' }));
                  }}
                  hasError={Boolean(errors.code)}
                  className="font-mono text-xl uppercase tracking-wider"
                />
              </FormField>

              <div className="text-sm text-nest-ink-faint">
                <span>Enter the 10-character code generated on the senior's device to connect.</span>
              </div>
            </CardContent>

            <CardFooter className="flex-col sm:flex-row justify-between gap-4">
              <Button
                variant="secondary"
                size="large"
                onClick={handleSkipConnection}
                className="w-full sm:w-auto"
              >
                I'll do this later
              </Button>
              <Button
                type="submit"
                variant="positive"
                size="large"
                isLoading={isLoading}
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Connect Older Adult
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* STEP 3: Finish */}
      {currentStep === 3 && (
        <Card variant="warm" className="text-center p-8 sm:p-12 border-2 border-olive-300">
          <div className="w-16 h-16 rounded-full bg-olive-600 text-white flex items-center justify-center mx-auto mb-6 shadow-tactile-md">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-nest-ink tracking-tight mb-2">
            Welcome to NESTCARE, {fullName || 'Caregiver'}.
          </h2>

          <p className="text-xl text-nest-ink-muted max-w-lg mx-auto leading-relaxed mb-8">
            {connectionSuccess && connectedAdultName
              ? `You are now connected to ${connectedAdultName}. You will receive quiet updates when attention is needed.`
              : 'Connect an older adult anytime to start receiving medication activity updates when attention may be needed.'}
          </p>

          <div className="pt-2 flex justify-center">
            <Button
              variant="positive"
              size="senior"
              onClick={handleFinishAndEnter}
              rightIcon={<ArrowRight className="w-6 h-6 stroke-[3]" />}
            >
              Continue to dashboard
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
