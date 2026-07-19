import { Injectable } from '@angular/core';
import { ConfiguracaoService } from './configuracao.service';
import {
  clarearCor,
  COR_TEMA_PADRAO,
  escurecerCor,
  hexParaRgba,
  normalizarCorHex,
} from '../../shared/utils/cor-tema';

@Injectable({ providedIn: 'root' })
export class TemaService {
  constructor(private configuracaoService: ConfiguracaoService) {
    this.configuracaoService.configuracao$.subscribe((config) => {
      if (config?.corPrincipal) {
        this.aplicar(config.corPrincipal);
      }
    });
  }

  restaurarPadrao(): void {
    this.aplicar(COR_TEMA_PADRAO);
  }

  aplicar(cor?: string | null): void {
    const hex = normalizarCorHex(cor);
    const root = document.documentElement;

    root.style.setProperty('--crm-primary', hex);
    root.style.setProperty('--crm-primary-hover', escurecerCor(hex));
    root.style.setProperty('--crm-primary-soft', hexParaRgba(hex, 0.15));
    root.style.setProperty('--crm-primary-soft-strong', hexParaRgba(hex, 0.25));
    root.style.setProperty('--crm-primary-border', hexParaRgba(hex, 0.4));
    root.style.setProperty('--crm-primary-text', clarearCor(hex, 0.55));
    root.style.setProperty('--crm-primary-icon', clarearCor(hex, 0.2));
  }
}
