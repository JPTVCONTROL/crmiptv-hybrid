import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { NovoClienteModalComponent } from '../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { NovoAplicativoModalComponent } from '../components/aplicativo/novo-aplicativo-modal/novo-aplicativo-modal.component';
import { AplicativoClientesModalComponent } from '../components/aplicativo/aplicativo-clientes-modal/aplicativo-clientes-modal.component';
import { PlanoClientesModalComponent } from '../components/plano/plano-clientes-modal/plano-clientes-modal.component';
import { NovoPlanoModalComponent } from '../components/plano/novo-plano-modal/novo-plano-modal.component';
import { NovoDispositivoModalComponent } from '../components/dispositivo/novo-dispositivo-modal/novo-dispositivo-modal.component';
import { DispositivoClientesModalComponent } from '../components/dispositivo/dispositivo-clientes-modal/dispositivo-clientes-modal.component';
import { WhatsappCobrancaBtnComponent } from '../components/cobranca/whatsapp-cobranca-btn.component';
import { CobrancaLoteFilaModalComponent } from '../components/cobranca/cobranca-lote-fila-modal.component';
import { CampanhaFormModalComponent } from '../components/campanha/campanha-form-modal.component';
import { CrmModalShellComponent } from '../components/modal/crm-modal-shell.component';
import { CrmModalToolbarComponent } from '../components/modal/crm-modal-toolbar.component';

@NgModule({
  declarations: [
    NovoClienteModalComponent,
    NovoAplicativoModalComponent,
    AplicativoClientesModalComponent,
    NovoPlanoModalComponent,
    PlanoClientesModalComponent,
    NovoDispositivoModalComponent,
    DispositivoClientesModalComponent,
    WhatsappCobrancaBtnComponent,
    CobrancaLoteFilaModalComponent,
    CampanhaFormModalComponent,
    CrmModalShellComponent,
    CrmModalToolbarComponent,
  ],
  imports: [SharedModule],
  exports: [
    NovoClienteModalComponent,
    NovoAplicativoModalComponent,
    AplicativoClientesModalComponent,
    NovoPlanoModalComponent,
    PlanoClientesModalComponent,
    NovoDispositivoModalComponent,
    DispositivoClientesModalComponent,
    WhatsappCobrancaBtnComponent,
    CobrancaLoteFilaModalComponent,
    CampanhaFormModalComponent,
    CrmModalShellComponent,
    CrmModalToolbarComponent,
  ],
})
export class ComponentsModule {}
