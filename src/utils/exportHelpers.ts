import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { UnifiedSimulation } from './simulationsStore';

// Common currency formatter helper
const formatCurrency = (val: number | undefined): string => {
  if (val === undefined || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Common date formatter
const formatDate = (dateVal: any): string => {
  if (!dateVal) return 'N/A';
  try {
    if (dateVal instanceof Date) {
      const d = String(dateVal.getDate()).padStart(2, '0');
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const y = dateVal.getFullYear();
      return `${d}/${m}/${y}`;
    }
    const dateStr = String(dateVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (dateStr.includes('T')) {
      const datePart = dateStr.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const parts = datePart.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch (e) {
    return String(dateVal);
  }
};

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

const calcularIdadeCompleta = (dataNasc: string | undefined, dataRef: Date | undefined): string => {
  if (!dataNasc || !dataRef) return 'N/A';
  try {
    const nasc = new Date(dataNasc.includes('T') ? dataNasc : `${dataNasc}T00:00:00`);
    if (isNaN(nasc.getTime())) return 'N/A';
    
    let y = dataRef.getFullYear() - nasc.getFullYear();
    let m = dataRef.getMonth() - nasc.getMonth();
    let d = dataRef.getDate() - nasc.getDate();
    if (d < 0) {
      m--;
      const prevMonth = new Date(dataRef.getFullYear(), dataRef.getMonth(), 0);
      d += prevMonth.getDate();
    }
    if (m < 0) {
      y--;
      m += 12;
    }
    const yStr = y === 1 ? '1 ano' : `${y} anos`;
    const mStr = m === 1 ? '1 mês' : `${m} meses`;
    const dStr = d === 1 ? '1 dia' : `${d} dias`;
    
    if (y === 0 && m === 0) return dStr;
    if (y === 0) return `${mStr} e ${dStr}`;
    return `${yStr}, ${mStr} e ${dStr}`;
  } catch (e) {
    return 'N/A';
  }
};

/**
 * EXPORT TO PDF
 */
export function exportToPDF(
  sim: UnifiedSimulation,
  regrasResults: any[],
  geResults: any,
  proventosResults: any,
  calculatedDiasSP: number,
  calculatedDiasINSS: number,
  opts?: any
) {
  const showGE = opts?.ge !== false;
  // Create jsPDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const activeRule = regrasResults.find((r: any) => r.isVantajosa);
  const endDate = (activeRule && activeRule.aplicavel && activeRule.data) ? new Date(activeRule.data) : new Date();
  
  const adm = sim.ingressoCmc ? new Date(sim.ingressoCmc + 'T00:00:00') : new Date();
  const timeInDays = sim.ingressoCmc ? (endDate.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24) : 0;
  
  const totalDiasSPConsolidado = Math.max(0, timeInDays + calculatedDiasSP - (sim.diasAfastamento || 0));
  const totalDiasContribConsolidado = Math.max(0, timeInDays + calculatedDiasSP + calculatedDiasINSS - (sim.diasAfastamento || 0));

  // Top header bar
  doc.setFillColor(0, 75, 141); // Deep Blue #004b8d
  doc.rect(0, 0, 210, 28, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('DGEP - APOSENTADORIA E PROVENTOS', 15, 11);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 220, 255);
  doc.text('Câmara Municipal de Curitiba | Diretoria de Gestão de Pessoas', 15, 17);
  doc.text('Dossiê Analítico de Simulação de Aposentadoria', 15, 22);

  // Box 0: Server Identity Block
  const serverDetailsGrid = [
    ['Servidor:', sim.nome || 'NÃO IDENTIFICADO', 'Matrícula:', sim.matricula || 'N/A'],
    ['Cargo Atual:', (sim.cargo || sim.selectedCareer || '').replace(/_/g, ' ') + ' / ' + (sim.selectedLevel || ''), 'Gênero/Sexo:', sim.sexo || 'N/A'],
    ['Data Nasc.:', formatDate(sim.dataNascimento), 'Admissão CMC:', formatDate(sim.ingressoCmc), ],
    ['Tempo Município:', formatarTempoCompleto(Math.floor(totalDiasSPConsolidado)), 'Averbado (INSS):', formatarTempoCompleto(calculatedDiasINSS)],
    ['Deduções/Afastam.:', formatarTempoCompleto(sim.diasAfastamento || 0), 'Total Consolidado:', formatarTempoCompleto(Math.floor(totalDiasContribConsolidado))]
  ];

  if (sim.congelada) {
    serverDetailsGrid.push([
      'SITUAÇÃO:',
      `CONGELADA (Fatores RF: ${sim.fatoresCongeladosMonthYear || 'N/A'})`,
      'Data de Fechamento:',
      formatDate(sim.updatedAt)
    ]);
  }

  autoTable(doc, {
    startY: 33,
    margin: { left: 15, right: 15 },
    head: [[{ content: 'IDENTIFICAÇÃO DO SERVIDOR E TEMPOS DE CONTRIBUIÇÃO', colSpan: 4, styles: { halign: 'left', fillColor: [55, 65, 81] } }]],
    body: serverDetailsGrid,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, font: 'Helvetica' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { fontStyle: 'bold', cellWidth: 30 },
      3: { cellWidth: 60 }
    }
  });

  // Box 1: IPMC Rules Compatibility Grid
  const rulesRows = regrasResults.map((r: any) => {
    const isApplicable = !!r.aplicavel;
    const status = isApplicable ? (r.isVantajosa ? 'SIM (Mais Vantajosa)' : 'SIM') : 'NÃO COMPATÍVEL';
    const evalDate = isApplicable ? (r.data ? formatDate(r.data) : 'Imediata') : 'N/A';
    const proventos = r.proventos || 'N/A';
    
    let idade = 'N/A';
    if (isApplicable && r.detalhes?.idade) {
      const fullAge = calcularIdadeCompleta(sim.dataNascimento, r.data);
      idade = `${r.detalhes.idade} anos\n(${fullAge})`;
    }
    
    let pontos = 'N/A';
    if (isApplicable && r.nome === "Regra de Pontos (Art. 10)" && r.detalhes?.pontos) {
      pontos = `${r.detalhes.pontos.toFixed(2)} pts`;
    } else if (isApplicable) {
      pontos = 'N/A (S/ Pontos)';
    }

    const pendencias = isApplicable ? 'Requisitos atingidos' : (r.motivo || 'Faltam requisitos constitutivos');
    return [r.nome, status, evalDate, proventos, idade, pontos, pendencias];
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    margin: { left: 15, right: 15 },
    head: [
      [{ content: '1. ELEGIBILIDADE E REGRAS DE TRANSIÇÃO (PREVIDÊNCIA IPMC)', colSpan: 7, styles: { halign: 'left', fillColor: [0, 75, 141] } }],
      ['Regra Previdenciária', 'Aplicável', 'Data Elegibilidade', 'Regência Proventos', 'Idade Mín.', 'Pontos', 'Observações / Motivos impeditivos']
    ],
    body: rulesRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, font: 'Helvetica' },
    headStyles: { fontStyle: 'bold', fillColor: [0, 75, 141] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18 },
      4: { cellWidth: 32 },
      5: { cellWidth: 19 },
      6: { cellWidth: 40 }
    }
  });

  // Box 2: Gratificação Especial Retributiva (GE)
  if (showGE && geResults && (geResults.fgs.length > 0 || geResults.stims.length > 0)) {
    const geRows: any[] = [];
    
    geResults.fgs.forEach((fg: any) => {
      geRows.push(['FG / Cargo em Comissão', `${fg.nivel} (Incorporado de forma proporcional)`, `${fg.meses} meses`, `+ R$ ${formatCurrency(fg.inc)}`]);
    });
    
    geResults.stims.forEach((s: any) => {
      geRows.push(['Estímulo Acadêmico', `${s.tipo.replace('_', ' ').toUpperCase()} (${(s.perc * 100).toFixed(0)}%)`, `${s.meses} meses`, `+ R$ ${formatCurrency(s.inc)}`]);
    });
    
    geRows.push([{ content: 'VALOR INTEGRAL RETRIBUTIVO INCORPORADO (GE):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `R$ ${formatCurrency(geResults.totalFGs + geResults.totalStims)}`, styles: { fontStyle: 'bold', textColor: [0, 75, 141], halign: 'right' } }]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      margin: { left: 15, right: 15 },
      head: [
        [{ content: '2. INCORPORAÇÃO DE PARCELAS EXTRAORDINÁRIAS - GRATIFICAÇÃO ESPECIAL (GE)', colSpan: 4, styles: { halign: 'left', fillColor: [0, 75, 141] } }],
        ['Modalidade de Incorporação', 'Detalhamento Técnico', 'Carência Mensal', 'Ganho Estimado (R$)']
      ],
      body: geRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.8, font: 'Helvetica' },
      headStyles: { fontStyle: 'bold', fillColor: [0, 75, 141] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 35 },
        1: { cellWidth: 75 },
        2: { cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 }
      }
    });
  }

  // Box 3: Estimativa de Proventos a Conceder - Emphasizing Optimized Scenario
  const hasOpt = proventosResults.optimizationResult && proventosResults.optimizationResult.bestK > 0;
  const totalGEToAdd = (showGE && geResults ? (geResults.totalFGs + geResults.totalStims) : 0);
  
  let proventosHeaders = ['Parâmetro de Cálculo', 'Valor Mensal Estimado'];
  let proventosRows: any[] = [];
  let colStyles: any = {
    0: { fontStyle: 'bold', cellWidth: 120 },
    1: { fontStyle: 'bold', halign: 'right', cellWidth: 60 }
  };

  if (hasOpt) {
    const opt = proventosResults.optimizationResult;
    proventosHeaders = ['Dimensão / Rubrica de Cálculo', 'Cenário Tradicional (Sem Exclusão)', 'Cenário Otimizado (Recomendado - §10)'];
    proventosRows = [
      ['Média Salarial Apurada:', `R$ ${formatCurrency(opt.originalAverage)}`, `R$ ${formatCurrency(opt.bestAverage)}`],
      ['Alíquota Base / Coeficiente:', `${(opt.originalPerc * 100).toFixed(2)}%`, `${(opt.bestPerc * 100).toFixed(2)}% (perda de ${opt.bestK} m)`],
      ['Provento Mensal Básico:', `R$ ${formatCurrency(opt.originalBenefit)}`, `R$ ${formatCurrency(opt.bestBenefit)}`],
    ];
    if (totalGEToAdd > 0) {
      proventosRows.push(['Plus Gratificação Especial (GE):', `R$ ${formatCurrency(totalGEToAdd)}`, `R$ ${formatCurrency(totalGEToAdd)}`]);
      proventosRows.push(['PROVENTOS ESTIMADOS COMBINADOS:', `R$ ${formatCurrency(opt.originalBenefit + totalGEToAdd)}`, `R$ ${formatCurrency(opt.bestBenefit + totalGEToAdd)}`]);
    }
    colStyles = {
      0: { fontStyle: 'bold', cellWidth: 65 },
      1: { cellWidth: 55, halign: 'right' },
      2: { fontStyle: 'bold', cellWidth: 60, halign: 'right' }
    };
  } else {
    proventosRows = [
      ['Média Salarial Geral Estimada (§2º, Art. 15 da L.C. 133/21):', `R$ ${formatCurrency(proventosResults.average)}`],
      ['Alíquota Base / Cota Progressiva de Transição (EC 103/19):', `${(proventosResults.perc * 100).toFixed(2)}%`],
      ['Provento Mensal Básico Estimado (Média x Alíquota):', `R$ ${formatCurrency(proventosResults.benefit)}`],
    ];
    if (totalGEToAdd > 0) {
      proventosRows.push(['Plus Gratificação Especial Retributiva Incorporada (GE):', `R$ ${formatCurrency(totalGEToAdd)}`]);
      proventosRows.push(['PROVENTOS FINAIS COMBINADOS EXERCÍCIO (Média Cota + GE):', `R$ ${formatCurrency(proventosResults.benefit + totalGEToAdd)}`]);
    }
  }

  const proventosHead: any[] = [
    [{ content: '3. DEMONSTRATIVO FINANCEIRO ESTIMADO DE PROVENTOS', colSpan: hasOpt ? 3 : 2, styles: { halign: 'left', fillColor: [16, 185, 129] as [number, number, number] } }]
  ];
  if (hasOpt) {
    proventosHead.push(proventosHeaders);
  }

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    margin: { left: 15, right: 15 },
    head: proventosHead,
    body: proventosRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, font: 'Helvetica' },
    columnStyles: colStyles,
    didParseCell: (data: any) => {
      if (hasOpt) {
        // Highlight columns
        if (data.column.index === 2 && data.row.section === 'body') {
          data.cell.styles.fillColor = [209, 250, 229]; // light emerald/green bg for recommended column
          data.cell.styles.textColor = [6, 78, 59]; // dark green
        }
        // Bold and emphasis final result row
        if (data.row.index === proventosRows.length - 1 && data.row.section === 'body') {
          if (data.column.index === 1) {
            data.cell.styles.fillColor = [241, 245, 249];
          } else if (data.column.index === 2) {
            data.cell.styles.fillColor = [187, 247, 208]; // stronger green
            data.cell.styles.textColor = [5, 150, 105];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      } else {
        if (data.row.index === proventosRows.length - 1 && data.row.section === 'body') {
          data.cell.styles.fillColor = [209, 250, 229]; // light emerald
          data.cell.styles.textColor = [6, 78, 59];
        }
      }
    }
  });

  // Box 4: EXCLUSÃO COM LIMITE DE 20% DOS MENORES SALÁRIOS (§ 10 Art. 15 L.C. 133/21) [Moved here first!]
  if (hasOpt) {
    const opt = proventosResults.optimizationResult;
    const optRows: any[] = [
      ['Cenário Tradicional (Sem descartes)', `R$ ${formatCurrency(opt.originalAverage)}`, `${(opt.originalPerc * 100).toFixed(2)}%`, `R$ ${formatCurrency(opt.originalBenefit)}`],
      ['Cenário Otimizado com Descartes § 10', `R$ ${formatCurrency(opt.bestAverage)}`, `${(opt.bestPerc * 100).toFixed(2)}%`, `R$ ${formatCurrency(opt.bestBenefit)}`],
      ['GANHO FINANCEIRO LÍQUIDO MENSAL ADICIONAL:', { content: `+ R$ ${formatCurrency(opt.bestBenefit - opt.originalBenefit)}/mês à sua previdência!`, colSpan: 3, styles: { fontStyle: 'bold' as const, textColor: [16, 185, 129] } }]
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      margin: { left: 15, right: 15 },
      head: [
        [{ content: `4. EXCLUSÃO COM LIMITE DE 20% DOS MENORES SALÁRIOS (§ 10 Art. 15 L.C. 133/21) - CENÁRIO RECOMENDADO`, colSpan: 4, styles: { halign: 'left', fillColor: [79, 70, 229] } }],
        ['Cenário Analisado', 'Média Salarial Resultante', 'Alíquota Coeficiente', 'Provento de Benefício Mensal']
      ],
      body: optRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.8, font: 'Helvetica' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 35 }
      },
      didParseCell: (data: any) => {
        if (data.row.index === 1 && data.row.section === 'body') {
          data.cell.styles.fillColor = [224, 231, 255]; // light indigo bg for optimized
          data.cell.styles.textColor = [49, 46, 129];
        }
      }
    });

    // Code for list of excluded months
    const excludedList = opt.bestExcluded.map((exc: any) => `${exc.competencia}: R$ ${formatCurrency(exc.value)}`).join(' | ');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Competências indicadas para Descarte Previdenciário (para elevar sua média):', 15, (doc as any).lastAutoTable.finalY + 4.5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(excludedList, 15, (doc as any).lastAutoTable.finalY + 7.5, { maxWidth: 180 });
    
    // Update coordinates
    (doc as any).lastAutoTable = (doc as any).lastAutoTable || {};
    (doc as any).lastAutoTable.finalY = (doc as any).lastAutoTable.finalY + 9;
  }

  // Box 5: PROSPECÇÃO DE TRABALHO ADICIONAL [Moved here second!]
  const totalDays = timeInDays + calculatedDiasINSS + calculatedDiasSP;
  const yearsTotalBase = totalDays / 365.25;

  const selectedExt = sim.extensionMonths || 0;
  const extScenarios = [0, 12, 24, 36, 48];
  if (selectedExt > 0 && !extScenarios.includes(selectedExt)) {
    extScenarios.push(selectedExt);
    extScenarios.sort((a, b) => a - b);
  }

  const projectionRows = extScenarios.map((ext: number) => {
    const yearsTotalOriginalExt = yearsTotalBase + (ext / 12);
    let percOriginalExt = 0.60;
    if (sim.ingressoCmc) {
      percOriginalExt = 0.60 + (yearsTotalOriginalExt > 20 ? (Math.floor(yearsTotalOriginalExt) - 20) * 0.02 : 0);
      percOriginalExt = Math.min(Math.max(percOriginalExt, 0.60), 1.0);
    }
    const benefitOriginalExt = proventosResults.average * percOriginalExt;

    const yearsTotalOptimizedExt = Math.max(0, yearsTotalOriginalExt - (proventosResults.optimizationResult?.bestK || 0) / 12);
    let percOptimizedExt = 0.60;
    if (sim.ingressoCmc) {
      percOptimizedExt = 0.60 + (yearsTotalOptimizedExt > 20 ? (Math.floor(yearsTotalOptimizedExt) - 20) * 0.02 : 0);
      percOptimizedExt = Math.min(Math.max(percOptimizedExt, 0.60), 1.0);
    }
    const benefitOptimizedExt = (proventosResults.optimizationResult?.bestAverage || proventosResults.average) * percOptimizedExt;
    const diffValue = benefitOptimizedExt - benefitOriginalExt;

    const isSelected = ext === selectedExt;
    let label = '';
    if (ext === 0) {
      label = isSelected ? 'Elegibilidade Imediata (Cenário Ativo)' : 'Elegibilidade Imediata';
    } else {
      const anos = ext / 12;
      const anosStr = Number.isInteger(anos) ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : `${ext} meses`;
      label = isSelected 
        ? `+ ${anosStr} de trabalho (Cenário Ativo)`
        : `+ ${anosStr} de trabalho adicional`;
    }
    if (isSelected) {
      label = '★ ' + label;
    }

    return [
      label,
      `${(percOriginalExt * 100).toFixed(0)}%`,
      `R$ ${formatCurrency(benefitOriginalExt)}`,
      `R$ ${formatCurrency(benefitOptimizedExt)}`,
      `+ R$ ${formatCurrency(diffValue)}`
    ];
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    margin: { left: 15, right: 15 },
    head: [
      [{ content: '5. PROSPECÇÃO DE FUTURO: IMPACTO DE CONTINUAR TRABALHANDO MAIS TEMPO', colSpan: 5, styles: { halign: 'left', fillColor: [5, 150, 105] } }],
      ['Tempo de Serviço Adicional', 'Quota Coeficiente', 'Proventos Sem Descarte', 'Proventos Com Descarte (§10)', 'Ganho Líquido Otimizado']
    ],
    body: projectionRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8, font: 'Helvetica' },
    headStyles: { fontStyle: 'bold', fillColor: [5, 150, 105] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
      4: { fontStyle: 'bold', halign: 'right', cellWidth: 35, textColor: [79, 70, 229] }
    },
    didParseCell: (data: any) => {
      const cellText = String(data.cell.text || '');
      if (cellText.includes('★') || (data.row.raw && String(data.row.raw[0]).includes('★'))) {
        data.cell.styles.fillColor = [254, 243, 199]; // light amber bg for selected row
        data.cell.styles.textColor = [120, 53, 4]; // dark amber text
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // DRAW VECTOR CHART FOR FUTURE PROSPERITY DIRECTLY IN THE PDF
  let currentChartY = (doc as any).lastAutoTable.finalY + 8;
  if (currentChartY + 60 > 280) {
    doc.addPage();
    currentChartY = 20;
  }

  // Draw chart header or title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text('GRÁFICO ANALÍTICO: IMPACTO DA PROSPECÇÃO DE FUTURO NO BENEFÍCIO', 15, currentChartY);
  currentChartY += 4;

  // Set chart dimensions
  const plotW = 140;
  const plotH = 32;
  const plotX = 35;
  const plotY = currentChartY + 2;

  // Render plot frame background
  doc.setFillColor(248, 250, 252); // light slate background
  doc.rect(plotX, plotY, plotW, plotH, 'F');
  
  // Outer frame outline
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(plotX, plotY, plotW, plotH, 'D');

  // Compute points values (including GE)
  const chartProjs = extScenarios.map(ext => {
    const yearsTotalOriginalExt = yearsTotalBase + (ext / 12);
    let percOriginalExt = 0.60;
    if (sim.ingressoCmc) {
      percOriginalExt = 0.60 + (yearsTotalOriginalExt > 20 ? (Math.floor(yearsTotalOriginalExt) - 20) * 0.02 : 0);
      percOriginalExt = Math.min(Math.max(percOriginalExt, 0.60), 1.0);
    }
    const benefitOriginalExt = proventosResults.average * percOriginalExt;

    const yearsTotalOptimizedExt = Math.max(0, yearsTotalOriginalExt - (proventosResults.optimizationResult?.bestK || 0) / 12);
    let percOptimizedExt = 0.60;
    if (sim.ingressoCmc) {
      percOptimizedExt = 0.60 + (yearsTotalOptimizedExt > 20 ? (Math.floor(yearsTotalOptimizedExt) - 20) * 0.02 : 0);
      percOptimizedExt = Math.min(Math.max(percOptimizedExt, 0.60), 1.0);
    }
    const benefitOptimizedExt = (proventosResults.optimizationResult?.bestAverage || proventosResults.average) * percOptimizedExt;

    return {
      ext,
      semDescarte: benefitOriginalExt + totalGEToAdd,
      comDescarte: benefitOptimizedExt + totalGEToAdd
    };
  });

  const chartVals = chartProjs.flatMap(p => [p.semDescarte, p.comDescarte]);
  const maxCVal = Math.max(...chartVals);
  const minCVal = Math.min(...chartVals);
  const valRange = (maxCVal - minCVal) * 1.2 || maxCVal * 0.2 || 1000;
  const chartMinY = Math.max(0, minCVal - valRange * 0.1);
  const chartMaxY = maxCVal + valRange * 0.1;

  // Coordinate mapping helper methods
  const getChartX = (idx: number) => plotX + (idx * plotW) / (chartProjs.length - 1);
  const getChartY = (val: number) => {
    const r = chartMaxY - chartMinY;
    if (r === 0) return plotY + plotH / 2;
    return plotY + plotH - ((val - chartMinY) / r) * plotH;
  };

  // Draw horizontal grid lines and vertical labels
  doc.setLineWidth(0.15);
  doc.setDrawColor(241, 245, 249);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);

  const gridSteps = [0, 0.33, 0.66, 1.0];
  gridSteps.forEach(ratio => {
    const rVal = chartMinY + ratio * (chartMaxY - chartMinY);
    const rY = getChartY(rVal);
    doc.line(plotX, rY, plotX + plotW, rY);
    doc.text(`R$ ${Math.round(rVal).toLocaleString('pt-BR')}`, plotX - 2.5, rY + 1.2, { align: 'right' });
  });

  // Draw Traditional Line
  doc.setLineWidth(0.5);
  doc.setDrawColor(148, 163, 184);
  for (let idx = 0; idx < chartProjs.length - 1; idx++) {
    const x1 = getChartX(idx);
    const y1 = getChartY(chartProjs[idx].semDescarte);
    const x2 = getChartX(idx + 1);
    const y2 = getChartY(chartProjs[idx + 1].semDescarte);
    doc.line(x1, y1, x2, y2);
  }

  // Draw Optimized Line
  doc.setLineWidth(1.1);
  doc.setDrawColor(79, 70, 229);
  for (let idx = 0; idx < chartProjs.length - 1; idx++) {
    const x1 = getChartX(idx);
    const y1 = getChartY(chartProjs[idx].comDescarte);
    const x2 = getChartX(idx + 1);
    const y2 = getChartY(chartProjs[idx + 1].comDescarte);
    doc.line(x1, y1, x2, y2);
  }

  // Draw points circles and X-axis labels
  chartProjs.forEach((p, idx) => {
    const cx = getChartX(idx);
    const cySem = getChartY(p.semDescarte);
    const cyCom = getChartY(p.comDescarte);

    // Traditional points circles
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.circle(cx, cySem, 0.8, 'FD');

    // Optimized points circles
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.7);
    doc.circle(cx, cyCom, 1.1, 'FD');

    // X-axis label text
    let label = '';
    if (p.ext === 0) label = 'Elegível';
    else {
      const anos = p.ext / 12;
      label = Number.isInteger(anos) ? `+${anos} ${anos === 1 ? 'ano' : 'anos'}` : `+${p.ext} m`;
    }
    
    if (p.ext === selectedExt) {
      label += ' (Ativo)';
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(180, 83, 9); // amber
    } else {
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
    }
    
    doc.setFontSize(5);
    doc.text(label, cx, plotY + plotH + 3.5, { align: 'center' });
  });

  // Render chart legends below
  const legendY = plotY + plotH + 7.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);

  doc.setLineWidth(0.5);
  doc.setDrawColor(148, 163, 184);
  doc.line(42, legendY, 52, legendY);
  doc.text('Cenário Tradicional (Sem descartes)', 54, legendY + 1.5);

  doc.setLineWidth(1.1);
  doc.setDrawColor(79, 70, 229);
  doc.line(110, legendY, 120, legendY);
  doc.text('Cenário Otimizado Recomendado (Com descartes §10)', 122, legendY + 1.5);

  // Set the height after the graph
  (doc as any).lastAutoTable = (doc as any).lastAutoTable || {};
  (doc as any).lastAutoTable.finalY = legendY + 5;


  // Section 6: Memória de Cálculo Previdenciária Detalhada (Anexo)
  if (proventosResults && proventosResults.log) {
    doc.addPage();
    
    // Header for the calculation memory page
    doc.setFillColor(0, 75, 141);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('ANEXO: MEMÓRIA DE CÁLCULO PREVIDENCIÁRIA DETALHADA', 15, 12);
    
    doc.setFont('Courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    const logLines = proventosResults.log.split('\n');
    let currentY = 28;
    const pageHeight = 297;
    const bottomMargin = 20;

    logLines.forEach((line: string) => {
      // Split line to fit width limit (180mm)
      const splitLines = doc.splitTextToSize(line, 180);
      splitLines.forEach((sLine: string) => {
        if (currentY + 4.5 > pageHeight - bottomMargin) {
          doc.addPage();
          
          // Draw header on new page
          doc.setFillColor(0, 75, 141);
          doc.rect(0, 0, 210, 15, 'F');
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.text('ANEXO: MEMÓRIA DE CÁLCULO PREVIDENCIÁRIA DETALHADA (CONTINUAÇÃO)', 15, 9);
          
          doc.setFont('Courier', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          currentY = 22;
        }
        doc.text(sLine, 15, currentY);
        currentY += 3.5; // line height
      });
    });

    // Save final coordinate is essential for succeeding layout items
    (doc as any).lastAutoTable = (doc as any).lastAutoTable || {};
    (doc as any).lastAutoTable.finalY = currentY;
  }

  // Footer / Authority Sign-offs
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const targetY = finalY > 270 ? 20 : finalY;
  
  if (finalY > 270) {
    doc.addPage();
  }
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Relatório de simulação emitido em: ${new Date().toLocaleString('pt-BR')}`, 15, targetY);
  doc.text('Aviso Importante: Este dossiê constitui simulação computacional baseada estritamente nos dados históricos informados.', 15, targetY + 4);
  doc.text('Os valores são indicativos e preliminares para planejamento previdenciário e não se convertem em direito líquido e certo.', 15, targetY + 8);

  // Apply sequential page numbering
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  // Save the PDF
  const filename = `Dossie_Aposentadoria_${sim.nome?.trim().replace(/\s+/g, '_') || 'Servidor'}.pdf`;
  doc.save(filename);
}

/**
 * EXPORT TO EXCEL COMPATIBLE SHEET
 */
export function exportToExcel(
  sim: UnifiedSimulation,
  regrasResults: any[],
  geResults: any,
  proventosResults: any,
  calculatedDiasSP: number,
  calculatedDiasINSS: number,
  opts?: any
) {
  const showGE = opts?.ge !== false;
  let csvContent = '\uFEFF'; // Excel UTF-8 BOM indicator

  // Section Header Function
  const addSection = (title: string) => {
    csvContent += `\n=== ${title.toUpperCase()} ===\n`;
  };

  // Row formatter
  const addRow = (cols: string[]) => {
    csvContent += cols.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(';') + '\n';
  };

  // Header
  addRow(['SIMULADOR DE APOSENTADORIA DGEP - CÂMARA MUNICIPAL DE CURITIBA']);
  addRow(['Relatório Analítico de Proventos Consolidados']);
  addRow(['Data de Emissão:', new Date().toLocaleString('pt-BR')]);

  const activeRule = regrasResults.find((r: any) => r.isVantajosa);
  const endDate = (activeRule && activeRule.aplicavel && activeRule.data) ? new Date(activeRule.data) : new Date();
  
  const adm = sim.ingressoCmc ? new Date(sim.ingressoCmc + 'T00:00:00') : new Date();
  const timeInDays = sim.ingressoCmc ? (endDate.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24) : 0;
  
  const totalDiasSPConsolidado = Math.max(0, timeInDays + calculatedDiasSP - (sim.diasAfastamento || 0));
  const totalDiasContribConsolidado = Math.max(0, timeInDays + calculatedDiasSP + calculatedDiasINSS - (sim.diasAfastamento || 0));

  // Section: Identification
  addSection('DADOS IDENTIFICADORES DO SERVIDOR');
  addRow(['Campo', 'Valor Detalhado']);
  addRow(['Nome Completo', sim.nome || 'NÃO IDENTIFICADO']);
  addRow(['Matrícula Funcional', sim.matricula || 'N/A']);
  addRow(['Cargo Atuante', (sim.cargo || sim.selectedCareer || '').replace(/_/g, ' ')]);
  addRow(['Nível / Referência', sim.selectedLevel || 'N/A']);
  addRow(['Gênero / Sexo Biológico', sim.sexo || 'N/A']);
  addRow(['Data de Nascimento', formatDate(sim.dataNascimento)]);
  addRow(['Data de Admissão (CMC/SP)', formatDate(sim.ingressoCmc)]);
  addRow(['Tempo de Câmara/Exercício Efetivo (Dias)', String(Math.floor(timeInDays))]);
  addRow(['Tempo de Câmara/Exercício Efetivo (Anos, Meses, Dias)', formatarTempoCompleto(Math.floor(timeInDays))]);
  addRow(['Tempo Consolidado no Município (PMC/SP Efetivo) (Dias)', String(Math.floor(totalDiasSPConsolidado))]);
  addRow(['Tempo Consolidado no Município (PMC/SP Efetivo) (Anos, Meses, Dias)', formatarTempoCompleto(Math.floor(totalDiasSPConsolidado))]);
  addRow(['Tempo Total Averbações/INSS (Dias)', String(calculatedDiasINSS)]);
  addRow(['Tempo Total Averbações/INSS (Anos, Meses, Dias)', formatarTempoCompleto(calculatedDiasINSS)]);
  if (sim.diasAfastamento && sim.diasAfastamento > 0) {
    addRow(['Afastamentos / Deduções (Dias)', String(sim.diasAfastamento)]);
    addRow(['Afastamentos / Deduções (Anos, Meses, Dias)', formatarTempoCompleto(sim.diasAfastamento)]);
  }
  addRow(['Tempo Total de Contribuição Consolidado (Dias)', String(Math.floor(totalDiasContribConsolidado))]);
  addRow(['Tempo Total de Contribuição Consolidado (Anos, Meses, Dias)', formatarTempoCompleto(Math.floor(totalDiasContribConsolidado))]);

  // Section: IPMC Regras Previdenciárias
  addSection('1. COMPATIBILIDADE E REGRAS DE INGRESSO (IPMC)');
  addRow(['Regra Analisada', 'Resultado Elegibilidade', 'Previsão de Data', 'Forma de Proventos', 'Idade Requisito', 'Pontuação Obtida', 'Pendências Pendentes / Detalhes']);
  regrasResults.forEach((r: any) => {
    const isApplicable = !!r.aplicavel;
    addRow([
      r.nome,
      isApplicable ? (r.isVantajosa ? 'SIM (Mais Vantajosa)' : 'SIM') : 'NÃO COMPATÍVEL',
      isApplicable ? (r.data ? formatDate(r.data) : 'Imediata') : 'N/A',
      r.proventos || 'N/A',
      r.detalhes?.idade ? `${r.detalhes.idade} anos` : 'N/A',
      r.detalhes?.pontos ? r.detalhes.pontos.toFixed(2) : 'N/A',
      isApplicable ? 'Requisitos atingidos' : (r.motivo || 'Falta carência de requisitos')
    ]);
  });

  // Section: GE details
  if (showGE && geResults && (geResults.fgs.length > 0 || geResults.stims.length > 0)) {
    addSection('2. COBRANÇA E INCORPORAÇÃO DE PARCELAS - GRATIFICAÇÃO ESPECIAL (GE)');
    addRow(['Modalidade de Parcela', 'Nível de Referência / Função', 'Quantidade Meses Cumpridos', 'Ganhos Mensais Proporcionais (R$)']);
    
    geResults.fgs.forEach((fg: any) => {
      addRow(['FG / CC Incorporado', fg.nivel, `${fg.meses} meses`, formatCurrency(fg.inc)]);
    });
    
    geResults.stims.forEach((s: any) => {
      addRow(['Estímulo Acadêmico', `${s.tipo.replace('_', ' ').toUpperCase()} (${(s.perc * 100).toFixed(0)}%)`, `${s.meses} meses`, formatCurrency(s.inc)]);
    });
    
    addRow(['SUMÁRIO DE INCORPORAÇÃO DE GE:', '', '', formatCurrency(geResults.totalFGs + geResults.totalStims)]);
  }

  // Section: Financial Results Summary
  const totalGEToAdd = (showGE && geResults ? (geResults.totalFGs + geResults.totalStims) : 0);
  addSection('3. SÍNTESE MATRICIAL DE PROVENTOS PREVIDENCIÁRIOS');
  addRow(['Variável de Cálculo Previdenciário', 'Resultado Apurado (R$ ou %)']);
  addRow(['Média Salarial Apurada Geral', formatCurrency(proventosResults.average)]);
  addRow(['Multiplicador de Alíquota (Cota Progressiva)', `${(proventosResults.perc * 100).toFixed(2)}%`]);
  addRow(['Valor de Proventos Básicos (Cota)', formatCurrency(proventosResults.benefit)]);
  addRow(['Valor Adicional Incorporado (GE)', formatCurrency(totalGEToAdd)]);
  addRow(['BENEFÍCIO PREVIDENCIÁRIO TOTAL ESTIMADO', formatCurrency(proventosResults.benefit + totalGEToAdd)]);

  // Section: Optimization Model details
  if (proventosResults.optimizationResult) {
    const opt = proventosResults.optimizationResult;
    addSection('4. DETALHAMENTO DE OTIMIZAÇÃO PREVIDENCIÁRIA (§10 L.C. 133/21)');
    addRow(['Indicativos de Ajustes Inteligentes']);
    addRow(['Descartes Previstos Realizados', `${opt.bestK} meses de menor contribuição externa descartados`]);
    addRow(['Média Salarial Original (Sem descartes)', formatCurrency(opt.originalAverage)]);
    addRow(['Porcentagem Cota Original', `${(opt.originalPerc * 100).toFixed(2)}%`]);
    addRow(['Benefício Provento Básico Original', formatCurrency(opt.originalBenefit)]);
    addRow(['Média Salarial Otimizada Final', formatCurrency(opt.bestAverage)]);
    addRow(['Porcentagem Cota Ajustada com descartes', `${(opt.bestPerc * 100).toFixed(2)}%`]);
    addRow(['Benefício Provento Otimizado Final', formatCurrency(opt.bestBenefit)]);
    addRow(['GANHO LÍQUIDO MENSAL EXTRA NO BENEFÍCIO:', formatCurrency(opt.bestBenefit - opt.originalBenefit)]);

    if (opt.bestK > 0) {
      addRow([]);
      addRow(['RELAÇÃO DE COMPETÊNCIAS DESCARTADAS DA MÉDIA SALARIAL']);
      addRow(['Ordem', 'Competência', 'Origem da Contribuição', 'Valor Contribuição (R$)']);
      opt.bestExcluded.forEach((exc: any, index: number) => {
        addRow([
          String(index + 1),
          exc.competencia,
          exc.type === 'chamber-historical' ? 'Câmara (Histórico)' : exc.type === 'chamber-projected' ? 'Câmara (Projetado)' : 'Incorporação Externa',
          formatCurrency(exc.value)
        ]);
      });
    }
  }

  // Section: Full Wage History list
  if (proventosResults.allContributions && proventosResults.allContributions.length > 0) {
    addSection('5. DEMONSTRATIVO COMPLETO E DETALHADO DO HISTÓRICO SALARIAL INTEGRAL');
    addRow(['Competência', 'Descrição da Contribuição', 'Indicativo Pré-94', 'Valor de Contribuição Original (R$)', 'Valor Corrigido por Fatores (R$)', 'Otimização (§10) Status Descarte']);
    
    proventosResults.allContributions.forEach((item: any) => {
      let desc = 'Contrição Averbação Externa';
      if (item.type === 'chamber-historical') desc = 'Câmara Curitiba (Histórico)';
      else if (item.type === 'chamber-projected' || item.type === 'chamber-proj') desc = 'Câmara Curitiba (Previsão)';
      else if (item.type === 'projected-future') desc = 'Período Futuro Projetado';
      else if (item.type === 'contribution-only') desc = 'Incorporação (Tempo e Contrib.)';
      else if (item.type === 'all-effects') desc = 'Incorporação (Todos Efeitos)';
      else if (item.type === 'pre-1994') desc = 'Incorporação (Tempo Pré-1994)';
      
      let corrValStr = item.isPre94 ? '0,00' : formatCurrency(item.value);
      if (item.type === 'projected-future') {
        corrValStr = 'Não aplicável (Futuro)';
      }

      addRow([
        item.competencia,
        desc,
        item.isPre94 ? 'SIM (Desconsiderada pós-94)' : 'NÃO',
        formatCurrency(item.originalValue),
        corrValStr,
        item.isExcluded ? 'CONSELHO DESCARTE ATIVADO' : (item.isPre94 ? 'Menor Pré-1994' : 'CONTABILIZADA NA SOMA')
      ]);
    });
  }

  // Generate File Download Blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  const filename = `Relatorio_Completo_Aposentadoria_${sim.nome?.trim().replace(/\s+/g, '_') || 'Servidor'}.csv`;
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
