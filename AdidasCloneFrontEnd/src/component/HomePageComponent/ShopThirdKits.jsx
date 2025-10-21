import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopThirdKits.json";
const ShopThirdKits = () => {
  return (
    <div className="mt-[84px] px-[24px]">
      <div className="px-[48px] mb-[12px]">
        <h2 className="text-[24px]">Shop Third Kits</h2>
      </div>
      <ul className="pl-[48px] pb-[30px] overflow-x-auto flex">
        {data.map((item, index) => {
          return (
            <li className="mr-[12px]">
              <div className="relative min-w-[450px] min-h-[450px]">
                <figure>
                  <div className="w-full h-full">
                    <img src={item.image} alt="" />
                  </div>
                  <div className="mt-[12px] flex flex-col justify-start">
                    <div>
                      <h4 style={{ fontFamily: "HerticalMedium, sans-serif" }}>
                        {item.category}
                      </h4>
                      <h5 className="text-[14px] text-[#707072]">
                        {item.title}
                      </h5>
                    </div>
                    <div className="pt-[8px]">
                      <h3>{item.price}</h3>
                    </div>
                  </div>
                </figure>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ShopThirdKits;
