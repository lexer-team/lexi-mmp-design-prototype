import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

/* shadcn switch foundation, toggle skin: 36×20 track, 16px thumb w/ shadow-sm */
export function Switch({ className, ...props }: SwitchPrimitive.SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors",
        "bg-accent data-[state=checked]:bg-primary",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform",
          "data-[state=checked]:translate-x-4",
        )}
      />
    </SwitchPrimitive.Root>
  );
}
