import React from "react";
import nikeVideo from "../../../assets/video/nike-video.mp4";

const Banner = () => {
  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Video Background */}
      <div className="relative z-10 w-full">
        <video
          src={nikeVideo}
          loop
          muted
          autoPlay
          className="w-full h-auto max-h-[800px] object-cover"
        />
      </div>

      {/* TEXT LAYER */}
      <div
        className="
          absolute left-1/2 transform -translate-x-1/2 
          w-[90%] sm:w-[80%] md:w-[60%]
          top-[50%] md:top-[55%] lg:top-[60%]
          text-center z-20
        "
      >
        <p className="mb-2 text-white text-xs sm:text-sm md:text-base">
          The you that knows you can is 26.2 miles away.
        </p>

        <h3
          style={{ fontFamily: "NikeFont, sans-serif" }}
          className="
            text-white font-bold
            text-4xl leading-[1.1]
            sm:text-5xl sm:leading-[1.1]
            md:text-6xl md:leading-[1.1]
            lg:text-[80px] lg:leading-[80px]
          "
        >
          JUST DO IT
        </h3>

        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {/* Button 1 */}
          <button className="py-2 px-6 rounded-full bg-white hover:bg-gray-300 transition">
            <span className="text-sm sm:text-base font-medium">Gear Up</span>
          </button>

          {/* Button 2 */}
          <button className="py-2 px-6 rounded-full bg-white hover:bg-gray-300 transition flex items-center gap-1">
            <span className="text-sm sm:text-base font-medium">Watch</span>

            <svg
              aria-hidden="true"
              focusable="false"
              viewBox="0 0 24 24"
              role="img"
              width="22px"
              height="22px"
              fill="none"
            >
              <path
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                d="M17.692 12.872a1 1 0 000-1.745L8.239 5.834a1 1 0 00-1.489.872v10.588a1 1 0 001.489.872l9.453-5.294z"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Banner;
