import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';

interface AbaCatalogo {
  rotulo: string;
  rota: string;
  subtitulo: string;
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
      subtitulo: 'Apps IPTV vinculados aos clientes.',
    },
    {
      rotulo: 'Planos',
      rota: '/catalogos/planos',
      subtitulo: 'Planos com valor e validade.',
    },
    {
      rotulo: 'Dispositivos',
      rota: '/catalogos/dispositivos',
      subtitulo: 'Aparelhos disponíveis para cadastro.',
    },
  ];

  subtituloAtual = this.abas[0].subtitulo;

  constructor(private router: Router) {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        map(() => this.router.url),
        startWith(this.router.url)
      )
      .subscribe((url) => {
        const aba = this.abas.find((item) => url.startsWith(item.rota));
        this.subtituloAtual = aba?.subtitulo ?? this.abas[0].subtitulo;
      });
  }

  classesAba(rota: string): string {
    const ativa = this.router.url.startsWith(rota);
    return ativa
      ? 'crm-filter-chip crm-filter-chip--selected-violet'
      : 'crm-filter-chip crm-filter-chip--idle';
  }
}
