import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { NovoClienteModalComponent } from '../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { NovoAplicativoModalComponent } from '../components/aplicativo/novo-aplicativo-modal/novo-aplicativo-modal.component';
import { WhatsappCobrancaBtnComponent } from '../components/cobranca/whatsapp-cobranca-btn.component';

@NgModule({
  declarations: [
    NovoClienteModalComponent,
    NovoAplicativoModalComponent,
    WhatsappCobrancaBtnComponent,
  ],
  imports: [SharedModule],
  exports: [
    NovoClienteModalComponent,
    NovoAplicativoModalComponent,
    WhatsappCobrancaBtnComponent,
  ],
})
export class ComponentsModule {}
