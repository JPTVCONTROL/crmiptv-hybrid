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

  classesAba(rota: string): Record<string, boolean> {
    const ativa = this.router.url.startsWith(rota);
    return {
      'border-violet-500': ativa,
      'bg-violet-600/15': ativa,
      'text-violet-200': ativa,
      'border-slate-700': !ativa,
      'bg-slate-800/50': !ativa,
      'text-slate-400': !ativa,
      'hover:border-slate-600': !ativa,
      'hover:text-slate-300': !ativa,
    };
  }
}
