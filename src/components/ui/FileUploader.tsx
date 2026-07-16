import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  RiUploadCloud2Line, RiCloseLine, RiCheckLine, RiErrorWarningLine, RiFile3Line,
} from "@remixicon/react";

/* file uploader: a dropzone (click or drag-and-drop) plus an uploaded-file
   row with progress. Dependency-free (native DnD + file input) — for advanced
   needs (chunking, validation) wrap react-dropzone and keep this chrome. */

export function FileUploader({
  accept,
  multiple = true,
  hint,
  onFilesAdded,
  className,
}: {
  accept?: string;
  multiple?: boolean;
  hint?: React.ReactNode;
  onFilesAdded?: (files: File[]) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(list: FileList | null) {
    if (!list || !list.length) return;
    onFilesAdded?.(Array.from(list));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-6 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
        dragging ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30",
        className,
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <RiUploadCloud2Line className="size-5" />
      </span>
      <p className="text-sm text-foreground">
        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
      </p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

type FileStatus = "uploading" | "done" | "error";

export function UploadedFile({
  name,
  size,
  progress = 100,
  status = "done",
  onRemove,
  className,
}: {
  name: string;
  size: string;
  progress?: number;
  status?: FileStatus;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-border bg-card p-3", className)}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          status === "error"
            ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400"
            : "bg-muted text-muted-foreground",
        )}
      >
        {status === "error" ? <RiErrorWarningLine className="size-5" /> : <RiFile3Line className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate text-sm font-medium text-foreground">{name}</p>
          {status === "done" && <RiCheckLine className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
        </div>
        <p className="text-xs text-muted-foreground">
          {size}
          {status === "uploading" && ` · ${progress}%`}
          {status === "error" && " · upload failed"}
        </p>
        {status === "uploading" && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove file"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40",
          )}
        >
          <RiCloseLine className="size-4" />
        </button>
      )}
    </div>
  );
}
