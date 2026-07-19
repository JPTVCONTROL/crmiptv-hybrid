export interface ConfirmOptions {
  header?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

let confirmFn: ((options: ConfirmOptions) => Promise<boolean>) | null = null;

export function registrarConfirmNotifier(
  fn: (options: ConfirmOptions) => Promise<boolean>
): void {
  confirmFn = fn;
}

export async function confirmarUsuario(
  message: string,
  header?: string,
  confirmText?: string
): Promise<boolean> {
  if (confirmFn) {
    return confirmFn({ message, header, confirmText });
  }

  return confirm(message);
}
