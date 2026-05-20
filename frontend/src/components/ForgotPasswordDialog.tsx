import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkEmailExists, forgotPasswordReset } from "@/lib/api";
import { toast } from "sonner";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("email");
        setEmail("");
        setEmailValid(null);
        setCheckingEmail(false);
        setNewPassword("");
        setConfirmPassword("");
        setSubmitting(false);
      }, 200);
    }
  }, [open]);

  // Debounced email validation
  useEffect(() => {
    if (!email || email.trim() === "" || step !== "email") {
      setEmailValid(null);
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@srmtech\.com$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      setEmailValid(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const exists = await checkEmailExists(email.trim());
        setEmailValid(exists);
      } catch {
        setEmailValid(false);
      } finally {
        setCheckingEmail(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [email, step]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailValid === true) {
      setStep("password");
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!pwdRegex.test(newPassword)) {
      toast.error("Password must be at least 8 characters and include uppercase, lowercase, number and special character");
      return;
    }

    setSubmitting(true);
    try {
      await forgotPasswordReset(email.trim(), newPassword);
      toast.success("Password has been reset successfully. You can now sign in with your new password.");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to reset password"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    setStep("email");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8">
        {/* Close button */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {step === "email" ? (
          <>
            {/* Step 1: Email */}
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#00A99D]/10 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-[#00A99D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#0B1B36]">Forgot Password</h2>
              <p className="text-sm text-slate-600 mt-1">
                Enter your registered email to reset your password
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-xs uppercase tracking-wider font-bold text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@srmtech.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`
                      h-12 rounded-xl border text-sm pr-12
                      ${emailValid === true ? "border-green-400 bg-green-50" : ""}
                      ${emailValid === false ? "border-red-400 bg-red-50" : ""}
                      ${emailValid === null ? "border-slate-200" : ""}
                      focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-0
                    `}
                    autoFocus
                  />
                  {/* Validation Icon */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {checkingEmail && (
                      <svg className="w-5 h-5 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    {!checkingEmail && emailValid === true && (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {!checkingEmail && emailValid === false && email.trim() !== "" && (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                {emailValid === false && email.trim() !== "" && !checkingEmail && (
                  <p className="text-xs text-red-500 mt-1">This email is not registered in our system</p>
                )}
                {emailValid === true && (
                  <p className="text-xs text-green-600 mt-1 font-medium">Email verified ✓</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={emailValid !== true || checkingEmail}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00A99D] to-[#00D9CE] hover:from-[#009688] hover:to-[#00b8a3] text-white text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingEmail ? "Checking..." : "Continue"}
              </Button>
            </form>
          </>
        ) : (
          <>
            {/* Step 2: Create New Password */}
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-[#00A99D]/10 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-[#00A99D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#0B1B36]">Create New Password</h2>
              <p className="text-sm text-slate-600 mt-1">
                Enter your new password for <span className="font-semibold text-[#00A99D]">{email}</span>
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pwd" className="text-xs uppercase tracking-wider font-bold text-slate-700">
                  New Password
                </Label>
                <Input
                  id="new-pwd"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-12 rounded-xl border border-slate-200 text-sm focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-0"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pwd" className="text-xs uppercase tracking-wider font-bold text-slate-700">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-pwd"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border border-slate-200 text-sm focus-visible:ring-2 focus-visible:ring-[#00A99D] focus-visible:ring-offset-0"
                />
              </div>

              {/* Password requirements */}
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <p className="font-medium text-slate-700 mb-1">Password must contain:</p>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${newPassword.length >= 8 ? "bg-green-500" : "bg-slate-300"}`} />
                  <span>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(newPassword) ? "bg-green-500" : "bg-slate-300"}`} />
                  <span>An uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/[a-z]/.test(newPassword) ? "bg-green-500" : "bg-slate-300"}`} />
                  <span>A lowercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/\d/.test(newPassword) ? "bg-green-500" : "bg-slate-300"}`} />
                  <span>A number</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${/[@$!%*?&]/.test(newPassword) ? "bg-green-500" : "bg-slate-300"}`} />
                  <span>A special character (@$!%*?&)</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleGoBack}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#00A99D] to-[#00D9CE] hover:from-[#009688] hover:to-[#00b8a3] text-white text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}