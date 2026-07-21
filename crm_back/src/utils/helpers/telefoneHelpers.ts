/** Normalização e validação de telefone (BR e internacional) para WhatsApp. */

export function extrairDigitosTelefone(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function telefonePareceInternacional(valor: string): boolean {
  const trimmed = valor.trim();
  if (trimmed.startsWith('+')) {
    return true;
  }

  const digitos = extrairDigitosTelefone(valor);
  return digitos.length > 11;
}

export function formatarTelefoneWhatsApp(telefone: string): string | null {
  const digitos = extrairDigitosTelefone(telefone);
  if (!digitos) {
    return null;
  }

  if (digitos.length > 15) {
    return null;
  }

  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }

  if (digitos.length >= 12) {
    return digitos;
  }

  if (digitos.length >= 8 && telefonePareceInternacional(telefone)) {
    return digitos;
  }

  return null;
}

export function telefoneValidoParaWhatsApp(telefone?: string | null): boolean {
  if (!telefone?.trim()) {
    return false;
  }

  return formatarTelefoneWhatsApp(telefone) !== null;
}

export function aplicarMascaraTelefoneBr(valor: string): string {
  const numeros = extrairDigitosTelefone(valor).slice(0, 11);

  if (numeros.length <= 2) {
    return numeros.length ? `(${numeros}` : '';
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

export function normalizarTelefoneEntrada(valor: string): string {
  const trimmed = valor.trim();
  if (!trimmed) {
    return '';
  }

  if (telefonePareceInternacional(trimmed)) {
    const digitos = extrairDigitosTelefone(trimmed).slice(0, 15);
    return trimmed.startsWith('+') ? `+${digitos}` : digitos;
  }

  return aplicarMascaraTelefoneBr(trimmed);
}
