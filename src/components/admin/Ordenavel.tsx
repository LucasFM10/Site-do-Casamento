"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

type ComId = { id: string };

/**
 * Ordem de uma lista arrastável: muda na tela na hora e grava no servidor.
 * Se a gravação falhar, volta para a ordem anterior e avisa.
 */
export function useOrdem<T extends ComId>(itens: T[], salvar: (ids: string[]) => Promise<boolean>) {
  const [lista, setLista] = useState(itens);
  const [recebidos, setRecebidos] = useState(itens);
  const [erro, setErro] = useState(false);
  const [salvando, iniciar] = useTransition();

  // Dados novos do servidor (depois de salvar, enviar ou remover) substituem a lista local.
  if (itens !== recebidos) {
    setRecebidos(itens);
    setLista(itens);
  }

  function aoSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const de = lista.findIndex((i) => i.id === active.id);
    const para = lista.findIndex((i) => i.id === over.id);
    if (de < 0 || para < 0) return;
    const anterior = lista;
    const nova = arrayMove(lista, de, para);
    setLista(nova);
    setErro(false);
    iniciar(async () => {
      const ok = await salvar(nova.map((i) => i.id)).catch(() => false);
      if (!ok) {
        setLista(anterior);
        setErro(true);
      }
    });
  }

  return { lista, aoSoltar, erro, salvando };
}

/** Área onde os itens podem ser arrastados (mouse, toque ou teclado). */
export function AreaOrdenavel({
  id,
  itens,
  aoSoltar,
  grade = false,
  nome,
  children,
}: {
  id: string;
  itens: { id: string }[];
  aoSoltar: (evento: DragEndEvent) => void;
  grade?: boolean;
  /** Como o leitor de tela chama cada item, a partir do id. */
  nome: (id: string) => string;
  children: ReactNode;
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const posicao = (alvo: string | number) => itens.findIndex((i) => i.id === alvo) + 1;
  const avisos: Announcements = {
    onDragStart: ({ active }) => `${nome(String(active.id))} pego. Posição ${posicao(active.id)} de ${itens.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nome(String(active.id))} na posição ${posicao(over.id)} de ${itens.length}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nome(String(active.id))} solto na posição ${posicao(over.id)} de ${itens.length}.`
        : `${nome(String(active.id))} solto.`,
    onDragCancel: ({ active }) => `Movimento cancelado. ${nome(String(active.id))} voltou ao lugar.`,
  };

  return (
    <DndContext
      id={id}
      sensors={sensores}
      collisionDetection={closestCenter}
      onDragEnd={aoSoltar}
      accessibility={{
        announcements: avisos,
        screenReaderInstructions: {
          draggable:
            "Para mudar a ordem, pressione espaço ou Enter para pegar o item, use as setas para mover e pressione espaço ou Enter de novo para soltar. Esc cancela.",
        },
      }}
    >
      <SortableContext items={itens} strategy={grade ? rectSortingStrategy : verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** Um item arrastável. Só a alça inicia o arrasto, para cliques e rolagem continuarem normais. */
export function ItemOrdenavel({
  id,
  rotulo,
  className,
  children,
}: {
  id: string;
  /** Nome do item para o botão da alça (leitor de tela). */
  rotulo: string;
  className?: string;
  children: (alca: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const alca = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-roledescription="item arrastável"
      aria-label={`Mudar a ordem de ${rotulo}`}
      title="Arraste para mudar a ordem"
      className="inline-flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-cream hover:text-marian-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:cursor-grabbing"
    >
      <GripVertical className="h-5 w-5" aria-hidden="true" />
    </button>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(className, isDragging && "relative z-10 shadow-xl ring-2 ring-gold/60")}
    >
      {children(alca)}
    </li>
  );
}

/** Aviso abaixo da lista: salvando ou erro ao salvar. */
export function AvisoOrdem({ erro, salvando }: { erro: boolean; salvando: boolean }) {
  return (
    <p
      role="status"
      className={cn("min-h-5 font-sans-body text-sm", erro ? "text-destructive" : "text-muted-foreground")}
    >
      {erro ? "Não foi possível salvar a nova ordem. Tente de novo." : salvando ? "Salvando ordem..." : ""}
    </p>
  );
}
