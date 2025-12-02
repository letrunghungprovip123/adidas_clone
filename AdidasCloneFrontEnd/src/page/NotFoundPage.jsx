import React from "react";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { SearchX } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center bg-gray-50 px-6">
      {/* ICON */}
      <SearchX size={85} className="text-gray-400 mb-6" />

      {/* TITLE */}
      <h1 className="text-7xl font-extrabold tracking-widest text-gray-800 mb-2">
        404
      </h1>

      {/* DESCRIPTION */}
      <p className="text-lg text-gray-600 max-w-md mb-8">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
      </p>

      {/* BUTTON */}
      <Button
        type="primary"
        size="large"
        className="rounded-full px-10 py-5 text-lg font-medium"
        onClick={() => navigate("/")}
      >
        Quay về trang chủ
      </Button>
    </div>
  );
}
