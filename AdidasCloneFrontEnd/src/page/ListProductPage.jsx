import React from "react";
import BodyProduct from "../component/ListProductComponent/BodyProduct";

const ListProductPage = () => {
  return (
    <>
      <div className="h-[15px]"></div>
      <div className="px-[48px] pb-[15px] pt-[8px] flex flex-wrap items-end">
        <h1 className="text-[24px] leading-[1.3] pb-[2px] font-bold flex-1">
          Men's Shoes (1051)
        </h1>
        <nav className="inline-flex">
          <button className="flex text-[16px] pr-[25px] items-center">
            <span className="pr-[8px] opacity-85">Hide Filters</span>
            <svg
              aria-hidden="true"
              class="icon-filter-ds"
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
                d="M21 8.25H10m-5.25 0H3"
              ></path>
              <path
                stroke="currentColor"
                stroke-width="1.5"
                d="M7.5 6v0a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z"
                clip-rule="evenodd"
              ></path>
              <path
                stroke="currentColor"
                stroke-width="1.5"
                d="M3 15.75h10.75m5 0H21"
              ></path>
              <path
                stroke="currentColor"
                stroke-width="1.5"
                d="M16.5 13.5v0a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
          <div>
            <button className="px-[6px] inline-flex items-center">
              <span className="opacity-85">Sort By</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-4 ml-[8px]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          </div>
        </nav>
      </div>
      <div className="h-[15px]"></div>
      <div>
        <BodyProduct />
      </div>
    </>
  );
};

export default ListProductPage;
