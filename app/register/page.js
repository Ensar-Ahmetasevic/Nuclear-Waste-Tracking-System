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
      toast.success("Account created. Please sign in.");
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
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className="input input-bordered"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <span className="text-sm text-red-500">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password (min 6)</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 6, message: "At least 6 characters" },
                })}
              />
              {errors.password && (
                <span className="text-sm text-red-500">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Company Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                {...register("companyName", {
                  required: "Company name is required",
                })}
              />
              {errors.companyName && (
                <span className="text-sm text-red-500">
                  {errors.companyName.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Company ID</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                {...register("companyId", {
                  required: "Company ID is required",
                })}
              />
              {errors.companyId && (
                <span className="text-sm text-red-500">
                  {errors.companyId.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Address</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                {...register("address", { required: "Address is required" })}
              />
              {errors.address && (
                <span className="text-sm text-red-500">
                  {errors.address.message}
                </span>
              )}
            </div>

            <label className="label cursor-pointer justify-start space-x-3">
              <input
                type="checkbox"
                className="checkbox"
                {...register("administrator")}
              />
              <span className="label-text">Administrator account</span>
            </label>

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
