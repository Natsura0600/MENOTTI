import type { ReactNode } from "react";

type P = { size?: number; className?: string };
const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className,
});
const mk = (children: ReactNode) =>
  function Icon({ size = 22, className }: P) {
    return <svg {...base(size, className)}>{children}</svg>;
  };

export const IconPin = mk(<><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const IconClock = mk(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IconCalendar = mk(<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>);
export const IconInstagram = mk(<><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="3.8" /><circle cx="17.2" cy="6.8" r=".6" fill="currentColor" /></>);
export const IconBall = mk(<><circle cx="12" cy="12" r="9" /><path d="m12 8 3.6 2.6-1.4 4.2H9.8l-1.4-4.2L12 8Z" /><path d="M12 3v5M20.5 9.5 15.6 10.6M17.6 18.6l-3.4-3.8M6.4 18.6l3.4-3.8M3.5 9.5l4.9 1.1" /></>);
export const IconCake = mk(<><path d="M4 20h16v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6ZM4 16c2 1.4 3 1.4 4 0 1.5 1.4 2.5 1.4 4 0 1.5 1.4 2.5 1.4 4 0 1 1.4 2 1.4 4 0" /><path d="M12 12V8M12 5.5c.8-.9.8-1.6 0-2.5-.8.9-.8 1.6 0 2.5Z" /></>);
export const IconTrophy = mk(<><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8.5 20h7" /></>);
export const IconCar = mk(<><path d="M5 16V11l2-5h10l2 5v5" /><path d="M3.5 16h17v2.5h-3V16M3.5 16v2.5h3V16" /><circle cx="8" cy="13" r=".6" fill="currentColor" /><circle cx="16" cy="13" r=".6" fill="currentColor" /></>);
export const IconCheck = mk(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconArrow = mk(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconTicket = mk(<><path d="M3.5 9V7a1.5 1.5 0 0 1 1.5-1.5h14A1.5 1.5 0 0 1 20.5 7v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 16v-2a2.5 2.5 0 0 0 0-5Z" /><path d="M14 5.5v13" strokeDasharray="2 2.4" /></>);
export const IconShield = mk(<><path d="M12 3 5 6v5.5c0 4.2 2.9 7.6 7 9.5 4.1-1.900 7-5.300 7-9.500V6l-7-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>);
export const IconPhone = mk(<><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>);

export const IconWhatsApp = ({ size = 22, className }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm-3.2 5.5c.3 0 .5 0 .7.5l.9 2.1c.1.3 0 .5-.1.7l-.6.8c-.2.2-.2.4 0 .7.9 1.6 2.200 2.800 3.800 3.600.300.100.500.100.700-.100l.800-1c.200-.200.400-.300.700-.200l2.100 1c.300.100.400.300.400.600 0 1.200-1 2.100-2.200 2.100-4.300-.300-7.900-3.900-8.200-8.200 0-1.200.900-2.200 2-2.200Z" />
  </svg>
);

export const SERVICE_ICONS = [IconBall, IconCake, IconTrophy, IconCar];
