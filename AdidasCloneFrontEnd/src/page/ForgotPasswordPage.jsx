import React, { useState } from "react";
import { Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { message, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/authApi";
import { setStorage } from "../utils/storages/setStorage";
import { useAuthStore } from "../store/useAuthStore";

export default function ForgotPasswordPage() {
  const setEmailStore = useAuthStore((state) => state.setEmail);

  const [email, setEmail] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  // Mutation gọi API forgot password
  const forgotPasswordMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: (data) => {
      console.log(data);
      messageApi.success("Đã gửi OTP reset thành công!");
      setStorage("otp_stage", "sent");
      setEmailStore(email);      // Sau 3 giây tự chuyển qua trang reset-password
      setTimeout(() => {
        navigate("/verify-otp");
      }, 3000);
    },
    onError: (error) => {
      console.log(error);
      messageApi.error(
        error.response?.data?.message || "Failed to send reset link!"
      );
    },
  });

  const handleSendEmail = () => {
    if (!email) {
      message.warning("Please enter your email!");
      return;
    }
    forgotPasswordMutation.mutate({ email });
  };

  const loading = forgotPasswordMutation.isPending;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {contextHolder}
      <div className="w-full max-w-md relative">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <Spin size="large" />
          </div>
        )}

        {/* Logo */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <svg
            aria-hidden="true"
            className="swoosh-svg"
            focusable="false"
            viewBox="0 0 24 24"
            role="img"
            width="74px"
            height="74px"
            fill="none"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M21 8.719L7.836 14.303C6.74 14.768 5.818 15 5.075 15c-.836 0-1.445-.295-1.819-.884-.485-.76-.273-1.982.559-3.272.494-.754 1.122-1.446 1.734-2.108-.144.234-1.415 2.349-.025 3.345.275.2.666.298 1.147.298.386 0 .829-.063 1.316-.19L21 8.719z"
              clipRule="evenodd"
            ></path>
          </svg>
          <svg
            aria-hidden="true"
            className="css-132diu7"
            focusable="false"
            viewBox="0 0 48 48"
            role="img"
            width="74px"
            height="74px"
            fill="none"
            aria-label="jordan-logo"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M26.363 7.467c-.024-.078-.024-.078-.024-.144a1.933 1.933 0 011.844-2.014 1.94 1.94 0 012.014 1.844 1.927 1.927 0 01-1.834 2.014..."
            ></path>
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-medium text-center mb-3">
          Forgot your password?
        </h1>
        <p className="text-center text-gray-700 mb-8">
          Enter your email to receive a password reset link.
        </p>

        {/* Form */}
        <div className="space-y-6">
          <div className="relative">
            <input
              type="email"
              placeholder="Email address*"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-black pr-12"
            />
            <Mail
              size={20}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
          </div>

          <button
            onClick={handleSendEmail}
            disabled={!email || loading}
            className="w-full py-3 bg-black text-white rounded-full hover:bg-gray-800 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send Reset Link
          </button>
        </div>
      </div>
    </div>
  );
}
