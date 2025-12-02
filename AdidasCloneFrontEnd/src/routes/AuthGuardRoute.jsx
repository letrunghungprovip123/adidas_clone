import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStorage } from "../utils/storages/getStorage";
/**
 * Guard Route — bảo vệ các route yêu cầu đăng nhập
 * @param {JSX.Element} children - Component con được render nếu user có token
 */
export default function AuthGuardRoute({ children }) {
  const location = useLocation();
  const token = getStorage("access_token");

  // Nếu không có token → redirect về trang đăng nhập
  if (!token) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location.pathname }} // lưu path để sau khi đăng nhập có thể redirect lại
      />
    );
  }

  // Nếu có token → cho phép truy cập
  return children;
}
