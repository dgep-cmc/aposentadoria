import { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Play, 
  Printer, 
  AlertCircle, 
  CheckCircle, 
  XSquare, 
  Star,
  RefreshCw 
} from 'lucide-react';

interface ServerIdentify {
  nome: string;
  matricula: string;
  dataNasc: string;
  sexo: 'Masculino' | 'Feminino' | '';
  dataIngressoSP: string;
  dataIngressoCargo: string;
  averbacoesRgpsDias: number;
  averbacoesSpDias: number;
  afastamentosDias: number;
}

interface ProjectionDetails {
  idade: number;
  contrib: number;
  sp: number;
  cargo: number;
  pontos: number;
}

interface RuleResult {
  nome: string;
  aplicavel: boolean;
  motivo?: string;
  data?: Date;
  proventos?: string;
  isVantajosa?: boolean;
  detalhes?: ProjectionDetails;
}

const DATA_REF_2022 = new Date(2022, 0, 1);
const DATA_LIMITE_2003 = new Date(2003, 11, 31);
const DATA_LIMITE_2021 = new Date(2021, 11, 31);

export default function RegrasAposentadoria() {
  // Caching keys
  const cacheKey = 'dgep_aposent_data';

  const [formData, setFormData] = useState<ServerIdentify>(() => {
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return {
      nome: '',
      matricula: '',
      dataNasc: '',
      sexo: '',
      dataIngressoSP: '',
      dataIngressoCargo: '',
      averbacoesRgpsDias: 0,
      averbacoesSpDias: 0,
      afastamentosDias: 0
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [results, setResults] = useState<RuleResult[]>([]);
  const [showClearModal, setShowClearModal] = useState(false);
  const [simulatedServer, setSimulatedServer] = useState<ServerIdentify | null>(null);

  useEffect(() => {
    localStorage.setItem(cacheKey, JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (field: keyof ServerIdentify, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  function parseDate(str: string): Date | null {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function diffEmDias(d1: Date, d2: Date): number {
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  function calcularIdade(dataNasc: Date, dataRef: Date): number {
    let age = dataRef.getFullYear() - dataNasc.getFullYear();
    const m = dataRef.getMonth() - dataNasc.getMonth();
    if (m < 0 || (m === 0 && dataRef.getDate() < dataNasc.getDate())) {
      age--;
    }
    return age;
  }

  function formatarData(d: Date | undefined): string {
    return d ? d.toLocaleDateString('pt-BR') : 'N/A';
  }

  function formatarTempo(totalDias: number): string {
    const commitmentYears = Math.floor(totalDias / 365);
    const rem = totalDias % 365;
    const months = Math.floor(rem / 30);
    const days = rem % 30;
    const yStr = commitmentYears === 1 ? '1 ano' : `${commitmentYears} anos`;
    const mStr = months === 1 ? '1 mês' : `${months} meses`;
    const dStr = days === 1 ? '1 dia' : `${days} dias`;
    return `${yStr}, ${mStr} e ${dStr} (${totalDias.toLocaleString('pt-BR')} dias)`;
  }

  // Projection Logic
  function projetar(server: any, regra: any): RuleResult {
    const projDate = new Date(server.inicioProjecao);
    const totalContrib = diffEmDias(server.dataIngressoSP, server.inicioProjecao) + server.averbRgps + server.averbSp - server.afastamentos;
    const totalSp = diffEmDias(server.dataIngressoSP, server.inicioProjecao) + server.averbSp - server.afastamentos;
    const totalCargo = diffEmDias(server.dataIngressoCargo, server.inicioProjecao) - server.afastamentos;

    const proj = {
      data: projDate,
      contrib: totalContrib,
      sp: totalSp,
      cargo: totalCargo
    };

    for (let i = 0; i < 18250; i++) { // Limit 50 years
      if (i > 0) {
        proj.data.setDate(proj.data.getDate() + 1);
        proj.contrib++;
        proj.sp++;
        if (proj.data >= server.dataIngressoCargo) proj.cargo++;
      }

      const idade = calcularIdade(server.dataNasc, proj.data);
      if (idade >= 75) {
        return { nome: regra.nome, aplicavel: false, motivo: "Atingiu idade compulsória (75 anos)." };
      }

      if (regra.checker(server, proj, idade)) {
        return {
          nome: regra.nome,
          aplicavel: true,
          data: new Date(proj.data),
          proventos: regra.proventos(server),
          detalhes: {
            idade,
            contrib: proj.contrib,
            sp: proj.sp,
            cargo: proj.cargo,
            pontos: (diffEmDias(server.dataNasc, proj.data) / 365.25) + (proj.contrib / 360)
          }
        };
      }
    }
    return { nome: regra.nome, aplicavel: false, motivo: "Requisitos não atingidos em 50 anos." };
  }

  // Dynamic Rule Definitions
  const REGRAS_DEF = [
    {
      nome: "Regra Geral (Art. 6º)",
      proventos: () => "Média",
      checker: (s: any, p: any, id: number) => 
        id >= (s.sexo === 'Masculino' ? 65 : 62) && 
        p.contrib >= 25 * 360 && 
        p.sp >= 10 * 360 && 
        p.cargo >= 5 * 360
    },
    {
      nome: "Pedágio 100% (Art. 11)",
      proventos: (s: any) => s.dataIngressoSP <= DATA_LIMITE_2003 ? "Integralidade" : "Média",
      checker: (s: any, p: any, id: number) => {
        if (s.dataIngressoSP > new Date(2022, 0, 1)) return false;
        const minC = (s.sexo === 'Masculino' ? 35 : 30) * 360;
        const pedagio = Math.max(0, minC - s.tempoEm2022);
        return id >= (s.sexo === 'Masculino' ? 60 : 57) && 
          p.contrib >= (minC + pedagio) && 
          p.sp >= 20 * 360 && 
          p.cargo >= 5 * 360;
      }
    },
    {
      nome: "Regra de Pontos (Art. 10)",
      proventos: (s: any) => s.dataIngressoSP <= DATA_LIMITE_2003 ? "Integralidade (Inciso I)" : "Média (Inciso II)",
      checker: (s: any, p: any, id: number) => {
        if (s.dataIngressoSP > DATA_LIMITE_2021) return false;
        const minId = s.dataIngressoSP <= DATA_LIMITE_2003 ? (s.sexo === 'Masculino' ? 65 : 62) : (s.sexo === 'Masculino' ? 62 : 57);
        const minC = (s.sexo === 'Masculino' ? 35 : 30) * 360;
        const ptsBase = s.sexo === 'Masculino' ? 98 : 88;
        const ptsTeto = s.sexo === 'Masculino' ? 105 : 100;
        const ptsExig = Math.min(ptsTeto, ptsBase + Math.max(0, p.data.getFullYear() - 2022));
        const ptsAtuais = (diffEmDias(s.dataNasc, p.data) / 365.25) + (p.contrib / 360);
        return id >= minId && 
          p.contrib >= minC && 
          p.sp >= 20 * 360 && 
          p.cargo >= 5 * 360 && 
          ptsAtuais >= ptsExig;
      }
    }
  ];

  const handleSimular = () => {
    setErrorMsg('');
    setResults([]);

    const dataNascParsed = parseDate(formData.dataNasc);
    const dataIngressoSPParsed = parseDate(formData.dataIngressoSP);
    const dataIngressoCargoParsed = parseDate(formData.dataIngressoCargo);

    if (!dataNascParsed || !dataIngressoSPParsed || !dataIngressoCargoParsed || !formData.sexo) {
      setErrorMsg("Identificação incompleta: Por favor preencha Gênero, Nascimento, Admissão/Ingresso no Serviço Público e Cargo.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const s = {
          nome: formData.nome,
          matricula: formData.matricula,
          dataNasc: dataNascParsed,
          sexo: formData.sexo,
          dataIngressoSP: dataIngressoSPParsed,
          dataIngressoCargo: dataIngressoCargoParsed,
          averbRgps: Number(formData.averbacoesRgpsDias) || 0,
          averbSp: Number(formData.averbacoesSpDias) || 0,
          afastamentos: Number(formData.afastamentosDias) || 0
        };

        const inicioProjecao = new Date(Math.max(
          s.dataIngressoSP.getTime(), 
          s.dataIngressoCargo.getTime(), 
          DATA_REF_2022.getTime()
        ));
        const tempoEm2022 = diffEmDias(s.dataIngressoSP, DATA_REF_2022) + s.averbRgps + s.averbSp - s.afastamentos;

        const serverObj = { ...s, inicioProjecao, tempoEm2022 };
        const simRes = REGRAS_DEF.map(regra => projetar(serverObj, regra));

        // Highlight "Mais Vantajosa"
        const aplicaveis = simRes.filter(r => r.aplicavel);
        if (aplicaveis.length > 0) {
          // Sort preferential rule by Integralidade priority or closest date
          const integras = aplicaveis.filter(r => r.proventos?.includes("Integral"));
          let topRule;
          if (integras.length > 0) {
            topRule = integras.sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))[0];
          } else {
            topRule = aplicaveis.sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))[0];
          }
          if (topRule) {
            topRule.isVantajosa = true;
          }
        }

        setResults(simRes);
        setSimulatedServer(formData);
      } catch (err: any) {
        setErrorMsg(`Houve um erro no processamento previdenciário: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 200);
  };

  const handleConfirmClear = () => {
    const emptyObj: ServerIdentify = {
      nome: '',
      matricula: '',
      dataNasc: '',
      sexo: '',
      dataIngressoSP: '',
      dataIngressoCargo: '',
      averbacoesRgpsDias: 0,
      averbacoesSpDias: 0,
      afastamentosDias: 0
    };
    setFormData(emptyObj);
    setResults([]);
    setSimulatedServer(null);
    setShowClearModal(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Form Card */}
      <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Simulador de Regras de Aposentadoria
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Avaliação de enquadramento segundo as regras da Lei Complementar nº 133/2021 (IPMC)
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setShowClearModal(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-gray-50 border border-gray-200 text-gray-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <Trash2 size={13} /> Limpar Dados
          </button>
        </div>

        {errorMsg && (
          <div className="flex gap-2.5 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg leading-relaxed text-xs sm:text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Atenção previdenciária:</span> {errorMsg}
            </div>
          </div>
        )}

        {/* Form Inputs Grid */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              1. Identificação Geral
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
                <input 
                  type="text" 
                  value={formData.nome || ''} 
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Nome do servidor"
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Matrícula</label>
                <input 
                  type="text" 
                  value={formData.matricula || ''} 
                  onChange={(e) => handleInputChange('matricula', e.target.value)}
                  placeholder="Matrícula CMC"
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data de Nascimento</label>
                <input 
                  type="date" 
                  value={formData.dataNasc || ''} 
                  onChange={(e) => handleInputChange('dataNasc', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Gênero</label>
                <select 
                  value={formData.sexo || ''} 
                  onChange={(e) => handleInputChange('sexo', e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                >
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              2. Carreira e Histórico Previdenciário
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ingresso Serviço Público (CMC)</label>
                <input 
                  type="date" 
                  value={formData.dataIngressoSP || ''} 
                  onChange={(e) => handleInputChange('dataIngressoSP', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ingresso no Cargo Atual</label>
                <input 
                  type="date" 
                  value={formData.dataIngressoCargo || ''} 
                  onChange={(e) => handleInputChange('dataIngressoCargo', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Afastamentos (Dias)</label>
                <input 
                  type="number" 
                  min={0}
                  placeholder="0"
                  value={formData.afastamentosDias === 0 ? '' : formData.afastamentosDias} 
                  onChange={(e) => handleInputChange('afastamentosDias', parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              3. Tempo de Contribuição Averbado (INSS / Outros Regimes)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Averbações RGPS (INSS) — em dias</label>
                <input 
                  type="number" 
                  min={0}
                  placeholder="0 dias"
                  value={formData.averbacoesRgpsDias === 0 ? '' : formData.averbacoesRgpsDias} 
                  onChange={(e) => handleInputChange('averbacoesRgpsDias', parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
                <span className="text-[10px] text-gray-400">Total averbado do regime geral de previdência</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Averbações Outros Regimes (SP) — em dias</label>
                <input 
                  type="number" 
                  min={0}
                  placeholder="0 dias"
                  value={formData.averbacoesSpDias === 0 ? '' : formData.averbacoesSpDias} 
                  onChange={(e) => handleInputChange('averbacoesSpDias', parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
                <span className="text-[10px] text-gray-400">Total acumulado de outros cargos estatutários</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action button bar */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
          <button 
            type="button" 
            onClick={handleSimular}
            className="flex-1 min-w-[180px] flex items-center justify-center gap-1.5 py-3 px-6 bg-[#004b8d] hover:bg-[#003a6d] text-white font-bold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play size={15} /> Simular Projeções
          </button>
          
          {results.length > 0 && (
            <button 
              type="button" 
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <Printer size={15} /> Gerar Relatório PDF
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2 p-8 bg-white border border-[#dee2e6] rounded-xl text-[#004b8d] font-bold text-sm">
          <RefreshCw className="animate-spin text-[#004b8d]" size={18} />
          <span>Processando cálculos previdenciários e iterando projeções...</span>
        </div>
      )}

      {/* Results view */}
      {results.length > 0 && !isLoading && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800 border-l-4 border-[#004b8d] pl-3 uppercase tracking-wider text-xs">
            Resultado da Prospecção Previdenciária
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {results.map((r, i) => (
              <div 
                key={i}
                className={`bg-white border hover:shadow-sm rounded-xl p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${
                  r.aplicavel
                    ? r.isVantajosa
                      ? 'border-amber-300 bg-amber-50/15 border-l-6 border-l-amber-400'
                      : 'border-emerald-200 border-l-6 border-l-emerald-600'
                    : 'border-red-200 border-l-6 border-l-red-500 bg-red-50/5 opacity-85'
                }`}
              >
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-base ${r.isVantajosa ? 'text-amber-800' : 'text-[#004b8d]'}`}>
                      {r.nome}
                    </h3>
                    {r.isVantajosa && (
                      <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full bg-amber-100 text-amber-950 text-[10px] font-bold uppercase tracking-wider shadow-xs">
                        <Star size={9} fill="currentColor" /> Recomendada (Mais Vantajosa)
                      </span>
                    )}
                  </div>

                  {r.aplicavel && r.detalhes ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-xs">
                      <div className="space-y-0.5">
                        <span className="block text-gray-400 font-bold uppercase text-[9px]">Data de Elegibilidade</span>
                        <strong className="text-gray-900 text-sm">{formatarData(r.data)}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-gray-400 font-bold uppercase text-[9px]">Cálculo de Proventos</span>
                        <strong className="text-[#004b8d] text-sm font-semibold">{r.proventos}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-gray-400 font-bold uppercase text-[9px]">Idade Prevista</span>
                        <strong className="text-gray-900 text-sm font-semibold">{r.detalhes.idade} anos</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-gray-400 font-bold uppercase text-[9px]">Pontuação Requerida</span>
                        <strong className="text-[#004b8d] text-sm font-semibold">{r.detalhes.pontos.toFixed(2)} pts</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-700 text-sm flex items-center gap-1.5 font-medium">
                      <XSquare size={16} /> Requisitos pendentes: {r.motivo}
                    </p>
                  )}

                  {/* Detail listing if applicable */}
                  {r.aplicavel && r.detalhes && (
                    <div className="pt-3 border-t border-dashed border-gray-100 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                      <span><strong>Temp. Contribuição:</strong> {formatarTempo(r.detalhes.contrib)}</span>
                      <span><strong>Serviço Público:</strong> {formatarTempo(r.detalhes.sp)}</span>
                      <span><strong>Tempo no Cargo:</strong> {formatarTempo(r.detalhes.cargo)}</span>
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center justify-end">
                  {r.aplicavel ? (
                    <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                      <CheckCircle size={22} />
                    </div>
                  ) : (
                    <div className="p-2 sm:p-2.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                      <XSquare size={22} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden structure for print relays */}
      {simulatedServer && (
        <div id="print-container" className="hidden">
          <div className="p-8 space-y-8 bg-white text-black text-sm">
            <div className="text-center pb-4 border-b-2 border-slate-800">
              <h1 className="text-xl font-bold uppercase">Relatório Oficial de Simulação de Aposentadoria</h1>
              <p className="text-xs text-gray-600 font-semibold uppercase mt-1">Diretoria de Gestão de Pessoas - DGEP / IPMC</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Lei Complementar nº 133/2021 | Data do relatório: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            {/* Ident credentials */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-300">
              <div>
                <strong>Servidor:</strong> {simulatedServer.nome || 'Não Declarado'}
              </div>
              <div>
                <strong>Matrícula:</strong> {simulatedServer.matricula || 'Não Declarada'}
              </div>
              <div>
                <strong>Data de Nascimento:</strong> {formatarData(parseDate(simulatedServer.dataNasc) || undefined)}
              </div>
              <div>
                <strong>Gênero:</strong> {simulatedServer.sexo}
              </div>
              <div>
                <strong>Admissão SP:</strong> {formatarData(parseDate(simulatedServer.dataIngressoSP) || undefined)}
              </div>
              <div>
                <strong>Ingresso Cargo:</strong> {formatarData(parseDate(simulatedServer.dataIngressoCargo) || undefined)}
              </div>
              <div>
                <strong>Averbações RGPS:</strong> {simulatedServer.averbacoesRgpsDias} dias
              </div>
              <div>
                <strong>Averbações Outros SP:</strong> {simulatedServer.averbacoesSpDias} dias
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-bold uppercase underline">Resoluções e Prospecções Obtidas:</h2>
              {results.map((r, i) => (
                <div key={i} className="p-4 border border-gray-400 rounded-lg space-y-2">
                  <h3 className="font-bold">{r.nome} {r.isVantajosa ? ' (Mais Vantajosa)' : ''}</h3>
                  {r.aplicavel && r.detalhes ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div><strong>Previsão de elegibilidade:</strong> {formatarData(r.data)}</div>
                      <div><strong>Método proventos:</strong> {r.proventos}</div>
                      <div><strong>Idade necessária:</strong> {r.detalhes.idade} anos</div>
                      <div><strong>Tempo Contribuição Total:</strong> {formatarTempo(r.detalhes.contrib)}</div>
                      <div><strong>Tempo Serviço Público:</strong> {formatarTempo(r.detalhes.sp)}</div>
                      <div><strong>Tempo no Cargo:</strong> {formatarTempo(r.detalhes.cargo)}</div>
                      <div className="col-span-1 sm:col-span-2 md:col-span-3"><strong>Razão dos Pontos Calculados:</strong> {r.detalhes.pontos.toFixed(2)} pontos</div>
                    </div>
                  ) : (
                    <p className="text-red-800 font-semibold text-xs">Pendente cálculo: {r.motivo}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-8 text-center text-[10px] text-gray-400 border-t border-gray-200">
              Calculadora unificada da DGEP — Câmara Municipal de Curitiba. As simulações dependem da integridade das datas prestadas.
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-[#dee2e6] max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="text-lg font-bold text-red-700">Limpar Informações?</h3>
            <p className="text-gray-500 text-sm">
              Todas os dados preenchidos no formulário e as projeções calculadas atualmente serão zerados permanentemente.
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowClearModal(false)}
                className="flex-1 py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleConfirmClear}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg cursor-pointer transition-all"
              >
                Confirmar Limpeza
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
