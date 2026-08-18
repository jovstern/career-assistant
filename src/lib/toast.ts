import { Toast } from "@base-ui/react/toast"

export const toastManager = Toast.createToastManager()

export function toastSuccess(message: string) {
  toastManager.add({ title: message, type: "success", timeout: 4000 })
}

export function toastError(message: string) {
  toastManager.add({ title: message, type: "error", timeout: 6000 })
}
