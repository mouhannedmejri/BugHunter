import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Loader2, ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api";

const TwoFactor = () => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();

  // Credentials passed from Login page via router state
  const credentials = location.state as { email?: string; password?: string } | null;

  useEffect(() => {
    if (!credentials?.email) {
      navigate("/login");
      return;
    }
    inputRefs.current[0]?.focus();
  }, [credentials, navigate]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextEmpty = Math.min(pasted.length, 5);
    inputRefs.current[nextEmpty]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6 || !credentials?.email || !credentials?.password) return;

    try {
      await login(credentials.email, credentials.password, code);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const error = err as ApiError;
      toast.error(error.message || "Invalid TOTP code");
      setDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const isFilled = digits.every((d) => d !== "");

  return (
    <AuthLayout title="Two-factor authentication" subtitle="Enter the 6-digit code from your authenticator app">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-lg border border-border bg-background text-center text-lg font-mono font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20 sm:h-14 sm:w-12"
              />
            ))}
          </div>

          <Button type="submit" className="h-11 w-full" disabled={!isFilled || isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Lost access?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Use a backup code
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default TwoFactor;
