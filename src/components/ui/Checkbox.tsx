import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "@/lib/utils";
import { RiCheckLine, RiSubtractLine } from "@remixicon/react";

/* shadcn checkbox foundation, 16px, 4px radius, soft focus ring */
export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer size-4 shrink-0 rounded-sm border border-input-border bg-input shadow-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
        "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-primary-foreground">
        {props.checked === "indeterminate" ? (
          <RiSubtractLine className="size-3.5" />
        ) : (
          <RiCheckLine className="size-3.5" />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
