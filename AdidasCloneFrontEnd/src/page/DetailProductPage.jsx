import React from "react";
import { useParams } from "react-router-dom";
import GridDetailFirst from "../component/DetailProductComponent/GridDetailFirst";
import GridDetailSecond from "../component/DetailProductComponent/GridDetailSecond";
import DetailProduct from "../component/DetailProductComponent/DetailProduct";
import { notification, Spin } from "antd";
import { Sparkles, Wand2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getProductById, aiGenerator } from "../api/productApi";

const DetailProductPage = () => {
  const { id } = useParams();
  const [api, contextHolder] = notification.useNotification();

  // === 1️⃣ Lấy thông tin sản phẩm ===
  const {
    data: productData,
    isLoading: productLoading,
    isError: productError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id),
    select: (res) => res.data,
  });

  // === 2️⃣ Mutation gọi AI gợi ý ===
  const aiMutation = useMutation({
    mutationFn: aiGenerator,
    onSuccess: (res) => {
      api.open({
        message: (
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 blur-lg opacity-80 animate-pulse"></div>
              <Wand2
                size={20}
                className="group-hover:translate-x-1 transition-transform duration-300"
              />
            </div>
            <span className="font-semibold text-gray-800">Gemini AI Gợi ý</span>
          </div>
        ),
        description: (
          <div className="text-gray-700 text-[15px] leading-relaxed">
            {res?.data?.data || "Gemini đang tạm nghỉ 😅"}
          </div>
        ),
        placement: "topLeft",
        duration: 10,
        style: {
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          background: "linear-gradient(to right, #eff6ff, #f5f3ff, #fdf2f8)",
          border: "1px solid #dbeafe",
        },
        icon: (
          <Sparkles
            size={20}
            className="text-blue-500 animate-pulse relative top-[2px]"
          />
        ),
      });
    },
    onError: (err) => {
      console.error("AI Suggest Error:", err);
      api.error({
        message: "Lỗi khi tạo gợi ý AI",
        description:
          err.response?.data?.message || "Đã xảy ra lỗi, vui lòng thử lại.",
        placement: "topLeft",
      });
    },
  });

  return (
    <>
      {contextHolder}
      <div className="max-w-[1920px] mx-auto px-[48px] grid grid-cols-12 relative">
        <GridDetailFirst aiMutation={aiMutation} />
        <DetailProduct />
        <GridDetailSecond />
      </div>
    </>
  );
};

export default DetailProductPage;
