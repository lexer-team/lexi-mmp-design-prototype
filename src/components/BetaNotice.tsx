import { cn } from "@/lib/utils";

type BetaNoticeProps = {
  className?: string;
};

export function BetaNotice({ className }: BetaNoticeProps) {
  return (
    <div className={cn("mb-5 flex w-full justify-center", className)}>
      <div className="w-full max-w-[420px] rounded-xl border border-[#115E59] bg-white px-4 py-3 text-center md:w-auto md:max-w-none">
        <p
          style={{
            fontFamily: '"Rubik", var(--font-sans)',
            fontWeight: 600,
            fontSize: "13px",
            lineHeight: 1.5,
            color: "#115E59",
            marginBottom: "2px",
          }}
        >
          Lexi is in Beta and still evolving.
        </p>
        <p
          className="md:whitespace-nowrap"
          style={{
            fontFamily: '"Rubik", var(--font-sans)',
            fontWeight: 400,
            fontSize: "13px",
            lineHeight: 1.5,
            color: "#8A8A85",
          }}
        >
          While we refine Lexi, you may see occasional bugs or downtime, Use the feedback button on any response to help shape what we build next.
        </p>
      </div>
    </div>
  );
}