export type VarianteFilterChip = 'violet' | 'emerald' | 'amber' | 'red';

export function classesFilterChip(
  selecionado: boolean,
  variante: VarianteFilterChip
): string {
  if (!selecionado) {
    return 'crm-filter-chip crm-filter-chip--idle';
  }
  return `crm-filter-chip crm-filter-chip--selected-${variante}`;
}

export function classesFilterChipContagem(
  selecionado: boolean,
  variante: VarianteFilterChip
): string {
  const base = 'crm-filter-chip-count';
  if (!selecionado) {
    return `${base} ${base}--idle`;
  }
  return `${base} ${base}--${variante}`;
}
