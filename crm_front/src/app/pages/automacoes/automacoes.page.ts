import { Component, OnInit } from '@angular/core';
import { ConfiguracaoService } from '../../core/services/configuracao.service';
import { Configuracao } from '../../core/models';
import { resolverDiasAntecedencia } from '../../shared/utils/cobranca-diaria';

export type StatusAutomacao = 'manual' | 'planejado';

export interface AutomacaoItem {
  id: string;
  titulo: string;
  descricao: string;
  icon: string;
  status: StatusAutomacao;
}

export interface FluxoAtual {
  titulo: string;
  descricao: string;
  rota: string;
  rotuloLink: string;
}

@Component({
  selector: 'app-automacoes',
  templateUrl: './automacoes.page.html',
})
export class AutomacoesPage implements OnInit {
  loading = true;

  readonly fluxosAtuais: FluxoAtual[] = [
    {
      titulo: 'Cobrança Diária',
      descricao: 'Envio manual em lote de lembretes e cobranças via WhatsApp.',
      rota: '/cobranca-diaria',
      rotuloLink: 'Abrir Cobrança Diária',
    },
    {
      titulo: 'Mensagens e antecedência',
      descricao: 'Templates de lembrete/cobrança e dias de antecedência.',
      rota: '/configuracoes',
      rotuloLink: 'Abrir Configurações',
    },
    {
      titulo: 'Vencimentos',
      descricao: 'Consulta de mensalidades pendentes por data.',
      rota: '/vencimentos',
      rotuloLink: 'Abrir Vencimentos',
    },
  ];

  readonly automacoesPlanejadas: AutomacaoItem[] = [
    {
      id: 'lembrete-antecipado',
      titulo: 'Lembrete antes do vencimento',
      descricao:
        'Enviar automaticamente a mensagem de lembrete para clientes que vencem nos próximos dias.',
      icon: 'notifications-outline',
      status: 'planejado',
    },
    {
      id: 'cobranca-vencimento',
      titulo: 'Cobrança no dia do vencimento',
      descricao:
        'Disparar lembrete ou cobrança no dia exato do vencimento, conforme o status do cliente.',
      icon: 'calendar-outline',
      status: 'planejado',
    },
    {
      id: 'cobranca-atrasados',
      titulo: 'Cobrança recorrente de atrasados',
      descricao:
        'Repetir cobrança para inadimplentes em intervalos configuráveis (ex.: a cada 3 dias).',
      icon: 'repeat-outline',
      status: 'planejado',
    },
    {
      id: 'horario-envio',
      titulo: 'Agendamento por horário',
      descricao:
        'Definir horários fixos de envio (ex.: 09:00 e 18:00) em vez de execução manual.',
      icon: 'time-outline',
      status: 'planejado',
    },
    {
      id: 'whatsapp-api',
      titulo: 'WhatsApp API (envio direto)',
      descricao:
        'Integração com API oficial ou provedor para enviar sem abrir o navegador.',
      icon: 'logo-whatsapp',
      status: 'planejado',
    },
    {
      id: 'historico-envios',
      titulo: 'Histórico de envios automáticos',
      descricao:
        'Registrar quem recebeu, quando e qual mensagem foi enviada.',
      icon: 'list-outline',
      status: 'planejado',
    },
  ];

  readonly previewHorarios = ['09:00', '14:00', '18:00'];

  constructor(private configuracaoService: ConfiguracaoService) {}

  ngOnInit(): void {
    if (!this.configuracaoService.getSnapshot()) {
      this.configuracaoService.carregar().subscribe({
        next: () => (this.loading = false),
        error: () => (this.loading = false),
      });
      return;
    }

    this.loading = false;
  }

  private get configuracao(): Configuracao | null {
    return this.configuracaoService.getSnapshot();
  }

  get diasAntecedencia(): number {
    return resolverDiasAntecedencia(this.configuracao);
  }

  rotuloStatus(status: StatusAutomacao): string {
    return status === 'manual' ? 'Manual hoje' : 'Em breve';
  }

  classesStatus(status: StatusAutomacao): Record<string, boolean> {
    if (status === 'manual') {
      return { 'crm-badge-ativo': true };
    }

    return { 'crm-badge-neutral': true };
  }
}
