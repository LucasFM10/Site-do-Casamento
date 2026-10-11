"use client";

import { FormEvent, useRef, useState } from "react";
import { CalendarHeart, Check, Gift, Loader2, MapPin, Phone, UserCheck } from "lucide-react";
import { registerAttendance, type AttendanceResponse } from "@/app/actions";
import { formatBrazilianPhone, isValidBrazilianPhone } from "@/lib/phone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type FormErrors = Partial<Record<"name" | "phone" | "response", string>>;

const actionButtonClass =
  "group flex min-h-16 w-full items-center justify-center gap-3 rounded-lg border border-gold/50 bg-white px-5 py-4 font-sans-body text-sm font-bold uppercase tracking-[0.12em] text-marian-deep shadow-[0_10px_30px_hsla(var(--marian-deep),0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-gold hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marian-deep focus-visible:ring-offset-2 active:translate-y-0 sm:min-h-20 sm:text-base";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-3 font-sans-body text-base text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

const WEDDING_DETAILS = {
  ceremonyTime: "11h30",
  ceremonyPlace: "Paróquia São Pedro Pescador, Manaíra",
  receptionPlace: "A definir",
} as const;

function InformationDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={actionButtonClass}>
          <CalendarHeart className="h-5 w-5 shrink-0 text-gold transition-transform group-hover:scale-110" aria-hidden="true" />
          Informações do casamento
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-xl border-gold/20 bg-card p-6 shadow-2xl sm:p-8">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-serif-display text-3xl font-medium text-marian-deep">
            Informações do casamento
          </DialogTitle>
          <DialogDescription className="font-sans-body leading-relaxed">
            Confira os detalhes para celebrar este dia conosco.
          </DialogDescription>
        </DialogHeader>

        <div className="gold-divider" />

        <dl className="space-y-6 font-sans-body">
          <div>
            <dt className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-gold">Horário da cerimônia</dt>
            <dd className="text-lg text-marian-deep">{WEDDING_DETAILS.ceremonyTime}</dd>
          </div>
          <div>
            <dt className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gold">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Local da cerimônia
            </dt>
            <dd className="text-lg text-marian-deep">{WEDDING_DETAILS.ceremonyPlace}</dd>
          </div>
          <div>
            <dt className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-gold">Local da recepção</dt>
            <dd className="text-lg text-marian-deep">{WEDDING_DETAILS.receptionPlace}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [response, setResponse] = useState<AttendanceResponse | "">("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResponse, setSubmittedResponse] = useState<AttendanceResponse | null>(null);
  const submittingRef = useRef(false);

  const reset = () => {
    setName("");
    setPhone("");
    setResponse("");
    setErrors({});
    setSubmitError("");
    setSubmittedResponse(null);
    setIsSubmitting(false);
    submittingRef.current = false;
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return;

    setOpen(nextOpen);
    if (!nextOpen) reset();
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    const normalizedName = name.trim().replace(/\s+/g, " ");

    if (normalizedName.length < 3 || normalizedName.split(" ").length < 2) {
      nextErrors.name = "Informe seu nome completo.";
    }

    if (!isValidBrazilianPhone(phone)) {
      nextErrors.phone = "Informe um celular válido com DDD.";
    }

    if (!response) {
      nextErrors.response = "Selecione uma das opções.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !validate()) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");

    const result = await registerAttendance(new FormData(event.currentTarget));

    if (result.success === true) {
      setSubmittedResponse(result.response);
    } else {
      setSubmitError(result.error);
    }

    submittingRef.current = false;
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className={actionButtonClass}>
          <UserCheck className="h-5 w-5 shrink-0 text-gold transition-transform group-hover:scale-110" aria-hidden="true" />
          Confirmar presença
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-xl border-gold/20 bg-card p-6 shadow-2xl sm:p-8"
        onInteractOutside={(event) => isSubmitting && event.preventDefault()}
        onEscapeKeyDown={(event) => isSubmitting && event.preventDefault()}
      >
        {submittedResponse ? (
          <div className="py-4 text-center" role="status">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
              <Check className="h-8 w-8" aria-hidden="true" />
            </div>
            <DialogTitle className="mb-3 font-serif-display text-3xl font-medium text-marian-deep">
              Confirmação recebida
            </DialogTitle>
            <DialogDescription className="mx-auto max-w-sm font-sans-body text-base leading-relaxed">
              {submittedResponse === "sim"
                ? "Que alegria! Obrigado por confirmar. Esperamos você para celebrar conosco."
                : "Obrigado por nos avisar. Sentiremos sua falta e guardaremos você com carinho neste dia."}
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="font-serif-display text-3xl font-medium text-marian-deep">
                Confirmar presença
              </DialogTitle>
              <DialogDescription className="font-sans-body leading-relaxed">
                Preencha uma confirmação individual para cada convidado.
              </DialogDescription>
            </DialogHeader>

            <div className="gold-divider" />

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Não preencha este campo</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="space-y-2">
                <label htmlFor="nomeCompleto" className="block font-sans-body text-sm font-bold text-marian-deep">
                  Nome completo
                </label>
                <input
                  id="nomeCompleto"
                  name="nomeCompleto"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "nomeCompleto-error" : undefined}
                  className={inputClass}
                  placeholder="Seu nome e sobrenome"
                  maxLength={120}
                  required
                />
                {errors.name && <p id="nomeCompleto-error" className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="celular" className="block font-sans-body text-sm font-bold text-marian-deep">
                  Celular
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <input
                    id="celular"
                    name="celular"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(event) => setPhone(formatBrazilianPhone(event.target.value))}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "celular-error" : "celular-help"}
                    className={`${inputClass} pl-11`}
                    placeholder="(92) 99999-9999"
                    required
                  />
                </div>
                <p id="celular-help" className="text-xs text-muted-foreground">Use o DDD e o número do celular.</p>
                {errors.phone && <p id="celular-error" className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              <fieldset className="space-y-3">
                <legend className="font-sans-body text-sm font-bold text-marian-deep">Você poderá comparecer?</legend>
                {[
                  { value: "sim", label: "Sim, confirmo minha presença" },
                  { value: "nao", label: "Não poderei comparecer" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 font-sans-body text-sm text-foreground transition hover:border-gold has-[:checked]:border-primary has-[:checked]:bg-secondary/60"
                  >
                    <input
                      type="radio"
                      name="resposta"
                      value={option.value}
                      checked={response === option.value}
                      onChange={() => setResponse(option.value as AttendanceResponse)}
                      disabled={isSubmitting}
                      className="h-4 w-4 accent-primary"
                      required
                    />
                    {option.label}
                  </label>
                ))}
                {errors.response && <p className="text-sm text-destructive">{errors.response}</p>}
              </fieldset>

              {submitError && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-submit flex w-full items-center justify-center gap-2 font-sans-body text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Enviando..." : "Enviar confirmação"}
              </button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GiftsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className={actionButtonClass}>
          <Gift className="h-5 w-5 shrink-0 text-gold transition-transform group-hover:scale-110" aria-hidden="true" />
          Lista de presentes
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-xl border-gold/20 bg-card p-8 text-center shadow-2xl">
        <DialogHeader className="text-center">
          <DialogTitle className="sr-only">Lista de presentes</DialogTitle>
          <DialogDescription className="pt-4 font-serif-display text-2xl italic text-gold">Em breve...</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default function WeddingActions() {
  return (
    <section className="relative overflow-hidden bg-cream px-6 py-16 md:py-24" aria-labelledby="wedding-actions-title">
      <div className="absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-gold/5 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl text-center">
        <h2 id="wedding-actions-title" className="font-serif-display text-4xl font-light text-marian-deep md:text-5xl">
          Nosso grande dia
        </h2>
        <p className="mx-auto mb-10 mt-4 max-w-xl font-sans-body text-base leading-relaxed text-muted-foreground">
          Encontre as informações da celebração, confirme sua presença e acompanhe nossa lista de presentes.
        </p>

        <div className="mx-auto grid max-w-2xl gap-4 md:grid-cols-1">
          <InformationDialog />
          <AttendanceDialog />
          <GiftsDialog />
        </div>
      </div>
    </section>
  );
}
