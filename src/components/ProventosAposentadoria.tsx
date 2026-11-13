import { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Play, 
  Printer, 
  Download, 
  AlertCircle,
  HelpCircle,
  Plus,
  Trash,
  CheckCircle,
  TrendingUp,
  Award,
  BookOpen,
  History,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  careerDisplayNames, 
  romanNumerals, 
  stimulusPercentages, 
  ATS_PERCENTAGES 
} from '../data/careers';
import { getSavedCareerData, getSavedFGValues, getSavedFatoresINSS, getSavedSalaryCaps } from '../utils/settingsStore';
import { 
  ProventosFormData,
  IncorporationRow,
  StimulusRow,
  FunctionRow
} from '../types';

export default function ProventosAposentadoria() {
  const cacheKey = 'retirementFormData';

  // State Management
  const [formData, setFormData] = useState<ProventosFormData>(() => {
    const saved = localStorage.getItem(cacheKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          serverName: parsed.serverName || '',
          serverId: parsed.serverId || '',
          birthDate: parsed.birthDate || '',
          admissionDate: parsed.admissionDate || '',
          gender: parsed.gender || 'masculino',
          career: parsed.career || 'assistente_administrativo',
          careerLevel: parsed.careerLevel || 'medio',
          currentCareerBandIndex: parsed.currentCareerBandIndex || '',
          lastAtsConcession: parsed.lastAtsConcession || '',
          lastAtsNumber: parsed.lastAtsNumber || 0,
          historicalData: parsed.historicalData || '',
          needsUpdate: parsed.needsUpdate !== undefined ? parsed.needsUpdate : true,
          needsUpdateHistorical: parsed.needsUpdateHistorical !== undefined ? parsed.needsUpdateHistorical : true,
          incorporations: parsed.incorporations || [],
          stimuli: parsed.stimuli || [],
          functions: parsed.functions || [],
          extensionMode: parsed.extensionMode || 'normal',
          extraYears: parsed.extraYears || 0
        };
      } catch (e) { /* ignore */ }
    }
    return {
      serverName: '',
      serverId: '',
      birthDate: '',
      admissionDate: '',
      gender: 'masculino',
      career: 'assistente_administrativo',
      careerLevel: 'medio',
      currentCareerBandIndex: '',
      lastAtsConcession: '',
      lastAtsNumber: 0,
      historicalData: '',
      needsUpdate: true,
      needsUpdateHistorical: true,
      incorporations: [],
      stimuli: [],
      functions: [],
      extensionMode: 'normal',
      extraYears: 0
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Results structures
  const [resultsComputed, setResultsComputed] = useState(false);
  const [calcLog, setCalcLog] = useState('');
  const [detailedExcelRows, setDetailedExcelRows] = useState<any[]>([]);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [summaryData, setSummaryData] = useState({
    currGross: 'R$ 0,00',
    currBand: 'I',
    currAts: '0%',
    retirementDate: 'N/A',
    retirementAge: 0,
    totalContribTime: '0 anos, 0 meses e 0 dias',
    benefitPerc: '0.00%',
    retirementBenefit: 'R$ 0,00'
  });

  // Save changes to cache
  useEffect(() => {
    localStorage.setItem(cacheKey, JSON.stringify(formData));
  }, [formData]);

  const handleFieldChange = (field: keyof ProventosFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // List Management
  const handleAddIncorporation = () => {
    const newRow: IncorporationRow = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      type: 'contribution-only',
      years: 0,
      months: 0,
      days: 0,
      value: '0,00',
      needsUpdate: true
    };
    handleFieldChange('incorporations', [...formData.incorporations, newRow]);
  };

  const handleUpdateIncorporation = (id: string, field: keyof IncorporationRow, value: any) => {
    const updated = formData.incorporations.map(row => {
      if (row.id !== id) return row;
      let newRow = { ...row, [field]: value };
      
      // If pre-1994, force value to '0,00'
      if (field === 'type' && value === 'pre-1994') {
        newRow.value = '0,00';
      }
      
      // Mutual exclusion between (years/months) vs (days)
      if (field === 'days' && Number(value) > 0) {
        newRow.years = 0;
        newRow.months = 0;
      } else if ((field === 'years' && Number(value) > 0) || (field === 'months' && Number(value) > 0)) {
        newRow.days = 0;
      }
      
      return newRow;
    });
    handleFieldChange('incorporations', updated);
  };

  const handleRemoveIncorporation = (id: string) => {
    handleFieldChange('incorporations', formData.incorporations.filter(row => row.id !== id));
  };

  const handleAddStimulus = () => {
    const newRow: StimulusRow = {
      id: Date.now().toString(),
      type: 'graduacao',
      date: ''
    };
    handleFieldChange('stimuli', [...formData.stimuli, newRow]);
  };

  const handleUpdateStimulus = (id: string, field: keyof StimulusRow, value: any) => {
    handleFieldChange('stimuli', formData.stimuli.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleRemoveStimulus = (id: string) => {
    handleFieldChange('stimuli', formData.stimuli.filter(row => row.id !== id));
  };

  const handleAddFunction = () => {
    const newRow: FunctionRow = {
      id: Date.now().toString(),
      start: '',
      end: '',
      level: 'FG4'
    };
    handleFieldChange('functions', [...formData.functions, newRow]);
  };

  const handleUpdateFunction = (id: string, field: keyof FunctionRow, value: any) => {
    handleFieldChange('functions', formData.functions.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleRemoveFunction = (id: string) => {
    handleFieldChange('functions', formData.functions.filter(row => row.id !== id));
  };

  // Arithmetic auxiliary utilities
  const parseCurrency = (str: string): number => {
    const cleaned = str.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleaned) || 0;
  };

  const formatCurrency = (val: number): string => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyInput = (id: string, val: string) => {
    let cleaned = val.replace(/\D/g, '');
    const numeric = parseInt(cleaned, 10) || 0;
    const formatted = (numeric / 100).toFixed(2).replace('.', ',');
    const withDots = formatted.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    return withDots;
  };

  const mesesMap: { [key: string]: string } = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
    'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
  };

  const normalizarData = (mesStr: string, anoStr: string): string => {
    let mes = mesStr.toLowerCase().trim();
    if (mesesMap[mes]) mes = mesesMap[mes];
    else mes = mes.padStart(2, '0');
    let ano = anoStr.trim();
    if (ano.length === 2) ano = parseInt(ano, 10) >= 70 ? `19${ano}` : `20${ano}`;
    return `${mes}/${ano}`;
  };

  const parseLinhaX = (linha: string) => {
    const limpa = linha.trim();
    if (!limpa) return null;

    // 1. Identify value (last numeric string, optionally with R$)
    const parts = limpa.split(/\s+/);
    let valor = NaN;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i].replace(/R\$/gi, '').trim();
      const cleanedPart = p.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleanedPart);
      if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(cleanedPart)) {
        valor = num;
        break;
      }
    }

    if (isNaN(valor)) {
      return null;
    }

    // 2. Identify competence / date pattern anywhere in the line
    let competencia = "MM/AAAA";
    const dateComDiaRegex = /\b(\d{1,2})[\/\-](\d{1,2}|[a-zA-Z]{3,9})[\/\-](\d{2}|\d{4})\b/;
    const dateSemDiaRegex = /\b(\d{1,2}|[a-zA-Z]{3,9})[\/\-](\d{2}|\d{4})\b/;
    const dateYearMonthRegex = /\b(\d{4})[\/\-](\d{1,2})\b/;

    let mComDia = limpa.match(dateComDiaRegex);
    let mSemDia = limpa.match(dateSemDiaRegex);
    let mYearMonth = limpa.match(dateYearMonthRegex);

    if (mComDia) {
      competencia = normalizarData(mComDia[2], mComDia[3]);
    } else if (mSemDia) {
      competencia = normalizarData(mSemDia[1], mSemDia[2]);
    } else if (mYearMonth) {
      competencia = normalizarData(mYearMonth[2], mYearMonth[1]);
    }

    return { competencia, valor };
  };

  const inlineTrim = (s: string) => s.trim();

  // Common time fully-written formatter
  const formatarTempoCompleto = (totalDias: number): string => {
    const y = Math.floor(totalDias / 365);
    const rem = totalDias % 365;
    const m = Math.floor(rem / 30);
    const d = rem % 30;
    const yStr = y === 1 ? '1 ano' : `${y} anos`;
    const mStr = m === 1 ? '1 mês' : `${m} meses`;
    const dStr = d === 1 ? '1 dia' : `${d} dias`;
    return `${yStr}, ${mStr} e ${dStr} (${totalDias.toLocaleString('pt-BR')} dias)`;
  };

  // Date operations
  function addYears(date: Date, years: number): Date {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  function getYearsOfService(current: Date, admission: Date): number {
    let years = current.getFullYear() - admission.getFullYear();
    let months = current.getMonth() - admission.getMonth();
    if (current.getDate() - admission.getDate() < 0) months--;
    if (months < 0) years--;
    return years;
  }

  function getCareerBandIndex(currentDate: Date, admissionDate: Date): number {
    const cutoffDate = new Date(admissionDate.getFullYear() + 1, 8, 30);
    let initialBand = (admissionDate <= cutoffDate) ? 1 : 0;
    let progressionYears = currentDate.getFullYear() - (admissionDate.getFullYear() + 2);
    if (currentDate.getMonth() < 9) progressionYears--;
    return Math.max(0, Math.min(progressionYears + initialBand, 35));
  }

  function isPre07_1994(comp: string): boolean {
    const pts = comp.split('/');
    if (pts.length === 2) {
      const m = parseInt(pts[0], 10);
      const y = parseInt(pts[1], 10);
      if (!isNaN(m) && !isNaN(y)) {
        return y < 1994 || (y === 1994 && m < 7);
      }
    }
    return false;
  }

  function getCompIndex(comp: string): number {
    const pts = comp.split('/');
    if (pts.length === 2) {
      const m = parseInt(pts[0], 10);
      const y = parseInt(pts[1], 10);
      if (!isNaN(m) && !isNaN(y)) {
        return y * 12 + m;
      }
    }
    return 0;
  }

  function parseHistoricalData(dataString: string) {
    const lines = dataString.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
      const parsed = parseLinhaX(line);
      if (!parsed || isNaN(parsed.valor)) return null;
      const [mStr, yStr] = parsed.competencia.split('/');
      const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
      return { competencia: parsed.competencia, date, value: parsed.valor };
    }).filter((d): d is { competencia: string, date: Date, value: number } => d !== null).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Core Simulation Function
  const handleCalcularSimulacao = () => {
    setValidationError('');
    setResultsComputed(false);

    if (!formData.birthDate || !formData.admissionDate) {
      setValidationError("As datas de Nascimento e Admissão são obrigatórias.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const admissionDate = new Date(formData.admissionDate + 'T00:00:00');
        const birthDate = new Date(formData.birthDate + 'T00:00:00');
        const careerKey = formData.career;
        const careerLevel = formData.careerLevel;
        const manualBand = parseInt(formData.currentCareerBandIndex) || null;
        const lastAtsNumber = Number(formData.lastAtsNumber) || 0;
        const lastAtsDateStr = formData.lastAtsConcession;

        // Cumulative totals from Dynamic Incorporations
        let totalIncMonthsForAverage = 0;
        let totalIncMonthsForService = 0;
        let totalIncValue = 0;
        let effAdjustment = 0;
        const incorporationEntries: any[] = [];

        // Load factors for INSS
        const { fatoresText } = getSavedFatoresINSS();
        const fatores = new Map<string, number>();
        for (const line of fatoresText.split('\n')) {
          const parsed = parseLinhaX(line);
          if (parsed && !isNaN(parsed.valor)) fatores.set(parsed.competencia, parsed.valor);
        }

        const candidateMonths: {
          competencia: string;
          originalValue: number;
          value: number;
          type: string;
          rowId: string;
          rowIdx: number;
        }[] = [];

        formData.incorporations.forEach((row, rIdx) => {
          const type = row.type;
          const y = Number(row.years) || 0;
          const m = Number(row.months) || 0;
          const d = Number(row.days) || 0;

          const calcM = (y * 12) + m + Math.floor(d / 30);
          totalIncMonthsForService += calcM;

          let incSum = 0;
          if (type !== 'pre-1994') {
            totalIncMonthsForAverage += calcM;
            
            const lineStr = typeof row.value === 'string' ? row.value : '';
            const incLines = lineStr.split('\n').filter(l => l.trim().length > 0);
            
            incLines.forEach(l => {
              const parsed = parseLinhaX(l);
              if (parsed && !isNaN(parsed.valor)) {
                let correctedVal = parsed.valor;
                if (row.needsUpdate !== false) {
                  const f = fatores.get(parsed.competencia);
                  if (f !== undefined) {
                    correctedVal = (parsed.valor * f);
                  }
                }
                incSum += correctedVal;

                candidateMonths.push({
                  competencia: parsed.competencia,
                  originalValue: parsed.valor,
                  value: correctedVal,
                  type: type as 'contribution-only' | 'all-effects',
                  rowId: row.id,
                  rowIdx: rIdx + 1
                });
              } else {
                const parts = l.trim().split(/\s+/);
                const valStr = parts.length > 1 ? parts[parts.length - 1] : parts[0];
                const rawVal = (parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0);
                incSum += rawVal;

                candidateMonths.push({
                  competencia: "MM/AAAA",
                  originalValue: rawVal,
                  value: rawVal,
                  type: type as 'contribution-only' | 'all-effects',
                  rowId: row.id,
                  rowIdx: rIdx + 1
                });
              }
            });
            totalIncValue += incSum;
          }

          if (type === 'all-effects') {
            effAdjustment += calcM;
          }

          incorporationEntries.push({
            years: y,
            months: m,
            days: d,
            value: incSum,
            type: type,
            calculatedMonths: calcM,
            rawValue: row.value
          });
        });

        const effAdmission = new Date(admissionDate);
        effAdmission.setMonth(effAdmission.getMonth() - effAdjustment);

        const normalRetirementAge = formData.gender === 'masculino' ? 65 : 62;
        const normalRetirementDate = new Date(birthDate);
        normalRetirementDate.setFullYear(birthDate.getFullYear() + normalRetirementAge);

        const compulsoriaDate = new Date(birthDate);
        compulsoriaDate.setFullYear(birthDate.getFullYear() + 75);

        let targetEndDate = normalRetirementDate;
        if (formData.extensionMode === 'compulsoria') targetEndDate = compulsoriaDate;
        else if (formData.extensionMode === 'custom') targetEndDate = addYears(normalRetirementDate, formData.extraYears || 0);

        const academicStimuli = formData.stimuli.filter(s => s.date).map(s => ({
          type: s.type,
          date: new Date(s.date + 'T00:00:00')
        }));

        const gratifiedFunctions = formData.functions.filter(f => f.start).map(f => ({
          start: new Date(f.start + 'T00:00:00'),
          end: f.end ? new Date(f.end + 'T00:00:00') : null,
          level: f.level
        }));

        let currentAtsNum = lastAtsNumber;
        let atsDate = lastAtsDateStr ? new Date(lastAtsDateStr + 'T00:00:00') : effAdmission;
        let nextAtsDate = addYears(atsDate, 5);

        const allContribs: number[] = [];
        const excelRows: any[] = [];
        const historicalContributions = parseHistoricalData(formData.historicalData);
        let projectionStart = new Date(admissionDate);

        const post94_Hist = historicalContributions.filter(h => !isPre07_1994(h.competencia));
        const pre94_Hist = historicalContributions.filter(h => isPre07_1994(h.competencia));

        if (historicalContributions.length > 0) {
          const lastH = historicalContributions[historicalContributions.length - 1];
          projectionStart = new Date(lastH.date.getFullYear(), lastH.date.getMonth() + 1, 1);
        }

        if (post94_Hist.length > 0) {
          post94_Hist.forEach((h, hIdx) => {
            let valToUse = h.value;
            if (formData.needsUpdateHistorical) {
              const f = fatores.get(h.competencia);
              if (f !== undefined) {
                valToUse = h.value * f;
              }
            }
            allContribs.push(valToUse);
            candidateMonths.push({
              competencia: h.competencia,
              originalValue: h.value,
              value: valToUse,
              type: 'chamber-historical',
              rowId: 'chamber-hist',
              rowIdx: hIdx + 1
            });
            excelRows.push({
              "Mês/Ano": h.competencia,
              "Faixa": "HISTÓRICO",
              "Salário Base": valToUse,
              "Resp. Técnica": 0,
              "Grat. Adicional / FG": 0,
              "ATS": 0,
              "Est. Graduação": 0,
              "Est. Pós/Mest./Dout.": 0,
              "Redutor": 0,
              "Salário de Contribuição": valToUse
            });
          });
        }

        let monthlyProjectionLog = "\n--- Projeção Futura Detalhada ---\n";
        const curr = new Date(projectionStart.getFullYear(), projectionStart.getMonth(), 1);
        let progIdx = manualBand ? manualBand - 1 : null;
        const today = new Date();
        let atsAtToday = lastAtsNumber;
        const currentCareers = getSavedCareerData();
        const selectedCareerTable = currentCareers[careerKey];

        const currentFGs = getSavedFGValues();

        let currentExtendedMonths = 0;
        let keepRunning = true;

        while (keepRunning) {
          let bandIdx = (progIdx === null) ? getCareerBandIndex(curr, admissionDate) : progIdx;
          if (progIdx !== null && curr.getMonth() === 9 && bandIdx < 35) {
            bandIdx++;
            progIdx = bandIdx;
          }

          const base = selectedCareerTable[romanNumerals[bandIdx]];
          if (curr.getFullYear() === nextAtsDate.getFullYear() && curr.getMonth() === nextAtsDate.getMonth() && currentAtsNum < 10) {
            currentAtsNum++;
            nextAtsDate = addYears(curr, 5);
          }
          if (curr <= today) atsAtToday = currentAtsNum;

          const atsVal = base * ATS_PERCENTAGES[currentAtsNum];
          const techVal = base * 0.30;

          let gradPerc = 0, outrosPerc = 0;
          academicStimuli.forEach(s => {
            if (curr >= s.date) {
              const anosSrv = getYearsOfService(curr, effAdmission);
              if (s.type === 'graduacao' && careerLevel === 'medio' && anosSrv >= 5) gradPerc = 0.30;
              else if (s.type !== 'graduacao') {
                if (careerLevel === 'superior' && anosSrv >= 3) outrosPerc = Math.max(outrosPerc, stimulusPercentages[s.type]);
                else if (careerLevel === 'medio' && anosSrv >= 8) outrosPerc = Math.max(outrosPerc, stimulusPercentages[s.type]);
              }
            }
          });
          const stimVal = base * (gradPerc + outrosPerc);

          let funcVal = 0;
          gratifiedFunctions.forEach(f => {
            const afterStart = curr >= f.start;
            const beforeEnd = !f.end || curr <= f.end;
            if (afterStart && beforeEnd) {
              const val = currentFGs[f.level as keyof typeof currentFGs] || 0;
              if (val > funcVal) {
                funcVal = val;
              }
            }
          });
          const carrGrat = (careerKey === 'procurador_juridico') ? base * 0.60 : (careerKey === 'contador' ? base * 0.75 : 0);
          const chosenGrat = Math.max(funcVal, carrGrat);

          const proventos = base + techVal + atsVal + stimVal + chosenGrat;
          const caps = getSavedSalaryCaps();
          const cap = (careerKey === 'procurador_juridico' ? caps.procurador : caps.general);
          const contrib = Math.min(proventos, cap);
          const redutor = proventos > cap ? proventos - cap : 0;
          allContribs.push(contrib);

          const mDisplay = (curr.getMonth() + 1).toString().padStart(2, '0') + '/' + curr.getFullYear();
          candidateMonths.push({
            competencia: mDisplay,
            originalValue: contrib,
            value: contrib,
            type: 'chamber-projected',
            rowId: 'chamber-proj',
            rowIdx: allContribs.length
          });
          monthlyProjectionLog += `\n--- ${mDisplay} (Faixa ${romanNumerals[bandIdx]}) ---\n`;
          monthlyProjectionLog += `Salário Base:`.padEnd(32) + `R$ ${base.toFixed(2).padStart(10)}\n`;
          monthlyProjectionLog += `+ Resp. Técnica (30%):`.padEnd(32) + `R$ ${techVal.toFixed(2).padStart(10)}\n`;
          monthlyProjectionLog += `+ Adic. T. Serviço (${(ATS_PERCENTAGES[currentAtsNum] * 100).toFixed(0)}%):`.padEnd(32) + `R$ ${atsVal.toFixed(2).padStart(10)}\n`;
          if (stimVal > 0) monthlyProjectionLog += `+ Estímulo Acadêmico:`.padEnd(32) + `R$ ${stimVal.toFixed(2).padStart(10)}\n`;
          if (chosenGrat > 0) monthlyProjectionLog += `+ Grat. Adic. / FG:`.padEnd(32) + `R$ ${chosenGrat.toFixed(2).padStart(10)}\n`;
          if (redutor > 0) monthlyProjectionLog += `- Redutor Teto:`.padEnd(32) + `R$ ${(-redutor).toFixed(2).padStart(10)}\n`;
          monthlyProjectionLog += `= Contribuição:`.padEnd(32) + `R$ ${contrib.toFixed(2).padStart(10)}\n`;

          excelRows.push({
            "Mês/Ano": mDisplay,
            "Faixa": romanNumerals[bandIdx],
            "Salário Base": base,
            "Resp. Técnica": techVal,
            "Grat. Adicional / FG": chosenGrat,
            "ATS": atsVal,
            "Est. Graduação": base * gradPerc,
            "Est. Pós/Mest./Dout.": base * outrosPerc,
            "Redutor": -redutor,
            "Salário de Contribuição": contrib
          });

          curr.setMonth(curr.getMonth() + 1);

          if (formData.extensionMode === 'cem_por_cento') {
            const tempDays = (curr.getTime() - effAdmission.getTime()) / (1000 * 60 * 60 * 24);
            const tempYearsTotal = ((tempDays / 365.25) * 365 + (totalIncMonthsForService * 30)) / 365;
            let tempPerc = 0.60 + (tempYearsTotal > 20 ? (Math.floor(tempYearsTotal) - 20) * 0.02 : 0);
            if (curr > compulsoriaDate || (curr > normalRetirementDate && tempPerc >= 1.0)) {
              keepRunning = false;
            }
          } else {
            if (curr > targetEndDate) {
              keepRunning = false;
            }
          }

          if (keepRunning && curr > normalRetirementDate) {
            currentExtendedMonths++;
            if (currentExtendedMonths % 12 === 0) {
              const tempSum = allContribs.reduce((a, b) => a + b, 0) + totalIncValue;
              const tempMonths = allContribs.length + totalIncMonthsForAverage;
              const tempAvg = tempSum / tempMonths;
              
              const tempDays = (curr.getTime() - effAdmission.getTime()) / (1000 * 60 * 60 * 24);
              const tempYearsTotal = ((tempDays / 365.25) * 365 + (totalIncMonthsForService * 30)) / 365;
              let tempPerc = 0.60 + (tempYearsTotal > 20 ? (Math.floor(tempYearsTotal) - 20) * 0.02 : 0);
              tempPerc = Math.min(tempPerc, 1.0);

              monthlyProjectionLog += `\n>> [EXTENSÃO] Resumo após ${currentExtendedMonths / 12} ano(s) da Idade Mínima:\n`;
              monthlyProjectionLog += `   Média Salarial Parcial: R$ ${formatCurrency(tempAvg)}\n`;
              monthlyProjectionLog += `   Alíquota Atingida: ${(tempPerc * 100).toFixed(2).replace('.', ',')}%\n`;
              monthlyProjectionLog += `   Benefício Parcial Est.: R$ ${formatCurrency(tempAvg * tempPerc)}\n`;
            }
          }
        }

        const actualRetirementDate = new Date(curr);
        actualRetirementDate.setMonth(actualRetirementDate.getMonth() - 1); // fallback to last computed month

        const totalSum = candidateMonths.reduce((sum, item) => sum + item.value, 0);
        const totalMonths = candidateMonths.length;
        const avg = totalSum / totalMonths;

        const serviceDays = (curr.getTime() - effAdmission.getTime()) / (1000 * 60 * 60 * 24);
        const approxDays = (serviceDays / 365.25) * 365 + (totalIncMonthsForService * 30);
        const yearsTotal = approxDays / 365;

        let perc = 0.60 + (yearsTotal > 20 ? (Math.floor(yearsTotal) - 20) * 0.02 : 0);
        perc = Math.min(perc, 1.0);
        const finalBenefit = avg * perc;

        // Assembly summary strings for Calc Log
        let incLogs = "";
        if (incorporationEntries.length > 0) {
          let cbMonths = 0, cbValue = 0, aeMonths = 0, aeValue = 0, pre94Months = 0;

          incLogs = "--- Períodos de Incorporação Adicionados ---\n";
          incorporationEntries.forEach((entry, idx) => {
            let label = "";
            if (entry.type === 'all-effects') label = 'Todos os Efeitos (Pós-1994)';
            else if (entry.type === 'contribution-only') label = 'Apenas Contribuição (Pós-1994)';
            else if (entry.type === 'pre-1994') label = 'Anterior a 07/1994 (Apenas Tempo)';

            const timeText = entry.days > 0 ? `${entry.days} dias` : `${entry.years} anos e ${entry.months} meses`;
            const valDisplay = entry.type === 'pre-1994' ? 'R$ 0,00 (Moeda desconsiderada)' : `R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            incLogs += `Período ${idx + 1} (${label}): ${timeText} (${entry.calculatedMonths} meses). Valor: ${valDisplay}\n`;

            if (entry.type === 'all-effects') {
              aeMonths += entry.calculatedMonths;
              aeValue += entry.value;
            } else if (entry.type === 'contribution-only') {
              cbMonths += entry.calculatedMonths;
              cbValue += entry.value;
            } else if (entry.type === 'pre-1994') {
              pre94Months += entry.calculatedMonths;
            }
          });

          incLogs += `\nResumo de Incorporação por Tipo:\n`;
          if (cbMonths > 0 || cbValue > 0) {
            const cbAvg = cbMonths > 0 ? cbValue / cbMonths : 0;
            incLogs += `- Apenas Contribuição (Pós-1994):\n`;
            incLogs += `  Tempo: ${cbMonths} meses | Valor: R$ ${formatCurrency(cbValue)} | Média: R$ ${formatCurrency(cbAvg)}\n`;
          }
          if (aeMonths > 0 || aeValue > 0) {
            const aeAvg = aeMonths > 0 ? aeValue / aeMonths : 0;
            incLogs += `- Para Todos os Efeitos (Pós-1994):\n`;
            incLogs += `  Tempo: ${aeMonths} meses | Valor: R$ ${formatCurrency(aeValue)} | Média: R$ ${formatCurrency(aeAvg)}\n`;
          }
          if (pre94Months > 0) {
            incLogs += `- Anterior a 07/1994 (Tempo puro desprovido de valor nominal):\n`;
            incLogs += `  Tempo: ${pre94Months} meses | Valor: R$ 0,00 | Média: R$ 0,00\n`;
          }

          const totalIncAvg = totalIncMonthsForAverage > 0 ? totalIncValue / totalIncMonthsForAverage : 0;
          incLogs += `\nSOMA TOTAL DAS INCORPORAÇÕES:\n`;
          incLogs += `- Tempo Total Incorporado (Geral): ${totalIncMonthsForService} meses (sendo ${pre94Months} meses pré-1994)\n`;
          incLogs += `- Valor Total Incorporado (p/ Média): R$ ${formatCurrency(totalIncValue)}\n`;
          incLogs += `- Média Salarial das Incorporações (Pós-1994): R$ ${formatCurrency(totalIncAvg)}\n\n`;
        }

        const totalHistMonths = historicalContributions.length;
        const totalHistValue = historicalContributions.reduce((sum, h) => sum + h.value, 0);
        const histAvg = totalHistMonths > 0 ? totalHistValue / totalHistMonths : 0;

        const totalProjMonths = allContribs.length - totalHistMonths;
        const totalProjValue = allContribs.slice(totalHistMonths).reduce((a, b) => a + b, 0);
        const projAvg = totalProjMonths > 0 ? totalProjValue / totalProjMonths : 0;

        const incAvg = totalIncMonthsForAverage > 0 ? totalIncValue / totalIncMonthsForAverage : 0;
        const pre1994MonthsTotal = totalIncMonthsForService - totalIncMonthsForAverage;

        let summaryLog = `--- RESUMO DO CÁLCULO DA MÉDIA SALARIAL ---\n\n`;
        summaryLog += `1. Período Histórico (Base de Contribuição):\n`;
        summaryLog += `   - Valor Total: R$ ${formatCurrency(totalHistValue)}\n`;
        summaryLog += `   - Qtd. de Meses: ${totalHistMonths} meses\n`;
        summaryLog += `   - Média do Período: R$ ${formatCurrency(histAvg)}\n\n`;

        summaryLog += `2. Período Projetado (CMC Futuro):\n`;
        summaryLog += `   - Valor Total: R$ ${formatCurrency(totalProjValue)}\n`;
        summaryLog += `   - Qtd. de Meses: ${totalProjMonths} meses\n`;
        summaryLog += `   - Média do Período: R$ ${formatCurrency(projAvg)}\n\n`;

        if (totalIncMonthsForAverage > 0) {
          summaryLog += `3. Período de Incorporação (Tempo Externo Pós-1994):\n`;
          summaryLog += `   - Valor Total: R$ ${formatCurrency(totalIncValue)}\n`;
          summaryLog += `   - Qtd. de Meses: ${totalIncMonthsForAverage} meses\n`;
          summaryLog += `   - Média do Período: R$ ${formatCurrency(incAvg)}\n\n`;
        }

        if (pre1994MonthsTotal > 0) {
          summaryLog += `4. Período de Incorporação Anterior a 07/1994 (Apenas Tempo):\n`;
          summaryLog += `   - Valor Total: R$ 0,00 (Não computável na média salarial)\n`;
          summaryLog += `   - Qtd. de Meses: ${pre1994MonthsTotal} meses\n`;
          summaryLog += `   - Média do Período: R$ 0,00\n\n`;
        }

        summaryLog += `--------------------------------------------------\n`;
        summaryLog += `CONSOLIDADO PARA MÉDIA:\n`;
        summaryLog += `- Soma Geral das Contribuições (Pós-1994): R$ ${formatCurrency(totalSum)}\n`;
        summaryLog += `- Divisor Total (Tempo Pós-1994): ${totalMonths} meses\n`;
        summaryLog += `- Média Salarial Geral: R$ ${formatCurrency(avg)}\n\n`;

        summaryLog += `CÁLCULO DO BENEFÍCIO FINAL (APLICAÇÃO DO PERCENTUAL):\n`;
        summaryLog += `- Alíquota de Benefício (Tempo de Contribuição Geral): ${(perc * 100).toFixed(2).replace('.', ',')}%\n`;
        summaryLog += `  (Inclui o tempo total das incorporações, inclusive o período pré-1994 de ${pre1994MonthsTotal} meses)\n`;
        summaryLog += `- Aplicação da Alíquota sobre a Média Geral:\n`;
        summaryLog += `  R$ ${formatCurrency(avg)} x ${(perc * 105 / 105).toFixed(4).replace('.', ',')}% = R$ ${formatCurrency(finalBenefit)}\n`;
        summaryLog += `- Benefício Estimado Final: R$ ${formatCurrency(finalBenefit)}\n`;
        summaryLog += `--------------------------------------------------\n\n`;

        // --- SEÇÃO § 10 LC 133/2021 OPTIMIZATION ---
        const limitExclusion = Math.floor(candidateMonths.length * 0.2);
        const sortedCandidates = [...candidateMonths].sort((a, b) => a.value - b.value);

        let bestK = 0;
        let bestAverage = avg;
        let bestPerc = perc;
        let bestBenefit = finalBenefit;
        let bestExcluded: typeof candidateMonths = [];

        const optimizationHistory: {
          k: number;
          average: number;
          perc: number;
          benefit: number;
          excludedList: { competencia: string; value: number; originalValue: number; rowIdx: number; type: string }[];
        }[] = [{
          k: 0,
          average: avg,
          perc: perc,
          benefit: finalBenefit,
          excludedList: []
        }];

        for (let k = 1; k <= limitExclusion; k++) {
          const excludedThisStep = sortedCandidates.slice(0, k);
          const sumOfSmallestK = excludedThisStep.reduce((s, item) => s + item.value, 0);

          const totalSum_adj = totalSum - sumOfSmallestK;
          const totalMonths_adj = totalMonths - k;
          const avg_adj = totalMonths_adj > 0 ? totalSum_adj / totalMonths_adj : 0;

          // Recompute percentage based on adjusted days (each excluded month reduces service by 1/12 of a year)
          const yearsTotal_adj = Math.max(0, yearsTotal - (k / 12));
          
          // Trava de tempo de contribuição mínimo: o tempo de contribuição líquido após descartes não pode ser menor que 25 anos
          if (yearsTotal_adj < 25) {
            break;
          }

          let perc_adj = 0.60 + (yearsTotal_adj > 20 ? (Math.floor(yearsTotal_adj) - 20) * 0.02 : 0);
          perc_adj = Math.min(Math.max(perc_adj, 0.60), 1.0);

          const benefit_adj = avg_adj * perc_adj;

          const excludedList = excludedThisStep.map(item => ({
            competencia: item.competencia,
            value: item.value,
            originalValue: item.originalValue,
            rowIdx: item.rowIdx,
            type: item.type
          }));

          optimizationHistory.push({
            k,
            average: avg_adj,
            perc: perc_adj,
            benefit: benefit_adj,
            excludedList
          });

          if (benefit_adj > bestBenefit) {
            bestBenefit = benefit_adj;
            bestAverage = avg_adj;
            bestPerc = perc_adj;
            bestK = k;
            bestExcluded = excludedThisStep;
          }
        }

        const allMonthlyDetails: {
          competencia: string;
          originalValue: number;
          value: number;
          type: string;
          isPre94: boolean;
          isExcluded: boolean;
        }[] = [];

        // 1. Add all post-94 candidateMonths (these cover post-94 historical, post-94 incorporations, and post-94 projections!)
        candidateMonths.forEach((item) => {
          allMonthlyDetails.push({
            competencia: item.competencia,
            originalValue: item.originalValue,
            value: item.value,
            type: item.type,
            isPre94: isPre07_1994(item.competencia),
            isExcluded: false
          });
        });

        // 2. Add pre-94 historical
        pre94_Hist.forEach((item) => {
          allMonthlyDetails.push({
            competencia: item.competencia,
            originalValue: item.value,
            value: item.value,
            type: 'chamber-historical',
            isPre94: true,
            isExcluded: false
          });
        });

        // 3. Add any pre-1994 inputs from incorporations if they have line-by-line text
        formData.incorporations.forEach((row) => {
          if (row.type === 'pre-1994') {
            const lineStr = typeof row.value === 'string' ? row.value : '';
            const incLines = lineStr.split('\n').filter(l => l.trim().length > 0);
            incLines.forEach((l) => {
              const parsed = parseLinhaX(l);
              if (parsed) {
                allMonthlyDetails.push({
                  competencia: parsed.competencia,
                  originalValue: parsed.valor,
                  value: parsed.valor,
                  type: 'pre-1994',
                  isPre94: true,
                  isExcluded: false
                });
              }
            });
          }
        });

        // 4. Mark excluded based on bestExcluded
        const bestExcludedKeys = new Set(bestExcluded.map(x => `${x.competencia}_${x.type}_${x.originalValue}`));
        allMonthlyDetails.forEach(item => {
          if (bestExcludedKeys.has(`${item.competencia}_${item.type}_${item.originalValue}`)) {
            item.isExcluded = true;
          }
        });

        // 5. Sort chronologically
        const sortedMonthlyDetails = [...allMonthlyDetails].sort((a, b) => {
          const idxA = getCompIndex(a.competencia);
          const idxB = getCompIndex(b.competencia);
          return idxA - idxB;
        });

        // 6. Format ASCII monthly list
        let analyticalListStr = "\n======================================================================\n";
        analyticalListStr += `LISTAGEM ANALÍTICA DAS COMPETÊNCIAS E CONTRIBUIÇÕES CONSIDERADAS:\n`;
        analyticalListStr += `======================================================================\n`;
        
        sortedMonthlyDetails.forEach((item) => {
          const compLabel = item.competencia.padEnd(10);
          let descLabel = "";
          if (item.type === 'chamber-historical') descLabel = "Câmara (Histórico)";
          else if (item.type === 'chamber-projected' || item.type === 'chamber-proj') descLabel = "Câmara (Projetado)";
          else if (item.type === 'contribution-only') descLabel = "Incorporação (Tempo e Contrib.)";
          else if (item.type === 'all-effects') descLabel = "Incorporação (Todos Efeitos)";
          else if (item.type === 'pre-1994') descLabel = "Incorporação (Tempo Pré-1994)";
          else descLabel = "Contribuição";

          descLabel = descLabel.padEnd(30);

          if (item.isPre94) {
            analyticalListStr += `   ${compLabel} | ${descLabel} | (Período anterior a 07/1994 desconsiderado do cálculo da média)\n`;
          } else {
            const origValStr = `Orig: R$ ${formatCurrency(item.originalValue)}`;
            const corrValStr = formData.needsUpdateHistorical ? `Corr: R$ ${formatCurrency(item.value)}` : "";
            const valBlock = `${origValStr.padEnd(18)} ${corrValStr ? '| ' + corrValStr.padEnd(18) : ''}`;
            
            let annotation = "";
            if (item.isExcluded) {
              annotation = " (Excluída)";
            }
            
            analyticalListStr += `   ${compLabel} | ${descLabel} | ${valBlock}${annotation}\n`;
          }
        });
        analyticalListStr += `======================================================================\n\n`;

        setOptimizationResult({
          bestK,
          originalAverage: avg,
          originalPerc: perc,
          originalBenefit: finalBenefit,
          bestAverage,
          bestPerc,
          bestBenefit,
          bestExcluded: bestExcluded.map(item => ({
            competencia: item.competencia,
            value: item.value,
            originalValue: item.originalValue,
            rowIdx: item.rowIdx,
            type: item.type
          })).sort((a, b) => {
            const [am, ay] = a.competencia.split('/').map(Number);
            const [bm, by] = b.competencia.split('/').map(Number);
            return (ay * 12 + am) - (by * 12 + bm);
          }),
          history: optimizationHistory,
          limitExclusion,
          yearsTotal,
          totalIncCount: candidateMonths.length
        });

        setCalcLog(summaryLog + analyticalListStr + incLogs + monthlyProjectionLog);
        setDetailedExcelRows(excelRows);

        // Current Situation metadata
        const curBandIdx = manualBand ? manualBand - 1 : getCareerBandIndex(today, admissionDate);
        const curBase = selectedCareerTable[romanNumerals[curBandIdx]];
        const caps = getSavedSalaryCaps();
        const cap = (careerKey === 'procurador_juridico' ? caps.procurador : caps.general);
        const currentGross = Math.min(curBase * 1.3, cap);

        const actualAge = (actualRetirementDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

        setSummaryData({
          currGross: `R$ ${formatCurrency(currentGross)}`,
          currBand: romanNumerals[curBandIdx],
          currAts: `${(ATS_PERCENTAGES[atsAtToday] * 100).toFixed(0)}%`,
          retirementDate: actualRetirementDate.toLocaleDateString('pt-BR'),
          retirementAge: Math.floor(actualAge),
          totalContribTime: formatarTempoCompleto(approxDays),
          benefitPerc: `${(perc * 100).toFixed(2)}%`,
          retirementBenefit: `R$ ${formatCurrency(finalBenefit)}`
        });

        setResultsComputed(true);
      } catch (err: any) {
        setValidationError(`Erro no motor previdenciário: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }, 200);
  };

  const handleExportExcel = () => {
    if (detailedExcelRows.length === 0) return;
    const headers = [
      "Mês/Ano", "Faixa", "Salário Base", "Resp. Técnica", "Grat. Adicional / FG",
      "ATS", "Est. Graduação", "Est. Pós/Mest./Dout.", "Redutor", "Salário de Contribuição"
    ];
    const csvRows = [headers.join(';')];
    
    detailedExcelRows.forEach(row => {
      const values = headers.map(header => {
        let value = row[header] !== undefined ? row[header] : 0;
        if (typeof value === 'number') {
          value = value.toFixed(2).replace('.', ',');
        }
        return `"${('' + value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(';'));
    });

    const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'memoria_de_calculo.csv';
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmClear = () => {
    const emptyObj: ProventosFormData = {
      serverName: '',
      serverId: '',
      birthDate: '',
      admissionDate: '',
      gender: 'masculino',
      career: 'assistente_administrativo',
      careerLevel: 'medio',
      currentCareerBandIndex: '',
      lastAtsConcession: '',
      lastAtsNumber: 0,
      historicalData: '',
      incorporations: [],
      stimuli: [],
      functions: [],
      extensionMode: 'normal',
      extraYears: 0
    };
    setFormData(emptyObj);
    setResultsComputed(false);
    setCalcLog('');
    setOptimizationResult(null);
    localStorage.removeItem(cacheKey);
    setShowClearModal(false);
  };

  // Load factors for live UI summary in real-time
  const { fatoresText: fatoresRawText } = getSavedFatoresINSS();
  const fatoresMap = new Map<string, number>();
  for (const line of fatoresRawText.split('\n')) {
    const parsed = parseLinhaX(line);
    if (parsed && !isNaN(parsed.valor)) fatoresMap.set(parsed.competencia, parsed.valor);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Principal Form Entry */}
      <div className={`bg-white border border-[#dee2e6] rounded-xl shadow-xs p-6 sm:p-8 space-y-6 ${showReport ? 'hidden' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
              Simulador de Proventos de Aposentadoria
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              RPPS — Câmara Municipal de Curitiba. Projeção analítica da evolução de faixas e médias salariais
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

        {validationError && (
          <div className="flex gap-2.5 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg leading-relaxed text-xs sm:text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Dados pendentes:</span> {validationError}
            </div>
          </div>
        )}

        <div className="space-y-6 divide-y divide-gray-50">
          {/* Section 1: Server and Career */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              1. Identificação Geral
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nome do Servidor</label>
                <input 
                  type="text" 
                  value={formData.serverName}
                  onChange={(e) => handleFieldChange('serverName', e.target.value)}
                  placeholder="Nome completo (opcional)"
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Matrícula</label>
                <input 
                  type="text" 
                  value={formData.serverId}
                  onChange={(e) => handleFieldChange('serverId', e.target.value)}
                  placeholder="Matrícula (opcional)"
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sexo</label>
                <select 
                  value={formData.gender}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data de Nascimento</label>
                <input 
                  type="date" 
                  value={formData.birthDate}
                  onChange={(e) => handleFieldChange('birthDate', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data de Admissão (Fixo)</label>
                <input 
                  type="date" 
                  value={formData.admissionDate}
                  onChange={(e) => handleFieldChange('admissionDate', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nível de Carreira</label>
                <select 
                  value={formData.careerLevel}
                  onChange={(e) => handleFieldChange('careerLevel', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                >
                  <option value="medio">Nível Médio</option>
                  <option value="superior">Nível Superior</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Progresso de Faixa</label>
                <select 
                  value={formData.currentCareerBandIndex}
                  onChange={(e) => handleFieldChange('currentCareerBandIndex', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                >
                  <option value="">Calcular Automaticamente</option>
                  {romanNumerals.map((rom, rIdx) => (
                    <option key={rIdx} value={rIdx + 1}>{rom}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-4">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Plano de Carreira Selecionado</label>
                <select 
                  value={formData.career}
                  onChange={(e) => handleFieldChange('career', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                >
                  {Object.entries(careerDisplayNames).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Adicional Tempo de Serviço */}
          <div className="space-y-3 pt-4">
            <h5 className="text-xs font-bold text-red-800 uppercase tracking-wider block">
              2. Adicionais por Tempo de Serviço (ATS / Anuênios e Quinquênios)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-red-50/15 border border-red-200/50 p-4 rounded-xl shadow-2xs">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data da Última Concessão de ATS</label>
                <input 
                  type="date" 
                  value={formData.lastAtsConcession}
                  onChange={(e) => handleFieldChange('lastAtsConcession', e.target.value)}
                  className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-sm text-[#212529]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Nº do Último ATS concedido</label>
                <input 
                  type="number" 
                  min={0}
                  max={10}
                  placeholder="0 (Sem ATS)"
                  value={formData.lastAtsNumber === 0 ? '' : formData.lastAtsNumber}
                  onChange={(e) => handleFieldChange('lastAtsNumber', Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-sm text-[#212529] font-bold"
                />
              </div>
              <div className="flex items-center text-[10px] text-gray-400 font-medium pl-1 leading-normal">
                Cada nível de adicional de serviço confere 5% acumulado de quinquênio, limitado ao teto estatutário de 50%.
              </div>
            </div>
          </div>

          {/* Section 3: Base de Contribuição Histórica */}
          <div className="space-y-3 pt-4">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              3. Salários e Bases de Contribuição Histórica - CMC
            </h2>
            
            {/* INSS Toggle for Standalone Page (Section 3) */}
            <div className="bg-gray-50/50 p-2 border border-gray-200 rounded-lg flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-700">Atualizar Salários CMC pelo Fator do INSS</span>
                <span className="text-[10px] text-gray-500">Aplica a correção automática cadastrada em "Cadastros" para os salários históricos</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={!!formData.needsUpdateHistorical} 
                    onChange={e => handleFieldChange('needsUpdateHistorical', e.target.checked)} 
                  />
                  <div className="w-8 h-[18px] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#004b8d]"></div>
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2">
              <div className="lg:col-span-7 flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Cópia de Salários CMC (Ex: 07/1994 2316,40)
                </label>
                <textarea 
                  rows={8}
                  value={formData.historicalData}
                  placeholder="Exemplo para preenchimento de ficha mensal anterior à projeção futura:&#10;07/1994 2316,40&#10;08/1994 2410,50"
                  onChange={(e) => handleFieldChange('historicalData', e.target.value)}
                  className="w-full p-3 font-mono text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b8d] rounded-lg transition-all"
                />
                <span className="text-[10px] text-gray-400 block pb-1">
                  Ficha de contribuição acumulada passada. Cole as informações em linhas contendo o padrão <strong>MM/AAAA VALOR</strong> separando o valor por espaço.
                </span>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Resumo e Valores CMC Interpretados
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2 h-full justify-between min-h-[220px]">
                  {(() => {
                    const histLines = formData.historicalData.split('\n').filter(l => l.trim().length > 0);
                    let histOriginalSum = 0;
                    let histUpdatedSum = 0;
                    
                    const histInterpretedRows = histLines.map(line => {
                      const parsed = parseLinhaX(line);
                      if (parsed && !isNaN(parsed.valor)) {
                        const f = fatoresMap.get(parsed.competencia) ?? 1;
                        histOriginalSum += parsed.valor;
                        histUpdatedSum += parsed.valor * f;
                        return {
                          competencia: parsed.competencia,
                          original: parsed.valor,
                          fator: fatoresMap.get(parsed.competencia) ?? null,
                          updated: parsed.valor * f
                        };
                      } else {
                        const parts = line.trim().split(/\s+/);
                        const valStr = parts.length > 1 ? parts[parts.length - 1] : parts[0];
                        const val = parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0;
                        histOriginalSum += val;
                        histUpdatedSum += val;
                        return {
                          competencia: 'Divergente',
                          original: val,
                          fator: null,
                          updated: val
                        };
                      }
                    });

                    return (
                      <>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between border-b border-gray-200/50 pb-1">
                            <span className="text-gray-500">Total de Meses CMC:</span>
                            <span className="font-bold text-gray-800">{histLines.length} meses</span>
                          </div>
                          <div className="flex justify-between border-b border-gray-200/50 pb-1">
                            <span className="text-gray-500">Soma Original CMC:</span>
                            <span className="font-mono font-bold text-gray-800">R$ {histOriginalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          {formData.needsUpdateHistorical && (
                            <div className="flex justify-between border-b border-gray-200/50 pb-1 bg-emerald-50/50 px-1 rounded">
                              <span className="text-emerald-700 font-medium">Soma Corrigida (INSS):</span>
                              <span className="font-mono font-bold text-emerald-700">R$ {histUpdatedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </div>
                        
                        {histLines.length > 0 && (
                          <div className="border border-gray-200 rounded-lg p-1.5 text-[9px] font-mono max-h-[145px] overflow-y-auto bg-white mt-1">
                            <table className="w-full text-left text-gray-700">
                              <thead>
                                <tr className="border-b border-gray-200 font-bold text-gray-500">
                                  <th className="py-0.5 px-1">Mês/Ano</th>
                                  <th className="py-0.5 px-1 text-right">Orig.</th>
                                  {formData.needsUpdateHistorical && <th className="py-0.5 px-1 text-right text-emerald-700">Corr.</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {histInterpretedRows.slice(0, 100).map((r, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-gray-50 border-b border-gray-100">
                                    <td className="py-0.5 px-1 text-[#004b8d] font-bold">{r.competencia}</td>
                                    <td className="py-0.5 px-1 text-right font-light text-gray-500">{r.original.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    {formData.needsUpdateHistorical && (
                                      <td className="py-0.5 px-1 text-right font-bold text-emerald-700">{r.updated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    )}
                                  </tr>
                                ))}
                                {histInterpretedRows.length > 100 && (
                                  <tr>
                                    <td colSpan={formData.needsUpdateHistorical ? 3 : 2} className="text-center text-gray-400 py-0.5">... e mais {histInterpretedRows.length - 100} meses</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Incorporações dinâmicas */}
          <div className="space-y-3 pt-4">
            <div className="flex justify-between items-center gap-4">
              <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
                4. Incorporações Previstas ou Homologadas
              </h2>
              <button
                type="button"
                onClick={handleAddIncorporation}
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-3 py-1.5 bg-gray-50 text-[#004b8d] hover:bg-blue-50 border border-gray-200 hover:border-blue-200 hover:text-[#003a6d] rounded-lg transition-all"
              >
                <Plus size={12} /> Novo Período
              </button>
            </div>

            {formData.incorporations.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                Nenhum período de incorporação de tempo externo foi declarado.
              </div>
            ) : (
              <div className="space-y-6">
                {formData.incorporations.map((row, idx) => {
                  const mEsperados = (row.years * 12) + row.months + Math.floor(row.days / 30);
                  const lineStr = typeof row.value === 'string' ? row.value : '';
                  const linesVal = lineStr.split('\n').filter(l => l.trim().length > 0);
                  const isConsistent = linesVal.length === mEsperados;

                  let originalSum = 0;
                  let updatedSum = 0;
                  const interpretedRows = linesVal.map(line => {
                    const parsed = parseLinhaX(line);
                    if (parsed && !isNaN(parsed.valor)) {
                      const f = fatoresMap.get(parsed.competencia) ?? 1;
                      originalSum += parsed.valor;
                      updatedSum += parsed.valor * f;
                      return {
                        competencia: parsed.competencia,
                        original: parsed.valor,
                        fator: fatoresMap.get(parsed.competencia) ?? null,
                        updated: parsed.valor * f
                      };
                    } else {
                      const parts = line.trim().split(/\s+/);
                      const valStr = parts.length > 1 ? parts[parts.length - 1] : parts[0];
                      const val = parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0;
                      originalSum += val;
                      updatedSum += val;
                      return {
                        competencia: 'Divergente',
                        original: val,
                        fator: null,
                        updated: val
                      };
                    }
                  });

                  return (
                    <div 
                      key={row.id}
                      className="p-5 bg-white border border-gray-200 hover:shadow-xs rounded-xl transition-all flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-[#004b8d] uppercase tracking-wider">Período de Incorporação #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          {row.type !== 'pre-1994' && (
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <span className="text-[10px] font-bold text-gray-500">Atualizar valores (Fator INSS)</span>
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={row.needsUpdate !== false} 
                                  onChange={e => handleUpdateIncorporation(row.id, 'needsUpdate', e.target.checked)} 
                                />
                                <div className="w-8 h-[18px] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#004b8d]"></div>
                              </div>
                            </label>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveIncorporation(row.id)}
                            className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer transition-all border border-red-100"
                            title="Remover Período"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo Incorporação</label>
                          <select
                            value={row.type}
                            onChange={(e) => handleUpdateIncorporation(row.id, 'type', e.target.value)}
                            className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                          >
                            <option value="contribution-only">Tempo e contribuição - Pós 07/1994</option>
                            <option value="all-effects">Para todos os efeitos</option>
                            <option value="pre-1994">Apenas tempo - Pré 07/1994</option>
                          </select>
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Anos</label>
                          <input 
                            type="number"
                            min={0}
                            placeholder="0"
                            value={row.years === 0 ? '' : row.years}
                            onChange={(e) => handleUpdateIncorporation(row.id, 'years', parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                          />
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Meses</label>
                          <input 
                            type="number"
                            min={0}
                            max={11}
                            placeholder="0"
                            value={row.months === 0 ? '' : row.months}
                            onChange={(e) => handleUpdateIncorporation(row.id, 'months', parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                          />
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dias</label>
                          <input 
                            type="number"
                            min={0}
                            placeholder="0"
                            value={row.days === 0 ? '' : row.days}
                            onChange={(e) => handleUpdateIncorporation(row.id, 'days', parseInt(e.target.value) || 0)}
                            className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                          />
                        </div>
                      </div>

                      {row.type !== 'pre-1994' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2 pt-4 border-t border-gray-100">
                          <div className="lg:col-span-7 flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                              Cole a Ficha Mensal (Ex: 01/2005 1500,00)
                            </label>
                            <textarea
                              rows={6}
                              value={lineStr}
                              onChange={(e) => handleUpdateIncorporation(row.id, 'value', e.target.value)}
                              placeholder="Comp. Valor&#10;jan/2005 1.500,00&#10;fev/2005 1.550,00"
                              className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b8d] rounded-lg transition-all"
                            />
                            <span className="text-[9px] text-gray-400">
                              Cole as competências pertencentes a este período de incorporação (uma por linha).
                            </span>

                            {linesVal.length > 0 && (
                              <>
                                {isConsistent ? (
                                  <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-1.5">
                                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                                    <span>Consistência confirmada: {linesVal.length} competências coladas para os {mEsperados} meses calculados.</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-1.5 font-sans">
                                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" /> 
                                    <div>
                                      Inconsistência identificada: O tempo selecionado equivale a <strong>{mEsperados} meses</strong> cheios (sobras de dias menores que 1 mês são ignoradas), mas você inseriu <strong>{linesVal.length} competências</strong>. Por favor, verifique para que coincidam.
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {mEsperados > 0 && linesVal.length === 0 && (
                              <div className="text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                                Aguardando colagem: São esperadas exatamente <strong>{mEsperados} competências</strong> coladas acima.
                              </div>
                            )}
                          </div>

                          <div className="lg:col-span-5 flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Resumo e Valores Interpretados
                            </label>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2 h-full justify-between">
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                                  <span className="text-gray-500">Tempo Calculado:</span>
                                  <span className="font-bold text-gray-800">{mEsperados} meses</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                                  <span className="text-gray-500">Linhas Lidas:</span>
                                  <span className="font-bold text-gray-800">{linesVal.length}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200/50 pb-1">
                                  <span className="text-gray-500">Soma Original:</span>
                                  <span className="font-mono font-bold text-gray-800">R$ {originalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {row.needsUpdate !== false && (
                                  <div className="flex justify-between border-b border-gray-200/50 pb-1 bg-emerald-50/50 px-1 rounded">
                                    <span className="text-emerald-700 font-medium">Soma Corrigida (INSS):</span>
                                    <span className="font-mono font-bold text-emerald-700">R$ {updatedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </div>
                                )}
                              </div>
                              
                              {linesVal.length > 0 && (
                                <div className="border border-gray-200 rounded-lg p-1.5 text-[9px] font-mono max-h-[85px] overflow-y-auto bg-white">
                                  <table className="w-full text-left text-gray-700">
                                    <thead>
                                      <tr className="border-b border-gray-200 font-bold text-gray-500">
                                        <th className="py-0.5 px-1">Mês/Ano</th>
                                        <th className="py-0.5 px-1 text-right">Orig.</th>
                                        {row.needsUpdate !== false && <th className="py-0.5 px-1 text-right text-emerald-700">Corr.</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {interpretedRows.slice(0, 100).map((r, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-gray-50 border-b border-gray-100">
                                          <td className="py-0.5 px-1 text-[#004b8d] font-bold">{r.competencia}</td>
                                          <td className="py-0.5 px-1 text-right font-light text-gray-500">{r.original.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                          {row.needsUpdate !== false && (
                                            <td className="py-0.5 px-1 text-right font-bold text-emerald-700">{r.updated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                          )}
                                        </tr>
                                      ))}
                                      {interpretedRows.length > 100 && (
                                        <tr>
                                          <td colSpan={row.needsUpdate !== false ? 3 : 2} className="text-center text-gray-400 py-0.5">... e mais {interpretedRows.length - 100} meses</td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 5: Academico dropdowns */}
          <div className="space-y-3 pt-4">
            <div className="flex justify-between items-center gap-4">
              <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
                5. Estímulos Acadêmicos do Servidor
              </h2>
              <button
                type="button"
                onClick={handleAddStimulus}
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-3 py-1.5 bg-gray-50 text-[#004b8d] hover:bg-blue-50 border border-gray-200 hover:border-blue-200 hover:text-[#003a6d] rounded-lg transition-all"
              >
                <Plus size={12} /> Novo Título
              </button>
            </div>

            {formData.stimuli.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                Nenhum incentivo por capacitação acadêmica foi adicionado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.stimuli.map((row) => (
                  <div key={row.id} className="flex gap-2 p-3 bg-gray-50 border rounded-lg items-center justify-between">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <select
                        value={row.type}
                        onChange={(e) => handleUpdateStimulus(row.id, 'type', e.target.value)}
                        className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs font-semibold"
                      >
                        <option value="graduacao">Graduação (30% de base)</option>
                        <option value="pos_graduacao">Pós-Graduação (10% de base)</option>
                        <option value="mestrado">Mestrado (15% de base)</option>
                        <option value="doutorado">Doutorado (20% de base)</option>
                      </select>
                      <input 
                        type="date"
                        value={row.date}
                        placeholder="Data titulação"
                        onChange={(e) => handleUpdateStimulus(row.id, 'date', e.target.value)}
                        className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveStimulus(row.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 6: Funçoes Gratificadas */}
          <div className="space-y-3 pt-4">
            <div className="flex justify-between items-center gap-4">
              <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
                6. Funções Gratificadas (FGs)
              </h2>
              <button
                type="button"
                onClick={handleAddFunction}
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-3 py-1.5 bg-gray-50 text-[#004b8d] hover:bg-blue-50 border border-gray-200 hover:border-blue-200 hover:text-[#003a6d] rounded-lg transition-all"
              >
                <Plus size={12} /> Novo Período
              </button>
            </div>

            {formData.functions.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                Nenhum período de FG exercido foi declarado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {formData.functions.map((row) => (
                  <div key={row.id} className="p-3 bg-gray-50 border rounded-xl flex flex-col gap-2 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveFunction(row.id)}
                      className="absolute right-2 top-2 h-5 w-5 flex items-center justify-center text-red-500 hover:text-red-700 bg-white border border-gray-150 rounded-full"
                    >
                      &times;
                    </button>
                    <div className="text-xs space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Início do Período</span>
                        <input 
                          type="date"
                          value={row.start}
                          onChange={(e) => handleUpdateFunction(row.id, 'start', e.target.value)}
                          className="w-full p-1.5 bg-white border border-[#dee2e6] rounded-md"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Fim do Período</span>
                        <input 
                          type="date"
                          value={row.end}
                          onChange={(e) => handleUpdateFunction(row.id, 'end', e.target.value)}
                          className="w-full p-1.5 bg-white border border-[#dee2e6] rounded-md"
                        />
                      </div>
                      <div className="flex flex-col gap-1 pt-1 border-t border-dashed border-gray-200">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Nível FG</span>
                        <select
                          value={row.level}
                          onChange={(e) => handleUpdateFunction(row.id, 'level', e.target.value)}
                          className="w-full p-1.5 bg-white border border-[#dee2e6] rounded-md font-bold text-[#004b8d]"
                        >
                          <option value="FG4">FG4</option>
                          <option value="FG5">FG5</option>
                          <option value="FG6">FG6</option>
                          <option value="FG7">FG7</option>
                          <option value="FG8">FG8</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Section 7: Extensão da Simulação */}
          <div className="space-y-3 pt-4">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              7. Critério de Extensão (Tempo Opcional de Permanência)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Extensão da Simulação</label>
                <select
                  value={formData.extensionMode}
                  onChange={(e) => handleFieldChange('extensionMode', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                >
                  <option value="normal">Até atingir Idade Mínima</option>
                  <option value="compulsoria">Até Aposentadoria Compulsória (75 anos)</option>
                  <option value="cem_por_cento">Até obter 100% da Média Salarial (Limitado a 75 anos)</option>
                  <option value="custom">Tempo Extra Customizável (após Idade Mínima)</option>
                </select>
                <span className="text-[10px] text-gray-400 mt-0.5">Determine o termo final para o encerramento do cálculo.</span>
              </div>
              
              {formData.extensionMode === 'custom' && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Trabalhar mais X Anos</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.extraYears === 0 ? '' : formData.extraYears}
                    placeholder="Ex: 2"
                    onChange={(e) => handleFieldChange('extraYears', parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white border border-[#dee2e6] rounded-lg text-sm text-[#212529] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] transition-all"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5">Anos trabalhados além da idade mínima requerida.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action calculations bar */}
        <div className="flex gap-4 pt-6 border-t border-gray-100 flex-wrap">
          <button
            type="button"
            onClick={handleCalcularSimulacao}
            className="flex-1 min-w-[180px] flex items-center justify-center gap-1.5 py-3.5 px-6 bg-[#004b8d] hover:bg-[#003a6d] text-white font-bold text-sm rounded-lg shadow-sm cursor-pointer transition-all active:scale-[0.98]"
          >
            <Play size={15} /> Calcular Projeção Previdenciária
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center gap-2.5 p-10 bg-white border border-[#dee2e6] rounded-xl text-[#004b8d] font-bold text-xs sm:text-sm">
          <TrendingUp className="animate-spin" size={20} />
          <span>Iterando cálculo da média histórica e simulando progressão de faixas futuras...</span>
        </div>
      )}

      {/* Results computed and report is not showing */}
      {resultsComputed && !isLoading && !showReport && (
        <div className="space-y-6">
          <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-gray-800 border-l-4 border-[#004b8d] pl-3 uppercase tracking-wider text-xs">
              Demonstrativo Consolidado do Benefício
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Situação Atual */}
              <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-[#004b8d]" />
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Situação Atual Calculada</h3>
                  </div>
                  <div className="space-y-1.5 text-xs sm:text-sm text-gray-700">
                    <p><strong>Remuneração Bruta Estimada:</strong> {summaryData.currGross}</p>
                    <p><strong>Faixa Correspondente:</strong> Classe {summaryData.currBand}</p>
                    <p><strong>Adicional por Tempo (ATS):</strong> {summaryData.currAts}</p>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 select-none">Valor estimado para fins puramente comparativos.</div>
              </div>

              {/* Card 2: Projeção Aposentadoria */}
              <div className="bg-red-50/20 border border-red-200 p-5 rounded-xl space-y-3 relative overflow-hidden flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-red-800" />
                    <h3 className="text-sm font-bold text-red-950 uppercase tracking-wider">Resultado da Elegibilidade</h3>
                  </div>
                  <div className="space-y-1.5 text-xs sm:text-sm text-gray-800">
                    <p><strong>Data Prevista para Elegibilidade:</strong> <span className="font-bold">{summaryData.retirementDate}</span> ({summaryData.retirementAge} anos)</p>
                    <p><strong>Tempo Total de Contribuição:</strong> {summaryData.totalContribTime}</p>
                    <p><strong>Alíquota do Benefício (Art. 6º):</strong> {summaryData.benefitPerc}</p>
                    <p className="text-base font-bold text-red-900 border-t border-red-200/50 pt-2 flex items-center justify-between gap-1 mt-1 font-mono">
                      <span>Provento Mensal:</span> <span>{summaryData.retirementBenefit}</span>
                    </p>
                  </div>
                </div>
                <div className="text-[10px] text-red-600/60 select-none font-medium">Lógica de média calculada sobre base pós-julho de 1994.</div>
              </div>
            </div>

            {/* Otimização de Média – Lei Complementar 133/2021, Art. 15 § 10 */}
            {optimizationResult && (
              <div className="border border-indigo-100 bg-indigo-50/15 rounded-xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/60 font-sans">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-550 text-white rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-indigo-950 uppercase tracking-normal">Otimização de Média (Lei Complementar 133/2021, Art. 15 § 10)</h3>
                      <p className="text-xs text-indigo-600">Simulação de descarte das menores contribuições para maximização do provento final</p>
                    </div>
                  </div>
                  <div className="bg-indigo-100 text-indigo-800 text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full select-none tracking-widest leading-none shrink-0 text-center">
                    Exclusão Limite de 20%
                  </div>
                </div>

                {optimizationResult.bestK === 0 ? (
                  <div className="flex items-start gap-3 bg-white border border-gray-200 p-4 rounded-xl">
                    <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-gray-700 leading-relaxed font-sans">
                      <p className="font-bold text-gray-900">Sua média original é a ideal!</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Todos os meses incorporados ajudam a manter o coeficiente ou coeficiente geral estável. Nenhuma exclusão de contribuição externa pós-07/1994 resultará em benefício final superior a este.
                      </p>
                      <p className="text-xs text-gray-600 mt-2">
                        <strong>Tempo considerado para proporcionalidade:</strong> {formatarTempoCompleto(Math.round((optimizationResult.yearsTotal || 0) * 365))}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 font-sans">
                    {/* Glance Dashboard comparison table */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cenário Original */}
                      <div className="bg-white border border-gray-200 p-4 rounded-xl space-y-2">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider">Cenário Original (Sem Exclusão)</span>
                        <div className="flex justify-between text-xs sm:text-sm text-gray-600 border-b border-gray-100 pb-1.5 pt-1">
                          <span>Média Salarial Apurada:</span>
                          <strong className="text-gray-800 font-bold">R$ {formatCurrency(optimizationResult.originalAverage)}</strong>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm text-gray-600 border-b border-gray-50 pb-1.5">
                          <span>Alíquota do Benefício:</span>
                          <strong className="text-gray-800">{(optimizationResult.originalPerc * 100).toFixed(2)}%</strong>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm text-gray-600 border-b border-gray-50 pb-1.5">
                          <span>Tempo para Proporcionalidade:</span>
                          <strong className="text-gray-700">
                            {formatarTempoCompleto(Math.round((optimizationResult.yearsTotal || 0) * 365))}
                          </strong>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm text-gray-600 border-b border-gray-50 pb-1.5">
                          <span>Competências Utilizadas:</span>
                          <strong className="text-gray-700">{optimizationResult.totalIncCount} meses</strong>
                        </div>
                        <div className="flex justify-between text-sm pt-1">
                          <span className="text-gray-500">Benefício Mensal Estimado:</span>
                          <strong className="text-gray-800 font-mono">R$ {formatCurrency(optimizationResult.originalBenefit)}</strong>
                        </div>
                      </div>

                      {/* Cenário Otimizado */}
                      <div className="bg-emerald-50/40 border border-emerald-200 p-4 rounded-xl space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mr-2 -mt-2 w-8 h-8 rotate-12 bg-emerald-100/40" />
                        <span className="block text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">Cenário Otimizado (§10 do Art. 15 da LC 133/2021)</span>
                        <div className="flex justify-between text-xs sm:text-sm text-[#004b8d] border-b border-emerald-100 pb-1.5 pt-1">
                          <span>Média Otimizada (+{(((optimizationResult.bestAverage - optimizationResult.originalAverage) / (optimizationResult.originalAverage || 1)) * 100).toFixed(1)}%):</span>
                          <strong className="text-emerald-950 font-bold">R$ {formatCurrency(optimizationResult.bestAverage)}</strong>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm text-[#004b8d] border-b border-emerald-100 pb-1.5">
                          <span>Alíquota Ajustada (Perda de {optimizationResult.bestK} meses):</span>
                          <strong className="text-red-700 font-bold">{(optimizationResult.bestPerc * 100).toFixed(2)}%</strong>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm text-[#004b8d] border-b border-emerald-100 pb-1.5">
                          <span>Tempo Consertado / Ajustado:</span>
                          <strong className="text-emerald-500 font-bold">
                            {formatarTempoCompleto(Math.round(Math.max(0, (optimizationResult.yearsTotal || 0) - optimizationResult.bestK / 12) * 365))}
                          </strong>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm text-[#004b8d] border-b border-emerald-100 pb-1.5">
                          <span>Competências Utilizadas (Otimizadas):</span>
                          <strong className="text-emerald-950 font-bold">{optimizationResult.totalIncCount - optimizationResult.bestK} meses</strong>
                        </div>
                        <div className="flex justify-between text-sm pt-1">
                          <span className="font-extrabold text-emerald-800">Benefício Otimizado Final:</span>
                          <strong className="text-emerald-900 font-bold font-mono">R$ {formatCurrency(optimizationResult.bestBenefit)}</strong>
                        </div>
                        <div className="text-[10px] text-emerald-850 pt-1 border-t border-emerald-100/50 leading-relaxed font-sans">
                          Fundamentação legal: § 10 do Artigo 15 da Lei Complementar nº 133/2021 (Regime Previdenciário Municipal de Curitiba).
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={20} />
                        <div>
                          <span className="text-xs text-emerald-100 block font-medium uppercase tracking-wider leading-none mb-1">Vantagem Financeira Líquida</span>
                          <span className="text-[11px] text-white">Descarte otimizado de {optimizationResult.bestK} meses de menor contribuição.</span>
                        </div>
                      </div>
                      <span className="text-xl sm:text-2xl font-bold font-mono shrink-0">
                        + R$ {formatCurrency(optimizationResult.bestBenefit - optimizationResult.originalBenefit)}<span className="text-xs font-normal text-emerald-100">/mês</span>
                      </span>
                    </div>

                    {/* Excluded contribution elements */}
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                        <Info size={13} className="text-indigo-600" />
                        Lançamentos Sugeridos Para Exclusão da Média:
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        As seguintes {optimizationResult.bestK} contribuições foram identificadas como desvantajosas para sua média (baixando o cálculo salarial mais do que compensavam em tempo de serviço). Elas devem ser descartadas pelo RPPS conforme Art. 15 § 10 da LC 133/2021:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {optimizationResult.bestExcluded.map((exc: any, index: number) => (
                          <div key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-950 text-xs font-bold rounded-lg border border-red-100 transition-colors shadow-2xs">
                            <span className="bg-red-200 text-red-800 w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px]">{index + 1}</span>
                            <span className="font-mono">{exc.competencia}</span>
                            <span className="text-red-400 font-normal text-[10px]">
                              {exc.type === 'chamber-historical' ? '(Histórico)' : exc.type === 'chamber-projected' ? '(Projetado)' : `(Período ${exc.rowIdx})`}
                            </span>
                            <span className="text-red-650">•</span>
                            <span>R$ {formatCurrency(exc.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Technical search details memo */}
                    <div className="space-y-2.5 border-t border-indigo-100/50 pt-4">
                      <h4 className="text-[11px] font-bold text-indigo-950 uppercase tracking-widest">
                        Memória do Algoritmo de Otimização (§ 10)
                      </h4>
                      <div className="overflow-x-auto rounded-lg border border-indigo-100 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-indigo-100 text-indigo-600 font-bold bg-indigo-50/50">
                              <th className="py-2 px-3">Meses Excluídos (Menores)</th>
                              <th className="py-2 px-3 text-right">Média Resultante</th>
                              <th className="py-2 px-3 text-right">Alíquota</th>
                              <th className="py-2 px-3 text-right">Provento de Benefício</th>
                              <th className="py-2 px-3 text-right">Impacto Financeiro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {optimizationResult.history.map((step: any) => {
                              const isOptimal = step.k === optimizationResult.bestK;
                              return (
                                <tr key={step.k} className={`border-b last:border-0 hover:bg-gray-50/50 ${isOptimal ? 'bg-emerald-50/80 font-bold border-emerald-200 text-emerald-950' : 'text-gray-600 border-indigo-50/40'}`}>
                                  <td className="py-2 px-3 flex items-center gap-1.5">
                                    {isOptimal ? <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">Ótimo</span> : null}
                                    {step.k === 0 ? 'Cenário Inicial (0)' : `${step.k} menor(es) competência(s)`}
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">R$ {formatCurrency(step.average)}</td>
                                  <td className="py-2 px-3 text-right font-mono">{(step.perc * 100).toFixed(2)}%</td>
                                  <td className="py-2 px-3 text-right font-mono">R$ {formatCurrency(step.benefit)}</td>
                                  <td className={`py-2 px-3 text-right font-mono font-bold ${step.k === 0 ? 'text-gray-400' : (step.benefit > optimizationResult.originalBenefit ? 'text-emerald-700' : 'text-rose-600')}`}>
                                    {step.k === 0 ? 'Linha Base' : `${step.benefit >= optimizationResult.originalBenefit ? '+' : ''}R$ ${formatCurrency(step.benefit - optimizationResult.originalBenefit)}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Calculations actions & logging */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Memória de Cálculo e Demonstrativo Detalhado
                </h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReport(true);
                      window.scrollTo(0, 0);
                    }}
                    className="flex items-center gap-1 py-1.5 px-3 bg-[#004b8d] text-white hover:bg-[#003a6d] rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    <Printer size={13} /> Gerar Relatório Previdenciário
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="flex items-center gap-1 py-1.5 px-3 bg-emerald-700 text-white hover:bg-emerald-800 rounded-lg text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    <FileSpreadsheet size={13} /> Exportar Excel
                  </button>
                </div>
              </div>

              {/* Log pre textarea formatting for premium institutional cred */}
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl font-mono text-xs overflow-x-auto max-h-[310px] leading-relaxed whitespace-pre-wrap selection:bg-white/10 select-text outline-none select-all relative">
                {calcLog}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Printable Report View Overlay (Completely standalone ink-friendly layout) */}
      {showReport && (
        <div className="bg-white border border-gray-300 rounded-xl shadow-xs p-6 sm:p-8 space-y-6 antialiased text-black select-text">
          {/* Controls to exit mock frame print */}
          <div className="flex justify-between items-center gap-4 pb-4 border-b border-gray-100 print:hidden">
            <button
              type="button"
              onClick={() => setShowReport(false)}
              className="py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-lg transition-all"
            >
              &larr; Voltar para Entrada
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="py-2 px-5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              Confirmar Gravação PDF / Impressão
            </button>
          </div>

          {/* Institutional layout header */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-red-800">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 uppercase">Câmara Municipal de Curitiba</h1>
            <p className="text-sm font-semibold text-gray-500 uppercase">Regime Próprio de Previdência Social — RPPS</p>
            <h2 className="text-base font-bold text-red-900 mt-2">Diagnóstico e Simulação de Proventos de Aposentadoria</h2>
            <p className="text-[10px] text-gray-400">Gerado eletro-eletronicamente via portal unificado DGEP em: {new Date().toLocaleString('pt-BR')}</p>
          </div>

          {/* Grid identifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs text-gray-700 leading-normal">
            <p><strong>Nome Completo do Servidor:</strong> {formData.serverName || 'Não Informado'}</p>
            <p><strong>Matrícula Funcional do Cargo:</strong> {formData.serverId || 'Não Informada'}</p>
            <p><strong>Data de Nascimento:</strong> {formData.birthDate ? new Date(formData.birthDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
            <p><strong>Data de Admissão Funcional:</strong> {formData.admissionDate ? new Date(formData.admissionDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</p>
            <p><strong>Gênero Biológico de Aposentadoria:</strong> {formData.gender.toUpperCase()}</p>
            <p><strong>Plano de Carreira de Base:</strong> {careerDisplayNames[formData.career] || 'Não Declarada'}</p>
          </div>

          {/* Financial summary blocks */}
          <div className="p-4 bg-gray-50/50 border border-gray-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <p><strong>Estimativa Base Bruta de Cargo:</strong> {summaryData.currGross}</p>
            <p><strong>Enquadramento Atual (Faixa):</strong> Classe {summaryData.currBand}</p>
            <p><strong>ATS Acumulado Declarado:</strong> {summaryData.currAts}</p>
          </div>

          {/* Forecast result panel */}
          <div className="p-4 bg-red-50/10 border-2 border-red-900/40 rounded-lg space-y-2 text-xs">
            <h3 className="font-bold text-red-950 uppercase tracking-wide">Elegibilidade e Proventos Calculados:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 leading-loose text-gray-800">
              <p><strong>Projeção Diagnóstica de Elegibilidade:</strong> <span className="font-bold text-black">{summaryData.retirementDate}</span></p>
              <p><strong>Idade Presumida do Servidor:</strong> {summaryData.retirementAge} anos</p>
              <p><strong>Tempo Total de Contribuição Atribuído:</strong> {summaryData.totalContribTime}</p>
              <p><strong>Percentual Previdenciário Médio:</strong> {summaryData.benefitPerc}</p>
              <p className="col-span-2 text-sm font-bold text-red-950 border-t pt-2 mt-1 font-mono tracking-tight flex justify-between gap-1">
                <span>BENEFÍCIO ESTIMADO FINAL DE APOSENTADORIA:</span> <span>{summaryData.retirementBenefit} / mensais</span>
              </p>
            </div>
          </div>

          {/* Large text list of memory log */}
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Memória de Cálculos Previdenciários</h4>
            <pre className="p-4 bg-gray-50 border border-gray-200 text-gray-800 rounded-lg font-mono text-[10px] leading-relaxed whitespace-pre-wrap max-h-[290px] overflow-y-auto">
              {calcLog}
            </pre>
          </div>

          {/* Validation sign relays */}
          <div className="pt-8 text-center text-[10px] text-gray-400 border-t border-gray-100">
            Câmara Municipal de Curitiba — Portal DGEP. Simulações baseadas na regulamentação previdenciária aplicável em 2026.
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-[#dee2e6] max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="text-lg font-bold text-red-700">Limpar Parâmetros?</h3>
            <p className="text-gray-500 text-sm">
              Esta ação desfaz todos os salários-base descritos, períodos previdenciários homologados, incentivos e funções.
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
                Sim, Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
