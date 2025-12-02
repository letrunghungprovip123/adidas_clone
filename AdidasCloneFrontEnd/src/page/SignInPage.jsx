import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { login, socialLogin } from "../api/authApi";
import { Button, message } from "antd";
import { useNavigate } from "react-router-dom";
import { path } from "../common/path/path";
import { setStorage } from "../utils/storages/setStorage";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "../firebase/config";
import { Link } from "lucide-react";
import useUserStore from "../store/userStore";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  // === LOGIN TRUYỀN THỐNG ===
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (res) => {
      // console.log("res data nè", res.data);
      setStorage("access_token", res.data.token);
      await useUserStore.getState().fetchUser();
      messageApi.success("Đăng nhập thành công!");
      setTimeout(() => navigate(path.homePage), 1000);
    },
    onError: (error) => {
      messageApi.error(error.response?.data?.message || "Đăng nhập thất bại!");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      return messageApi.warning("Vui lòng nhập đầy đủ email và mật khẩu");
    }
    if (!loginMutation.isPending) {
      loginMutation.mutate({ email, password });
    }
  };

  // === LOGIN MẠNG XÃ HỘI ===
  const socialMutation = useMutation({
    mutationFn: socialLogin,
    onSuccess: async (res) => {
      setStorage("access_token", res.data.data.token);
      await useUserStore.getState().fetchUser();

      messageApi.success("Đăng nhập thành công!");
      setTimeout(() => navigate(-1), 1000);
    },
    onError: (err) => {
      console.error("Social login error:", err);
      messageApi.error("Không thể đăng nhập bằng mạng xã hội!");
    },
  });

  const handleSocialLogin = async (providerName) => {
    try {
      const provider =
        providerName === "google" ? googleProvider : facebookProvider;

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await useUserStore.getState().fetchUser();

      // 👉 Gửi token Firebase lên backend
      socialMutation.mutate({ idToken });
    } catch (error) {
      console.error(`${providerName} login failed:`, error);
      if (error.code === "auth/popup-closed-by-user")
        return messageApi.warning("Cửa sổ đăng nhập đã bị đóng");
      messageApi.error(`Đăng nhập bằng ${providerName} thất bại!`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {contextHolder}
      <div className="w-full max-w-md">
        {/* Nike Logos */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <svg
            aria-hidden="true"
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

        <h1 className="text-3xl font-medium text-center mb-3">
          Enter your email to join us or sign in.
        </h1>

        {/* Login Form */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email*"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-black"
          />
          <input
            type="password"
            placeholder="Password*"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded text-base focus:outline-none focus:border-black"
          />

          <p className="text-sm text-gray-600 py-2">
            By continuing, I agree to Nike’s{" "}
            <a href="#" className="underline hover:text-black">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-black">
              Terms of Use
            </a>
            .
          </p>

          <Button
            type="primary"
            loading={loginMutation.isPending}
            onClick={handleSubmit}
            block
            className="!bg-black !border-black !rounded-full !py-5 hover:!bg-gray-800 text-base font-medium"
          >
            Sign In
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* === SOCIAL LOGIN === */}
        <div className="space-y-3">
          <Button
            onClick={() => handleSocialLogin("google")}
            block
            className="!px-6 !py-5 flex items-center justify-center gap-3 border-2 border-gray-300 rounded-full hover:border-black transition"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span className="font-medium">Continue with Google</span>
          </Button>

          <Button
            onClick={() => handleSocialLogin("facebook")}
            block
            className="!px-6 !py-5 flex items-center justify-center gap-3 border-2 border-gray-300 rounded-full hover:border-black transition"
          >
            <img
              src="https://www.svgrepo.com/show/475647/facebook-color.svg"
              alt="Facebook"
              className="w-5 h-5"
            />
            <span className="font-medium">Continue with Facebook</span>
          </Button>
        </div>
      </div>
      <div className="mt-8 text-center space-y-3">
        <p className="text-sm text-gray-600">
          Not a Member?{" "}
          <div
            onClick={() => {
              navigate(path.signUpPage);
            }}
            href="#"
          >
            <p className="text-black underline font-medium hover:no-underline">
              Join Us
            </p>
          </div>
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div
            onClick={() => {
              navigate(path.forgotpass);
            }}
            href="#"
            className="text-gray-600 hover:text-black underline"
          >
            Forgot Password?
          </div>
          <span className="text-gray-300">|</span>
          <a href="#" className="text-gray-600 hover:text-black underline">
            Help
          </a>
        </div>
      </div>
      ;
    </div>
  );
}
