// src/pages/ProfilePage.jsx
import React, { useState } from "react";
import {
  Card,
  Input,
  Button,
  Modal,
  message,
  Divider,
  Avatar,
  Tag,
  Tooltip,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  HomeOutlined,
  MailOutlined,
  LockOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { updateUser, changePassword } from "../api/authApi";
import useUserStore from "../store/userStore";
import { getPointsUser } from "../api/pointsApi";

export default function ProfilePage() {
  const { user, fetchUser } = useUserStore();

  const { data: pointsRes } = useQuery({
    queryKey: ["loyalty-points"],
    queryFn: getPointsUser,
    select: (res) => res.data.data,
  });

  const totalPoints = pointsRes?.reduce((sum, p) => sum + p.points, 0) || 0;

  const [messageApi, contextHolder] = message.useMessage();

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  const [loadingSave, setLoadingSave] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() ?? "U";

  // =====================
  // HANDLE UPDATE PROFILE
  // =====================
  const handleSaveProfile = async () => {
    try {
      setLoadingSave(true);

      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
      };

      await updateUser(payload, user.id);

      messageApi.success("Cập nhật thông tin thành công!");

      await fetchUser(); // cập nhật Zustand

      setLoadingSave(false);
    } catch (err) {
      console.error(err);
      messageApi.error(
        err.response?.data?.message || "Có lỗi xảy ra! Không thể cập nhật."
      );
      setLoadingSave(false);
    }
  };

  // =====================
  // CHANGE PASSWORD
  // =====================
  const handleSavePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return messageApi.error("Mật khẩu mới không khớp!");
    }

    try {
      setPasswordLoading(true);

      await changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        localStorage.getItem("access_token")
      );

      messageApi.success("Đổi mật khẩu thành công!");

      setPasswordModalOpen(false);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setPasswordLoading(false);
    } catch (err) {
      console.error(err);
      messageApi.error(
        err.response?.data?.message || "Không thể đổi mật khẩu!"
      );
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      {contextHolder}

      <div className="max-w-3xl mx-auto">
        <Card className="rounded-2xl shadow-md p-6 bg-white">
          <div className="flex items-center gap-6 mb-8">
            <Avatar
              size={96}
              style={{
                backgroundColor: "#3b82f6",
                fontSize: "40px",
              }}
            >
              {firstLetter}
            </Avatar>

            <div>
              <h2 className="text-2xl font-semibold">{user?.name}</h2>
              <p className="text-gray-600">
                {user?.social_provider
                  ? `${user.social_provider.toUpperCase()} Account`
                  : "Nike Member"}
              </p>
            </div>
          </div>

          <Divider />

          {/* EMAIL */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              size="large"
              prefix={<MailOutlined />}
              disabled
              value={user.email}
              className="bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* FULL NAME */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <Input
              size="large"
              prefix={<UserOutlined />}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* PHONE */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              size="large"
              prefix={<PhoneOutlined />}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          {/* ADDRESS */}
          {/* LOYALTY POINTS */}
          <div>Loyalty Points:</div>

          <div className="mt-2 flex items-center gap-2 mb-[20px]">
            <Tag color="blue" style={{ fontSize: 14, padding: "4px 10px" }}>
              {totalPoints.toLocaleString()} points
            </Tag>

            <Tooltip
              title={
                <span>
                  Điểm thưởng bạn tích lũy khi mua hàng.
                  <br />
                  <strong>1 point = 1 VNĐ</strong>
                  <br />
                  Có thể dùng để giảm tiền khi thanh toán.
                </span>
              }
            >
              <InfoCircleOutlined
                style={{ color: "#666", cursor: "pointer" }}
              />
            </Tooltip>
          </div>

          {/* BUTTON SAVE */}
          <Button
            type="primary"
            size="large"
            block
            loading={loadingSave}
            onClick={handleSaveProfile}
            className="rounded-full h-12 text-base font-medium"
          >
            Lưu thay đổi
          </Button>

          {/* CHANGE PASSWORD — HIDDEN IF SOCIAL LOGIN */}
          {!user.social_provider && (
            <>
              <Divider />

              <Button
                type="default"
                size="large"
                block
                icon={<LockOutlined />}
                onClick={() => setPasswordModalOpen(true)}
                className="rounded-full h-12 text-base font-medium"
              >
                Đổi mật khẩu
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* PASSWORD MODAL */}
      <Modal
        open={passwordModalOpen}
        onCancel={() => setPasswordModalOpen(false)}
        onOk={handleSavePassword}
        confirmLoading={passwordLoading}
        okText="Lưu mật khẩu"
        title="Thay đổi mật khẩu"
      >
        <div className="space-y-4 mt-3">
          <Input.Password
            size="large"
            placeholder="Mật khẩu hiện tại"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                currentPassword: e.target.value,
              })
            }
          />
          <Input.Password
            size="large"
            placeholder="Mật khẩu mới"
            value={passwordForm.newPassword}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                newPassword: e.target.value,
              })
            }
          />
          <Input.Password
            size="large"
            placeholder="Nhập lại mật khẩu mới"
            value={passwordForm.confirmPassword}
            onChange={(e) =>
              setPasswordForm({
                ...passwordForm,
                confirmPassword: e.target.value,
              })
            }
          />
        </div>
      </Modal>
    </div>
  );
}
