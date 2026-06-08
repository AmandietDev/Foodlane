import Image from "next/image";
import { FOODLANE_LOGO_SRC } from "./landing/LandingIcons";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <Image
          src={FOODLANE_LOGO_SRC}
          alt="Foodlane Logo"
          width={120}
          height={120}
          className="drop-shadow-sm"
          priority
          unoptimized
          style={{
            objectFit: "contain",
            backgroundColor: "transparent",
          }}
        />
      </div>
    </div>
  );
}
