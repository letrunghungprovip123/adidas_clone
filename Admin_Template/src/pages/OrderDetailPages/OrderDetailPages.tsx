import React, { useEffect, useState } from "react";
import {
  Card,
  Row,
  Col,
  Tag,
  Button,
  Modal,
  message,
  Space,
  Table,
  Spin,
} from "antd";
import {
  EditOutlined,
  EnvironmentOutlined,
  UserOutlined,
  DollarOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  CarOutlined,
  RocketOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Timeline } from "antd";
import { getOrderById, updateStatus } from "../../api/orderApi";

const OrderDetailPages: React.FC = () => {
  const id = window.location.pathname.split("/").pop();
  const [order, setOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [messageApi, contextHolder] = message.useMessage();
  console.log(order);
  // 🎨 Màu cho trạng thái
  const statusColorMap: Record<string, string> = {
    pending: "gold",
    processing: "blue",
    shipped: "orange",
    in_transit: "purple",
    delivered: "green",
  };

  const iconsStatus = [
    { key: "pending", color: "gold", icon: <ClockCircleOutlined /> },
    { key: "processing", color: "blue", icon: <SyncOutlined /> },
    { key: "shipped", color: "orange", icon: <RocketOutlined /> },
    { key: "in_transit", color: "purple", icon: <CarOutlined /> },
    { key: "delivered", color: "green", icon: <CheckCircleOutlined /> },
  ];
  const iconsStatus2 = [
    {
      key: "pending",
      icon: <ClockCircleOutlined style={{ color: "gold", fontSize: 28 }} />,
    },
    {
      key: "processing",
      icon: <SyncOutlined style={{ color: "blue", fontSize: 28 }} />,
    },
    {
      key: "shipped",
      icon: <RocketOutlined style={{ color: "orange", fontSize: 28 }} />,
    },
    {
      key: "in_transit",
      icon: <CarOutlined style={{ color: "purple", fontSize: 28 }} />,
    },
    {
      key: "delivered",
      icon: <CheckCircleOutlined style={{ color: "green", fontSize: 28 }} />,
    },
  ];

  // 🧩 Tên hiển thị trạng thái
  const renderStatusName = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "processing":
        return "Processing";
      case "shipped":
        return "Shipped";
      case "in_transit":
        return "In Transit";
      case "delivered":
        return "Delivered";
      default:
        return "Processing";
    }
  };

  // 📦 Lấy thông tin đơn hàng
  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await getOrderById(Number(id));
      const data = res.data.data;
      setOrder(data.result);
      setOrderItems(data.order_items || []);
      setSelectedStatus(data.result.status);
    } catch (err) {
      console.error(err);
      messageApi.error("Không thể tải thông tin đơn hàng!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  //   console.log(id);
  // 💾 Cập nhật trạng thái
  const handleUpdateStatus = async () => {
    try {
      await updateStatus({ status: selectedStatus }, Number(id));
      messageApi.success("Cập nhật trạng thái thành công!");
      setIsModalOpen(false);
      fetchOrder();
    } catch {
      messageApi.error("Lỗi khi cập nhật trạng thái!");
    }
  };

  // 🧾 Cột bảng sản phẩm
  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "product_variants",
      render: (variant: any) => {
        const product = variant.products;
        const img =
          product?.product_images?.[0]?.image_url ||
          "https://via.placeholder.com/80";
        return (
          <Space>
            <img
              src={img}
              alt={product?.name}
              style={{
                width: 60,
                height: 60,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
            <div>
              <b>{product?.name}</b>
              <p style={{ margin: 0, color: "#666" }}>{product?.brand}</p>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Size",
      dataIndex: ["product_variants", "size"],
    },
    {
      title: "Màu sắc",
      dataIndex: ["product_variants", "color"],
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
    },
    {
      title: "Giá",
      dataIndex: "price",
      render: (p: string) => `${Number(p).toLocaleString()} ₫`,
    },
  ];

  if (loading || !order)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spin size="large" />
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}

      {/* 🟦 Trạng thái hiện tại */}
      <Card
        title={<b>Trạng thái hiện tại</b>}
        extra={
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Cập nhật trạng thái
          </Button>
        }
        style={{ borderRadius: 12, marginBottom: 20 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "linear-gradient(to right, #f9fbff, #f0f5ff)",
            border: "1px solid #d6e4ff",
            borderRadius: 12,
            padding: 20,
          }}
        >
          {iconsStatus2.find((item) => item.key === order.status)?.icon}
          <div>
            <p style={{ margin: 0, fontSize: 14, color: "#888" }}>
              Order Status
            </p>
            <h3 style={{ margin: 0, fontWeight: 700 }}>
              {renderStatusName(order.status)}
            </h3>
          </div>
        </div>
      </Card>

      {/* 🧭 Layout 2 cột */}
      <Row gutter={[16, 16]}>
        {/* 🧍 Khách hàng */}
        <Col xs={24} md={12}>
          <Card
            title={<b>Thông tin khách hàng</b>}
            style={{ borderRadius: 12 }}
          >
            <Space direction="vertical">
              <p>
                <UserOutlined /> <b>Tên:</b> {order.users?.name || "N/A"}
              </p>
              <p>
                <b>Email:</b> {order.users?.email || "Không có"}
              </p>
              <p>
                <b>Điện thoại:</b> {order.users?.phone || "Không có"}
              </p>
              <p>
                <EnvironmentOutlined /> <b>Địa chỉ giao hàng:</b>{" "}
                {order.shipping_address.address_line || "161 Hùng Vương"}
              </p>
            </Space>
          </Card>
        </Col>

        {/* 💰 Chi tiết đơn hàng */}
        <Col xs={24} md={12}>
          <Card title={<b>Thông tin đơn hàng</b>} style={{ borderRadius: 12 }}>
            <Space direction="vertical">
              <p>
                <b>Mã đơn hàng:</b> #{order.id}
              </p>
              <p>
                <b>Ngày tạo:</b>{" "}
                {new Date(order.created_at).toLocaleString("vi-VN", {
                  hour12: false,
                })}
              </p>
              <p>
                <b>Phí vận chuyển:</b>{" "}
                {Number(order.shipping_cost).toLocaleString()} ₫
              </p>
              <p>
                <b>Tổng tiền:</b>{" "}
                <Tag color="green" style={{ fontSize: 16 }}>
                  {Number(order.total_amount).toLocaleString()} ₫
                </Tag>
              </p>
            </Space>
          </Card>
        </Col>

        {/* 🛒 Danh sách sản phẩm */}
        <Col span={24}>
          <Card title={<b>Danh sách sản phẩm</b>} style={{ borderRadius: 12 }}>
            <Table
              rowKey="id"
              columns={columns}
              dataSource={orderItems}
              pagination={false}
            />
          </Card>
        </Col>

        {/* 🚚 Theo dõi đơn hàng */}
        <Col span={24}>
          <Card title={<b>Tracking History</b>} style={{ borderRadius: 12 }}>
            <div
              style={{ position: "relative", marginLeft: 30, marginTop: 20 }}
            >
              {[
                {
                  key: "pending",
                  label: "Pending",
                  desc: "Order placed",
                  updatedBy: "System",
                  time: "09:20 6 thg 11, 2024",
                  color: "#faad14",
                  icon: <ClockCircleOutlined />,
                },
                {
                  key: "processing",
                  label: "Processing",
                  desc: "Order confirmed",
                  updatedBy: "Admin Sarah",
                  time: "11:00 6 thg 11, 2024",
                  color: "#1677ff",
                  icon: <InboxOutlined />,
                },
                {
                  key: "shipped",
                  label: "Shipped",
                  desc: "Package shipped via Nike Express",
                  updatedBy: "Admin John",
                  time: "08:00 7 thg 11, 2024",
                  color: "#9254de",
                  icon: <RocketOutlined />,
                },
                {
                  key: "in_transit",
                  label: "In Transit",
                  desc: "Package is on the way",
                  updatedBy: "Delivery Team",
                  time: "13:45 8 thg 11, 2024",
                  color: "#722ed1",
                  icon: <CarOutlined />,
                },
                {
                  key: "delivered",
                  label: "Delivered",
                  desc: "Order delivered successfully",
                  updatedBy: "System",
                  time: "10:15 9 thg 11, 2024",
                  color: "#52c41a",
                  icon: <CheckCircleOutlined />,
                },
              ].map((step, index) => {
                const steps = [
                  "pending",
                  "processing",
                  "shipped",
                  "in_transit",
                  "delivered",
                ];
                const currentIndex = steps.indexOf(order.status);
                const stepIndex = steps.indexOf(step.key);

                const isDone = stepIndex <= currentIndex;

                return (
                  <div
                    key={step.key}
                    style={{ position: "relative", marginBottom: 30 }}
                  >
                    {/* 🔗 Line connector */}
                    {index < 4 && (
                      <div
                        style={{
                          position: "absolute",
                          top: 60,
                          left: 23,
                          width: 4,
                          height: 50,
                          backgroundColor: isDone ? "#52c41a" : "#e5e5e5",
                          borderRadius: 2,
                          zIndex: 1,
                        }}
                      />
                    )}

                    {/* 🟡 Icon circle */}
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: 50,
                        height: 50,
                        borderRadius: "50%",
                        background: isDone ? step.color : "#e5e5e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 24,
                        zIndex: 2,
                        boxShadow: isDone ? `0 0 10px ${step.color}` : "none",
                        transition: "0.3s",
                      }}
                    >
                      {step.icon}
                    </div>

                    {/* 📦 Step content */}
                    <div
                      style={{
                        marginLeft: 80,
                        padding: "14px 20px",
                        backgroundColor: isDone ? "#f9fafb" : "#f5f5f5",
                        borderRadius: 12,
                        border: isDone
                          ? `1px solid ${step.color}30`
                          : "1px solid #f0f0f0",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: 0,
                              color: isDone ? "#000" : "#999",
                            }}
                          >
                            {step.label}
                          </h4>
                          <p
                            style={{
                              margin: "4px 0",
                              color: "#666",
                              fontSize: 14,
                            }}
                          >
                            {step.desc}
                          </p>
                          <p style={{ margin: 0, color: "#999", fontSize: 13 }}>
                            Updated by: {step.updatedBy}
                          </p>
                        </div>
                        <span
                          style={{
                            color: "#999",
                            fontSize: 13,
                            whiteSpace: "nowrap",
                            marginLeft: 12,
                          }}
                        >
                          {step.time}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 🪟 Modal cập nhật trạng thái */}
      <Modal
        title="Cập nhật trạng thái đơn hàng"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleUpdateStatus}
        okText="Lưu thay đổi"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {iconsStatus.map((item) => (
            <Card
              key={item.key}
              onClick={() => setSelectedStatus(item.key)}
              style={{
                cursor: "pointer",
                border:
                  selectedStatus === item.key
                    ? `2px solid ${item.color}`
                    : "1px solid #eee",
                background:
                  selectedStatus === item.key ? "#f0f7ff" : "transparent",
                transition: "0.2s",
              }}
            >
              <Space align="center">
                <Tag color={item.color} style={{ fontSize: 14 }}>
                  {item.icon}
                </Tag>
                <b>{renderStatusName(item.key)}</b>
              </Space>
            </Card>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default OrderDetailPages;
