import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import Header from "./component/Header/Header";
import useRoutesCustom from "./hook/useRoutesCustom";

function App() {
  const [count, setCount] = useState(0);
  const routes = useRoutesCustom();
  return (
    <>
      <div style={{ fontFamily: "HerticalNor, sans-serif" }}>{routes}</div>
    </>
  );
}

export default App;
