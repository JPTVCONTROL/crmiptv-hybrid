export function inicioDoDia(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function contatoRegistradoHoje(
  ultimoContatoEm: Date | string | null | undefined
): boolean {
  if (!ultimoContatoEm) return false;

  const contato = inicioDoDia(new Date(ultimoContatoEm));
  const hoje = inicioDoDia(new Date());
  return contato.getTime() === hoje.getTime();
}

export function telefoneValidoParaWhatsApp(telefone?: string | null): boolean {
  if (!telefone?.trim()) return false;

  const numeros = telefone.replace(/\D/g, '');
  if (!numeros) return false;
  if (numeros.startsWith('55') && numeros.length >= 12) return true;
  if (numeros.length === 10 || numeros.length === 11) return true;
  return numeros.length >= 12;
}
