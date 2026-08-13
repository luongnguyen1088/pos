import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  labelClassName?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: {
    frame: "h-10 w-10 rounded-2xl",
    halo: "rounded-[1.1rem]",
    letter: "text-sm",
  },
  md: {
    frame: "h-12 w-12 rounded-[1.35rem]",
    halo: "rounded-[1.2rem]",
    letter: "text-base",
  },
  lg: {
    frame: "h-14 w-14 rounded-[1.55rem]",
    halo: "rounded-[1.35rem]",
    letter: "text-lg",
  },
} as const;

export const BrandMark = ({ className, labelClassName, size = "md" }: BrandMarkProps) => {
  const styles = sizeMap[size];

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(161_61%_36%)_100%)] shadow-[0_12px_32px_-18px_hsl(var(--primary))]",
        styles.frame,
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-[3px] bg-[radial-gradient(circle_at_top,hsl(0_0%_100%_/_0.28),transparent_55%),linear-gradient(180deg,hsl(149_55%_21%)_0%,hsl(159_51%_29%)_100%)]",
          styles.halo,
        )}
      />
      <span
        className={cn(
          "relative font-black uppercase tracking-[0.22em] text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)]",
          styles.letter,
          labelClassName,
        )}
      >
        M
      </span>
    </div>
  );
};

type BrandLockupProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  size?: "sm" | "md";
  className?: string;
};

export const BrandLockup = ({
  title,
  subtitle,
  eyebrow,
  size = "md",
  className,
}: BrandLockupProps) => {
  const titleClassName = size === "sm" ? "text-lg" : "text-2xl";
  const subtitleClassName = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark size={size === "sm" ? "sm" : "md"} />
      <div className="space-y-0.5">
        {eyebrow ? (
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
            {eyebrow}
          </div>
        ) : null}
        <h1 className={cn("font-bold text-foreground", titleClassName)}>{title}</h1>
        <p className={cn("max-w-xl text-muted-foreground", subtitleClassName)}>{subtitle}</p>
      </div>
    </div>
  );
};
