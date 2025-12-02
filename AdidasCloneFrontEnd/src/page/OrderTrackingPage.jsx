import React from "react";
import {
  Truck,
  CheckCircle,
  MapPin,
  Clock,
  Phone,
  Mail,
  Package,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrderUserIdByOrderId } from "../api/orderApi";
import { Loader2, AlertCircle } from "lucide-react";

export default function OrderTrackingPage() {
  const { id } = useParams();

  // === FETCH ORDER DETAILS ===
  const { data, isLoading, isError } = useQuery({
    queryKey: ["order-details", id],
    queryFn: () => getOrderUserIdByOrderId(id),
    select: (res) => res.data.data,
  });

  // === LOADING STATE ===
  if (isLoading)
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 size={40} className="animate-spin text-gray-600" />
      </div>
    );

  // === ERROR STATE ===
  if (isError || !data)
    return (
      <div className="min-h-screen flex flex-col justify-center items-center">
        <AlertCircle size={40} className="text-red-500 mb-2" />
        <p className="text-gray-600">Không thể tải dữ liệu đơn hàng.</p>
      </div>
    );

  // === DATA MAPPING ===
  const order = data.order;
  const orderItems = data.order_items || [];
  // console.log(order);
  const orderData = {
    orderNumber: `#${order.id}`,
    orderDate: new Date(order.created_at).toLocaleDateString("en-GB"),
    status: order.status,
    estimatedDelivery: "3–5 business days",
    currentLocation: "Nike Distribution Center",
    shippingAddress: {
      name: order.shipping_address?.receiver_name || "Nguyen Van A",
      address: order.shipping_address?.address_line,
      city: order.shipping_address?.city,
      phone: order.shipping_address?.phone || "0123456789",
    },
    carrier: "Nike Express Delivery",
    trackingNumber: `NKE${order.id}VN`,
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

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
        return "Processing";
    }
  };

  // === TRACKING STEPS ===
  const trackingSteps = [
    {
      id: 1,
      title: "Order Placed",
      description: "Your order has been confirmed",
      date: orderData.orderDate,
      completed: true,
    },
    {
      id: 2,
      title: "Processing",
      description: "Your order is being prepared",
      date: orderData.orderDate,
      completed: ["processing", "shipped", "in_transit", "delivered"].includes(
        order.status
      ),
    },
    {
      id: 3,
      title: "Shipped",
      description: "Package has left our facility",
      date: "—",
      completed: ["shipped", "in_transit", "delivered"].includes(order.status),
    },
    {
      id: 4,
      title: "In Transit",
      description: "On the way to your location",
      date: "—",
      completed: ["in_transit", "delivered"].includes(order.status),
      current: order.status === "in_transit",
    },
    {
      id: 5,
      title: "Delivered",
      description: "Package has been delivered",
      date: "—",
      completed: order.status === "delivered",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold mb-8">Track Your Order</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            {/* ORDER INFO */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">
                    Order {orderData.orderNumber}
                  </h2>
                  <p className="text-gray-600">
                    Placed on {orderData.orderDate}
                  </p>
                </div>
                <div className="px-4 py-2 rounded-full text-white font-medium bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 shadow-md animate-[pulse_3s_ease-in-out_infinite]">
                  {getStatusText(orderData.status)}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Truck
                  size={24}
                  className="text-blue-600 flex-shrink-0 mt-1 animate-pulse"
                />
                <div>
                  <p className="font-medium text-blue-900 mb-1">
                    Currently at: {orderData.currentLocation}
                  </p>
                  <p className="text-blue-800 text-sm">
                    Estimated delivery:{" "}
                    <strong>{orderData.estimatedDelivery}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* TRACKING TIMELINE */}
            <div className="bg-white rounded-lg shadow-sm p-6 overflow-hidden">
              <h3 className="text-xl font-bold mb-6">Tracking History</h3>
              <div className="relative">
                {trackingSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex gap-4 pb-8 last:pb-0 relative"
                  >
                    {index < trackingSteps.length - 1 && (
                      <div
                        className={`absolute left-5 top-12 bottom-0 w-0.5 transition-all duration-700 ${
                          step.completed
                            ? "bg-gradient-to-b from-green-400 to-green-600"
                            : "bg-gray-300"
                        }`}
                      ></div>
                    )}

                    {/* ICON WITH GRADIENT GLOW EFFECT */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`absolute inset-0 rounded-full blur-md opacity-70 animate-[spin_6s_linear_infinite] ${
                          step.current
                            ? "bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600"
                            : step.completed
                            ? "bg-gradient-to-r from-green-400 via-lime-400 to-green-600"
                            : "bg-gradient-to-r from-gray-300 to-gray-400 opacity-40"
                        }`}
                      ></div>

                      <div
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                          step.current
                            ? "bg-blue-500 ring-4 ring-blue-200"
                            : step.completed
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      >
                        {step.title === "Order Placed" && (
                          <Package size={20} className="text-white" />
                        )}
                        {step.title === "Processing" && (
                          <Clock size={20} className="text-white" />
                        )}
                        {step.title === "Shipped" && (
                          <Truck size={20} className="text-white" />
                        )}
                        {step.title === "In Transit" && (
                          <Truck size={20} className="text-white" />
                        )}
                        {step.title === "Delivered" && (
                          <CheckCircle size={20} className="text-white" />
                        )}
                      </div>
                    </div>

                    {/* TEXT */}
                    <div className="flex-1 pt-1">
                      <h4
                        className={`font-bold text-lg ${
                          step.current
                            ? "text-blue-600"
                            : step.completed
                            ? "text-green-600"
                            : "text-gray-900"
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-gray-600 text-sm mt-1">
                        {step.description}
                      </p>
                      <p className="text-gray-500 text-sm mt-2 flex items-center gap-1">
                        <Clock size={14} /> {step.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-1 space-y-6">
            {/* ORDER ITEMS */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Package size={24} />
                Items in this order
              </h3>
              <div className="space-y-4">
                {orderItems.map((item) => {
                  const product = item.product_variants.products;
                  const image =
                    product.product_images?.[0]?.image_url ||
                    "/placeholder.jpg";
                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b border-gray-200 last:border-0"
                    >
                      <img
                        src={image}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-gray-600 text-sm">
                          Size: {item.product_variants.size} | Qty:{" "}
                          {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DELIVERY ADDRESS */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Delivery Address
              </h3>
              <div className="text-gray-700 space-y-1">
                <p className="font-medium">{orderData.shippingAddress.name}</p>
                <p>{orderData.shippingAddress.address}</p>
                <p>{orderData.shippingAddress.city}</p>
                <p className="flex items-center gap-2 mt-3">
                  <Phone size={16} /> {orderData.shippingAddress.phone}
                </p>
              </div>
            </div>

            {/* CARRIER */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-4">Carrier Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Carrier</p>
                  <p className="font-medium">{orderData.carrier}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tracking Number</p>
                  <p className="font-medium font-mono text-sm">
                    {orderData.trackingNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* SUPPORT */}
            <div className="bg-gray-100 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4">Need Help?</h3>
              <div className="space-y-3 text-sm">
                <a
                  href="#"
                  className="flex items-center gap-2 text-gray-700 hover:text-black"
                >
                  <Mail size={16} /> Contact Support
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-gray-700 hover:text-black"
                >
                  <Package size={16} /> Return or Exchange
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2 text-gray-700 hover:text-black"
                >
                  <Phone size={16} /> Call: 1800-xxxx
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
