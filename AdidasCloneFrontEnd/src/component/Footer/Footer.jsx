import React from "react";
import data from "../../assets/dataJson/FooterJson/Footer.json";
const Footer = () => {
  return (
    <div className="p-[48px]">
      <div className="mb-[60px] h-[1px] w-full bg-[#E5E5E5]"></div>
      <div className="flex items-start gap-[12px] flex-row">
        {data.map((item, index) => {
          return (
            <div className="flex flex-col gap-[12px] items-start flex-1">
              <h2
                style={{ fontFamily: "HerticalMedium , sans-serif" }}
                className="h-[32px] mb-[12px] text-[14px] text-[#111111] opacity-[0.75]  "
              >
                {item.section}
              </h2>
              {item.titles.map((item, index) => {
                return (
                  <a href="#" className="text-[14px] opacity-50">
                    {item}
                  </a>
                );
              })}
            </div>
          );
        })}
        <div className="flex-1 flex flex-col items-end">
          <div className="flex justify-center items-center gap-[4px] text-[13px] opacity-50">
            <span>
              <svg
                aria-hidden="true"
                class="css-npy3on"
                focusable="false"
                viewBox="0 0 24 24"
                role="img"
                width="18px"
                height="24px"
                fill="none"
              >
                <path
                  stroke="currentColor"
                  stroke-miterlimit="10"
                  stroke-width="1.5"
                  d="M21.75 12A9.75 9.75 0 0112 21.75M21.75 12A9.75 9.75 0 0012 2.25M21.75 12c0 2.071-4.365 3.75-9.75 3.75S2.25 14.071 2.25 12m19.5 0c0-2.071-4.365-3.75-9.75-3.75S2.25 9.929 2.25 12M12 21.75A9.75 9.75 0 012.25 12M12 21.75c2.9 0 5.25-4.365 5.25-9.75S14.9 2.25 12 2.25m0 19.5c-2.9 0-5.25-4.365-5.25-9.75S9.1 2.25 12 2.25M2.25 12A9.75 9.75 0 0112 2.25"
                ></path>
              </svg>
            </span>
            Vietnam
          </div>
        </div>
      </div>
      <div className="mb-[72px]"></div>
      <div className="pb-[48px]">
        <ul className="flex  items-center flex-wrap  gap-[24px]">
          <li className="whitespace-nowrap">
            <p className="text-[14px]  text-[#707072]">
              <span>© 2025 Nike, Inc. All rights reserved</span>
            </p>
          </li>
          <li>
            <p className="text-[14px]  text-[#707072]">Guides</p>
          </li>
          <li>
            <p className="text-[14px]  text-[#707072]">Term of Sale</p>
          </li>
          <li>
            <p className="text-[14px]  text-[#707072]">Term of Use</p>
          </li>
          <li>
            <p className="text-[14px]  text-[#707072]">Nike Privacy Policy</p>
          </li>
          <li>
            <p className="text-[14px]  text-[#707072]">Privacy Settings</p>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Footer;
