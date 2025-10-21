import React from "react";
import GridDetailFirst from "../component/DetailProductComponent/GridDetailFirst";
import GridDetailSecond from "../component/DetailProductComponent/GridDetailSecond";
import DetailProduct from "../component/DetailProductComponent/DetailProduct";

const DetailProductPage = () => {
  return (
    <div className="max-w-[1920px] mx-auto px-[48px] grid grid-cols-12">
      <GridDetailFirst />
      <DetailProduct />
      <GridDetailSecond />
    </div>
  );
};

export default DetailProductPage;
