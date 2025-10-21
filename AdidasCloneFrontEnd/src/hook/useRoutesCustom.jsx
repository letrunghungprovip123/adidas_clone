import React from "react";
import { useRoutes } from "react-router";
import UserTemplate from "../template/UserTemplate";
import HomePage from "../page/HomePage";
import { path } from "../common/path/path";
import ListProductPage from "../page/ListProductPage";
import DetailProductPage from "../page/DetailProductPage";
import FavouriteProductPage from "../page/FavouriteProductPage";

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
        {
          path:path.favouriteProductPage,element : <FavouriteProductPage />
        }
      ],
    },
  ]);
  return routes;
};

export default useRoutesCustom;
