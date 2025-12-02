import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopThirdKits.json";

const ShopThirdKits = () => {
  return (
    <div className="mt-20 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl mb-6">Shop Third Kits</h2>

      <div className="flex overflow-x-auto gap-6 pb-6">
        {data.map((item, index) => (
          <div key={index} className="min-w-[350px]">
            <img src={item.image} alt="" className="rounded-lg" />

            <div className="mt-3">
              <h4 className="font-semibold">{item.category}</h4>
              <p className="text-gray-500 text-sm">{item.title}</p>
              <h3 className="mt-2 font-medium">{item.price}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShopThirdKits;
