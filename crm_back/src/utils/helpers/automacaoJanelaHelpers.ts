const HORARIO_REGEX = /^(\d{2}):(\d{2})$/;

export function referenciaDiaLocal(data = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function horarioAtualLocal(): string {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, '0');
  const minutos = String(agora.getMinutes()).padStart(2, '0');
  return `${horas}:${minutos}`;
}

export function minutosDoHorario(horario: string): number {
  const match = HORARIO_REGEX.exec(horario.trim());
  if (!match) {
    throw new Error(`Horário inválido: ${horario}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutosAtuaisLocal(): number {
  const agora = new Date();
  return agora.getHours() * 60 + agora.getMinutes();
}

export function estaNaJanelaManha(
  inicio: string,
  fim: string,
  minutosAtuais = minutosAtuaisLocal()
): boolean {
  const inicioMin = minutosDoHorario(inicio);
  const fimMin = minutosDoHorario(fim);
  return minutosAtuais >= inicioMin && minutosAtuais < fimMin;
}

export function montarDataAgendada(minutosDoDia: number, base = new Date()): Date {
  const agendado = new Date(base);
  agendado.setHours(0, 0, 0, 0);
  agendado.setMinutes(minutosDoDia);
  return agendado;
}

/** Distribui horários aleatórios dentro da janela, sem repetir o mesmo minuto. */
export function sortearMinutosNaJanela(
  quantidade: number,
  inicio: string,
  fim: string
): number[] {
  if (quantidade <= 0) {
    return [];
  }

  const inicioMin = minutosDoHorario(inicio);
  const fimMin = minutosDoHorario(fim);
  const span = Math.max(1, fimMin - inicioMin);
  const minutosDisponiveis: number[] = [];

  for (let min = inicioMin; min < fimMin; min++) {
    minutosDisponiveis.push(min);
  }

  for (let i = minutosDisponiveis.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [minutosDisponiveis[i], minutosDisponiveis[j]] = [
      minutosDisponiveis[j],
      minutosDisponiveis[i],
    ];
  }

  const selecionados = minutosDisponiveis.slice(0, quantidade);
  if (selecionados.length < quantidade) {
    while (selecionados.length < quantidade) {
      selecionados.push(inicioMin + Math.floor(Math.random() * span));
    }
  }

  return selecionados.sort((a, b) => a - b);
}

export function validarJanelaManha(inicio: string, fim: string): void {
  const inicioMin = minutosDoHorario(inicio);
  const fimMin = minutosDoHorario(fim);

  if (fimMin <= inicioMin) {
    throw new Error('O fim da janela matinal deve ser depois do início.');
  }

  if (fimMin - inicioMin > 180) {
    throw new Error('A janela matinal pode ter no máximo 3 horas.');
  }
}
