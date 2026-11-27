import { Component, computed, input } from '@angular/core';

const rotulos: Record<string, string> = {
  Rascunho: 'Rascunho',
  AguardandoPagamento: 'Aguardando pagamento',
  Confirmado: 'Confirmado',
  Cancelado: 'Cancelado',
};

const classes: Record<string, string> = {
  Rascunho: 'border-l-rascunho text-rascunho',
  AguardandoPagamento: 'border-l-aguardando text-aguardando',
  Confirmado: 'border-l-confirmado text-confirmado',
  Cancelado: 'border-l-cancelado text-cancelado',
};

@Component({
  selector: 'app-selo-status',
  template: `
    <span
      class="inline-flex border border-linha border-l-4 bg-papel px-2 py-1 text-sm"
      [class]="classe()"
    >
      {{ rotulo() }}
    </span>
  `,
})
export class SeloStatus {
  readonly status = input.required<string>();

  protected readonly rotulo = computed(() => rotulos[this.status()] ?? this.status());
  protected readonly classe = computed(() => classes[this.status()] ?? 'border-l-rascunho text-rascunho');
}
