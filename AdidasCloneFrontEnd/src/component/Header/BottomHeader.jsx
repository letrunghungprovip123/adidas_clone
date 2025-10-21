import React from "react";

const BottomHeader = () => {
  return (
    <div className="pt-[10px] overflow-hidden whitespace-nowrap min-h-[58px] flex flex-col gap-[12px] items-center justify-center bg-[#F5F5F5]">
      <span className="text-[16px] leading-1">
        New Styles On Sale: Up To 40% Off
      </span>
      <div className="text-[12px] font-extrabold underline">
        Shop All Our New Markdowns
      </div>
    </div>
  );
};

export default BottomHeader;
