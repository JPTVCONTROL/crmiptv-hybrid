import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models';
import { NovoClienteModalComponent } from '../../components/cliente/novo-cliente-modal/novo-cliente-modal.component';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
})
export class ClientesPage implements OnInit {
  clientes: Cliente[] = [];
  loading = true;
  busca = '';

  constructor(
    private clienteService: ClienteService,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  get clientesFiltrados(): Cliente[] {
    const termo = this.busca.toLowerCase().trim();
    if (!termo) return this.clientes;
    return this.clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        c.telefone.includes(termo)
    );
  }

  carregar(): void {
    this.loading = true;
    this.clienteService.listar().subscribe({
      next: (data) => {
        this.clientes = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  async novoCliente(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }

  async editar(cliente: Cliente): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: NovoClienteModalComponent,
      componentProps: { cliente },
      cssClass: 'crm-modal',
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data) this.carregar();
  }

  verDetalhes(id: number): void {
    this.router.navigate(['/clientes', id]);
  }

  excluir(cliente: Cliente): void {
    if (!confirm(`Excluir o cliente ${cliente.nome}?`)) return;
    this.clienteService.excluir(cliente.id).subscribe({
      next: () => this.carregar(),
      error: (err) => alert(err.message),
    });
  }
}
