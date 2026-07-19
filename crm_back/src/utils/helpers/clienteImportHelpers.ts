export interface LinhaClienteImportacao {
  linha: number;
  nome: string;
  telefone: string;
}

export interface ResultadoParseImportacao {
  linhas: LinhaClienteImportacao[];
  erros: Array<{ linha: number; motivo: string }>;
}

const ALIAS_NOME = ['nome', 'name', 'cliente', 'client', 'titular'];
const ALIAS_TELEFONE = [
  'telefone',
  'phone',
  'whatsapp',
  'celular',
  'fone',
  'tel',
  'contato',
  'numero',
  'número',
  'zap',
  'wpp',
];

function normalizarCabecalho(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function cabecalhoCombina(alias: string, coluna: string): boolean {
  if (coluna === alias) {
    return true;
  }

  return (
    coluna.startsWith(`${alias} `) ||
    coluna.startsWith(`${alias}_`) ||
    coluna.endsWith(` ${alias}`) ||
    coluna.includes(` ${alias} `)
  );
}

function detectarDelimitador(primeiraLinha: string): ',' | ';' | '\t' {
  const contagens = {
    ';': (primeiraLinha.match(/;/g) ?? []).length,
    ',': (primeiraLinha.match(/,/g) ?? []).length,
    '\t': (primeiraLinha.match(/\t/g) ?? []).length,
  };

  if (contagens[';'] >= contagens[','] && contagens[';'] >= contagens['\t']) {
    return ';';
  }

  if (contagens['\t'] > contagens[',']) {
    return '\t';
  }

  return ',';
}

function parseLinhaCsv(linha: string, delimitador: string): string[] {
  const campos: string[] = [];
  let atual = '';
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];

    if (char === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
      continue;
    }

    if (!dentroAspas && char === delimitador) {
      campos.push(atual.trim());
      atual = '';
      continue;
    }

    atual += char;
  }

  campos.push(atual.trim());
  return campos;
}

function indicesCabecalho(colunas: string[]): {
  idxNome: number;
  idxTelefone: number;
} | null {
  const normalizadas = colunas.map(normalizarCabecalho);

  const idxNome = normalizadas.findIndex((col) =>
    ALIAS_NOME.some((alias) => cabecalhoCombina(alias, col))
  );
  const idxTelefone = normalizadas.findIndex((col) =>
    ALIAS_TELEFONE.some((alias) => cabecalhoCombina(alias, col))
  );

  if (idxNome === -1 || idxTelefone === -1) {
    return null;
  }

  return { idxNome, idxTelefone };
}

function limparValorCelula(valor: string): string {
  let limpo = valor.trim();

  if (
    (limpo.startsWith('"') && limpo.endsWith('"')) ||
    (limpo.startsWith("'") && limpo.endsWith("'"))
  ) {
    limpo = limpo.slice(1, -1).trim();
  }

  const formulaExcel = limpo.match(/^="(.+)"$/);
  if (formulaExcel) {
    limpo = formulaExcel[1].trim();
  }

  return limpo;
}

function extrairDigitosTelefone(valor: string): string {
  const limpo = limparValorCelula(valor);

  const notacaoCientifica = limpo.match(/^(\d+[,.]?\d*)[eE][+-]?(\d+)$/);
  if (notacaoCientifica) {
    const base = Number(limpo.replace(',', '.'));
    if (Number.isFinite(base)) {
      return String(Math.trunc(base));
    }
  }

  if (/^\d+[,.]\d+$/.test(limpo)) {
    const base = Number(limpo.replace(',', '.'));
    if (Number.isFinite(base)) {
      return String(Math.trunc(base));
    }
  }

  return limpo.replace(/\D/g, '');
}

function quantidadeDigitosTelefone(valor: string): number {
  return extrairDigitosTelefone(valor).length;
}

function colunaPareceTelefone(valor: string): boolean {
  const digitos = quantidadeDigitosTelefone(valor);
  return digitos >= 8 && digitos <= 13;
}

function colunaPareceNome(valor: string): boolean {
  const limpo = limparValorCelula(valor);
  if (!limpo || colunaPareceTelefone(limpo)) {
    return false;
  }

  const letras = (limpo.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
  return letras >= 2;
}

function inferirColunas(linhas: string[][]): {
  idxNome: number;
  idxTelefone: number;
} {
  const amostra = linhas.slice(0, Math.min(linhas.length, 12));
  const totalColunas = Math.max(...amostra.map((linha) => linha.length), 1);
  let melhorNome = 0;
  let melhorTelefone = totalColunas > 1 ? 1 : 0;
  let melhorScore = -1;

  for (let idxNome = 0; idxNome < totalColunas; idxNome++) {
    for (let idxTelefone = 0; idxTelefone < totalColunas; idxTelefone++) {
      if (idxNome === idxTelefone) {
        continue;
      }

      let score = 0;

      for (const campos of amostra) {
        const nome = limparValorCelula(campos[idxNome] ?? '');
        const telefone = limparValorCelula(campos[idxTelefone] ?? '');

        if (colunaPareceNome(nome)) {
          score += 2;
        }

        if (colunaPareceTelefone(telefone)) {
          score += 3;
        }
      }

      if (score > melhorScore) {
        melhorScore = score;
        melhorNome = idxNome;
        melhorTelefone = idxTelefone;
      }
    }
  }

  if (melhorScore <= 0 && totalColunas >= 2) {
    return { idxNome: 0, idxTelefone: 1 };
  }

  return { idxNome: melhorNome, idxTelefone: melhorTelefone };
}

function encontrarTelefoneNaLinha(campos: string[], idxPreferido: number): string {
  const preferido = limparValorCelula(campos[idxPreferido] ?? '');
  if (colunaPareceTelefone(preferido)) {
    return preferido;
  }

  for (let i = 0; i < campos.length; i++) {
    const valor = limparValorCelula(campos[i] ?? '');
    if (colunaPareceTelefone(valor)) {
      return valor;
    }
  }

  return preferido;
}

function encontrarNomeNaLinha(
  campos: string[],
  idxPreferido: number,
  telefoneUsado: string
): string {
  const preferido = limparValorCelula(campos[idxPreferido] ?? '');
  if (preferido && colunaPareceNome(preferido)) {
    return preferido;
  }

  for (let i = 0; i < campos.length; i++) {
    const valor = limparValorCelula(campos[i] ?? '');
    if (!valor || valor === telefoneUsado) {
      continue;
    }

    if (colunaPareceNome(valor)) {
      return valor;
    }
  }

  return preferido;
}

export function formatarTelefoneImportacao(valor: string): string {
  let numeros = extrairDigitosTelefone(valor);

  if (numeros.startsWith('55') && numeros.length > 11) {
    numeros = numeros.slice(2);
  }

  numeros = numeros.slice(0, 11);

  if (numeros.length <= 2) {
    return numeros;
  }

  if (numeros.length <= 6) {
    return numeros;
  }

  if (numeros.length <= 9) {
    return numeros;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`;
}

export function telefoneImportavel(valor: string): boolean {
  const numeros = extrairDigitosTelefone(valor);
  if (!numeros) {
    return false;
  }

  const local =
    numeros.startsWith('55') && numeros.length > 11
      ? numeros.slice(2)
      : numeros;

  return local.length >= 8;
}

export function parseCsvClientes(conteudo: string): ResultadoParseImportacao {
  const linhasBrutas = conteudo
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);

  const resultado: ResultadoParseImportacao = {
    linhas: [],
    erros: [],
  };

  if (linhasBrutas.length === 0) {
    resultado.erros.push({ linha: 1, motivo: 'Arquivo vazio.' });
    return resultado;
  }

  const delimitador = detectarDelimitador(linhasBrutas[0]);
  const linhasParseadas = linhasBrutas.map((linha) =>
    parseLinhaCsv(linha, delimitador).map(limparValorCelula)
  );

  const cabecalho = linhasParseadas[0];
  const indicesCabecalhoDetectados = indicesCabecalho(cabecalho);
  const colunas = indicesCabecalhoDetectados ?? inferirColunas(linhasParseadas);
  const inicio = indicesCabecalhoDetectados ? 1 : 0;

  for (let i = inicio; i < linhasParseadas.length; i++) {
    const numeroLinha = i + 1;
    const campos = linhasParseadas[i];
    const telefoneBruto = encontrarTelefoneNaLinha(campos, colunas.idxTelefone);
    const nome = encontrarNomeNaLinha(campos, colunas.idxNome, telefoneBruto);

    if (!nome && !telefoneBruto) {
      continue;
    }

    if (!nome) {
      resultado.erros.push({
        linha: numeroLinha,
        motivo: 'Nome ausente ou não reconhecido.',
      });
      continue;
    }

    if (!telefoneBruto) {
      resultado.erros.push({
        linha: numeroLinha,
        motivo: 'Telefone ausente ou não reconhecido.',
      });
      continue;
    }

    const telefone = formatarTelefoneImportacao(telefoneBruto);

    if (!telefoneImportavel(telefone)) {
      resultado.erros.push({
        linha: numeroLinha,
        motivo: `Telefone inválido (${telefoneBruto || 'vazio'}). Use ao menos 8 dígitos.`,
      });
      continue;
    }

    resultado.linhas.push({ linha: numeroLinha, nome, telefone });
  }

  return resultado;
}

export function normalizarTelefoneComparacao(telefone: string): string {
  let numeros = extrairDigitosTelefone(telefone);

  if (numeros.startsWith('55') && numeros.length > 11) {
    numeros = numeros.slice(2);
  }

  return numeros;
}
