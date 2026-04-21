import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowLeft, ArrowRight, Upload, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'NL', name: 'Netherlands' },
];

const STORAGE_KEY = 'onboarding-verification-draft';

interface VerificationDraft {
  step: number;
  data: {
    legalName: string;
    registrationNumber: string;
    country: string;
    address: string;
    website: string;
    primaryUseCase: string;
    estimatedPrograms: number;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    documents: string[];
    confirmed: boolean;
  };
}

const step1Schema = z.object({
  legalName: z.string().min(1, 'Company name is required').max(200),
  registrationNumber: z.string().max(100).optional(),
  country: z.string().min(2, 'Country is required'),
  address: z.string().min(1, 'Address is required').max(500),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

const step2Schema = z.object({
  primaryUseCase: z.string().min(20, 'Please provide at least 20 characters').max(5000),
  estimatedPrograms: z.number().int().min(1).max(100),
});

const step3Schema = z.object({
  contactName: z.string().min(1, 'Contact name is required').max(200),
  contactEmail: z.string().email('Invalid email').max(255),
  contactPhone: z.string().max(50).optional(),
});

const step4Schema = z.object({
  confirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm the information is accurate' }),
  }),
});

const getSchemaForStep = (step: number) => {
  switch (step) {
    case 1:
      return step1Schema;
    case 2:
      return step2Schema;
    case 3:
      return step3Schema;
    case 4:
      return step4Schema;
    default:
      return step1Schema;
  }
};

const STEPS = [
  { title: 'Company Info', description: 'Basic company details' },
  { title: 'Program Intent', description: 'What will you use BugHuntr for?' },
  { title: 'Contact Details', description: 'How can we reach you?' },
  { title: 'Review & Submit', description: 'Confirm your information' },
];

const OnboardingVerify = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orgSlug, setOrgSlug] = useState<string>('');

  const schema = getSchemaForStep(currentStep);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      legalName: '',
      registrationNumber: '',
      country: '',
      address: '',
      website: '',
      primaryUseCase: '',
      estimatedPrograms: 1,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      documents: [],
      confirmed: false,
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    const loadDraft = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const draft: VerificationDraft = JSON.parse(saved);
          setCurrentStep(draft.step);
          Object.entries(draft.data).forEach(([key, value]) => {
            setValue(key as keyof typeof draft.data, value);
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    if (user?.orgMemberships && user.orgMemberships.length > 0) {
      const slug = user.orgMemberships[0].org.slug;
      setOrgSlug(slug);
      loadDraft();
    }
  }, [user, setValue]);

  useEffect(() => {
    const saveDraft = () => {
      const draft: VerificationDraft = {
        step: currentStep,
        data: watchedValues as VerificationDraft['data'],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    };

    const timeout = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeout);
  }, [currentStep, watchedValues]);

  const nextStep = async () => {
    const isValid = await trigger();
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async () => {
    if (!orgSlug) {
      toast.error('No organization found');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.submitVerification(orgSlug, {
        legalName: watchedValues.legalName,
        registrationNumber: watchedValues.registrationNumber || undefined,
        country: watchedValues.country,
        address: watchedValues.address,
        website: watchedValues.website || undefined,
        primaryUseCase: watchedValues.primaryUseCase,
        estimatedPrograms: watchedValues.estimatedPrograms,
        contactName: watchedValues.contactName,
        contactEmail: watchedValues.contactEmail,
        contactPhone: watchedValues.contactPhone || undefined,
      });

      localStorage.removeItem(STORAGE_KEY);
      toast.success('Verification submitted!');
      navigate('/onboarding/pending');
    } catch (err) {
      toast.error('Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !orgSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/onboarding/pending')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <span className="text-sm text-muted-foreground">Step {currentStep} of 4</span>
        </div>

        <Progress value={(currentStep / 4) * 100} />

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
            <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(currentStep === 4 ? onSubmit : nextStep)}>
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">Legal Company Name *</Label>
                    <Input
                      id="legalName"
                      placeholder="Acme Corporation"
                      {...register('legalName')}
                    />
                    {errors.legalName && (
                      <p className="text-sm text-destructive">{errors.legalName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Business Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      placeholder="Optional"
                      {...register('registrationNumber')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <Controller
                      name="country"
                      control={control}
                      render={({ field }) => (
                        <select
                          id="country"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="">Select country</option>
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.country && (
                      <p className="text-sm text-destructive">{errors.country.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Full Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="Street address, city, state, ZIP"
                      rows={3}
                      {...register('address')}
                    />
                    {errors.address && (
                      <p className="text-sm text-destructive">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Company Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://example.com"
                      {...register('website')}
                    />
                    {errors.website && (
                      <p className="text-sm text-destructive">{errors.website.message}</p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryUseCase">
                      What will you run bug bounty programs for? *
                    </Label>
                    <Textarea
                      id="primaryUseCase"
                      placeholder="Describe your primary use case (minimum 20 characters)"
                      rows={5}
                      {...register('primaryUseCase')}
                    />
                    {errors.primaryUseCase && (
                      <p className="text-sm text-destructive">{errors.primaryUseCase.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimatedPrograms">Estimated number of programs *</Label>
                    <Input
                      id="estimatedPrograms"
                      type="number"
                      min={1}
                      max={100}
                      {...register('estimatedPrograms', { valueAsNumber: true })}
                    />
                    {errors.estimatedPrograms && (
                      <p className="text-sm text-destructive">{errors.estimatedPrograms.message}</p>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input id="contactName" placeholder="Full name" {...register('contactName')} />
                    {errors.contactName && (
                      <p className="text-sm text-destructive">{errors.contactName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="contact@company.com"
                      {...register('contactEmail')}
                    />
                    {errors.contactEmail && (
                      <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="Optional"
                      {...register('contactPhone')}
                    />
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">Company Information</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Company Name:</dt>
                        <dd>{watchedValues.legalName}</dd>
                      </div>
                      {watchedValues.registrationNumber && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Registration #:</dt>
                          <dd>{watchedValues.registrationNumber}</dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Country:</dt>
                        <dd>
                          {COUNTRIES.find((c) => c.code === watchedValues.country)?.name ||
                            watchedValues.country}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Address:</dt>
                        <dd>{watchedValues.address}</dd>
                      </div>
                      {watchedValues.website && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Website:</dt>
                          <dd>{watchedValues.website}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">Program Intent</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Use Case:</dt>
                        <dd className="truncate max-w-[200px]">{watchedValues.primaryUseCase}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Estimated Programs:</dt>
                        <dd>{watchedValues.estimatedPrograms}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">Contact Details</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Name:</dt>
                        <dd>{watchedValues.contactName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Email:</dt>
                        <dd>{watchedValues.contactEmail}</dd>
                      </div>
                      {watchedValues.contactPhone && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Phone:</dt>
                          <dd>{watchedValues.contactPhone}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="flex items-start space-x-2 pt-4">
                    <Controller
                      name="confirmed"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="confirmed"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                      )}
                    />
                    <Label htmlFor="confirmed" className="text-sm leading-none">
                      I confirm the above information is accurate
                    </Label>
                  </div>
                  {errors.confirmed && (
                    <p className="text-sm text-destructive">{errors.confirmed.message}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentStep < 4 ? (
                  <Button type="submit">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit
                        <Check className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingVerify;
