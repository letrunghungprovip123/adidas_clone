import React from "react";
import { useRoutes } from "react-router";
import UserTemplate from "../template/UserTemplate";
import HomePage from "../page/HomePage";
import { path } from "../common/path/path";
import ListProductPage from "../page/ListProductPage";
import DetailProductPage from "../page/DetailProductPage";

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
      ],
    },
  ]);
  return routes;
};

export default useRoutesCustom;
