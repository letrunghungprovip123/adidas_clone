import React from "react";
import { useRoutes } from "react-router";
import UserTemplate from "../template/UserTemplate";
import HomePage from "../page/HomePage";
import { path } from "../common/path/path";
import ListProductPage from "../page/ListProductPage";
import DetailProductPage from "../page/DetailProductPage";
import SignInPage from "../page/SignInPage";
import CartItemsPage from "../page/CartItemsPage";
import CartCheckoutPage from "../page/CartCheckoutPage";
import ProfilePage from "../page/ProfilePage";
import WishListPage from "../page/WishListPage";
import ForgotPasswordPage from "../page/ForgotPasswordPage";
import ResetPassword from "../page/ResetPassword";
import VerifyOtpPage from "../page/VerifyOtpPage";
import ManageAddressPage from "../page/ManageAddressPage";
import OrderSuccessPage from "../page/OrderSuccessPage";
import OrderTrackingPage from "../page/OrderTrackingPage";
import OrderHistoryPage from "../page/OrderHistoryPage";
import ProtectedCheckoutRoute from "../routes/ProtectedCheckoutRoute";
import AuthGuardRoute from "../routes/AuthGuardRoute";
import SignUpPage from "../page/SignUpPage";
import RedirectRoute from "../routes/RedirectRoute";
import NotFoundPage from "../page/NotFoundPage";

const useRoutesCustom = () => {
  const routes = useRoutes([
    {
      path: "/",
      element: <UserTemplate />,
      children: [
        { index: true, element: <HomePage /> },
        { path: path.listProductPage, element: <ListProductPage /> },
        {
          path: `${path.detailProductPage}/:id`,
          element: <DetailProductPage />,
        },
        { path: path.cartItems, element: <CartItemsPage /> },
        {
          path: path.cartCheckout,
          element: (
            <ProtectedCheckoutRoute>
              <CartCheckoutPage />
            </ProtectedCheckoutRoute>
          ),
        },
        {
          path: path.profile,
          element: (
            <AuthGuardRoute>
              <ProfilePage />
            </AuthGuardRoute>
          ),
        },
        {
          path: path.wishlist,
          element: (
            <AuthGuardRoute>
              <WishListPage />
            </AuthGuardRoute>
          ),
        },
        {
          path: path.address,
          element: (
            <AuthGuardRoute>
              <ManageAddressPage />
            </AuthGuardRoute>
          ),
        },
        { path: path.ordersuccess, element: <OrderSuccessPage /> },
        {
          path: `${path.ordertracking}/:id`,
          element: (
            <AuthGuardRoute>
              <OrderTrackingPage />
            </AuthGuardRoute>
          ),
        },
        {
          path: path.orderhistory,
          element: (
            <AuthGuardRoute>
              <OrderHistoryPage />
            </AuthGuardRoute>
          ),
        },
        { path: "*", element: <NotFoundPage /> },
      ],
    },
    {
      path: path.signInPage,
      element: (
        <RedirectRoute>
          <SignInPage />
        </RedirectRoute>
      ),
    },
    { path: path.forgotpass, element: <ForgotPasswordPage /> },
    { path: path.verifyotp, element: <VerifyOtpPage /> },
    { path: path.resetpass, element: <ResetPassword /> },
    { path: path.signUpPage, element: <SignUpPage /> },
    { path: "*", element: <NotFoundPage /> },
  ]);
  return routes;
};

export default useRoutesCustom;
