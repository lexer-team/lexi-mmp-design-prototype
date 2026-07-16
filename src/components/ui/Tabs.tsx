import * as TabsPrimitive from "@radix-ui/react-tabs";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

/* shadcn tabs foundation, two styles:
   - underline (default): bottom border, 2px active underline
   - segmented ("button gray"): gray track, active item gets card bg + shadow-sm */

type TabsVariant = "underline" | "segmented";
const TabsVariantContext = createContext<TabsVariant>("underline");

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

export function TabsList({
  className,
  variant = "underline",
  ...props
}: TabsPrimitive.TabsListProps & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        className={cn(
          variant === "underline" && "flex gap-4 border-b border-border",
          variant === "segmented" && "inline-flex gap-0.5 rounded-lg bg-muted p-1",
          className,
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  );
}

export function TabsTrigger({
  className,
  count,
  children,
  ...props
}: TabsPrimitive.TabsTriggerProps & { count?: number }) {
  const variant = useContext(TabsVariantContext);
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm font-semibold outline-none transition-colors disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-4 focus-visible:ring-ring/40 rounded-md",
        variant === "underline" &&
          cn(
            "pb-2.5 px-1 -mb-px border-b-2 border-transparent rounded-none text-muted-foreground",
            "hover:text-foreground data-[state=active]:text-primary data-[state=active]:border-primary",
          ),
        variant === "segmented" &&
          cn(
            "px-3 py-1.5 rounded-md text-muted-foreground",
            "hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm",
          ),
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className="rounded-full bg-muted px-1.5 text-xs font-medium tabular-nums text-muted-foreground transition-colors group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary">
          {count}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
}
