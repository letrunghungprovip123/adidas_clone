import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopByIcons.json";

const ShopByIcons = () => {
  return (
    <div className="mt-20 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl mb-6">Shop by Icons</h2>

      <div className="flex overflow-x-auto gap-4 pb-2">
        {data.map((item, index) => (
          <figure key={index} className="min-w-[260px]">
            <img src={item.image} alt="" className="rounded-lg" />
          </figure>
        ))}
      </div>
    </div>
  );
};

export default ShopByIcons;
