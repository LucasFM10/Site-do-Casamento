"use client";

import { useState } from "react";
import { toggleSeenStatus } from "@/app/actions";

interface ToggleButtonProps {
  id: string;
  initialStatus: boolean;
}

export default function ToggleButton({ id, initialStatus }: ToggleButtonProps) {
  const [isSeen, setIsSeen] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    // Otimismo: mudamos o estado visual imediatamente
    const newStatus = !isSeen;
    setIsSeen(newStatus);

    try {
      const result = await toggleSeenStatus(id, isSeen);
      
      if (!result.success) {
        // Reverte se falhar
        setIsSeen(isSeen);
        alert("Erro ao atualizar status.");
      }
    } catch (error) {
      setIsSeen(isSeen);
      alert("Erro de conexão.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
        isSeen 
          ? 'bg-green-100 text-green-600 border border-green-200 shadow-sm' 
          : 'bg-white text-gray-400 border border-gray-100 shadow-sm hover:border-gold-light hover:text-gold-dark'
      } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      title={isSeen ? "Marcar como não lido" : "Marcar como lido"}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        isSeen ? '✓' : '○'
      )}
    </button>
  );
}
