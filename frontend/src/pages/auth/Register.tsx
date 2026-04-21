import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Info } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import OAuthButtons from "@/components/OAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api";
import { api } from "@/lib/api";

const registerSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(39, "Username must be at most 39 characters")
      .regex(
        /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
        "Use letters, numbers, and . _ - only; cannot start or end with a separator",
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[a-z]/, "Include at least one lowercase letter")
      .regex(/[0-9]/, "Include at least one number")
      .regex(/[^A-Za-z0-9]/, "Include at least one special character"),
    confirmPassword: z.string(),
    accountType: z.enum(["RESEARCHER", "COMPANY"]),
    terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();

  const [registrationStats, setRegistrationStats] = useState<{
    totalUsers: number;
    recentRegistrations: Array<{ date: string; users: number }>;
  } | null>(null);

  useEffect(() => {
    const fetchRegistrationStats = async () => {
      try {
        const stats = await api.getRegistrationStats();
        setRegistrationStats(stats);
      } catch {
        setRegistrationStats(null);
      }
    };

    fetchRegistrationStats();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: false as unknown as true, accountType: "RESEARCHER" },
  });

  const termsChecked = watch("terms");
  const accountType = watch("accountType");

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.email, data.password, data.username, data.accountType);
      toast.success("Check your email to verify your address before you sign in.");
      navigate("/verify-email");
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Registration failed");
    }
  };

  const subtitle =
    accountType === "COMPANY"
      ? "Organizations verify by email, then complete onboarding and BugHuntr admin approval."
      : "Verify your email, then sign in to hunt programs and track rewards.";

  return (
    <AuthLayout title="Create your account" subtitle={subtitle}>
      {registrationStats ? (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-1 text-center sm:text-left sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-medium text-foreground">Platform activity</h3>
            <p className="text-xs text-muted-foreground">
              {registrationStats.totalUsers.toLocaleString()} members ·{" "}
              {registrationStats.recentRegistrations.reduce((sum, day) => sum + day.users, 0)} joined in the last 30
              days
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <OAuthButtons />

        <div className="my-6 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Tabs
            value={accountType}
            onValueChange={(v) => setValue("accountType", v as "RESEARCHER" | "COMPANY", { shouldValidate: true })}
            className="w-full"
          >
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="RESEARCHER">Researcher</TabsTrigger>
              <TabsTrigger value="COMPANY">Organization</TabsTrigger>
            </TabsList>
          </Tabs>

          {accountType === "COMPANY" ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How organization signup works</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                We do not create your company here. After you verify your email and sign in, you will{" "}
                <strong>create your organization</strong>, submit verification details, and wait for{" "}
                <strong>BugHuntr super-admin approval</strong> before your org can run programs publicly.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register("email")} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" placeholder="coolhunter42" autoComplete="username" {...register("username")} />
            {errors.username ? <p className="text-xs text-destructive">{errors.username.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Strong password"
                autoComplete="new-password"
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
            <p className="text-xs text-muted-foreground">
              At least 8 characters with uppercase, lowercase, a number, and a special character.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={termsChecked}
              onCheckedChange={(checked) => setValue("terms", checked as boolean as true, { shouldValidate: true })}
            />
            <label htmlFor="terms" className="text-sm leading-tight text-muted-foreground">
              I agree to the{" "}
              <Link to="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.terms ? <p className="text-xs text-destructive">{errors.terms.message}</p> : null}

          <Button type="submit" className="h-11 w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create account
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
