import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-white p-3 shadow-md ring-1 ring-foreground/5 transition-all duration-300 select-none",
        "data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0",
        "data-[ending-style]:opacity-0",
        "data-[type=error]:border-red-200 data-[type=error]:bg-red-50",
        "data-[type=success]:border-stage-offer/30"
      )}
    >
      <div className="flex items-start gap-2">
        <ToastPrimitive.Title
          className={cn(
            "flex-1 font-mono text-[11px] uppercase text-slate-600",
            "data-[type=error]:text-red-600",
            "data-[type=success]:text-stage-offer"
          )}
        />
        <ToastPrimitive.Close
          aria-label="Dismiss"
          className="shrink-0 text-slate-400 transition-colors hover:text-ink"
        >
          <XIcon size={14} />
        </ToastPrimitive.Close>
      </div>
    </ToastPrimitive.Root>
  ))
}

export function Toaster() {
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed right-4 bottom-4 z-[100] flex w-72 flex-col-reverse gap-2">
        <ToastList />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}
