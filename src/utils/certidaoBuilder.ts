import { UnifiedSimulation } from './simulationsStore';
import { CertidaoData, gerarCertidaoAposentadoriaPadraoPDF } from './exportCertidaoPDF';
import { getPatternForCareer } from './settingsStore';
import { getCareerDisplayName, ATS_PERCENTAGES } from '../data/careers';
import { 
  CertidaoEmitida, 
  salvarCertidaoEmitida, 
  consumirProximoNumeroOficial, 
  getProximoNumeroOficial 
} from './certidoesEmitidasStore';

const formatBR = (dateStr?: string) => {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0].trim();
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return clean;
};

const formatDateObjBR = (date: Date): string =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

const parseDate = (dateStr?: string): Date | null => {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1900 && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
        return new Date(y, m, d);
      }
    }
  }
  const clean = dateStr.split('T')[0].trim();
  const isoParts = clean.split('-');
  if (isoParts.length === 3) {
    const y = parseInt(isoParts[0], 10);
    const m = parseInt(isoParts[1], 10) - 1;
    const d = parseInt(isoParts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1900 && m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      return new Date(y, m, d);
    }
  }
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Diferença exata em dias corridos (imune a horário de verão via Date.UTC)
 */
export function diffCalendarDays(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.max(0, Math.floor((utc2 - utc1) / 86400000));
}

export function calculateExactAge(birth: Date, ref: Date): number {
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

function calcularTempoRPPSCertidao(d1: Date, d2: Date) {
  const d2_exclusive = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate() + 1);

  let years = 0;
  let months = 0;
  let current = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());

  while (true) {
    const nextYear = new Date(current.getFullYear() + 1, current.getMonth(), current.getDate());
    if (nextYear.getTime() <= d2_exclusive.getTime()) {
      current = nextYear;
      years++;
    } else {
      break;
    }
  }

  while (true) {
    const currentDay = current.getDate();
    const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, currentDay);
    if (nextMonth.getDate() < currentDay) {
      nextMonth.setDate(0);
    }
    if (nextMonth.getTime() <= d2_exclusive.getTime()) {
      current = nextMonth;
      months++;
    } else {
      break;
    }
  }

  const days = diffCalendarDays(current, d2_exclusive);
  return { years, months, days };
}

export function calcularDiasIncorporacao(
  inc: UnifiedSimulation['incorporacoes'][number],
  maxEndDate?: Date
): number {
  if (inc.useDates && inc.dataInicio && inc.dataFim) {
    const d1 = parseDate(inc.dataInicio);
    let d2 = parseDate(inc.dataFim);
    if (d1 && d2) {
      if (maxEndDate) {
        const utcStart = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
        const utcCutoff = Date.UTC(maxEndDate.getFullYear(), maxEndDate.getMonth(), maxEndDate.getDate());
        if (utcStart > utcCutoff) return 0;
        const utcEnd = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
        if (utcEnd > utcCutoff) {
          d2 = new Date(maxEndDate.getFullYear(), maxEndDate.getMonth(), maxEndDate.getDate());
        }
      }
      if (diffCalendarDays(d1, d2) >= 0 && Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate()) >= Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate())) {
        const rpps = calcularTempoRPPSCertidao(d1, d2);
        return (rpps.years * 365) + (rpps.months * 30) + rpps.days;
      }
      return 0;
    }
  }
  return ((inc.years || 0) * 365) + ((inc.months || 0) * 30) + (inc.days || 0);
}

const formatarYMD = (totalDias: number) => {
  const anos = Math.floor(totalDias / 365);
  const meses = Math.floor((totalDias % 365) / 30);
  const dias = (totalDias % 365) % 30;
  return `${anos}a ${meses}m ${dias}d`;
};

const decompDias = (totalDias: number) => {
  const safe = Math.max(0, Math.round(totalDias));
  const anos = Math.floor(safe / 365);
  const rem = safe % 365;
  const meses = Math.floor(rem / 30);
  const dias = rem % 30;
  return { anos, meses, dias, totalDias: safe };
};

const MESES_PT_MAP: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12
};

function parseCompetencyMonthIndex(rawTokenA: string, rawTokenB: string, yearFirst = false): number | null {
  const mesRaw = yearFirst ? rawTokenB : rawTokenA;
  const anoRaw = yearFirst ? rawTokenA : rawTokenB;

  const mesNorm = mesRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  let mes = MESES_PT_MAP[mesNorm.slice(0, 3)] ?? parseInt(mesNorm, 10);
  if (isNaN(mes) || mes < 1 || mes > 12) return null;

  let ano = parseInt(anoRaw.trim(), 10);
  if (isNaN(ano)) return null;
  if (anoRaw.trim().length === 2) {
    ano = ano >= 40 ? 1900 + ano : 2000 + ano;
  }
  if (ano < 1940 || ano > 2100) return null;

  return ano * 12 + (mes - 1);
}

function formatCompIndex(idx: number): string {
  const ano = Math.floor(idx / 12);
  const mes = (idx % 12) + 1;
  return `${String(mes).padStart(2, '0')}/${ano}`;
}

/**
 * Extrai e agrupa em intervalos contínuos (ex: "01/1998 a 03/2015; 06/2015 a 12/2017")
 * os períodos informados nas linhas da averbação de contribuição.
 */
export function extrairPeriodosDeCompetencias(valor?: string): string {
  if (!valor || typeof valor !== 'string') return '';
  const lines = valor
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  const explicitRanges: string[] = [];
  const compSet = new Set<number>();

  const explicitRangeRegex = /^(\d{2}\/\d{2}\/\d{4})\s*(?:a|até|-)\s*(\d{2}\/\d{2}\/\d{4})$/i;
  const dateComDiaRegex = /\b(\d{1,2})[\/\-](\d{1,2}|[a-zA-ZçÇãõáéíóúâêô]{3,12})[\/\-](\d{2}|\d{4})\b/i;
  const dateSemDiaRegex = /\b(\d{1,2}|[a-zA-ZçÇãõáéíóúâêô]{3,12})[\/\-](\d{2}|\d{4})\b/i;
  const dateYearMonthRegex = /\b(\d{4})[\/\-](\d{1,2})\b/;

  for (const line of lines) {
    const mExplicit = line.match(explicitRangeRegex);
    if (mExplicit) {
      explicitRanges.push(`${mExplicit[1]} a ${mExplicit[2]}`);
      continue;
    }

    const mComDia = line.match(dateComDiaRegex);
    if (mComDia) {
      const idx = parseCompetencyMonthIndex(mComDia[2], mComDia[3], false);
      if (idx !== null) compSet.add(idx);
      continue;
    }

    const mSemDia = line.match(dateSemDiaRegex);
    if (mSemDia) {
      const idx = parseCompetencyMonthIndex(mSemDia[1], mSemDia[2], false);
      if (idx !== null) compSet.add(idx);
      continue;
    }

    const mYearMonth = line.match(dateYearMonthRegex);
    if (mYearMonth) {
      const idx = parseCompetencyMonthIndex(mYearMonth[1], mYearMonth[2], true);
      if (idx !== null) compSet.add(idx);
    }
  }

  const parts: string[] = [...explicitRanges];
  if (compSet.size > 0) {
    const sorted = Array.from(compSet).sort((a, b) => a - b);
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === rangeEnd + 1) {
        rangeEnd = sorted[i];
      } else {
        parts.push(
          rangeStart === rangeEnd
            ? formatCompIndex(rangeStart)
            : `${formatCompIndex(rangeStart)} a ${formatCompIndex(rangeEnd)}`
        );
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }
    parts.push(
      rangeStart === rangeEnd
        ? formatCompIndex(rangeStart)
        : `${formatCompIndex(rangeStart)} a ${formatCompIndex(rangeEnd)}`
    );
  }

  return parts.join('; ');
}

export function extrairTemposIncorporacoes(
  incorporacoes: UnifiedSimulation['incorporacoes'] | undefined,
  includeSimulated = true,
  maxEndDate?: Date
) {
  let diasFicto = 0;
  let diasRecibado = 0;
  let diasOutrasEst = 0;
  let diasOutrasCLT = 0;
  let diasPenalidades = 0;
  let diasINSSIncs = 0;
  const inssDescs: string[] = [];

  const activeIncs = (incorporacoes || []).filter(inc =>
    includeSimulated ? true : inc.status !== 'simular'
  );

  for (const inc of activeIncs) {
    const t = (inc.tipo || '').toLowerCase();
    const n = (inc.nome || '').toLowerCase();
    const dias = calcularDiasIncorporacao(inc, maxEndDate);

    const isPenalidade =
      t.includes('falta') || t.includes('suspens') || t.includes('penalidade') ||
      n.includes('falta') || n.includes('suspens');
    if (isPenalidade) {
      diasPenalidades += dias;
      continue;
    }

    const isFicta =
      t.includes('licenca') || t.includes('licença') || t.includes('premio') ||
      t.includes('prêmio') || t.includes('ficto') || t.includes('fícto') ||
      n.includes('licença') || n.includes('licenca') || n.includes('premio') || n.includes('prêmio');
    if (isFicta) {
      diasFicto += dias;
      continue;
    }

    const isRecibado = t.includes('recibado') || n.includes('recibado');
    if (isRecibado) {
      diasRecibado += dias;
      continue;
    }

    const isINSS =
      t === 'contribution-only' ||
      t === 'pre-1994' ||
      t.includes('inss') ||
      t.includes('rgps') ||
      (t !== 'all-effects' && (n.includes('inss') || n.includes('rgps')));
    if (isINSS) {
      diasINSSIncs += dias;
      if (dias > 0) {
        const nomeLimpo = (inc.nome || '').trim();
        const hasDates = Boolean(inc.dataInicio && inc.dataFim);
        const periodoPorDatas = hasDates ? `${formatBR(inc.dataInicio)} a ${formatBR(inc.dataFim)}` : '';
        const periodoTempoManual = (inc.periodoDescricao || '').trim();
        const periodoContagem = inc.useDates
          ? periodoPorDatas || periodoTempoManual
          : periodoTempoManual || periodoPorDatas;
        const periodoPorCompetencias = extrairPeriodosDeCompetencias(inc.valor);
        const periodoFinal = periodoContagem || periodoPorCompetencias;

        if (nomeLimpo && periodoFinal) {
          if (nomeLimpo.includes(periodoFinal)) {
            inssDescs.push(nomeLimpo);
          } else {
            inssDescs.push(`${nomeLimpo} (${periodoFinal})`);
          }
        } else if (periodoFinal) {
          inssDescs.push(periodoFinal);
        } else if (nomeLimpo) {
          inssDescs.push(nomeLimpo);
        } else if (t === 'contribution-only') {
          inssDescs.push(`Tempo e contribuição pós-07/1994 (${formatarYMD(dias)})`);
        } else if (t === 'pre-1994') {
          inssDescs.push(`Apenas tempo pré-07/1994 (${formatarYMD(dias)})`);
        } else {
          inssDescs.push(`CTC/INSS averbada (${formatarYMD(dias)})`);
        }
      }
      continue;
    }

    const isCLT =
      (t.includes('clt') || n.includes('clt')) &&
      !t.includes('municipal') &&
      !n.includes('municipal');
    if (isCLT) {
      diasOutrasCLT += dias;
      continue;
    }

    const isEstatutario =
      t === 'all-effects' ||
      ((t.includes('estatut') || n.includes('estatut')) && !t.includes('cmc') && !n.includes('cmc'));
    if (isEstatutario) {
      diasOutrasEst += dias;
    }
  }

  return {
    diasFicto,
    diasRecibado,
    diasOutrasEst,
    diasOutrasCLT,
    diasPenalidades,
    diasINSSIncs,
    inssDesc: inssDescs.join('; ')
  };
}

function calcularAtsPercentualNaData(
  sim: UnifiedSimulation,
  dataRef: Date,
  anosCMC: number
): number {
  const initialAtsNum = sim.lastAtsNumber ?? 0;
  const baseDateStr = sim.lastAtsConcession || sim.ingressoCmc || '';
  if (sim.lastAtsConcession) {
    const baseDate = parseDate(sim.lastAtsConcession);
    if (baseDate) {
      const totalMonths =
        (dataRef.getFullYear() - baseDate.getFullYear()) * 12 +
        (dataRef.getMonth() - baseDate.getMonth()) -
        (dataRef.getDate() < baseDate.getDate() ? 1 : 0);
      const additionalAts = Math.max(0, Math.floor(totalMonths / 60));
      const finalAts = Math.min(10, Math.max(0, initialAtsNum) + additionalAts);
      return Math.round((ATS_PERCENTAGES[finalAts] ?? 0) * 100);
    }
  }
  if (initialAtsNum > 0) {
    return Math.min(50, Math.round(initialAtsNum * 5));
  }
  if (baseDateStr) {
    return Math.min(50, Math.floor(anosCMC / 5) * 5);
  }
  return 0;
}

/**
 * Constrói o objeto completo de CertidaoData a partir de uma Simulação Unificada
 * IMPORTANTE: Para certidões, o tempo computado é SEMPRE o tempo decorrido ATUAL 
 * até a data de emissão do documento, e NÃO a data de projeção de aposentadoria futura.
 */
export function construirCertidaoAPartirDeSimulacao(
  sim: UnifiedSimulation, 
  options?: {
    tipo?: 'oficial' | 'simulacao';
    tipoCertidao?: 'aposentadoria' | 'abono_permanencia';
    numeroPersonalizado?: string;
    dataCertidaoPersonalizada?: string;
  }
): CertidaoData {
  const tipo = options?.tipo || 'simulacao';
  const tipoCertidao = options?.tipoCertidao || 'aposentadoria';
  
  // Data de referência de corte da certidão: a data de emissão do documento (hoje ou personalizada)
  const dataReferenciaEmissao = parseDate(options?.dataCertidaoPersonalizada) || new Date();
  const emissaoStr = options?.dataCertidaoPersonalizada || formatDateObjBR(dataReferenciaEmissao);
  const emissaoExtenso = `${dataReferenciaEmissao.getDate()} de ${dataReferenciaEmissao.toLocaleDateString('pt-BR', { month: 'long' })} de ${dataReferenciaEmissao.getFullYear()}`;
  const date31Dez2021 = new Date(2021, 11, 31);
  const cutoff2021 =
    Date.UTC(dataReferenciaEmissao.getFullYear(), dataReferenciaEmissao.getMonth(), dataReferenciaEmissao.getDate()) <
    Date.UTC(2021, 11, 31)
      ? dataReferenciaEmissao
      : date31Dez2021;

  // 1. Idade na data de emissão e em 31/12/2021
  let idadeHoje = 0;
  let idade31Dez2021 = 0;
  if (sim.dataNascimento) {
    const bDate = parseDate(sim.dataNascimento);
    if (bDate) {
      idadeHoje = calculateExactAge(bDate, dataReferenciaEmissao);
      idade31Dez2021 = calculateExactAge(bDate, date31Dez2021);
    }
  }

  // 2. Tempo Estatutário na CMC (de admissão estatutária até a data de emissão da certidão)
  const dataEstatutario = sim.ingressoCargoAtual || sim.ingressoCmc || '';
  const dateInicioEstatutario = parseDate(dataEstatutario);
  const diasCMC = dateInicioEstatutario ? diffCalendarDays(dateInicioEstatutario, dataReferenciaEmissao) : 0;
  const cmcDec = decompDias(diasCMC);
  const periodoCMC = dataEstatutario ? `${formatBR(dataEstatutario)} a ${emissaoStr}` : '';

  // Tempo no cargo efetivo CMC até 31/12/2021
  const diasCMCAte31Dez2021 =
    dateInicioEstatutario &&
    Date.UTC(dateInicioEstatutario.getFullYear(), dateInicioEstatutario.getMonth(), dateInicioEstatutario.getDate()) <=
      Date.UTC(cutoff2021.getFullYear(), cutoff2021.getMonth(), cutoff2021.getDate())
      ? diffCalendarDays(dateInicioEstatutario, cutoff2021)
      : 0;
  const diferencaDiasPos2021 = Math.max(0, diasCMC - diasCMCAte31Dez2021);

  const includeSimulated = tipo !== 'oficial';
  const incs = extrairTemposIncorporacoes(sim.incorporacoes, includeSimulated);
  const incsAte2021 = extrairTemposIncorporacoes(sim.incorporacoes, includeSimulated, cutoff2021);

  // 3. Tempo Fícto (licenças-prêmio incorporadas – CMC)
  const diasFicto = incs.diasFicto;
  const fictoDec = decompDias(diasFicto);

  // 4. Tempo de Serviço Público Municipal (Recibado)
  const diasRecibado = incs.diasRecibado;
  const recibadoDec = decompDias(diasRecibado);

  // 5. Tempo de Serviço Público Municipal (CLT) incorporado
  let diasCLT = sim.diasAverbadosSP || 0;
  let diasCLTAte2021 = sim.diasAverbadosSP || 0;
  let periodoCLT = '';
  if (sim.ingressoCmc && sim.ingressoCargoAtual && sim.ingressoCmc < sim.ingressoCargoAtual) {
    const dIngresso = parseDate(sim.ingressoCmc);
    const dCargo = parseDate(sim.ingressoCargoAtual);
    if (dIngresso && dCargo) {
      const dVespera = new Date(dCargo.getFullYear(), dCargo.getMonth(), dCargo.getDate() - 1);
      const diasIntervalo = diffCalendarDays(dIngresso, dCargo);
      diasCLT = Math.max(diasCLT, diasIntervalo);
      periodoCLT = `${formatBR(sim.ingressoCmc)} a ${formatDateObjBR(dVespera)}`;

      const utcIng = Date.UTC(dIngresso.getFullYear(), dIngresso.getMonth(), dIngresso.getDate());
      const utcCut = Date.UTC(cutoff2021.getFullYear(), cutoff2021.getMonth(), cutoff2021.getDate());
      if (utcIng <= utcCut) {
        const dFim2021 =
          Date.UTC(dCargo.getFullYear(), dCargo.getMonth(), dCargo.getDate()) <= utcCut ? dCargo : cutoff2021;
        diasCLTAte2021 = Math.max(sim.diasAverbadosSP || 0, diffCalendarDays(dIngresso, dFim2021));
      } else {
        diasCLTAte2021 = 0;
      }
    }
  } else if (diasCLT > 0) {
    periodoCLT = 'Tempo averbado de serviço público anterior';
  }
  const cltDec = decompDias(diasCLT);

  // 6. Outras incorporações Estatutário
  const diasOutrasEst = incs.diasOutrasEst;
  const outrasEstDec = decompDias(diasOutrasEst);

  // 7. Outras incorporações CLT
  const diasOutrasCLT = incs.diasOutrasCLT;
  const outrasCLTDec = decompDias(diasOutrasCLT);

  // 8. Afastamentos sem vencimento
  const diasAfastamento = sim.diasAfastamento || 0;
  const afastDec = decompDias(diasAfastamento);

  // 9. Penalidades Administrativas
  const diasPenalidades = incs.diasPenalidades;
  const penalDec = decompDias(diasPenalidades);

  // 10. Subtotal: TEMPO TOTAL DE SERVIÇO PÚBLICO
  const totalPublicoDias = Math.max(
    0,
    diasCMC + diasFicto + diasRecibado + diasCLT + diasOutrasEst + diasOutrasCLT - diasAfastamento - diasPenalidades
  );
  const publicoDec = decompDias(totalPublicoDias);

  // 11. INSS / Iniciativa Privada
  const diasINSS = (sim.diasAverbadosINSS || 0) + incs.diasINSSIncs;
  const inssDecObj = decompDias(diasINSS);

  let inssDesc = incs.inssDesc;
  if (!inssDesc && diasINSS > 0) {
    inssDesc = 'Certidão de Tempo de Contribuição CTC/INSS averbada';
  }

  // 12. Total Geral: TEMPO TOTAL DE SERVIÇO / CONTRIBUIÇÃO
  const totalGeralDias = totalPublicoDias + diasINSS;
  const geralDec = decompDias(totalGeralDias);

  // Marco Temporal Consolidado em 31/12/2021 (considerando todos os tempos e averbações até 31/12/2021)
  const totalPublicoAte2021 = Math.max(
    0,
    diasCMCAte31Dez2021 +
      incsAte2021.diasFicto +
      incsAte2021.diasRecibado +
      diasCLTAte2021 +
      incsAte2021.diasOutrasEst +
      incsAte2021.diasOutrasCLT -
      diasAfastamento -
      incsAte2021.diasPenalidades
  );
  const diasINSSAte2021 = (sim.diasAverbadosINSS || 0) + incsAte2021.diasINSSIncs;
  const diasTotalAte31Dez2021 = Math.max(0, totalPublicoAte2021 + diasINSSAte2021);

  const dataAdmissaoSP = sim.ingressoCmc ? formatBR(sim.ingressoCmc) : formatBR(dataEstatutario);
  const cargoDisplay = getCareerDisplayName(sim.cargo || sim.selectedCareer) || 'Servidor Público Municipal';

  // Definição do Número
  let numero = options?.numeroPersonalizado;
  if (!numero) {
    if (tipo === 'simulacao') {
      numero = 'SIMULAÇÃO';
    } else {
      numero = getProximoNumeroOficial(tipoCertidao);
    }
  }

  return {
    numeroCertidao: numero,
    dataCertidao: emissaoStr,
    isSimulacao: tipo === 'simulacao',
    tipoCertidao: tipoCertidao,
    servidor: {
      nome: sim.nome || 'Servidor Municipal',
      rg: sim.rg || '',
      cpf: sim.cpf || '',
      sexo: sim.sexo === 'F' ? 'Feminino' : 'Masculino',
      matricula: sim.matricula || '',
      dataNascimento: formatBR(sim.dataNascimento) || '',
      idadeHoje,
      idadeEm31Dez2021: idade31Dez2021,
      orgao: 'Câmara Municipal de Curitiba',
      cargo: cargoDisplay,
      padrao: sim.padrao || getPatternForCareer(sim.selectedCareer || sim.cargo) || '',
      referencia: sim.referencia || sim.selectedLevel || 'I',
      dataAdmissaoServicoPublico: dataAdmissaoSP,
      dataAdmissaoEstatutario: formatBR(dataEstatutario),
      dataRequerimento: emissaoStr,
      registroTribunalContas: sim.registroTribunalContas || ''
    },
    marcos: {
      diasAteEmissao: diasCMC,
      diasAte31Dez2021: diasTotalAte31Dez2021,
      diferencaDias: diferencaDiasPos2021
    },
    gradeTempo: {
      tempoEstatutarioCMC: {
        ...cmcDec,
        periodoDesc: periodoCMC
      },
      tempoFictoLicencaPremio: {
        ...fictoDec,
        obs: 'Licenças-prêmio incorporadas – CMC'
      },
      tempoServicoPublicoRecibado: {
        ...recibadoDec
      },
      tempoServicoPublicoCLT: {
        ...cltDec,
        periodoDesc: periodoCLT
      },
      outrasIncorporacoesEstatutario: {
        ...outrasEstDec
      },
      outrasIncorporacoesCLT: {
        ...outrasCLTDec
      },
      afastamentosSemVencimento: {
        ...afastDec
      },
      penalidadesAdministrativas: {
        ...penalDec
      },
      tempoTotalServicoPublico: {
        ...publicoDec
      },
      tempoINSSPrivada: {
        ...inssDecObj,
        periodoDesc: inssDesc
      },
      tempoTotalServicoContribuicao: {
        ...geralDec
      }
    },
    temposExercicio: {
      servicoPublicoTotal: {
        ...publicoDec,
        periodoDesc: dataAdmissaoSP ? `${dataAdmissaoSP} a ${emissaoStr}` : ''
      },
      cargoEfetivoTotal: {
        ...cmcDec,
        periodoDesc: periodoCMC
      }
    },
    regrasTransitorias: {
      atsPercentual: calcularAtsPercentualNaData(sim, dataReferenciaEmissao, cmcDec.anos),
      recebeAbono: false,
      dataAbono: '',
      idadeEm31Dez2021: idade31Dez2021,
      tempoEm31Dez2021Anos: Math.max(0, Math.floor(diasTotalAte31Dez2021 / 365))
    },
    lavratura: {
      cidade: 'Curitiba',
      data: emissaoExtenso,
      servidorNome: 'Setor de Gestão de Processos e Benefícios Funcionais',
      servidorMatricula: 'CMC/DGEP',
      setor: 'Diretoria de Gestão de Pessoas — DGEP'
    }
  };
}

/**
 * Emite uma Certidão de Simulação (sem consumir controle numérico) e registra no histórico
 */
export function emitirCertidaoSimulacao(sim: UnifiedSimulation, emitidoPor?: string): CertidaoData {
  const certidaoData = construirCertidaoAPartirDeSimulacao(sim, { tipo: 'simulacao', numeroPersonalizado: 'SIMULAÇÃO' });
  
  gerarCertidaoAposentadoriaPadraoPDF(certidaoData);

  const grade = certidaoData.gradeTempo.tempoTotalServicoContribuicao;
  const registro: CertidaoEmitida = {
    id: `sim_${Date.now()}`,
    numeroCertidao: 'SIMULAÇÃO',
    tipo: 'simulacao',
    dataCertidao: certidaoData.dataCertidao,
    dataEmissaoTimestamp: new Date().toISOString(),
    servidorNome: certidaoData.servidor.nome,
    matricula: certidaoData.servidor.matricula,
    cargo: certidaoData.servidor.cargo,
    tempoTotalDias: grade.totalDias,
    tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
    emitidoPor: emitidoPor || 'Sistema DGEP',
    snapshot: certidaoData
  };

  salvarCertidaoEmitida(registro);
  return certidaoData;
}

/**
 * Emite uma Certidão Oficial com controle numérico sequencial e registra no histórico
 */
export function emitirCertidaoOficial(sim: UnifiedSimulation, emitidoPor?: string, numeroDefinido?: string): CertidaoData {
  const proximoSugerido = getProximoNumeroOficial('aposentadoria');
  const numeroLimpo = (numeroDefinido || '').trim();
  const numero =
    !numeroLimpo || numeroLimpo === 'SIMULAÇÃO' || numeroLimpo === proximoSugerido
      ? consumirProximoNumeroOficial('aposentadoria')
      : numeroLimpo;
  const certidaoData = construirCertidaoAPartirDeSimulacao(sim, { tipo: 'oficial', tipoCertidao: 'aposentadoria', numeroPersonalizado: numero });

  gerarCertidaoAposentadoriaPadraoPDF(certidaoData);

  const grade = certidaoData.gradeTempo.tempoTotalServicoContribuicao;
  const registro: CertidaoEmitida = {
    id: `oficial_${Date.now()}`,
    numeroCertidao: numero,
    tipo: 'oficial',
    dataCertidao: certidaoData.dataCertidao,
    dataEmissaoTimestamp: new Date().toISOString(),
    servidorNome: certidaoData.servidor.nome,
    matricula: certidaoData.servidor.matricula,
    cargo: certidaoData.servidor.cargo,
    tempoTotalDias: grade.totalDias,
    tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
    emitidoPor: emitidoPor || 'Sistema DGEP',
    snapshot: certidaoData
  };

  salvarCertidaoEmitida(registro);
  return certidaoData;
}

/**
 * Emite uma Certidão de Abono de Permanência (Simulação)
 */
export function emitirCertidaoAbonoSimulacao(sim: UnifiedSimulation, emitidoPor?: string): CertidaoData {
  const certidaoData = construirCertidaoAPartirDeSimulacao(sim, { tipo: 'simulacao', tipoCertidao: 'abono_permanencia', numeroPersonalizado: 'SIMULAÇÃO' });
  gerarCertidaoAposentadoriaPadraoPDF(certidaoData);

  const grade = certidaoData.gradeTempo.tempoTotalServicoContribuicao;
  const registro: CertidaoEmitida = {
    id: `sim_abono_${Date.now()}`,
    numeroCertidao: 'SIMULAÇÃO (ABONO)',
    tipo: 'simulacao',
    dataCertidao: certidaoData.dataCertidao,
    dataEmissaoTimestamp: new Date().toISOString(),
    servidorNome: certidaoData.servidor.nome,
    matricula: certidaoData.servidor.matricula,
    cargo: certidaoData.servidor.cargo,
    tempoTotalDias: grade.totalDias,
    tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
    emitidoPor: emitidoPor || 'Sistema DGEP',
    snapshot: certidaoData
  };

  salvarCertidaoEmitida(registro);
  return certidaoData;
}

/**
 * Emite uma Certidão Oficial de Abono de Permanência com controle numérico sequencial
 */
export function emitirCertidaoAbonoOficial(sim: UnifiedSimulation, emitidoPor?: string, numeroDefinido?: string): CertidaoData {
  const proximoSugerido = getProximoNumeroOficial('abono_permanencia');
  const numeroLimpo = (numeroDefinido || '').trim();
  const numero =
    !numeroLimpo || numeroLimpo === 'SIMULAÇÃO' || numeroLimpo === proximoSugerido
      ? consumirProximoNumeroOficial('abono_permanencia')
      : numeroLimpo;
  const certidaoData = construirCertidaoAPartirDeSimulacao(sim, { tipo: 'oficial', tipoCertidao: 'abono_permanencia', numeroPersonalizado: numero });
  gerarCertidaoAposentadoriaPadraoPDF(certidaoData);

  const grade = certidaoData.gradeTempo.tempoTotalServicoContribuicao;
  const registro: CertidaoEmitida = {
    id: `oficial_abono_${Date.now()}`,
    numeroCertidao: numero,
    tipo: 'oficial',
    dataCertidao: certidaoData.dataCertidao,
    dataEmissaoTimestamp: new Date().toISOString(),
    servidorNome: certidaoData.servidor.nome,
    matricula: certidaoData.servidor.matricula,
    cargo: certidaoData.servidor.cargo,
    tempoTotalDias: grade.totalDias,
    tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
    emitidoPor: emitidoPor || 'Sistema DGEP',
    snapshot: certidaoData
  };

  salvarCertidaoEmitida(registro);
  return certidaoData;
}
