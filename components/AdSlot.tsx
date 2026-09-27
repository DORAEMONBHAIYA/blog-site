/**
 * Ad-slot placeholder (REQUIREMENTS.md: layout ships slots now, a real ad
 * network is a later step once traffic exists). Renders an empty,
 * clearly-labelled container so page structure/CLS can be designed
 * around it today and filled by an ad tag later.
 */
export default function AdSlot({
  slot,
  className = "",
}: {
  slot: "header" | "in-article" | "sidebar" | "footer";
  className?: string;
}) {
  return (
    <div
      data-ad-slot={slot}
      aria-hidden="true"
      className={`flex items-center justify-center border border-dashed border-zinc-300 text-xs text-zinc-400 dark:border-zinc-700 ${className}`}
    >
      Advertisement
    </div>
  );
}
