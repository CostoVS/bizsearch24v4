"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "Password reset link sent!");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to send reset link.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("An unexpected error occurred.");
    }
  };

  return (
    <div className="flex flex-col w-full min-h-[80vh] bg-slate-50 items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 relative overflow-hidden">
        
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>

        <Link href="/login" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-emerald-600 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Login
        </Link>

        <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Reset Password</h1>
        <p className="text-slate-500 mb-8 text-sm">
          Enter your email address below and we&apos;ll send you a link to reset your password.
        </p>

        {status === "success" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center text-emerald-800 animate-fade-in">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="font-semibold text-emerald-950 text-sm leading-relaxed mb-2">{message}</p>
            <p className="text-sm mt-2 text-emerald-700 font-medium font-sans">Please check your inbox and spam folder.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === "error" && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start text-sm">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <p>{message}</p>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={status === "loading" || !email}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {status === "loading" ? "Sending Link..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
