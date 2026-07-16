import { Toaster as SonnerToaster, toast } from "sonner";

/* shadcn toast = sonner; notification skin via classNames */

export { toast };

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "w-[356px] rounded-xl border border-border bg-card shadow-lg p-4 flex items-start gap-3 text-sm",
          title: "font-semibold text-foreground",
          description: "text-muted-foreground",
          icon: "shrink-0 mt-0.5 [&>svg]:size-4",
          success: "[&_[data-icon]]:text-emerald-500",
          error: "[&_[data-icon]]:text-rose-500",
          warning: "[&_[data-icon]]:text-amber-500",
          actionButton:
            "ml-auto shrink-0 rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1.5",
          cancelButton:
            "ml-2 shrink-0 rounded-lg text-muted-foreground text-xs font-semibold px-2.5 py-1.5 hover:bg-accent",
        },
      }}
    />
  );
}
