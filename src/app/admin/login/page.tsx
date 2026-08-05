"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/form/TextField";

export default function AdminLoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const result = await signIn("credentials", {
      ...values,
      redirect: false,
    });

    if (result?.error) {
      setFormError("Invalid email or password.");
      return;
    }
    router.push("/admin/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm rounded-2xl border border-maroon/10 bg-white/70 p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="" width={40} height={40} className="mb-2" />
          <h1 className="font-display text-2xl text-maroon-dark">Admin Login</h1>
          <p className="mt-1 text-sm text-charcoal/60">Chaitanya Stores Dashboard</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextField
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="username"
            error={errors.email?.message}
            {...register("email")}
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />

          {formError && <p className="text-sm text-red-700">{formError}</p>}

          <Button type="submit" disabled={isSubmitting} variant="primary" className="w-full">
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
