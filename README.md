# PlataformaPedidos.Frontend

Tela de pedidos em Angular 22. A API fica no repositório `PlataformaPedidos.Backend`, em `http://localhost:5081`.

## Telas

- Lista de pedidos, com status em português. Enquanto algum pedido está aguardando pagamento, a lista consulta a API a cada 2 segundos.
- Detalhe do pedido, com os mesmos comandos e a mesma consulta enquanto o pagamento não termina.
- Novo pedido: o CEP com 8 dígitos busca o endereço, os itens entram e saem do formulário, e o total é calculado na hora.
- Cartão: o número fica no Mercado Pago. A tela pede o token e envia o pagamento. As credenciais de teste ficam no backend, no arquivo `mercadopago.local.json`.

Pedir pagamento e cancelar ficam disponíveis conforme o status. O cancelamento pede um motivo.

## Como rodar

Com a API no ar:

```powershell
npm install
npm start
```

A aplicação abre em `http://localhost:4200`. O CORS da API já aceita essa origem.
