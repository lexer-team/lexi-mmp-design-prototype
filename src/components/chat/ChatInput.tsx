import { cn } from "@/lib/utils";
import { RiArrowUpLine } from "@remixicon/react";
import { useState, useRef, useCallback } from "react";

interface ChatInputProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, placeholder, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSubmit?.(value.trim());
    setValue("");
  }, [value, onSubmit, disabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-input-border bg-input shadow-sm",
        "focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring",
        "transition-[box-shadow,border-color]",
      )}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Try: Analyse my best customers in the last 30 days"}
        disabled={disabled}
        rows={1}
        className={cn(
          "w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-foreground",
          "placeholder:text-muted-foreground outline-none min-h-0 max-h-32",
          "disabled:opacity-50",
        )}
        style={{ lineHeight: "1.5" }}
      />
      <div className="flex items-center justify-end p-2 pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          className={cn(
            "flex size-7 items-center justify-center rounded-full transition-colors",
            value.trim() && !disabled
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          <RiArrowUpLine className="size-4" />
        </button>
      </div>
    </div>
  );
}
