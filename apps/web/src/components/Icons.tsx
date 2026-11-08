import Image from "next/image";
import type { ImgHTMLAttributes, SVGProps } from "react";
import type { HazardType } from "@risksense/shared";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
type LogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "width" | "height" | "src"> & {
  size?: number;
};

function base({ size = 16, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const FlameIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2c1.5 3.5 4.5 5 4.5 9a4.5 4.5 0 0 1-9 0c0-1.6.6-2.7 1.4-3.6" />
    <path d="M12 22a5 5 0 0 0 5-5c0-2-1-3.4-2-4.5" />
  </svg>
);

export const WaterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.5s6 6.4 6 11a6 6 0 1 1-12 0c0-4.6 6-11 6-11Z" />
  </svg>
);

export const SeismicIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12h3l2-5 3 10 2.5-7 2 4h3.5l2-4 2 2" />
  </svg>
);

export const StormIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 14a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.4 1.4A3.6 3.6 0 0 1 17 14" />
    <path d="M12 13v3" />
    <path d="M9.5 17.5 8 22" />
    <path d="M14.5 17.5 13 22" />
  </svg>
);

export const CycloneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="2.4" />
    <path d="M12 4.5c3.6 0 5.6 2.2 5.6 4.4 0 1.6-1 2.7-2.4 3" />
    <path d="M12 19.5c-3.6 0-5.6-2.2-5.6-4.4 0-1.6 1-2.7 2.4-3" />
  </svg>
);

export const VolcanoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 20h18l-5.2-9h-7.6L3 20Z" />
    <path d="M12 5v4" />
    <path d="M9.5 3.2c.8 1.2 1.2 2 1.3 3" />
    <path d="M14.6 3.2c-.8 1.2-1.2 2-1.3 3" />
  </svg>
);

export const HeatIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </svg>
);

export const HazeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8h11M6 12h13M4 16h12M9 20h9" />
  </svg>
);

export const DroughtIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21V8" />
    <path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5Z" />
    <path d="M12 16c0-3-2-5-5-5 0 3 2 5 5 5Z" />
    <path d="M4 21h16" />
  </svg>
);

export const LandslideIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 18l5-6 3 3 4-5 6 8H3Z" />
    <circle cx="7" cy="7" r="1.6" />
    <circle cx="12" cy="5" r="1.2" />
    <circle cx="16" cy="7.5" r="1.4" />
  </svg>
);

export const IndustrialIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 20V10l5 3V10l5 3V8l8 5v7H3Z" />
    <path d="M7 4h3v3H7z" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 10v4M12 17.2v.1" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const LocateIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8" />
    <path d="M12 1v3M12 20v3M1 12h3M20 12h3" />
  </svg>
);

export const LayersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </svg>
);

export const MapIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 4 6 2 6-2v14l-6 2-6-2-6 2V6l6-2Z" />
    <path d="M9 4v14M15 6v14" />
  </svg>
);

export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7Z" />
    <path d="M13.7 20a2 2 0 0 1-3.4 0" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const ExternalIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5L16 12l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6.5 3Z" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);

export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.8v.1" />
  </svg>
);

export const FilterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const HazardIcon = ({ hazard, ...props }: IconProps & { hazard: HazardType }) => {
  switch (hazard) {
    case "wildfire":
      return <FlameIcon {...props} />;
    case "flood":
      return <WaterIcon {...props} />;
    case "earthquake":
      return <SeismicIcon {...props} />;
    case "severe-weather":
      return <StormIcon {...props} />;
    case "cyclone":
      return <CycloneIcon {...props} />;
    case "volcano":
      return <VolcanoIcon {...props} />;
    case "extreme-heat":
      return <HeatIcon {...props} />;
    case "air-quality":
      return <HazeIcon {...props} />;
    case "drought":
      return <DroughtIcon {...props} />;
    case "landslide":
      return <LandslideIcon {...props} />;
    case "industrial":
      return <IndustrialIcon {...props} />;
    default:
      return <AlertIcon {...props} />;
  }
};

/**
 * The RiskSense mark: a navy radar emblem with an emergency-orange flame.
 * Served as a transparent PNG so the single asset works on the off-white
 * chrome and on any tinted surface. Decorative next to the "RiskSense"
 * wordmark, hence `alt=""`.
 */
export const RiskSenseLogo = ({ size = 26, ...props }: LogoProps) => (
  <Image
    src="/brand/risksense-mark.png"
    width={size}
    height={size}
    alt=""
    aria-hidden
    className="shrink-0 object-contain"
    {...props}
  />
);
