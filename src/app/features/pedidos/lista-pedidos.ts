import { DestroyRef, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, exhaustMap, filter, interval } from 'rxjs';

import { ErroApi } from '../../core/erro-api';
import { formatarMoeda, Pedido } from '../../core/modelos';
import { PedidosApi } from '../../core/pedidos-api';
import { SeloStatus } from '../../shared/selo-status';
import { AcoesPedido } from './acoes-pedido';

@Component({
  selector: 'app-lista-pedidos',
  imports: [RouterLink, SeloStatus, AcoesPedido],
  templateUrl: './lista-pedidos.html',
})
export class ListaPedidos {
  private readonly api = inject(PedidosApi);
  private readonly destruir = inject(DestroyRef);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    this.carregar();

    interval(2000)
      .pipe(
        filter(() => this.pedidos().some((pedido) => pedido.status === 'AguardandoPagamento')),
        exhaustMap(() => this.api.listar().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe((pedidos) => this.pedidos.set(pedidos));
  }

  protected substituir(atualizado: Pedido): void {
    this.pedidos.update((pedidos) => pedidos.map((pedido) => (pedido.id === atualizado.id ? atualizado : pedido)));
  }

  protected endereco(pedido: Pedido): string {
    return `${pedido.logradouro}, ${pedido.numero} — ${pedido.cidade}/${pedido.estado}`;
  }

  private carregar(): void {
    this.api
      .listar()
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: (pedidos) => {
          this.pedidos.set(pedidos);
          this.erro.set(null);
          this.carregando.set(false);
        },
        error: (erro: unknown) => {
          this.erro.set(erro instanceof ErroApi ? erro.message : 'A operação não pôde ser concluída.');
          this.carregando.set(false);
        },
      });
  }
}
