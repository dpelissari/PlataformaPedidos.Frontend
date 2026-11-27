import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, filter, interval, map, switchMap } from 'rxjs';

import { ErroApi } from '../../core/erro-api';
import { formatarMoeda, Pedido } from '../../core/modelos';
import { PedidosApi } from '../../core/pedidos-api';
import { SeloStatus } from '../../shared/selo-status';
import { AcoesPedido } from './acoes-pedido';

@Component({
  selector: 'app-detalhe-pedido',
  imports: [DatePipe, RouterLink, SeloStatus, AcoesPedido],
  templateUrl: './detalhe-pedido.html',
})
export class DetalhePedido {
  private readonly api = inject(PedidosApi);
  private readonly rota = inject(ActivatedRoute);

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  constructor() {
    this.rota.paramMap
      .pipe(
        map((params) => params.get('id')),
        filter((id): id is string => id !== null && id.length > 0),
        switchMap((id) =>
          this.api.obter(id).pipe(
            catchError((erro: unknown) => {
              this.erro.set(erro instanceof ErroApi ? erro.message : 'A operação não pôde ser concluída.');
              this.carregando.set(false);
              this.pedido.set(null);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pedido) => {
        this.pedido.set(pedido);
        this.erro.set(null);
        this.carregando.set(false);
      });

    interval(2000)
      .pipe(
        filter(() => this.pedido()?.status === 'AguardandoPagamento'),
        switchMap(() => {
          const id = this.pedido()?.id;
          if (!id) {
            return EMPTY;
          }

          return this.api.obter(id).pipe(catchError(() => EMPTY));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((pedido) => this.pedido.set(pedido));
  }

  protected receber(atualizado: Pedido): void {
    this.pedido.set(atualizado);
  }
}
