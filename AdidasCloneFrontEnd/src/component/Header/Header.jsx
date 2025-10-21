import React from "react";
import TopHeader from "./TopHeader";
import MiddleHeader from "./MiddleHeader";
import BottomHeader from "./BottomHeader";

const Header = () => {
  return (
    <>
      <TopHeader />
      <div>
        <MiddleHeader />
      </div>
      <BottomHeader />
    </>
  );
};

export default Header;
