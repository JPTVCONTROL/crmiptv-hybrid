import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { NovoClienteModalComponent } from '../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { NovoAplicativoModalComponent } from '../components/aplicativo/novo-aplicativo-modal/novo-aplicativo-modal.component';
import { NovoPlanoModalComponent } from '../components/plano/novo-plano-modal/novo-plano-modal.component';
import { NovoDispositivoModalComponent } from '../components/dispositivo/novo-dispositivo-modal/novo-dispositivo-modal.component';
import { WhatsappCobrancaBtnComponent } from '../components/cobranca/whatsapp-cobranca-btn.component';

@NgModule({
  declarations: [
    NovoClienteModalComponent,
    NovoAplicativoModalComponent,
    NovoPlanoModalComponent,
    NovoDispositivoModalComponent,
    WhatsappCobrancaBtnComponent,
  ],
  imports: [SharedModule],
  exports: [
    NovoClienteModalComponent,
    NovoAplicativoModalComponent,
    NovoPlanoModalComponent,
    NovoDispositivoModalComponent,
    WhatsappCobrancaBtnComponent,
  ],
})
export class ComponentsModule {}
