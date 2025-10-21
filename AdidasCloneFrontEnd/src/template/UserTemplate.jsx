import React from "react";
import Header from "../component/Header/Header";
import { Outlet } from "react-router-dom";
import Footer from "../component/Footer/Footer";

const UserTemplate = () => {
  return (
    <>
      <div className="max-w-[2500px] mx-auto">
        <Header />
        <main className="pb-[56px]">
          <Outlet />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default UserTemplate;
