import React from "react";
import data from "../../assets/dataJson/ProductDetailsJson/RelatedProduct.json";
const GridDetailSecond = () => {
  return (
    <div className="mt-[58px] col-start-[1] col-end-[-1]">
      <div className="flex items-center justify-between mb-[12px]">
        <h3 className="text-[24px]">You Might Also Like</h3>
      </div>
      <ul className="flex overflow-x-auto pb-[35px]">
        {data.map((item, index) => {
          return (
            <li className="mr-[12px] flex-[0_0_calc(33%-18px)]">
              <div>
                <figure className="flex flex-col justify-start h-full w-full">
                  <div>
                    <picture>
                      <img className="" src={item.image} alt="" />
                    </picture>
                  </div>
                  <div className="flex flex-col justify-start mt-[12px]">
                    <div>
                      <h1>Nike Initiator</h1>
                      <h2 className="text-[#707072]">{item.categories}</h2>
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

export default GridDetailSecond;
