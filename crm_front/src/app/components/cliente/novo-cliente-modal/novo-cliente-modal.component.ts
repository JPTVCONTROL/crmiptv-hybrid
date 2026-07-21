import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { ClienteService } from '../../../core/services/cliente.service';
import { AplicativoService } from '../../../core/services/aplicativo.service';
import { DispositivoService } from '../../../core/services/dispositivo.service';
import { PlanoService } from '../../../core/services/plano.service';
import { ToastService } from '../../../core/services/toast.service';
import { Cliente, Aplicativo, Dispositivo, Plano } from '../../../core/models';
import { dataIsoParaInput } from '../../../shared/utils/formatters';
import {
  normalizarTelefoneEntrada,
  rotuloAjudaTelefone,
  telefoneValidoParaWhatsApp,
} from '../../../shared/utils/telefone.util';
import {
  aplicativosCompativeisComDispositivo,
  AplicativoResumo,
  criarListaDispositivos,
  DispositivoCliente,
  parseDispositivos,
  resolverAplicativoIdPrincipal,
  rotuloDispositivo,
  serializarDispositivos,
  sincronizarCamposLegadoDispositivo,
} from '../../../shared/utils/dispositivos';
import {
  agruparPlanos,
  calcularExpiracaoPorPlano,
  GrupoPlanos,
  ordenarPlanos,
  rotuloPlanoOpcao,
  telasDoPlano,
} from '../../../shared/utils/planos';

@Component({
  selector: 'app-novo-cliente-modal',
  templateUrl: './novo-cliente-modal.component.html',
})
export class NovoClienteModalComponent implements OnInit {
  @Input() cliente: Cliente | null = null;

  aplicativos: Aplicativo[] = [];
  dispositivosCatalogo: Dispositivo[] = [];
  planos: Plano[] = [];
  gruposPlanos: GrupoPlanos[] = [];
  salvando = false;
  telefoneTocado = false;
  qtdTelas = 1;
  dispositivos: DispositivoCliente[] = criarListaDispositivos(1);
  readonly opcoesTelas = [1, 2, 3, 4, 5];

  form = {
    nome: '',
    telefone: '',
    planoId: null as number | null,
    servidor: '',
    usuario: '',
    senha: '',
    ativadoEm: '',
    expiraEm: '',
    vencimento: 10,
    valorMensal: 0,
    incluirCobrancas: true,
    cortesia: false,
    somenteContato: false,
    observacao: '',
  };

  readonly rotuloAjudaTelefone = rotuloAjudaTelefone;

  constructor(
    private modalCtrl: ModalController,
    private clienteService: ClienteService,
    private aplicativoService: AplicativoService,
    private dispositivoService: DispositivoService,
    private planoService: PlanoService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.aplicativoService.listar().subscribe({
      next: (apps) => (this.aplicativos = apps.filter((app) => app.ativo)),
    });
    this.dispositivoService.listar().subscribe({
      next: (items) =>
        (this.dispositivosCatalogo = items.filter((item) => item.ativo)),
    });
    this.planoService.listar().subscribe({
      next: (planos) => {
        this.planos = ordenarPlanos(planos.filter((p) => p.ativo));
        this.gruposPlanos = agruparPlanos(this.planos);
      },
    });

    if (this.cliente) {
      const parsed = parseDispositivos(this.cliente);
      this.qtdTelas = Math.max(1, this.cliente.qtdTelas ?? parsed.length);
      this.dispositivos = criarListaDispositivos(this.qtdTelas, parsed);
      if (this.cliente.aplicativoId && this.dispositivos[0] && !this.dispositivos[0].aplicativoId) {
        this.dispositivos[0].aplicativoId = this.cliente.aplicativoId;
      }

      this.form = {
        nome: this.cliente.nome,
        telefone: normalizarTelefoneEntrada(this.cliente.telefone),
        planoId: this.cliente.planoId ?? null,
        servidor: this.cliente.servidor ?? '',
        usuario: this.cliente.usuario ?? '',
        senha: this.cliente.senha ?? '',
        ativadoEm: dataIsoParaInput(this.cliente.ativadoEm),
        expiraEm: dataIsoParaInput(this.cliente.expiraEm),
        vencimento: this.cliente.vencimento,
        valorMensal: this.cliente.valorMensal,
        incluirCobrancas: this.cliente.incluirCobrancas !== false,
        cortesia: this.cliente.cortesia === true,
        somenteContato: this.cliente.somenteContato === true,
        observacao: this.cliente.observacao ?? '',
      };
    } else {
      this.form.ativadoEm = this.formatarDataInput(new Date());
    }
  }

  get dispositivosVisiveis(): DispositivoCliente[] {
    return this.dispositivos.slice(0, this.qtdTelas);
  }

  get dispositivosOpcoes(): Dispositivo[] {
    const idsSelecionados = new Set(
      this.dispositivos
        .map((item) => item.dispositivoId)
        .filter((id): id is number => id != null)
    );

    return this.dispositivosCatalogo.filter(
      (item) => item.ativo || idsSelecionados.has(item.id)
    );
  }

  get podeAdicionarDispositivo(): boolean {
    return this.qtdTelas < 5;
  }

  private formatarDataInput(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  fmtRotuloPlano = rotuloPlanoOpcao;
  fmtRotuloDispositivo = rotuloDispositivo;

  aplicativosDoDispositivo(dispositivoId: number | null): AplicativoResumo[] {
    if (!dispositivoId) {
      return [];
    }

    const dispositivo = this.dispositivosCatalogo.find(
      (item) => item.id === dispositivoId
    );

    return aplicativosCompativeisComDispositivo(dispositivo, this.aplicativos);
  }

  onDispositivoChange(disp: DispositivoCliente): void {
    if (!disp.dispositivoId) {
      disp.aplicativoId = null;
      return;
    }

    const compativeis = this.aplicativosDoDispositivo(disp.dispositivoId);
    if (
      disp.aplicativoId &&
      !compativeis.some((app) => app.id === disp.aplicativoId)
    ) {
      disp.aplicativoId = null;
    }
  }

  onQtdTelasChange(): void {
    this.qtdTelas = Math.max(1, Math.min(5, this.qtdTelas));
    this.dispositivos = criarListaDispositivos(this.qtdTelas, this.dispositivos);
  }

  adicionarDispositivo(): void {
    if (this.qtdTelas >= 5) return;
    this.qtdTelas++;
    this.onQtdTelasChange();
  }

  onExpiraEmChange(): void {
    if (this.form.expiraEm) {
      const data = new Date(this.form.expiraEm + 'T12:00:00');
      this.form.vencimento = data.getDate();
    }
  }

  onCortesiaChange(): void {
    if (this.form.cortesia) {
      this.form.valorMensal = 0;
      this.form.somenteContato = false;
    }
  }

  onSomenteContatoChange(): void {
    if (this.form.somenteContato) {
      this.form.cortesia = false;
      this.form.incluirCobrancas = false;
      this.form.valorMensal = 0;
      this.form.planoId = null;
      this.form.expiraEm = '';
      this.form.ativadoEm = '';
    }
  }

  onPlanoChange(): void {
    const plano = this.planos.find((p) => p.id === this.form.planoId);
    if (!plano) return;

    if (!this.form.cortesia) {
      this.form.valorMensal = plano.valor;
    }
    this.qtdTelas = telasDoPlano(plano.nome);
    this.onQtdTelasChange();

    if (!this.form.ativadoEm && !this.cliente) {
      this.form.ativadoEm = this.formatarDataInput(new Date());
    }

    const base = this.form.ativadoEm
      ? new Date(this.form.ativadoEm + 'T12:00:00')
      : new Date();

    const expira = calcularExpiracaoPorPlano(base, plano);
    this.form.expiraEm = this.formatarDataInput(expira);
    this.onExpiraEmChange();
  }

  fechar(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  onTelefoneInput(valor: string): void {
    this.telefoneTocado = true;
    this.form.telefone = normalizarTelefoneEntrada(valor);
  }

  get telefoneInvalido(): boolean {
    return (
      this.telefoneTocado &&
      !telefoneValidoParaWhatsApp(this.form.telefone)
    );
  }

  salvar(): void {
    this.telefoneTocado = true;

    if (!this.form.nome.trim()) {
      void this.toast.warning('Preencha o nome do cliente.');
      return;
    }

    if (!telefoneValidoParaWhatsApp(this.form.telefone)) {
      void this.toast.warning(
        'Informe um telefone válido. Brasil: (62) 99999-9999. Internacional: +351 912 345 678.'
      );
      return;
    }

    if (
      !this.form.somenteContato &&
      !this.form.cortesia &&
      (!this.form.valorMensal || this.form.valorMensal <= 0)
    ) {
      void this.toast.warning('Informe o valor mensal.');
      return;
    }

    this.salvando = true;
    const lista = this.dispositivos.slice(0, this.qtdTelas);
    const payload = {
      ...this.form,
      expiraEm: this.form.somenteContato ? null : this.form.expiraEm || null,
      ativadoEm: this.form.somenteContato ? null : this.form.ativadoEm || null,
      planoId: this.form.somenteContato ? null : this.form.planoId,
      valorMensal: this.form.somenteContato ? 0 : this.form.valorMensal,
      incluirCobrancas: this.form.somenteContato
        ? false
        : this.form.incluirCobrancas,
      aplicativoId: resolverAplicativoIdPrincipal(lista),
      ...sincronizarCamposLegadoDispositivo(lista, this.dispositivosCatalogo),
      qtdTelas: this.qtdTelas,
      dispositivos: serializarDispositivos(lista),
    };

    const req = this.cliente
      ? this.clienteService.atualizar(this.cliente.id, payload)
      : this.clienteService.criar(payload);

    req.subscribe({
      next: (clienteSalvo) => {
        this.salvando = false;
        this.modalCtrl.dismiss(
          this.cliente ? true : { novo: true, cliente: clienteSalvo },
          'confirm'
        );
      },
      error: (err) => {
        this.salvando = false;
        void this.toast.error(err.message ?? 'Erro ao salvar cliente.');
      },
    });
  }
}
