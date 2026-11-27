import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { urlApi } from './ambiente';
import { ErroApi } from './erro-api';
import { Problema } from './modelos';

export const problemaHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.startsWith('/') ? `${urlApi}${req.url}` : req.url;

  return next(req.clone({ url })).pipe(catchError((erro: unknown) => throwError(() => traduzir(erro))));
};

function traduzir(erro: unknown): ErroApi {
  if (erro instanceof ErroApi) {
    return erro;
  }

  if (!(erro instanceof HttpErrorResponse)) {
    return new ErroApi('A operação não pôde ser concluída.', 0, null);
  }

  if (erro.status === 0) {
    return new ErroApi('A API não respondeu. Confira se ela está em execução.', 0, null);
  }

  const corpo = lerProblema(erro.error);
  const detalhe = texto(corpo?.detail);
  const titulo = texto(corpo?.title);

  return new ErroApi(detalhe ?? titulo ?? 'A operação não pôde ser concluída.', erro.status, corpo?.codigo ?? null);
}

function lerProblema(valor: unknown): Problema | null {
  if (typeof valor !== 'object' || valor === null) {
    return null;
  }

  const registro = valor as Problema;
  return {
    title: texto(registro.title),
    detail: texto(registro.detail),
    status: typeof registro.status === 'number' ? registro.status : undefined,
    codigo: texto(registro.codigo),
  };
}

function texto(valor: unknown): string | undefined {
  return typeof valor === 'string' && valor.trim().length > 0 ? valor : undefined;
}
