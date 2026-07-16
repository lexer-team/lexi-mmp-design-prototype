import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "@/lib/utils";

/* shadcn radio-group foundation, 16px circle, filled-dot active */

export function RadioGroup({ className, ...props }: RadioGroupPrimitive.RadioGroupProps) {
  return <RadioGroupPrimitive.Root className={cn("grid gap-2.5", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: RadioGroupPrimitive.RadioGroupItemProps) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "aspect-square size-4 shrink-0 rounded-full border border-input-border bg-input shadow-xs transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
        "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-1.5 rounded-full bg-primary-foreground" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}
