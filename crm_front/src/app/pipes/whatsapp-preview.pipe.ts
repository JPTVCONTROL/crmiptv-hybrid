import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'whatsappPreview' })
export class WhatsappPreviewPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(texto: string): SafeHtml {
    if (!texto?.trim()) {
      return '';
    }

    const escapado = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const formatado = escapado
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(formatado);
  }
}
