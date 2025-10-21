import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopByIcons.json"
const ShopByIcons = () => {
  return (
    <div className="mt-[84px]">
      <div className="mx-[48px]">
        <h2 className="text-[24px] mb-[24px]">Shop by Icons</h2>
      </div>
      <div className="overflow-x-auto flex ">
        {data.map((item, index) => {
          return (
            <figure className="min-w-[320px] ml-[4px]">
              <div>
                <img className="" src={item.image} alt="" />
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
};

export default ShopByIcons;
