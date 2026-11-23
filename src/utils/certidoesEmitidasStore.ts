import { CertidaoData } from './exportCertidaoPDF';

export interface CertidaoEmitida {
  id: string;
  numeroCertidao: string; // Ex: "04/2026" ou "SIMULAÇÃO"
  tipo: 'oficial' | 'simulacao';
  dataCertidao: string; // "22/10/2026"
  dataEmissaoTimestamp: string; // ISO date
  ultimaEdicaoTimestamp?: string; // ISO date quando editada posteriormente
  ultimaReemissaoTimestamp?: string; // ISO date quando reemitida mantendo o mesmo número
  reemissoes?: number; // Contador de reemissões do mesmo registro
  servidorNome: string;
  matricula: string;
  cargo: string;
  tempoTotalDias: number;
  tempoFormatado: string; // Ex: "33 anos, 0 meses e 28 dias"
  emitidoPor?: string;
  snapshot: CertidaoData;
}

export type TipoCertidaoSequencial = 'aposentadoria' | 'abono_permanencia';

const STORAGE_KEY = 'dgep_certidoes_emitidas';
const SEQ_APOSENTADORIA_KEY_PREFIX = 'dgep_certidao_seq_';
const SEQ_ABONO_KEY_PREFIX = 'dgep_certidao_abono_seq_';

function normalizeTipoCertidao(item: CertidaoEmitida): TipoCertidaoSequencial {
  if (item.snapshot?.tipoCertidao === 'abono_permanencia') return 'abono_permanencia';
  if ((item.cargo || '').toLowerCase().includes('abono de permanência')) return 'abono_permanencia';
  return 'aposentadoria';
}

function getStorageKeyForSeq(tipoCertidao: TipoCertidaoSequencial, ano: number): string {
  const isAbono = tipoCertidao === 'abono_permanencia';
  return `${isAbono ? SEQ_ABONO_KEY_PREFIX : SEQ_APOSENTADORIA_KEY_PREFIX}${ano}`;
}

function parseNumeroAno(numero?: string): { num: number; ano: number } | null {
  const match = (numero || '').trim().match(/^(\d+)\s*\/\s*(\d{4})$/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const ano = parseInt(match[2], 10);
  if (isNaN(num) || isNaN(ano) || num < 1) return null;
  return { num, ano };
}

function getMaiorNumeroOficialNoHistorico(
  list: CertidaoEmitida[],
  tipoCertidao: TipoCertidaoSequencial,
  ano: number
): number {
  const anoSuffix = `/${ano}`;
  return list
    .filter(
      c =>
        c.tipo === 'oficial' &&
        normalizeTipoCertidao(c) === tipoCertidao &&
        (c.numeroCertidao || '').trim().endsWith(anoSuffix)
    )
    .reduce((max, c) => {
      const parsed = parseNumeroAno(c.numeroCertidao);
      return parsed && parsed.num > max ? parsed.num : max;
    }, 0);
}

/**
 * Retorna todas as certidões emitidas salvas
 */
export function getCertidoesEmitidas(): CertidaoEmitida[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: CertidaoEmitida[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Erro ao ler certidões emitidas:', e);
    return [];
  }
}

/**
 * Salva uma nova certidão emitida no histórico
 */
export function salvarCertidaoEmitida(item: CertidaoEmitida): void {
  try {
    const current = getCertidoesEmitidas();
    // Adiciona no início da lista
    const updated = [item, ...current.filter(c => c.id !== item.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Erro ao salvar certidão emitida:', e);
  }
}

/**
 * Atualiza uma certidão já emitida no histórico sem alterar a contagem sequencial oficial
 */
export function atualizarCertidaoEmitida(item: CertidaoEmitida): void {
  try {
    const current = getCertidoesEmitidas();
    const index = current.findIndex(c => c.id === item.id);
    const enriched: CertidaoEmitida = {
      ...item,
      ultimaEdicaoTimestamp: new Date().toISOString()
    };
    const updated =
      index >= 0
        ? current.map((c, idx) => (idx === index ? enriched : c))
        : [enriched, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Erro ao atualizar certidão emitida:', e);
  }
}

/**
 * Reemite uma certidão já registrada mantendo EXATAMENTE o mesmo ID e número oficial,
 * atualizando seus dados/snapshot e incrementando o contador de reemissões.
 */
export function reemitirCertidaoNoRegistro(
  certidaoId: string,
  updatedSnapshot: CertidaoData
): CertidaoEmitida | null {
  try {
    const current = getCertidoesEmitidas();
    const original = current.find(c => c.id === certidaoId);
    if (!original) return null;

    const numeroPreservado = original.numeroCertidao;
    const isSimulacao = original.tipo === 'simulacao';
    const snapshotFinal: CertidaoData = {
      ...updatedSnapshot,
      numeroCertidao: isSimulacao ? 'SIMULAÇÃO' : numeroPreservado,
      isSimulacao,
      tipoCertidao: original.snapshot?.tipoCertidao || updatedSnapshot.tipoCertidao || 'aposentadoria'
    };

    const grade = snapshotFinal.gradeTempo.tempoTotalServicoContribuicao;
    const isAbono = snapshotFinal.tipoCertidao === 'abono_permanencia';
    const reemitida: CertidaoEmitida = {
      ...original,
      numeroCertidao: numeroPreservado,
      dataCertidao: snapshotFinal.dataCertidao,
      servidorNome: snapshotFinal.servidor.nome,
      matricula: snapshotFinal.servidor.matricula,
      cargo: isAbono
        ? `${snapshotFinal.servidor.cargo} (Abono de Permanência)`
        : snapshotFinal.servidor.cargo,
      tempoTotalDias: grade.totalDias,
      tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
      ultimaReemissaoTimestamp: new Date().toISOString(),
      reemissoes: (original.reemissoes || 0) + 1,
      snapshot: snapshotFinal
    };

    const updated = current.map(c => (c.id === certidaoId ? reemitida : c));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return reemitida;
  } catch (e) {
    console.error('Erro ao reemitir certidão no registro:', e);
    return null;
  }
}

/**
 * Busca a certidão oficial mais recente já emitida para um determinado servidor e finalidade
 */
export function findCertidaoOficialPorServidor(params: {
  matricula?: string;
  servidorNome?: string;
  tipoCertidao: TipoCertidaoSequencial;
}): CertidaoEmitida | undefined {
  const mat = (params.matricula || '').trim().toLowerCase();
  const nome = (params.servidorNome || '').trim().toLowerCase();
  if (!mat && !nome) return undefined;

  return getCertidoesEmitidas().find(c => {
    if (c.tipo !== 'oficial') return false;
    if (normalizeTipoCertidao(c) !== params.tipoCertidao) return false;
    const cMat = (c.matricula || '').trim().toLowerCase();
    const cNome = (c.servidorNome || '').trim().toLowerCase();
    if (mat && cMat) return mat === cMat;
    if (nome && cNome) return nome === cNome;
    return false;
  });
}

/**
 * Busca uma certidão oficial já registrada pelo seu número e finalidade
 */
export function findCertidaoOficialPorNumero(
  numeroCertidao: string,
  tipoCertidao: TipoCertidaoSequencial
): CertidaoEmitida | undefined {
  const numNorm = (numeroCertidao || '').trim().toLowerCase();
  if (!numNorm || numNorm.startsWith('simula')) return undefined;
  return getCertidoesEmitidas().find(
    c =>
      c.tipo === 'oficial' &&
      normalizeTipoCertidao(c) === tipoCertidao &&
      (c.numeroCertidao || '').trim().toLowerCase() === numNorm
  );
}

/**
 * Remove uma certidão do histórico e ressincroniza a sequência caso o registro removido fosse o último emitido
 */
export function excluirCertidaoEmitida(id: string): void {
  try {
    const current = getCertidoesEmitidas();
    const target = current.find(c => c.id === id);
    const updated = current.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (target && target.tipo === 'oficial') {
      const parsed = parseNumeroAno(target.numeroCertidao);
      if (parsed) {
        const tipo = normalizeTipoCertidao(target);
        const storageKey = getStorageKeyForSeq(tipo, parsed.ano);
        const savedRaw = localStorage.getItem(storageKey);
        const savedNum = savedRaw !== null ? parseInt(savedRaw, 10) : NaN;
        if (!isNaN(savedNum) && parsed.num >= savedNum) {
          const remainingMax = getMaiorNumeroOficialNoHistorico(updated, tipo, parsed.ano);
          if (remainingMax > 0) {
            localStorage.setItem(storageKey, String(remainingMax));
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    }
  } catch (e) {
    console.error('Erro ao excluir certidão emitida:', e);
  }
}

/**
 * Limpa todo o histórico de certidões emitidas
 */
export function limparHistoricoCertidoes(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

function resolveSequenceConfig(tipoCertidao: TipoCertidaoSequencial, anoAtual: number): { storageKey: string; nextNum: number } {
  const isAbono = tipoCertidao === 'abono_permanencia';
  const storageKey = getStorageKeyForSeq(tipoCertidao, anoAtual);
  const savedSeq = localStorage.getItem(storageKey);
  const existingMax = getMaiorNumeroOficialNoHistorico(getCertidoesEmitidas(), tipoCertidao, anoAtual);

  let nextNum: number;
  if (savedSeq !== null) {
    const parsedSaved = parseInt(savedSeq, 10);
    const baseMax = Math.max(isNaN(parsedSaved) ? 0 : parsedSaved, existingMax);
    nextNum = baseMax + 1;
  } else if (isAbono) {
    // Inicia sequência independente de Abono em 01/AAAA (ou próximo disponível caso já exista abono oficial no ano)
    nextNum = existingMax > 0 ? existingMax + 1 : 1;
  } else {
    // Inicializa Aposentadoria em 04/2026 pois o exemplo modelo oficial é 03/2026
    nextNum = existingMax >= 4 ? existingMax + 1 : 4;
  }

  if (isNaN(nextNum) || nextNum < 1) nextNum = 1;
  return { storageKey, nextNum };
}

/**
 * Obtém o próximo número sequencial oficial da certidão sem incrementá-lo
 */
export function getProximoNumeroOficial(tipoCertidao: TipoCertidaoSequencial = 'aposentadoria'): string {
  const anoAtual = new Date().getFullYear();
  const { nextNum } = resolveSequenceConfig(tipoCertidao, anoAtual);
  return `${String(nextNum).padStart(2, '0')}/${anoAtual}`;
}

/**
 * Registra no controle sequencial que um determinado número NN/AAAA foi consumido
 */
export function registrarNumeroOficialConsumido(
  tipoCertidao: TipoCertidaoSequencial,
  numero: string
): void {
  const parsed = parseNumeroAno(numero);
  if (!parsed) return;
  const storageKey = getStorageKeyForSeq(tipoCertidao, parsed.ano);
  const savedRaw = localStorage.getItem(storageKey);
  const currentSaved = savedRaw !== null ? parseInt(savedRaw, 10) : 0;
  if (isNaN(currentSaved) || parsed.num > currentSaved) {
    localStorage.setItem(storageKey, String(parsed.num));
  }
}

/**
 * Confirma e consome o próximo número sequencial oficial da certidão conforme seu tipo
 */
export function consumirProximoNumeroOficial(tipoCertidao: TipoCertidaoSequencial = 'aposentadoria'): string {
  const anoAtual = new Date().getFullYear();
  const { storageKey, nextNum } = resolveSequenceConfig(tipoCertidao, anoAtual);
  localStorage.setItem(storageKey, String(nextNum));
  return `${String(nextNum).padStart(2, '0')}/${anoAtual}`;
}
