import { formatarData } from './formatters';
import { confirmarUsuario } from './confirm-notifier';

export async function confirmarRenovacaoNoPainel(
  novoVencimento: string
): Promise<void> {
  const proximoVencimento = formatarData(novoVencimento);

  await confirmarUsuario(
    `Renovação registrada no CRM.\n\n` +
      `Próximo vencimento no CRM: ${proximoVencimento}\n\n` +
      `Confirme que você já renovou este cliente no painel IPTV (Sigma) ` +
      `com a mesma data ou período antes de avisar o cliente.`,
    'Renovou no painel?',
    'Sim, já renovei'
  );
}
