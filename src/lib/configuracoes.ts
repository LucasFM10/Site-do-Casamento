/**
 * Informações editáveis do site (painel → Informações). Os valores ficam na
 * tabela `configuracoes`; o que não estiver lá usa o padrão abaixo, que é o
 * conteúdo original da página.
 *
 * Arquivo compartilhado entre servidor e navegador: sem acesso ao banco.
 */

type TipoCampo = "texto" | "texto_longo" | "data" | "hora" | "url";

type Campo = {
  chave: string;
  rotulo: string;
  tipo: TipoCampo;
  padrao: string;
  max: number;
  obrigatorio?: boolean;
  ajuda?: string;
};

export const GRUPOS_CONFIGURACAO = [
  {
    titulo: "Casal e data",
    campos: [
      { chave: "nome_1", rotulo: "Primeiro nome", tipo: "texto", padrao: "Lucas", max: 40, obrigatorio: true },
      { chave: "nome_2", rotulo: "Segundo nome", tipo: "texto", padrao: "Amanda", max: 40, obrigatorio: true },
      {
        chave: "data_casamento",
        rotulo: "Data do casamento",
        tipo: "data",
        padrao: "2027-01-23",
        max: 10,
        obrigatorio: true,
      },
      { chave: "cidade", rotulo: "Cidade", tipo: "texto", padrao: "João Pessoa - PB", max: 80 },
    ],
  },
  {
    titulo: "Página inicial",
    campos: [
      {
        chave: "frase_abertura",
        rotulo: "Frase acima dos nomes",
        tipo: "texto",
        padrao: "contando os dias para o começo de nossa família",
        max: 120,
      },
      { chave: "citacao", rotulo: "Citação", tipo: "texto", padrao: "Fazei tudo o que Ele vos disser", max: 200 },
      { chave: "citacao_referencia", rotulo: "Referência da citação", tipo: "texto", padrao: "Jo 2,5", max: 60 },
      {
        chave: "rodape_citacao",
        rotulo: "Frase do rodapé",
        tipo: "texto",
        padrao: "Que a tua vida não seja uma vida estéril",
        max: 200,
      },
      { chave: "rodape_autor", rotulo: "Autor da frase do rodapé", tipo: "texto", padrao: "São Josemaria Escrivá", max: 80 },
    ],
  },
  {
    titulo: "Cerimônia",
    campos: [
      {
        chave: "cerimonia_horario",
        rotulo: "Horário",
        tipo: "hora",
        padrao: "11:30",
        max: 5,
        ajuda: "Também define o fim da contagem regressiva (horário de Brasília).",
      },
      {
        chave: "cerimonia_local",
        rotulo: "Local",
        tipo: "texto",
        padrao: "Paróquia São Pedro Pescador, Manaíra",
        max: 160,
      },
      { chave: "cerimonia_endereco", rotulo: "Endereço", tipo: "texto", padrao: "", max: 240 },
      {
        chave: "cerimonia_mapa",
        rotulo: "Link do mapa",
        tipo: "url",
        padrao: "",
        max: 500,
        ajuda: "Link do Google Maps ou Waze (começando com https://).",
      },
    ],
  },
  {
    titulo: "Recepção",
    campos: [
      { chave: "recepcao_horario", rotulo: "Horário", tipo: "hora", padrao: "", max: 5 },
      { chave: "recepcao_local", rotulo: "Local", tipo: "texto", padrao: "A definir", max: 160 },
      { chave: "recepcao_endereco", rotulo: "Endereço", tipo: "texto", padrao: "", max: 240 },
      { chave: "recepcao_mapa", rotulo: "Link do mapa", tipo: "url", padrao: "", max: 500 },
    ],
  },
  {
    titulo: "Informações complementares",
    campos: [
      { chave: "traje", rotulo: "Traje", tipo: "texto", padrao: "", max: 120 },
      {
        chave: "informacoes_extras",
        rotulo: "Outras informações",
        tipo: "texto_longo",
        padrao: "",
        max: 2000,
        ajuda: "Aparece no fim de “Informações do casamento”. Estacionamento, hospedagem, avisos.",
      },
    ],
  },
  {
    titulo: "Lista de presentes",
    campos: [
      {
        chave: "presentes_introducao",
        rotulo: "Texto de abertura",
        tipo: "texto_longo",
        padrao:
          "Sua presença é o nosso maior presente. Se quiser nos presentear, escolha um item da lista: o pagamento é feito por Pix.",
        max: 1000,
      },
      {
        chave: "presentes_agradecimento",
        rotulo: "Agradecimento após o pagamento",
        tipo: "texto_longo",
        padrao: "Muito obrigado pelo carinho, {nome}! Seu presente vai ajudar a construir o nosso lar.",
        max: 1000,
        ajuda: "{nome} vira o primeiro nome de quem presenteou.",
      },
    ],
  },
] as const satisfies readonly { titulo: string; campos: readonly Campo[] }[];

type Grupo = (typeof GRUPOS_CONFIGURACAO)[number];
export type ChaveConfiguracao = Grupo["campos"][number]["chave"];
export type Configuracoes = Record<ChaveConfiguracao, string>;

export const CAMPOS_CONFIGURACAO: readonly Campo[] = GRUPOS_CONFIGURACAO.flatMap((g): readonly Campo[] => g.campos);

export const CONFIGURACOES_PADRAO = Object.fromEntries(
  CAMPOS_CONFIGURACAO.map((c) => [c.chave, c.padrao]),
) as Configuracoes;

function dataValida(texto: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function erroDoCampo(campo: Campo, valor: string): string | null {
  if (!valor) return campo.obrigatorio ? "Campo obrigatório." : null;
  if (valor.length > campo.max) return `Use até ${campo.max} caracteres.`;
  switch (campo.tipo) {
    case "data":
      return dataValida(valor) ? null : "Data inválida.";
    case "hora":
      return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor) ? null : "Horário inválido (use HH:MM).";
    case "url":
      // Só http(s): o valor vai para um href.
      try {
        const url = new URL(valor);
        return url.protocol === "https:" || url.protocol === "http:" ? null : "Use um link começando com https://.";
      } catch {
        return "Use um link começando com https://.";
      }
    default:
      return null;
  }
}

function normalizar(campo: Campo, bruto: unknown) {
  const texto = typeof bruto === "string" ? bruto.replace(/\r\n/g, "\n") : "";
  return campo.tipo === "texto_longo" ? texto.trim() : texto.trim().replace(/\s+/g, " ");
}

/** Valida o formulário do painel. Devolve todos os valores ou os erros por chave. */
export function validarConfiguracoes(
  entrada: Record<string, unknown>,
): { ok: true; valores: Configuracoes } | { ok: false; erros: Partial<Record<ChaveConfiguracao, string>> } {
  const valores: Record<string, string> = {};
  const erros: Record<string, string> = {};
  for (const campo of CAMPOS_CONFIGURACAO) {
    const valor = normalizar(campo, entrada[campo.chave]);
    const erro = erroDoCampo(campo, valor);
    if (erro) erros[campo.chave] = erro;
    valores[campo.chave] = valor;
  }
  return Object.keys(erros).length ? { ok: false, erros } : { ok: true, valores: valores as Configuracoes };
}

/**
 * Valores do banco sobre os padrões. Chave desconhecida é ignorada e valor
 * que deixou de ser válido volta ao padrão, para a página nunca quebrar.
 */
export function mesclarConfiguracoes(linhas: { chave: string; valor: string }[]): Configuracoes {
  const resultado = { ...CONFIGURACOES_PADRAO };
  for (const { chave, valor } of linhas) {
    const campo = CAMPOS_CONFIGURACAO.find((c) => c.chave === chave);
    if (campo && !erroDoCampo(campo, valor)) resultado[chave as ChaveConfiguracao] = valor;
  }
  return resultado;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** "2027-01-23" → "23 de Janeiro de 2027". */
export function dataPorExtenso(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}

/** "11:30" → "11h30"; "09:00" → "9h". */
export function horarioPorExtenso(hora: string) {
  if (!hora) return "";
  const [h, m] = hora.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/**
 * Início da cerimônia, em horário de Brasília (sem horário de verão desde
 * 2019), para a contagem regressiva.
 */
export function inicioDaCerimonia(config: Pick<Configuracoes, "data_casamento" | "cerimonia_horario">) {
  return `${config.data_casamento}T${config.cerimonia_horario || "00:00"}:00-03:00`;
}

/** Troca {chave} pelos valores; o que não tiver valor fica como está. */
export function preencherTexto(modelo: string, valores: Record<string, string>) {
  return modelo.replace(/\{(\w+)\}/g, (original, chave: string) => (chave in valores ? valores[chave] : original));
}
