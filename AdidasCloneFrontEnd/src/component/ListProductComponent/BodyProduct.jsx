import React from "react";
import { Collapse } from "antd";
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import CollapseProduct from "./CollapseProduct";
import CardProduct from "../Cards/CardProduct";
import data from "../../assets/dataJson/ListProductJson/RelatedStories.json";
const BodyProduct = () => {
  const categories = [
    "Lifestyle",
    "Jordan",
    "Running",
    "Basketball",
    "Football",
    "Training & Gym",
    "Skateboarding",
    "Golf",
    "Tennis",
    "Athletics",
    "Walking",
  ];
  const filters = [
    "Gender",
    "Shop By Price",
    "Sale & Offers",
    "Size",
    "Colour",
    "Shoe Height",
    "Brand",
    "Collections",
    "Air Max",
    "Width",
    "Sports",
  ];
  return (
    <div className="flex">
      <div className="relative w-[260px]">
        <div className="sticky max-h-[710px] w-[260px] top-[51px]">
          <div className="overflow-y-auto max-h-[calc(100vh-30px)]">
            <div className="w-[240px] pb-[16px] pl-[48px]">
              <nav className="relative">
                <div className="pb-[40px]">
                  {categories.map((item, index) => {
                    return (
                      <a
                        href="#"
                        className="ml-[4px] pb-[10px] pr-[17px] whitespace-normal leading-[21px] wordwrap-break block text-[16px]"
                      >
                        {item}
                      </a>
                    );
                  })}
                </div>
                <div>
                  {filters.map((item, index) => {
                    return (
                      <CollapseProduct
                        title={item}
                        children={
                          <div className="text-red-500">Content goes here</div>
                        }
                      />
                    );
                  })}
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>
      <div className="relative pl-[40px] pr-[48px] ">
        <CardProduct />
        <CardProduct />
        <CardProduct />
        <CardProduct />
        <div className="mb-[80px] mt-[60px] ">
          <div>
            <div className="flex justify-between pr-[48px] mb-[12px]">
              <span className="text-[20px] leading-[1.2]">Related Stories</span>
            </div>
            <ul className="overflow-x-auto flex list-none pb-[30px]">
              {data.map((item, index) => {
                return (
                  <li className="flex-[0_0_calc(33%_-_18px)] mr-[12px]">
                    <a href="#" className="space-y-[8px]">
                      <img
                        src={item.image}
                        alt=""
                      />
                      <div className="text-[#707072] text-[15px]">
                        {item.content}
                      </div>
                      <div
                        className="text-[16px]"
                        style={{ fontFamily: "HerticalMedium,sans-serif" }}
                      >
                        {item.title}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BodyProduct;
