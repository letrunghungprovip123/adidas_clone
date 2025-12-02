import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { message, Input, Spin } from "antd";
import { verifyOtp } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import { getStorage } from "../utils/storages/getStorage";
import { setStorage } from "../utils/storages/setStorage";
import { useAuthStore } from "../store/useAuthStore";

export default function VerifyOtpPage() {
  const { email, clearEmail } = useAuthStore();
  // bạn có thể truyền email từ route hoặc context
  const [otp, setOtp] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();
  useEffect(() => {
    const stage = getStorage("otp_stage");
    if (stage !== "sent") {
      navigate("/forgot-password");
    }
  }, [navigate]);
  // Mutation gọi verifyOtp
  const verifyOtpMutation = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      console.log(data);
      messageApi.success("OTP verified successfully!");
      setStorage("otp_stage", "verified");
      setTimeout(() => {
        navigate("/reset-password");
      }, 1000);
    },
    onError: (error) => {
      console.log(error);
      messageApi.error(
        error.response?.data?.message || "Invalid or expired OTP!"
      );
    },
  });

  const handleVerify = () => {
    if (!otp) {
      message.warning("Please enter your OTP!");
      return;
    }
    verifyOtpMutation.mutate({ email, otp });
  };

  const loading = verifyOtpMutation.isPending;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {contextHolder}

      <div className="w-full max-w-md relative">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
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
        </div>

        {/* Title */}
        <h1 className="text-3xl font-medium text-center mb-3">
          Enter the 6-digit code
        </h1>
        <p className="text-center text-gray-700 mb-8">
          We've sent a code to your email <b>{email}</b>.
        </p>

        {/* OTP Input */}
        <div className="flex flex-col justify-center items-center space-y-6">
          <div className="flex justify-center w-full">
            <Input.OTP
              length={6}
              onChange={(value) => setOtp(value)}
              value={otp}
              size="large"
              className="max-w-[320px] w-full"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={!otp || loading}
            className="w-full py-3 bg-black text-white rounded-full hover:bg-gray-800 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Verify OTP
          </button>
        </div>
      </div>
    </div>
  );
}
