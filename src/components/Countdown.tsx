"use client";

import { useSyncExternalStore } from "react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: string, now: number): TimeLeft {
  const difference = +new Date(targetDate) - now;
  if (difference <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

function subscribeToClock(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

const currentSecond = () => Math.floor(Date.now() / 1000) * 1000;
// No servidor e na hidratação não há relógio: mostra o placeholder.
const noClock = () => null;

const TimeDisplay = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center mx-2 md:mx-4">
    <span className="mb-1 font-serif-display text-[clamp(1.6rem,min(9vw,6.5dvh),3rem)] font-light leading-none text-white paisagem:text-[clamp(1.4rem,8dvh,2.25rem)]">
      {value.toString().padStart(2, '0')}
    </span>
    <span className="text-[clamp(0.55rem,1.3dvh,0.75rem)] tracking-[0.2em] uppercase text-gold-light opacity-80">
      {label}
    </span>
  </div>
);

const Separator = () => (
  <div className="text-[clamp(1.25rem,4dvh,2.25rem)] text-gold-light opacity-30 mt-[-1rem]" aria-hidden="true">:</div>
);

const Countdown = ({ targetDate }: { targetDate: string }) => {
  const now = useSyncExternalStore(subscribeToClock, currentSecond, noClock);

  // Na hidratação, o mesmo bloco invisível: o layout não pula.
  const timeLeft = now === null ? { days: 0, hours: 0, minutes: 0, seconds: 0 } : calculateTimeLeft(targetDate, now);

  return (
    <div
      className={`flex items-center justify-center py-[clamp(0.25rem,1dvh,1rem)] ${now === null ? "invisible" : "animate-fade-in"}`}
      role="timer"
      aria-label={`Faltam ${timeLeft.days} dias`}
    >
      <TimeDisplay value={timeLeft.days} label="Dias" />
      <Separator />
      <TimeDisplay value={timeLeft.hours} label="Horas" />
      <Separator />
      <TimeDisplay value={timeLeft.minutes} label="Minutos" />
      <Separator />
      <TimeDisplay value={timeLeft.seconds} label="Segundos" />
    </div>
  );
};

export default Countdown;
