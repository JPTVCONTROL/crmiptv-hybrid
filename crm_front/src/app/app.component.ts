import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';

interface MenuItem {
  nome: string;
  rota: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  readonly menus: MenuItem[] = [
    { nome: 'Dashboard', rota: '/dashboard', icon: 'grid-outline' },
    { nome: 'Clientes', rota: '/clientes', icon: 'people-outline' },
    { nome: 'Financeiro', rota: '/financeiro', icon: 'cash-outline' },
    { nome: 'Vencimentos', rota: '/vencimentos', icon: 'calendar-outline' },
    { nome: 'Aplicativos', rota: '/aplicativos', icon: 'apps-outline' },
    { nome: 'Planos', rota: '/planos', icon: 'layers-outline' },
    { nome: 'Dispositivos', rota: '/dispositivos', icon: 'hardware-chip-outline' },
    { nome: 'Relatórios', rota: '/relatorios', icon: 'bar-chart-outline' },
    { nome: 'Configurações', rota: '/configuracoes', icon: 'settings-outline' },
  ];

  constructor(private menuCtrl: MenuController) {}

  fecharMenu(): void {
    void this.menuCtrl.close();
  }
}
