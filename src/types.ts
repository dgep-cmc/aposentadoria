export interface ServerData {
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

export interface RuleSimulationResult {
  nome: string;
  aplicavel: boolean;
  motivo?: string;
  data?: Date;
  proventos?: string;
  isVantajosa?: boolean;
  detalhes?: {
    idade: number;
    contrib: number;
    sp: number;
    cargo: number;
    pontos: number;
  };
}

export interface ProventosFormData {
  serverName: string;
  serverId: string;
  birthDate: string;
  admissionDate: string;
  gender: 'masculino' | 'feminino';
  career: string;
  careerLevel: 'medio' | 'superior';
  currentCareerBandIndex: string; // empty string for auto, or number 1-36
  lastAtsConcession: string;
  lastAtsNumber: number;
  historicalData: string;
  needsUpdate?: boolean; // toggle to apply INSS factors
  needsUpdateHistorical?: boolean; // toggle to apply INSS factors to Section 3 CMC

  incorporations: IncorporationRow[];
  stimuli: StimulusRow[];
  functions: FunctionRow[];
  extensionMode: 'normal' | 'compulsoria' | 'cem_por_cento' | 'custom';
  extraYears: number;
}

export interface IncorporationRow {
  id: string;
  type: 'contribution-only' | 'all-effects' | 'pre-1994';
  years: number;
  months: number;
  days: number;
  value: string; // currency formatting input
  needsUpdate?: boolean;
}

export interface StimulusRow {
  id: string;
  type: 'graduacao' | 'pos_graduacao' | 'mestrado' | 'doutorado';
  date: string;
}

export interface FunctionRow {
  id: string;
  start: string;
  end: string;
  level: 'FG4' | 'FG5' | 'FG6' | 'FG7' | 'FG8';
}

export interface ContributionResult {
  competencia: string;
  valorOriginal: number;
  fator: number;
  valorAtualizado: number;
}
