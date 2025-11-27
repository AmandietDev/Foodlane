import Image from "next/image";

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Logo image avec fond transparent */}
      <div className="relative">
        <Image
          src="/logo.png?v=2"
          alt="Foodlane Logo"
          width={120}
          height={120}
          className="drop-shadow-sm"
          priority
          unoptimized
          style={{ 
            objectFit: "contain",
            backgroundColor: "transparent",
            mixBlendMode: "normal"
          }}
          onError={(e) => {
            // Fallback si l'image n'existe pas encore
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
          }}
        />
      </div>
    </div>
  );
}
