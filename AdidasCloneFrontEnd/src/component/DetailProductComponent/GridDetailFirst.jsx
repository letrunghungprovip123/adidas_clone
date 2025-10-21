import React from "react";
import Collapse from "../Collapse/Collapse";

const GridDetailFirst = () => {
  const image = [
    "https://static.nike.com/a/images/t_default/782405ec-b1f8-4a32-b293-46c5b4a4a016/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/abc3b671-e31e-44b6-8149-fb15739782c4/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/5ba750e3-65ed-44cf-b270-61aa30413ae9/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/d270b144-b141-4f69-bf0e-f29fef6f3bfe/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/4833e92f-d97d-4f83-9829-c509ac945778/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/5948400f-4a45-4c9f-af8b-b3cf228c25eb/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/e398359f-8cac-4247-9f6d-3faf25a32e73/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/8736c539-4ba2-4892-9600-9db3d6fbe8a5/NIKE+P-6000.png",
    "https://static.nike.com/a/images/t_default/4fc1fbfc-ce64-460b-b5c9-ee49c6d7d888/NIKE+P-6000.png",
  ];

  const sizes = [
    38, 38.5, 39, 39.5, 40, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45, 45.5,
    46, 46.5, 47,
  ];

  const child = () => {
    return (
      <div
        className="grid pb-[30px] text-[#111111] "
      >
        <div className="text-start text-[16px] font-light">
          <p>Your order of 5.000.000₫ or more gets free standard delivery.</p>
          <br />
          <ul className="my-[16px] list-disc list-inside">
            <li>Standard delivered 4-5 Business Days</li>
            <li>Express delivered 2-4 Business Days</li>
          </ul>
          <br />
          <p>
            Orders are processed and delivered Monday-Friday (excluding public
            holidays)
          </p>
          <br />
          <p>
            Nike Members enjoy <u className="underline">Free Returns</u>
          </p>
        </div>
      </div>
    );
  };
  return (
    <>
      <div className="col-start-2 col-end-8 row-start-1 row-end-3 pt-[48px]">
        <div className="sticky max-h-[669px] min-h-[455px] pl-[48px] mx-[8px] flex flex-row gap-[16px] justify-end h-[665px] top-[40px]">
          <div className="flex relative flex-grow gap-[8px] min-w-[60px] max-w-[60px] h-[100%] overflow-y-scroll flex-col">
            {image.map((item, index) => {
              return (
                <div className="relative min-h-[60px] min-w-[60px] max-h-[60px] max-w-[60px] bg-[#E5E5E5] rounded-[4px] flex items-end justify-start">
                  <div>
                    <img
                      className="w-full rounded-[4px] bg-[#E5E5E5]"
                      src={item}
                      alt=""
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="w-[535px] h-[665px] max-w-[535-px]">
            <div>
              <img
                className="bg-[#F5F5F5] object-contain"
                src="https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/af44d1ba-7b76-427e-ba78-91350a69e8f0/NIKE+P-6000.png"
                alt=""
              />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-[400px] col-start-8 col-end-[-1] pt-[48px] pl-[24px] mb-[8px] self-start">
        <div className="mb-[10px]">
          <h1 className="text-[20px] font-bold">Nike P-6000</h1>
          <h2 className="text-[#707072] ">Men's Shoes</h2>
        </div>
        <div className="mb-[32px]">
          <span className="font-bold">3,239,000₫</span>
        </div>
        <div className="mt-[20px] mb-[32px]">
          <fieldset>
            <legend className="flex justify-between font-bold w-full">
              <span className="">Select Size</span>
              <a
                href="#"
                className="flex items-center justify-center gap-[2px]"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  role="img"
                  width="24px"
                  height="24px"
                  fill="none"
                >
                  <path
                    stroke="currentColor"
                    stroke-width="1.5"
                    d="M21.75 10.5v6.75a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V10.5m3.308-2.25h12.885"
                  ></path>
                  <path
                    stroke="currentColor"
                    stroke-width="1.5"
                    d="M15.79 5.599l2.652 2.65-2.652 2.653M8.21 5.599l-2.652 2.65 2.652 2.653M17.25 19v-2.5M12 19v-2.5M6.75 19v-2.5"
                  ></path>
                </svg>
                <span className="text-[14px]">Size Guide</span>
              </a>
            </legend>
          </fieldset>
          <div className="flex flex-col-reverse">
            <div className="grid grid-cols-3 gap-[7px] pt-[12px] rounded-[4px]">
              {sizes.map((item, index) => {
                return (
                  <div className="cursor-pointer hover:border-black min-w-[91px] col-span-1 h-[48px] flex items-center justify-center border-[1px] border-solid border-[#CACACB] rounded-[4px]">
                    <label
                      className="flex justify-center items-center w-full h-full"
                      htmlFor=""
                    >
                      EU {item}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mb-[32px]">
          <div>
            <button className="mb-[12px] hover:opacity-60 text-white flex justify-center w-full items-center px-[24px] py-[18px] min-h-[58px] rounded-[30px] bg-[#111111]">
              Add To Bag
            </button>
          </div>
          <div className="mb-[32px]">
            <button className="mb-[12px] hover:border-black flex justify-center w-full items-center px-[24px] py-[18px] min-h-[58px] rounded-[30px] border border-gray-300 gap-[3px]">
              Favourite
              <span>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  role="img"
                  width="24px"
                  height="24px"
                  fill="none"
                >
                  <path
                    stroke="currentColor"
                    stroke-width="1.5"
                    d="M16.794 3.75c1.324 0 2.568.516 3.504 1.451a4.96 4.96 0 010 7.008L12 20.508l-8.299-8.299a4.96 4.96 0 010-7.007A4.923 4.923 0 017.205 3.75c1.324 0 2.568.516 3.504 1.451l.76.76.531.531.53-.531.76-.76a4.926 4.926 0 013.504-1.451"
                  ></path>
                  <title>non-filled</title>
                </svg>
              </span>
            </button>
          </div>
        </div>
        <div className="pt-[28px]">
          <p>
            The P-6000 is a mash-up of Pegasus sneakers past. It takes the early
            2000s running style to modern heights by combining sporty design
            lines with breathable textiles. And its foam cushioning adds a
            lifted, athletics-inspired stance for unbelievable comfort.
          </p>
        </div>
        <div className="mb-[32px] mt-[30px]">
          <div>
            <Collapse
              title={"Free Delivery and Returns"}
              children={child()}
              className={"py-[15px] text-[20px] border-b"}
            />
            <Collapse
              title={"Review (0)"}
              children={<div>123</div>}
              className={"py-[15px] text-[20px] border-b"}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default GridDetailFirst;
