import React from "react";
import data from "../../assets/dataJson/FooterJson/Footer.json";

const Footer = () => {
  return (
    <footer className="px-6 md:px-12 lg:px-16 py-12 bg-white">
      {/* Top Line */}
      <div className="mb-10 h-px w-full bg-gray-200"></div>

      {/* Footer Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {data.map((section, i) => (
          <div key={i} className="flex flex-col gap-3">
            <h2
              style={{ fontFamily: "HerticalMedium, sans-serif" }}
              className="text-sm text-black opacity-80 mb-2"
            >
              {section.section}
            </h2>

            {section.titles.map((title, idx) => (
              <a
                key={idx}
                href="#"
                className="text-sm text-gray-500 hover:text-gray-700 transition"
              >
                {title}
              </a>
            ))}
          </div>
        ))}

        {/* Region */}
        <div className="flex lg:justify-end items-start">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                strokeMiterlimit="10"
                d="M21.75 12A9.75 9.75 0 0112 21.75M21.75 12A9.75 9.75 0 0012 2.25M21.75 12c0 2.071-4.365 3.75-9.75 3.75S2.25 14.071 2.25 12m19.5 0c0-2.071-4.365-3.75-9.75-3.75S2.25 9.929 2.25 12M12 21.75A9.75 9.75 0 012.25 12M12 21.75c2.9 0 5.25-4.365 5.25-9.75S14.9 2.25 12 2.25m0 19.5c-2.9 0-5.25-4.365-5.25-9.75S9.1 2.25 12 2.25M2.25 12A9.75 9.75 0 0112 2.25"
              ></path>
            </svg>
            Vietnam
          </div>
        </div>
      </div>

      {/* Bottom Line */}
      <div className="my-10"></div>

      {/* Bottom Links */}
      <ul className="flex flex-wrap gap-5 text-gray-500 text-sm">
        <li className="whitespace-nowrap">
          © 2025 Nike, Inc. All rights reserved
        </li>
        <li className="hover:text-black cursor-pointer">Guides</li>
        <li className="hover:text-black cursor-pointer">Term of Sale</li>
        <li className="hover:text-black cursor-pointer">Term of Use</li>
        <li className="hover:text-black cursor-pointer">Nike Privacy Policy</li>
        <li className="hover:text-black cursor-pointer">Privacy Settings</li>
      </ul>
    </footer>
  );
};

export default Footer;
