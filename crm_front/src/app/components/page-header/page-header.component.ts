import { Location } from '@angular/common';
import { Component, HostBinding, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NavegacaoService } from '../../core/services/navegacao.service';

export interface BreadcrumbItem {
  label: string;
  rota?: string;
}

@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.component.html',
})
export class PageHeaderComponent {
  @HostBinding('class') readonly hostClass = 'crm-page-header block w-full';

  @Input() title = '';
  @Input() subtitle = '';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
  /** `auto`: exibe fora do dashboard/login quando há histórico ou rota aninhada */
  @Input() exibirVoltar: boolean | 'auto' = 'auto';
  @Input() rotaVoltar = '/dashboard';

  constructor(
    private location: Location,
    private router: Router,
    private navegacao: NavegacaoService
  ) {}

  get mostrarVoltar(): boolean {
    if (this.exibirVoltar === true) {
      return true;
    }

    if (this.exibirVoltar === false) {
      return false;
    }

    return this.navegacao.podeVoltar(this.router.url);
  }

  voltar(): void {
    if (this.navegacao.temHistoricoNavegacao()) {
      this.location.back();
      return;
    }

    void this.router.navigateByUrl(this.rotaVoltar);
  }
}
