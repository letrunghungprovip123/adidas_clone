import React, { useEffect, useState } from "react";
import { Table, Button, Space, message, Card, Spin, Tag } from "antd";
import {
  FundViewOutlined,
  ReloadOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { getAllOrder } from "../../api/orderApi";

const OrderPages: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // 📦 Gọi API lấy danh sách đơn hàng
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await getAllOrder();
      setOrders(res.data.data || []);
    } catch (error) {
      console.error(error);
      messageApi.error("Không thể tải danh sách đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 🎨 Map màu trạng thái
  const statusColorMap: Record<string, string> = {
    pending: "default",
    processing: "blue",
    shipped: "orange",
    delivered: "green",
    cancelled: "red",
  };

  // ⚙️ Cột bảng
  const columns = [
    {
      title: "Mã đơn hàng",
      dataIndex: "id",
      render: (id: number) => <b>#{id}</b>,
    },
    {
      title: "Địa chỉ giao hàng",
      dataIndex: "shipping_address",
      ellipsis: true,
    },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      render: (price: string) => `${Number(price).toLocaleString()} ₫`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: string) => (
        <Tag color={statusColorMap[status] || "default"}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      render: (date: string) =>
        new Date(date).toLocaleString("vi-VN", { hour12: false }),
    },
    {
      title: "Hành động",
      align: "center" as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<FundViewOutlined />}
          onClick={() => (window.location.href = `/orders/${record.id}`)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  if (loading)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spin size="large" />
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}

      {/* 🔹 Header */}
      <h2
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ShoppingCartOutlined style={{ fontSize: 22, color: "#1677ff" }} />
        Quản lý đơn hàng
      </h2>

      {/* 🔄 Nút refresh */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchOrders}
          loading={loading}
        >
          Làm mới
        </Button>
      </Space>

      {/* 📋 Bảng danh sách đơn hàng */}
      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={orders}
          loading={loading}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </div>
  );
};

export default OrderPages;
