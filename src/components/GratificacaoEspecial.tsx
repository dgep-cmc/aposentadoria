import { useState, useEffect } from 'react';
import { 
  Award, 
  Trash2, 
  Printer, 
  Percent, 
  Calculator, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { stimulusPercentages, careerDisplayNames, romanNumerals } from '../data/careers';
import { getSavedFGValues, getSavedCareerData } from '../utils/settingsStore';

interface FGRow {
  level: 'FG4' | 'FG5' | 'FG6' | 'FG7' | 'FG8';
  valueRef: number;
  meses: number;
}

interface StimulusRow {
  key: 'graduacao' | 'pos_graduacao' | 'mestrado' | 'doutorado';
  label: string;
  percentage: number;
  meses: number;
}

export default function GratificacaoEspecial() {
  const cacheKey = 'dgep_grat_especial_data';

  // Get current active FGs
  const activeFGs = getSavedFGValues();

  // State
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [divisor, setDivisor] = useState<number>(240); // default standard
  const [selectedCareer, setSelectedCareer] = useState<string>('assistente_administrativo');
  const [selectedLevel, setSelectedLevel] = useState<string>('I');
  const [salarioBaseStr, setSalarioBaseStr] = useState('0,00');

  const [fgRows, setFgRows] = useState<FGRow[]>(() => [
    { level: 'FG4', valueRef: activeFGs.FG4, meses: 0 },
    { level: 'FG5', valueRef: activeFGs.FG5, meses: 0 },
    { level: 'FG6', valueRef: activeFGs.FG6, meses: 0 },
    { level: 'FG7', valueRef: activeFGs.FG7, meses: 0 },
    { level: 'FG8', valueRef: activeFGs.FG8, meses: 0 }
  ]);

  const [stimulusRows, setStimulusRows] = useState<StimulusRow[]>([
    { key: 'graduacao', label: 'Graduação (30%)', percentage: stimulusPercentages.graduacao, meses: 0 },
    { key: 'pos_graduacao', label: 'Pós-Graduação (10%)', percentage: stimulusPercentages.pos_graduacao, meses: 0 },
    { key: 'mestrado', label: 'Mestrado (15%)', percentage: stimulusPercentages.mestrado, meses: 0 },
    { key: 'doutorado', label: 'Doutorado (20%)', percentage: stimulusPercentages.doutorado, meses: 0 }
  ]);

  const [showClearModal, setShowClearModal] = useState(false);

  // Load cache
  useEffect(() => {
    const saved = localStorage.getItem(cacheKey);
    const databaseFGs = getSavedFGValues();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNome(parsed.nome || '');
        setMatricula(parsed.matricula || '');
        setDivisor(parsed.divisor || 240);
        setSelectedCareer(parsed.selectedCareer || 'assistente_administrativo');
        setSelectedLevel(parsed.selectedLevel || 'I');
        setSalarioBaseStr(parsed.salarioBaseStr || '0,00');
        
        if (parsed.fgRows) {
          // Sync saved rows with latest database/edited FG values
          const synchronizedRows = parsed.fgRows.map((row: FGRow) => ({
            ...row,
            valueRef: databaseFGs[row.level] ?? row.valueRef
          }));
          setFgRows(synchronizedRows);
        }
        if (parsed.stimulusRows) setStimulusRows(parsed.stimulusRows);
      } catch (e) { /* ignore */ }
    }
  }, []);

  // Recalculate and update base salary when career or level selections change
  useEffect(() => {
    const careers = getSavedCareerData();
    const careerObj = careers[selectedCareer];
    if (careerObj) {
      const value = careerObj[selectedLevel] || 0;
      setSalarioBaseStr(value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }, [selectedCareer, selectedLevel]);

  // Save cache
  const saveState = () => {
    const obj = {
      nome,
      matricula,
      divisor,
      selectedCareer,
      selectedLevel,
      salarioBaseStr,
      fgRows,
      stimulusRows
    };
    localStorage.setItem(cacheKey, JSON.stringify(obj));
  };

  useEffect(() => {
    saveState();
  }, [nome, matricula, divisor, selectedCareer, selectedLevel, salarioBaseStr, fgRows, stimulusRows]);

  // Parsing utilities
  const parseCurrency = (str: string): number => {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const formatCurrency = (val: number): string => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyChange = (valStr: string) => {
    let cleaned = valStr.replace(/\D/g, '');
    const numeric = parseInt(cleaned, 10) || 0;
    const formatted = (numeric / 100).toFixed(2).replace('.', ',');
    const withDots = formatted.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    setSalarioBaseStr(withDots);
  };

  const currentSalarioBase = parseCurrency(salarioBaseStr);

  // Calculations
  const calculatedFGs = fgRows.map(row => {
    const activeDivisor = divisor > 0 ? divisor : 1;
    const inc = (row.valueRef * row.meses) / activeDivisor;
    return { ...row, inc };
  });

  const calculatedStimulus = stimulusRows.map(row => {
    const activeDivisor = divisor > 0 ? divisor : 1;
    const valueCalc = currentSalarioBase * row.percentage;
    const inc = (valueCalc * row.meses) / activeDivisor;
    return { ...row, valueCalc, inc };
  });

  const totalFGs = calculatedFGs.reduce((sum, r) => sum + r.inc, 0);
  const totalStimulus = calculatedStimulus.reduce((sum, r) => sum + r.inc, 0);
  const totalGratification = totalFGs + totalStimulus;

  const handleUpdateFgMeses = (index: number, meses: number) => {
    const updated = [...fgRows];
    updated[index].meses = Math.max(0, meses);
    setFgRows(updated);
  };

  const handleUpdateStimulusMeses = (index: number, meses: number) => {
    const updated = [...stimulusRows];
    updated[index].meses = Math.max(0, meses);
    setStimulusRows(updated);
  };

  const handleClearAll = () => {
    const freshFGs = getSavedFGValues();
    setNome('');
    setMatricula('');
    setDivisor(240);
    setSelectedCareer('assistente_administrativo');
    setSelectedLevel('I');
    setSalarioBaseStr('0,00');
    setFgRows([
      { level: 'FG4', valueRef: freshFGs.FG4, meses: 0 },
      { level: 'FG5', valueRef: freshFGs.FG5, meses: 0 },
      { level: 'FG6', valueRef: freshFGs.FG6, meses: 0 },
      { level: 'FG7', valueRef: freshFGs.FG7, meses: 0 },
      { level: 'FG8', valueRef: freshFGs.FG8, meses: 0 }
    ]);
    setStimulusRows([
      { key: 'graduacao', label: 'Graduação (30%)', percentage: stimulusPercentages.graduacao, meses: 0 },
      { key: 'pos_graduacao', label: 'Pós-Graduação (10%)', percentage: stimulusPercentages.pos_graduacao, meses: 0 },
      { key: 'mestrado', label: 'Mestrado (15%)', percentage: stimulusPercentages.mestrado, meses: 0 },
      { key: 'doutorado', label: 'Doutorado (20%)', percentage: stimulusPercentages.doutorado, meses: 0 }
    ]);
    localStorage.removeItem(cacheKey);
    setShowClearModal(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Parameters Header Card */}
      <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Cálculo de Gratificação Especial
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Simulador de Incorporação Proporcional para Regime Próprio de Previdência (RPPS - CMC)
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

        {/* Global Metadata inputs */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
            1. Dados do Servidor e Parâmetros de Incorporação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#f8f9fa] p-5 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome Completo</label>
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Servidor requerente"
                className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Matrícula</label>
              <input 
                type="text" 
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Matrícula"
                className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#004b8d] uppercase tracking-wider font-semibold">Divisor Regulamentar (Meses)</label>
              <input 
                type="number" 
                min={1}
                max={480}
                value={divisor}
                onChange={(e) => setDivisor(Math.min(480, Math.max(1, parseInt(e.target.value) || 240)))}
                className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] font-bold focus:outline-none focus:ring-2 focus:ring-[#004b8d]/20 focus:border-[#004b8d] transition-all"
              />
              <span className="text-[9px] text-gray-400">Total máximo permitido: 480 meses</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-[#fcfdfe] p-5 rounded-xl border border-gray-200 shadow-2xs">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Cargo Efetivo</label>
              <select
                value={selectedCareer}
                onChange={(e) => setSelectedCareer(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] font-medium focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all cursor-pointer"
              >
                {Object.entries(careerDisplayNames).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nível / Faixa</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] font-semibold focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all cursor-pointer"
              >
                {romanNumerals.map((level) => (
                  <option key={level} value={level}>
                    Nível {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#004b8d] uppercase tracking-wider font-semibold">Salário Base</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-semibold select-none">R$</span>
                <input 
                  type="text" 
                  value={salarioBaseStr}
                  readOnly
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-[#dee2e6] rounded-lg text-sm font-extrabold text-[#212529]/80 focus:outline-none select-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Table 1: Funções Gratificadas (FGs) */}
        <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-5 sm:p-6 space-y-4 lg:col-span-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-800 text-xs font-bold leading-none">
                2
              </span>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Funções Gratificadas (FGs)
              </h3>
            </div>
            
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-[#212529]">
                <thead className="bg-[#f8f9fa] border-b border-gray-200 text-gray-500 font-semibold select-none">
                  <tr>
                    <th className="p-2.5">Nível</th>
                    <th className="p-2.5 text-right">Referência</th>
                    <th className="p-2.5 text-center w-24">Meses</th>
                    <th className="p-2.5 text-right font-bold text-[#004b8d]">Incorporado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {calculatedFGs.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-bold font-mono text-gray-700">{row.level}</td>
                      <td className="p-2.5 text-right font-mono text-gray-505">R$ {formatCurrency(row.valueRef)}</td>
                      <td className="p-2.5">
                        <input 
                          type="number" 
                          min={0}
                          value={row.meses === 0 ? '' : row.meses}
                          onChange={(e) => handleUpdateFgMeses(idx, parseInt(e.target.value) || 0)}
                          placeholder="M"
                          className="w-full p-1 text-center font-bold border border-[#dee2e6] bg-white rounded-md focus:border-[#004b8d] focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-700 font-mono">
                        R$ {formatCurrency(row.inc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-dashed border-gray-100 flex justify-between items-center text-xs select-none">
            <span className="text-gray-400 font-medium">Subtotal FGs</span>
            <strong className="text-sm text-gray-800 font-bold font-mono">R$ {formatCurrency(totalFGs)}</strong>
          </div>
        </div>

        {/* Table 2: Estímulos Acadêmicos */}
        <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-5 sm:p-6 space-y-4 lg:col-span-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[#004b8d] text-xs font-bold leading-none">
                3
              </span>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                Estímulos Acadêmicos
              </h3>
            </div>

            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-[#212529]">
                <thead className="bg-[#f8f9fa] border-b border-gray-200 text-gray-500 font-semibold select-none">
                  <tr>
                    <th className="p-2.5">Estímulo (%)</th>
                    <th className="p-2.5 text-right">Valor Calc.</th>
                    <th className="p-2.5 text-center w-24">Meses</th>
                    <th className="p-2.5 text-right font-bold text-[#004b8d]">Incorporado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {calculatedStimulus.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-semibold text-gray-600 flex items-center gap-1">
                        <GraduationCap size={13} className="text-[#004b8d]" />
                        {row.label}
                      </td>
                      <td className="p-2.5 text-right font-mono text-gray-500">
                        R$ {formatCurrency(row.valueCalc)}
                      </td>
                      <td className="p-2.5">
                        <input 
                          type="number" 
                          min={0}
                          value={row.meses === 0 ? '' : row.meses}
                          onChange={(e) => handleUpdateStimulusMeses(idx, parseInt(e.target.value) || 0)}
                          placeholder="M"
                          className="w-full p-1 text-center font-bold border border-[#dee2e6] bg-white rounded-md focus:border-[#004b8d] focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-700 font-mono">
                        R$ {formatCurrency(row.inc)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-dashed border-gray-100 flex justify-between items-center text-xs select-none">
            <span className="text-gray-400 font-medium">Subtotal Acadêmicos</span>
            <strong className="text-sm text-gray-800 font-bold font-mono">R$ {formatCurrency(totalStimulus)}</strong>
          </div>
        </div>

      </div>

      {/* Consolidated Output Panel */}
      <div className="bg-gray-900 border border-gray-800 text-white rounded-xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none translate-x-4 -translate-y-4">
          <Calculator size={180} />
        </div>
        
        <div className="space-y-1.5 flex-1 text-center md:text-left">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center justify-center md:justify-start gap-1.5">
            <Award size={18} className="text-green-400 shrink-0" />
            Total Geral da Gratificação Especial
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-normal max-w-lg">
            Soma mensal proporcional obtida a ser integrada ao provento básico do requerente conforme divisor declarado.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-center md:items-end justify-center self-center gap-1 bg-white/5 py-4 px-6 rounded-xl border border-white/5 shadow-inner">
          <div className="text-[10px] uppercase font-bold text-green-300 tracking-wider">Acréscimo Mensal</div>
          <strong className="text-2xl sm:text-3xl font-extrabold text-green-400 font-mono tracking-tight leading-none/9">
            R$ {formatCurrency(totalGratification)}
          </strong>
        </div>
      </div>

      {/* Button options to print/report */}
      <div className="flex gap-4 p-4 bg-white border border-[#dee2e6] rounded-xl shadow-xs justify-center sm:justify-end">
        <button 
          type="button" 
          onClick={() => window.print()}
          className="flex items-center gap-1.5 py-2.5 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-lg shadow-sm cursor-pointer transition-all active:scale-95"
        >
          <Printer size={15} /> Imprimir Relatório
        </button>
      </div>

      {/* Printable structure */}
      <div id="print-container" className="hidden">
        <div className="p-8 space-y-8 bg-white text-black text-sm">
          <div className="text-center pb-4 border-b-2 border-slate-800">
            <h1 className="text-xl font-bold uppercase">Relatório de Gratificação Especial</h1>
            <p className="text-xs text-gray-600 font-semibold uppercase mt-1">Diretoria de Gestão de Pessoas - DGEP / CMC</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Simulador de Incorporação Proporcional | Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-300">
            <div><strong>Servidor:</strong> {nome || 'Não Informado'}</div>
            <div><strong>Matrícula:</strong> {matricula || 'Não Informada'}</div>
            <div><strong>Divisor de Meses:</strong> {divisor} meses</div>
            <div><strong>Salário Base Ref:</strong> R$ {formatCurrency(currentSalarioBase)}</div>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold uppercase underline">Resumo Funções Gratificadas (FGs):</h3>
            <table className="w-full text-xs text-left border border-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border border-gray-300">Função</th>
                  <th className="p-2 border border-gray-300 text-right">Referência</th>
                  <th className="p-2 border border-gray-300 text-center">Meses</th>
                  <th className="p-2 border border-gray-300 text-right">Incorporado</th>
                </tr>
              </thead>
              <tbody>
                {calculatedFGs.filter(r => r.meses > 0).map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border border-gray-300 font-mono font-bold">{row.level}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">R$ {formatCurrency(row.valueRef)}</td>
                    <td className="p-2 border border-gray-300 text-center font-mono">{row.meses}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono font-bold">R$ {formatCurrency(row.inc)}</td>
                  </tr>
                ))}
                {calculatedFGs.filter(r => r.meses > 0).length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-2 text-center text-gray-400">Nenhum período de FG computado.</td>
                  </tr>
                )}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="p-2 border border-gray-300 text-right uppercase">Soma de Funções</td>
                  <td className="p-2 border border-gray-300 text-right font-mono text-emerald-800">R$ {formatCurrency(totalFGs)}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="font-bold uppercase underline">Resumo Estímulos Acadêmicos:</h3>
            <table className="w-full text-xs text-left border border-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border border-gray-300">Nível Incentivado</th>
                  <th className="p-2 border border-gray-300 text-right">Vlr. Calculado</th>
                  <th className="p-2 border border-gray-300 text-center">Meses</th>
                  <th className="p-2 border border-gray-300 text-right">Incorporado</th>
                </tr>
              </thead>
              <tbody>
                {calculatedStimulus.filter(r => r.meses > 0).map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border border-gray-300">{row.label}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">R$ {formatCurrency(row.valueCalc)}</td>
                    <td className="p-2 border border-gray-300 text-center font-mono">{row.meses}</td>
                    <td className="p-2 border border-gray-300 text-right font-mono font-bold">R$ {formatCurrency(row.inc)}</td>
                  </tr>
                ))}
                {calculatedStimulus.filter(r => r.meses > 0).length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-2 text-center text-gray-400">Nenhum estímulo acadêmico computado.</td>
                  </tr>
                )}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={3} className="p-2 border border-gray-300 text-right uppercase">Soma de Estímulos</td>
                  <td className="p-2 border border-gray-300 text-right font-mono text-emerald-800">R$ {formatCurrency(totalStimulus)}</td>
                </tr>
              </tbody>
            </table>

            <div className="p-4 border-2 border-slate-700 rounded-lg text-center space-y-1 bg-gray-50">
              <strong className="block text-sm">TOTAL INCORPORAÇÃO GRATIFICAÇÃO ESPECIAL:</strong>
              <span className="text-lg font-bold text-slate-900 font-mono">R$ {formatCurrency(totalGratification)} / mensais</span>
            </div>
          </div>

          <div className="pt-8 text-center text-[10px] text-gray-400 border-t border-gray-200">
            Câmara Municipal de Curitiba — Setor de Controle de Provimentos e Vantagens.
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-[#dee2e6] max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="text-lg font-bold text-red-700">Limpar Parâmetros?</h3>
            <p className="text-gray-500 text-sm">
              Esta ação desfaz todos os meses acumulados nas tabelas e limpa os dados do servidor.
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
                onClick={handleClearAll}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg cursor-pointer transition-all"
              >
                Sim, Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
