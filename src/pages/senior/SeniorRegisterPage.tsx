import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { StepProgress } from '../../components/ui/StepProgress';
import { ConnectionCodeDisplay } from '../../components/ui/ConnectionCodeDisplay';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { connectionService } from '../../services/connectionService';
import {
  User,
  HeartHandshake,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Phone,
  Sparkles,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'About You' },
  { id: 3, label: 'Support' },
  { id: 4, label: 'Finish' },
];

export const SeniorRegisterPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Personal
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  // Step 3: Emergency / Support
  const [hasCaregiver, setHasCaregiver] = useState(false);
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');
  const [generatedCode, setGeneratedCode] = useState('NC-7K4P-29');

  // Form & validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const { registerSenior, completeOnboarding } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Validate Step 1
  const validateStep1 = () => {
    const newErrors: { [key: string]: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Please enter your email address.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address (e.g., name@example.com).';
    }

    if (!password) {
      newErrors.password = 'Please create a password.';
    } else if (password.length < 8) {
      newErrors.password = 'For your safety, please use at least 8 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match. Please enter the same password in both fields.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate Step 2
  const validateStep2 = () => {
    const newErrors: { [key: string]: string } = {};
    if (!fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step navigation
  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setErrors({});
      setCurrentStep(2);
    }
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep2()) {
      setErrors({});
      setCurrentStep(3);
    }
  };

  // Final submit at step 3 -> step 4
  const handleCompleteRegistration = async (skipCaregiver = false) => {
    setIsLoading(true);
    setErrors({});
    try {
      const res = await registerSenior({
        email,
        password,
        phone,
        fullName,
        preferredName: preferredName || fullName.split(' ')[0],
        dateOfBirth,
        address,
        emergencyContactName: skipCaregiver ? undefined : emergencyContactName,
        emergencyContactPhone: skipCaregiver ? undefined : emergencyContactPhone,
        emergencyContactRelationship: skipCaregiver ? undefined : emergencyContactRelationship,
      });

      if (!res.success) {
        setErrors({ form: res.error || 'Registration failed. Please try again.' });
        return;
      }

      // Generate a fresh connection code for the user
      const codeRes = await connectionService.generateNewCodeForSenior(`adult-${Date.now()}`);
      if (codeRes.data) {
        setGeneratedCode(codeRes.data.code);
      }

      showToast('Account created', 'Your senior profile is ready.', 'success');
      setCurrentStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishAndEnter = async () => {
    await completeOnboarding();
    navigate('/senior/dashboard');
  };

  const displayName = preferredName || fullName || 'Senior';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 md:py-12">
      {/* Progress Indicator */}
      <StepProgress steps={STEPS} currentStep={currentStep} className="mb-6" />

      {/* Global Form Error if any */}
      {errors.form && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-tactile bg-crimson-50 border border-crimson-200 text-crimson-700 text-base flex items-center gap-2"
        >
          <span aria-hidden="true">⚠️</span>
          <span>{errors.form}</span>
        </div>
      )}

      {/* STEP 1: Account Information */}
      {currentStep === 1 && (
        <Card variant="default">
          <CardHeader>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
                Step 1 of 4
              </span>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>
                We'll use this information to keep your medication schedule secure.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleNextFromStep1}>
            <CardContent className="space-y-5">
              <FormField
                id="senior-email"
                label="Email Address"
                required
                errorMessage={errors.email}
                helperText="We'll send important routine confirmations here"
              >
                <Input
                  id="senior-email"
                  type="email"
                  sizeVariant="large"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  hasError={Boolean(errors.email)}
                  required
                />
              </FormField>

              <FormField
                id="senior-password"
                label="Create a Password"
                required
                errorMessage={errors.password}
                helperText="Must be at least 8 characters"
              >
                <PasswordInput
                  id="senior-password"
                  sizeVariant="large"
                  placeholder="Enter at least 8 characters"
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
                id="senior-confirm-password"
                label="Confirm Password"
                required
                errorMessage={errors.confirmPassword}
                helperText="Type the same password again"
              >
                <PasswordInput
                  id="senior-confirm-password"
                  sizeVariant="large"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  hasError={Boolean(errors.confirmPassword)}
                  required
                />
              </FormField>

              <FormField
                id="senior-phone"
                label="Mobile Phone Number (Optional)"
                helperText="Used if you would like to receive gentle SMS reminders"
              >
                <Input
                  id="senior-phone"
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </FormField>
            </CardContent>

            <CardFooter className="flex-col sm:flex-row justify-between gap-4">
              <Link to="/" className="w-full sm:w-auto">
                <Button variant="secondary" size="large" fullWidth>
                  Back to Home
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                size="large"
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Continue to About You
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* STEP 2: About You */}
      {currentStep === 2 && (
        <Card variant="default">
          <CardHeader>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
                Step 2 of 4
              </span>
              <CardTitle>Tell us about yourself</CardTitle>
              <CardDescription>
                Personalized so your medication routine is clear and easy to follow.
              </CardDescription>
            </div>
          </CardHeader>

          <form onSubmit={handleNextFromStep2}>
            <CardContent className="space-y-5">
              <FormField
                id="senior-fullname"
                label="Full Legal Name"
                required
                errorMessage={errors.fullName}
                helperText="As printed on your doctor prescriptions"
              >
                <Input
                  id="senior-fullname"
                  sizeVariant="large"
                  placeholder="e.g., Margaret Bennett"
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
                id="senior-preferredname"
                label="What should we call you? (Preferred Name)"
                helperText="We will use this on your daily greeting"
              >
                <Input
                  id="senior-preferredname"
                  sizeVariant="large"
                  placeholder="Enter preferred name"
                  value={preferredName}
                  onChange={e => setPreferredName(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="senior-dob"
                  label="Date of Birth (Optional)"
                  helperText="Helps avoid duplicate medication records"
                >
                  <Input
                    id="senior-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                  />
                </FormField>

                <FormField
                  id="senior-address"
                  label="City or Home Location (Optional)"
                  helperText="For localized pharmacy coordination"
                >
                  <Input
                    id="senior-address"
                    placeholder="e.g., Boston, MA"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                  />
                </FormField>
              </div>

              <div className="p-3.5 rounded-tactile bg-nest-surface-subtle border border-nest-border text-xs text-nest-ink-muted flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-terracotta-600 shrink-0 mt-0.5" />
                <span>
                  Your personal information is confidential and will only be shared with caregivers you explicitly authorize.
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex-col sm:flex-row justify-between gap-4">
              <Button
                variant="secondary"
                size="large"
                onClick={() => setCurrentStep(1)}
                leftIcon={<ArrowLeft className="w-5 h-5" />}
                className="w-full sm:w-auto"
              >
                Back to Account
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="large"
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Continue to Support
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* STEP 3: Support / Emergency (Optional Caregiver Connection) */}
      {currentStep === 3 && (
        <Card variant="default">
          <CardHeader>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-terracotta-600 block">
                Step 3 of 4
              </span>
              <CardTitle>Emergency & Caregiver Support</CardTitle>
              <CardDescription>
                You can connect a caregiver now or do this later from your profile. NESTCARE can be used independently.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!hasCaregiver ? (
              <div className="p-6 rounded-tactile-lg bg-nest-surface-subtle border border-nest-border space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-tactile bg-olive-50 text-olive-700 border border-olive-200 flex items-center justify-center shrink-0">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-nest-ink">
                      Would you like to connect a family member or caregiver?
                    </h3>
                    <p className="text-base text-nest-ink-muted mt-1 leading-relaxed">
                      A connected caregiver can see when your medication is taken and receive gentle alerts if a dose is delayed.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="primary"
                    size="large"
                    onClick={() => setHasCaregiver(true)}
                    leftIcon={<HeartHandshake className="w-5 h-5" />}
                  >
                    Yes, Connect a Caregiver
                  </Button>
                  <Button
                    variant="secondary"
                    size="large"
                    onClick={() => handleCompleteRegistration(true)}
                    isLoading={isLoading}
                  >
                    Skip for now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-nest-border">
                  <span className="font-bold text-nest-ink text-lg">Caregiver Details</span>
                  <button
                    type="button"
                    onClick={() => setHasCaregiver(false)}
                    className="text-sm text-terracotta-600 hover:underline font-semibold"
                  >
                    I'll connect later
                  </button>
                </div>

                <FormField
                  id="senior-caregiver-name"
                  label="Caregiver Name"
                  helperText="How should we address your caregiver or family contact?"
                >
                  <Input
                    id="senior-caregiver-name"
                    sizeVariant="large"
                    placeholder="Enter caregiver name"
                    value={emergencyContactName}
                    onChange={e => setEmergencyContactName(e.target.value)}
                  />
                </FormField>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    id="senior-caregiver-phone"
                    label="Caregiver Phone"
                    helperText="Used for urgent alerts"
                  >
                    <Input
                      id="senior-caregiver-phone"
                      type="tel"
                      sizeVariant="large"
                      placeholder="(555) 000-0000"
                      value={emergencyContactPhone}
                      onChange={e => setEmergencyContactPhone(e.target.value)}
                    />
                  </FormField>

                  <FormField
                    id="senior-caregiver-rel"
                    label="Relationship"
                    helperText="e.g., Daughter, Son, Neighbor"
                  >
                    <Input
                      id="senior-caregiver-rel"
                      sizeVariant="large"
                      placeholder="e.g., Daughter"
                      value={emergencyContactRelationship}
                      onChange={e => setEmergencyContactRelationship(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex-col sm:flex-row justify-between gap-4">
            <Button
              variant="secondary"
              size="large"
              onClick={() => setCurrentStep(2)}
              leftIcon={<ArrowLeft className="w-5 h-5" />}
              className="w-full sm:w-auto"
            >
              Back
            </Button>
            {hasCaregiver && (
              <Button
                variant="primary"
                size="large"
                onClick={() => handleCompleteRegistration(false)}
                isLoading={isLoading}
                className="w-full sm:w-auto"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                Create Account & Finish
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {/* STEP 4: Finish / Welcome */}
      {currentStep === 4 && (
        <Card variant="highlight" className="text-center p-8 sm:p-12 border-2 border-terracotta-300">
          <div className="w-16 h-16 rounded-full bg-olive-500 text-white flex items-center justify-center mx-auto mb-6 shadow-tactile-md">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-nest-ink tracking-tight mb-2">
            Welcome to NESTCARE, {displayName}.
          </h2>

          <p className="text-xl text-nest-ink-muted max-w-lg mx-auto leading-relaxed mb-8">
            Let's make your medication routine easier to follow. Your care space is prepared.
          </p>

          {/* Connection Code Display if they want to share code with caregiver */}
          <div className="max-w-md mx-auto my-6 text-left">
            <ConnectionCodeDisplay code={generatedCode} />
          </div>

          <div className="pt-4 flex justify-center">
            <Button
              variant="positive"
              size="senior"
              onClick={handleFinishAndEnter}
              rightIcon={<ArrowRight className="w-6 h-6 stroke-[3]" />}
            >
              Continue to my routine
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
