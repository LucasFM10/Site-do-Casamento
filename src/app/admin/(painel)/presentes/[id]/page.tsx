import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { removerPresenteAcao } from "@/app/admin/acoes";
import BotaoConfirmar from "@/components/admin/BotaoConfirmar";
import EnvioImagens from "@/components/admin/EnvioImagens";
import { botaoPerigo, botaoSecundario, cartao, tituloPagina } from "@/components/admin/estilos";
import FormularioPresente from "@/components/admin/FormularioPresente";
import GradeImagens from "@/components/admin/GradeImagens";
import { exigirAdmin } from "@/lib/servidor/admin";
import { listarImagens } from "@/lib/servidor/imagens";
import { obterPresenteAdmin } from "@/lib/servidor/presentes";

export const metadata: Metadata = { title: "Editar presente" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> };

export default async function EditarPresente({ params, searchParams }: Props) {
  await exigirAdmin();
  const { id } = await params;
  const presente = await obterPresenteAdmin(id);
  if (!presente) notFound();
  const [imagens, { novo }] = await Promise.all([listarImagens("presente", presente.id), searchParams]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/presentes" className="font-sans-body text-sm font-bold text-marian-deep hover:text-gold">
          ← Presentes
        </Link>
        <Link href="/admin/presentes/novo" className={botaoSecundario}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo presente
        </Link>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className={tituloPagina}>{presente.nome}</h1>
        {presente.ativo && (
          <Link
            href={`/presentes/${presente.id}`}
            target="_blank"
            className="font-sans-body text-sm font-bold text-marian-deep hover:text-gold"
          >
            Ver no site ↗
          </Link>
        )}
      </div>

      {novo && (
        <p className="rounded-lg border border-primary/20 bg-secondary/60 px-4 py-3 font-sans-body text-sm text-marian-deep" role="status">
          Presente criado. Agora adicione as fotos.
        </p>
      )}

      <section className={cartao} aria-labelledby="fotos">
        <h2 id="fotos" className="mb-4 font-serif-display text-2xl text-marian-deep">
          Fotos
        </h2>
        <div className="space-y-4">
          <GradeImagens imagens={imagens} vazio="Nenhuma foto ainda. A primeira foto é a capa na lista." />
          <EnvioImagens grupo="presente" presenteId={presente.id} maxLado={1600} />
        </div>
      </section>

      <section className={cartao} aria-labelledby="dados">
        <h2 id="dados" className="mb-4 font-serif-display text-2xl text-marian-deep">
          Dados
        </h2>
        <FormularioPresente presente={presente} />
      </section>

      <section className={cartao} aria-labelledby="remover">
        <h2 id="remover" className="mb-2 font-serif-display text-2xl text-marian-deep">
          Remover presente
        </h2>
        <p className="mb-4 font-sans-body text-sm text-muted-foreground">
          O presente sai da lista e do painel. Se já tiver pedidos, eles e as mensagens continuam guardados em
          “Pedidos e mensagens”; se não tiver, o presente e as fotos são apagados.
        </p>
        <BotaoConfirmar
          acao={removerPresenteAcao}
          campos={{ id: presente.id }}
          rotulo={
            <>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remover presente
            </>
          }
          confirmar="Sim, remover"
          aviso="Tem certeza? Não dá para desfazer."
          className={botaoPerigo}
        />
      </section>
    </div>
  );
}
