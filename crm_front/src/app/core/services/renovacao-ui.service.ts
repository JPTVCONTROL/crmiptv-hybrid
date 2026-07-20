import { Injectable } from '@angular/core';
import { AlertController, AlertButton } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { Plano } from '../models';
import { PlanoService } from './plano.service';
import { ordenarPlanos, rotuloPlanoOpcao } from '../../shared/utils/planos';

export interface ContextoPlanoRenovacao {
  planoIdAtual?: number | null;
  nomePlanoAtual?: string;
}

@Injectable({ providedIn: 'root' })
export class RenovacaoUiService {
  constructor(
    private alertCtrl: AlertController,
    private planoService: PlanoService
  ) {}

  async solicitarPlano(ctx: ContextoPlanoRenovacao): Promise<number | null> {
    const planos = ordenarPlanos(
      (await firstValueFrom(this.planoService.listar())).filter((p) => p.ativo)
    );

    if (planos.length === 0) {
      return ctx.planoIdAtual ?? null;
    }

    const planoIdAtual = ctx.planoIdAtual ?? null;
    const nomeAtual =
      ctx.nomePlanoAtual?.trim() ||
      (planoIdAtual
        ? planos.find((p) => p.id === planoIdAtual)?.nome
        : undefined) ||
      'Sem plano';
    const temOutrosPlanos =
      planoIdAtual === null ||
      planos.some((plano) => plano.id !== planoIdAtual);

    if (planoIdAtual !== null && !temOutrosPlanos) {
      return planoIdAtual;
    }

    return new Promise((resolve) => {
      void this.montarAlertaInicial(
        resolve,
        planos,
        planoIdAtual,
        nomeAtual,
        temOutrosPlanos
      );
    });
  }

  private async montarAlertaInicial(
    resolve: (value: number | null) => void,
    planos: Plano[],
    planoIdAtual: number | null,
    nomeAtual: string,
    temOutrosPlanos: boolean
  ): Promise<void> {
    const botoes: AlertButton[] = [
      {
        text: 'Cancelar',
        role: 'cancel',
        handler: () => resolve(null),
      },
    ];

    if (planoIdAtual !== null) {
      botoes.push({
        text: 'Mesmo plano',
        handler: () => {
          resolve(planoIdAtual);
          return true;
        },
      });
    }

    if (temOutrosPlanos) {
      botoes.push({
        text: planoIdAtual !== null ? 'Outro plano' : 'Escolher plano',
        handler: () => {
          void this.montarSeletorPlano(resolve, planos, planoIdAtual);
          return true;
        },
      });
    } else if (planoIdAtual === null) {
      botoes.push({
        text: 'Escolher plano',
        handler: () => {
          void this.montarSeletorPlano(resolve, planos, planoIdAtual);
          return true;
        },
      });
    }

    const alert = await this.alertCtrl.create({
      header: 'Renovar assinatura',
      message:
        planoIdAtual !== null
          ? `Plano atual: ${nomeAtual}. Manter este plano ou escolher outro?`
          : 'Qual plano usar nesta renovação?',
      cssClass: 'crm-alert',
      buttons: botoes,
    });

    await alert.present();
  }

  private async montarSeletorPlano(
    resolve: (value: number | null) => void,
    planos: Plano[],
    planoIdAtual: number | null
  ): Promise<void> {
    const padrao =
      planos.find((plano) => plano.id !== planoIdAtual)?.id ?? planos[0]?.id;

    const alert = await this.alertCtrl.create({
      header: 'Escolher plano',
      message: 'Selecione o plano para esta renovação.',
      cssClass: 'crm-alert',
      inputs: planos.map((plano) => ({
        type: 'radio' as const,
        label: rotuloPlanoOpcao(plano),
        value: String(plano.id),
        checked: plano.id === padrao,
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => resolve(null),
        },
        {
          text: 'Confirmar',
          handler: (data) => {
            if (!data) {
              return false;
            }
            resolve(Number(data));
            return true;
          },
        },
      ],
    });

    await alert.present();
  }
}
