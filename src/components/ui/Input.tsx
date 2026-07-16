import { cn } from "@/lib/utils";
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";

/* shadcn input foundation, rounded-lg, shadow-xs, soft 4px focus ring */
export const inputClasses = cn(
  "w-full rounded-lg border border-input-border bg-input text-sm text-foreground shadow-xs",
  "placeholder:text-muted-foreground",
  "focus:outline-none focus:border-ring focus:ring-4 focus:ring-ring/40",
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
  "aria-invalid:border-destructive aria-invalid:focus:ring-destructive/20",
  "transition-colors",
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClasses, "h-10 px-3", className)} {...props} />
  ),
);
Input.displayName = "Input";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-foreground select-none", className)}
      {...props}
    />
  );
}

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: ReactNode | ((props: { id: string; "aria-invalid"?: boolean }) => ReactNode);
}

/** field anatomy: label → control → hint/error */
export function Field({ label, hint, error, required, htmlFor, className, children }: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-primary ml-0.5">*</span>}
        </Label>
      )}
      {typeof children === "function"
        ? children({ id, "aria-invalid": error ? true : undefined })
        : children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
