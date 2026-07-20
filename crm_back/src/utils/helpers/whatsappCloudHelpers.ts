import { env } from '../../config/env.js';

export function whatsappApiConfigurado(): boolean {
  return Boolean(env.whatsappPhoneNumberId && env.whatsappAccessToken);
}

export function formatarTelefoneWhatsApp(telefone: string): string | null {
  const numeros = telefone.replace(/\D/g, '');
  if (!numeros) return null;
  if (numeros.startsWith('55') && numeros.length >= 12) return numeros;
  if (numeros.length === 10 || numeros.length === 11) return `55${numeros}`;
  if (numeros.length >= 12) return numeros;
  return null;
}

export interface EnvioTemplateResultado {
  messageId: string;
}

export async function enviarTemplateWhatsApp(
  telefone: string,
  templateNome: string,
  linguagem: string,
  parametrosCorpo: string[]
): Promise<EnvioTemplateResultado> {
  if (!whatsappApiConfigurado()) {
    throw new Error(
      'WhatsApp Cloud API não configurada. Defina WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN no .env.'
    );
  }

  const destino = formatarTelefoneWhatsApp(telefone);
  if (!destino) {
    throw new Error('Telefone inválido para WhatsApp.');
  }

  const url = `https://graph.facebook.com/${env.whatsappApiVersion}/${env.whatsappPhoneNumberId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: destino,
    type: 'template',
    template: {
      name: templateNome,
      language: { code: linguagem },
      components: [
        {
          type: 'body',
          parameters: parametrosCorpo.map((text) => ({
            type: 'text',
            text: text.slice(0, 1024),
          })),
        },
      ],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsappAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    error?: { message?: string; error_user_msg?: string };
    messages?: Array<{ id: string }>;
  };

  if (!response.ok) {
    const detalhe =
      payload.error?.error_user_msg ||
      payload.error?.message ||
      `HTTP ${response.status}`;
    const msg = detalhe.toLowerCase();
    if (
      msg.includes('template') &&
      (msg.includes('does not exist') ||
        msg.includes('not exist') ||
        msg.includes('não existe') ||
        msg.includes('not approved') ||
        msg.includes('pending'))
    ) {
      throw new Error(
        `Template "${templateNome}" indisponível na Meta. Aguarde status Ativo ou confira o nome/idioma (${linguagem}). Detalhe: ${detalhe}`
      );
    }
    if (msg.includes('invalid oauth') || msg.includes('access token')) {
      throw new Error(
        `Token da Meta inválido ou expirado. Gere um novo em API Setup e atualize o .env. Detalhe: ${detalhe}`
      );
    }
    throw new Error(detalhe);
  }

  const messageId = payload.messages?.[0]?.id;
  if (!messageId) {
    throw new Error('Resposta da Meta sem ID da mensagem.');
  }

  return { messageId };
}
