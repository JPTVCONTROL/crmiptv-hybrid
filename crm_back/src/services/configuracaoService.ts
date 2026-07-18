import { configuracaoRepository } from '../repositories/configuracaoRepository.js';
import type { UpdateConfiguracaoDto } from '../models/index.js';

export class ConfiguracaoService {
  obter() {
    return configuracaoRepository.findOrCreate();
  }

  salvar(dados: UpdateConfiguracaoDto) {
    return configuracaoRepository.upsert(dados);
  }
}

export const configuracaoService = new ConfiguracaoService();
