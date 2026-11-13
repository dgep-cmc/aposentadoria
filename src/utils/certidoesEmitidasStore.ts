import { CertidaoData } from './exportCertidaoPDF';

export interface CertidaoEmitida {
  id: string;
  numeroCertidao: string; // Ex: "04/2026" ou "SIMULAÇÃO"
  tipo: 'oficial' | 'simulacao';
  dataCertidao: string; // "22/10/2026"
  dataEmissaoTimestamp: string; // ISO date
  ultimaEdicaoTimestamp?: string; // ISO date quando editada posteriormente
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
 * Remove uma certidão do histórico
 */
export function excluirCertidaoEmitida(id: string): void {
  try {
    const current = getCertidoesEmitidas();
    const updated = current.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
  const storageKey = `${isAbono ? SEQ_ABONO_KEY_PREFIX : SEQ_APOSENTADORIA_KEY_PREFIX}${anoAtual}`;
  const savedSeq = localStorage.getItem(storageKey);

  let nextNum: number;
  if (savedSeq !== null) {
    nextNum = parseInt(savedSeq, 10) + 1;
  } else if (isAbono) {
    // Inicia sequência independente de Abono em 01/AAAA (ou próximo disponível caso já exista abono oficial no ano)
    const anoSuffix = `/${anoAtual}`;
    const existingMax = getCertidoesEmitidas()
      .filter(c => c.tipo === 'oficial' && c.snapshot?.tipoCertidao === 'abono_permanencia' && c.numeroCertidao?.endsWith(anoSuffix))
      .reduce((max, c) => {
        const parsed = parseInt(c.numeroCertidao.split('/')[0], 10);
        return !isNaN(parsed) && parsed > max ? parsed : max;
      }, 0);
    nextNum = existingMax > 0 ? existingMax + 1 : 1;
  } else {
    nextNum = 4; // Inicializa Aposentadoria em 04/2026 pois o exemplo modelo oficial é 03/2026
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
 * Confirma e consome o próximo número sequencial oficial da certidão conforme seu tipo
 */
export function consumirProximoNumeroOficial(tipoCertidao: TipoCertidaoSequencial = 'aposentadoria'): string {
  const anoAtual = new Date().getFullYear();
  const { storageKey, nextNum } = resolveSequenceConfig(tipoCertidao, anoAtual);
  localStorage.setItem(storageKey, String(nextNum));
  return `${String(nextNum).padStart(2, '0')}/${anoAtual}`;
}
