// src/pages/OrderHistoryPage.jsx
import React, { useState,useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getOrderUserId } from "../api/orderApi";
import { path } from "../common/path/path";
import { Empty } from "antd";

import {
  Truck,
  CheckCircle,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Package,
  Clock,
} from "lucide-react";

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);
  // === FETCH ORDERS ===
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-orders"],
    queryFn: getOrderUserId,
    select: (res) => res.data.data,
  });

  const orders = (data || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // === FORMATTERS ===
  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "processing":
        return "bg-orange-500";
      case "shipped":
        return "bg-purple-500";
      case "in_transit":
        return "bg-blue-500";
      case "delivered":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status) => {
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
        return "Unknown";
    }
  };

  // === FILTER ORDERS ===
  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  // === LOADING STATE ===
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={40} className="animate-spin text-gray-600" />
      </div>
    );

  // === ERROR STATE ===
  if (isError)
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <p className="text-gray-600 text-lg">
          Không thể tải danh sách đơn hàng.
        </p>
      </div>
    );

  // === EMPTY STATE ===
  // === EMPTY STATE ===
  if (!orders.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span className="text-gray-600 text-lg">
              Bạn chưa có đơn hàng nào
            </span>
          }
        />
      </div>
    );
  }

  // === STATUS NAVIGATION ===
  const statuses = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "processing", label: "Processing" },
    { key: "shipped", label: "Shipped" },
    { key: "in_transit", label: "In Transit" },
    { key: "delivered", label: "Delivered" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold mb-4 sm:mb-0">Order History</h1>

          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={`px-4 py-2 rounded-full font-medium text-sm transition ${
                  statusFilter === s.key
                    ? "bg-black text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ORDER LIST */}
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const firstItem =
              order.order_items?.[0]?.product_variants?.products || {};
            const image =
              firstItem.product_images?.[0]?.image_url || "/placeholder.jpg";
            const productName = firstItem.name || "Nike Product";

            return (
              <div
                key={order.id}
                onClick={() => navigate(`${path.ordertracking}/${order.id}`)}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="p-6">
                  {/* HEADER */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-6">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Order ID</p>
                        <p className="font-bold text-lg">#{order.id}</p>
                      </div>
                      <div className="h-10 w-px bg-gray-300"></div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Order Date</p>
                        <p className="font-medium flex items-center gap-2">
                          <Calendar size={16} />
                          {new Date(order.created_at).toLocaleDateString(
                            "en-GB"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`px-4 py-2 rounded-full text-white font-medium text-sm ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusText(order.status)}
                      </div>
                      <ChevronRight size={24} className="text-gray-400" />
                    </div>
                  </div>

                  {/* ORDER SUMMARY */}
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={image}
                      alt={productName}
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{productName}</p>
                      <p className="text-sm text-gray-600">
                        {order.order_items.length}{" "}
                        {order.order_items.length > 1 ? "items" : "item"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Total</p>
                      <p className="font-bold text-xl">
                        {formatPrice(order.total_amount)}
                      </p>
                    </div>
                  </div>

                  {/* SHIPPING STATUS */}
                  <div
                    className={`rounded-lg p-4 flex items-center gap-3 ${
                      order.status === "delivered"
                        ? "bg-green-50 border border-green-200"
                        : order.status === "pending"
                        ? "bg-yellow-50 border border-yellow-200"
                        : order.status === "processing"
                        ? "bg-orange-50 border border-orange-200"
                        : order.status === "shipped"
                        ? "bg-purple-50 border border-purple-200"
                        : "bg-blue-50 border border-blue-200"
                    }`}
                  >
                    {order.status === "delivered" ? (
                      <>
                        <CheckCircle
                          size={24}
                          className="text-green-600 flex-shrink-0"
                        />
                        <p className="text-green-900 font-medium">
                          Delivered successfully
                        </p>
                      </>
                    ) : order.status === "pending" ? (
                      <>
                        <Clock
                          size={24}
                          className="text-yellow-600 flex-shrink-0"
                        />
                        <p className="text-yellow-900 font-medium">
                          Order placed, waiting for confirmation
                        </p>
                      </>
                    ) : order.status === "processing" ? (
                      <>
                        <Package
                          size={24}
                          className="text-orange-600 flex-shrink-0"
                        />
                        <p className="text-orange-900 font-medium">
                          Order is being processed
                        </p>
                      </>
                    ) : order.status === "shipped" ? (
                      <>
                        <Truck
                          size={24}
                          className="text-purple-600 flex-shrink-0"
                        />
                        <p className="text-purple-900 font-medium">
                          Shipped from warehouse
                        </p>
                      </>
                    ) : (
                      <>
                        <Truck
                          size={24}
                          className="text-blue-600 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <p className="text-blue-900 font-medium">
                            Shipping to: {order.shipping_address}
                          </p>
                          <p className="text-blue-800 text-sm">
                            Status: {getStatusText(order.status)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
