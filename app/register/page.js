"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import axios from "axios";
import Link from "next/link";
import { toast } from "react-toastify";

import LoadingSpinnerButton from "../../components/shared/loading-spiner-button";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await axios.post("/api/auth/register", data);
      toast.success("Registration received. Your organization access must be activated.");
      router.push("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-300 p-6">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title justify-center text-2xl">Create account</h1>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col space-y-3"
          >
            <div className="form-control">
              <label className="label" htmlFor="register-email">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className="input "
                id="register-email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "register-email-error" : undefined}
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <span id="register-email-error" role="alert" className="text-sm text-red-500">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="register-password">
                <span className="label-text">Password (min 12)</span>
              </label>
              <input
                type="password"
                className="input "
                id="register-password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "register-password-error" : undefined}
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 12, message: "At least 12 characters" },
                })}
              />
              {errors.password && (
                <span id="register-password-error" role="alert" className="text-sm text-red-500">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="register-companyName">
                <span className="label-text">Company Name</span>
              </label>
              <input
                type="text"
                className="input "
                id="register-companyName"
                autoComplete="organization"
                aria-invalid={Boolean(errors.companyName)}
                aria-describedby={errors.companyName ? "register-companyName-error" : undefined}
                {...register("companyName", {
                  required: "Company name is required",
                })}
              />
              {errors.companyName && (
                <span id="register-companyName-error" role="alert" className="text-sm text-red-500">
                  {errors.companyName.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="register-companyId">
                <span className="label-text">Company ID</span>
              </label>
              <input
                type="number"
                className="input "
                id="register-companyId"
                autoComplete="off"
                aria-invalid={Boolean(errors.companyId)}
                aria-describedby={errors.companyId ? "register-companyId-error" : undefined}
                {...register("companyId", {
                  required: "Company ID is required",
                })}
              />
              {errors.companyId && (
                <span id="register-companyId-error" role="alert" className="text-sm text-red-500">
                  {errors.companyId.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label" htmlFor="register-address">
                <span className="label-text">Address</span>
              </label>
              <input
                type="text"
                className="input "
                id="register-address"
                autoComplete="street-address"
                aria-invalid={Boolean(errors.address)}
                aria-describedby={errors.address ? "register-address-error" : undefined}
                {...register("address", { required: "Address is required" })}
              />
              {errors.address && (
                <span id="register-address-error" role="alert" className="text-sm text-red-500">
                  {errors.address.message}
                </span>
              )}
            </div>

            <p className="text-sm">Organization access is activated after registration.</p>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinnerButton /> : "Register"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link className="link link-primary" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
