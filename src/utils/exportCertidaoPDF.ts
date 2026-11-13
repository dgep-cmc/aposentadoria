import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CMC_LOGO_BASE64, CMC_LOGO_ASPECT_RATIO } from './cmcLogo';

export interface TempoItem {
  anos: number;
  meses: number;
  dias: number;
  totalDias: number;
  periodoDesc?: string;
  obs?: string;
}

export interface CertidaoData {
  numeroCertidao: string; // Ex: "03/2026" ou "SIMULAÇÃO"
  dataCertidao: string; // Ex: "22/10/2026"
  isSimulacao?: boolean; // Se true, gera como Certidão de Simulação (sem controle numérico)
  tipoCertidao?: 'aposentadoria' | 'abono_permanencia';
  
  // Dados do Servidor
  servidor: {
    nome: string;
    rg: string;
    cpf: string;
    sexo: 'Masculino' | 'Feminino';
    matricula: string;
    dataNascimento: string;
    idadeHoje: number;
    idadeEm31Dez2021: number;
    orgao: string; // "Câmara Municipal de Curitiba"
    cargo: string; // "Analista Legislativo"
    padrao: string; // "306"
    referencia: string; // "XXXVI"
    dataAdmissaoServicoPublico: string; // "27/06/1988"
    dataAdmissaoEstatutario: string; // "02/10/1993"
    dataRequerimento: string; // "19/10/2025"
    registroTribunalContas: string; // "402750/03 - Resolução nº 8253/2003"
  };

  // Marcos temporais
  marcos: {
    diasAteEmissao: number;
    diasAte31Dez2021: number;
    diferencaDias: number;
  };

  // Grade de Tempo de Serviço / Contribuição
  gradeTempo: {
    tempoEstatutarioCMC: TempoItem;
    tempoFictoLicencaPremio: TempoItem;
    tempoServicoPublicoRecibado: TempoItem;
    tempoServicoPublicoCLT: TempoItem;
    outrasIncorporacoesEstatutario: TempoItem;
    outrasIncorporacoesCLT: TempoItem;
    afastamentosSemVencimento: TempoItem;
    penalidadesAdministrativas: TempoItem;
    tempoTotalServicoPublico: TempoItem;
    tempoINSSPrivada: TempoItem;
    tempoTotalServicoContribuicao: TempoItem;
  };

  // Tempos de exercício
  temposExercicio: {
    servicoPublicoTotal: TempoItem;
    cargoEfetivoTotal: TempoItem;
  };

  // Informações para regras transitórias
  regrasTransitorias: {
    atsPercentual: number;
    recebeAbono: boolean;
    dataAbono: string;
    idadeEm31Dez2021: number;
    tempoEm31Dez2021Anos: number;
  };

  // Lavratura
  lavratura: {
    cidade: string;
    data: string;
    servidorNome: string;
    servidorMatricula: string;
    setor: string;
  };

  // Dados para Envio ao Órgão Previdenciário (IPMC)
  dadosIPMC?: {
    numeroProcessoSEI: string;
    orgaoDestino: string;
    regraSugerida: string;
    tipoProventos: string;
    valorProventosEstimados: number;
    valorATS: number;
    valorGratificacaoEspecial: number;
    despachoFinalidade: string;
    observacoesGerais?: string;
  };
}

// Formatador de moedas
const formatCurrency = (val: number | undefined): string => {
  if (val === undefined || isNaN(val)) return '0,00';
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Formatador de número com separador de milhar
const formatNumber = (val: number | undefined): string => {
  if (val === undefined || isNaN(val)) return '0';
  return val.toLocaleString('pt-BR');
};

const COLOR_PRIMARY: [number, number, number] = [0, 47, 90];      // Azul CMC Institucional (#002F5A)
const COLOR_TEXT: [number, number, number] = [20, 25, 35];        // Preto/grafite institucional
const COLOR_SUBTEXT: [number, number, number] = [71, 85, 105];    // Subtítulos e metadados
const COLOR_BORDER: [number, number, number] = [195, 204, 218];   // Bordas suaves
const COLOR_HIGHLIGHT: [number, number, number] = [240, 245, 252];// Fundo destaque subtotal
const COLOR_TOTAL: [number, number, number] = [226, 239, 251];    // Fundo destaque total geral

/**
 * Renderiza o bloco padronizado de Lavratura e Assinatura Institucional DGEP/CMC
 */
function renderAssinaturaInstitucional(
  doc: jsPDF,
  startY: number,
  margin: number,
  lavratura: CertidaoData['lavratura'],
  roleLabel = 'Servidor(a) responsável pela lavratura:'
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = startY;
  // Garante espaço suficiente antes da margem do rodapé (~54mm para local/data + assinatura + rodapé)
  if (y > pageHeight - 54) {
    doc.addPage();
    y = margin + 8;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(...COLOR_TEXT);
  doc.text(`${lavratura.cidade || 'Curitiba'}, ${lavratura.data || ''}`, margin, y);

  y += 15.0;

  const signX = pageWidth / 2;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.35);
  doc.line(signX - 48, y, signX + 48, y);
  y += 4.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...COLOR_SUBTEXT);
  doc.text(roleLabel, signX, y, { align: 'center' });
  y += 4.0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.0);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(lavratura.servidorNome || 'Setor de Gestão de Processos e Benefícios Funcionais', signX, y, { align: 'center' });
  y += 3.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...COLOR_TEXT);
  const matText = lavratura.servidorMatricula ? `Matrícula ${lavratura.servidorMatricula}` : '';
  const setorText = lavratura.setor || 'Diretoria de Gestão de Pessoas — DGEP';
  doc.text(matText ? `${matText} • ${setorText}` : setorText, signX, y, { align: 'center' });
  y += 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...COLOR_SUBTEXT);
  doc.text('Diretoria de Gestão de Pessoas — Câmara Municipal de Curitiba', signX, y, { align: 'center' });

  return y + 4;
}

/**
 * Aplica rodapé institucional padronizado com paginação dinâmica em todas as páginas do documento
 */
function aplicarRodapesPaginados(
  doc: jsPDF,
  margin: number,
  leftTextBuilder: (pageIndex: number, totalPages: number) => string,
  watermarkText?: string
): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    if (watermarkText) {
      doc.saveGraphicsState();
      doc.setTextColor(242, 244, 248);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(42);
      doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
        align: 'center',
        angle: 35
      });
      doc.restoreGraphicsState();
    }

    // Linha divisória do rodapé
    doc.setDrawColor(215, 222, 232);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 10.5, pageWidth - margin, pageHeight - 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(95, 103, 115);
    doc.text(leftTextBuilder(i, totalPages), margin, pageHeight - 6.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6.2, { align: 'right' });
  }
}

/**
 * Gera a Certidão Oficial de Aposentadoria (Padrão DGEP/CMC)
 * Segue estritamente a estrutura oficial do Setor de Gestão de Processos e Benefícios Funcionais
 */
export function gerarCertidaoAposentadoriaPadraoPDF(data: CertidaoData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2; // 184 mm
  let currentY = 10.5;

  const isSimulacao = Boolean(
    data.isSimulacao ||
    data.numeroCertidao?.toUpperCase().includes('SIMULAÇÃO') ||
    data.numeroCertidao?.toUpperCase().includes('MINUTA')
  );

  // -----------------------------------------------------------------
  // CABEÇALHO UNIFICADO INSTITUCIONAL CMC / DGEP
  // -----------------------------------------------------------------
  const logoW = 38;
  const logoH = logoW / CMC_LOGO_ASPECT_RATIO; // ~14.77 mm
  const headerTotalH = 27.5;
  const headerTopH = 18.0;
  const headerBottomH = 9.5;

  const headerBorderColor: [number, number, number] = isSimulacao ? [217, 119, 6] : COLOR_PRIMARY;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...headerBorderColor);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, currentY, contentWidth, headerTotalH, 1.4, 1.4, 'S');

  // Friso superior institucional
  doc.setFillColor(...headerBorderColor);
  doc.rect(margin, currentY, contentWidth, 1.8, 'F');

  // Logomarca Oficial da CMC
  doc.addImage(CMC_LOGO_BASE64, 'PNG', margin + 3.2, currentY + 2.2, logoW, logoH);

  // Linha vertical divisória sutil
  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.2);
  doc.line(margin + logoW + 5.5, currentY + 2.8, margin + logoW + 5.5, currentY + 16.5);

  // Identificação Institucional
  const textX = margin + logoW + 9.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('DIRETORIA DE GESTÃO DE PESSOAS — DGEP', textX, currentY + 7.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...COLOR_SUBTEXT);
  doc.text('Setor de Gestão de Processos e Benefícios Funcionais • Certidão de Tempo de Contribuição', textX, currentY + 13.2);

  // Linha divisória horizontal interna
  doc.setDrawColor(...headerBorderColor);
  doc.setLineWidth(0.25);
  doc.line(margin, currentY + headerTopH, margin + contentWidth, currentY + headerTopH);

  // Faixa inferior integrada de Título da Certidão
  const titleY = currentY + headerTopH;
  const isAbono = data.tipoCertidao === 'abono_permanencia';
  if (isSimulacao) {
    doc.setFillColor(254, 249, 235);
    doc.rect(margin, titleY, contentWidth, headerBottomH, 'F');

    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isAbono ? 9.5 : 10.0);
    doc.text(
      isAbono ? 'CERTIDÃO DE ABONO DE PERMANÊNCIA — MINUTA' : 'CERTIDÃO DE APOSENTADORIA — MINUTA DE SIMULAÇÃO',
      margin + 4.5,
      titleY + 6.1
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.0);
    doc.text(`SEM CONTROLE NUMÉRICO   •   Data: ${data.dataCertidao}`, pageWidth - margin - 4.5, titleY + 6.1, { align: 'right' });
  } else {
    doc.setFillColor(238, 244, 252);
    doc.rect(margin, titleY, contentWidth, headerBottomH, 'F');

    doc.setTextColor(...COLOR_PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isAbono ? 9.8 : 10.4);
    doc.text(
      isAbono
        ? `CERTIDÃO DE ABONO DE PERMANÊNCIA Nº ${data.numeroCertidao.toUpperCase()}`
        : `CERTIDÃO DE APOSENTADORIA Nº ${data.numeroCertidao.toUpperCase()}`,
      margin + 4.5,
      titleY + 6.1
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Data: ${data.dataCertidao}`, pageWidth - margin - 4.5, titleY + 6.1, { align: 'right' });
  }

  currentY += headerTotalH + 6.5;

  const drawSectionHeading = (title: string) => {
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(margin, currentY - 3.0, 1.4, 3.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(title, margin + 3.0, currentY);
    currentY += 3.5;
  };

  // BLOCO 1: DADOS DO SERVIDOR
  drawSectionHeading('1. DADOS DO SERVIDOR');

  const colServidorWidth = contentWidth / 4; // 46 mm
  const dadosServidorTable = [
    [
      { content: `NOME DO(A) SERVIDOR(A)\n${data.servidor.nome}`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: `RG\n${data.servidor.rg || '---'}`, styles: { fontStyle: 'bold' } },
      { content: `CPF\n${data.servidor.cpf || '---'}`, styles: { fontStyle: 'bold' } }
    ],
    [
      { content: `DATA DE NASCIMENTO\n${data.servidor.dataNascimento || '---'}`, styles: { fontStyle: 'bold' } },
      { content: `SEXO\n${data.servidor.sexo}`, styles: { fontStyle: 'bold' } },
      { content: `MATRÍCULA FUNCIONAL\n${data.servidor.matricula || '---'}`, styles: { fontStyle: 'bold' } },
      { content: `IDADE ATUAL\n${data.servidor.idadeHoje} anos`, styles: { fontStyle: 'bold' } }
    ],
    [
      { content: `CARGO EFETIVO\n${data.servidor.cargo}`, colSpan: 2, styles: { fontStyle: 'bold' } },
      { content: `PADRÃO / REFERÊNCIA\n${data.servidor.padrao || '---'} / ${data.servidor.referencia || '---'}`, styles: { fontStyle: 'bold' } },
      { content: `DATA DE ADMISSÃO\n${data.servidor.dataAdmissaoServicoPublico || '---'}`, styles: { fontStyle: 'bold' } }
    ],
    [
      {
        content: `REGISTRO DE ADMISSÃO TCE-PR\n${data.servidor.registroTribunalContas || 'Sem registro / Em tramitação'}`,
        colSpan: 4,
        styles: { fontStyle: 'italic' }
      }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    body: dadosServidorTable as any,
    theme: 'grid',
    styles: {
      fontSize: 7.9,
      cellPadding: { top: 2.0, bottom: 2.0, left: 2.8, right: 2.8 },
      textColor: COLOR_TEXT,
      lineColor: COLOR_BORDER,
      lineWidth: 0.15
    },
    columnStyles: {
      0: { cellWidth: colServidorWidth },
      1: { cellWidth: colServidorWidth },
      2: { cellWidth: colServidorWidth },
      3: { cellWidth: colServidorWidth }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5.8;

  // BLOCO 2: GRADE DE TEMPO DE SERVIÇO / CONTRIBUIÇÃO
  drawSectionHeading('2. GRADE DE TEMPO DE SERVIÇO / CONTRIBUIÇÃO');

  const g = data.gradeTempo;

  const formatItemRow = (
    descricao: string,
    item: TempoItem,
    isTotal = false,
    isSubtotal = false,
    subtext?: string
  ) => {
    const mainContent = subtext ? `${descricao}\n${subtext}` : descricao;
    const isHighlight = isTotal || isSubtotal;
    const bgFill = isTotal ? COLOR_TOTAL : (isSubtotal ? COLOR_HIGHLIGHT : undefined);
    const txtColor = isHighlight ? COLOR_PRIMARY : COLOR_TEXT;
    const rowFontSize = isTotal ? 8.0 : (isSubtotal ? 7.8 : 7.5);

    return [
      {
        content: mainContent,
        styles: {
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: txtColor,
          fontSize: rowFontSize
        }
      },
      {
        content: String(item.anos),
        styles: {
          halign: 'center',
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: txtColor,
          fontSize: rowFontSize
        }
      },
      {
        content: String(item.meses),
        styles: {
          halign: 'center',
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: txtColor,
          fontSize: rowFontSize
        }
      },
      {
        content: String(item.dias),
        styles: {
          halign: 'center',
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: txtColor,
          fontSize: rowFontSize
        }
      },
      {
        content: formatNumber(item.totalDias),
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: bgFill as any,
          textColor: txtColor,
          fontSize: rowFontSize
        }
      }
    ];
  };

  const gradeTableBody = [
    formatItemRow(
      `Tempo Estatutário na CMC ${g.tempoEstatutarioCMC.periodoDesc ? `(${g.tempoEstatutarioCMC.periodoDesc.replace(/^\(|\)$/g, '')}):` : ':'}`,
      g.tempoEstatutarioCMC
    ),
    formatItemRow(
      'Tempo Fícto (licenças-prêmio incorporadas – CMC):',
      g.tempoFictoLicencaPremio
    ),
    formatItemRow(
      'Tempo de Serviço Público Municipal (Recibado) incorporado:',
      g.tempoServicoPublicoRecibado
    ),
    formatItemRow(
      `Tempo de Serviço Público Municipal (CLT) incorporado ${g.tempoServicoPublicoCLT.periodoDesc ? `(${g.tempoServicoPublicoCLT.periodoDesc.replace(/^\(|\)$/g, '')}):` : ':'}`,
      g.tempoServicoPublicoCLT
    ),
    formatItemRow(
      'Outras incorporações de Tempo de Serviço Público (Estatutário):',
      g.outrasIncorporacoesEstatutario
    ),
    formatItemRow(
      'Outras incorporações de Tempo de Serviço Público (CLT):',
      g.outrasIncorporacoesCLT
    ),
    formatItemRow(
      'Afastamentos sem vencimento:',
      g.afastamentosSemVencimento
    ),
    formatItemRow(
      'Penalidades Administrativas, suspensão e faltas:',
      g.penalidadesAdministrativas
    ),
    formatItemRow(
      'Tempo Total de Serviço Público:',
      g.tempoTotalServicoPublico,
      false,
      true
    ),
    formatItemRow(
      'Tempo de Contribuição na iniciativa privada incorporado (INSS)',
      g.tempoINSSPrivada,
      false,
      false,
      g.tempoINSSPrivada.periodoDesc
    ),
    formatItemRow(
      'Tempo Total de Serviço/Contribuição:',
      g.tempoTotalServicoContribuicao,
      true,
      false
    )
  ];

  // Colunas: [114, 17, 17, 17, 19] somam exatamente 184 mm
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [
      [
        { content: 'Tempos de serviço/ contribuição:', styles: { halign: 'left' } },
        { content: 'ANOS', styles: { halign: 'center' } },
        { content: 'MESES', styles: { halign: 'center' } },
        { content: 'DIAS', styles: { halign: 'center' } },
        { content: 'EM DIAS', styles: { halign: 'right' } }
      ]
    ],
    body: gradeTableBody as any,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 1.75, bottom: 1.75, left: 2.4, right: 2.4 },
      textColor: COLOR_TEXT,
      lineColor: COLOR_BORDER,
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.6,
      cellPadding: { top: 2.0, bottom: 2.0, left: 2.4, right: 2.4 }
    },
    columnStyles: {
      0: { cellWidth: 114 },
      1: { cellWidth: 17 },
      2: { cellWidth: 17 },
      3: { cellWidth: 17 },
      4: { cellWidth: 19 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5.8;

  // Verifica se há espaço mínimo para Bloco 3
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = margin + 4;
  }

  // BLOCO 3: TEMPOS DE EXERCÍCIO
  drawSectionHeading('3. TEMPOS DE EXERCÍCIO NO SERVIÇO PÚBLICO E CARGO EFETIVO');

  const te = data.temposExercicio;
  const temposExercicioBody = [
    [
      { content: `Tempo de serviço público ${te.servicoPublicoTotal.periodoDesc ? `(${te.servicoPublicoTotal.periodoDesc})` : ''}:` },
      { content: String(te.servicoPublicoTotal.anos), styles: { halign: 'center' } },
      { content: String(te.servicoPublicoTotal.meses), styles: { halign: 'center' } },
      { content: String(te.servicoPublicoTotal.dias), styles: { halign: 'center' } },
      { content: formatNumber(te.servicoPublicoTotal.totalDias), styles: { halign: 'right', fontStyle: 'bold', textColor: COLOR_PRIMARY } }
    ],
    [
      { content: `Tempo no cargo efetivo ${te.cargoEfetivoTotal.periodoDesc ? `(${te.cargoEfetivoTotal.periodoDesc})` : ''}:` },
      { content: String(te.cargoEfetivoTotal.anos), styles: { halign: 'center' } },
      { content: String(te.cargoEfetivoTotal.meses), styles: { halign: 'center' } },
      { content: String(te.cargoEfetivoTotal.dias), styles: { halign: 'center' } },
      { content: formatNumber(te.cargoEfetivoTotal.totalDias), styles: { halign: 'right', fontStyle: 'bold', textColor: COLOR_PRIMARY } }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [
      [
        { content: 'Tempos de exercício', styles: { halign: 'left' } },
        { content: 'ANOS', styles: { halign: 'center' } },
        { content: 'MESES', styles: { halign: 'center' } },
        { content: 'DIAS', styles: { halign: 'center' } },
        { content: 'EM DIAS', styles: { halign: 'right' } }
      ]
    ],
    body: temposExercicioBody as any,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 1.75, bottom: 1.75, left: 2.4, right: 2.4 },
      textColor: COLOR_TEXT,
      lineColor: COLOR_BORDER,
      lineWidth: 0.15
    },
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.6,
      cellPadding: { top: 2.0, bottom: 2.0, left: 2.4, right: 2.4 }
    },
    columnStyles: {
      0: { cellWidth: 114 },
      1: { cellWidth: 17 },
      2: { cellWidth: 17 },
      3: { cellWidth: 17 },
      4: { cellWidth: 19 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5.8;

  if (currentY > pageHeight - 50) {
    doc.addPage();
    currentY = margin + 4;
  }

  // BLOCO 4: OUTRAS INFORMAÇÕES E REGRAS TRANSITÓRIAS (LC 133/2021)
  drawSectionHeading('4. INFORMAÇÕES PARA REGRAS TRANSITÓRIAS (LEI COMPLEMENTAR Nº 133/2021)');

  const rt = data.regrasTransitorias;
  const abonoDesc = rt.recebeAbono
    ? `( X ) Sim   (   ) Não    |  Data de Início/Concessão: ${rt.dataAbono || 'Concedido'}`
    : `(   ) Sim   ( X ) Não`;

  const infoTransitoriasBody = [
    [
      { content: 'Outras Informações Funcionais', styles: { fontStyle: 'bold', fillColor: COLOR_HIGHLIGHT as any, textColor: COLOR_PRIMARY } },
      { content: 'Marco Temporal em 31/12/2021 (LC 133/2021)', styles: { fontStyle: 'bold', fillColor: COLOR_HIGHLIGHT as any, textColor: COLOR_PRIMARY } }
    ],
    [
      { content: `Adicional por Tempo de Serviço (ATS): ${rt.atsPercentual}%` },
      { content: `Idade em 31/12/2021: ${rt.idadeEm31Dez2021} anos` }
    ],
    [
      { content: `Recebe Abono de Permanência?\n${abonoDesc}` },
      { content: `Tempo de Serviço/Contribuição em 31/12/2021: ${rt.tempoEm31Dez2021Anos} anos (${formatNumber(data.marcos.diasAte31Dez2021)} dias)` }
    ]
  ];

  const colTransitoriaWidth = contentWidth / 2; // 92 mm
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    body: infoTransitoriasBody as any,
    theme: 'grid',
    styles: {
      fontSize: 7.8,
      cellPadding: { top: 2.0, bottom: 2.0, left: 2.8, right: 2.8 },
      textColor: COLOR_TEXT,
      lineColor: COLOR_BORDER,
      lineWidth: 0.15
    },
    columnStyles: {
      0: { cellWidth: colTransitoriaWidth },
      1: { cellWidth: colTransitoriaWidth }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8.5;

  // BLOCO 5: LAVRATURA E ASSINATURA PADRONIZADA
  renderAssinaturaInstitucional(
    doc,
    currentY,
    margin,
    data.lavratura,
    'Servidor(a) que lavrou a Certidão:'
  );

  // Rodapés dinâmicos (suporta 1 ou mais páginas automaticamente)
  aplicarRodapesPaginados(
    doc,
    margin,
    () =>
      isSimulacao
        ? 'Câmara Municipal de Curitiba • DGEP • Minuta de Simulação para conferência prévia (sem reserva de número oficial)'
        : 'Câmara Municipal de Curitiba • Diretoria de Gestão de Pessoas • Documento oficial emitido para instrução funcional',
    isSimulacao ? 'SIMULAÇÃO — MINUTA' : undefined
  );

  const cleanNome = data.servidor.nome.replace(/\s+/g, '_');
  const filename = isSimulacao
    ? `Certidao_Simulacao_${cleanNome}.pdf`
    : `Certidao_Aposentadoria_${data.numeroCertidao.replace(/[^a-zA-Z0-9]/g, '-')}_${cleanNome}.pdf`;
  doc.save(filename);
}

/**
 * Gera o Dossiê Completo de Encaminhamento ao IPMC
 * Com Despacho Formal de Remessa, Termo de Juntada, Certidão e Quadro Sintético de Proventos
 */
export function gerarDossieEnvioIPMCPDF(data: CertidaoData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 13;
  const contentWidth = pageWidth - margin * 2; // 184 mm

  // -------------------------------------------------------------
  // PÁGINA 1: DESPACHO DE ENCAMINHAMENTO E TERMO DE REMESSA AO IPMC
  // -------------------------------------------------------------
  let currentY = 11;

  const logoW = 38;
  const logoH = logoW / CMC_LOGO_ASPECT_RATIO;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, currentY, contentWidth, 21, 1.4, 1.4, 'S');

  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, currentY, contentWidth, 1.8, 'F');

  doc.addImage(CMC_LOGO_BASE64, 'PNG', margin + 3.2, currentY + 3.2, logoW, logoH);

  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.2);
  doc.line(margin + logoW + 5.5, currentY + 3.2, margin + logoW + 5.5, currentY + 19.2);

  const textX = margin + logoW + 9.5;
  doc.setFontSize(9.4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('DIRETORIA DE GESTÃO DE PESSOAS — DGEP', textX, currentY + 9.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(...COLOR_SUBTEXT);
  doc.text('Setor de Gestão de Processos e Benefícios Funcionais • Processo Eletrônico Previdenciário', textX, currentY + 14.8);

  currentY += 25.0;

  // Faixa de Protocolo e Processo
  doc.setFillColor(242, 246, 250);
  doc.setDrawColor(0, 75, 141);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, currentY, contentWidth, 12.5, 1.0, 1.0, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('DESPACHO DE ENCAMINHAMENTO E REMESSA PREVIDENCIÁRIA', margin + 4.0, currentY + 5.2);

  doc.setFontSize(7.9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text(`PROCESSO SEI / ADMINISTRATIVO Nº: ${data.dadosIPMC?.numeroProcessoSEI || 'A vincular / Protocolo SEI'}`, margin + 4.0, currentY + 10.0);
  doc.text(`Data de Emissão: ${data.dataCertidao}`, pageWidth - margin - 4.0, currentY + 10.0, { align: 'right' });

  currentY += 17.5;

  // Destinatário
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.3);
  doc.setTextColor(20, 20, 20);
  doc.text('AO:', margin, currentY);
  currentY += 4.2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('INSTITUTO DE PREVIDÊNCIA DOS SERVIDORES DO MUNICÍPIO DE CURITIBA — IPMC', margin, currentY);
  currentY += 4.0;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Diretoria de Previdência / Gerência de Concessão de Benefícios e Aposentadorias', margin, currentY);
  doc.text('Município de Curitiba - PR', margin, currentY + 3.8);

  currentY += 10.0;

  // Assunto e Interessado
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(margin, currentY, contentWidth, 15.5, 1.0, 1.0, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(30, 30, 30);
  doc.text('ASSUNTO:', margin + 3.5, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Instrução e remessa de documentação funcional para fins de concessão de aposentadoria voluntária.', margin + 22, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('INTERESSADO(A):', margin + 3.5, currentY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.servidor.nome} (Matrícula ${data.servidor.matricula} — ${data.servidor.cargo})`, margin + 31, currentY + 11.5);

  currentY += 21.0;

  // Texto do Despacho Administrativo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.4);
  doc.setTextColor(...COLOR_TEXT);

  const textoDespacho = [
    `1. Encaminham-se a esse Instituto de Previdência dos Servidores do Município de Curitiba (IPMC) os presentes autos eletrônicos devidamente instruídos com a Certidão de Tempo de Contribuição e Vínculos Funcionais nº ${data.numeroCertidao}, certidões de averbação e espelho de simulação de proventos referente ao(à) servidor(a) ${data.servidor.nome}, ocupante do cargo de ${data.servidor.cargo}, matrícula funcional nº ${data.servidor.matricula}.`,
    '',
    `2. Conforme apurado pelos registros funcionais desta Diretoria de Gestão de Pessoas (DGEP), o(a) servidor(a) conta com um Tempo Total de Contribuição apurado de ${data.gradeTempo.tempoTotalServicoContribuicao.anos} anos, ${data.gradeTempo.tempoTotalServicoContribuicao.meses} meses e ${data.gradeTempo.tempoTotalServicoContribuicao.dias} dias (${formatNumber(data.gradeTempo.tempoTotalServicoContribuicao.totalDias)} dias), tendo ingressado originariamente no serviço público em ${data.servidor.dataAdmissaoServicoPublico} e no regime estatutário desta Casa de Leis em ${data.servidor.dataAdmissaoEstatutario}.`,
    '',
    `3. Observa-se que em 31/12/2021 (marco temporal da Lei Complementar nº 133/2021), o(a) servidor(a) possuía ${data.regrasTransitorias.idadeEm31Dez2021} anos de idade e ${data.regrasTransitorias.tempoEm31Dez2021Anos} anos de tempo de contribuição (${formatNumber(data.marcos.diasAte31Dez2021)} dias), estando atualmente em gozo de Abono de Permanência ${data.regrasTransitorias.recebeAbono ? `desde ${data.regrasTransitorias.dataAbono || 'data de concessão'}` : 'não concedido'}.`,
    '',
    `4. Pelo exposto, submetem-se os elementos para análise de elegibilidade, fixação do benefício nos termos da legislação municipal de regência (LC nº 133/2021 e regras constitucionais de transição aplicáveis) e demais providências para emissão do respectivo Decreto / Portaria de Concessão de Aposentadoria.`
  ];

  let yOffset = currentY;
  for (const line of textoDespacho) {
    if (line === '') {
      yOffset += 2.6;
    } else {
      const splitText = doc.splitTextToSize(line, contentWidth);
      doc.text(splitText, margin, yOffset);
      yOffset += splitText.length * 4.1;
    }
  }

  currentY = yOffset + 6.5;

  // Relação de Anexos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.4);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('RELAÇÃO DE DOCUMENTOS ACOSTADOS AOS AUTOS:', margin, currentY);
  currentY += 4.5;

  const anexos = [
    `[Anexo I] Certidão de Aposentadoria e Tempo de Contribuição nº ${data.numeroCertidao} (DGEP/CMC);`,
    `[Anexo II] Demonstrativo de Apuração de Média Salarial e Atualização de Contribuições Previdenciárias;`,
    `[Anexo III] Quadro Sintético de Estimativa de Proventos e Incorporações Proporcionais;`,
    `[Anexo IV] Cópia dos Atos de Averbação de Tempo de Contribuição (INSS e Órgãos Públicos) e registro no TCE-PR (${data.servidor.registroTribunalContas || 'conforme autos'}).`
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.0);
  doc.setTextColor(40, 45, 55);
  anexos.forEach((anx) => {
    const splitAnx = doc.splitTextToSize(anx, contentWidth - 4);
    doc.text(splitAnx, margin + 3.5, currentY);
    currentY += splitAnx.length * 4.0 + 0.8;
  });

  currentY += 9.0;

  // Assinatura Padronizada do Despacho
  renderAssinaturaInstitucional(
    doc,
    currentY,
    margin,
    data.lavratura,
    'Responsável pela Remessa Previdenciária:'
  );

  // -------------------------------------------------------------
  // PÁGINA 2: CERTIDÃO INTEGRAL DE TEMPO E ESPELHO PREVIDENCIÁRIO
  // -------------------------------------------------------------
  doc.addPage();
  currentY = 11;

  const p2LogoW = 34;
  const p2LogoH = p2LogoW / CMC_LOGO_ASPECT_RATIO;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, currentY, contentWidth, 17.5, 1.2, 1.2, 'S');

  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, currentY, contentWidth, 1.6, 'F');

  doc.addImage(CMC_LOGO_BASE64, 'PNG', margin + 3.0, currentY + 2.4, p2LogoW, p2LogoH);

  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.2);
  doc.line(margin + p2LogoW + 5.5, currentY + 2.6, margin + p2LogoW + 5.5, currentY + 15.8);

  const p2TextX = margin + p2LogoW + 9.0;
  doc.setTextColor(...COLOR_PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.text('ESPELHO FUNCIONAL DA CERTIDÃO DE TEMPO DE CONTRIBUIÇÃO', p2TextX, currentY + 7.2);

  doc.setFontSize(7.4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLOR_SUBTEXT);
  doc.text(`Anexo ao Processo IPMC • Certidão nº ${data.numeroCertidao} — Servidor: ${data.servidor.nome}`, p2TextX, currentY + 12.6);

  currentY += 22.0;

  const resumoServidor = [
    [
      { content: `Servidor: ${data.servidor.nome}`, styles: { fontStyle: 'bold' } },
      { content: `Matrícula: ${data.servidor.matricula}` },
      { content: `CPF: ${data.servidor.cpf}` },
      { content: `Data Nasc: ${data.servidor.dataNascimento} (${data.servidor.idadeHoje} anos)` }
    ],
    [
      { content: `Cargo: ${data.servidor.cargo} (Padrão ${data.servidor.padrao} / Ref. ${data.servidor.referencia})`, colSpan: 2 },
      { content: `Data de Admissão: ${data.servidor.dataAdmissaoServicoPublico}`, colSpan: 2 }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    body: resumoServidor as any,
    theme: 'grid',
    styles: { fontSize: 7.8, cellPadding: 1.8, lineColor: COLOR_BORDER, lineWidth: 0.15, textColor: COLOR_TEXT },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 46 },
      2: { cellWidth: 46 },
      3: { cellWidth: 46 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 4.8;

  const g = data.gradeTempo;
  const gradeCompacta = [
    [
      { content: `Tempo Estatutário CMC ${g.tempoEstatutarioCMC.periodoDesc ? `(${g.tempoEstatutarioCMC.periodoDesc.replace(/^\(|\)$/g, '')}):` : ':'}` },
      { content: String(g.tempoEstatutarioCMC.anos), styles: { halign: 'center' } },
      { content: String(g.tempoEstatutarioCMC.meses), styles: { halign: 'center' } },
      { content: String(g.tempoEstatutarioCMC.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.tempoEstatutarioCMC.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Tempo Fícto (licenças-prêmio incorporadas – CMC):' },
      { content: String(g.tempoFictoLicencaPremio.anos), styles: { halign: 'center' } },
      { content: String(g.tempoFictoLicencaPremio.meses), styles: { halign: 'center' } },
      { content: String(g.tempoFictoLicencaPremio.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.tempoFictoLicencaPremio.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Tempo de Serviço Público Municipal (Recibado) incorporado:' },
      { content: String(g.tempoServicoPublicoRecibado.anos), styles: { halign: 'center' } },
      { content: String(g.tempoServicoPublicoRecibado.meses), styles: { halign: 'center' } },
      { content: String(g.tempoServicoPublicoRecibado.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.tempoServicoPublicoRecibado.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: `Tempo de Serviço Público Municipal (CLT) incorporado ${g.tempoServicoPublicoCLT.periodoDesc ? `(${g.tempoServicoPublicoCLT.periodoDesc.replace(/^\(|\)$/g, '')}):` : ':'}` },
      { content: String(g.tempoServicoPublicoCLT.anos), styles: { halign: 'center' } },
      { content: String(g.tempoServicoPublicoCLT.meses), styles: { halign: 'center' } },
      { content: String(g.tempoServicoPublicoCLT.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.tempoServicoPublicoCLT.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Outras incorporações de Tempo de Serviço Público (Estatutário):' },
      { content: String(g.outrasIncorporacoesEstatutario.anos), styles: { halign: 'center' } },
      { content: String(g.outrasIncorporacoesEstatutario.meses), styles: { halign: 'center' } },
      { content: String(g.outrasIncorporacoesEstatutario.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.outrasIncorporacoesEstatutario.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Outras incorporações de Tempo de Serviço Público (CLT):' },
      { content: String(g.outrasIncorporacoesCLT.anos), styles: { halign: 'center' } },
      { content: String(g.outrasIncorporacoesCLT.meses), styles: { halign: 'center' } },
      { content: String(g.outrasIncorporacoesCLT.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.outrasIncorporacoesCLT.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Afastamentos sem vencimento:' },
      { content: String(g.afastamentosSemVencimento.anos), styles: { halign: 'center' } },
      { content: String(g.afastamentosSemVencimento.meses), styles: { halign: 'center' } },
      { content: String(g.afastamentosSemVencimento.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.afastamentosSemVencimento.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Penalidades Administrativas, suspensão e faltas:' },
      { content: String(g.penalidadesAdministrativas.anos), styles: { halign: 'center' } },
      { content: String(g.penalidadesAdministrativas.meses), styles: { halign: 'center' } },
      { content: String(g.penalidadesAdministrativas.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.penalidadesAdministrativas.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Tempo Total de Serviço Público:', styles: { fontStyle: 'bold', fillColor: COLOR_HIGHLIGHT } },
      { content: String(g.tempoTotalServicoPublico.anos), styles: { halign: 'center', fontStyle: 'bold', fillColor: COLOR_HIGHLIGHT } },
      { content: String(g.tempoTotalServicoPublico.meses), styles: { halign: 'center', fontStyle: 'bold', fillColor: COLOR_HIGHLIGHT } },
      { content: String(g.tempoTotalServicoPublico.dias), styles: { halign: 'center', fontStyle: 'bold', fillColor: COLOR_HIGHLIGHT } },
      { content: formatNumber(g.tempoTotalServicoPublico.totalDias), styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_HIGHLIGHT, textColor: COLOR_PRIMARY } }
    ],
    [
      { content: `Tempo de Contribuição na iniciativa privada incorporado (INSS) ${g.tempoINSSPrivada.periodoDesc ? `(${g.tempoINSSPrivada.periodoDesc})` : ''}` },
      { content: String(g.tempoINSSPrivada.anos), styles: { halign: 'center' } },
      { content: String(g.tempoINSSPrivada.meses), styles: { halign: 'center' } },
      { content: String(g.tempoINSSPrivada.dias), styles: { halign: 'center' } },
      { content: formatNumber(g.tempoINSSPrivada.totalDias), styles: { halign: 'right', fontStyle: 'bold' } }
    ],
    [
      { content: 'Tempo Total de Serviço/Contribuição:', styles: { fontStyle: 'bold', fillColor: COLOR_TOTAL } },
      { content: String(g.tempoTotalServicoContribuicao.anos), styles: { halign: 'center', fontStyle: 'bold', fillColor: COLOR_TOTAL } },
      { content: String(g.tempoTotalServicoContribuicao.meses), styles: { halign: 'center', fontStyle: 'bold', fillColor: COLOR_TOTAL } },
      { content: String(g.tempoTotalServicoContribuicao.dias), styles: { halign: 'center', fontStyle: 'bold', fillColor: COLOR_TOTAL } },
      { content: formatNumber(g.tempoTotalServicoContribuicao.totalDias), styles: { halign: 'right', fontStyle: 'bold', fillColor: COLOR_TOTAL, textColor: COLOR_PRIMARY } }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [
      [
        { content: 'Discriminação do Tempo de Contribuição', styles: { halign: 'left' } },
        { content: 'ANOS', styles: { halign: 'center' } },
        { content: 'MESES', styles: { halign: 'center' } },
        { content: 'DIAS', styles: { halign: 'center' } },
        { content: 'TOTAL DIAS', styles: { halign: 'right' } }
      ]
    ],
    body: gradeCompacta as any,
    theme: 'grid',
    styles: { fontSize: 7.4, cellPadding: 1.45, lineColor: COLOR_BORDER, lineWidth: 0.15, textColor: COLOR_TEXT },
    headStyles: { fillColor: COLOR_PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, cellPadding: 1.75 },
    columnStyles: {
      0: { cellWidth: 114 },
      1: { cellWidth: 17 },
      2: { cellWidth: 17 },
      3: { cellWidth: 17 },
      4: { cellWidth: 19 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5.0;

  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = margin + 4;
  }

  // QUADRO DE SÍNTESE DA SIMULAÇÃO PREVIDENCIÁRIA
  doc.setFillColor(...COLOR_PRIMARY);
  doc.rect(margin, currentY - 3.0, 1.4, 3.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('SÍNTESE DA SIMULAÇÃO DE PROVENTOS E FUNDAMENTAÇÃO LEGAL', margin + 3.0, currentY);
  currentY += 3.2;

  const dIPMC = data.dadosIPMC;
  const proventosEstimados = dIPMC?.valorProventosEstimados || 0;
  const valorATS = dIPMC?.valorATS || 0;
  const valorGE = dIPMC?.valorGratificacaoEspecial || 0;

  const quadroPrevidenciario = [
    [
      { content: 'Regra de Transição Aplicável / Sugerida:', styles: { fontStyle: 'bold', fillColor: [245, 247, 250] } },
      { content: dIPMC?.regraSugerida || 'Art. 3º da EC 47/2005 (Direito Adquirido / Transição com Paridade e Integralidade)', styles: { fontStyle: 'bold', textColor: [0, 75, 141] } }
    ],
    [
      { content: 'Critério de Proventos e Reajuste:', styles: { fontStyle: 'bold' } },
      { content: `${dIPMC?.tipoProventos || 'Integralidade e Paridade com a Carreira da CMC'}` }
    ],
    [
      { content: 'Adicional por Tempo de Serviço (ATS):', styles: { fontStyle: 'bold' } },
      { content: `${data.regrasTransitorias.atsPercentual}% ${valorATS > 0 ? `(R$ ${formatCurrency(valorATS)})` : ''}` }
    ],
    [
      { content: 'Gratificação Especial / Incorporação FGs:', styles: { fontStyle: 'bold' } },
      { content: valorGE > 0 ? `R$ ${formatCurrency(valorGE)} (incorporação proporcional apurada)` : 'Não apurada / sem incorporação' }
    ],
    [
      { content: 'Estimativa de Proventos Iniciais (Bruto):', styles: { fontStyle: 'bold', fillColor: [235, 245, 235] } },
      { content: proventosEstimados > 0 ? `R$ ${formatCurrency(proventosEstimados)}` : 'Conforme última remuneração do cargo efetivo', styles: { fontStyle: 'bold', fillColor: [235, 245, 235], textColor: [20, 100, 30] } }
    ],
    [
      { content: 'Situação de Abono de Permanência:', styles: { fontStyle: 'bold' } },
      { content: data.regrasTransitorias.recebeAbono ? `Servidor em gozo de Abono de Permanência desde ${data.regrasTransitorias.dataAbono || 'data do direito'}` : 'Não recebe / Não deferido' }
    ],
    [
      { content: 'Marco da Reforma da Previdência (LC 133/2021):', styles: { fontStyle: 'bold' } },
      { content: `Idade em 31/12/2021: ${data.regrasTransitorias.idadeEm31Dez2021} anos | Tempo: ${data.regrasTransitorias.tempoEm31Dez2021Anos} anos (${formatNumber(data.marcos.diasAte31Dez2021)} dias)` }
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    body: quadroPrevidenciario as any,
    theme: 'grid',
    styles: { fontSize: 7.6, cellPadding: 1.65, lineColor: COLOR_BORDER, lineWidth: 0.15, textColor: COLOR_TEXT },
    columnStyles: {
      0: { cellWidth: 68 },
      1: { cellWidth: 116 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5.5;

  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = margin + 4;
  }

  // Termo de Declaração Final
  doc.setFillColor(250, 252, 255);
  doc.setDrawColor(195, 212, 230);
  doc.roundedRect(margin, currentY, contentWidth, 18.5, 1.0, 1.0, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.7);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('TERMO DE CONFORMIDADE E VALIDAÇÃO PREVIDENCIÁRIA', margin + 3.5, currentY + 4.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.1);
  doc.setTextColor(50, 55, 65);
  const textoTermo = 'Certifico que os tempos de serviço e contribuição, averbações de vínculos e dados remuneratórios constantes deste dossiê foram conferidos junto aos assentamentos funcionais arquivados na Diretoria de Gestão de Pessoas da Câmara Municipal de Curitiba, estando em consonância com a Lei Complementar Municipal nº 133/2021 e orientações normativas do IPMC.';
  const splitTermo = doc.splitTextToSize(textoTermo, contentWidth - 7);
  doc.text(splitTermo, margin + 3.5, currentY + 8.4);

  currentY += 24.5;

  // Assinatura Padronizada Final
  renderAssinaturaInstitucional(
    doc,
    currentY,
    margin,
    data.lavratura,
    'Servidor(a) responsável pela instrução e conferência:'
  );

  // Rodapé paginado em todas as páginas
  aplicarRodapesPaginados(
    doc,
    margin,
    (idx) =>
      idx === 1
        ? 'Dossiê Previdenciário CMC / IPMC • Despacho de Remessa e Juntada'
        : 'Dossiê Previdenciário CMC / IPMC • Espelho Funcional e Síntese de Proventos'
  );

  const cleanNome = data.servidor.nome.replace(/\s+/g, '_');
  const filename = `Dossie_Envio_IPMC_${data.numeroCertidao.replace(/[^a-zA-Z0-9]/g, '-')}_${cleanNome}.pdf`;
  doc.save(filename);
}
