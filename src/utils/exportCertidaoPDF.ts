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
 * Gera a Certidão Oficial de Aposentadoria / Abono de Permanência (Padrão DGEP/CMC)
 * Espelha fielmente o layout da Visualização Prévia e ajusta automaticamente o espaçamento
 * para caber integralmente em uma única página A4 (incluindo lavratura e assinatura).
 */
export function gerarCertidaoAposentadoriaPadraoPDF(data: CertidaoData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();   // 210 mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 186 mm

  const isSimulacao = Boolean(
    data.isSimulacao ||
    data.numeroCertidao?.toUpperCase().includes('SIMULAÇÃO') ||
    data.numeroCertidao?.toUpperCase().includes('MINUTA')
  );
  const isAbono = data.tipoCertidao === 'abono_permanencia';

  // Estimativa prévia de linhas extras para garantir encaixe em 1 página única
  const g = data.gradeTempo;
  const inssDescStr = (g.tempoINSSPrivada.periodoDesc || '').trim();
  const inssDescLinesCount = inssDescStr ? doc.setFontSize(6.5).splitTextToSize(inssDescStr, 110).length : 0;
  const tceLinesCount = doc.setFontSize(7.8).splitTextToSize(data.servidor.registroTribunalContas || 'Sem registro', contentWidth - 8).length;
  const nomeCargoExtra =
    (doc.setFontSize(8.2).splitTextToSize(data.servidor.nome || '---', contentWidth * 0.5 - 6).length - 1) +
    (doc.setFontSize(8.2).splitTextToSize(data.servidor.cargo || '---', contentWidth * 0.5 - 6).length - 1);
  const extraLinesPressure = inssDescLinesCount + Math.max(0, tceLinesCount - 1) + Math.max(0, nomeCargoExtra);
  const isCompact = extraLinesPressure >= 3;
  const isUltraCompact = extraLinesPressure >= 7;

  const sectionGap = isUltraCompact ? 3.2 : isCompact ? 3.8 : 4.5;
  const tblPadY = isUltraCompact ? 1.15 : isCompact ? 1.35 : 1.55;
  const tblHeadPadY = isUltraCompact ? 1.45 : isCompact ? 1.65 : 1.9;
  const tblFontSize = isUltraCompact ? 7.0 : isCompact ? 7.25 : 7.45;

  let currentY = isUltraCompact ? 8.0 : 9.5;

  // -----------------------------------------------------------------
  // 1. CABEÇALHO INSTITUCIONAL (IDÊNTICO À VISUALIZAÇÃO PRÉVIA)
  // -----------------------------------------------------------------
  const logoW = 34;
  const logoH = logoW / CMC_LOGO_ASPECT_RATIO; // ~13.2 mm

  doc.addImage(CMC_LOGO_BASE64, 'PNG', margin, currentY, logoW, logoH);

  // Linha vertical divisória cinza sutil
  const divX = margin + logoW + 4.5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.35);
  doc.line(divX, currentY + 1.0, divX, currentY + logoH - 0.5);

  // Identificação Institucional (SEM "Certidão de Tempo de Contribuição")
  const textX = divX + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.0);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('DIRETORIA DE GESTÃO DE PESSOAS — DGEP', textX, currentY + 5.6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.0);
  doc.setTextColor(82, 92, 106);
  doc.text('Setor de Gestão de Processos e Benefícios Funcionais', textX, currentY + 10.6);

  // Linha divisória inferior do cabeçalho (#002f5a)
  const headerBottomLineY = currentY + logoH + 2.0;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(0.55);
  doc.line(margin, headerBottomLineY, margin + contentWidth, headerBottomLineY);

  currentY = headerBottomLineY + (isUltraCompact ? 2.8 : 3.5);

  // -----------------------------------------------------------------
  // 2. FAIXA TÍTULO DA CERTIDÃO (CAIXA ARREDONDADA COMO NA PRÉVIA)
  // -----------------------------------------------------------------
  const titleBannerH = 9.0;
  let bannerBg: [number, number, number] = [240, 244, 248]; // #f0f4f8
  let bannerBorder: [number, number, number] = [185, 207, 228];
  let bannerTextColor: [number, number, number] = COLOR_PRIMARY;

  if (isSimulacao) {
    bannerBg = [255, 251, 235];
    bannerBorder = [252, 211, 77];
    bannerTextColor = [146, 64, 14];
  } else if (isAbono) {
    bannerBg = [250, 245, 255]; // bg-purple-50
    bannerBorder = [216, 180, 254]; // border-purple-300
    bannerTextColor = [59, 7, 100]; // text-purple-950
  }

  doc.setFillColor(...bannerBg);
  doc.setDrawColor(...bannerBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, titleBannerH, 1.5, 1.5, 'FD');

  const bannerMidY = currentY + 5.7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(...bannerTextColor);

  if (isSimulacao) {
    const tituloMinuta = isAbono
      ? 'CERTIDÃO DE ABONO DE PERMANÊNCIA — MINUTA'
      : 'CERTIDÃO DE APOSENTADORIA — MINUTA DE SIMULAÇÃO';
    doc.text(tituloMinuta, margin + 3.8, bannerMidY);

    doc.setFontSize(7.6);
    doc.text(`SEM CONTROLE NUMÉRICO  •  Data da certidão: ${data.dataCertidao}`, pageWidth - margin - 3.8, bannerMidY, {
      align: 'right'
    });
  } else {
    const tituloOficial = isAbono
      ? `CERTIDÃO DE ABONO DE PERMANÊNCIA Nº ${data.numeroCertidao.toUpperCase()}`
      : `CERTIDÃO DE APOSENTADORIA Nº ${data.numeroCertidao.toUpperCase()}`;
    doc.text(tituloOficial, margin + 3.8, bannerMidY);

    if (isAbono) {
      const titleW = doc.getTextWidth(tituloOficial);
      const badgeX = margin + 3.8 + titleW + 3.0;
      const badgeText = 'EFEITO: ABONO DE PERMANÊNCIA';
      doc.setFontSize(6.0);
      const badgeW = doc.getTextWidth(badgeText) + 4.0;
      doc.setFillColor(233, 213, 255);
      doc.setDrawColor(216, 180, 254);
      doc.setLineWidth(0.2);
      doc.roundedRect(badgeX, currentY + 2.3, badgeW, 4.4, 0.8, 0.8, 'FD');
      doc.setTextColor(88, 28, 135);
      doc.text(badgeText, badgeX + 2.0, currentY + 5.3);
    }

    // Data à direita
    const dateLabel = 'Data da certidão: ';
    const dateVal = data.dataCertidao || '';
    doc.setFontSize(7.7);
    const valW = doc.setFont('helvetica', 'bold').getTextWidth(dateVal);
    const rightEdge = pageWidth - margin - 3.8;
    doc.setTextColor(55, 65, 81);
    doc.text(dateVal, rightEdge, bannerMidY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(dateLabel, rightEdge - valW, bannerMidY, { align: 'right' });
  }

  currentY += titleBannerH + sectionGap;

  const drawSectionHeading = (title: string) => {
    doc.setFillColor(...COLOR_PRIMARY);
    doc.rect(margin, currentY - 2.9, 1.0, 3.6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(title, margin + 2.5, currentY);
    currentY += 2.6;
  };

  // -----------------------------------------------------------------
  // BLOCO 1: DADOS DO SERVIDOR (CARD LIMPO ARREDONDADO COMO NA PRÉVIA)
  // -----------------------------------------------------------------
  drawSectionHeading('1. DADOS DO SERVIDOR');

  const padX = 4.0;
  const padTop = isUltraCompact ? 2.6 : 3.2;
  const rowGap = isUltraCompact ? 2.0 : isCompact ? 2.4 : 2.8;
  const innerW = contentWidth - padX * 2;
  const col25 = innerW * 0.25;
  const col50 = innerW * 0.5;

  const lblFont = 6.3;
  const valFont = isUltraCompact ? 7.8 : 8.2;

  const calcLines = (text: string, width: number, fontStyle: 'bold' | 'normal' | 'bolditalic' = 'bold') => {
    doc.setFont('helvetica', fontStyle);
    doc.setFontSize(valFont);
    return doc.splitTextToSize(text || '---', Math.max(20, width - 2.5)) as string[];
  };

  const r1Nome = calcLines(data.servidor.nome || '---', col50);
  const r1Rg = calcLines(data.servidor.rg || '---', col25);
  const r1Cpf = calcLines(data.servidor.cpf || '---', col25);
  const r1H = 3.1 + Math.max(r1Nome.length, r1Rg.length, r1Cpf.length) * 3.5;

  const r2Nasc = calcLines(data.servidor.dataNascimento || '---', col25);
  const r2Sexo = calcLines(data.servidor.sexo || '---', col25, 'normal');
  const r2Mat = calcLines(data.servidor.matricula || '---', col25);
  const r2Idade = calcLines(`${data.servidor.idadeHoje} anos`, col25);
  const r2H = 3.1 + Math.max(r2Nasc.length, r2Sexo.length, r2Mat.length, r2Idade.length) * 3.5;

  const r3Cargo = calcLines(data.servidor.cargo || '---', col50);
  const r3Padrao = calcLines(`${data.servidor.padrao || '---'} / ${data.servidor.referencia || '---'}`, col25);
  const r3Adm = calcLines(data.servidor.dataAdmissaoServicoPublico || '---', col25);
  const r3H = 3.1 + Math.max(r3Cargo.length, r3Padrao.length, r3Adm.length) * 3.5;

  const r4Tce = calcLines(data.servidor.registroTribunalContas || 'Sem registro', innerW, 'bolditalic');
  const r4H = 3.1 + r4Tce.length * 3.5;

  const cardServidorH = padTop * 2 + r1H + r2H + r3H + r4H + rowGap * 3 - 0.8;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.28);
  doc.roundedRect(margin, currentY, contentWidth, cardServidorH, 1.8, 1.8, 'FD');

  const drawField = (
    x: number,
    y: number,
    label: string,
    lines: string[],
    opts?: { color?: [number, number, number]; fontStyle?: 'bold' | 'normal' | 'bolditalic' }
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(lblFont);
    doc.setTextColor(107, 114, 128);
    doc.text(label, x, y);

    doc.setFont('helvetica', opts?.fontStyle || 'bold');
    doc.setFontSize(valFont);
    doc.setTextColor(...(opts?.color || [17, 24, 39]));
    doc.text(lines, x, y + 3.4);
  };

  const baseX = margin + padX;
  let cardY = currentY + padTop + 1.8;

  // Linha 1: NOME (50%) | RG (25%) | CPF (25%)
  drawField(baseX, cardY, 'NOME', r1Nome);
  drawField(baseX + col50, cardY, 'RG', r1Rg);
  drawField(baseX + col50 + col25, cardY, 'CPF', r1Cpf);
  cardY += r1H + rowGap;

  // Linha 2: NASCIMENTO | SEXO | MATRÍCULA (azul) | IDADE HOJE
  drawField(baseX, cardY, 'NASCIMENTO', r2Nasc);
  drawField(baseX + col25, cardY, 'SEXO', r2Sexo, { fontStyle: 'bold' });
  drawField(baseX + col50, cardY, 'MATRÍCULA', r2Mat, { color: [0, 75, 141] });
  drawField(baseX + col50 + col25, cardY, 'IDADE HOJE', r2Idade);
  cardY += r2H + rowGap;

  // Linha 3: CARGO (50%) | PADRÃO / REFERÊNCIA (25%) | DATA DE ADMISSÃO (25%)
  drawField(baseX, cardY, 'CARGO', r3Cargo);
  drawField(baseX + col50, cardY, 'PADRÃO / REFERÊNCIA', r3Padrao);
  drawField(baseX + col50 + col25, cardY, 'DATA DE ADMISSÃO', r3Adm);
  cardY += r3H + rowGap;

  // Linha 4: REGISTRO DE ADMISSÃO TCE-PR
  drawField(baseX, cardY, 'REGISTRO DE ADMISSÃO TCE-PR', r4Tce, {
    color: [31, 41, 55],
    fontStyle: 'bolditalic'
  });

  currentY += cardServidorH + sectionGap;

  // -----------------------------------------------------------------
  // BLOCO 2: GRADE DE TEMPO DE SERVIÇO / CONTRIBUIÇÃO
  // -----------------------------------------------------------------
  drawSectionHeading('2. GRADE DE TEMPO DE SERVIÇO / CONTRIBUIÇÃO');

  const formatItemRow = (
    descricao: string,
    item: TempoItem,
    isTotal = false,
    isSubtotal = false,
    subtext?: string
  ) => {
    const isHighlight = isTotal || isSubtotal;
    const bgFill = isTotal ? COLOR_TOTAL : isSubtotal ? COLOR_HIGHLIGHT : undefined;
    const txtColor: [number, number, number] = isHighlight ? COLOR_PRIMARY : [31, 41, 55];
    const rowFontSize = isTotal ? tblFontSize + 0.3 : isSubtotal ? tblFontSize + 0.1 : tblFontSize;

    // Quando há subtext (períodos INSS), colocamos espaço extra via lines vazias e desenhamos com estilo próprio no didDrawCell
    let cellContent = isHighlight ? descricao.toUpperCase() : descricao;
    if (subtext) {
      const wrappedSub = doc.setFontSize(6.4).splitTextToSize(subtext, 112) as string[];
      cellContent = `${descricao}\n${wrappedSub.join('\n')}`;
    }

    return [
      {
        content: cellContent,
        _mainTitle: subtext ? descricao : undefined,
        _subtext: subtext || undefined,
        _isTotal: isTotal,
        _isSubtotal: isSubtotal,
        styles: {
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: subtext ? ([255, 255, 255] as [number, number, number]) : txtColor,
          fontSize: rowFontSize
        }
      },
      {
        content: String(item.anos),
        _isTotal: isTotal,
        _isSubtotal: isSubtotal,
        styles: {
          halign: 'center',
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: isHighlight ? COLOR_PRIMARY : [55, 65, 81],
          fontSize: rowFontSize
        }
      },
      {
        content: String(item.meses),
        _isTotal: isTotal,
        _isSubtotal: isSubtotal,
        styles: {
          halign: 'center',
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: isHighlight ? COLOR_PRIMARY : [55, 65, 81],
          fontSize: rowFontSize
        }
      },
      {
        content: String(item.dias),
        _isTotal: isTotal,
        _isSubtotal: isSubtotal,
        styles: {
          halign: 'center',
          fontStyle: isHighlight ? 'bold' : 'normal',
          fillColor: bgFill as any,
          textColor: isHighlight ? COLOR_PRIMARY : [55, 65, 81],
          fontSize: rowFontSize
        }
      },
      {
        content: formatNumber(item.totalDias),
        _isTotal: isTotal,
        _isSubtotal: isSubtotal,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: bgFill as any,
          textColor: isSubtotal ? ([0, 85, 153] as [number, number, number]) : isTotal ? COLOR_PRIMARY : [17, 24, 39],
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
    formatItemRow('Tempo Fícto (licenças-prêmio incorporadas – CMC):', g.tempoFictoLicencaPremio),
    formatItemRow('Tempo de Serviço Público Municipal (Recibado) incorporado:', g.tempoServicoPublicoRecibado),
    formatItemRow(
      `Tempo de Serviço Público Municipal (CLT) incorporado ${g.tempoServicoPublicoCLT.periodoDesc ? `(${g.tempoServicoPublicoCLT.periodoDesc.replace(/^\(|\)$/g, '')}):` : ':'}`,
      g.tempoServicoPublicoCLT
    ),
    formatItemRow('Outras incorporações de Tempo de Serviço Público (Estatutário):', g.outrasIncorporacoesEstatutario),
    formatItemRow('Outras incorporações de Tempo de Serviço Público (CLT):', g.outrasIncorporacoesCLT),
    formatItemRow('Afastamentos sem vencimento:', g.afastamentosSemVencimento),
    formatItemRow('Penalidades Administrativas, suspensão e faltas:', g.penalidadesAdministrativas),
    formatItemRow('Tempo Total de Serviço Público:', g.tempoTotalServicoPublico, false, true),
    formatItemRow(
      'Tempo de Contribuição na iniciativa privada incorporado (INSS)',
      g.tempoINSSPrivada,
      false,
      false,
      inssDescStr || undefined
    ),
    formatItemRow('Tempo Total de Serviço/Contribuição:', g.tempoTotalServicoContribuicao, true, false)
  ];

  const gradeStartY = currentY;
  // Colunas: [118, 16, 16, 16, 20] = 186 mm
  autoTable(doc, {
    startY: gradeStartY,
    margin: { left: margin, right: margin, bottom: 12 },
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
    theme: 'plain',
    styles: {
      fontSize: tblFontSize,
      cellPadding: { top: tblPadY, bottom: tblPadY, left: 2.4, right: 2.4 },
      textColor: [31, 41, 55],
      valign: 'middle'
    },
    headStyles: {
      fillColor: COLOR_PRIMARY,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: tblFontSize,
      cellPadding: { top: tblHeadPadY, bottom: tblHeadPadY, left: 2.4, right: 2.4 }
    },
    columnStyles: {
      0: { cellWidth: 118 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 20 }
    },
    didDrawCell: (hookData) => {
      if (hookData.section !== 'body') return;
      const cell = hookData.cell;
      const raw = cell.raw as any;

      // Renderiza linha do INSS com título normal + períodos em cinza menor (como na prévia)
      if (hookData.column.index === 0 && raw?._mainTitle && raw?._subtext) {
        doc.setFillColor(255, 255, 255);
        doc.rect(cell.x + 0.3, cell.y + 0.3, cell.width - 0.6, cell.height - 0.6, 'F');

        const innerTextX = cell.x + 2.4;
        const mainY = cell.y + tblPadY + 2.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(tblFontSize);
        doc.setTextColor(31, 41, 55);
        doc.text(raw._mainTitle, innerTextX, mainY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.setTextColor(107, 114, 128);
        const subLines = doc.splitTextToSize(raw._subtext, cell.width - 4.8) as string[];
        doc.text(subLines, innerTextX, mainY + 3.0);
      }

      // Bordas horizontais sutis entre linhas (sem grade vertical pesada)
      if (raw?._isTotal) {
        doc.setDrawColor(...COLOR_PRIMARY);
        doc.setLineWidth(0.45);
        doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
      } else if (raw?._isSubtotal) {
        doc.setDrawColor(191, 219, 254);
        doc.setLineWidth(0.25);
        doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
        doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      } else {
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.15);
        doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      }
    }
  });

  const gradeEndY = (doc as any).lastAutoTable.finalY;
  // Borda externa limpa da tabela
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.28);
  doc.rect(margin, gradeStartY, contentWidth, gradeEndY - gradeStartY, 'S');

  currentY = gradeEndY + sectionGap;

  // -----------------------------------------------------------------
  // BLOCO 3: TEMPOS DE EXERCÍCIO (CABEÇALHO CINZA CLARO COMO NA PRÉVIA)
  // -----------------------------------------------------------------
  drawSectionHeading('3. TEMPOS DE EXERCÍCIO');

  const te = data.temposExercicio;
  const temposExercicioBody = [
    [
      { content: `Tempo de serviço público ${te.servicoPublicoTotal.periodoDesc ? `(${te.servicoPublicoTotal.periodoDesc})` : ''}` },
      { content: String(te.servicoPublicoTotal.anos), styles: { halign: 'center' } },
      { content: String(te.servicoPublicoTotal.meses), styles: { halign: 'center' } },
      { content: String(te.servicoPublicoTotal.dias), styles: { halign: 'center' } },
      { content: formatNumber(te.servicoPublicoTotal.totalDias), styles: { halign: 'right', fontStyle: 'bold', textColor: [31, 41, 55] } }
    ],
    [
      { content: `Tempo no cargo efetivo ${te.cargoEfetivoTotal.periodoDesc ? `(${te.cargoEfetivoTotal.periodoDesc})` : ''}` },
      { content: String(te.cargoEfetivoTotal.anos), styles: { halign: 'center' } },
      { content: String(te.cargoEfetivoTotal.meses), styles: { halign: 'center' } },
      { content: String(te.cargoEfetivoTotal.dias), styles: { halign: 'center' } },
      { content: formatNumber(te.cargoEfetivoTotal.totalDias), styles: { halign: 'right', fontStyle: 'bold', textColor: [31, 41, 55] } }
    ]
  ];

  const teStartY = currentY;
  autoTable(doc, {
    startY: teStartY,
    margin: { left: margin, right: margin, bottom: 12 },
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
    theme: 'plain',
    styles: {
      fontSize: tblFontSize,
      cellPadding: { top: tblPadY, bottom: tblPadY, left: 2.4, right: 2.4 },
      textColor: [31, 41, 55],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [243, 244, 246], // bg-gray-100 igual à prévia
      textColor: [55, 65, 81],
      fontStyle: 'bold',
      fontSize: tblFontSize - 0.1,
      cellPadding: { top: tblHeadPadY - 0.15, bottom: tblHeadPadY - 0.15, left: 2.4, right: 2.4 }
    },
    columnStyles: {
      0: { cellWidth: 118 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 20 }
    },
    didDrawCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === 0) {
        const c = hookData.cell;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.15);
        doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height);
      }
    }
  });

  const teEndY = (doc as any).lastAutoTable.finalY;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.28);
  doc.rect(margin, teStartY, contentWidth, teEndY - teStartY, 'S');

  currentY = teEndY + sectionGap;

  // -----------------------------------------------------------------
  // BLOCO 4: OUTRAS INFORMAÇÕES & REGRAS TRANSITÓRIAS (CARD 2 COLUNAS)
  // -----------------------------------------------------------------
  const rt = data.regrasTransitorias;
  const infoCardH = isUltraCompact ? 16.5 : 18.2;

  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.28);
  doc.roundedRect(margin, currentY, contentWidth, infoCardH, 1.5, 1.5, 'FD');

  const drawLabelBoldSuffix = (x: number, y: number, prefix: string, boldPart: string, suffix = '') => {
    doc.setFontSize(tblFontSize);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(prefix, x, y);
    const w1 = doc.getTextWidth(prefix);

    doc.setFont('helvetica', 'bold');
    doc.text(boldPart, x + w1, y);
    if (suffix) {
      const w2 = doc.getTextWidth(boldPart);
      doc.setFont('helvetica', 'normal');
      doc.text(suffix, x + w1 + w2, y);
    }
  };

  const colLeftX = margin + 4.0;
  const colRightX = margin + contentWidth / 2 + 2.5;
  const infoTitleY = currentY + 4.4;

  // Coluna esquerda
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(55, 65, 81);
  doc.text('OUTRAS INFORMAÇÕES', colLeftX, infoTitleY);

  drawLabelBoldSuffix(colLeftX, infoTitleY + 4.6, 'Adicional por Tempo de Serviço: ', `${rt.atsPercentual}%`);
  const abonoTxt = rt.recebeAbono ? `Sim (Data: ${rt.dataAbono || 'Concedido'})` : 'Não';
  drawLabelBoldSuffix(colLeftX, infoTitleY + 9.2, 'Recebe Abono de Permanência? ', abonoTxt);

  // Coluna direita
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(55, 65, 81);
  doc.text('INFORMAÇÕES PARA AS REGRAS TRANSITÓRIAS (LC 133/2021)', colRightX, infoTitleY);

  drawLabelBoldSuffix(colRightX, infoTitleY + 4.6, 'Idade em 31/12/2021: ', `${rt.idadeEm31Dez2021} anos`);
  drawLabelBoldSuffix(
    colRightX,
    infoTitleY + 9.2,
    'Tempo Serviço/Contribuição em 31/12/2021: ',
    `${rt.tempoEm31Dez2021Anos} anos`,
    ` (${formatNumber(data.marcos.diasAte31Dez2021)} dias)`
  );

  currentY += infoCardH + (isUltraCompact ? 3.5 : 4.8);

  // -----------------------------------------------------------------
  // BLOCO 5: LAVRATURA E ASSINATURA (LAYOUT HORIZONTAL IGUAL À PRÉVIA)
  // -----------------------------------------------------------------
  // Garantir que só quebre página em casos absolutamente extremos de extrapolação
  if (currentY > pageHeight - 25) {
    doc.addPage();
    currentY = margin + 4;
  }

  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.28);
  doc.line(margin, currentY, margin + contentWidth, currentY);

  const lavY = currentY + (isUltraCompact ? 7.5 : 9.5);

  // Data por extenso à esquerda
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(75, 85, 99);
  doc.text(`${data.lavratura.cidade || 'Curitiba'}, ${data.lavratura.data || ''}`, margin, lavY + 2.0);

  // Assinatura centralizada à direita (idêntica à Visualização Prévia)
  const signBlockW = 84;
  const signCenterX = pageWidth - margin - signBlockW / 2;
  const lineHalfW = 34;

  doc.setDrawColor(156, 163, 175);
  doc.setLineWidth(0.32);
  doc.line(signCenterX - lineHalfW, lavY, signCenterX + lineHalfW, lavY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.setTextColor(17, 24, 39);
  doc.text(
    data.lavratura.servidorNome || 'Setor de Gestão de Processos e Benefícios Funcionais',
    signCenterX,
    lavY + 4.0,
    { align: 'center' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.9);
  doc.setTextColor(107, 114, 128);
  const matStr = data.lavratura.servidorMatricula ? `Matrícula ${data.lavratura.servidorMatricula}` : '';
  const setorStr = data.lavratura.setor || 'Diretoria de Gestão de Pessoas — DGEP';
  const subSignText = matStr ? `${matStr} • ${setorStr}` : setorStr;
  const subSignLines = doc.splitTextToSize(subSignText, signBlockW) as string[];
  doc.text(subSignLines, signCenterX, lavY + 7.6, { align: 'center' });

  // Rodapés dinâmicos (suporta 1 página única com folga)
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
  const tipoFile = isAbono ? 'Certidao_Abono' : 'Certidao_Aposentadoria';
  const filename = isSimulacao
    ? `${tipoFile}_Simulacao_${cleanNome}.pdf`
    : `${tipoFile}_${data.numeroCertidao.replace(/[^a-zA-Z0-9]/g, '-')}_${cleanNome}.pdf`;
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
