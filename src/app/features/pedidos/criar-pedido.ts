import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, filter, map, startWith, switchMap, tap } from 'rxjs';

import { clienteDemonstracao } from '../../core/ambiente';
import { ErroApi } from '../../core/erro-api';
import { apenasDigitos, Endereco, formatarMoeda } from '../../core/modelos';
import { PedidosApi } from '../../core/pedidos-api';

interface ItemFormulario {
  produtoId: FormControl<string>;
  nomeProduto: FormControl<string>;
  quantidade: FormControl<number>;
  precoUnitario: FormControl<number>;
}

interface PedidoFormulario {
  cep: FormControl<string>;
  numero: FormControl<string>;
  complemento: FormControl<string>;
  itens: FormArray<FormGroup<ItemFormulario>>;
}

@Component({
  selector: 'app-criar-pedido',
  imports: [ReactiveFormsModule],
  templateUrl: './criar-pedido.html',
})
export class CriarPedido {
  private readonly api = inject(PedidosApi);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly clienteId = clienteDemonstracao();

  protected readonly formatarMoeda = formatarMoeda;
  protected readonly endereco = signal<Endereco | null>(null);
  protected readonly buscandoCep = signal(false);
  protected readonly erroCep = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);

  protected readonly formulario = this.formBuilder.nonNullable.group<PedidoFormulario>({
    cep: this.formBuilder.nonNullable.control('', [Validators.required, cepComOitoDigitos]),
    numero: this.formBuilder.nonNullable.control('', Validators.required),
    complemento: this.formBuilder.nonNullable.control(''),
    itens: this.formBuilder.nonNullable.array<FormGroup<ItemFormulario>>([this.criarItem()]),
  });

  private readonly valores = toSignal(
    this.formulario.valueChanges.pipe(
      startWith(null),
      map(() => this.formulario.getRawValue()),
    ),
    { initialValue: this.formulario.getRawValue() },
  );

  protected readonly total = computed(() =>
    this.valores().itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0),
  );

  constructor() {
    this.formulario.controls.cep.valueChanges
      .pipe(
        map((valor) => apenasDigitos(valor)),
        distinctUntilChanged(),
        tap((digitos) => {
          if (digitos.length !== 8) {
            this.endereco.set(null);
            this.erroCep.set(null);
            this.buscandoCep.set(false);
          }
        }),
        filter((digitos) => digitos.length === 8),
        tap(() => {
          this.buscandoCep.set(true);
          this.erroCep.set(null);
        }),
        switchMap((digitos) =>
          this.api.consultarCep(digitos).pipe(
            catchError((erro: unknown) => {
              this.buscandoCep.set(false);
              this.endereco.set(null);
              this.erroCep.set(erro instanceof ErroApi ? erro.message : 'A consulta de CEP não respondeu.');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((endereco) => {
        this.buscandoCep.set(false);
        this.erroCep.set(null);
        this.endereco.set(endereco);
      });
  }

  protected get itens(): FormArray<FormGroup<ItemFormulario>> {
    return this.formulario.controls.itens;
  }

  protected adicionarItem(): void {
    this.itens.push(this.criarItem());
  }

  protected removerItem(indice: number): void {
    if (this.itens.length === 1) {
      return;
    }

    this.itens.removeAt(indice);
  }

  protected criar(): void {
    this.enviado.set(true);
    this.formulario.markAllAsTouched();
    const endereco = this.endereco();
    if (this.formulario.invalid || endereco === null || this.enviando()) {
      return;
    }

    const valor = this.formulario.getRawValue();
    const complemento = valor.complemento.trim();
    this.enviando.set(true);
    this.erro.set(null);

    this.api
      .criar({
        clienteId: this.clienteId,
        cep: apenasDigitos(valor.cep),
        numero: valor.numero.trim(),
        complemento: complemento.length > 0 ? complemento : null,
        itens: valor.itens.map((item) => ({
          produtoId: item.produtoId,
          nomeProduto: item.nomeProduto.trim(),
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
        })),
      })
      .subscribe({
        next: (pedido) => {
          void this.router.navigate(['/pedidos', pedido.id]);
        },
        error: (erro: unknown) => {
          this.enviando.set(false);
          this.erro.set(erro instanceof ErroApi ? erro.message : 'A operação não pôde ser concluída.');
        },
      });
  }

  private criarItem(): FormGroup<ItemFormulario> {
    return new FormGroup<ItemFormulario>({
      produtoId: new FormControl(crypto.randomUUID(), { nonNullable: true }),
      nomeProduto: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      quantidade: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
      precoUnitario: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), precoComDuasCasas],
      }),
    });
  }
}

function cepComOitoDigitos(controle: AbstractControl<string>): ValidationErrors | null {
  return apenasDigitos(controle.value).length === 8 ? null : { cep: true };
}

function precoComDuasCasas(controle: AbstractControl<number>): ValidationErrors | null {
  const valor = controle.value;
  if (!Number.isFinite(valor) || valor < 0) {
    return { preco: true };
  }

  const centavos = Math.round(valor * 100);
  return Math.abs(valor * 100 - centavos) < 0.001 ? null : { casas: true };
}
