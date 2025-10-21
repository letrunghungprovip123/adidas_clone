import React from "react";

const CardProduct = () => {
  return (
    <div className="px-[8px] inline-block w-[33.33333333333%] leading-[1.75]">
      <div className="max-w-[592px] pb-[18px] relative">
        <figure>
          <a href="">
            <img
              className="w-full h-full"
              src="https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/64bf6a02-62db-4b07-99b5-da0f803261dd/LBJ+NXXT+GENISUS+QS+EP.png"
              alt=""
            />
          </a>
          <div className="pt-[12px] pb-[2px] relative min-h-[185px]">
            <div>
              <div className="text-[#D33918]">Just In</div>
              <div className="leading-[24px]">
                <div className="text-[17px]">LeBron NXXT Genisus QS EP</div>
                <div className="text-[#707072]">Basketball Shoes</div>
              </div>
            </div>
            <div className="pb-[10px]">
              <div className="text-[#707072]">1 Colour</div>
            </div>
            <div className=" font-bold">4,500,000 VND</div>
          </div>
        </figure>
      </div>
    </div>
  );
};

export default CardProduct;
