/** Contador em memória — incrementa a cada mutação no banco (web + APK na mesma API). */
let revisaoAtual = Date.now();

export function obterRevisaoDados(): number {
  return revisaoAtual;
}

export function incrementarRevisaoDados(): void {
  revisaoAtual = Date.now();
}
