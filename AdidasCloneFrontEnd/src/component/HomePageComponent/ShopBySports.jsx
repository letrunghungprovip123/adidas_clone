import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopBySports.json";

const ShopBySports = () => {
  return (
    <div className="mt-20 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl mb-6">Shop By Sport</h2>

      <div className="flex overflow-x-auto gap-6 pb-6">
        {data.map((item, index) => (
          <figure key={index} className="relative min-w-[350px]">
            <img src={item.image} alt="" className="rounded-lg" />

            <button className="absolute bottom-6 left-6 bg-white text-black px-4 py-2 rounded-full text-sm hover:bg-gray-300">
              {item.category}
            </button>
          </figure>
        ))}
      </div>
    </div>
  );
};

export default ShopBySports;
