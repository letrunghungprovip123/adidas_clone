import React from "react";
import Banner from "../component/HomePageComponent/Banner/Banner";
import ShopBySport from "../component/HomePageComponent/ShopBySport";
import Featured from "../component/HomePageComponent/Featured";
import ShopByIcons from "../component/HomePageComponent/ShopByIcons";
import ShopThirdKits from "../component/HomePageComponent/ShopThirdKits";
import ShopBySports from "../component/HomePageComponent/ShopBySports";
import useUserStore from "../store/userStore";

const HomePage = () => {
  const { user } = useUserStore();
  // console.log("user nè",user);
  return (
    <div>
      <Banner />
      <ShopBySport />
      <Featured />
      <ShopByIcons />
      <ShopThirdKits />
      <ShopBySports />
    </div>
  );
};

export default HomePage;
