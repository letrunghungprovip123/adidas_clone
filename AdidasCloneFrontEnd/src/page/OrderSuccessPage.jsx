// src/pages/OrderSuccessPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  Package,
  Truck,
  MapPin,
  CreditCard,
  Mail,
} from "lucide-react";
import { message, Button } from "antd";
import { path } from "../common/path/path";
import { useCartStore } from "../store/cartStore";
import useUserStore from "../store/userStore";
import { addPoints } from "../api/pointsApi"; // <-- bạn nhớ sửa đúng path API

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const [orderDetails, setOrderDetails] = useState(null);
  const { clearCart } = useCartStore();
  const { user } = useUserStore();
  const [messageApi, contextHolder] = message.useMessage();

  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

    useEffect(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("lastSuccessOrder");
    if (!saved) {
      navigate("/", { replace: true });
      return;
    }

    const data = JSON.parse(saved);

    const generatedOrderNumber = `ORD-${new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}-${String(
      Math.floor(10000 + Math.random() * 90000)
    ).padStart(5, "0")}`;

    // Tổ hợp dữ liệu hiển thị
    setOrderDetails({
      orderNumber: generatedOrderNumber,
      orderDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      estimatedDelivery: "November 12 - November 15, 2025",
      email: data.email,
      total: data.total,
      isGuest: data.isGuest,
      items: data.items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        description: item.product.description || "Premium quality product",
        color: item.size.color || "Black/White",
        size: item.size.size || "M",
        price: parseInt(item.product.price),
        quantity: item.quantity,
        image:
          item.product.product_images?.[0]?.image_url ||
          "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300&h=300&fit=crop",
      })),
      shippingAddress: {
        name:
          `${data.firstName} ${data.lastName}`.trim() ||
          data.selectedAddress.receiver_name,
        address: data.selectedAddress.address_line,
        city: `${data.selectedAddress.district}, ${data.selectedAddress.city}`,
        phone: data.phoneNumber || data.selectedAddress.phone,
      },
      paymentMethod: `Credit Card ending in ${
        data.paymentIntentId?.slice(-4) || "4242"
      }`,
    });

    clearCart();
    sessionStorage.removeItem("lastSuccessOrder");

    // Chặn nút back
    window.history.pushState(null, "", window.location.href);
    const blockBack = () =>
      window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", blockBack);
    return () => window.removeEventListener("popstate", blockBack);
  }, [navigate, clearCart]);

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  // ==========================
  // 🎁 NHẬN LOYALTY POINTS
  // ==========================
  const handleClaimPoints = async () => {
    if (!orderDetails || !user) return;

    setClaiming(true);
    try {
      // Ví dụ: 1% tổng tiền
      const points = Math.floor(orderDetails.total * 0.01);

      await addPoints({ points });

      messageApi.success(`🎉 Bạn đã nhận ${points} loyalty points!`);
      setClaimed(true);
    } catch (err) {
      console.error(err);
      messageApi.error("❌ Nhận điểm thất bại, thử lại sau.");
    }
    setClaiming(false);
  };

  // ==========================
  // LOADING
  // ==========================
  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">
            Đang tải thông tin đơn hàng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {contextHolder}

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Success Message */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8 text-center">
            <CheckCircle
              size={80}
              className="text-green-500 mx-auto mb-6"
              strokeWidth={2}
            />

            <h1 className="text-3xl font-bold mb-3">Order Confirmed!</h1>
            <p className="text-gray-600 text-lg mb-6">
              Thank you for your order. We've sent a confirmation email to{" "}
              <span className="font-medium">{orderDetails.email}</span>
            </p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Number</p>
                  <p className="font-medium">{orderDetails.orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Order Date</p>
                  <p className="font-medium">{orderDetails.orderDate}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-green-600 mb-6">
              <Truck size={20} />
              <p className="font-medium">
                Estimated Delivery: {orderDetails.estimatedDelivery}
              </p>
            </div>
            {/* 🎁 Loyalty Points Button */}
            {!orderDetails.isGuest && (
              <button
                onClick={handleClaimPoints}
                disabled={claimed || claiming}
                className={`
    relative px-8 py-3 rounded-full font-medium transition-all ml-[10px]
    ${
      claimed || claiming
        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
        : "bg-blue-500 text-white hover:bg-blue-600 active:scale-[0.97]"
    }
  `}
              >
                {/* Loading spinner */}
                {claiming ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang xử lý...
                  </span>
                ) : claimed ? (
                  "Đã nhận điểm "
                ) : (
                  "Nhận Loyalty Points"
                )}
              </button>
            )}
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Package size={24} />
              Order Details
            </h2>

            <div className="space-y-6">
              {orderDetails.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 pb-6 border-b border-gray-200 last:border-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-lg">{item.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {item.description}
                    </p>
                    <p className="text-gray-600 text-sm">Color: {item.color}</p>
                    <p className="text-gray-600 text-sm">Size: {item.size}</p>
                    <p className="text-gray-600 text-sm">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(item.price)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(orderDetails.total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatPrice(orderDetails.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping & Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <MapPin size={20} />
                Shipping Address
              </h3>
              <div className="text-gray-700 space-y-1">
                <p className="font-medium">
                  {orderDetails.shippingAddress.name}
                </p>
                <p>{orderDetails.shippingAddress.address}</p>
                <p>{orderDetails.shippingAddress.city}</p>
                <p>{orderDetails.shippingAddress.phone}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <CreditCard size={20} />
                Payment Method
              </h3>
              <p className="text-gray-700">{orderDetails.paymentMethod}</p>
            </div>
          </div>

          {/* Email Confirmation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8 flex items-start gap-4">
            <Mail size={24} className="text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">
                Order Confirmation Sent
              </h4>
              <p className="text-blue-800 text-sm">
                We've sent a detailed confirmation email to {orderDetails.email}
                .
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
            <button
              onClick={() => navigate("/")}
              className="px-8 py-3 border-2 border-black rounded-full font-medium hover:bg-black hover:text-white transition"
            >
              Continue Shopping
            </button>

            {!orderDetails.isGuest && (
              <button
                onClick={() => navigate(path.orderhistory)}
                className="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition"
              >
                View Order History
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
