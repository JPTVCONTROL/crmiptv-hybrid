import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ClienteService } from '../../../core/services/cliente.service';
import { TarefaService } from '../../../core/services/tarefa.service';
import { ToastService } from '../../../core/services/toast.service';
import { Cliente, Tarefa } from '../../../core/models';
import { dataHojeIso } from '../../../shared/utils/tarefa.util';

@Component({
  selector: 'app-nova-tarefa-modal',
  templateUrl: './nova-tarefa-modal.component.html',
})
export class NovaTarefaModalComponent implements OnInit {
  @Input() tarefa: Tarefa | null = null;
  @Input() clienteId: number | null = null;
  @Input() clienteNome = '';

  clientes: Cliente[] = [];
  carregandoClientes = true;
  salvando = false;

  form = {
    titulo: '',
    descricao: '',
    vencimentoEm: dataHojeIso(),
    clienteId: null as number | null,
  };

  constructor(
    private modalCtrl: ModalController,
    private tarefaService: TarefaService,
    private clienteService: ClienteService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.tarefa) {
      this.form = {
        titulo: this.tarefa.titulo,
        descricao: this.tarefa.descricao ?? '',
        vencimentoEm: this.tarefa.vencimentoEm.slice(0, 10),
        clienteId: this.tarefa.clienteId ?? null,
      };
    } else if (this.clienteId != null) {
      this.form.clienteId = this.clienteId;
    }

    this.clienteService.listar().subscribe({
      next: (items) => {
        this.clientes = [...items].sort((a, b) =>
          a.nome.localeCompare(b.nome, 'pt-BR')
        );
        this.carregandoClientes = false;
      },
      error: () => {
        this.carregandoClientes = false;
      },
    });
  }

  get clienteFixo(): boolean {
    return !this.tarefa && this.clienteId != null;
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  salvar(): void {
    if (!this.form.titulo.trim()) {
      void this.toast.warning('Informe o título da tarefa.');
      return;
    }

    if (!this.form.vencimentoEm) {
      void this.toast.warning('Informe a data do lembrete.');
      return;
    }

    this.salvando = true;
    const payload = {
      titulo: this.form.titulo.trim(),
      descricao: this.form.descricao.trim() || null,
      vencimentoEm: this.form.vencimentoEm,
      clienteId: this.form.clienteId,
    };

    const req = this.tarefa
      ? this.tarefaService.atualizar(this.tarefa.id, payload)
      : this.tarefaService.criar(payload);

    req.subscribe({
      next: () => {
        this.salvando = false;
        this.modalCtrl.dismiss(true, 'confirm');
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar tarefa.');
      },
    });
  }
}
