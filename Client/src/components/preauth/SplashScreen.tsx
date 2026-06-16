import React from "react";
// @ts-ignore: Treat image import as any to avoid missing module type declaration
import splashLogo from "../../assets/images/splash-logo.png";

const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#0D47A1] to-[#001B3D] flex items-center justify-center z-50">
      <div className="text-center">
        {/* Logo */}
        <div className="relative mb-8 inline-block">
          <img
            src={splashLogo}
            alt="Nexus Qadr Logo"
            className="w-40 h-40 object-contain drop-shadow-2xl animate-pulse"
          />

          {/* Glow effects */}
          <div className="absolute inset-0 rounded-full bg-[#00B0FF] opacity-50 blur-3xl animate-pulse" />
          <div className="absolute inset-0 rounded-full bg-[#00B0FF] opacity-30 blur-2xl animate-ping" />
        </div>

        <h1
          className="text-3xl text-white mb-3"
          style={{ textShadow: "0 0 8px rgba(242, 247, 0, 0.65)" }}
        >
          Nexus Qadr
        </h1>

        <p
          className="text-3xl md:text-4xl leading-tight"
          style={{
            fontFamily:
              "'Imperial Script', 'Patrick Hand', 'Brush Script MT', cursive",
          }}
        >
          <span className="text-red-500 drop-shadow-[0_0_8px_red]">Where</span>{" "}
          <span className="text-white drop-shadow-[0_0_10px_white]">
            Quality
          </span>{" "}
          <span className="text-red-500 drop-shadow-[0_0_8px_red]">meets</span>{" "}
          <span className="text-white drop-shadow-[0_0_10px_white]">
            Destiny...
          </span>
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
