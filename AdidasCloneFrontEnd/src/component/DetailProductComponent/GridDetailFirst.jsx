import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById } from "../../api/productApi";
import { getReviewByProduct, createReview } from "../../api/reviewApi";
import { getStorage } from "../../utils/storages/getStorage";
import { path } from "../../common/path/path";
import Collapse from "../Collapse/Collapse";
import { Sparkles, Wand2 } from "lucide-react";
import { Spin, message, Rate, Input, Button, List, Avatar, Empty } from "antd";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { useCartStore } from "../../store/cartStore";
import useUserStore from "../../store/userStore";
import { useWishlistStore } from "../../store/wishlistStore";

import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";

dayjs.extend(relativeTime);
dayjs.locale("vi");

// =============================================================
// =============== REVIEW SECTION — FULL VERSION ================
// =============================================================
const ReviewSection = ({ productId }) => {
  const queryClient = useQueryClient();
  const { user } = useUserStore();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => getReviewByProduct(productId),
  });

  const mutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      messageApi.success("Đã gửi đánh giá!");
      setRating(0);
      setComment("");
      queryClient.invalidateQueries(["reviews", productId]);
    },
    onError: (err) => {
      messageApi.error(
        err.response?.data?.message || "Không thể gửi đánh giá."
      );
    },
  });

  const handleSubmit = () => {
    if (!user) return messageApi.warning("Vui lòng đăng nhập để đánh giá");
    if (!rating) return messageApi.warning("Vui lòng chọn số sao");

    mutation.mutate({
      product_id: Number(productId),
      rating,
      comment,
      user_id: user.id,
    });
  };

  return (
    <div className="space-y-5">
      {contextHolder}

      {/* FORM */}
      <div className="p-4 border rounded-lg bg-gray-50">
        <h4 className="font-semibold mb-2 text-[16px]">
          Viết đánh giá của bạn
        </h4>
        <Rate value={rating} onChange={setRating} />
        <Input.TextArea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Chia sẻ cảm nhận..."
          rows={3}
          className="mt-2"
        />
        <Button
          type="primary"
          onClick={handleSubmit}
          loading={mutation.isPending}
          className="mt-3"
        >
          Gửi đánh giá
        </Button>
      </div>

      {/* LIST */}
      {isLoading ? (
        <div className="text-center py-4">
          <Spin />
        </div>
      ) : reviews && reviews.length > 0 ? (
        <List
          itemLayout="horizontal"
          dataSource={reviews}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar src={item.user?.avatar}>
                    {item.user?.name?.charAt(0) || "U"}
                  </Avatar>
                }
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.user?.name}</span>
                    <Rate disabled value={item.rating} />
                    <span className="text-xs text-gray-500">
                      {dayjs(item.created_at).fromNow()}
                    </span>
                  </div>
                }
                description={item.comment}
              />
            </List.Item>
          )}
        />
      ) : (
        <Empty description="Chưa có đánh giá nào" />
      )}
    </div>
  );
};

// =============================================================
// ==================== PRODUCT DETAIL PAGE ====================
// =============================================================
const GridDetailFirst = ({ aiMutation }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const queryClient = useQueryClient();

  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [mainImage, setMainImage] = useState("");

  const [messageApi, contextHolder] = message.useMessage();

  // Wishlist store
  const {
    exists,
    addItem: addWish,
    removeItem: removeWish,
  } = useWishlistStore();
  const isWishlisted = exists(id);

  // Query product
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    select: (res) => res.data,
  });

  // AI button
  const handleClickAI = () => {
    aiMutation.mutate({
      name: product.name,
      description: product.description,
    });
  };

  const isLoadingAI = aiMutation.isPending;

  // Wishlist Buttons
  const toggleWishlist = async () => {
    const token = getStorage("access_token");
    if (!token) {
      messageApi.warning("Vui lòng đăng nhập để thêm vào yêu thích");
      return navigate(path.signInPage);
    }

    if (isWishlisted) {
      await removeWish(Number(id));
      messageApi.success("Đã xóa khỏi yêu thích");
    } else {
      await addWish(Number(id));
      messageApi.success("Đã thêm vào yêu thích");
    }
  };

  // Set main image
  useEffect(() => {
    if (product?.product_images?.length > 0) {
      setMainImage(product.product_images[0].image_url);
    }
  }, [product]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );

  if (!product)
    return (
      <div className="text-center py-20 text-red-500">
        Không thể tải sản phẩm
      </div>
    );

  // Colors
  const colors = [...new Set(product.product_variants.map((v) => v.color))];

  // Filter sizes by color
  const filteredSizes = selectedColor
    ? product.product_variants.filter((v) => v.color === selectedColor)
    : [];

  const images = product.product_images.map((img) => img.image_url);

  const price = `${Number(product.price).toLocaleString("vi-VN")}₫`;
  const name = product.name;
  const description = product.description;

  // ====================== RENDER ==========================
  return (
    <>
      {contextHolder}

      {/* === IMAGE AREA === */}
      <div className="col-start-2 col-end-8 row-start-1 row-end-3 pt-[48px]">
        <div className="sticky max-h-[669px] min-h-[455px] pl-[48px] mx-[8px] flex flex-row gap-[16px] justify-end h-[665px] top-[40px]">
          <div className="flex flex-grow gap-[8px] min-w-[60px] max-w-[60px] h-[100%] overflow-y-auto flex-col scrollbar-hide">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setMainImage(img)}
                className={`min-h-[60px] min-w-[60px] rounded-[4px] overflow-hidden border-2 ${
                  mainImage === img
                    ? "border-black"
                    : "border-transparent hover:border-gray-400"
                }`}
              >
                <img src={img} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>

          <div className="w-[535px] h-[665px] bg-[#F5F5F5] rounded-lg overflow-hidden">
            <img src={mainImage} className="object-contain w-full h-full" />
          </div>
        </div>
      </div>

      {/* === PRODUCT INFO === */}
      <div className="max-w-[400px] col-start-8 col-end-[-1] pt-[48px] pl-[24px] self-start">
        <h1 className="text-[20px] font-bold">{name}</h1>
        <h2 className="text-[#707072]">{description}</h2>

        <div className="mb-[32px] mt-[10px]">
          <span className="font-bold text-[20px]">{price}</span>
        </div>

        {/* ================= COLOR ================= */}
        {/* ================= COLOR ================= */}
        <div className="mb-[32px]">
          <p className="font-bold mb-[10px]">Select Color</p>

          <div className="flex flex-wrap gap-[12px]">
            {colors.map((color, i) => {
              // ánh xạ màu từ text -> hex
              const colorMap = {
                Vàng: "#FFD700",
                Xanh: "#1E90FF",
                Đỏ: "#FF3B30",
                Xám: "#A9A9A9",
                Trắng: "#FFFFFF",
                Đen: "#000000",
              };

              const displayColor = colorMap[color] || "#999"; // fallback

              return (
                <div key={i} className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      setSelectedColor(color);
                      setSelectedSize(null);
                    }}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor === color
                        ? "border-gray-500 scale-110"
                        : "border-gray-300 hover:border-gray-500"
                    }`}
                    style={{
                      backgroundColor: displayColor,
                    }}
                  />

                  <span className="text-xs mt-1">{color}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SIZE ================= */}
        <div className="mb-[32px]">
          <p className="font-bold">Select Size</p>

          {!selectedColor ? (
            <p className="text-red-500 text-sm mt-2">
              Vui lòng chọn màu trước khi chọn size.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-[7px] pt-[12px]">
              {filteredSizes.map((variant) => (
                <div
                  key={variant.id}
                  onClick={() => setSelectedSize(variant.size)}
                  className={`cursor-pointer min-w-[91px] h-[48px] flex justify-center items-center border rounded-[4px] ${
                    selectedSize === variant.size
                      ? "border-black bg-gray-50"
                      : "border-[#CACACB] hover:border-black"
                  }`}
                >
                  EU {variant.size}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ================= BUTTONS ================= */}
        <div className="mb-[32px]">
          <button
            onClick={() => {
              if (!selectedColor)
                return messageApi.warning("Vui lòng chọn màu");

              if (!selectedSize)
                return messageApi.warning("Vui lòng chọn size");

              const variant = product.product_variants.find(
                (v) => v.size === selectedSize && v.color === selectedColor
              );

              addItem(product, {
                size: selectedSize,
                color: selectedColor,
                variant_id: variant.id,
              });

              messageApi.success("Đã thêm vào giỏ hàng");
            }}
            className="w-full py-[18px] rounded-[30px] bg-[#111111] text-white mb-[12px]"
          >
            Add To Bag
          </button>

          <button
            onClick={toggleWishlist}
            className={`w-full py-[18px] rounded-[30px] border flex justify-center gap-2 ${
              isWishlisted
                ? "border-red-600 text-red-600"
                : "border-gray-300 hover:border-black"
            }`}
          >
            {isWishlisted ? (
              <HeartSolid className="w-6 h-6" />
            ) : (
              <HeartOutline className="w-6 h-6" />
            )}
            {isWishlisted ? "Added to Favourites" : "Favourite"}
          </button>

          <button
            onClick={handleClickAI}
            disabled={isLoadingAI}
            className="w-full py-[18px] rounded-[30px] text-white mt-[12px] flex items-center justify-center gap-3"
            style={{
              background:
                "linear-gradient(135deg, #06b6d4 0%, #3b82f6 25%, #8b5cf6 50%, #ec4899 75%, #f472b6 100%)",
            }}
          >
            {isLoadingAI ? (
              <Spin />
            ) : (
              <>
                <Sparkles size={20} /> Tạo gợi ý AI <Wand2 size={20} />
              </>
            )}
          </button>
        </div>

        {/* DESCRIPTION */}
        <div className="text-sm text-gray-700 mb-[20px]">
          {product.description}
        </div>

        {/* COLLAPSE */}
        <Collapse
          title="Free Delivery and Returns"
          className="py-[15px] border-b"
        >
          <div className="py-4">
            <p>Your order over 5.000.000₫ gets free delivery.</p>
            <ul className="list-disc list-inside mt-3">
              <li>Standard: 4–5 business days</li>
              <li>Express: 2–4 business days</li>
            </ul>
          </div>
        </Collapse>

        <Collapse title="Reviews" className="py-[15px] border-b">
          <ReviewSection productId={id} />
        </Collapse>
      </div>
    </>
  );
};

export default GridDetailFirst;
