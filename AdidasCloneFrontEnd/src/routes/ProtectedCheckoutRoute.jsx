// src/routes/ProtectedCheckoutRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useCartStore } from "../store/cartStore";
import { path } from "../common/path/path";

const ProtectedCheckoutRoute = ({ children }) => {
  const { items } = useCartStore();

  // Nếu giỏ hàng trống → chặn truy cập checkout
  if (!items || items.length === 0) {
    return <Navigate to={path.homePage} replace />;
  }

  // Nếu có giỏ hàng → cho phép tiếp tục
  return children;
};

export default ProtectedCheckoutRoute;
