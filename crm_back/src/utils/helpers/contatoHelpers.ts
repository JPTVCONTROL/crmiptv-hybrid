export {
  aplicarMascaraTelefoneBr,
  extrairDigitosTelefone,
  formatarTelefoneWhatsApp,
  normalizarTelefoneEntrada,
  telefonePareceInternacional,
  telefoneValidoParaWhatsApp,
} from './telefoneHelpers.js';

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
