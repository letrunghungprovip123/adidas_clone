import React from "react";
import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
const CollapseProduct = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="border-t pb-[8px] border-gray-300">
        {/* Header */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex justify-between items-center py-3 text-left"
        >
          <span className="font-medium">{title}</span>
          <ChevronDownIcon
            className={`w-5 h-5 transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Body */}
        <div
          className={`overflow-hidden transition-all duration-300 ${
            open ? "max-h-40" : "max-h-0"
          }`}
        >
          <div className="py-2">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default CollapseProduct;
