import React, { useState } from "react";
import { Form, Input, Button, message, Divider, Space, Card } from "antd";
import {
  GoogleOutlined,
  TwitterOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  LockOutlined,
  MailOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import { login } from "../../api/authClient";
import { getUserById } from "../../api/userApi"; // ✅ import API kiểm tra quyền admin

const SignInForm: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 📦 Xử lý khi submit form
  const handleSubmit = async (values: any) => {
    const { email, password } = values;

    try {
      setIsLoading(true);

      // 1️⃣ Gọi API login
      const res = await login({ email, password });
      const data = res.data.data;

      // 2️⃣ Lưu token vào localStorage
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("admin_name", data.name);
      localStorage.setItem("admin_email", data.email);

      // messageApi.loading("Đang xác minh quyền truy cập...", 1);

      // 3️⃣ Gọi API lấy thông tin user theo token
      const userRes = await getUserById();
      const user = userRes.data.data;

      // 4️⃣ Kiểm tra quyền admin
      if (!user.is_admin) {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_name");
        localStorage.removeItem("admin_email");

        messageApi.error("Bạn không có quyền admin!");
        return;
      }

      messageApi.success(`Chào mừng Admin ${user.name}!`);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error: any) {
      console.error("❌ Login error:", error);
      messageApi.error(
        error?.response?.data?.message ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      {contextHolder}
      <Card
        style={{
          width: 400,
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontWeight: 700,
            fontSize: 22,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Sign In To Admin
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "gray",
            marginBottom: 24,
          }}
        >
          Enter your email and password to sign in
        </p>

        {/* 🔹 Social Login Buttons */}
        <Space direction="vertical" style={{ width: "100%" }}>
          <Button
            icon={<GoogleOutlined />}
            block
            size="large"
            style={{ borderRadius: 8 }}
          >
            Sign in with Google
          </Button>
          <Button
            icon={<TwitterOutlined />}
            block
            size="large"
            style={{ borderRadius: 8 }}
          >
            Sign in with X
          </Button>
        </Space>

        <Divider plain>Or</Divider>

        {/* 🔹 Login Form */}
        <Form layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập Email!" },
              { type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input
              size="large"
              prefix={<MailOutlined style={{ color: "#999" }} />}
              placeholder="info@gmail.com"
            />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[
              { required: true, message: "Vui lòng nhập mật khẩu!" },
              { min: 6, message: "Mật khẩu tối thiểu 6 ký tự!" },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined style={{ color: "#999" }} />}
              placeholder="Enter your password"
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<LoginOutlined />}
              size="large"
              block
              loading={isLoading}
              style={{ borderRadius: 8, marginTop: 4 }}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SignInForm;
