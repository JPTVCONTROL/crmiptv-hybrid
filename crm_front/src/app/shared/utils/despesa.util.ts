import { CategoriaDespesa } from '../../core/models';

export const CATEGORIAS_DESPESA: Array<{
  valor: CategoriaDespesa;
  rotulo: string;
}> = [
  { valor: 'PAINEL', rotulo: 'Painel' },
  { valor: 'SERVIDOR', rotulo: 'Servidor' },
  { valor: 'INTERNET', rotulo: 'Internet' },
  { valor: 'MARKETING', rotulo: 'Marketing' },
  { valor: 'OUTRO', rotulo: 'Outro' },
];

export function rotuloCategoriaDespesa(categoria?: string | null): string {
  return (
    CATEGORIAS_DESPESA.find((item) => item.valor === categoria)?.rotulo ??
    'Outro'
  );
}
