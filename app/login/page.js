"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { toast } from "react-toastify";

import LoadingSpinnerButton from "../../components/shared/loading-spiner-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUrl = searchParams.get("callbackUrl") || "/";
  const callbackUrl = requestedUrl.startsWith("/") && !requestedUrl.startsWith("//") && !requestedUrl.includes("\\") && !/[\u0000-\u0020]/.test(requestedUrl) ? requestedUrl : "/";

  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result?.ok || result.error) {
        toast.error("Sign in failed. Check your credentials and account activation.");
        return;
      }
      toast.success("Logged in successfully");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-300 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title justify-center text-2xl">Sign in</h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col space-y-4"
          >
            <div className="form-control">
              <label className="label" htmlFor="login-email">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className="input "
                placeholder="your@email.com"
                id="login-email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "login-email-error" : undefined}
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <span id="login-email-error" role="alert" className="text-sm text-red-500">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="login-password">
                <span className="label-text">Password</span>
              </label>
              <input
                type="password"
                className="input "
                placeholder="••••••••"
                id="login-password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "login-password-error" : undefined}
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && (
                <span id="login-password-error" role="alert" className="text-sm text-red-500">
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinnerButton /> : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            No account?{" "}
            <Link className="link link-primary" href="/register">
              Register
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<p className="p-6">Loading sign in…</p>}><LoginForm /></Suspense>;
}
