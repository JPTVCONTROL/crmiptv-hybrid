export function lerSessionJson<T>(chave: string): T | null {
  try {
    const raw = sessionStorage.getItem(chave);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function salvarSessionJson(chave: string, valor: unknown): void {
  try {
    sessionStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Quota ou modo privado — ignorar.
  }
}

export function removerSession(chave: string): void {
  sessionStorage.removeItem(chave);
}
