import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ClienteService } from '../../core/services/cliente.service';
import { MensalidadeService } from '../../core/services/mensalidade.service';
import { Cliente, Mensalidade } from '../../core/models';
import { formatarValor } from '../../shared/utils/formatters';

interface MesFaturamento {
  label: string;
  valor: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
})
export class DashboardPage implements OnInit {
  loading = true;
  clientes: Cliente[] = [];
  mensalidades: Mensalidade[] = [];

  clientesAtivos = 0;
  totalRecebido = '';
  pendentes = 0;
  vencemHoje = 0;
  faturamentoMensal: MesFaturamento[] = [];
  proximosVencimentos: Mensalidade[] = [];

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
        this.calcularKpis();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  private calcularKpis(): void {
    this.clientesAtivos = this.clientes.filter((c) => c.status === 'ATIVO').length;

    const recebido = this.mensalidades
      .filter((m) => m.status === 'PAGO')
      .reduce((t, m) => t + m.valor, 0);
    this.totalRecebido = formatarValor(recebido);

    this.pendentes = this.mensalidades.filter((m) => m.status === 'PENDENTE').length;

    const hoje = new Date();
    this.vencemHoje = this.mensalidades.filter((m) => {
      const d = new Date(m.vencimento);
      return (
        m.status === 'PENDENTE' &&
        d.getDate() === hoje.getDate() &&
        d.getMonth() === hoje.getMonth() &&
        d.getFullYear() === hoje.getFullYear()
      );
    }).length;

    this.proximosVencimentos = this.mensalidades
      .filter((m) => m.status === 'PENDENTE')
      .sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
      .slice(0, 8);

    this.faturamentoMensal = this.calcularFaturamentoMensal();
  }

  private calcularFaturamentoMensal(): MesFaturamento[] {
    const mapa = new Map<string, number>();
    for (const m of this.mensalidades.filter((x) => x.status === 'PAGO')) {
      const d = new Date(m.pagoEm ?? m.vencimento);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      mapa.set(key, (mapa.get(key) ?? 0) + m.valor);
    }

    return Array.from(mapa.entries())
      .slice(-6)
      .map(([label, valor]) => ({ label, valor }));
  }

  maxFaturamento(): number {
    return Math.max(...this.faturamentoMensal.map((m) => m.valor), 1);
  }
}
