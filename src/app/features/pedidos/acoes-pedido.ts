import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';

import { ErroApi } from '../../core/erro-api';
import { Pedido } from '../../core/modelos';
import { PedidosApi } from '../../core/pedidos-api';

@Component({
  selector: 'app-acoes-pedido',
  imports: [ReactiveFormsModule],
  templateUrl: './acoes-pedido.html',
})
export class AcoesPedido {
  private readonly api = inject(PedidosApi);
  private readonly destruir = inject(DestroyRef);

  readonly pedido = input.required<Pedido>();
  readonly atualizado = output<Pedido>();

  protected readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly cancelando = signal(false);
  protected readonly processando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected abrirCancelamento(): void {
    this.erro.set(null);
    this.cancelando.set(true);
  }

  protected desistir(): void {
    this.cancelando.set(false);
    this.motivo.reset('');
  }

  protected confirmarCancelamento(): void {
    this.motivo.markAsTouched();
    if (this.motivo.invalid) {
      return;
    }

    this.executar(this.api.cancelar(this.pedido().id, this.motivo.value.trim()));
  }

  private executar(chamada: ReturnType<PedidosApi['cancelar']>): void {
    this.processando.set(true);
    chamada.pipe(takeUntilDestroyed(this.destruir)).subscribe({
      next: (pedido) => {
        this.processando.set(false);
        this.erro.set(null);
        this.cancelando.set(false);
        this.motivo.reset('');
        this.atualizado.emit(pedido);
      },
      error: (erro: unknown) => {
        this.processando.set(false);
        this.erro.set(erro instanceof ErroApi ? erro.message : 'A operação não pôde ser concluída.');
      },
    });
  }
}
