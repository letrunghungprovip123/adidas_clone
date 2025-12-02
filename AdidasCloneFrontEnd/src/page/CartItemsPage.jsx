import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Edit2 } from "lucide-react";
import { useCartStore } from "../store/cartStore";
import useUserStore from "../store/userStore";
import { path } from "../common/path/path";
import { Modal, Radio, Tooltip, Button, message } from "antd";

const CartItemsPage = () => {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, getTotal, updateItem } =
    useCartStore();
  const { user } = useUserStore();

  const subtotal = getTotal();
  const total = subtotal;

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

  const [editItem, setEditItem] = useState(null);

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  const handleCheckout = () => navigate(path.cartCheckout);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Giỏ hàng trống</p>
          <Link
            to="/"
            className="px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800"
          >
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ==== UPDATE MODAL ==== */}
      <Modal
        open={!!editItem}
        onCancel={() => setEditItem(null)}
        footer={null}
        centered
        width={420}
      >
        {editItem && (
          <UpdateModalContent
            editItem={editItem}
            setEditItem={setEditItem}
            updateItem={updateItem}
            colorHexMap={colorHexMap}
          />
        )}
      </Modal>

      {/* ==== CART PAGE ==== */}
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT */}
            <div className="lg:col-span-2">
              <h1 className="text-2xl font-medium mb-8">
                Bag ({items.length})
              </h1>

              <div className="space-y-8">
                {items.map((item) => (
                  <div
                    key={`${item.product.id}-${item.size.size}`}
                    className="flex gap-6 pb-8 border-b border-gray-200"
                  >
                    <Link
                      to={`/detail-product/${item.product.id}`}
                      className="flex-shrink-0"
                    >
                      <img
                        src={
                          item.product.product_images?.[0]?.image_url ||
                          "/placeholder.jpg"
                        }
                        alt={item.product.name}
                        className="w-40 h-40 object-cover rounded"
                      />
                    </Link>

                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium text-lg">
                            {item.product.name}
                          </h3>

                          <p className="text-gray-600 mt-1">
                            {item.product.description}
                          </p>

                          {/* COLOR */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-gray-600">Color:</span>
                            <div
                              className="w-5 h-5 rounded-full border"
                              style={{
                                backgroundColor:
                                  colorHexMap[item.size.color] || "#999",
                                borderColor:
                                  item.size.color === "Trắng"
                                    ? "#ccc"
                                    : "transparent",
                              }}
                            />
                            <span className="text-gray-600">
                              {item.size.color}
                            </span>
                          </div>

                          {/* SIZE */}
                          <p className="text-gray-600 mt-2">
                            Size: {item.size.size}
                          </p>

                          <button
                            onClick={() =>
                              setEditItem({
                                item,
                                newSize: {
                                  size: item.size.size,
                                  color: item.size.color,
                                },
                              })
                            }
                            className="mt-2 text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Edit2 size={14} /> Change
                          </button>
                        </div>

                        <p className="font-medium">
                          {formatPrice(item.product.price)}
                        </p>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex items-center gap-4 mt-6">
                        <div className="flex items-center gap-3 border border-gray-300 rounded-full px-4 py-2">
                          <button
                            onClick={() =>
                              removeItem(item.product.id, item.size.size)
                            }
                          >
                            <Trash2 size={18} />
                          </button>

                          <button
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.size.size,
                                -1
                              )
                            }
                            className="text-xl"
                          >
                            −
                          </button>

                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, item.size.size, 1)
                            }
                            className="text-xl"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT */}
            <div className="lg:col-span-1">
              <div className="bg-white sticky top-8">
                <h2 className="text-2xl font-medium mb-6">Summary</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Estimated Delivery</span>
                    <span className="font-medium">Free</span>
                  </div>
                </div>

                <div className="border-t border-b border-gray-200 py-4 mb-6">
                  <div className="flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-medium">{formatPrice(total)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full inline-flex justify-center items-center bg-black text-white py-4 rounded-full font-medium"
                >
                  {user ? "Member Checkout" : "Guest Checkout"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartItemsPage;

/* ============================================================
   UPDATE MODAL CONTENT
============================================================ */

const UpdateModalContent = ({
  editItem,
  setEditItem,
  updateItem,
  colorHexMap,
}) => {
  const [messageApi, contextHolder] = message.useMessage();

  const variants = editItem.item.product.product_variants;

  const allColors = [...new Set(variants.map((v) => v.color))];

  const { size: selectedSize, color: selectedColor } = editItem.newSize;

  // Các size thuộc màu hiện tại
  const sizesOfColor = variants
    .filter((v) => v.color === selectedColor)
    .map((v) => v.size);

  // Tổ hợp hợp lệ?
  const validCombo =
    selectedColor &&
    selectedSize &&
    variants.some(
      (v) => v.color === selectedColor && v.size === selectedSize
    );

  // Chọn màu
  const handleSelectColor = (color) => {
    const colorSizes = variants
      .filter((v) => v.color === color)
      .map((v) => v.size);

    const newSize = colorSizes.includes(selectedSize) ? selectedSize : null;

    setEditItem((prev) => ({
      ...prev,
      newSize: { color, size: newSize },
    }));

    // if (!newSize) {
    //   messageApi.info("Màu này không có size bạn đã chọn, vui lòng chọn size mới.");
    // }
  };

  // Chọn size
  const handleSelectSize = (size) => {
    const valid = variants.some(
      (v) => v.color === selectedColor && v.size === size
    );

    if (!valid) {
      messageApi.error("Size không tồn tại trong màu này!");
      return;
    }

    setEditItem((prev) => ({
      ...prev,
      newSize: { ...prev.newSize, size },
    }));
  };

  // Update
  const confirmUpdate = () => {
    if (!selectedColor || !selectedSize) {
      messageApi.error("Vui lòng chọn màu và size hợp lệ trước khi cập nhật.");
      return;
    }

    if (!validCombo) {
      messageApi.error("Tổ hợp màu + size không hợp lệ!");
      return;
    }

    updateItem(
      editItem.item.product.id,
      editItem.item.size,
      editItem.newSize
    );

    setEditItem(null);
  };

  return (
    <div className="p-3">
      {contextHolder}

      <h3 className="text-lg font-semibold mb-5">Update Options</h3>

      {/* COLOR */}
      <div className="mb-4">
        <p className="font-medium mb-2">Color</p>
        <div className="flex gap-4 flex-wrap">
          {allColors.map((color) => (
            <Tooltip title={color} key={color}>
              <div
                onClick={() => handleSelectColor(color)}
                className={`w-8 h-8 rounded-full cursor-pointer border transition-all ${
                  selectedColor === color ? "border-black scale-110" : "border-gray-300"
                }`}
                style={{
                  backgroundColor: colorHexMap[color] || "#999",
                  borderColor: color === "Trắng" ? "#ccc" : "transparent",
                }}
              />
            </Tooltip>
          ))}
        </div>
      </div>

      {/* SIZE */}
      <div className="mb-5">
        <p className="font-medium mb-2">Size</p>

        <Radio.Group value={selectedSize}>
          <div className="grid grid-cols-3 gap-2">
            {sizesOfColor.map((size) => (
              <Radio.Button
                key={size}
                value={size}
                onClick={() => handleSelectSize(size)}
                style={{ textAlign: "center" }}
              >
                EU {size}
              </Radio.Button>
            ))}
          </div>
        </Radio.Group>
      </div>

      <div className="flex gap-3 mt-6">
        <Button block onClick={() => setEditItem(null)}>
          Cancel
        </Button>

        <Button type="primary" block onClick={confirmUpdate}>
          Update
        </Button>
      </div>
    </div>
  );
};


