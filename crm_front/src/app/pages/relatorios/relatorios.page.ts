import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { Cliente, Mensalidade } from '../../core/models';
import { formatarValor, calcularDias } from '../../shared/utils/formatters';

@Component({
  selector: 'app-relatorios',
  templateUrl: './relatorios.page.html',
})
export class RelatoriosPage implements OnInit {
  loading = true;
  clientes: Cliente[] = [];
  mensalidades: Mensalidade[] = [];

  clientesAtivos = 0;
  totalRecebido = '';
  totalPendente = '';
  totalAtrasado = '';
  qtdPendentes = 0;
  pagamentosMes = 0;
  taxaInadimplencia = '0%';
  ticketMedio = '';

  constructor(
    private clienteService: ClienteService,
    private mensalidadeService: MensalidadeService
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.clienteService.listar(),
      this.mensalidadeService.listar(),
    ]).subscribe({
      next: ([clientes, mensalidades]) => {
        this.clientes = clientes;
        this.mensalidades = mensalidades;
        this.calcular();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private calcular(): void {
    this.clientesAtivos = this.clientes.filter((c) => c.status === 'ATIVO').length;

    const pagos = this.mensalidades.filter((m) => m.status === 'PAGO');
    const pendentes = this.mensalidades.filter((m) => m.status === 'PENDENTE');

    const recebido = pagos.reduce((t, m) => t + m.valor, 0);
    const pendente = pendentes.reduce((t, m) => t + m.valor, 0);
    const atrasado = pendentes
      .filter((m) => calcularDias(m.vencimento) < 0)
      .reduce((t, m) => t + m.valor, 0);

    this.totalRecebido = formatarValor(recebido);
    this.totalPendente = formatarValor(pendente);
    this.totalAtrasado = formatarValor(atrasado);
    this.qtdPendentes = pendentes.length;

    const agora = new Date();
    this.pagamentosMes = pagos.filter((m) => {
      const d = new Date(m.pagoEm ?? m.vencimento);
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    }).length;

    const taxa = pendentes.length
      ? ((pendentes.filter((m) => calcularDias(m.vencimento) < 0).length / pendentes.length) * 100).toFixed(1)
      : '0';
    this.taxaInadimplencia = `${taxa}%`;

    this.ticketMedio = pendentes.length
      ? formatarValor(pendente / pendentes.length)
      : formatarValor(0);
  }
}
