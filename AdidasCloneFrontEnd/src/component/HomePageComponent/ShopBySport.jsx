import React from "react";
import data from "../../assets/dataJson/HomePageJson/ShopBySport.json";
const ShopBySport = () => {
  console.log(data);
  return (
    <div className="my-[84px] mx-[48px]">
      <div className="px-[6px]">
        <div className="flex justify-between px-[48px] mb-[12px]">
          <div>
            <h2 className="text-[24px]">Shop by Sport</h2>
          </div>
        </div>
        <ul className="pl-[48px] pb-[30px] overflow-x-auto flex">
          {data.map((item, index) => {
            return (
              <li className="pr-[12px]">
                <figure className="min-w-[410px]">
                  <div>
                    <img className="" src={item.image} alt="" />
                  </div>
                  <div className="mt-[36px]">
                    <span className="text-[20px]">{item.name}</span>
                  </div>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ShopBySport;
