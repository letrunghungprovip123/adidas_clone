import React from "react";
import { Link } from "react-router-dom";
import { Result, Button } from "antd";

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

const AdminRouteGuard: React.FC<AdminRouteGuardProps> = ({ children }) => {
  const token = localStorage.getItem("admin_token");

  if (!token) {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="Bạn cần đăng nhập với quyền admin để truy cập trang này."
        extra={
          <Link to="/signin">
            <Button type="primary">Đăng nhập ngay</Button>
          </Link>
        }
      />
    );
  }

  // ✅ Nếu có token → cho phép truy cập
  return <>{children}</>;
};

export default AdminRouteGuard;
