"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { toast } from "react-toastify";

import LoadingSpinnerButton from "../../components/shared/loading-spiner-button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUrl = searchParams.get("callbackUrl") || "/";
  const callbackUrl =
    requestedUrl.startsWith("/") &&
    !requestedUrl.startsWith("//") &&
    !requestedUrl.includes("\\") &&
    !/[\u0000-\u0020]/.test(requestedUrl)
      ? requestedUrl
      : "/";

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
        toast.error(
          "Sign in failed. Check your credentials and account activation.",
        );
        return;
      }
      toast.success("Logged in successfully");
      const accountResponse = await fetch("/api/account", {
        cache: "no-store",
      });
      const account = await accountResponse.json();
      const landing =
        account.user?.role === "ADMINISTRATOR"
          ? "/users"
          : "/";
      router.push(callbackUrl === "/" ? landing : callbackUrl);
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
          {searchParams.get("passwordChanged") === "1" && (
            <p role="status" className="text-sm text-success">
              Password changed. Sign in with your new password.
            </p>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col space-y-4"
          >
            <div className="form-control">
              <label className="label" htmlFor="login-email">
                <span className="label-text">Username or email</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="Your username or email"
                id="login-email"
                autoComplete="username"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={
                  errors.email ? "login-email-error" : undefined
                }
                {...register("email", {
                  required: "Username or email is required",
                })}
              />
              {errors.email && (
                <span
                  id="login-email-error"
                  role="alert"
                  className="text-sm text-red-500"
                >
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
                className="input"
                placeholder="••••••••"
                id="login-password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "login-password-error" : undefined
                }
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && (
                <span
                  id="login-password-error"
                  role="alert"
                  className="text-sm text-red-500"
                >
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

          <p className="mt-4 text-center text-sm text-base-content/70">
            Your administrator or supervisor creates your account. Your access
            level is recognized automatically when you sign in.
          </p>
          <div
            className="mt-3 flex flex-wrap justify-center gap-2 text-xs"
            aria-label="Administrative levels"
          >
            <span className="badge badge-outline">Administrator</span>
            <span className="badge badge-outline">Supervision</span>
            <span className="badge badge-outline">Employee</span>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-6">Loading sign in…</p>}>
      <LoginForm />
    </Suspense>
  );
}
