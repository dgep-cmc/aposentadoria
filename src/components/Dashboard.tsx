import { useEffect, useState } from 'react';
import {
  Calculator,
  Users,
  Database,
  ClipboardList,
  ArrowRight,
  Sparkles,
  FileCheck2,
  FileText
} from 'lucide-react';
import { getSavedSimulations } from '../utils/simulationsStore';
import { getCertidoesEmitidas } from '../utils/certidoesEmitidasStore';

interface DashboardProps {
  onNavigate: (tabId: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    servidores: 0,
    oficiais: 0,
    minutas: 0
  });

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const [sims, certs] = await Promise.all([
          getSavedSimulations(),
          Promise.resolve(getCertidoesEmitidas())
        ]);
        if (!active) return;
        const oficiais = certs.filter(c => c.tipo === 'oficial').length;
        const minutas = certs.filter(c => c.tipo !== 'oficial').length;
        setStats({
          servidores: sims.length,
          oficiais,
          minutas
        });
      } catch (e) {}
    };
    loadStats();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner de Boas-vindas */}
      <div className="bg-gradient-to-r from-[#004b8d] to-[#013564] text-white p-8 sm:p-10 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
          <Calculator size={320} className="text-white" />
        </div>

        <div className="relative z-10 space-y-5">
          <div className="space-y-3 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold tracking-wide uppercase">
              Diretoria de Gestão de Pessoas — DGEP
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Dossiê Previdenciário, Simulações e Certidões
            </h1>
            <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
              Plataforma unificada da Câmara Municipal de Curitiba: mantenha o cadastro completo de cada servidor em uma única tela e gere automaticamente simulações de aposentadoria, cálculos de proventos, certidões e remessas ao IPMC.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-xl pt-1">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-blue-100/90">
                <Users size={13} /> Cadastros
              </div>
              <div className="text-2xl font-extrabold text-white mt-0.5">{stats.servidores}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-200">
                <FileCheck2 size={13} /> Oficiais
              </div>
              <div className="text-2xl font-extrabold text-white mt-0.5">{stats.oficiais}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-amber-200">
                <FileText size={13} /> Minutas
              </div>
              <div className="text-2xl font-extrabold text-white mt-0.5">{stats.minutas}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid das Ferramentas */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
          Módulos do Sistema
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Principal: Servidores (Dossiê Único) */}
          <div
            onClick={() => onNavigate('servidores')}
            className="md:col-span-2 group relative overflow-hidden bg-gradient-to-r from-indigo-50 via-blue-50/60 to-teal-50/40 hover:from-indigo-100/70 hover:to-teal-100/50 border-2 border-[#004b8d]/20 hover:border-[#004b8d]/45 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles size={130} className="text-[#004b8d]" />
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-4 z-10">
              <div className="p-4 w-fit rounded-xl bg-[#002f5a] text-white shadow-sm group-hover:scale-105 transition-all">
                <Users size={28} />
              </div>
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-[#004b8d] text-white font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">
                    Fluxo Unificado
                  </span>
                  <span className="text-xs font-bold text-[#002f5a]">
                    Cadastro → Simulações & Documentos
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-800 group-hover:text-[#004b8d] transition-colors">
                  Servidores, Simulações e Documentos
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  Acesse a carteira de servidores ou cadastre um novo servidor em uma única ficha cronológica (Averbações e Salários). A partir dela, gere todas as{' '}
                  <strong>Regras de Aposentadoria</strong>, <strong>Proventos</strong>,{' '}
                  <strong>Certidão de Aposentadoria</strong>,{' '}
                  <strong>Certidão de Abono de Permanência</strong> e{' '}
                  <strong>Remessa ao IPMC</strong>.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 self-end sm:self-auto flex items-center gap-1.5 bg-[#002f5a] hover:bg-[#004b8d] text-white text-xs font-extrabold px-5 py-3 rounded-xl shadow-sm transition-all group-hover:translate-x-0.5">
              Acessar Servidores{' '}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Acompanhamento de Cadastros & Controle de Certidões */}
          <div
            onClick={() => onNavigate('acompanhamento')}
            className="group bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs hover:shadow-md hover:border-teal-500/50 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-lg bg-teal-50 text-teal-700 group-hover:bg-teal-700 group-hover:text-white transition-all">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 group-hover:text-teal-700 transition-colors">
                  Acompanhamento & Controle de Certidões
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Monitore cadastros completos ou pendentes por servidor e acompanhe todas as certidões emitidas separadas por finalidade e natureza (Aposentadoria e Abono — Oficial ou Minuta).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end text-teal-700 text-xs font-bold gap-1 mt-6">
              Abrir Acompanhamento{' '}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Gestão de Cadastros & Atualização de Contribuições */}
          <div
            onClick={() => onNavigate('cadastros')}
            className="group bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs hover:shadow-md hover:border-indigo-400/50 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-lg bg-indigo-50 text-indigo-700 group-hover:bg-indigo-700 group-hover:text-white transition-all">
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 group-hover:text-indigo-700 transition-colors">
                  Cadastros, Parâmetros & Atualização em Lote
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Mantenha usuários autorizados, Fatores de Conversão (INSS), salários base por cargo, FGs, Teto Constitucional e faça a atualização monetária em lote de salários de contribuição.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end text-indigo-700 text-xs font-bold gap-1 mt-6">
              Abrir Cadastros & Atualização{' '}
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
