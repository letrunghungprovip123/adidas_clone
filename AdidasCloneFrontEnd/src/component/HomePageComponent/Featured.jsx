import React from "react";
import data from "../../assets/dataJson/HomePageJson/Featured.json";
const Featured = () => {
  return (
    <div className="mt-[84px]">
      <div>
        <h2 className="text-[24px] mx-[48px] mb-[24px]">Featured</h2>
      </div>
      <div className="grid grid-cols-12">
        {data.map((item, index) => {
          return (
            <div className="col-span-6 relative">
              <figure>
                <div>
                  <img src={item.image} alt="" />
                </div>
                <div className="absolute text-left flex flex-col justify-end bottom-[50px] left-[20px] p-4">
                  <h3 className="text-[24px] font-bold text-white mb-[15px]">
                    {item.name}
                  </h3>
                  <div>
                    <p className="cursor-pointer hover:bg-[#CACACB] text-[14px] px-[16px] py-[6px] rounded-[30px] bg-white text-black inline-block">
                      Shop
                    </p>
                  </div>
                </div>
              </figure>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Featured;
