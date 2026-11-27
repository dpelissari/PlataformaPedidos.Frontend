import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, map, startWith } from 'rxjs';

import { ErroApi } from '../../core/erro-api';
import { Pedido, apenasDigitos, formatarMoeda } from '../../core/modelos';
import { PedidosApi } from '../../core/pedidos-api';

@Component({
  selector: 'app-pagar-pedido',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './pagar-pedido.html',
})
export class PagarPedido {
  private readonly api = inject(PedidosApi);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    numero: '',
    titular: '',
    mes: '',
    ano: '',
    codigo: '',
    tipoDocumento: 'CPF',
    documento: '',
    email: '',
  });

  private readonly valores = toSignal(
    this.formulario.valueChanges.pipe(
      startWith(null),
      map(() => this.formulario.getRawValue()),
    ),
    { initialValue: this.formulario.getRawValue() },
  );

  protected readonly pedido = signal<Pedido | null>(null);
  protected readonly chavePublica = signal('');
  protected readonly carregando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly dicaAberta = signal(false);
  protected readonly formatarMoeda = formatarMoeda;
  protected readonly cartoesTeste = [
    { bandeira: 'Mastercard', numero: '5480 8328 0103 3311', codigo: '123' },
    { bandeira: 'Visa', numero: '4235 6477 2802 5682', codigo: '123' },
    { bandeira: 'American Express', numero: '3753 651535 56885', codigo: '1234' },
    { bandeira: 'Elo débito', numero: '5067 7667 8388 8311', codigo: '123' },
  ];

  protected readonly bandeira = computed(() => nomeBandeira(apenasDigitos(this.valores().numero)));
  protected readonly numeroNoCartao = computed(() =>
    numeroParaCartao(apenasDigitos(this.valores().numero)),
  );
  protected readonly titularNoCartao = computed(() => this.valores().titular.trim() || 'Seu nome');
  protected readonly validadeNoCartao = computed(() => {
    const mes = this.valores().mes;
    const ano = this.valores().ano;
    return `${mes || 'MM'}/${ano || 'AA'}`;
  });

  constructor() {
    const id = this.rota.snapshot.paramMap.get('id');
    if (!id) {
      this.carregando.set(false);
      this.erro.set('O pedido não foi encontrado.');
      return;
    }

    forkJoin({
      pedido: this.api.obter(id),
      configuracao: this.api.configuracaoPagamento(),
    })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: ({ pedido, configuracao }) => {
          this.pedido.set(pedido);
          this.chavePublica.set(configuracao.chavePublica.trim());
          this.carregando.set(false);
        },
        error: (erro: unknown) => {
          this.carregando.set(false);
          this.erro.set(erro instanceof ErroApi ? erro.message : 'O pedido não pôde ser carregado.');
        },
      });
  }

  @HostListener('document:keydown.escape')
  protected fecharDica(): void {
    this.dicaAberta.set(false);
  }

  protected alternarDica(evento: Event): void {
    evento.stopPropagation();
    this.dicaAberta.update((aberta) => !aberta);
  }

  protected formatarNumero(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const texto = agruparNumero(campo.value.replace(/\D/g, '').slice(0, 16));
    this.formulario.controls.numero.setValue(texto);
    campo.value = texto;
  }

  protected limitarDigitos(evento: Event, controle: 'mes' | 'ano' | 'codigo' | 'documento', maximo: number): void {
    const campo = evento.target as HTMLInputElement;
    const texto = campo.value.replace(/\D/g, '').slice(0, maximo);
    this.formulario.controls[controle].setValue(texto);
    campo.value = texto;
  }

  protected async pagar(): Promise<void> {
    const pedido = this.pedido();
    const valor = this.formulario.getRawValue();
    const digitos = apenasDigitos(valor.numero);
    const bandeira = codigoBandeira(digitos);
    const documento = apenasDigitos(valor.documento);
    if (
      !pedido ||
      !bandeira ||
      digitos.length < 15 ||
      !valor.titular.trim() ||
      !mesValido(valor.mes) ||
      valor.ano.length < 2 ||
      valor.codigo.length < 3 ||
      !valor.email.includes('@') ||
      documento.length < 11
    ) {
      this.erro.set('Preencha o cartão, o documento e o e-mail.');
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    try {
      const token = await gerarToken(this.chavePublica(), {
        numero: digitos,
        titular: valor.titular.trim(),
        mes: valor.mes,
        ano: valor.ano.length === 2 ? `20${valor.ano}` : valor.ano,
        codigo: valor.codigo,
        tipoDocumento: valor.tipoDocumento,
        documento,
      });

      this.api
        .solicitarPagamento(pedido.id, {
          token,
          bandeira,
          emissorId: null,
          parcelas: 1,
          emailPagador: valor.email.trim(),
          tipoDocumento: valor.tipoDocumento,
          numeroDocumento: documento,
        })
        .pipe(takeUntilDestroyed(this.destruir))
        .subscribe({
          next: (atualizado) => {
            void this.router.navigate(['/pedidos', atualizado.id]);
          },
          error: (erro: unknown) => {
            this.enviando.set(false);
            this.erro.set(erro instanceof ErroApi ? erro.message : 'O pagamento não pôde ser solicitado.');
          },
        });
    } catch (erro: unknown) {
      this.enviando.set(false);
      this.erro.set(
        erro instanceof Error ? erro.message : 'O Mercado Pago não gerou o token do cartão.',
      );
    }
  }
}

async function gerarToken(
  chavePublica: string,
  cartao: {
    numero: string;
    titular: string;
    mes: string;
    ano: string;
    codigo: string;
    tipoDocumento: string;
    documento: string;
  },
): Promise<string> {
  let resposta: Response;
  try {
    resposta = await fetch(
      `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(chavePublica)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          card_number: cartao.numero,
          security_code: cartao.codigo,
          expiration_month: Number(cartao.mes),
          expiration_year: Number(cartao.ano),
          cardholder: {
            name: cartao.titular,
            identification: {
              type: cartao.tipoDocumento,
              number: cartao.documento,
            },
          },
        }),
      },
    );
  } catch {
    throw new Error('O Mercado Pago não gerou o token do cartão.');
  }

  let corpo: { id?: string; cause?: { code?: string }[] } = {};
  try {
    corpo = (await resposta.json()) as { id?: string; cause?: { code?: string }[] };
  } catch {
    throw new Error('O Mercado Pago não gerou o token do cartão.');
  }

  if (!resposta.ok || !corpo.id) {
    throw new Error(mensagemDoToken(corpo.cause?.[0]?.code));
  }

  return corpo.id;
}

function mensagemDoToken(codigo: string | undefined): string {
  switch (codigo) {
    case 'E301':
      return 'O número do cartão não foi aceito.';
    case 'E203':
      return 'O código de segurança não foi aceito.';
    case 'E205':
    case '326':
      return 'O ano de validade não foi aceito.';
    case '325':
      return 'O mês de validade não foi aceito.';
    case '316':
      return 'O nome do titular não foi aceito.';
    case '323':
    case '324':
      return 'O documento não foi aceito.';
    default:
      return 'O Mercado Pago não gerou o token do cartão.';
  }
}

function agruparNumero(digitos: string): string {
  if (digitos.startsWith('34') || digitos.startsWith('37')) {
    return [digitos.slice(0, 4), digitos.slice(4, 10), digitos.slice(10, 15)].filter(Boolean).join(' ');
  }

  return digitos.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function numeroParaCartao(digitos: string): string {
  const limite = digitos.startsWith('34') || digitos.startsWith('37') ? 15 : 16;
  return agruparNumero(digitos.padEnd(limite, '•').slice(0, limite));
}

function codigoBandeira(digitos: string): string {
  if (digitos.startsWith('5067') || digitos.startsWith('6363')) {
    return 'elo';
  }

  if (digitos.startsWith('34') || digitos.startsWith('37')) {
    return 'amex';
  }

  if (digitos.startsWith('4')) {
    return 'visa';
  }

  if (/^5[1-5]/.test(digitos)) {
    return 'master';
  }

  return '';
}

function nomeBandeira(digitos: string): string {
  switch (codigoBandeira(digitos)) {
    case 'visa':
      return 'Visa';
    case 'master':
      return 'Mastercard';
    case 'amex':
      return 'Amex';
    case 'elo':
      return 'Elo';
    default:
      return '';
  }
}

function mesValido(mes: string): boolean {
  const numero = Number(mes);
  return mes.length > 0 && numero >= 1 && numero <= 12;
}
