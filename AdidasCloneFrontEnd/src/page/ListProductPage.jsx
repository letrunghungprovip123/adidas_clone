import React, { useState } from "react";
import BodyProduct from "../component/ListProductComponent/BodyProduct";

const ListProductPage = () => {
  const [sort, setSort] = useState("");

  return (
    <>
      <div className="h-[15px]"></div>

      <div className="px-[48px] pb-[15px] pt-[8px] flex flex-wrap items-end">
        <h1 className="text-[24px] leading-[1.3] pb-[2px] font-bold flex-1">
          Men's Shoes (1051)
        </h1>
        <nav className="inline-flex">
          <button className="flex text-[16px] pr-[25px] items-center">
            {/* <span className="pr-[8px] opacity-85">Hide Filters</span> */}
            {/* <svg
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
                strokeWidth="1.5"
                d="M21 8.25H10m-5.25 0H3"
              />
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M7.5 6a2.25 2.25 0 100 4.5A2.25 2.25 0 007.5 6z"
              />
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M3 15.75h10.75m5 0H21"
              />
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M16.5 13.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z"
              />
            </svg> */}
          </button>
          <div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">Sort By</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
              <option value="newest">Newest</option>
              <option value="name">Name (A → Z)</option>
            </select>
          </div>
        </nav>
      </div>

      <div className="h-[15px]"></div>

      <BodyProduct sort={sort} onSortChange={setSort} />
    </>
  );
};

export default ListProductPage;
