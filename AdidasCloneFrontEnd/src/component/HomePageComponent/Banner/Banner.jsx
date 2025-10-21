import React from "react";
import nikeVideo from "../../../assets/video/nike-video.mp4";
const Banner = () => {
  return (
    <div className="relative">
      <div className="relative z-10">
        <video src={nikeVideo} loop muted autoPlay></video>
      </div>
      <div className="absolute w-[60%] text-center left-[20%] h-[33%] top-[400px] flex flex-col justify-end z-1000">
        <div>
          <p className="mb-[8px] text-[16px] text-[#FFFFFF]">
            The you that knows you can is 26.2 miles away.
          </p>
          <h3
            style={{ fontFamily: "NikeFont, sans-serif" }}
            className="text-[#FFFFFF] text-[80px]  leading-[80px]"
          >
            JUST DO IT
          </h3>
          <div className="mt-[18px]">
            <button className="mr-[6px] mt-[6px] py-[6px] px-[16px] rounded-[30px] bg-[#FFFFFF] hover:bg-[#CACACB]">
              <span>Gear Up</span>
            </button>
            <button className="mr-[6px] mt-[6px] py-[6px] px-[16px] rounded-[30px] bg-[#FFFFFF] hover:bg-[#CACACB]">
              <div className="flex items-center justify-center gap-[2px]">
                <span>Watch</span>
                <div>
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    role="img"
                    width="24px"
                    height="24px"
                    fill="none"
                  >
                    <path
                      fill="currentColor"
                      fill-rule="evenodd"
                      stroke="currentColor"
                      stroke-width="1.5"
                      d="M17.692 12.872a1 1 0 000-1.745L8.239 5.834a1 1 0 00-1.489.872v10.588a1 1 0 001.489.872l9.453-5.294z"
                      clip-rule="evenodd"
                    ></path>
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
