import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { path } from "../../common/path/path";
import { HeartIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { getStorage } from "../../utils/storages/getStorage";
import { message } from "antd";
import { useWishlistStore } from "../../store/wishlistStore";

const CardProduct = ({ product }) => {
  const navigate = useNavigate();
  const {
    exists,
    addItem: addWish,
    removeItem: removeWish,
  } = useWishlistStore();

  const [isLoading, setIsLoading] = useState(false);

  if (!product) return null;

  const imageUrl =
    product.product_images?.[0]?.image_url ||
    "https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/1c904f9f-4b21-4153-8154-7ce68bc4f456/AS+M+NK+DF+TEE+RUN+ENERGY+SP25.png";

  const formattedPrice = Number(product.price).toLocaleString("vi-VN");

  const isWishlisted = exists(product.id);

  const toggleWishlist = async (e) => {
    e.preventDefault();

    const token = getStorage("access_token");
    if (!token) {
      message.warning("Vui lòng đăng nhập để thêm vào danh sách yêu thích");
      navigate(path.signInPage);
      return;
    }

    setIsLoading(true);

    try {
      if (isWishlisted) {
        await removeWish(product.id);
        message.success("Đã xóa khỏi danh sách yêu thích");
      } else {
        await addWish(product.id);
        message.success("Đã thêm vào danh sách yêu thích");
      }
    } catch (error) {
      message.error("Lỗi hệ thống, vui lòng thử lại");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="group relative">
      <figure className="relative">
        <Link
          to={`${path.detailProductPage}/${product.id}`}
          className="block overflow-hidden"
        >
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* JUST-IN BADGE */}
        {product.created_at &&
          new Date(product.created_at) >
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
            <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
              Just In
            </div>
          )}

        {/* WISHLIST BUTTON */}
        <button
          onClick={toggleWishlist}
          disabled={isLoading}
          className={`absolute top-3 right-3 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 z-10 ${
            isLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label={
            isWishlisted ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"
          }
        >
          {isWishlisted ? (
            <HeartSolid className="w-5 h-5 text-red-600" />
          ) : (
            <HeartIcon className="w-5 h-5 text-gray-700 group-hover:text-red-600 transition-colors" />
          )}
        </button>

        <div className="pt-3 pb-1">
          <div>
            <Link
              to={`${path.detailProductPage}/${product.id}`}
              className="block"
            >
              <h3 className="text-lg font-medium text-gray-900 line-clamp-2 hover:text-black">
                {product.name}
              </h3>
            </Link>
            <p className="text-sm text-gray-600 mt-1">
              {product.gender} • {product.brand}
            </p>
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {product.attributes?.color ? `${product.attributes.color} • ` : ""}
            {product.product_images?.length || 1} Colour
            {product.product_images?.length > 1 ? "s" : ""}
          </div>

          <div className="mt-2 font-bold text-lg text-gray-900">
            {formattedPrice} VND
          </div>
        </div>
      </figure>
    </div>
  );
};

export default CardProduct;
