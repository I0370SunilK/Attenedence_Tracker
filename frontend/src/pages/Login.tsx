import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { loginUser } from "@/lib/api";
import { prefetchEmployeeAttendance, prefetchEmployees } from "@/lib/queries";
import { toast } from "sonner";
import ForgotPasswordDialog from "@/components/ForgotPasswordDialog";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [empId, setEmpId] = useState("");
  const [pwd, setPwd] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!empId || !pwd) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);

    try {
      const auth = await loginUser(empId, pwd);
      login(auth);
      if (auth.role === "user") {
        void prefetchEmployeeAttendance(queryClient, auth.user.id);
      } else {
        void prefetchEmployees(queryClient);
      }
      toast.success(
        `Welcome back${auth.role === "admin" ? ", Admin" : ""}`
      );
      nav(auth.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to sign in"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">

      {/* LEFT SIDE - Desktop Only */}
      <div className="hidden lg:flex relative items-center justify-center overflow-hidden bg-[#06152d]">

        {/* Background with enhanced depth */}
        <img
          src="/bgg.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: "cover",
            objectPosition: "center",
            transform: "scale(1.02)",
            filter: "brightness(1.15) contrast(1.1) saturate(1.05)",
          }}
        />

        {/* Enhanced Navy Overlay with depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#071a35]/45 via-[#071a35]/55 to-[#0a1f3a]/50" />

        {/* Premium Cyan Glow Effect */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 35% 50%, rgba(0,169,157,0.15), transparent 65%)",
          }}
        />

        {/* Additional subtle light glow from top */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 20%, rgba(100,200,200,0.05), transparent 50%)",
          }}
        />

        {/* Logo - Premium branding position moved right */}
        <div className="relative z-10 flex items-center justify-end w-full pr-6">
          <img
            src="/srmlogoo.png"
            alt="SRMTech"
            className="w-[420px] max-w-full object-contain drop-shadow-xl"
            style={{
              filter:
                "drop-shadow(0px 0px 24px rgba(0,169,157,0.2)) drop-shadow(0px 10px 20px rgba(0,0,0,0.25)) brightness(1.08) contrast(1.12)",
            }}
          />
        </div>
      </div>

      {/* RIGHT SIDE - Desktop / Mobile Premium Glassmorphism */}
      <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden lg:bg-gradient-to-b lg:from-white lg:via-white lg:to-slate-50">
        
        {/* Mobile/Tablet Background */}
        <div className="absolute inset-0 lg:hidden">
          <img
            src="/bgg.png"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: "center",
              filter: "brightness(0.9) contrast(1.15) saturate(1.1)",
            }}
          />
          
          {/* Dark overlay for glass effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#06152d]/60 via-[#0a1f3a]/70 to-[#081a35]/65" />
          
          {/* Cyan glow effect */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(0,169,157,0.12), transparent 70%)",
            }}
          />
        </div>

        {/* Content Container */}
        <div className="relative z-10 w-full px-4 sm:px-6 py-5 sm:py-10 flex items-center justify-center lg:px-8 lg:py-10 lg:bg-transparent">
          <div className="w-full max-w-sm">

            {/* MOBILE/TABLET: Premium Glassmorphism Card */}
            <div className="lg:hidden">
              {/* Glass Card */}
              <div className="relative bg-[#0a1f3a]/40 backdrop-blur-xl rounded-3xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] pt-2 px-7 pb-7 sm:pt-3 sm:px-9 sm:pb-9">

                {/* Logo at top center */}
                <div className="flex justify-center mb-0">
                  <img
                    src="/srmlogoo.png"
                    alt="SRMTech"
                    className="h-32 w-56 object-contain sm:h-40 sm:w-64"
                    style={{
                      filter: "drop-shadow(0px 0px 16px rgba(0,169,157,0.25))",
                    }}
                  />
                </div>

                {/* Heading */}
                <div className="text-center mb-5">
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                    Sign In
                  </h1>

                  <p className="text-sm sm:text-base text-slate-200 font-medium mb-4">
                    Access your SRMTech attendance dashboard
                  </p>

                  {/* Cyan Accent Divider */}
                  <div className="flex justify-center">
                    <div className="h-1 w-10 bg-gradient-to-r from-[#00A99D] to-[#00D9CE] rounded-full" />
                  </div>
                </div>

                {/* FORM */}
                <form onSubmit={submit} className="space-y-4 sm:space-y-5">

                  {/* Employee ID - Glass Input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <Input
                      id="emp"
                      placeholder="Employee ID"
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                      className="
                        h-12
                        pl-12
                        pr-4
                        rounded-2xl
                        border
                        border-white/20
                        bg-white/10
                        backdrop-blur-sm
                        text-white
                        text-sm
                        placeholder:text-slate-300
                        transition-all
                        duration-300
                        hover:bg-white/15
                        hover:border-white/30
                        focus-visible:ring-2
                        focus-visible:ring-[#00D9CE]
                        focus-visible:ring-offset-0
                        focus-visible:border-[#00D9CE]
                        focus-visible:bg-white/20
                        focus-visible:shadow-[0_0_0_3px_rgba(0,217,206,0.2)]
                      "
                    />
                  </div>

                  {/* Password - Glass Input with Eye Icon */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <Input
                      id="pwd"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      className="
                        h-12
                        pl-12
                        pr-12
                        rounded-2xl
                        border
                        border-white/20
                        bg-white/10
                        backdrop-blur-sm
                        text-white
                        text-sm
                        placeholder:text-slate-300
                        transition-all
                        duration-300
                        hover:bg-white/15
                        hover:border-white/30
                        focus-visible:ring-2
                        focus-visible:ring-[#00D9CE]
                        focus-visible:ring-offset-0
                        focus-visible:border-[#00D9CE]
                        focus-visible:bg-white/20
                        focus-visible:shadow-[0_0_0_3px_rgba(0,217,206,0.2)]
                      "
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-100 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-xs text-slate-300 hover:text-slate-100 transition-colors"
                      onClick={() => setForgotDialogOpen(true)}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="
                      w-full
                      h-12
                      mt-3
                      rounded-2xl
                      bg-gradient-to-r from-[#00A99D] via-[#00D9CE] to-[#00A99D]
                      hover:from-[#009688] hover:via-[#00b8a3] hover:to-[#009688]
                      text-white
                      text-sm
                      font-bold
                      transition-all
                      duration-300
                      disabled:opacity-70
                      disabled:cursor-not-allowed
                    "
                  >
                    {loading ? "Authenticating..." : "Sign In"}
                  </Button>
                </form>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <span className="text-xs text-slate-300 font-medium">OR</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Create Account Link */}
                {false && (
                  <div className="text-center">
                    <p className="text-sm text-slate-200">
                      New to SRMTech?{" "}
                      <Link
                        to="/signup"
                        className="font-bold text-[#00D9CE] hover:text-[#00fdf4] transition-colors"
                      >
                        Create Account
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* DESKTOP: Premium Authentication Card */}
            <div className="hidden lg:block">
              {/* Main Card Container */}
              <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl border border-slate-200/60 shadow-[0_20px_60px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.05)] p-8 sm:p-10">

                {/* Heading Section */}
                <div className="mb-8">
                  <h1 className="text-[41px] sm:text-5xl leading-tight font-bold tracking-tight text-[#0B1B36]">
                    Sign In
                  </h1>

                  <p className="mt-3 text-[15px] sm:text-base text-slate-600 font-medium">
                    Access your SRMTech attendance dashboard
                  </p>

                  {/* Premium Accent Divider */}
                  <div className="mt-5 flex items-center gap-2">
                    <div className="h-1 w-8 bg-gradient-to-r from-[#00A99D] to-[#00D9CE] rounded-full" />
                    <div className="h-1 w-3 bg-[#00A99D]/40 rounded-full" />
                  </div>
                </div>

                {/* FORM */}
                <form onSubmit={submit} className="space-y-6">

                  {/* Employee ID Field */}
                  <div className="space-y-2.5">
                    <Label
                      htmlFor="emp"
                      className="text-xs uppercase tracking-wider font-bold text-slate-700"
                    >
                      Employee ID
                    </Label>

                    <Input
                      id="emp"
                      placeholder="Enter Employee ID"
                      value={empId}
                      onChange={(e) => setEmpId(e.target.value)}
                      className="
                        h-12
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        text-[15px]
                        shadow-sm
                        transition-all
                        duration-200
                        hover:shadow-md
                        hover:border-slate-300
                        focus-visible:ring-2
                        focus-visible:ring-[#00A99D]
                        focus-visible:ring-offset-0
                        focus-visible:border-[#00A99D]
                        focus-visible:shadow-[0_0_0_3px_rgba(0,169,157,0.1)]
                      "
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="pwd"
                        className="text-xs uppercase tracking-wider font-bold text-slate-700"
                      >
                        Password
                      </Label>

                      <button
                        type="button"
                        className="text-xs font-semibold text-[#00A99D] hover:text-[#008b82] transition-colors"
                        onClick={() => setForgotDialogOpen(true)}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <Input
                      id="pwd"
                      type="password"
                      placeholder="••••••••"
                      value={pwd}
                      onChange={(e) => setPwd(e.target.value)}
                      className="
                        h-12
                        rounded-2xl
                        border
                        border-slate-200
                        bg-white
                        text-[15px]
                        shadow-sm
                        transition-all
                        duration-200
                        hover:shadow-md
                        hover:border-slate-300
                        focus-visible:ring-2
                        focus-visible:ring-[#00A99D]
                        focus-visible:ring-offset-0
                        focus-visible:border-[#00A99D]
                        focus-visible:shadow-[0_0_0_3px_rgba(0,169,157,0.1)]
                      "
                    />
                  </div>

                  {/* Premium Login Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="
                      w-full
                      h-12
                      rounded-2xl
                      bg-gradient-to-r from-[#081b3a] via-[#0a2444] to-[#081b3a]
                      hover:from-[#0f2848] hover:via-[#122d4f] hover:to-[#0f2848]
                      text-white
                      text-[15px]
                      font-bold
                      shadow-[0_12px_32px_rgba(8,27,58,0.3),0_0_1px_rgba(0,0,0,0.1)]
                      hover:shadow-[0_16px_40px_rgba(8,27,58,0.4)]
                      transition-all
                      duration-300
                      disabled:opacity-70
                      disabled:cursor-not-allowed
                      mt-2
                    "
                  >
                    {loading ? "Authenticating..." : "Sign In"}
                  </Button>
                </form>

                {/* Premium Divider */}
                <div className="my-7 flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                </div>

                {/* Footer */}
                {false && (
                  <div className="text-center">
                    <p className="text-[14px] text-slate-600">
                      New to SRMTech?{" "}
                      <Link
                        to="/signup"
                        className="font-bold text-[#00A99D] hover:text-[#008b82] transition-colors"
                      >
                        Create Account
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <ForgotPasswordDialog
        open={forgotDialogOpen}
        onOpenChange={setForgotDialogOpen}
      />
    </div>
  );
}
