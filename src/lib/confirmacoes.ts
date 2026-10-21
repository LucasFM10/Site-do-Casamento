/**
 * Consolidação das confirmações de presença para o painel.
 *
 * O banco guarda todas as respostas (nenhuma é sobrescrita). Um convidado é
 * o par celular + nome (sem acento, maiúsculas nem espaços extras): o mesmo
 * celular pode responder por várias pessoas da família. Vale a resposta
 * mais recente de cada convidado; as anteriores ficam no histórico.
 */

export type Resposta = "sim" | "nao";

export type LinhaConfirmacao = {
  id: string;
  nomeCompleto: string;
  telefone: string;
  resposta: Resposta;
  criadoEm: Date;
};

export type Convidado = {
  chave: string;
  nome: string;
  telefone: string;
  resposta: Resposta;
  respondidoEm: Date;
  /** Todas as respostas, da mais recente para a mais antiga. */
  historico: LinhaConfirmacao[];
  /** Já respondeu "sim" e "não" em momentos diferentes. */
  mudouDeIdeia: boolean;
};

export function normalizarNome(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function chaveDoConvidado(nome: string, telefone: string) {
  return `${telefone}:${normalizarNome(nome)}`;
}

export function consolidarConfirmacoes(linhas: LinhaConfirmacao[]): Convidado[] {
  const grupos = new Map<string, LinhaConfirmacao[]>();
  for (const linha of linhas) {
    const chave = chaveDoConvidado(linha.nomeCompleto, linha.telefone);
    const grupo = grupos.get(chave);
    if (grupo) grupo.push(linha);
    else grupos.set(chave, [linha]);
  }

  return [...grupos.entries()]
    .map(([chave, grupo]) => {
      const historico = [...grupo].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      const [ultima] = historico;
      return {
        chave,
        // O nome como foi escrito na resposta mais recente.
        nome: ultima.nomeCompleto,
        telefone: ultima.telefone,
        resposta: ultima.resposta,
        respondidoEm: ultima.criadoEm,
        historico,
        mudouDeIdeia: new Set(historico.map((h) => h.resposta)).size > 1,
      };
    })
    .sort((a, b) => normalizarNome(a.nome).localeCompare(normalizarNome(b.nome), "pt-BR"));
}

export function indicadoresDePresenca(convidados: Convidado[]) {
  const confirmados = convidados.filter((c) => c.resposta === "sim").length;
  return {
    convidados: convidados.length,
    confirmados,
    recusados: convidados.length - confirmados,
    respostas: convidados.reduce((total, c) => total + c.historico.length, 0),
    repetidos: convidados.filter((c) => c.historico.length > 1).length,
  };
}

export type FiltroConfirmacoes = { busca?: string; resposta?: Resposta | "todos" };

/** Busca por nome (sem acento) ou por dígitos do celular. */
export function filtrarConvidados(convidados: Convidado[], filtro: FiltroConfirmacoes) {
  const busca = normalizarNome(filtro.busca ?? "");
  const digitos = busca.replace(/\D/g, "");
  return convidados.filter((c) => {
    if (filtro.resposta && filtro.resposta !== "todos" && c.resposta !== filtro.resposta) return false;
    if (!busca) return true;
    return normalizarNome(c.nome).includes(busca) || (digitos.length >= 3 && c.telefone.includes(digitos));
  });
}
