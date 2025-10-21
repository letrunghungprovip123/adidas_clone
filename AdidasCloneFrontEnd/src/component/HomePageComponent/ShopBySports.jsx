import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopBySports.json";
const ShopBySports = () => {
  return (
    <div className="mt-[84px] mx-[48px] px-[6px]">
      <div className="px-[48px] pt-[2px] mb-[12px]">
        <h2 className="text-[24px]">Shop By Sport</h2>
      </div>
      <ul className="pl-[48px] pb-[30px] overflow-x-auto flex">
        {data.map((item, index) => {
          return (
            <li className="mr-[12px] min-w-[400px] relative">
              <figure className="w-full h-full">
                <img src={item.image} alt="" />
                <div className="absolute bottom-[46px] left-[44px]">
                  <span className="text-[16px] hover:bg-[] rounded-[30px] mt-[6px] mr-[6px] px-[16px] py-[6px] bg-white text-black">
                    {item.category}
                  </span>
                </div>
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ShopBySports;
