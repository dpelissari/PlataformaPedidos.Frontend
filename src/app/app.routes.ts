import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
  {
    path: 'pedidos',
    title: 'Pedidos',
    loadComponent: () => import('./features/pedidos/lista-pedidos').then((modulo) => modulo.ListaPedidos),
  },
  {
    path: 'pedidos/novo',
    title: 'Novo pedido',
    loadComponent: () => import('./features/pedidos/criar-pedido').then((modulo) => modulo.CriarPedido),
  },
  {
    path: 'pedidos/:id/pagamento',
    title: 'Cartão',
    loadComponent: () => import('./features/pedidos/pagar-pedido').then((modulo) => modulo.PagarPedido),
  },
  {
    path: 'pedidos/:id',
    title: 'Pedido',
    loadComponent: () => import('./features/pedidos/detalhe-pedido').then((modulo) => modulo.DetalhePedido),
  },
];
