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
    <span className="text-3xl md:text-5xl font-serif-display font-light text-white mb-1">
      {value.toString().padStart(2, '0')}
    </span>
    <span className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-gold-light opacity-80">
      {label}
    </span>
  </div>
);

const Countdown = ({ targetDate }: { targetDate: string }) => {
  const now = useSyncExternalStore(subscribeToClock, currentSecond, noClock);

  if (now === null) {
    return <div className="h-24" />; // Placeholder para manter o layout durante a hidratação
  }

  const timeLeft = calculateTimeLeft(targetDate, now);

  return (
    <div className="flex items-center justify-center py-4 animate-fade-in">
      <TimeDisplay value={timeLeft.days} label="Dias" />
      <div className="text-2xl md:text-4xl text-gold-light opacity-30 mt-[-1rem]">:</div>
      <TimeDisplay value={timeLeft.hours} label="Horas" />
      <div className="text-2xl md:text-4xl text-gold-light opacity-30 mt-[-1rem]">:</div>
      <TimeDisplay value={timeLeft.minutes} label="Minutos" />
      <div className="text-2xl md:text-4xl text-gold-light opacity-30 mt-[-1rem]">:</div>
      <TimeDisplay value={timeLeft.seconds} label="Segundos" />
    </div>
  );
};

export default Countdown;
