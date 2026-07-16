import { useState } from "react";
import { cn } from "@/lib/utils";
import { RiArrowRightSLine } from "@remixicon/react";

/* tree view: expand/collapse hierarchy with indentation, optional icons and
   single selection. Built shadcn-style (composition, semantic tokens) — no shadcn
   primitive exists. */

export interface TreeNode {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  children?: TreeNode[];
}

function TreeRow({
  node,
  depth,
  expanded,
  toggle,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const hasChildren = !!node.children?.length;
  const isOpen = expanded.has(node.id);
  return (
    <li>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isOpen : undefined}
        aria-selected={selectedId === node.id}
        className={cn(
          "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg pr-2 text-sm transition-colors",
          selectedId === node.id ? "bg-sidebar-active text-sidebar-active-foreground" : "text-foreground hover:bg-accent/50",
        )}
        style={{ paddingLeft: depth * 16 + 4 }}
        onClick={() => {
          if (hasChildren) toggle(node.id);
          onSelect?.(node.id);
        }}
      >
        {hasChildren ? (
          <RiArrowRightSLine className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
        ) : (
          <span className="size-4 shrink-0" />
        )}
        {node.icon && <span className="shrink-0 text-muted-foreground [&>svg]:size-4">{node.icon}</span>}
        <span className="truncate">{node.label}</span>
      </div>
      {hasChildren && isOpen && (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TreeView({
  nodes,
  defaultExpanded = [],
  selectedId,
  onSelect,
  className,
}: {
  nodes: TreeNode[];
  defaultExpanded?: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpanded));
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  return (
    <ul role="tree" className={cn("flex flex-col", className)}>
      {nodes.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}
