import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { NovoClienteModalComponent } from '../components/cliente/novo-cliente-modal/novo-cliente-modal.component';
import { NovoAplicativoModalComponent } from '../components/aplicativo/novo-aplicativo-modal/novo-aplicativo-modal.component';
import { AplicativoClientesModalComponent } from '../components/aplicativo/aplicativo-clientes-modal/aplicativo-clientes-modal.component';
import { PlanoClientesModalComponent } from '../components/plano/plano-clientes-modal/plano-clientes-modal.component';
import { NovoPlanoModalComponent } from '../components/plano/novo-plano-modal/novo-plano-modal.component';
import { NovoDispositivoModalComponent } from '../components/dispositivo/novo-dispositivo-modal/novo-dispositivo-modal.component';
import { DispositivoClientesModalComponent } from '../components/dispositivo/dispositivo-clientes-modal/dispositivo-clientes-modal.component';
import { NovoServidorModalComponent } from '../components/servidor/novo-servidor-modal/novo-servidor-modal.component';
import { EditarServidorConfigModalComponent } from '../components/servidor/editar-servidor-config-modal/editar-servidor-config-modal.component';
import { WhatsappCobrancaBtnComponent } from '../components/cobranca/whatsapp-cobranca-btn.component';
import { WhatsappBloqueioBtnComponent } from '../components/cobranca/whatsapp-bloqueio-btn.component';
import { WhatsappContatoBtnComponent } from '../components/cobranca/whatsapp-contato-btn.component';
import { MarcarCobradoBtnComponent } from '../components/cobranca/marcar-cobrado-btn.component';
import { CobrancaLoteFilaModalComponent } from '../components/cobranca/cobranca-lote-fila-modal.component';
import { CampanhaFormModalComponent } from '../components/campanha/campanha-form-modal.component';
import { NovaTarefaModalComponent } from '../components/tarefa/nova-tarefa-modal/nova-tarefa-modal.component';
import { NovaDespesaModalComponent } from '../components/despesa/nova-despesa-modal/nova-despesa-modal.component';
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
    NovoServidorModalComponent,
    EditarServidorConfigModalComponent,
    WhatsappCobrancaBtnComponent,
    WhatsappBloqueioBtnComponent,
    WhatsappContatoBtnComponent,
    MarcarCobradoBtnComponent,
    CobrancaLoteFilaModalComponent,
    CampanhaFormModalComponent,
    NovaTarefaModalComponent,
    NovaDespesaModalComponent,
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
    NovoServidorModalComponent,
    EditarServidorConfigModalComponent,
    WhatsappCobrancaBtnComponent,
    WhatsappBloqueioBtnComponent,
    WhatsappContatoBtnComponent,
    MarcarCobradoBtnComponent,
    CobrancaLoteFilaModalComponent,
    CampanhaFormModalComponent,
    NovaTarefaModalComponent,
    NovaDespesaModalComponent,
    CrmModalShellComponent,
    CrmModalToolbarComponent,
  ],
})
export class ComponentsModule {}
