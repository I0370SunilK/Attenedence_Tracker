import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DESIGNATIONS, type Employee } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { signupUser } from "@/lib/api";
import { toast } from "sonner";
import { Building2, Info, AlertCircle } from "lucide-react";

const COUNTRY_CODES = ["+91","+1","+44","+61","+65","+971"];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

// Validation patterns
const EMPLOYEE_ID_PATTERN = /^[IA]\d{4}$/;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@srmtech\.com$/;

export default function Signup() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    fullName: "", empId: "", designation: "", team: "",
    email: "",
    city: "", state: "", country: "India",
    password: "", confirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => {
    // Auto-convert Employee ID to uppercase
    const value = k === "empId" ? v.toUpperCase() : v;
    // Trim spaces from email
    const finalValue = k === "email" ? value.trim() : value;
    setForm(f => ({ ...f, [k]: finalValue }));
    // Clear error for this field when user starts typing
    if (errors[k]) {
      setErrors(e => ({ ...e, [k]: "" }));
    }
  };

  // Validation functions
  const validateEmployeeId = (id: string): string => {
    if (!id) return "Employee ID is required";
    if (!EMPLOYEE_ID_PATTERN.test(id)) {
      return "Employee ID must be in format I1234 or A1234";
    }
    return "";
  };

  const validateEmail = (email: string): string => {
    if (!email) return "Email is required";
    if (!EMAIL_PATTERN.test(email)) {
      return "Only srmtech.com email addresses are allowed";
    }
    return "";
  };

  const validatePasswords = (): string => {
    if (!form.password) return "Password is required";
    if (!form.confirm) return "Confirm password is required";
    if (form.password !== form.confirm) {
      return "Passwords do not match";
    }
    return "";
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!form.fullName) newErrors.fullName = "Full name is required";
    if (!form.designation) newErrors.designation = "Designation is required";

    // Employee ID validation
    const empIdError = validateEmployeeId(form.empId);
    if (empIdError) newErrors.empId = empIdError;

    // Email validation
    const emailError = validateEmail(form.email);
    if (emailError) newErrors.email = emailError;

    // Password validation
    const passwordError = validatePasswords();
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix all validation errors");
      return;
    }

    setLoading(true);
    try {
      const auth = await signupUser({
        fullName: form.fullName,
        empId: form.empId,
        designation: form.designation as Employee["designation"],
        team: form.team,
        email: form.email.toLowerCase(),
        city: form.city,
        state: form.state,
        country: form.country,
        password: form.password,
      });
      login(auth);
      toast.success("Account created successfully!");
      nav("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5 mb-8 w-fit">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Attendly</span>
        </Link>

        <div className="card-soft p-8 sm:p-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">Start tracking your work modes in minutes.</p>
          </div>

          <form onSubmit={submit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Full Name" required error={errors.fullName}>
                <Input 
                  value={form.fullName} 
                  onChange={e => set("fullName", e.target.value)} 
                  placeholder="Jane Doe"
                  className={errors.fullName ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </Field>
              <Field label="Employee ID" required error={errors.empId} hint="Format: I1234 or A1234">
                <Input
                  value={form.empId}
                  onChange={e => set("empId", e.target.value)}
                  placeholder="I1234 or A1234"
                  className={errors.empId ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </Field>
              <Field label="Designation" required error={errors.designation}>
                <Select value={form.designation} onValueChange={v => set("designation", v)}>
                  <SelectTrigger className={errors.designation ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Team">
                <Input value={form.team} onChange={e => set("team", e.target.value)} placeholder="Platform" />
              </Field>
              <Field label="Email" required error={errors.email} hint="Must use @srmtech.com domain">
                <Input 
                  type="email" 
                  value={form.email} 
                  onChange={e => set("email", e.target.value)} 
                  placeholder="jane@srmtech.com"
                  className={errors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </Field>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Address</h3>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="City"><Input value={form.city} onChange={e => set("city", e.target.value)} /></Field>
                <Field label="State" error={errors.state}>
                  <Select value={form.state} onValueChange={v => set("state", v)}>
                    <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Country"><Input value={form.country} onChange={e => set("country", e.target.value)} /></Field>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Password" required error={errors.password && !form.confirm ? errors.password : ""}>
                <Input 
                  type="password" 
                  value={form.password} 
                  onChange={e => set("password", e.target.value)}
                  className={errors.password && !form.confirm ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </Field>
              <Field label="Confirm Password" required error={errors.password && form.confirm ? errors.password : ""}>
                <Input 
                  type="password" 
                  value={form.confirm} 
                  onChange={e => set("confirm", e.target.value)}
                  className={errors.password && form.confirm ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
              </Field>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={loading || Object.values(errors).some(e => e !== "")}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" /> {hint}
        </p>
      )}
    </div>
  );
}
