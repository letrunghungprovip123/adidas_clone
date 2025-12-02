// src/pages/SignUpPage.jsx
import React, { useState } from "react";
import {
  Form,
  Input,
  Button,
  Checkbox,
  Select,
  DatePicker,
  message,
} from "antd";
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { signup } from "../api/authApi";
import dayjs from "dayjs";
import "dayjs/locale/en";
import { useNavigate } from "react-router-dom";
import { path } from "../common/path/path";

export default function SignUpPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const navigate = useNavigate();

  // === VALIDATION RULES ===
  const password = Form.useWatch("password", form) || "";
  const hasMinLength = password.length >= 8;
  const hasUpperLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const isPasswordValid = hasMinLength && hasUpperLower && hasNumber;

  // === HANDLE SUBMIT ===
  const handleFinish = async (values) => {
    try {
      setLoading(true);
      const payload = {
        email: values.email,
        password: values.password,
        name: `${values.firstName} ${values.lastName}`,
        phone: values.phone || "",
        address: "",
      };
      await signup(payload);
      messageApi.success("Đăng ký thành công!");
      setTimeout(() => {
        navigate(path.signInPage);
      }, 1000);
    } catch (err) {
      const msg = err.response?.data?.message || "Đăng ký thất bại";
      messageApi.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {contextHolder}
      {/* Header */}
      <div className="flex items-center justify-center gap-4 mt-6 mb-3">
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

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-4">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-3">Become a Nike Member</h1>
            <p className="text-gray-600">
              Create your Nike Member profile and get first access to the very
              best of Nike products, inspiration and community.
            </p>
          </div>

          {/* === FORM ĐĂNG KÝ === */}
          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={handleFinish}
            className="space-y-4"
          >
            {/* Email */}
            <Form.Item
              name="email"
              rules={[
                {
                  required: true,
                  type: "email",
                  message: "Email không hợp lệ",
                },
              ]}
            >
              <Input size="large" placeholder="Email address*" />
            </Form.Item>

            {/* Password */}
            <Form.Item
              name="password"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
            >
              <Input.Password
                size="large"
                placeholder="Password*"
                iconRender={(visible) =>
                  visible ? <EyeOutlined /> : <EyeInvisibleOutlined />
                }
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </Form.Item>

            {/* Password Requirements */}
            {(passwordFocused || password) && (
              <div className="mb-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {hasMinLength ? (
                    <CheckOutlined className="text-green-600" />
                  ) : (
                    <CloseOutlined className="text-gray-400" />
                  )}
                  <span
                    className={
                      hasMinLength ? "text-green-600" : "text-gray-500"
                    }
                  >
                    Minimum of 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasUpperLower ? (
                    <CheckOutlined className="text-green-600" />
                  ) : (
                    <CloseOutlined className="text-gray-400" />
                  )}
                  <span
                    className={
                      hasUpperLower ? "text-green-600" : "text-gray-500"
                    }
                  >
                    Uppercase and lowercase letters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasNumber ? (
                    <CheckOutlined className="text-green-600" />
                  ) : (
                    <CloseOutlined className="text-gray-400" />
                  )}
                  <span
                    className={hasNumber ? "text-green-600" : "text-gray-500"}
                  >
                    At least one number
                  </span>
                </div>
              </div>
            )}

            {/* Name */}
            <Form.Item
              name="firstName"
              rules={[{ required: true, message: "Vui lòng nhập First Name" }]}
            >
              <Input size="large" placeholder="First Name*" />
            </Form.Item>

            <Form.Item
              name="lastName"
              rules={[{ required: true, message: "Vui lòng nhập Last Name" }]}
            >
              <Input size="large" placeholder="Last Name*" />
            </Form.Item>

            {/* Date of Birth */}
            <Form.Item
              name="dateOfBirth"
              rules={[{ required: true, message: "Vui lòng chọn ngày sinh" }]}
            >
              <DatePicker
                size="large"
                format="DD/MM/YYYY"
                placeholder="Date of Birth*"
                className="w-full"
              />
            </Form.Item>

            {/* Country */}
            <Form.Item name="country" initialValue="Vietnam">
              <Select size="large" placeholder="Select Country">
                <Select.Option value="Vietnam">Vietnam</Select.Option>
                <Select.Option value="Thailand">Thailand</Select.Option>
                <Select.Option value="Singapore">Singapore</Select.Option>
                <Select.Option value="Malaysia">Malaysia</Select.Option>
                <Select.Option value="Philippines">Philippines</Select.Option>
              </Select>
            </Form.Item>

            {/* Gender */}
            <Form.Item
              name="gender"
              rules={[{ required: true, message: "Vui lòng chọn giới tính" }]}
            >
              <Select size="large" placeholder="Gender*">
                <Select.Option value="male">Male</Select.Option>
                <Select.Option value="female">Female</Select.Option>
              </Select>
            </Form.Item>

            {/* Email Preferences */}
            <Form.Item name="receiveEmails" valuePropName="checked">
              <Checkbox>
                Sign up for emails to get updates from Nike on products, offers
                and your Member benefits
              </Checkbox>
            </Form.Item>

            {/* Terms Agreement */}
            <Form.Item
              name="agreeTerms"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(new Error("Bạn phải đồng ý điều khoản")),
                },
              ]}
            >
              <Checkbox>
                I agree to Nike's{" "}
                <a href="#" className="underline hover:no-underline">
                  Privacy Policy
                </a>{" "}
                and{" "}
                <a href="#" className="underline hover:no-underline">
                  Terms of Use
                </a>
                *
              </Checkbox>
            </Form.Item>

            {/* Submit */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                disabled={!isPasswordValid}
                block
                className="bg-black hover:bg-gray-800 rounded-full font-medium"
              >
                Join Us
              </Button>
            </Form.Item>

            {/* Sign In Link */}
            <p className="text-center text-sm text-gray-600 pt-4">
              Already a Member?{" "}
              <button
                type="button"
                onClick={() => {
                  navigate(path.signInPage);
                }}
                className="text-black underline font-medium hover:no-underline"
              >
                Sign In
              </button>
            </p>
          </Form>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-6">
        <div className="max-w-md mx-auto px-6">
          <div className="flex justify-center gap-6 text-xs text-gray-500">
            <a href="#" className="hover:text-black">
              About Nike
            </a>
            <a href="#" className="hover:text-black">
              Help
            </a>
            <a href="#" className="hover:text-black">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-black">
              Terms of Use
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
