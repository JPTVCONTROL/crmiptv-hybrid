import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface AbaCatalogo {
  rotulo: string;
  rota: string;
}

@Component({
  selector: 'app-catalogos',
  templateUrl: './catalogos.page.html',
})
export class CatalogosPage {
  readonly abas: AbaCatalogo[] = [
    {
      rotulo: 'Aplicativos',
      rota: '/catalogos/aplicativos',
    },
    {
      rotulo: 'Planos',
      rota: '/catalogos/planos',
    },
    {
      rotulo: 'Dispositivos',
      rota: '/catalogos/dispositivos',
    },
    {
      rotulo: 'Servidores',
      rota: '/catalogos/servidores',
    },
  ];

  constructor(private router: Router) {}

  classesAba(rota: string): string {
    const ativa = this.router.url.startsWith(rota);
    return ativa
      ? 'crm-filter-chip crm-filter-chip--selected-violet'
      : 'crm-filter-chip crm-filter-chip--idle';
  }
}
