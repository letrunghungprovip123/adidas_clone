import { useEffect, useState } from "react";
import { Table, Tag, Button } from "antd";
import { getAllOrder } from "../../api/orderApi"; // cập nhật path đúng
import dayjs from "dayjs";

export default function RecentOrders() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await getAllOrder();
      const orders = res.data.data;

      // Chuẩn hoá data cho bảng
      const formatted = orders.map((order: any) => ({
        key: order.id,
        id: order.id,
        customer: order.users?.name || "Guest",
        email: order.users?.email || order.guest_email || "N/A",
        total: Number(order.total_amount).toLocaleString("vi-VN") + "₫",
        status: order.status,
        createdAt: dayjs(order.created_at).format("DD/MM/YYYY HH:mm"),
      }));

      setData(formatted);
    } catch (error) {
      console.error("Fetch orders failed:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const columns: any = [
    {
      title: "Order ID",
      dataIndex: "id",
      key: "id",
      render: (id: number) => <strong className="text-blue-600">#{id}</strong>,
    },
    {
      title: "Customer",
      dataIndex: "customer",
      key: "customer",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      responsive: ["md"],
    },
    {
      title: "Total Amount",
      dataIndex: "total",
      key: "total",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const color =
          status === "pending"
            ? "orange"
            : status === "shipped"
            ? "blue"
            : status === "delivered"
            ? "green"
            : "red";

        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
  ];

  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-gray-800 rounded-2xl p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Recent Orders
        </h3>

        <Button onClick={fetchOrders}>Refresh</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{ pageSize: 5 }}
      />
    </div>
  );
}
