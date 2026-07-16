import { cn } from "@/lib/utils";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { inputClasses } from "./Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputClasses, "min-h-20 px-3 py-2.5 resize-y", className)}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
