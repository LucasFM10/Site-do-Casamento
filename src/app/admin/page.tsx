import { getAllOfferings, signOut } from "../actions";
import ToggleButton from "@/components/admin/ToggleButton";
import { redirect } from "next/navigation";

/**
 * Painel Administrativo de Intenções
 * Permite visualizar todas as ofertas e marcá-las como "vistas".
 */

export default async function AdminPage() {
  let offerings;

  try {
    offerings = await getAllOfferings();
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-gray-800">ElevadorParaDois</h1>
            <p className="text-gray-400 text-xs tracking-widest uppercase font-semibold mt-1">Gestão de Intenções</p>
          </div>
          <form action={signOut}>
            <button className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-semibold tracking-wide">
              SAIR
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-[10px] tracking-[0.2em] font-bold uppercase mb-2">Total de Terços</p>
            <p className="text-3xl font-serif text-gray-800">{offerings.reduce((acc, curr) => acc + curr.quantidade, 0)}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-[10px] tracking-[0.2em] font-bold uppercase mb-2">Pessoas Registradas</p>
            <p className="text-3xl font-serif text-gray-800">{offerings.length}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 text-[10px] tracking-[0.2em] font-bold uppercase mb-2">Pendentes de Leitura</p>
            <p className="text-3xl font-serif text-gray-800">{offerings.filter(o => !o.vista).length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] tracking-widest font-bold text-gray-400 uppercase">Devoto</th>
                <th className="px-6 py-4 text-[10px] tracking-widest font-bold text-gray-400 uppercase">Qtd</th>
                <th className="px-6 py-4 text-[10px] tracking-widest font-bold text-gray-400 uppercase">Intenção</th>
                <th className="px-6 py-4 text-[10px] tracking-widest font-bold text-gray-400 uppercase text-center">Foto</th>
                <th className="px-6 py-4 text-[10px] tracking-widest font-bold text-gray-400 uppercase">Data</th>
                <th className="px-6 py-4 text-[10px] tracking-widest font-bold text-gray-400 uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {offerings.map((offering) => (
                <tr key={offering.id} className={`transition-all duration-500 ${offering.vista ? 'bg-gray-50/50 opacity-60' : 'bg-white'}`}>
                  <td className="px-6 py-6 font-semibold text-gray-700">{offering.nome_devoto}</td>
                  <td className="px-6 py-6 font-serif text-lg text-gold-dark">{offering.quantidade}</td>
                  <td className="px-6 py-6 text-sm text-gray-500 italic max-w-xs">{offering.intencao || "—"}</td>
                  <td className="px-6 py-6 text-center">
                    {offering.foto_url ? (
                      <a 
                        href={offering.foto_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg overflow-hidden border border-gray-100 hover:border-gold-light transition-all hover:scale-110"
                      >
                        <img 
                          src={offering.foto_url} 
                          alt="Anexo" 
                          className="w-10 h-10 object-cover"
                        />
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-6 text-xs text-gray-400">
                    {new Date(offering.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-6 flex justify-center">
                    <ToggleButton id={offering.id} initialStatus={offering.vista} />
                  </td>
                </tr>
              ))}
              {offerings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">
                    Nenhuma intenção registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
