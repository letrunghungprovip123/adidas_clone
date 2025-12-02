// src/pages/CartCheckoutPage.jsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCartStore } from "../store/cartStore";
import { useNavigate } from "react-router-dom";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../api/addressApi";
import {
  applyDiscount,
  createOrder,
  createPaymentIntent,
  // ⚠️ NHỚ TẠO API NÀY: POST /orders/guest-checkout
  createGuestOrder,
} from "../api/orderApi";
import {
  message,
  Modal,
  Spin,
  Input,
  Button,
  Card,
  Typography,
  Divider,
  Radio,
  Tag,
} from "antd";
import { Edit2, Trash2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { path } from "../common/path/path";
import useUserStore from "../store/userStore";
import { getPointsUser, addPoints } from "../api/pointsApi";
const { Title, Text } = Typography;

const colorHexMap = {
  Vàng: "#FFD700",
  Xanh: "#1E90FF",
  Đỏ: "#FF3B30",
  Xám: "#A9A9A9",
  Đen: "#000000",
  Trắng: "#FFFFFF",
  Hồng: "#FF69B4",
  Cam: "#FFA500",
};

// === STRIPE ===
const stripePromise = loadStripe(
  "pk_test_51QBGanFYlCNp4xiSOqFNnEaOtoIRYPVcOUD3UkQRwFQZ5G8krekDqN2VLyfMDZErWL5p20sHLX8E2Rsld1kq1thJ00Sx2eS2Cj"
);

// Component thanh toán Stripe
const StripeCheckoutForm = ({ clientSecret, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // QUAN TRỌNG: Khi Stripe redirect ra ngoài rồi quay lại,
        // nó sẽ về đúng URL hiện tại (checkout page) → ta sẽ bắt ở useEffect bên dưới
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    setIsProcessing(false);

    if (error) {
      setErrorMessage(error.message || "Thanh toán thất bại");
      return;
    }

    onSuccess(paymentIntent);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement className="p-4 bg-white rounded-lg border border-gray-300" />
      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      <Button
        type="primary"
        htmlType="submit"
        block
        size="large"
        disabled={isProcessing || !stripe || !elements}
        className="rounded-full h-14 text-lg"
      >
        {isProcessing ? "Đang xử lý..." : "Thanh toán ngay"}
      </Button>
    </form>
  );
};

const CartCheckoutPage = () => {
  const { items, getTotal, clearCart } = useCartStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, modalContext] = Modal.useModal();

  const { user } = useUserStore();
  const isMember = !!user;

  // === STRIPE STATE ===
  const [clientSecret, setClientSecret] = useState("");

  // === FORM STATE ===
  const [email, setEmail] = useState(user?.email || "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Member: chọn địa chỉ từ danh sách
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Guest: nhập địa chỉ trực tiếp
  const [guestAddress, setGuestAddress] = useState({
    address_line: "",
    district: "",
    city: "",
  });

  // === MODAL ADDRESS (chỉ dùng cho member) ===
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    receiver_name: "",
    phone: "",
    address_line: "",
    city: "",
    district: "",
  });

  const { data: pointsRes } = useQuery({
    queryKey: ["loyalty-points"],
    queryFn: getPointsUser,
    select: (res) => res.data.data,
    enabled: isMember,
  });

  const totalPoints = pointsRes?.reduce((sum, p) => sum + p.points, 0) || 0;
  const [pointsUsed, setPointsUsed] = useState(0);

  const pointOptions = [100000, 300000, 500000];

  // === LẤY ĐỊA CHỈ (chỉ member mới gọi API) ===
  const { data: addressRes, isLoading: addressLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
    select: (res) => res.data.data || [],
    enabled: isMember, // ✅ guest không gọi
  });

  // === TÍNH TIỀN ===
  const subtotal = getTotal();
  const discountAmount = appliedDiscount?.data?.discount_amount || 0;
  const total = Math.max(0, subtotal - discountAmount - pointsUsed);

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  // === ÁP DỤNG MÃ GIẢM GIÁ ===
  const applyDiscountMutation = useMutation({
    mutationFn: (code) => applyDiscount({ code, order_amount: subtotal }),
    onSuccess: (res) => {
      setAppliedDiscount(res.data);
      setPromoError("");
      setPromoCode("");
    },
    onError: (err) => {
      const msg = err.response?.data?.message || "Mã giảm giá không hợp lệ";
      setPromoError(msg);
    },
  });

  const handleApplyPromo = () => {
    setPromoError("");
    if (!promoCode.trim()) {
      setPromoError("Vui lòng nhập mã");
      return;
    }
    applyDiscountMutation.mutate(promoCode);
  };

  // === PLACE ORDER + STRIPE ===
  const placeOrderMutation = useMutation({
    mutationFn: () => {
      // Validate chung
      if (!email) {
        throw new Error("Vui lòng nhập email");
      }

      // GUEST cần nhập thông tin cá nhân
      if (!isMember) {
        if (!firstName || !lastName || !phoneNumber) {
          throw new Error("Vui lòng điền đầy đủ họ tên và số điện thoại");
        }

        if (
          !guestAddress.address_line ||
          !guestAddress.district ||
          !guestAddress.city
        ) {
          throw new Error("Vui lòng điền đầy đủ địa chỉ giao hàng");
        }
      }

      // MEMBER chỉ cần kiểm tra địa chỉ
      if (isMember && !selectedAddress) {
        throw new Error("Vui lòng chọn địa chỉ giao hàng");
      }

      if (total <= 0) {
        throw new Error("Tổng tiền không hợp lệ");
      }

      return createPaymentIntent(total);
    },
    onSuccess: (res) => {
      setClientSecret(res.data.data.client_secret);
    },
    onError: (err) => {
      console.error("Err:", err);
      messageApi.error(err.message || "Lỗi khi tạo thanh toán");
    },
  });

  const handlePlaceOrder = () => {
    placeOrderMutation.mutate();
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      const isMember = !!user;
      const orderDate = new Date().toLocaleDateString("en-GB");

      // 1️⃣ EMAIL (member lấy user.email, guest lấy form email)
      const finalEmail = isMember ? user.email : email || "guest@example.com";

      // 2️⃣ LƯU SESSION — BẮT BUỘC CÓ TRƯỚC KHI GỌI API
      const cartForSuccess = {
        email: finalEmail,
        items,
        total,
        firstName,
        lastName,
        phoneNumber,
        selectedAddress: isMember ? selectedAddress : guestAddress,
        paymentIntentId: paymentIntent?.id || null,
        orderDate,
        isGuest: !isMember,
      };

      sessionStorage.setItem(
        "lastSuccessOrder",
        JSON.stringify(cartForSuccess)
      );

      // 3️⃣ GỘP MÓN HÀNG
      const orderItems = items.map((item) => ({
        product_variant_id: item.product.product_variants.find(
          (v) => v.size === item.size.size && v.color === item.size.color
        )?.id,
        quantity: item.quantity,
        price: Number(item.product.price),
      }));

      const baseOrderData = {
        items: orderItems,
        total_amount: total - pointsUsed,
        discount_code: appliedDiscount?.data?.code || null,
        shipping_cost: 0,
        points_used: pointsUsed,
      };

      // MEMBER → gửi shipping_address_id
      if (isMember) {
        await createOrder({
          ...baseOrderData,
          shipping_address_id: selectedAddress.id,
        });

        if (pointsUsed > 0) {
          await addPoints({ points: -pointsUsed });
        }
      }
      // GUEST → không gửi address, shipping_address_id = null
      else {
        await createGuestOrder({
          ...baseOrderData,
          guest_email: finalEmail,
          // không gửi address_line, district, city nữa
        });
      }

      // clearCart();
      // console.log("đã clear cart");

      // 5️⃣ CHUYỂN TRANG
      navigate("/order-success", { replace: true });
    } catch (err) {
      console.error("ORDER ERROR:", err);
      messageApi.error("Thanh toán thành công nhưng tạo đơn thất bại!");
    }
  };

  // === QUẢN LÝ ĐỊA CHỈ (MEMBER) ===
  const openAddressModal = (addr = null) => {
    setEditingAddress(addr);
    setAddressForm(
      addr
        ? {
            receiver_name: addr.receiver_name,
            phone: addr.phone,
            address_line: addr.address_line,
            city: addr.city,
            district: addr.district,
          }
        : {
            receiver_name: "",
            phone: "",
            address_line: "",
            city: "",
            district: "",
          }
    );
    setIsAddressModalOpen(true);
  };

  const closeAddressModal = () => {
    setIsAddressModalOpen(false);
    setEditingAddress(null);
  };

  const addAddressMutation = useMutation({
    mutationFn: addAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      messageApi.success("Thêm địa chỉ thành công");
      closeAddressModal();
    },
    onError: () => messageApi.error("Lỗi khi thêm địa chỉ"),
  });

  const updateAddressMutation = useMutation({
    mutationFn: ({ id, data }) => updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      messageApi.success("Cập nhật thành công");
      closeAddressModal();
    },
    onError: () => messageApi.error("Lỗi khi cập nhật địa chỉ"),
  });

  const handleAddressSubmit = () => {
    const { receiver_name, phone, address_line, city, district } = addressForm;
    if (!receiver_name || !phone || !address_line || !city || !district) {
      messageApi.warning("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (editingAddress) {
      updateAddressMutation.mutate({
        id: editingAddress.id,
        data: addressForm,
      });
    } else {
      addAddressMutation.mutate(addressForm);
    }
  };

  const deleteAddrMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      messageApi.success("Đã xóa địa chỉ");
    },
  });

  // Auto chọn địa chỉ đầu tiên (member)
  useEffect(() => {
    if (isMember && addressRes?.length > 0 && !selectedAddress) {
      setSelectedAddress(addressRes[0]);
    }
  }, [isMember, addressRes, selectedAddress]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <p className="text-xl text-gray-600">Giỏ hàng trống</p>
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      {modalContext}
      <div className="min-h-screen bg-gray-50 py-8 lg:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
            {/* LEFT: FORMS */}
            <div className="space-y-6">
              {/* EMAIL + INFO */}
              <Card
                bordered={false}
                className="rounded-2xl shadow-sm bg-white"
                bodyStyle={{ padding: 24 }}
              >
                <Title level={4} className="mb-4">
                  {isMember
                    ? "Thông tin liên hệ"
                    : "Thông tin khách mua (Guest)"}
                </Title>

                {/* Email */}
                <div className="mb-4">
                  <Text className="block mb-1">Email *</Text>
                  <Input
                    type="email"
                    value={email}
                    readOnly={isMember}
                    onChange={(e) => !isMember && setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={
                      isMember
                        ? "bg-gray-50 !px-3 !py-2 !text-base !rounded-lg !h-auto"
                        : " !px-3 !py-2 !text-base !rounded-lg !h-auto"
                    }
                  />
                  {isMember && (
                    <Text type="secondary" className="text-xs !mt-[5px]">
                      Email được lấy từ tài khoản của bạn
                    </Text>
                  )}
                </div>

                {/* Name & Phone */}
                {/* ONLY SHOW FOR GUEST */}
                {!isMember && (
                  <div className="mb-4">
                    <Text className="block mb-2">Họ tên & Số điện thoại *</Text>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
                      <Input
                        className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                      <Input
                        className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>

                    <Input
                      className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                      placeholder="Phone Number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                )}

                {/* DELIVERY ADDRESS */}
                <Divider />

                {isMember ? (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <Title level={4} className="!mb-0">
                        Địa chỉ giao hàng
                      </Title>
                      <Button type="link" onClick={() => openAddressModal()}>
                        Thêm địa chỉ
                      </Button>
                    </div>

                    {addressLoading ? (
                      <div className="flex justify-center py-8">
                        <Spin size="large" />
                      </div>
                    ) : addressRes?.length === 0 ? (
                      <Text type="secondary">
                        Chưa có địa chỉ nào, hãy bấm "Thêm địa chỉ".
                      </Text>
                    ) : (
                      <div className="space-y-3">
                        {addressRes.map((addr) => (
                          <Card
                            key={addr.id}
                            size="small"
                            className={`cursor-pointer transition-all !rounded-xl !p-2 !mb-5
    ${
      selectedAddress?.id === addr.id
        ? "!border-[#73a8f1] !border-[2px] shadow-[0_0_0_2px_rgba(22,119,255,0.15)]"
        : "!border-[#d9d9d9] hover:!border-[#40a9ff]"
    }
  `}
                            onClick={() => setSelectedAddress(addr)}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <Text strong>{addr.receiver_name}</Text>
                                <div className="text-sm text-gray-600">
                                  {addr.phone}
                                </div>
                                <div className="text-sm text-gray-700 mt-1">
                                  {addr.address_line}, {addr.district},{" "}
                                  {addr.city}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<Edit2 size={14} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAddressModal(addr);
                                  }}
                                />
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<Trash2 size={14} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    modal.confirm({
                                      title: "Xóa địa chỉ?",
                                      content:
                                        "Bạn có chắc muốn xóa địa chỉ này?",
                                      okText: "Xóa",
                                      cancelText: "Hủy",
                                      okButtonProps: { danger: true },
                                      onOk: () =>
                                        deleteAddrMutation.mutate(addr.id),
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Title level={4} className="mb-3">
                      Địa chỉ giao hàng (Guest)
                    </Title>
                    <div className="space-y-3">
                      <Input
                        className="!px-3 !py-2 !text-base !mb-[15px] !rounded-lg !h-auto"
                        placeholder="Địa chỉ (số nhà, đường) *"
                        value={guestAddress.address_line}
                        onChange={(e) =>
                          setGuestAddress((prev) => ({
                            ...prev,
                            address_line: e.target.value,
                          }))
                        }
                      />
                      <div className="grid grid-cols-1 space-x-[10px] sm:grid-cols-2 gap-3">
                        <Input
                          className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                          placeholder="Quận/Huyện *"
                          value={guestAddress.district}
                          onChange={(e) =>
                            setGuestAddress((prev) => ({
                              ...prev,
                              district: e.target.value,
                            }))
                          }
                        />
                        <Input
                          className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                          placeholder="Tỉnh/TP *"
                          value={guestAddress.city}
                          onChange={(e) =>
                            setGuestAddress((prev) => ({
                              ...prev,
                              city: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </>
                )}
              </Card>

              {/* SHIPPING + PROMO + PAYMENT */}
              <Card
                bordered={false}
                className="rounded-2xl shadow-sm bg-white !mb-[20px]"
                bodyStyle={{ padding: 24 }}
              >
                {/* SHIPPING */}
                <div className="mb-6">
                  <Title level={4} className="mb-3">
                    Shipping
                  </Title>
                  <Card
                    size="small"
                    className="bg-green-50 border-green-200"
                    bordered
                  >
                    <Text strong className="text-green-800 block">
                      Free Shipping
                    </Text>
                    <Text type="secondary" className="text-green-700">
                      Arrives Fri, Nov 7 - Wed, Nov 12
                    </Text>
                  </Card>
                </div>

                {isMember && (
                  <Card
                    bordered={false}
                    className="rounded-2xl shadow-sm bg-white mb-6"
                    bodyStyle={{ padding: 20 }}
                  >
                    <Title level={4} className="mb-2">
                      Loyalty Points
                    </Title>

                    <p className="text-gray-600 mb-3">
                      Bạn có:{" "}
                      <Tag
                        color="blue"
                        style={{ fontSize: 14, padding: "4px 10px" }}
                      >
                        {totalPoints.toLocaleString()} points
                      </Tag>
                    </p>

                    <Radio.Group
                      value={pointsUsed}
                      onChange={(e) => setPointsUsed(e.target.value)}
                      style={{ width: "100%" }}
                    >
                      <div className="flex flex-col gap-3">
                        {pointOptions.map((opt) => (
                          <Radio
                            key={opt}
                            value={opt}
                            disabled={totalPoints < opt}
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: "1px solid #e5e5e5",
                            }}
                          >
                            Dùng {opt.toLocaleString()} points
                          </Radio>
                        ))}

                        {totalPoints < 100000 && (
                          <Tag color="red" className="mt-2">
                            Bạn không đủ điểm để đổi
                          </Tag>
                        )}
                      </div>
                    </Radio.Group>
                  </Card>
                )}

                {/* PROMO */}

                {isMember && (
                  <div className="mb-6 mt-[20px]">
                    <Title level={4} className="mb-3">
                      Promotion
                    </Title>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                          placeholder="Promo code"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value);
                            setPromoError("");
                          }}
                          onPressEnter={handleApplyPromo}
                          status={promoError ? "error" : ""}
                        />
                        {promoError && (
                          <Text type="danger" className="text-sm">
                            {promoError}
                          </Text>
                        )}
                      </div>
                      <Button
                        className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                        type="default"
                        onClick={handleApplyPromo}
                        disabled={
                          applyDiscountMutation.isPending || !promoCode.trim()
                        }
                      >
                        {applyDiscountMutation.isPending
                          ? "Applying..."
                          : "Apply"}
                      </Button>
                    </div>
                    {appliedDiscount?.data && (
                      <Card
                        size="small"
                        className="mt-3 bg-green-50 border-green-200"
                      >
                        <Text className="text-green-800 text-sm">
                          Applied: <strong>{appliedDiscount.data.code}</strong>{" "}
                          → Saved{" "}
                          <strong>
                            {formatPrice(appliedDiscount.data.discount_amount)}
                          </strong>
                        </Text>
                      </Card>
                    )}
                  </div>
                )}

                {/* PAYMENT */}
                <div>
                  <Title level={4} className="mb-3">
                    Payment
                  </Title>
                  {!clientSecret && (
                    <Button
                      type="primary"
                      block
                      size="large"
                      className="rounded-full h-14 text-lg"
                      onClick={handlePlaceOrder}
                      loading={placeOrderMutation.isPending}
                    >
                      {placeOrderMutation.isPending
                        ? "Chuẩn bị thanh toán..."
                        : "Xác nhận thông tin & tạo thanh toán"}
                    </Button>
                  )}

                  {clientSecret && (
                    <Elements
                      stripe={stripePromise}
                      options={{
                        clientSecret,
                      }}
                    >
                      <StripeCheckoutForm
                        clientSecret={clientSecret}
                        onSuccess={handlePaymentSuccess}
                      />
                    </Elements>
                  )}
                </div>
              </Card>
            </div>

            {/* RIGHT: ORDER SUMMARY */}
            <Card
              bordered={false}
              className="lg:sticky lg:top-6 h-fit rounded-2xl shadow-sm bg-white"
              bodyStyle={{ padding: 24 }}
            >
              <Title level={4} className="mb-4">
                Order Summary
              </Title>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {appliedDiscount?.data && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount ({appliedDiscount.data.code})</span>
                    <span>
                      -{formatPrice(appliedDiscount.data.discount_amount)}
                    </span>
                  </div>
                )}

                {pointsUsed > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Loyalty Points</span>
                    <span>-{formatPrice(pointsUsed)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700">
                  <span>Delivery</span>
                  <span className="text-green-600">Free</span>
                </div>
              </div>
              <Divider />
              <div className="flex justify-between text-lg font-semibold mb-6">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.product.id}-${item.size.size}`}
                    className="flex gap-4"
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={
                          item.product.product_images?.[0]?.image_url ||
                          "/placeholder.jpg"
                        }
                        alt={item.product.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg shadow-sm"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Text strong className="block truncate">
                        {item.product.name}
                      </Text>

                      <Text type="secondary" className="block text-sm mt-1">
                        {item.product.description}
                      </Text>

                      {/* COLOR + SIZE */}
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-700">
                        {/* COLOR DOT */}
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{
                            backgroundColor:
                              colorHexMap[item.size.color] || "#999",
                            borderColor:
                              item.size.color === "Trắng"
                                ? "#ccc"
                                : "transparent",
                          }}
                        ></div>

                        <span>{item.size.color}</span>

                        <span>•</span>

                        <span>Size: {item.size.size}</span>

                        <span>•</span>

                        <span>Qty: {item.quantity}</span>
                      </div>

                      <Text strong className="block mt-1">
                        {formatPrice(item.product.price * item.quantity)}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ADDRESS MODAL (Member) */}
        <Modal
          open={isAddressModalOpen}
          onCancel={closeAddressModal}
          footer={null}
          width={520}
          centered
          maskClosable={false}
        >
          <div className="p-2">
            <Title level={4} className="mb-4">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </Title>
            <div className="space-y-3">
              <Input
                className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                placeholder="Họ và tên *"
                value={addressForm.receiver_name}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    receiver_name: e.target.value,
                  })
                }
              />
              <Input
                className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                placeholder="Số điện thoại *"
                value={addressForm.phone}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, phone: e.target.value })
                }
              />
              <Input
                className="!px-3 !py-2 !text-base !mb-[10px] !rounded-lg !h-auto"
                placeholder="Địa chỉ (số nhà, đường) *"
                value={addressForm.address_line}
                onChange={(e) =>
                  setAddressForm({
                    ...addressForm,
                    address_line: e.target.value,
                  })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  className="!px-3 !py-2 !text-base !rounded-lg !h-auto"
                  placeholder="Quận/Huyện *"
                  value={addressForm.district}
                  onChange={(e) =>
                    setAddressForm({
                      ...addressForm,
                      district: e.target.value,
                    })
                  }
                />
                <Input
                  className="!px-3 !py-2 !text-base !rounded-lg !h-auto"
                  placeholder="Tỉnh/TP *"
                  value={addressForm.city}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, city: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button block onClick={closeAddressModal}>
                  Hủy
                </Button>
                <Button type="primary" block onClick={handleAddressSubmit}>
                  Lưu
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default CartCheckoutPage;
