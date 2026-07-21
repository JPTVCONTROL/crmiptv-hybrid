import { configuracaoRepository } from '../repositories/configuracaoRepository.js';
import type { UpdateConfiguracaoDto } from '../models/index.js';
import {
  normalizarMetaNovosClientesDias,
  normalizarMetaNovosClientesFimEm,
  normalizarMetaNovosClientesInicioEm,
  normalizarMetaNovosClientesQtd,
} from '../utils/helpers/metaNovosClientesHelpers.js';

export class ConfiguracaoService {
  obter() {
    return configuracaoRepository.findOrCreate();
  }

  salvar(dados: UpdateConfiguracaoDto) {
    const normalizado: UpdateConfiguracaoDto = { ...dados };

    if (Object.prototype.hasOwnProperty.call(dados, 'metaNovosClientesQtd')) {
      normalizado.metaNovosClientesQtd = normalizarMetaNovosClientesQtd(
        dados.metaNovosClientesQtd
      );
    }

    if (Object.prototype.hasOwnProperty.call(dados, 'metaNovosClientesDias')) {
      normalizado.metaNovosClientesDias = normalizarMetaNovosClientesDias(
        dados.metaNovosClientesDias
      );
    }

    const referencia = new Date();

    if (
      Object.prototype.hasOwnProperty.call(dados, 'metaNovosClientesInicioEm') ||
      Object.prototype.hasOwnProperty.call(dados, 'metaNovosClientesFimEm')
    ) {
      const inicioEm = normalizarMetaNovosClientesInicioEm(
        dados.metaNovosClientesInicioEm,
        referencia
      );
      const fimEm = normalizarMetaNovosClientesFimEm(
        dados.metaNovosClientesFimEm,
        inicioEm
      );

      normalizado.metaNovosClientesInicioEm = new Date(`${inicioEm}T12:00:00.000Z`);
      normalizado.metaNovosClientesFimEm = new Date(`${fimEm}T12:00:00.000Z`);
    }

    return configuracaoRepository.upsert(normalizado);
  }
}

export const configuracaoService = new ConfiguracaoService();
