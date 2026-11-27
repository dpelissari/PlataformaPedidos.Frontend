export const urlApi = 'http://localhost:5081';

const chaveCliente = 'plataforma-pedidos.cliente';

export function clienteDemonstracao(): string {
  const existente = localStorage.getItem(chaveCliente);
  if (existente) {
    return existente;
  }

  const novo = crypto.randomUUID();
  localStorage.setItem(chaveCliente, novo);
  return novo;
}
