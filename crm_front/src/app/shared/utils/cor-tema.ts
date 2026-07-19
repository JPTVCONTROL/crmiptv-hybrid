export const COR_TEMA_PADRAO = '#7C3AED';

export function normalizarCorHex(valor?: string | null): string {
  if (!valor?.trim()) {
    return COR_TEMA_PADRAO;
  }

  const cor = valor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(cor)) {
    return cor.toUpperCase();
  }

  if (/^#[0-9A-Fa-f]{3}$/.test(cor)) {
    const [, r, g, b] = cor;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return COR_TEMA_PADRAO;
}

function hexParaRgb(hex: string): { r: number; g: number; b: number } {
  const valor = hex.replace('#', '');

  return {
    r: parseInt(valor.slice(0, 2), 16),
    g: parseInt(valor.slice(2, 4), 16),
    b: parseInt(valor.slice(4, 6), 16),
  };
}

function rgbParaHex(r: number, g: number, b: number): string {
  const canal = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');

  return `#${canal(r)}${canal(g)}${canal(b)}`.toUpperCase();
}

export function hexParaRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexParaRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function escurecerCor(hex: string, fator = 0.12): string {
  const { r, g, b } = hexParaRgb(hex);
  const multiplicador = 1 - fator;

  return rgbParaHex(r * multiplicador, g * multiplicador, b * multiplicador);
}

export function clarearCor(hex: string, fator = 0.35): string {
  const { r, g, b } = hexParaRgb(hex);

  return rgbParaHex(
    r + (255 - r) * fator,
    g + (255 - g) * fator,
    b + (255 - b) * fator
  );
}
