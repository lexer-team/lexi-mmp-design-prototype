import { useState, useEffect } from "react";
import { ComponentDoc, Row } from "./doc";
import { Input, Field, Label } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { Switch } from "@/components/ui/Switch";
import { FileUploader, UploadedFile } from "@/components/ui/FileUploader";
import { DatePicker } from "@/components/ui/DatePicker";

const DATEPICKER_CODE = `import { DatePicker } from "@/components/ui/DatePicker";

const [date, setDate] = useState<Date>();
<DatePicker value={date} onChange={setDate} placeholder="Pick a date" />

// Vanilla calendar (no dependency). For ranges, locales and keyboard grids,
// react-day-picker (npm: react-day-picker) is the shadcn base — reskin to these tokens.`;

function DatePickerDemo() {
  const [date, setDate] = useState<Date | undefined>(undefined);
  return (
    <Field label="Start date" hint="Choose when the segment begins syncing.">
      <DatePicker value={date} onChange={setDate} />
    </Field>
  );
}

type UploadStatus = "uploading" | "done" | "error";
interface FileEntry {
  id: string;
  name: string;
  size: string;
  progress: number;
  status: UploadStatus;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const FILEUPLOADER_CODE = `import { FileUploader, UploadedFile } from "@/components/ui/FileUploader";

<FileUploader hint="CSV, JSON or XLSX up to 50MB" onFilesAdded={addFiles} />
<UploadedFile name="customers.csv" size="2.4 MB" status="done" onRemove={remove} />
<UploadedFile name="segments.json" size="812 KB" status="uploading" progress={64} />
<UploadedFile name="export.xlsx" size="—" status="error" onRemove={remove} />`;

function FileUploaderDemo() {
  const [files, setFiles] = useState<FileEntry[]>([
    { id: "a", name: "customers-2024.csv", size: "2.4 MB", progress: 100, status: "done" },
    { id: "b", name: "segments.json", size: "812 KB", progress: 64, status: "uploading" },
    { id: "c", name: "broken-export.xlsx", size: "—", progress: 0, status: "error" },
  ]);

  useEffect(() => {
    const t = setInterval(() => {
      setFiles((prev) => {
        if (!prev.some((f) => f.status === "uploading")) return prev;
        return prev.map((f) =>
          f.status !== "uploading"
            ? f
            : f.progress >= 100
              ? { ...f, status: "done" as const }
              : { ...f, progress: Math.min(100, f.progress + 8) },
        );
      });
    }, 400);
    return () => clearInterval(t);
  }, []);

  function addFiles(added: File[]) {
    setFiles((prev) => [
      ...prev,
      ...added.map((f) => ({
        id: `${Date.now()}-${f.name}`,
        name: f.name,
        size: formatSize(f.size),
        progress: 0,
        status: "uploading" as const,
      })),
    ]);
  }

  return (
    <div className="flex max-w-md flex-col gap-3">
      <FileUploader hint="CSV, JSON or XLSX up to 50MB" onFilesAdded={addFiles} />
      {files.map((f) => (
        <UploadedFile
          key={f.id}
          name={f.name}
          size={f.size}
          progress={f.progress}
          status={f.status}
          onRemove={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
        />
      ))}
    </div>
  );
}

const INPUT_CODE = `import { Input, Field } from "@/components/ui/Input";

<Field label="Email" hint="We'll never share it." required>
  {(p) => <Input {...p} type="email" placeholder="you@lexer.io" />}
</Field>
<Field label="Workspace" error="This name is taken.">
  {(p) => <Input {...p} defaultValue="lexer" />}
</Field>`;

const TEXTAREA_CODE = `import { Textarea } from "@/components/ui/Textarea";

<Field label="Description">
  {(p) => <Textarea {...p} placeholder="Describe the segment…" />}
</Field>`;

const SELECT_CODE = `import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";

<Select defaultValue="30d">
  <SelectTrigger className="w-56"><SelectValue placeholder="Period" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="7d">Last 7 days</SelectItem>
    <SelectItem value="30d">Last 30 days</SelectItem>
  </SelectContent>
</Select>`;

const CHECKBOX_CODE = `import { Checkbox } from "@/components/ui/Checkbox";

<label className="flex items-center gap-2 text-sm">
  <Checkbox defaultChecked /> Email me a weekly digest
</label>`;

const RADIO_CODE = `import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";

<RadioGroup defaultValue="all">
  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="all" /> All customers</label>
  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="segment" /> A segment</label>
</RadioGroup>`;

const SWITCH_CODE = `import { Switch } from "@/components/ui/Switch";

<label className="flex items-center gap-2 text-sm">
  <Switch defaultChecked /> Enable notifications
</label>`;

export function FormsSections() {
  const [switchOn, setSwitchOn] = useState(true);
  return (
    <>
      <ComponentDoc
        id="input"
        title="Input"
        description="Single-line text entry. field anatomy (label → control → hint/error), shadow-xs, soft 4px focus ring."
        code={INPUT_CODE}
        dos={[
          "Always pair inputs with a visible label via Field.",
          "Use hint text for format guidance, error text for validation.",
          "Mark required fields with the required prop.",
        ]}
        donts={[
          "Don't use placeholder text as a label substitute.",
          "Don't show hint and error at once — error replaces hint.",
        ]}
      >
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <Field label="Email" hint="We'll never share it." required>
            {(p) => <Input {...p} type="email" placeholder="you@lexer.io" />}
          </Field>
          <Field label="Workspace name" error="This name is already taken.">
            {(p) => <Input {...p} defaultValue="lexer" />}
          </Field>
          <Field label="Disabled">
            {(p) => <Input {...p} disabled placeholder="Read only" />}
          </Field>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="textarea"
        title="Textarea"
        description="Multi-line text entry sharing the Input skin."
        code={TEXTAREA_CODE}
        dos={["Set a sensible min-height for the expected content.", "Allow vertical resize unless layout forbids it."]}
        donts={["Don't use a textarea for single-line values.", "Don't disable resize without a reason."]}
      >
        <div className="max-w-md">
          <Field label="Description" hint="Visible to your team only.">
            {(p) => <Textarea {...p} placeholder="Describe the segment…" />}
          </Field>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="select"
        title="Select"
        description="Single-choice picker (Radix). Menu: rounded-lg, shadow-lg, trailing check on the selected item ()."
        code={SELECT_CODE}
        dos={["Use for 5+ options or constrained vocabularies.", "Show the selected state with the trailing check."]}
        donts={["Don't use for 2–4 options — use radios or segmented tabs.", "Don't nest interactive elements inside items."]}
      >
        <Row>
          <Select defaultValue="30d">
            <SelectTrigger className="w-56"><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="custom">Custom range…</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-56"><SelectValue placeholder="Pick a metric" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="orders">Orders</SelectItem>
              <SelectItem value="aov">Average order value</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </ComponentDoc>

      <ComponentDoc
        id="checkbox"
        title="Checkbox"
        description="Multi-select control. 16px, 4px radius, primary fill when checked."
        code={CHECKBOX_CODE}
        dos={["Wrap with a label element so the text is clickable.", "Use indeterminate for partial selections in lists."]}
        donts={["Don't use checkboxes for mutually exclusive choices.", "Don't trigger immediate destructive actions on check."]}
      >
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> Email me a weekly digest</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox /> Include archived chats</label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox disabled /> Disabled option</label>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="radio"
        title="Radio group"
        description="Single-choice control for small option sets. 16px circle, filled dot when selected."
        code={RADIO_CODE}
        dos={["Use for 2–4 mutually exclusive options.", "Pre-select the safest or most common option."]}
        donts={["Don't use radios when multiple selections are valid.", "Don't leave a radio group with no default unless choice is required."]}
      >
        <RadioGroup defaultValue="all">
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="all" /> All customers</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="segment" /> A specific segment</label>
          <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="upload" /> Uploaded list</label>
        </RadioGroup>
      </ComponentDoc>

      <ComponentDoc
        id="toggle"
        title="Toggle"
        description="On/off switch with immediate effect (toggle: 36×20 track, 16px thumb)."
        code={SWITCH_CODE}
        dos={["Use when the change applies immediately, no save step.", "Label with the positive state (e.g. \"Notifications\")."]}
        donts={["Don't use a toggle inside forms that need submission — use a checkbox.", "Don't flip labels (\"Disable X\") — keep state semantics on the control."]}
      >
        <div className="flex flex-col gap-3">
          <Label className="flex items-center gap-2"><Switch checked={switchOn} onCheckedChange={setSwitchOn} /> Enable notifications</Label>
          <Label className="flex items-center gap-2 text-muted-foreground"><Switch disabled /> Disabled</Label>
        </div>
      </ComponentDoc>

      <ComponentDoc
        id="date-picker"
        title="Date picker"
        description="A trigger that opens a calendar popover for single-date selection. Built vanilla (no dependency); for ranges, locales and keyboard grids, react-day-picker (npm: react-day-picker) is the shadcn base — reskin to these tokens and keep this trigger."
        code={DATEPICKER_CODE}
        dos={[
          "Show the selected date in a readable format on the trigger.",
          "Default the calendar to a useful month (today or the current value).",
          "Wrap with Field for a label and hint, like other inputs.",
        ]}
        donts={[
          "Don't use a date picker for far-apart known dates — a typed input is faster.",
          "Don't hide the selected value behind an icon-only trigger.",
        ]}
      >
        <DatePickerDemo />
      </ComponentDoc>

      <ComponentDoc
        id="file-uploader"
        title="File uploader"
        description="Dropzone (click or drag-and-drop) plus uploaded-file rows with progress and error states. Dependency-free (native DnD); for chunking/validation wrap react-dropzone (npm: react-dropzone) and keep this chrome. Drop files to try it."
        code={FILEUPLOADER_CODE}
        dos={[
          "State accepted formats and the size limit in the hint.",
          "Show per-file progress and a clear error + retry path.",
          "Let users remove a file before and after upload.",
        ]}
        donts={[
          "Don't block the UI during upload — keep it inline and cancellable.",
          "Don't accept everything silently; validate type/size and surface failures.",
        ]}
      >
        <FileUploaderDemo />
      </ComponentDoc>
    </>
  );
}
