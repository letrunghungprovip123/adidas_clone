import React, { useEffect, useState } from "react";
import { Input, message, Spin } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { resetPassword, login } from "../api/authApi";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { getStorage } from "../utils/storages/getStorage";
import { removeStorage } from "../utils/storages/removeStorage";
import { setStorage } from "../utils/storages/setStorage";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { email, clearEmail } = useAuthStore();
  const [password, setPassword] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  // ✅ Kiểm tra nếu user chưa qua verify-otp thì chặn
  useEffect(() => {
    const stage = getStorage("otp_stage");
    if (stage !== "verified" || !email) {
      navigate("/forgot-password");
    }
  }, [email, navigate]);

  // Mutation đặt lại mật khẩu
  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: async () => {
      messageApi.success("Password reset successfully! Logging you in...");
      removeStorage("otp_stage");
      // 🟢 Gọi login luôn
      try {
        const loginRes = await login({ email, password });
        message.success("Login successful!");
        clearEmail();
        // 👉 Tùy bạn, có thể lưu token tại đây:
        setStorage("access_token", loginRes.data.token);
        setTimeout(() => navigate("/"), 1500);
      } catch (err) {
        message.error("Login failed, please sign in manually.");
        navigate("/sign-in");
      }
    },
    onError: (error) => {
      messageApi.error(
        error.response?.data?.message || "Reset password failed!"
      );
    },
  });

  const handleSubmit = () => {
    const new_password = password.trim();
    if (!new_password) {
      message.warning("Please enter a new password!");
      return;
    }
    resetPasswordMutation.mutate({ email, new_password });
  };

  const loading = resetPasswordMutation.isPending;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {contextHolder}
      <div className="w-full max-w-md relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <Spin size="large" />
          </div>
        )}

        <h1 className="text-3xl font-medium text-center mb-8">
          Set a New Password
        </h1>

        <Input.Password
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          iconRender={(visible) =>
            visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
          }
          className="mb-6 !py-3 !px-4"
        />

        <button
          onClick={handleSubmit}
          disabled={!password || loading}
          className="w-full py-3 bg-black text-white rounded-full hover:bg-gray-800 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
