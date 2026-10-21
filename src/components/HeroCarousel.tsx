"use client";

import { useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import Countdown from "./Countdown";
import { dataPorExtenso, inicioDaCerimonia, type Configuracoes } from "@/lib/configuracoes";

export type FotoCarrossel = {
  src: string;
  /** Foto enviada pelo painel: já chega reduzida, sem otimização do Next. */
  doBanco: boolean;
};

/**
 * Página inicial em tela única: o carrossel de fotos fica ao fundo e todo o
 * conteúdo cabe na altura visível (100dvh). Os tamanhos acompanham a altura
 * e a largura da tela (clamp com dvh/vw); com o celular deitado, o conteúdo
 * se divide em duas colunas. Numa tela pequena demais, a página cresce e
 * rola em vez de cortar conteúdo.
 */
const HeroCarousel = ({
  fotos,
  config,
  children,
}: {
  fotos: FotoCarrossel[];
  config: Configuracoes;
  children: ReactNode;
}) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Quem pede menos movimento troca as fotos só pelos indicadores.
    if (fotos.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % fotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [fotos.length]);

  const casal = `${config.nome_1} e ${config.nome_2}`;
  const ano = config.data_casamento.slice(0, 4);

  return (
    <main className="relative isolate flex min-h-[100dvh] flex-col overflow-x-clip bg-marian-deep">
      {/* Fotos ao fundo */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {fotos.map((foto, i) => (
          <div
            key={foto.src}
            className="absolute inset-0 h-full w-full transition-opacity ease-in-out motion-reduce:!duration-0"
            style={{ opacity: current === i ? 1 : 0, transitionDuration: "2000ms" }}
          >
            <Image
              src={foto.src}
              alt={`${casal} - foto ${i + 1}`}
              fill
              className="object-cover"
              priority={i === 0}
              sizes="100vw"
              unoptimized={foto.doBanco}
            />
          </div>
        ))}
        <div className="hero-overlay absolute inset-0" />
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col items-center justify-center gap-[clamp(1rem,3.5dvh,2.5rem)] px-5 pb-2 pt-[max(env(safe-area-inset-top),1.25rem)] text-center paisagem:flex-row paisagem:gap-10 paisagem:px-8 paisagem:pt-3">
        <div className="flex flex-col items-center">
          <p className="mb-[clamp(0.4rem,1.5dvh,1rem)] max-w-[20rem] font-sans-body text-[clamp(0.65rem,1.6dvh,0.875rem)] uppercase tracking-[0.3em] text-gold-light animate-float-up sm:max-w-none">
            {config.frase_abertura}
          </p>

          <h1
            className="font-serif-display text-[clamp(2rem,min(11.5vw,10dvh),6rem)] font-light leading-[1.05] tracking-wide animate-float-up paisagem:whitespace-nowrap paisagem:text-[clamp(1.75rem,11dvh,3.5rem)]"
            style={{ color: "hsl(40, 60%, 90%)" }}
          >
            {config.nome_1} <span className="text-gold-light font-light">&</span> {config.nome_2}
          </h1>

          <div className="gold-divider my-[clamp(0.6rem,2.2dvh,1.5rem)] w-32 animate-float-up-delay md:w-48" />

          <div className="animate-float-up-delay">
            <Countdown targetDate={inicioDaCerimonia(config)} />
          </div>

          <p
            className="mt-[clamp(0.3rem,1.2dvh,1rem)] font-sans-body text-[clamp(0.75rem,1.9dvh,1.125rem)] uppercase tracking-widest animate-float-up-delay"
            style={{ color: "hsl(210, 30%, 85%)" }}
          >
            {dataPorExtenso(config.data_casamento)}
            {config.cidade && (
              <>
                {" "}
                <span aria-hidden="true">·</span> <span className="whitespace-nowrap">{config.cidade}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center gap-[clamp(0.75rem,3dvh,2rem)] md:max-w-3xl paisagem:max-w-sm">
          {config.citacao && (
            <figure className="animate-float-up-delay-2">
              <blockquote
                className="font-serif-display text-[clamp(1.05rem,2.6dvh,1.5rem)] font-light italic"
                style={{ color: "hsl(40, 60%, 85%)" }}
              >
                &ldquo;{config.citacao}&rdquo;
              </blockquote>
              {config.citacao_referencia && (
                <figcaption
                  className="mt-1 font-sans-body text-[clamp(0.6rem,1.4dvh,0.75rem)] tracking-widest"
                  style={{ color: "hsl(210, 30%, 70%)" }}
                >
                  - {config.citacao_referencia}
                </figcaption>
              )}
            </figure>
          )}

          <div className="w-full animate-float-up-delay-2">{children}</div>
        </div>
      </div>

      <footer className="flex flex-col items-center gap-[clamp(0.4rem,1.2dvh,0.75rem)] px-5 pb-[max(env(safe-area-inset-bottom),0.75rem)] text-center">
        {fotos.length > 1 && (
          <div className="flex gap-2">
            {fotos.map((foto, i) => (
              <button
                key={foto.src}
                onClick={() => setCurrent(i)}
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  backgroundColor: current === i ? "hsl(40, 60%, 55%)" : "hsla(0, 0%, 100%, 0.4)",
                  width: current === i ? "24px" : "8px",
                }}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={current === i}
              />
            ))}
          </div>
        )}
        {config.rodape_citacao && (
          <p className="font-serif-display text-[clamp(0.75rem,1.7dvh,0.95rem)] italic text-white/75">
            &ldquo;{config.rodape_citacao}&rdquo;
            {config.rodape_autor && <> - {config.rodape_autor}</>}
          </p>
        )}
        <p className="font-sans-body text-[clamp(0.6rem,1.3dvh,0.7rem)] tracking-wider text-white/50">
          © {ano} {config.nome_1} &amp; {config.nome_2}
        </p>
      </footer>
    </main>
  );
};

export default HeroCarousel;
