import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { PRIORITY_INFO } from "@/lib/validation";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border bg-card shadow-card", className)}>{children}</div>;
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 rounded-full bg-primary-soft p-3 text-primary">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="m-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {message}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}

const priorityStyles: Record<number, string> = {
  1: "bg-p1-soft text-p1 border-p1/30",
  2: "bg-p2-soft text-p2 border-p2/30",
  3: "bg-p3-soft text-p3 border-p3/30",
  4: "bg-p4-soft text-p4 border-p4/30",
};

export function PriorityBadge({ priority }: { priority: number }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", priorityStyles[priority])}>
      <span aria-hidden className="text-sm leading-none">{priority}</span>
      {PRIORITY_INFO[priority]?.label}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  Booked: "bg-primary-soft text-primary border-primary/20",
  Cancelled: "bg-muted text-muted-foreground border-border",
  Pending: "bg-p2-soft text-p2 border-p2/30",
  Processed: "bg-p4-soft text-p4 border-p4/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", statusStyles[status])}>{status}</span>
  );
}

export function DemoTag({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="ml-2 rounded bg-teal-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">Demo</span>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b py-2.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-foreground">{value || <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}

export const formatTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
};
export const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const formatDateTime = (d: string) =>
  new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
