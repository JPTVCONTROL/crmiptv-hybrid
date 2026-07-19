import { Aplicativo, Cliente, Dispositivo, Plano } from '../../core/models';
import { parseDispositivos } from './dispositivos';

export interface DadoCatalogoDistribuicao {
  nome: string;
  quantidade: number;
}

function truncarNome(nome: string, max = 22): string {
  if (nome.length <= max) return nome;
  return `${nome.slice(0, max - 1)}…`;
}

export function montarDistribuicaoPlanos(
  clientes: Cliente[],
  planos: Plano[]
): DadoCatalogoDistribuicao[] {
  const contagem = new Map<number | 'sem', number>();
  contagem.set('sem', 0);

  for (const plano of planos) {
    contagem.set(plano.id, 0);
  }

  for (const cliente of clientes) {
    if (cliente.planoId && contagem.has(cliente.planoId)) {
      contagem.set(cliente.planoId, (contagem.get(cliente.planoId) ?? 0) + 1);
    } else {
      contagem.set('sem', (contagem.get('sem') ?? 0) + 1);
    }
  }

  const resultado: DadoCatalogoDistribuicao[] = planos
    .filter((plano) => (contagem.get(plano.id) ?? 0) > 0)
    .map((plano) => ({
      nome: truncarNome(plano.nome),
      quantidade: contagem.get(plano.id) ?? 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const semPlano = contagem.get('sem') ?? 0;
  if (semPlano > 0) {
    resultado.push({ nome: 'Sem plano', quantidade: semPlano });
  }

  return resultado;
}

export function montarDistribuicaoAplicativos(
  clientes: Cliente[],
  aplicativos: Aplicativo[]
): DadoCatalogoDistribuicao[] {
  const contagem = new Map<number | 'sem', number>();
  contagem.set('sem', 0);

  for (const app of aplicativos) {
    contagem.set(app.id, 0);
  }

  for (const cliente of clientes) {
    const telas = parseDispositivos(cliente);
    const appsDoCliente = new Set<number>();

    if (cliente.aplicativoId) {
      appsDoCliente.add(cliente.aplicativoId);
    }

    for (const tela of telas) {
      if (tela.aplicativoId) {
        appsDoCliente.add(tela.aplicativoId);
      }
    }

    if (appsDoCliente.size === 0) {
      contagem.set('sem', (contagem.get('sem') ?? 0) + 1);
      continue;
    }

    for (const appId of appsDoCliente) {
      if (contagem.has(appId)) {
        contagem.set(appId, (contagem.get(appId) ?? 0) + 1);
      }
    }
  }

  const nomes = new Map(aplicativos.map((app) => [app.id, app.nome]));
  const resultado: DadoCatalogoDistribuicao[] = [...contagem.entries()]
    .filter(([id, qtd]) => id !== 'sem' && qtd > 0)
    .map(([id, quantidade]) => ({
      nome: truncarNome(nomes.get(id as number) ?? 'App'),
      quantidade,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const semApp = contagem.get('sem') ?? 0;
  if (semApp > 0) {
    resultado.push({ nome: 'Sem app', quantidade: semApp });
  }

  return resultado;
}

export function montarDistribuicaoDispositivos(
  clientes: Cliente[],
  dispositivos: Dispositivo[]
): DadoCatalogoDistribuicao[] {
  const contagem = new Map<number | 'sem', number>();

  for (const dispositivo of dispositivos) {
    contagem.set(dispositivo.id, 0);
  }
  contagem.set('sem', 0);

  for (const cliente of clientes) {
    const telas = parseDispositivos(cliente);
    let possuiCatalogado = false;

    for (const tela of telas) {
      if (tela.dispositivoId && contagem.has(tela.dispositivoId)) {
        possuiCatalogado = true;
        contagem.set(
          tela.dispositivoId,
          (contagem.get(tela.dispositivoId) ?? 0) + 1
        );
      }
    }

    if (!possuiCatalogado && telas.some((t) => t.macAddress.trim())) {
      contagem.set('sem', (contagem.get('sem') ?? 0) + 1);
    }
  }

  const nomes = new Map(
    dispositivos.map((item) => [
      item.id,
      item.modelo?.trim() ? `${item.nome} — ${item.modelo}` : item.nome,
    ])
  );

  const resultado: DadoCatalogoDistribuicao[] = [...contagem.entries()]
    .filter(([id, qtd]) => id !== 'sem' && qtd > 0)
    .map(([id, quantidade]) => ({
      nome: truncarNome(nomes.get(id as number) ?? 'Dispositivo'),
      quantidade,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const semDispositivo = contagem.get('sem') ?? 0;
  if (semDispositivo > 0) {
    resultado.push({ nome: 'Não catalogado', quantidade: semDispositivo });
  }

  return resultado;
}

export function totalDistribuicao(dados: DadoCatalogoDistribuicao[]): number {
  return dados.reduce((total, item) => total + item.quantidade, 0);
}
