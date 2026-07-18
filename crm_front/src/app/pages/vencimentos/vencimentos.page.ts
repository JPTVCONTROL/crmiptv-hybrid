import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { Configuracao, Mensalidade } from '../../core/models';
import {
  formatarValor,
  formatarData,
  calcularDias,
  criarMapaTelefones,
  resolverTelefoneCliente,
} from '../../shared/utils/formatters';
import { montarMensagemCobranca } from '../../shared/utils/whatsapp';

@Component({
  selector: 'app-vencimentos',
  templateUrl: './vencimentos.page.html',
})
export class VencimentosPage implements OnInit {
  mensalidades: Mensalidade[] = [];
  telefones = new Map<number, string>();
  configuracao: Configuracao | null = null;
  loading = true;

  constructor(
    private mensalidadeService: MensalidadeService,
    private clienteService: ClienteService,
    private configuracaoService: ConfiguracaoService
  ) {}

  ngOnInit(): void {
    this.configuracaoService.carregar().subscribe({ next: (c) => (this.configuracao = c) });
    forkJoin([
      this.mensalidadeService.listar(),
      this.clienteService.listar(),
    ]).subscribe({
      next: ([mensalidades, clientes]) => {
        this.telefones = criarMapaTelefones(clientes);
        this.mensalidades = mensalidades
          .filter((m) => m.status === 'PENDENTE')
          .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get totalPendente(): string {
    const v = this.mensalidades.reduce((t, m) => t + m.valor, 0);
    return formatarValor(v);
  }

  get vencemHoje(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) === 0).length;
  }

  get atrasados(): number {
    return this.mensalidades.filter((m) => calcularDias(m.vencimento) < 0).length;
  }

  statusLabel(m: Mensalidade): string {
    const dias = calcularDias(m.vencimento);
    if (dias < 0) return 'ATRASADO';
    if (dias === 0) return 'HOJE';
    return 'PRÓXIMO';
  }

  telefone(m: Mensalidade): string {
    return resolverTelefoneCliente(m, this.telefones);
  }

  mensagem(m: Mensalidade): string {
    const cfg = this.configuracao;
    return montarMensagemCobranca(
      {
        nome: m.cliente?.nome ?? '',
        referencia: m.referencia,
        valor: m.valor,
        vencimento: m.vencimento,
        empresa: cfg?.nomeEmpresa ?? 'JPTV',
        atrasado: calcularDias(m.vencimento) < 0,
        pix: cfg?.chavePix ?? undefined,
        tipoPix: cfg?.tipoPix ?? undefined,
        favorecido: cfg?.favorecidoPix ?? undefined,
      },
      cfg?.mensagemCobranca
    );
  }

  pagar(m: Mensalidade): void {
    this.mensalidadeService.registrarPagamento(m.id).subscribe({
      next: () => this.ngOnInit(),
      error: (err) => alert(err.message),
    });
  }

  fmtValor = formatarValor;
  fmtData = formatarData;
}
