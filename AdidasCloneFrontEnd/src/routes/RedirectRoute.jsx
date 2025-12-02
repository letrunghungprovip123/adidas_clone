import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getStorage } from "../utils/storages/getStorage";
import { path } from "../common/path/path";
/**
 * Guard Route — bảo vệ các route yêu cầu đăng nhập
 * @param {JSX.Element} children - Component con được render nếu user có token
 */
export default function RedirectRoute({ children }) {
  const location = useLocation();
  const token = getStorage("access_token");

  if (token) {
    return <Navigate to={path.homePage} replace />;
  }

  return children;
}
