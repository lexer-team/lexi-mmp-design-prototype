import { useState } from "react";
import { ComponentDoc, Row } from "./doc";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { toast } from "@/components/ui/Toast";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
  ConfirmDialog,
} from "@/components/ui/Dialog";
import { FeaturedIcon } from "@/components/ui/FeaturedIcon";
import { Input, Field } from "@/components/ui/Input";
import { RiDeleteBinLine, RiInformationLine, RiCheckboxCircleLine } from "@remixicon/react";

const MODAL_CODE = `// Five modal types, all built on the Dialog base:
//  1 Confirmation   – Dialog size="sm", neutral, Cancel + primary
//  2 Destructive    – ConfirmDialog (no outside-click/esc dismiss, focus Cancel)
//  3 Form           – Dialog size="lg", fields + footer
//  4 Informational  – brand featured icon, single acknowledge
//  5 Success        – success featured icon, single Done
import { ConfirmDialog } from "@/components/ui/Dialog";

const [open, setOpen] = useState(false);
<ConfirmDialog open={open} onOpenChange={setOpen} variant="destructive"
  icon={RiDeleteBinLine} title="Delete segment?" confirmLabel="Delete"
  description="This cannot be undone." onConfirm={destroy} />

// Rules: one primary action; destructive → ConfirmDialog; sizes sm 400 / md 480 / lg 640;
// ESC + outside-click close non-destructive modals only.`;

function ModalPatternsDemo() {
  const [destroy, setDestroy] = useState(false);
  return (
    <Row>
      <Dialog>
        <DialogTrigger asChild><Button variant="outline">Confirmation</Button></DialogTrigger>
        <DialogContent size="sm">
          <div className="flex gap-4">
            <FeaturedIcon color="brand"><RiInformationLine /></FeaturedIcon>
            <DialogHeader>
              <DialogTitle>Publish segment?</DialogTitle>
              <DialogDescription>Loyalty Gold will start syncing to connected destinations.</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="destructive" onClick={() => setDestroy(true)}><RiDeleteBinLine />Delete…</Button>
      <ConfirmDialog
        open={destroy}
        onOpenChange={setDestroy}
        variant="destructive"
        icon={RiDeleteBinLine}
        title="Delete segment?"
        description={'"Loyalty Gold" and its 4,821 member associations will be removed. This cannot be undone.'}
        confirmLabel="Delete"
      />

      <Dialog>
        <DialogTrigger asChild><Button variant="outline">Form</Button></DialogTrigger>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>New segment</DialogTitle>
            <DialogDescription>Name your segment and add an optional description.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex flex-col gap-4">
            <Field label="Name" required>{(p) => <Input {...p} placeholder="e.g. Loyalty Gold" />}</Field>
            <Field label="Description">{(p) => <Input {...p} placeholder="Optional" />}</Field>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild><Button variant="outline">Informational</Button></DialogTrigger>
        <DialogContent size="sm">
          <div className="flex gap-4">
            <FeaturedIcon color="brand"><RiInformationLine /></FeaturedIcon>
            <DialogHeader>
              <DialogTitle>About context layers</DialogTitle>
              <DialogDescription>Context layers let Lexi ground responses in your own definitions and metrics.</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter><DialogClose asChild><Button>Got it</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild><Button variant="outline">Success</Button></DialogTrigger>
        <DialogContent size="sm">
          <div className="flex gap-4">
            <FeaturedIcon color="success"><RiCheckboxCircleLine /></FeaturedIcon>
            <DialogHeader>
              <DialogTitle>Segment published</DialogTitle>
              <DialogDescription>Loyalty Gold is now live and syncing.</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter><DialogClose asChild><Button>Done</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </Row>
  );
}

const ALERT_CODE = `import { Alert } from "@/components/ui/Alert";

// variant: info (default) | success | warning | error
<Alert variant="warning" title="Approaching your row limit">
  You've used 9.2M of 10M rows. Upgrade to keep importing.
</Alert>

// with actions + dismiss
<Alert variant="error" title="Sync failed" onDismiss={dismiss}
  actions={<><Button variant="outline" size="sm">Retry</Button><Button variant="link" size="sm">View log</Button></>}>
  The connection to Snowflake timed out.
</Alert>`;

function AlertDemo() {
  const [dismissed, setDismissed] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Alert variant="info" title="Heads up">A new version of the segment builder is available.</Alert>
      <Alert variant="success" title="Segment published">Loyalty Gold is now live and syncing.</Alert>
      <Alert variant="warning" title="Approaching your row limit">
        You've used 9.2M of 10M rows. Upgrade to keep importing.
      </Alert>
      {dismissed ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setDismissed(false)}>
          Restore dismissible alert
        </Button>
      ) : (
        <Alert
          variant="error"
          title="Sync failed"
          onDismiss={() => setDismissed(true)}
          actions={
            <>
              <Button variant="outline" size="sm">Retry</Button>
              <Button variant="link" size="sm">View log</Button>
            </>
          }
        >
          The connection to Snowflake timed out.
        </Alert>
      )}
    </div>
  );
}

const SKELETON_CODE = `import { Skeleton } from "@/components/ui/Skeleton";

<Skeleton className="h-4 w-3/4" />
<Skeleton className="h-8 w-8 rounded-lg" />`;

const TOAST_CODE = `import { toast } from "@/components/ui/Toast"; // <Toaster /> is mounted in App

toast.success("Segment created", { description: "Loyalty Gold is now live." });
toast.error("Export failed", { description: "The file exceeded 50MB." });`;

const TOOLTIP_CODE = `import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild><Button variant="outline" size="icon"><RiDeleteBinLine /></Button></TooltipTrigger>
    <TooltipContent>Delete chat</TooltipContent>
  </Tooltip>
</TooltipProvider>`;

const DIALOG_CODE = `import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/Dialog";

<Dialog>
  <DialogTrigger asChild><Button variant="destructive">Delete segment</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Delete segment?</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`;

export function FeedbackSections() {
  return (
    <>
      <ComponentDoc
        id="alert"
        title="Alert"
        description="Inline, persistent messages tied to a surface (banner). Built on the shadcn Alert base: tinted container + ring, leading status icon, optional actions and dismiss. Colors stay Lexer hues."
        code={ALERT_CODE}
        dos={[
          "Use the variant that matches severity: info, success, warning, error.",
          "Keep the title to a short statement; put detail in the body.",
          "Offer a recovery action (Retry, Upgrade) when the user can act.",
        ]}
        donts={[
          "Don't use an alert for transient confirmation — use a Toast.",
          "Don't stack many alerts; consolidate or prioritise the most important.",
          "Don't make a dismissible alert carry the only copy of critical info.",
        ]}
      >
        <AlertDemo />
      </ComponentDoc>

      <ComponentDoc
        id="skeleton"
        title="Skeleton"
        description="Loading placeholders that mirror the layout they replace."
        code={SKELETON_CODE}
        dos={["Match the skeleton's shape and size to the content it stands in for.", "Show skeletons immediately — no spinner-then-skeleton sequences."]}
        donts={["Don't show skeletons for actions the user just performed (use optimistic UI).", "Don't leave skeletons pulsing beyond ~10s; switch to an error or empty state."]}
      >
        <div className="flex flex-col gap-2 p-4 bg-card rounded-xl border border-border max-w-xs">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 flex flex-col gap-2 justify-center">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="toast"
        title="Toast"
        description="Transient notifications (sonner). card with border, shadow-lg, semibold title."
        code={TOAST_CODE}
        dos={["Confirm the outcome (\"Segment created\"), not the click.", "Keep to one line of description; link out for detail."]}
        donts={["Don't use toasts for errors that block the user — use a Dialog or inline error.", "Don't stack more than 3; sonner collapses them, keep messages distinct."]}
      >
        <Row>
          <Button variant="outline" onClick={() => toast.success("Segment created", { description: "Loyalty Gold is now live." })}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error("Export failed", { description: "The file exceeded 50MB." })}>
            Error toast
          </Button>
          <Button variant="outline" onClick={() => toast("Synced", { description: "Data refreshed 2 minutes ago." })}>
            Neutral toast
          </Button>
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="tooltip"
        title="Tooltip"
        description="Labels for icon-only controls and supplemental hints. dark pill, xs/semibold."
        code={TOOLTIP_CODE}
        dos={["Use on every icon-only button.", "Keep under ~8 words; tooltips are labels, not docs."]}
        donts={["Don't put interactive content inside tooltips.", "Don't tooltip self-explanatory text."]}
      >
        <TooltipProvider delayDuration={150}>
          <Row>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline" size="icon"><RiDeleteBinLine /></Button></TooltipTrigger>
              <TooltipContent>Delete chat</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild><Button variant="outline">Hover me</Button></TooltipTrigger>
              <TooltipContent side="right">Shown to the right</TooltipContent>
            </Tooltip>
          </Row>
        </TooltipProvider>
      </ComponentDoc>

      <ComponentDoc
        id="dialog"
        title="Dialog"
        description="Blocking confirmation and focused tasks (Radix). rounded-xl, shadow-xl, dimmed blurred overlay, footer actions right-aligned."
        code={DIALOG_CODE}
        dos={["Lead with a clear question or task in the title.", "Make the safe action the outline button, destructive on the right.", "Use a featured icon to signal intent."]}
        donts={["Don't open dialogs from dialogs.", "Don't use a dialog for non-blocking feedback — use a toast."]}
      >
        <Row>
          <Dialog>
            <DialogTrigger asChild><Button variant="destructive"><RiDeleteBinLine />Delete segment</Button></DialogTrigger>
            <DialogContent>
              <div className="flex gap-4">
                <FeaturedIcon color="error"><RiDeleteBinLine /></FeaturedIcon>
                <DialogHeader>
                  <DialogTitle>Delete segment?</DialogTitle>
                  <DialogDescription>
                    "Loyalty Gold" and its 4,821 member associations will be removed. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button variant="destructive">Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline"><RiInformationLine />Info dialog</Button></DialogTrigger>
            <DialogContent>
              <div className="flex gap-4">
                <FeaturedIcon color="brand"><RiInformationLine /></FeaturedIcon>
                <DialogHeader>
                  <DialogTitle>About context layers</DialogTitle>
                  <DialogDescription>
                    Context layers let Lexi ground responses in your own definitions, metrics, and business rules.
                  </DialogDescription>
                </DialogHeader>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button>Got it</Button></DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="modal"
        title="Modal patterns"
        description="Five modal types on the Dialog base: confirmation, destructive (ConfirmDialog — no outside-click/esc dismiss), form, informational, and success. Sizes sm 400 / md 480 / lg 640. ConfirmDialog mirrors an AlertDialog without a new dependency; for a dedicated primitive use @radix-ui/react-alert-dialog."
        code={MODAL_CODE}
        dos={[
          "Give every modal exactly one primary action.",
          "Use ConfirmDialog for destructive or irreversible actions — never a dismissible Dialog.",
          "Match size to content: sm for confirms, lg for forms.",
          "Anchor intent with a featured icon (brand/success/error).",
        ]}
        donts={[
          "Don't open a modal from a modal.",
          "Don't let outside-click or ESC dismiss a destructive confirmation.",
          "Don't put long forms in a modal — use a page or slideout.",
        ]}
      >
        <ModalPatternsDemo />
      </ComponentDoc>
    </>
  );
}
