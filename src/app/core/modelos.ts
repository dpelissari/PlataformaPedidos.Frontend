export type StatusPedido = 'Rascunho' | 'AguardandoPagamento' | 'Confirmado' | 'Cancelado';

export interface ItemPedido {
  id: string;
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: string;
  clienteId: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  status: StatusPedido;
  dataCriacaoUtc: string;
  valorTotal: number;
  moeda: string;
  motivoCancelamento: string | null;
  itens: ItemPedido[];
}

export interface Endereco {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ItemPedidoEntrada {
  produtoId: string;
  nomeProduto: string;
  quantidade: number;
  precoUnitario: number;
}

export interface CriarPedidoEntrada {
  clienteId: string;
  cep: string;
  numero: string;
  complemento: string | null;
  itens: ItemPedidoEntrada[];
}

export interface Problema {
  title?: string;
  detail?: string;
  status?: number;
  codigo?: string;
}

const moedaPadrao = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor: number, codigo = 'BRL'): string {
  if (codigo === 'BRL') {
    return moedaPadrao.format(valor);
  }

  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: codigo }).format(valor);
}

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}
