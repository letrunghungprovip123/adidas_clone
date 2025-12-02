import React from "react";
import data from "../../assets/dataJson/HomePageJson/Featured.json";

const Featured = () => {
  return (
    <div className="mt-20 max-w-7xl mx-auto px-4">
      <h2 className="text-2xl mb-6">Featured</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item, index) => (
          <div key={index} className="relative">
            <img
              src={item.image}
              alt=""
              className="w-full h-full object-cover"
            />

            <div className="absolute bottom-8 left-6 text-white">
              <h3 className="text-2xl font-bold mb-3">{item.name}</h3>
              <button className="bg-white text-black rounded-full px-4 py-2 hover:bg-gray-300">
                Shop
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Featured;
