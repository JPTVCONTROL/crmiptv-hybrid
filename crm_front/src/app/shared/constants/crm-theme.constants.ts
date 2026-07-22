export type StatCardVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent'
  | 'orange'
  | 'neutral';

export const CRM_STAT_VARIANT_COLORS: Record<StatCardVariant, string> = {
  primary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  accent: '#d946ef',
  orange: '#fb923c',
  neutral: '#64748b',
};

/** Paleta para gráficos e elementos multicoloridos */
export const CRM_CHART_PALETTE = [
  CRM_STAT_VARIANT_COLORS.success,
  CRM_STAT_VARIANT_COLORS.info,
  CRM_STAT_VARIANT_COLORS.warning,
  CRM_STAT_VARIANT_COLORS.danger,
  CRM_STAT_VARIANT_COLORS.accent,
  CRM_STAT_VARIANT_COLORS.primary,
  CRM_STAT_VARIANT_COLORS.orange,
] as const;
