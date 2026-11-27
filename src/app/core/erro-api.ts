export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo: string | null,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}
