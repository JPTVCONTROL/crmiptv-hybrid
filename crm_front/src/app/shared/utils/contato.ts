export function inicioDoDia(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function contatoRegistradoHoje(
  ultimoContatoEm?: string | null
): boolean {
  if (!ultimoContatoEm) return false;

  const contato = inicioDoDia(new Date(ultimoContatoEm));
  const hoje = inicioDoDia(new Date());
  return contato.getTime() === hoje.getTime();
}

export function rotuloUltimoContato(ultimoContatoEm?: string | null): string {
  if (!ultimoContatoEm) {
    return 'Nunca contactado';
  }

  if (contatoRegistradoHoje(ultimoContatoEm)) {
    const hora = new Date(ultimoContatoEm).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Contactado hoje às ${hora}`;
  }

  return `Último contato: ${new Date(ultimoContatoEm).toLocaleDateString('pt-BR')}`;
}

export function classeIndicadorContato(
  ultimoContatoEm?: string | null
): string {
  if (contatoRegistradoHoje(ultimoContatoEm)) {
    return 'text-green-400';
  }

  if (!ultimoContatoEm) {
    return 'text-amber-400';
  }

  return 'text-slate-500';
}

export function bloqueioEnviadoHoje(
  bloqueioEnviadoEm?: string | null
): boolean {
  return contatoRegistradoHoje(bloqueioEnviadoEm);
}

export function rotuloBloqueioEnviado(
  bloqueioEnviadoEm?: string | null
): string | null {
  if (!bloqueioEnviadoEm) {
    return null;
  }

  if (bloqueioEnviadoHoje(bloqueioEnviadoEm)) {
    const hora = new Date(bloqueioEnviadoEm).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Bloqueio avisado hoje às ${hora}`;
  }

  return `Bloqueio avisado em ${new Date(bloqueioEnviadoEm).toLocaleDateString('pt-BR')}`;
}
