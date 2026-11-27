import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CriarPedidoEntrada, Endereco, Pedido } from './modelos';

@Injectable({ providedIn: 'root' })
export class PedidosApi {
  private readonly http = inject(HttpClient);

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>('/api/pedidos');
  }

  obter(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`/api/pedidos/${id}`);
  }

  criar(entrada: CriarPedidoEntrada): Observable<Pedido> {
    return this.http.post<Pedido>('/api/pedidos', entrada);
  }

  cancelar(id: string, motivo: string): Observable<Pedido> {
    return this.http.post<Pedido>(`/api/pedidos/${id}/cancelar`, { motivo });
  }

  consultarCep(cep: string): Observable<Endereco> {
    return this.http.get<Endereco>(`/api/enderecos/${cep}`);
  }
}
