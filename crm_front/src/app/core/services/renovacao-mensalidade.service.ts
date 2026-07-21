import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfiguracaoService } from './configuracao.service';
import { MensalidadeService } from './mensalidade.service';
import { PagamentoUiService } from './pagamento-ui.service';
import { ToastService } from './toast.service';
import { ClienteService } from './cliente.service';
import { PlanoService } from './plano.service';
import { RenovacaoUiService } from './renovacao-ui.service';
import { confirmarUsuario } from '../../shared/utils/confirm-notifier';
import {
  confirmarRenovacaoNoPainel,
  oferecerMensagemRecibo,
} from '../../shared/utils/post-pagamento.util';
import { oferecerMensagemRenovacao } from '../../shared/utils/whatsapp';

export interface ContextoRenovacaoCliente {
  clienteId?: number;
  telefone: string;
  nome: string;
  planoIdAtual?: number | null;
  nomePlanoAtual?: string;
}

export interface DadosRenovacaoPagamento extends ContextoRenovacaoCliente {
  mensalidadeId: number;
  referencia: string;
  valorFallback: number;
}

export interface DadosRenovacaoCortesia extends ContextoRenovacaoCliente {
  mensalidadeId: number;
  referencia?: string;
}

@Injectable({ providedIn: 'root' })
export class RenovacaoMensalidadeService {
  constructor(
    private mensalidadeService: MensalidadeService,
    private pagamentoUi: PagamentoUiService,
    private configuracaoService: ConfiguracaoService,
    private toast: ToastService,
    private clienteService: ClienteService,
    private planoService: PlanoService,
    private renovacaoUi: RenovacaoUiService
  ) {}

  async registrarRenovacao(dados: DadosRenovacaoPagamento): Promise<boolean> {
    const planoOk = await this.prepararPlano(dados);
    if (!planoOk) {
      return false;
    }

    const pagoEm = await this.pagamentoUi.solicitarDataPagamento();
    if (!pagoEm) {
      return false;
    }

    try {
      const resultado = await firstValueFrom(
        this.mensalidadeService.registrarPagamento(dados.mensalidadeId, pagoEm)
      );

      void this.toast.success('Renovação registrada — assinatura estendida.');

      await confirmarRenovacaoNoPainel(resultado.novoVencimento);

      await this.oferecerWhatsAppRenovacao({
        telefone: dados.telefone,
        nome: dados.nome,
        referencia: dados.referencia,
        valor: resultado.valorRenovacao ?? dados.valorFallback,
        novoVencimento: resultado.novoVencimento,
      });

      await this.oferecerWhatsAppRecibo({
        telefone: dados.telefone,
        nome: dados.nome,
        referencia: dados.referencia,
        valor: resultado.valorRenovacao ?? dados.valorFallback,
        pagoEm,
      });

      return true;
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : 'Não foi possível renovar.';
      void this.toast.error(mensagem);
      return false;
    }
  }

  async registrarRenovacaoCortesia(
    dados: DadosRenovacaoCortesia
  ): Promise<boolean> {
    const planoOk = await this.prepararPlano(dados);
    if (!planoOk) {
      return false;
    }

    const confirmado = await confirmarUsuario(
      `Estender a validade de ${dados.nome}?`,
      'Renovar cortesia',
      'Renovar'
    );
    if (!confirmado) {
      return false;
    }

    try {
      const resultado = await firstValueFrom(
        this.mensalidadeService.renovarCortesia(dados.mensalidadeId)
      );
      void this.toast.success('Cortesia renovada com sucesso.');

      await confirmarRenovacaoNoPainel(resultado.novoVencimento);

      await this.oferecerWhatsAppRenovacao({
        telefone: dados.telefone,
        nome: dados.nome,
        referencia: dados.referencia ?? 'Cortesia',
        valor: 0,
        novoVencimento: resultado.novoVencimento,
        cortesia: true,
      });

      return true;
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : 'Não foi possível renovar.';
      void this.toast.error(mensagem);
      return false;
    }
  }

  private async prepararPlano(
    dados: ContextoRenovacaoCliente
  ): Promise<boolean> {
    let planoIdAtual = dados.planoIdAtual ?? null;
    let nomePlanoAtual = dados.nomePlanoAtual;

    if (dados.clienteId && dados.planoIdAtual === undefined) {
      try {
        const cliente = await firstValueFrom(
          this.clienteService.buscarPorId(dados.clienteId)
        );
        planoIdAtual = cliente.planoId ?? null;
        nomePlanoAtual = cliente.plano?.nome ?? undefined;
      } catch {
        void this.toast.error('Não foi possível carregar o plano do cliente.');
        return false;
      }
    }

    const planoEscolhido = await this.renovacaoUi.solicitarPlano({
      planoIdAtual,
      nomePlanoAtual,
    });
    if (planoEscolhido === null) {
      return false;
    }

    if (
      dados.clienteId &&
      planoEscolhido !== planoIdAtual
    ) {
      return this.aplicarPlanoCliente(dados.clienteId, planoEscolhido);
    }

    return true;
  }

  private async aplicarPlanoCliente(
    clienteId: number,
    planoId: number
  ): Promise<boolean> {
    try {
      const planos = await firstValueFrom(this.planoService.listar());
      const plano = planos.find((item) => item.id === planoId);
      if (!plano) {
        void this.toast.error('Plano selecionado não encontrado.');
        return false;
      }

      await firstValueFrom(
        this.clienteService.atualizar(clienteId, {
          planoId: plano.id,
          valorMensal: plano.valor,
        })
      );
      return true;
    } catch (err) {
      const mensagem =
        err instanceof Error ? err.message : 'Não foi possível trocar o plano.';
      void this.toast.error(mensagem);
      return false;
    }
  }

  private async oferecerWhatsAppRenovacao(params: {
    telefone: string;
    nome: string;
    referencia: string;
    valor: number;
    novoVencimento: string;
    cortesia?: boolean;
  }): Promise<void> {
    await oferecerMensagemRenovacao({
      telefone: params.telefone,
      nome: params.nome,
      referencia: params.referencia,
      valor: params.valor,
      novoVencimento: params.novoVencimento,
      empresa: this.configuracaoService.getSnapshot()?.nomeEmpresa ?? 'JPTV',
      templateRenovacao:
        this.configuracaoService.getSnapshot()?.mensagemRenovacao,
      cortesia: params.cortesia,
    });
  }

  private async oferecerWhatsAppRecibo(params: {
    telefone: string;
    nome: string;
    referencia: string;
    valor: number;
    pagoEm: string;
  }): Promise<void> {
    if (params.valor <= 0) {
      return;
    }

    await oferecerMensagemRecibo({
      telefone: params.telefone,
      nome: params.nome,
      referencia: params.referencia,
      valor: params.valor,
      pagoEm: params.pagoEm,
      empresa: this.configuracaoService.getSnapshot()?.nomeEmpresa ?? 'JPTV',
      templateRecibo: this.configuracaoService.getSnapshot()?.mensagemRecibo,
    });
  }
}
