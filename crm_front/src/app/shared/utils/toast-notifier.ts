export type ToastType = 'success' | 'error' | 'warning' | 'info';

let notifier: ((message: string, type?: ToastType) => void) | null = null;

export function registrarToastNotifier(
  fn: (message: string, type?: ToastType) => void
): void {
  notifier = fn;
}

export function notificar(message: string, type: ToastType = 'info'): void {
  if (notifier) {
    notifier(message, type);
    return;
  }

  alert(message);
}
