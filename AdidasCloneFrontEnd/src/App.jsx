import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import Header from "./component/Header/Header";
import useRoutesCustom from "./hook/useRoutesCustom";
import useUserStore from "./store/userStore";
import { useWishlistStore } from "./store/wishlistStore";

function App() {
  const routes = useRoutesCustom();
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);
  const fetchUser = useUserStore((state) => state.fetchUser);
  const initialized = useUserStore((state) => state.initialized);

  useEffect(() => {
    fetchWishlist();

    if (initialized) {
      fetchUser(); // ⭐ chỉ fetch user khi store đã hydrate
    }
  }, [initialized]);

  return (
    <>
      <div style={{ fontFamily: "HerticalNor, sans-serif" }}>{routes}</div>
    </>
  );
}

export default App;
