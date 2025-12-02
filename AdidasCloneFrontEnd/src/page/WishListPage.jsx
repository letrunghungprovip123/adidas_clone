import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { path } from "../common/path/path";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { message, Spin } from "antd";
import { useWishlistStore } from "../store/wishlistStore";

const WishListPage = () => {
  const {
    wishlist,
    fetchWishlist,
    removeItem,
    loading: wishlistLoading,
  } = useWishlistStore();

  const [recommendedItems] = useState([
    {
      id: 4,
      name: "Nike Air Max Sol",
      category: "Men's Sandals",
      price: 1999199,
      oldPrice: 2499000,
      image:
        "https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600&h=600&fit=crop",
    },
    {
      id: 5,
      name: "Nike ReactX Rejuven8",
      category: "Men's Shoes",
      price: 2069000,
      image:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
    },
    {
      id: 6,
      name: "Nike Everyday Plus Cushioned",
      category: "Training Ankle Socks (3 Pairs)",
      price: 407199,
      oldPrice: 509000,
      image:
        "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&h=600&fit=crop",
    },
    {
      id: 7,
      name: "Air Jordan 1 Mid",
      category: "Men's Shoes",
      price: 4259000,
      image:
        "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=600&fit=crop",
    },
  ]);

  // --- FETCH WISHLIST LÚC PAGE MỞ ---
  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId) => {
    try {
      await removeItem(productId);
      message.success("Đã xóa khỏi danh sách yêu thích");
    } catch {
      message.error("Không thể xóa sản phẩm");
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN").format(price) + "đ";

  // --- LOADING ---
  if (wishlistLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  // --- EMPTY ---
  if (!wishlist?.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-xl text-gray-600">
          Chưa có sản phẩm nào trong danh sách yêu thích
        </p>
        <Link
          to="/"
          className="mt-4 inline-block px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-2 py-12">
        <h1 className="text-3xl font-medium mb-8">
          Favourites ({wishlist.length})
        </h1>

        {/* === DANH SÁCH YÊU THÍCH === */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {wishlist.map((item) => {
            const product = item.products;

            const imageUrl =
              product.product_images?.[0]?.image_url ||
              "https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/1c904f9f-4b21-4153-8154-7ce68bc4f456/AS+M+NK+DF+TEE+RUN+ENERGY+SP25.png";

            return (
              <div key={item.id} className="group relative">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 aspect-square">
                  <Link to={`${path.detailProductPage}/${product.id}`}>
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  {/* NÚT XÓA */}
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-red-50 transition"
                  >
                    <X size={20} className="text-red-600" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-gray-600 text-sm">
                        {product.gender} • {product.brand}
                      </p>
                    </div>
                    <p className="font-medium">{formatPrice(product.price)}</p>
                  </div>
{/* 
                  <button className="w-full border-2 border-black rounded-full py-2 px-5 mt-2 hover:bg-black hover:text-white transition font-medium">
                    Add to Bag
                  </button> */}
                </div>
              </div>
            );
          })}
        </div>

        {/* === GỢI Ý === */}
        <div className="relative mt-[100px]">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-medium">Find Your Next Favourite</h2>
            <div className="flex gap-2">
              <button className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition">
                <ChevronLeft size={24} />
              </button>
              <button className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 transition">
                <ChevronRight size={24} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendedItems.map((item) => (
              <div key={item.id} className="group">
                <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4 aspect-square">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-gray-600 text-sm">{item.category}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{formatPrice(item.price)}</p>
                    {item.oldPrice && (
                      <p className="text-gray-400 line-through text-sm">
                        {formatPrice(item.oldPrice)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WishListPage;
