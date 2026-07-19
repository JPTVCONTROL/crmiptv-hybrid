import os from 'node:os';

function interfacePreferida(nome: string): number {
  if (/wi-?fi|wireless|wlan/i.test(nome)) return 0;
  if (/ethernet|lan/i.test(nome)) return 1;
  return 2;
}

/** Endereços IPv4 da máquina, úteis para acesso na rede local (tablet/APK). */
export function listarIpsRedeLocal(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: { ip: string; ordem: number }[] = [];

  for (const [nome, enderecos] of Object.entries(interfaces)) {
    if (!enderecos || /virtual|vpn|loopback|hyper-v|vethernet|wsl/i.test(nome)) {
      continue;
    }

    for (const endereco of enderecos) {
      if (endereco.family !== 'IPv4' || endereco.internal) {
        continue;
      }

      ips.push({
        ip: endereco.address,
        ordem: interfacePreferida(nome),
      });
    }
  }

  return ips
    .sort((a, b) => a.ordem - b.ordem || a.ip.localeCompare(b.ip))
    .map((item) => item.ip);
}

export function urlRedeLocal(porta: number, caminho = ''): string | null {
  const ips = listarIpsRedeLocal();
  if (ips.length === 0) {
    return null;
  }

  const prefixo = caminho.startsWith('/') ? caminho : caminho ? `/${caminho}` : '';
  return `http://${ips[0]}:${porta}${prefixo}`;
}
