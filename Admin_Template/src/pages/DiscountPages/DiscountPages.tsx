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
  Select,
  InputNumber,
  DatePicker,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  getDiscount,
  createDiscount,
  updateDiscount,
  deleteDiscount,
} from "../../api/discountApi";
import {
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import type { ColumnsType } from "antd/es/table";

const { Option } = Select;

const DiscountPages: React.FC = () => {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any | null>(null);
  const [form] = Form.useForm();

  // 🧩 Message context (AntD v5)
  const [messageApi, contextHolder] = message.useMessage();

  // 📦 Lấy danh sách mã giảm giá
  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await getDiscount();
      setDiscounts(res.data.data);
    } catch (error) {
      messageApi.error("Không thể tải danh sách mã giảm giá!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  // 🔎 Lọc kết quả tìm kiếm
  const filteredDiscounts = discounts.filter(
    (d) =>
      d.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchText.toLowerCase())
  );

  // 🗑️ Xóa mã giảm giá
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa",
      content: "Bạn có chắc muốn xóa mã giảm giá này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteDiscount(id);
          messageApi.success("Đã xóa mã giảm giá!");
          fetchDiscounts();
        } catch {
          messageApi.error("Lỗi khi xóa mã giảm giá!");
        }
      },
    });
  };

  // 💾 Gửi form thêm/sửa
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        valid_from: values.valid_from ? values.valid_from.toISOString() : null,
        valid_to: values.valid_to ? values.valid_to.toISOString() : null,
        is_active: Boolean(values.is_active),
      };

      if (editingDiscount) {
        await updateDiscount(payload, editingDiscount.id);
        messageApi.success("Cập nhật mã giảm giá thành công!");
      } else {
        await createDiscount(payload);
        messageApi.success("Thêm mã giảm giá thành công!");
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchDiscounts();
    } catch (err) {
      console.error(err);
      messageApi.error("Lỗi khi lưu mã giảm giá!");
    }
  };

  // ⚙️ Cấu hình cột bảng
  const columns: ColumnsType<any> = [
    {
      title: "ID",
      dataIndex: "id",
      width: 60,
    },
    {
      title: "Mã",
      dataIndex: "code",
      render: (text: string) => <b>{text}</b>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
    },
    {
      title: "Loại",
      dataIndex: "discount_type",
      render: (val: string) =>
        val === "fixed" ? "Cố định" : val === "percent" ? "Phần trăm" : val,
    },
    {
      title: "Giá trị",
      dataIndex: "value",
      render: (v: any, record: any) =>
        record.discount_type === "percent" ? `${v}%` : `${v} ₫`,
    },
    {
      title: "Giới hạn / Đã dùng",
      render: (_: any, r: any) => `${r.used_count}/${r.usage_limit}`,
    },
    {
      title: "Hiệu lực",
      render: (_: any, r: any) =>
        r.valid_from
          ? `${dayjs(r.valid_from).format("DD/MM/YYYY")} → ${
              r.valid_to
                ? dayjs(r.valid_to).format("DD/MM/YYYY")
                : "Không giới hạn"
            }`
          : "Không giới hạn",
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      align: "center",
      render: (v: boolean) =>
        v ? (
          <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto" />
        ) : (
          <XCircleIcon className="w-6 h-6 text-red-500 mx-auto" />
        ),
    },
    {
      title: "Hành động",
      align: "center",
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingDiscount(record);
              form.setFieldsValue({
                ...record,
                valid_from: record.valid_from ? dayjs(record.valid_from) : null,
                valid_to: record.valid_to ? dayjs(record.valid_to) : null,
              });
              setIsModalOpen(true);
            }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}

      {/* 🏷️ Tiêu đề */}
      <h2
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <TagIcon className="w-6 h-6 text-pink-500" />
        Quản lý mã giảm giá
      </h2>

      {/* 🔍 Thanh tìm kiếm + nút thêm */}
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm kiếm theo mã hoặc mô tả..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 260 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingDiscount(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
        >
          Thêm mã
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchDiscounts}
          loading={loading}
        >
          Làm mới
        </Button>
      </Space>

      {/* 📋 Bảng */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredDiscounts}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {/* 🪟 Modal */}
      <Modal
        title={editingDiscount ? "Chỉnh sửa mã giảm giá" : "Thêm mã giảm giá"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
        confirmLoading={loading}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Mã giảm giá"
            name="code"
            rules={[{ required: true, message: "Vui lòng nhập mã giảm giá!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Mô tả"
            name="description"
            rules={[{ required: true, message: "Vui lòng nhập mô tả!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Loại giảm giá"
            name="discount_type"
            rules={[{ required: true, message: "Vui lòng chọn loại!" }]}
          >
            <Select placeholder="Chọn loại">
              <Option value="fixed">Cố định</Option>
              <Option value="percent">Phần trăm</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Giá trị"
            name="value"
            rules={[{ required: true, message: "Nhập giá trị giảm!" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Giá trị tối thiểu đơn hàng"
            name="min_order_amount"
            rules={[{ required: true, message: "Nhập giá trị tối thiểu!" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Giới hạn sử dụng"
            name="usage_limit"
            rules={[{ required: true, message: "Nhập giới hạn sử dụng!" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Ngày bắt đầu" name="valid_from">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Ngày kết thúc" name="valid_to">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Kích hoạt" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DiscountPages;
