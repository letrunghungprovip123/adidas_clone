import React, { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Modal,
  message,
  Form,
  Switch,
} from "antd";
import { EditOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  EnvelopeOpenIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/solid";
import { getUser, createUser, updateUser, deleteUser } from "../../api/userApi";
import type { User } from "../../type/user";

const UserPages: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form] = Form.useForm();

  // 📦 Lấy danh sách user
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUser();
      setUsers(res.data.data);
    } catch (error) {
      message.error("Không thể tải danh sách user!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 🔎 Lọc search
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  // 🗑️ Xóa user
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa user này?",
      onOk: async () => {
        try {
          await deleteUser(id);
          message.success("Đã xóa user!");
          fetchUsers();
        } catch {
          message.error("Lỗi khi xóa user!");
        }
      },
    });
  };

  // 💾 Gửi form thêm/sửa
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await updateUser(editingUser.id!, values);
        message.success("Cập nhật user thành công!");
      } else {
        await createUser(values);
        message.success("Thêm user thành công!");
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi lưu user!");
    }
  };

  // ⚙️ Cấu hình cột bảng
  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      width: 60,
    },
    {
      title: "Tên",
      dataIndex: "name",
    },
    {
      title: "Email",
      dataIndex: "email",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
    },
    {
      title: "Xác thực Email",
      dataIndex: "is_email_verified",
      render: (val: boolean) =>
        val ? (
          <Space>
            <EnvelopeOpenIcon className="w-5 h-5 text-green-500" />
            <span>Đã xác thực</span>
          </Space>
        ) : (
          <Space>
            <EnvelopeIcon className="w-5 h-5 text-gray-400" />
            <span>Chưa xác thực</span>
          </Space>
        ),
    },
    {
      title: "Quyền hạn",
      dataIndex: "is_admin",
      render: (val: boolean) =>
        val ? (
          <Space>
            <ShieldCheckIcon className="w-5 h-5 text-blue-500" />
            <span>Admin</span>
          </Space>
        ) : (
          <Space>
            <UserIcon className="w-5 h-5 text-gray-600" />
            <span>User</span>
          </Space>
        ),
    },
    {
      title: "Hành động",
      key: "actions",
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingUser(record);
              form.setFieldsValue(record);
              setIsModalOpen(true);
            }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id!)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <UsersIcon className="w-6 h-6 text-blue-500" />
        Quản lý người dùng
      </h2>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 250 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingUser(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
        >
          Thêm user
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredUsers}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {/* Modal thêm/sửa user */}
      <Modal
        title={editingUser ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Tên"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, type: "email", message: "Email không hợp lệ!" },
            ]}
          >
            <Input />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              label="Mật khẩu"
              name="password_hash"
              rules={[{ required: true, message: "Vui lòng nhập mật khẩu!" }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item label="Số điện thoại" name="phone">
            <Input />
          </Form.Item>

          <Form.Item label="Địa chỉ" name="address">
            <Input />
          </Form.Item>

          <Form.Item label="Admin" name="is_admin" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            label="Xác thực Email"
            name="is_email_verified"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserPages;
