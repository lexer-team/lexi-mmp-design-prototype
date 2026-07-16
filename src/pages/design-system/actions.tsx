import { ComponentDoc, Row } from "./doc";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut,
} from "@/components/ui/DropdownMenu";
import {
  RiAddLine, RiDeleteBinLine, RiEditLine, RiDownloadLine, RiSearchLine,
  RiArrowRightLine, RiMoreLine, RiFileCopyLine, RiShareLine,
} from "@remixicon/react";

const BUTTON_CODE = `import { Button } from "@/components/ui/Button";

// Variants: default | secondary | outline | ghost | destructive | link
// Sizes: xs (32px) | sm (36px) | default (40px) | lg (44px) | icon | icon-sm
<Button>Save changes</Button>
<Button variant="outline"><RiDownloadLine />Export</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="link">Learn more</Button>`;

const DROPDOWN_CODE = `import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";

<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><RiMoreLine /></Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem><RiEditLine />Rename</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem destructive><RiDeleteBinLine />Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`;

const COMMAND_MENU_CODE = `import { CommandMenu } from "@/components/ui/CommandMenu";

// Mounted once in App; toggled with the backtick key
<CommandMenu onBack={goBack} showDesignSystem onDesignSystem={openDS} />`;

export function ActionsSections() {
  return (
    <>
      <ComponentDoc
        id="button"
        title="Button"
        description="Actions and commands. 36/40/44px heights (+32px xs), semibold label, 8px radius, skeuomorphic shadow + inner-border gradient on solid variants, merged-ring border on outline, soft 4px focus ring."
        code={BUTTON_CODE}
        dos={[
          "Use default (primary) for the single main action on a view.",
          "Use outline for secondary actions next to a primary button.",
          "Use ghost for low-emphasis or repeated actions (toolbars, rows).",
          "Pair icons with labels; icon-only buttons need a tooltip or aria-label.",
        ]}
        donts={[
          "Don't place two primary buttons in the same action group.",
          "Don't use destructive for non-irreversible actions — confirm first.",
          "Don't override heights with className; pick the right size.",
        ]}
      >
        <Row label="Variants">
          <Button variant="default">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </Row>
        <Row label="Sizes">
          <Button size="lg">Large 44</Button>
          <Button size="default">Default 40</Button>
          <Button size="sm">Small 36</Button>
          <Button size="xs">XSmall 32</Button>
          <Button size="icon"><RiSearchLine /></Button>
          <Button size="icon-sm"><RiAddLine /></Button>
        </Row>
        <Row label="With icons">
          <Button><RiAddLine />New Chat</Button>
          <Button variant="outline"><RiDownloadLine />Export</Button>
          <Button variant="ghost"><RiEditLine />Edit</Button>
          <Button variant="destructive"><RiDeleteBinLine />Delete</Button>
          <Button>Continue <RiArrowRightLine /></Button>
        </Row>
        <Row label="States">
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>Disabled outline</Button>
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="dropdown"
        title="Dropdown menu"
        description="Contextual action menus (Radix). rounded-lg, shadow-lg, font-medium items, destructive items in red."
        code={DROPDOWN_CODE}
        dos={["Order items by frequency of use; destructive actions last after a separator.", "Use leading icons consistently within a menu."]}
        donts={["Don't exceed ~8 items without grouping.", "Don't put forms or inputs inside dropdown menus — use a Dialog."]}
      >
        <Row>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Chat actions <RiMoreLine /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Chat</DropdownMenuLabel>
              <DropdownMenuItem><RiEditLine />Rename<DropdownMenuShortcut>⌘R</DropdownMenuShortcut></DropdownMenuItem>
              <DropdownMenuItem><RiFileCopyLine />Duplicate</DropdownMenuItem>
              <DropdownMenuItem><RiShareLine />Share</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive><RiDeleteBinLine />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="command-menu"
        title="Command menu"
        description="Keyboard-driven quick actions, toggled with the backtick (`) key. Overlay card: 12px radius, shadow-lg."
        code={COMMAND_MENU_CODE}
        dos={["Keep actions short and verb-first (Back to chats, Open design system).", "Close the menu after every action."]}
        donts={["Don't trigger it while an input or textarea is focused (already guarded).", "Don't nest more than one level of actions."]}
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          Press
          <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">`</kbd>
          anywhere in the app to open the command menu.
        </div>
      </ComponentDoc>
    </>
  );
}
