import { cn } from "@/lib/utils";

/** Penny's neon circuit spade. Swap /public/brand/penny-spade.jpg for the next shop. */
export function SpadeMark({
  className,
  title = "The Spade",
}: {
  className?: string;
  title?: string;
}) {
  const labeled = Boolean(title);
  return (
    <img
      src="/brand/penny-spade.jpg"
      alt={labeled ? title : ""}
      aria-hidden={labeled ? undefined : true}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function BrandSlot({
  className,
  caption,
}: {
  className?: string;
  caption?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-bg", className)}>
      <img
        src="/brand/penny-spade.jpg"
        alt=""
        className="h-full w-full object-contain p-5 mix-blend-screen"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/80 via-transparent to-bg/10" />
      {caption ? (
        <span className="absolute bottom-2 left-2 right-2 font-mono text-[10px] uppercase tracking-[0.18em] text-silver/80">
          {caption}
        </span>
      ) : null}
    </div>
  );
}
