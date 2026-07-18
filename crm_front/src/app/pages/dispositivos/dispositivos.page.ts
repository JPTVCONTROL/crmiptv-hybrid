import { Component, OnInit } from '@angular/core';
import { ClienteService } from '../../core/services/cliente.service';
import { Cliente } from '../../core/models';

@Component({
  selector: 'app-dispositivos',
  templateUrl: './dispositivos.page.html',
})
export class DispositivosPage implements OnInit {
  clientes: Cliente[] = [];
  loading = true;
  busca = '';

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.clienteService.listar().subscribe({
      next: (data) => {
        this.clientes = data.filter(
          (c) => c.aparelho || c.modelo || c.macAddress
        );
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  get filtrados(): Cliente[] {
    const t = this.busca.toLowerCase();
    if (!t) return this.clientes;
    return this.clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(t) ||
        (c.aparelho?.toLowerCase().includes(t) ?? false) ||
        (c.macAddress?.toLowerCase().includes(t) ?? false)
    );
  }
}
