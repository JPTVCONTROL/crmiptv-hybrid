import { formatarData, formatarValor } from './formatters';
import { confirmarUsuario } from './confirm-notifier';
import {
  abrirWhatsAppCobranca,
  montarMensagemRecibo,
  telefoneValidoParaWhatsApp,
} from './whatsapp';

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

export async function oferecerMensagemRecibo(params: {
  telefone: string;
  nome: string;
  referencia: string;
  valor: number;
  pagoEm: string;
  empresa: string;
  templateRecibo?: string | null;
}): Promise<void> {
  if (!telefoneValidoParaWhatsApp(params.telefone)) {
    return;
  }

  const pagoEmFmt = formatarData(params.pagoEm);
  const valorFmt = formatarValor(params.valor);

  const mensagem = montarMensagemRecibo(
    {
      nome: params.nome,
      referencia: params.referencia,
      valor: params.valor,
      vencimento: params.pagoEm,
      pagoEm: params.pagoEm,
      empresa: params.empresa,
    },
    params.templateRecibo
  );

  const confirmado = await confirmarUsuario(
    `Deseja enviar recibo de pagamento (${valorFmt} · ${params.referencia}, pago em ${pagoEmFmt})?`,
    'Recibo de pagamento',
    'Enviar WhatsApp'
  );

  if (confirmado) {
    abrirWhatsAppCobranca(params.telefone, mensagem);
  }
}
