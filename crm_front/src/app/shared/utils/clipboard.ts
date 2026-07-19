export async function copiarTexto(texto: string): Promise<boolean> {
  if (!texto.trim()) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();

    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      document.body.removeChild(area);
      return false;
    }
  }
}
