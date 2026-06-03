import { 
  ShieldAlert, 
  TrendingUp, 
  Award, 
  Calculator, 
  UserCheck, 
  CalendarDays,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (tabId: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner de Boas-vindas */}
      <div className="bg-gradient-to-r from-[#004b8d] to-[#013564] text-white p-8 sm:p-10 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-6 translate-x-6">
          <Calculator size={320} className="text-white" />
        </div>
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold tracking-wide uppercase">
            Diretoria de Gestão de Pessoas — DGEP
          </span>
          <h1 className="text-3xl sm:text-4.5xl font-bold tracking-tight">
            Cálculos e Simulações de Aposentadoria
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base leading-relaxed">
            Plataforma de simulação previdenciária, atualização monetária e incorporação proporcional de gratificações de acordo com os regulamentos vigentes do IPMC e da Câmara Municipal de Curitiba.
          </p>
        </div>
      </div>

      {/* Grid das Ferramentas Integradas */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
          Ferramentas de Gestão e Simulação
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Destaque: Simulação Completa */}
          <div 
            onClick={() => onNavigate('simulacao_completa')}
            className="md:col-span-2 group relative overflow-hidden bg-gradient-to-r from-indigo-50 to-blue-50/50 hover:from-indigo-100/80 hover:to-blue-100/50 border-2 border-indigo-600/20 hover:border-indigo-600/40 rounded-2xl p-6 sm:p-8 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles size={120} className="text-indigo-600" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start gap-4 z-10">
              <div className="p-4 w-fit rounded-xl bg-indigo-600 text-white shadow-sm group-hover:scale-105 transition-all">
                <Sparkles size={28} />
              </div>
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-indigo-600 text-white font-extrabold uppercase px-2 py-0.5 rounded-full tracking-widest">
                    Recomendado
                  </span>
                  <span className="text-xs font-bold text-indigo-605">Dossiê Unificado</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-gray-800 group-hover:text-indigo-700 transition-colors">
                  Nova Simulação Completa de Aposentadoria
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  A nossa ferramenta principal e unificada. Realize uma análise completa de cabo a rabo do dossiê do servidor: calcula o histórico salarial, realiza exclusão automática dos 20% menores salários de contribuição, faz a incorporação de gratificações especiais (GE) e indica elegibilidade imediata ou futura em todas as regras previdenciárias vigentes do IPMC de uma só vez.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 self-end sm:self-auto flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-lg shadow-sm transition-all group-hover:translate-x-0.5">
              Iniciar Simulação <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 1: Simulador de Proventos */}
          <div 
            onClick={() => onNavigate('proventos')}
            className="group bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs hover:shadow-md hover:border-[#004b8d]/35 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-lg bg-blue-50 text-[#004b8d] group-hover:bg-[#004b8d] group-hover:text-white transition-all">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 group-hover:text-[#004b8d] transition-colors">
                  Simulador de Proventos de Aposentadoria
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Cálculo detalhado de proventos estimados integrando tempos de serviço, evolução da carreira, incorporações, gratificações e adicionais (ATS).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end text-[#004b8d] text-xs font-bold gap-1 mt-6">
              Acessar ferramenta <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Simulador de Regras */}
          <div 
            onClick={() => onNavigate('regras')}
            className="group bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs hover:shadow-md hover:border-[#004b8d]/30 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white transition-all">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 group-hover:text-emerald-700 transition-colors">
                  Simulador de Regras de Aposentadoria
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Avaliação inteligente de elegibilidade entre a Regra Geral (Art. 6º), Pedágio 100% (Art. 11) e Regra de Pontos (Art. 10) conforme a Lei Complementar 133/2021.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end text-emerald-700 text-xs font-bold gap-1 mt-6">
              Acessar ferramenta <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Atualização de Salários */}
          <div 
            onClick={() => onNavigate('atualizacao')}
            className="group bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs hover:shadow-md hover:border-[#004b8d]/30 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-lg bg-amber-50 text-amber-700 group-hover:bg-amber-700 group-hover:text-white transition-all">
                <CalendarDays size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 group-hover:text-amber-700 transition-colors">
                  Atualização de Salários de Contribuição
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Processador em lote e correção monetária de salários de contribuição a partir de dados tabulados e fatores de conversão.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end text-amber-700 text-xs font-bold gap-1 mt-6">
              Acessar ferramenta <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 4: Gratificação Especial */}
          <div 
            onClick={() => onNavigate('gratificacao')}
            className="group bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs hover:shadow-md hover:border-[#004b8d]/30 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="p-3 w-fit rounded-lg bg-red-50 text-red-800 group-hover:bg-red-800 group-hover:text-white transition-all">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800 group-hover:text-red-800 transition-colors">
                  Calculadora de Gratificação Especial
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm mt-1.5 leading-relaxed">
                  Simulador de incorporação proporcional de estímulos acadêmicos e funções gratificadas (FGs) calculados sobre salários-base relativos a divisor específico de meses.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end text-red-800 text-xs font-bold gap-1 mt-6">
              Acessar ferramenta <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
