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

export function rotuloAjudaTelefone(valor: string): string {
  if (telefonePareceInternacional(valor)) {
    return 'Use código do país, ex.: +351 912 345 678 ou +1 305 555 0100.';
  }

  return 'Brasil: (62) 99999-9999. Internacional: comece com + e o código do país.';
}

function resolverCodigoPaisExibicao(digitos: string): string {
  const codigos3 = ['351', '353', '352', '354', '358', '420', '421'];
  for (const codigo of codigos3) {
    if (digitos.startsWith(codigo) && digitos.length >= codigo.length + 8) {
      return codigo;
    }
  }

  if (digitos.startsWith('1') && digitos.length >= 11) {
    return '1';
  }

  if (digitos.startsWith('55') && digitos.length >= 12) {
    return '55';
  }

  if (digitos.startsWith('44') && digitos.length >= 11) {
    return '44';
  }

  if (digitos.startsWith('49') && digitos.length >= 11) {
    return '49';
  }

  if (digitos.length >= 12) {
    return digitos.slice(0, 3);
  }

  if (digitos.length >= 11) {
    return digitos.slice(0, 2);
  }

  return digitos.slice(0, 1);
}

function formatarInternacionalExibicao(digitos: string): string {
  const codigoPais = resolverCodigoPaisExibicao(digitos);
  const resto = digitos.slice(codigoPais.length);
  const blocos = resto.match(/.{1,3}/g) ?? [];

  if (blocos.length === 0) {
    return `+${codigoPais}`;
  }

  return `+${codigoPais} ${blocos.join(' ')}`;
}

/** Formata telefone para exibição na UI (BR ou internacional). */
export function formatarTelefoneExibicao(telefone?: string | null): string {
  if (!telefone?.trim()) {
    return '';
  }

  const trimmed = telefone.trim();
  const digitos = extrairDigitosTelefone(trimmed);
  if (!digitos) {
    return trimmed;
  }

  if (digitos.length === 10 || digitos.length === 11) {
    return aplicarMascaraTelefoneBr(digitos);
  }

  if (
    digitos.startsWith('55') &&
    (digitos.length === 12 || digitos.length === 13)
  ) {
    return `+55 ${aplicarMascaraTelefoneBr(digitos.slice(2))}`;
  }

  if (
    digitos.length >= 12 ||
    (digitos.length >= 8 && telefonePareceInternacional(trimmed))
  ) {
    return formatarInternacionalExibicao(digitos);
  }

  return trimmed;
}
