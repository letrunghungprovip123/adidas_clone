import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopBySport.json";

const ShopBySport = () => {
  return (
    <div className="mt-20 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl mb-6">Shop by Sport</h2>

      <div className="flex overflow-x-auto gap-6 pb-4">
        {data.map((item, index) => (
          <div key={index} className="min-w-[350px]">
            <img src={item.image} alt="" className="rounded-lg" />
            <p className="mt-4 text-lg">{item.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopBySport;
