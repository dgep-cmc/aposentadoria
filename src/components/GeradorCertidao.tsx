import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Sparkles, 
  User, 
  Award, 
  CheckCircle2, 
  Clock, 
  FolderSync, 
  Eye, 
  FileCheck,
  Hash,
  Calculator,
  RefreshCw,
  AlertCircle,
  History,
  Trash2,
  Search,
  Filter,
  Save,
  Pencil,
  X,
  Calendar
} from 'lucide-react';
import { CertidaoData, gerarCertidaoAposentadoriaPadraoPDF } from '../utils/exportCertidaoPDF';
import { 
  getSavedSimulations, 
  getDraftSimulation, 
  saveDraftSimulation, 
  saveSimulation, 
  UnifiedSimulation 
} from '../utils/simulationsStore';
import { 
  construirCertidaoAPartirDeSimulacao, 
  diffCalendarDays, 
  calculateExactAge,
  extrairTemposIncorporacoes
} from '../utils/certidaoBuilder';
import { getPatternForCareer } from '../utils/settingsStore';
import { getCareerDisplayName } from '../data/careers';
import { 
  CertidaoEmitida, 
  TipoCertidaoSequencial,
  getCertidoesEmitidas, 
  salvarCertidaoEmitida, 
  atualizarCertidaoEmitida,
  excluirCertidaoEmitida,
  getProximoNumeroOficial,
  consumirProximoNumeroOficial
} from '../utils/certidoesEmitidasStore';

// Dados de Exemplo fiéis ao anexo oficial da Certidão nº 03/2026 (Valdemir Anselmo Pontes)
export const DADOS_EXEMPLO_VALDEMIR: CertidaoData = {
  numeroCertidao: '03/2026',
  dataCertidao: '22/10/2026',
  servidor: {
    nome: 'Valdemir Anselmo Pontes',
    rg: '3.481.411-2',
    cpf: '534.225.389-68',
    sexo: 'Masculino',
    matricula: '4413',
    dataNascimento: '31/08/1965',
    idadeHoje: 61,
    idadeEm31Dez2021: 56,
    orgao: 'Câmara Municipal de Curitiba',
    cargo: 'Analista Legislativo',
    padrao: '306',
    referencia: 'XXXVI',
    dataAdmissaoServicoPublico: '27/06/1988',
    dataAdmissaoEstatutario: '02/10/1993',
    dataRequerimento: '19/10/2025',
    registroTribunalContas: '402750/03 - Resolução nº 8253/2003'
  },
  marcos: {
    diasAteEmissao: 12073,
    diasAte31Dez2021: 13440,
    diferencaDias: 1756
  },
  gradeTempo: {
    tempoEstatutarioCMC: {
      anos: 33,
      meses: 0,
      dias: 28,
      totalDias: 12073,
      periodoDesc: '02/10/1993 a 22/10/2026'
    },
    tempoFictoLicencaPremio: {
      anos: 0,
      meses: 12,
      dias: 0,
      totalDias: 360,
      obs: 'Licenças-prêmio incorporadas – CMC'
    },
    tempoServicoPublicoRecibado: {
      anos: 0,
      meses: 0,
      dias: 0,
      totalDias: 0
    },
    tempoServicoPublicoCLT: {
      anos: 5,
      meses: 3,
      dias: 4,
      totalDias: 1919,
      periodoDesc: '27/06/1988 a 01/10/1993'
    },
    outrasIncorporacoesEstatutario: {
      anos: 0,
      meses: 0,
      dias: 0,
      totalDias: 0
    },
    outrasIncorporacoesCLT: {
      anos: 0,
      meses: 0,
      dias: 0,
      totalDias: 0
    },
    afastamentosSemVencimento: {
      anos: 0,
      meses: 0,
      dias: 0,
      totalDias: 0
    },
    penalidadesAdministrativas: {
      anos: 0,
      meses: 0,
      dias: 0,
      totalDias: 0
    },
    tempoTotalServicoPublico: {
      anos: 39,
      meses: 3,
      dias: 27,
      totalDias: 14352
    },
    tempoINSSPrivada: {
      anos: 2,
      meses: 3,
      dias: 24,
      totalDias: 844,
      periodoDesc: '01/03/1982 a 20/03/1983; 01/07/1983 a 17/07/1984; 11/04/1988 a 27/06/1988'
    },
    tempoTotalServicoContribuicao: {
      anos: 41,
      meses: 7,
      dias: 21,
      totalDias: 15196
    }
  },
  temposExercicio: {
    servicoPublicoTotal: {
      anos: 39,
      meses: 3,
      dias: 27,
      totalDias: 14352,
      periodoDesc: '27/06/1988 a 22/10/2026'
    },
    cargoEfetivoTotal: {
      anos: 33,
      meses: 0,
      dias: 28,
      totalDias: 12073,
      periodoDesc: '02/10/1993 a 22/10/2026'
    }
  },
  regrasTransitorias: {
    atsPercentual: 50,
    recebeAbono: true,
    dataAbono: '31/08/2025',
    idadeEm31Dez2021: 56,
    tempoEm31Dez2021Anos: 36
  },
  lavratura: {
    cidade: 'Curitiba',
    data: '22 de outubro de 2026',
    servidorNome: 'Larissa Carrera Baginski',
    servidorMatricula: '2251',
    setor: 'Setor de Gestão de Processos e Benefícios Funcionais — DGEP/CMC'
  }
};

// Estrutura inicial para certidão vinculada dinamicamente a simulações
export const getCertidaoInicialVazia = (): CertidaoData => {
  const today = new Date();
  const emissaoStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const emissaoExtenso = `${today.getDate()} de ${today.toLocaleDateString('pt-BR', { month: 'long' })} de ${today.getFullYear()}`;

  return {
    numeroCertidao: 'SIMULAÇÃO',
    dataCertidao: emissaoStr,
    isSimulacao: true,
    servidor: {
      nome: '',
      rg: '',
      cpf: '',
      sexo: 'Masculino',
      matricula: '',
      dataNascimento: '',
      idadeHoje: 0,
      idadeEm31Dez2021: 0,
      orgao: 'Câmara Municipal de Curitiba',
      cargo: '',
      padrao: '',
      referencia: 'I',
      dataAdmissaoServicoPublico: '',
      dataAdmissaoEstatutario: '',
      dataRequerimento: emissaoStr,
      registroTribunalContas: ''
    },
    marcos: {
      diasAteEmissao: 0,
      diasAte31Dez2021: 0,
      diferencaDias: 0
    },
    gradeTempo: {
      tempoEstatutarioCMC: { anos: 0, meses: 0, dias: 0, totalDias: 0, periodoDesc: '' },
      tempoFictoLicencaPremio: { anos: 0, meses: 0, dias: 0, totalDias: 0, obs: 'Licenças-prêmio incorporadas – CMC' },
      tempoServicoPublicoRecibado: { anos: 0, meses: 0, dias: 0, totalDias: 0 },
      tempoServicoPublicoCLT: { anos: 0, meses: 0, dias: 0, totalDias: 0, periodoDesc: '' },
      outrasIncorporacoesEstatutario: { anos: 0, meses: 0, dias: 0, totalDias: 0 },
      outrasIncorporacoesCLT: { anos: 0, meses: 0, dias: 0, totalDias: 0 },
      afastamentosSemVencimento: { anos: 0, meses: 0, dias: 0, totalDias: 0 },
      penalidadesAdministrativas: { anos: 0, meses: 0, dias: 0, totalDias: 0 },
      tempoTotalServicoPublico: { anos: 0, meses: 0, dias: 0, totalDias: 0 },
      tempoINSSPrivada: { anos: 0, meses: 0, dias: 0, totalDias: 0, periodoDesc: '' },
      tempoTotalServicoContribuicao: { anos: 0, meses: 0, dias: 0, totalDias: 0 }
    },
    temposExercicio: {
      servicoPublicoTotal: { anos: 0, meses: 0, dias: 0, totalDias: 0, periodoDesc: '' },
      cargoEfetivoTotal: { anos: 0, meses: 0, dias: 0, totalDias: 0, periodoDesc: '' }
    },
    regrasTransitorias: {
      atsPercentual: 0,
      recebeAbono: false,
      dataAbono: '',
      idadeEm31Dez2021: 0,
      tempoEm31Dez2021Anos: 0
    },
    lavratura: {
      cidade: 'Curitiba',
      data: emissaoExtenso,
      servidorNome: 'Setor de Gestão de Processos e Benefícios Funcionais',
      servidorMatricula: 'CMC/DGEP',
      setor: 'Diretoria de Gestão de Pessoas — DGEP'
    }
  };
};

const CERTIDAO_DRAFT_KEY = 'dgep_certidao_draft_v1';

interface CertidaoDraftEnvelope {
  selectedSimId: string;
  linkedSimId?: string;
  linkedSimUpdatedAt?: string;
  hasManualEdits?: boolean;
  certidaoData: CertidaoData;
  updatedAt: string;
}

const brToIsoDate = (brDate?: string): string | undefined => {
  if (!brDate) return undefined;
  const trimmed = brDate.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  return undefined;
};

interface GeradorCertidaoProps {
  externalSim?: UnifiedSimulation;
  onSyncSim?: (updatedSim: UnifiedSimulation) => void;
  embedded?: boolean;
  initialEditCertId?: string | null;
  onClearInitialEditCert?: () => void;
  onHistoricoChanged?: () => void;
}

export default function GeradorCertidao({
  externalSim,
  onSyncSim,
  embedded = false,
  initialEditCertId,
  onClearInitialEditCert,
  onHistoricoChanged
}: GeradorCertidaoProps = {}) {
  const [certidaoData, setCertidaoData] = useState<CertidaoData>(getCertidaoInicialVazia());
  const [activeTab, setActiveTab] = useState<'servidor' | 'grade' | 'regras' | 'lavratura' | 'preview' | 'historico'>('preview');
  const [savedSimulations, setSavedSimulations] = useState<UnifiedSimulation[]>([]);
  const [draftSimulation, setDraftSimulation] = useState<UnifiedSimulation | null>(null);
  const [selectedSimId, setSelectedSimId] = useState<string>(externalSim?.id || '');
  const [mensagemSucesso, setMensagemSucesso] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSavingIdentificacao, setIsSavingIdentificacao] = useState(false);
  const isInitializedRef = React.useRef(false);
  const linkedSimMetaRef = React.useRef<{ id?: string; updatedAt?: string }>({});
  const hasManualEditsRef = React.useRef(false);

  // Estado do Controle de Certidões Emitidas e Edição Posterior
  const [historicoCertidoes, setHistoricoCertidoes] = useState<CertidaoEmitida[]>([]);
  const [filtroHistorico, setFiltroHistorico] = useState<'todas' | 'oficial' | 'simulacao'>('todas');
  const [buscaHistorico, setBuscaHistorico] = useState<string>('');
  const [somenteServidorAtual, setSomenteServidorAtual] = useState<boolean>(Boolean(externalSim));
  const [deleteHistTarget, setDeleteHistTarget] = useState<CertidaoEmitida | null>(null);
  const [editingCertidao, setEditingCertidao] = useState<CertidaoEmitida | null>(null);
  const [numeroAposentadoria, setNumeroAposentadoria] = useState<string>(() => getProximoNumeroOficial('aposentadoria'));
  const [numeroAbono, setNumeroAbono] = useState<string>(() => getProximoNumeroOficial('abono_permanencia'));

  const carregarHistorico = () => {
    setHistoricoCertidoes(getCertidoesEmitidas());
  };

  useEffect(() => {
    carregarHistorico();
    if (externalSim) {
      setDraftSimulation(externalSim);
      handleImportarSimulacao(externalSim.id, externalSim, true);
      isInitializedRef.current = true;
      return;
    }
    // Carregar simulações salvas e vincular automaticamente à simulação ou restaurar rascunho da certidão
    const loadData = async () => {
      let draft: UnifiedSimulation | null = null;
      let list: UnifiedSimulation[] = [];
      try {
        draft = getDraftSimulation();
        if (draft) {
          setDraftSimulation(draft);
        }
      } catch (e) {
        console.error('Erro ao carregar rascunho:', e);
      }
      try {
        list = await getSavedSimulations() || [];
        setSavedSimulations(list);
      } catch (e) {
        console.error('Erro ao carregar simulações salvas:', e);
      }

      // Verificar se existe rascunho salvo localmente da própria Certidão
      let savedCertidaoDraft: CertidaoDraftEnvelope | null = null;
      try {
        const raw = localStorage.getItem(CERTIDAO_DRAFT_KEY);
        if (raw) {
          savedCertidaoDraft = JSON.parse(raw);
        }
      } catch (e) {
        console.error('Erro ao ler rascunho da certidão:', e);
      }

      const activeDraftHasData = !!(draft && (draft.nome || draft.matricula || draft.ingressoCmc || draft.rg || draft.cpf || draft.dataNascimento));
      const activeTargetSim = activeDraftHasData ? draft : (list.length > 0 ? list[0] : null);
      const activeTargetId = activeDraftHasData ? 'draft' : (list.length > 0 ? list[0].id : '');

      // Restaurar rascunho manual da certidão apenas se houver edições manuais locais E a simulação vinculada não tiver sido alterada depois
      if (savedCertidaoDraft && savedCertidaoDraft.certidaoData && savedCertidaoDraft.hasManualEdits) {
        const isStaticSelection = savedCertidaoDraft.selectedSimId === 'blank' || savedCertidaoDraft.selectedSimId === 'exemplo_valdemir';
        const sameSim = isStaticSelection || !activeTargetSim || (savedCertidaoDraft.linkedSimId === activeTargetSim.id);
        const simTime = activeTargetSim?.updatedAt ? new Date(activeTargetSim.updatedAt).getTime() : 0;
        const linkedTime = savedCertidaoDraft.linkedSimUpdatedAt ? new Date(savedCertidaoDraft.linkedSimUpdatedAt).getTime() : 0;
        const draftTime = savedCertidaoDraft.updatedAt ? new Date(savedCertidaoDraft.updatedAt).getTime() : 0;
        const simUpdatedAfterCertidao = simTime > Math.max(linkedTime, draftTime);

        if (sameSim && !simUpdatedAfterCertidao) {
          let restoredData = savedCertidaoDraft.certidaoData;
          // Preenche eventuais campos vazios com dados da simulação vinculada
          if (!isStaticSelection && activeTargetSim) {
            const toBr = (d?: string) => {
              if (!d) return '';
              const clean = d.split('T')[0];
              const p = clean.split('-');
              return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : clean;
            };
            const s = restoredData.servidor;
            const currentInssDesc = restoredData.gradeTempo?.tempoINSSPrivada?.periodoDesc || '';
            const isGenericInssDesc =
              !currentInssDesc ||
              currentInssDesc.startsWith('Tempo e contribuição pós-07/1994 (') ||
              currentInssDesc.startsWith('Apenas tempo pré-07/1994 (') ||
              currentInssDesc.startsWith('CTC/INSS averbada (') ||
              currentInssDesc === 'Certidão de Tempo de Contribuição CTC/INSS averbada';
            const refreshedInssDesc = isGenericInssDesc
              ? extrairTemposIncorporacoes(activeTargetSim.incorporacoes, !restoredData.isSimulacao ? false : true).inssDesc || currentInssDesc
              : currentInssDesc;

            restoredData = {
              ...restoredData,
              servidor: {
                ...s,
                nome: s.nome || activeTargetSim.nome || '',
                matricula: s.matricula || activeTargetSim.matricula || '',
                rg: s.rg || activeTargetSim.rg || '',
                cpf: s.cpf || activeTargetSim.cpf || '',
                dataNascimento: s.dataNascimento || toBr(activeTargetSim.dataNascimento) || '',
                cargo: s.cargo || getCareerDisplayName(activeTargetSim.cargo || activeTargetSim.selectedCareer) || '',
                padrao: s.padrao || activeTargetSim.padrao || getPatternForCareer(activeTargetSim.selectedCareer || activeTargetSim.cargo) || '',
                referencia: s.referencia || activeTargetSim.referencia || activeTargetSim.selectedLevel || 'I',
                dataAdmissaoServicoPublico: s.dataAdmissaoServicoPublico || toBr(activeTargetSim.ingressoCmc || activeTargetSim.ingressoCargoAtual),
                dataAdmissaoEstatutario: s.dataAdmissaoEstatutario || toBr(activeTargetSim.ingressoCargoAtual || activeTargetSim.ingressoCmc),
                registroTribunalContas: s.registroTribunalContas || activeTargetSim.registroTribunalContas || ''
              },
              gradeTempo: {
                ...restoredData.gradeTempo,
                tempoINSSPrivada: {
                  ...restoredData.gradeTempo.tempoINSSPrivada,
                  periodoDesc: refreshedInssDesc
                }
              }
            };
          }
          hasManualEditsRef.current = true;
          const restoredNum = (restoredData.numeroCertidao || '').trim();
          if (restoredNum && restoredNum !== 'SIMULAÇÃO' && restoredNum !== '03/2026') {
            if (restoredData.tipoCertidao === 'abono_permanencia') {
              setNumeroAbono(restoredNum);
            } else {
              setNumeroAposentadoria(restoredNum);
            }
          }
          setCertidaoData(restoredData);
          setSelectedSimId(savedCertidaoDraft.selectedSimId || activeTargetId);
          linkedSimMetaRef.current = {
            id: savedCertidaoDraft.linkedSimId,
            updatedAt: savedCertidaoDraft.linkedSimUpdatedAt
          };
          isInitializedRef.current = true;
          return;
        }
      }

      // VINCULAÇÃO AUTOMÁTICA COM A SIMULAÇÃO DO SISTEMA:
      if (activeDraftHasData && draft) {
        handleImportarSimulacao('draft', draft, true);
      } else if (list.length > 0) {
        handleImportarSimulacao(list[0].id, list[0], true);
      }
      isInitializedRef.current = true;
    };
    loadData();
  }, []);

  // Entra automaticamente em edição se solicitado externamente (ex: Carteira / Controle Geral de Certidões)
  useEffect(() => {
    if (!initialEditCertId) return;
    const all = getCertidoesEmitidas();
    const target = all.find(c => c.id === initialEditCertId);
    if (target) {
      setHistoricoCertidoes(all);
      setEditingCertidao(target);
      hasManualEditsRef.current = true;
      setCertidaoData(JSON.parse(JSON.stringify(target.snapshot)));
      setActiveTab('preview');
      triggerFeedback(`Modo de edição ativo para a certidão ${target.numeroCertidao}. Alterações não alteram a contagem sequencial.`);
    }
    onClearInitialEditCert?.();
  }, [initialEditCertId]);

  // Re-sincroniza automaticamente quando o cadastro externo do servidor mudar (exceto durante edição de certidão emitida)
  useEffect(() => {
    if (!externalSim || editingCertidao) return;
    if (
      linkedSimMetaRef.current.id !== externalSim.id ||
      linkedSimMetaRef.current.updatedAt !== externalSim.updatedAt
    ) {
      setDraftSimulation(externalSim);
      handleImportarSimulacao(externalSim.id, externalSim, true);
    }
  }, [externalSim, editingCertidao]);

  // Persistir automaticamente edições feitas na certidão (incluindo aba Identificação Funcional e TCE-PR)
  useEffect(() => {
    if (!isInitializedRef.current || externalSim || editingCertidao) return;
    try {
      const envelope: CertidaoDraftEnvelope = {
        selectedSimId,
        linkedSimId: linkedSimMetaRef.current.id,
        linkedSimUpdatedAt: linkedSimMetaRef.current.updatedAt,
        hasManualEdits: hasManualEditsRef.current,
        certidaoData,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(CERTIDAO_DRAFT_KEY, JSON.stringify(envelope));
    } catch (e) {
      console.error('Erro ao persistir rascunho da certidão:', e);
    }
  }, [certidaoData, selectedSimId, externalSim]);

  const triggerFeedback = (msg: string, isError = false) => {
    setMensagemSucesso({ text: msg, isError });
    setTimeout(() => setMensagemSucesso(null), 4500);
  };

  const handleCarregarExemplo = () => {
    hasManualEditsRef.current = true;
    linkedSimMetaRef.current = { id: 'exemplo_valdemir', updatedAt: undefined };
    setSelectedSimId('exemplo_valdemir');
    setCertidaoData(DADOS_EXEMPLO_VALDEMIR);
    triggerFeedback('Dados modelo da Certidão nº 03/2026 (Valdemir Pontes) carregados!');
  };

  // Salva as alterações da aba Identificação Funcional & TCE-PR na certidão e na simulação vinculada
  const handleSalvarDadosIdentificacao = async () => {
    setIsSavingIdentificacao(true);
    try {
      const s = certidaoData.servidor;
      const sexoSim: 'M' | 'F' | '' =
        s.sexo === 'Feminino' ? 'F' : s.sexo === 'Masculino' ? 'M' : '';
      const isoNasc = brToIsoDate(s.dataNascimento);
      const isoAdmSP = brToIsoDate(s.dataAdmissaoServicoPublico);
      const isoAdmEst = brToIsoDate(s.dataAdmissaoEstatutario);

      const applyFieldsToSim = (baseSim: UnifiedSimulation): UnifiedSimulation => ({
        ...baseSim,
        nome: s.nome ?? baseSim.nome,
        matricula: s.matricula ?? baseSim.matricula,
        rg: s.rg ?? '',
        cpf: s.cpf ?? '',
        sexo: sexoSim || baseSim.sexo,
        dataNascimento: isoNasc || baseSim.dataNascimento,
        cargo: s.cargo ?? baseSim.cargo,
        padrao: s.padrao ?? baseSim.padrao,
        referencia: s.referencia ?? baseSim.referencia,
        ingressoCmc: isoAdmSP || baseSim.ingressoCmc,
        ingressoCargoAtual: isoAdmEst || baseSim.ingressoCargoAtual,
        registroTribunalContas: s.registroTribunalContas ?? '',
        updatedAt: new Date().toISOString()
      });

      let targetSim: UnifiedSimulation | undefined;
      if (externalSim) {
        targetSim = externalSim;
      } else if (selectedSimId === 'draft') {
        targetSim = getDraftSimulation() || draftSimulation || undefined;
      } else if (selectedSimId && selectedSimId !== 'blank' && selectedSimId !== 'exemplo_valdemir') {
        targetSim = savedSimulations.find(item => item.id === selectedSimId);
      }

      hasManualEditsRef.current = true;

      if (targetSim) {
        const updatedSim = applyFieldsToSim(targetSim);
        linkedSimMetaRef.current = { id: updatedSim.id, updatedAt: updatedSim.updatedAt };

        if (onSyncSim) {
          onSyncSim(updatedSim);
        }

        // Atualiza rascunho ativo se for o mesmo registro ou estiver vinculado ao draft
        if (externalSim || selectedSimId === 'draft' || (draftSimulation && draftSimulation.id === updatedSim.id)) {
          saveDraftSimulation(updatedSim);
          setDraftSimulation(updatedSim);
        }

        // Atualiza no histórico salvo (Firestore / API / localStorage) sempre que o ID existir nas simulações salvas ou tiver sido selecionado do histórico
        const existsInSaved = savedSimulations.some(item => item.id === updatedSim.id);
        if (externalSim || selectedSimId !== 'draft' || existsInSaved) {
          await saveSimulation(updatedSim);
          setSavedSimulations(prev => {
            const idx = prev.findIndex(item => item.id === updatedSim.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = updatedSim;
              return copy;
            }
            return [updatedSim, ...prev];
          });
        }
        const envelope: CertidaoDraftEnvelope = {
          selectedSimId,
          linkedSimId: updatedSim.id,
          linkedSimUpdatedAt: updatedSim.updatedAt,
          hasManualEdits: true,
          certidaoData,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(CERTIDAO_DRAFT_KEY, JSON.stringify(envelope));
        triggerFeedback('Dados de Identificação Funcional e TCE-PR salvos com sucesso na simulação!');
      } else {
        // Sem simulação vinculada (ex: Edição Manual), salva rascunho local da certidão
        const envelope: CertidaoDraftEnvelope = {
          selectedSimId: selectedSimId || 'blank',
          linkedSimId: linkedSimMetaRef.current.id,
          linkedSimUpdatedAt: linkedSimMetaRef.current.updatedAt,
          hasManualEdits: true,
          certidaoData,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(CERTIDAO_DRAFT_KEY, JSON.stringify(envelope));
        triggerFeedback('Dados da certidão salvos localmente com sucesso!');
      }
    } catch (e) {
      console.error('Erro ao salvar identificação funcional e TCE-PR:', e);
      triggerFeedback('Erro ao salvar dados no servidor/banco de dados. Verifique a conexão e tente novamente.', true);
    } finally {
      setIsSavingIdentificacao(false);
    }
  };

  // Sugere o próximo número sequencial oficial independente conforme o tipo de certidão (sem consumir contagem)
  const sugerirProximoNumero = (tipoTarget?: TipoCertidaoSequencial) => {
    const tipoEfetivo: TipoCertidaoSequencial =
      tipoTarget || (certidaoData.tipoCertidao === 'abono_permanencia' ? 'abono_permanencia' : 'aposentadoria');
    const proximo = getProximoNumeroOficial(tipoEfetivo);
    hasManualEditsRef.current = true;
    if (tipoEfetivo === 'abono_permanencia') {
      setNumeroAbono(proximo);
    } else {
      setNumeroAposentadoria(proximo);
    }
    const tipoAtivoCertidao: TipoCertidaoSequencial =
      certidaoData.tipoCertidao === 'abono_permanencia' ? 'abono_permanencia' : 'aposentadoria';
    if (tipoAtivoCertidao === tipoEfetivo) {
      setCertidaoData(prev => ({ ...prev, numeroCertidao: proximo, isSimulacao: false }));
    }
    const labelTipo = tipoEfetivo === 'abono_permanencia' ? 'Abono de Permanência' : 'Aposentadoria';
    triggerFeedback(`Próximo número sugerido (${labelTipo}): ${proximo} (será reservado na emissão oficial).`);
  };

  const handleIniciarEdicaoCertidao = (item: CertidaoEmitida) => {
    setEditingCertidao(item);
    hasManualEditsRef.current = true;
    setCertidaoData(JSON.parse(JSON.stringify(item.snapshot)));
    setActiveTab('preview');
    triggerFeedback(`Editando certidão ${item.numeroCertidao}. Alterações serão salvas sem alterar a contagem sequencial.`);
  };

  const handleSalvarEdicaoCertidao = (baixarPdf = false) => {
    if (!editingCertidao) return;
    try {
      const numeroFinal = (certidaoData.numeroCertidao || '').trim() || editingCertidao.numeroCertidao;
      const updatedSnapshot: CertidaoData = {
        ...certidaoData,
        numeroCertidao: numeroFinal
      };
      const grade = updatedSnapshot.gradeTempo.tempoTotalServicoContribuicao;
      const isAbono = updatedSnapshot.tipoCertidao === 'abono_permanencia';
      const updatedItem: CertidaoEmitida = {
        ...editingCertidao,
        numeroCertidao: numeroFinal,
        dataCertidao: updatedSnapshot.dataCertidao,
        servidorNome: updatedSnapshot.servidor.nome,
        matricula: updatedSnapshot.servidor.matricula,
        cargo: isAbono ? `${updatedSnapshot.servidor.cargo} (Abono de Permanência)` : updatedSnapshot.servidor.cargo,
        tempoTotalDias: grade.totalDias,
        tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
        snapshot: updatedSnapshot
      };
      atualizarCertidaoEmitida(updatedItem);
      setCertidaoData(updatedSnapshot);
      carregarHistorico();
      onHistoricoChanged?.();
      setEditingCertidao(null);
      if (baixarPdf) {
        gerarCertidaoAposentadoriaPadraoPDF(updatedSnapshot);
      }
      triggerFeedback(`Certidão (${updatedItem.numeroCertidao}) salva com sucesso sem alterar a contagem sequencial!`);
    } catch (e) {
      console.error(e);
      triggerFeedback('Erro ao salvar alterações da certidão.', true);
    }
  };

  const handleCancelarEdicaoCertidao = () => {
    setEditingCertidao(null);
    if (externalSim) {
      handleImportarSimulacao(externalSim.id, externalSim, true);
    }
    triggerFeedback('Edição posterior cancelada.');
  };

  // Função para recalcular os subtotais e totais da grade
  const recalcularGrade = (currentGrade: CertidaoData['gradeTempo']): CertidaoData['gradeTempo'] => {
    const totalPublicoDias = Math.max(0,
      (Number(currentGrade.tempoEstatutarioCMC.totalDias) || 0) +
      (Number(currentGrade.tempoFictoLicencaPremio.totalDias) || 0) +
      (Number(currentGrade.tempoServicoPublicoRecibado.totalDias) || 0) +
      (Number(currentGrade.tempoServicoPublicoCLT.totalDias) || 0) +
      (Number(currentGrade.outrasIncorporacoesEstatutario?.totalDias) || 0) +
      (Number(currentGrade.outrasIncorporacoesCLT?.totalDias) || 0) -
      (Number(currentGrade.afastamentosSemVencimento?.totalDias) || 0) -
      (Number(currentGrade.penalidadesAdministrativas?.totalDias) || 0)
    );

    const anosPub = Math.floor(totalPublicoDias / 365);
    const remPub = totalPublicoDias % 365;
    const mesesPub = Math.floor(remPub / 30);
    const diasPub = remPub % 30;

    const totalGeralDias = totalPublicoDias + (Number(currentGrade.tempoINSSPrivada.totalDias) || 0);
    const anosGeral = Math.floor(totalGeralDias / 365);
    const remGeral = totalGeralDias % 365;
    const mesesGeral = Math.floor(remGeral / 30);
    const diasGeral = remGeral % 30;

    return {
      ...currentGrade,
      tempoTotalServicoPublico: {
        anos: anosPub,
        meses: mesesPub,
        dias: diasPub,
        totalDias: totalPublicoDias
      },
      tempoTotalServicoContribuicao: {
        anos: anosGeral,
        meses: mesesGeral,
        dias: diasGeral,
        totalDias: totalGeralDias
      }
    };
  };

  // Importação e vínculo automatizado com os dados da Simulação (fonte única: certidaoBuilder)
  function handleImportarSimulacao(id: string, directSim?: UnifiedSimulation, silenciarFeedback = false) {
    const sim = directSim || (id === 'draft' ? (getDraftSimulation() || draftSimulation) : savedSimulations.find(s => s.id === id));
    if (!sim) return;

    const tipoAtivo: TipoCertidaoSequencial =
      certidaoData.tipoCertidao === 'abono_permanencia' ? 'abono_permanencia' : 'aposentadoria';
    const numAposLimpo = (numeroAposentadoria || '').trim();
    const numAbonoLimpo = (numeroAbono || '').trim();
    const numAposFinal =
      numAposLimpo && numAposLimpo !== '03/2026' && numAposLimpo !== 'SIMULAÇÃO'
        ? numAposLimpo
        : getProximoNumeroOficial('aposentadoria');
    const numAbonoFinal =
      numAbonoLimpo && numAbonoLimpo !== '03/2026' && numAbonoLimpo !== 'SIMULAÇÃO'
        ? numAbonoLimpo
        : getProximoNumeroOficial('abono_permanencia');

    const numeroPersonalizado = tipoAtivo === 'abono_permanencia' ? numAbonoFinal : numAposFinal;

    const dataCustom =
      linkedSimMetaRef.current.id === sim.id && certidaoData.dataCertidao
        ? certidaoData.dataCertidao
        : undefined;

    const baseCertidao = construirCertidaoAPartirDeSimulacao(sim, {
      tipo: 'oficial',
      tipoCertidao: tipoAtivo,
      numeroPersonalizado,
      dataCertidaoPersonalizada: dataCustom
    });

    const isLavraturaPadrao =
      !certidaoData.lavratura?.servidorNome ||
      certidaoData.lavratura.servidorNome === 'Setor de Gestão de Processos e Benefícios Funcionais';

    const novaCertidao: CertidaoData = {
      ...baseCertidao,
      isSimulacao: false,
      regrasTransitorias: {
        ...baseCertidao.regrasTransitorias,
        recebeAbono:
          linkedSimMetaRef.current.id === sim.id
            ? certidaoData.regrasTransitorias.recebeAbono
            : baseCertidao.regrasTransitorias.recebeAbono,
        dataAbono:
          linkedSimMetaRef.current.id === sim.id
            ? certidaoData.regrasTransitorias.dataAbono
            : baseCertidao.regrasTransitorias.dataAbono
      },
      lavratura: isLavraturaPadrao
        ? baseCertidao.lavratura
        : {
            ...certidaoData.lavratura,
            data: baseCertidao.lavratura.data
          },
      dadosIPMC: certidaoData.dadosIPMC
    };

    hasManualEditsRef.current = false;
    linkedSimMetaRef.current = { id: sim.id, updatedAt: sim.updatedAt };
    setCertidaoData(novaCertidao);
    setSelectedSimId(id);
    if (!silenciarFeedback) {
      triggerFeedback(`Simulação de "${sim.nome || 'Servidor'}" integrada com sucesso! Todos os vínculos e grade foram atualizados.`);
    }
  };

  const resolverNumeroOficialParaEmissao = (tipo: TipoCertidaoSequencial): string => {
    const atual = (tipo === 'abono_permanencia' ? numeroAbono : numeroAposentadoria).trim();
    if (!atual || atual === 'SIMULAÇÃO' || atual === '03/2026' || atual === getProximoNumeroOficial(tipo)) {
      return consumirProximoNumeroOficial(tipo);
    }
    return atual;
  };

  const handleEmitirPadrao = () => {
    try {
      const numeroOficial = resolverNumeroOficialParaEmissao('aposentadoria');
      const oficialData: CertidaoData = {
        ...certidaoData,
        numeroCertidao: numeroOficial,
        tipoCertidao: 'aposentadoria',
        isSimulacao: false
      };
      gerarCertidaoAposentadoriaPadraoPDF(oficialData);
      setCertidaoData(oficialData);
      setNumeroAposentadoria(getProximoNumeroOficial('aposentadoria'));

      const grade = oficialData.gradeTempo.tempoTotalServicoContribuicao;
      salvarCertidaoEmitida({
        id: `oficial_${Date.now()}`,
        numeroCertidao: numeroOficial,
        tipo: 'oficial',
        dataCertidao: oficialData.dataCertidao,
        dataEmissaoTimestamp: new Date().toISOString(),
        servidorNome: oficialData.servidor.nome,
        matricula: oficialData.servidor.matricula,
        cargo: oficialData.servidor.cargo,
        tempoTotalDias: grade.totalDias,
        tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
        emitidoPor: 'Setor de Processos e Benefícios Funcionais / DGEP',
        snapshot: oficialData
      });
      carregarHistorico();
      onHistoricoChanged?.();
      triggerFeedback(`Certidão Oficial de Aposentadoria nº ${numeroOficial} gerada e registrada no controle de emissões!`);
    } catch (e) {
      console.error(e);
      triggerFeedback('Erro ao gerar o PDF da Certidão. Verifique os dados inseridos.', true);
    }
  };

  const handleEmitirSimulacao = () => {
    try {
      const simData: CertidaoData = {
        ...certidaoData,
        tipoCertidao: 'aposentadoria',
        numeroCertidao: 'SIMULAÇÃO',
        isSimulacao: true
      };
      gerarCertidaoAposentadoriaPadraoPDF(simData);

      const grade = simData.gradeTempo.tempoTotalServicoContribuicao;
      salvarCertidaoEmitida({
        id: `sim_${Date.now()}`,
        numeroCertidao: 'SIMULAÇÃO',
        tipo: 'simulacao',
        dataCertidao: simData.dataCertidao,
        dataEmissaoTimestamp: new Date().toISOString(),
        servidorNome: simData.servidor.nome,
        matricula: simData.servidor.matricula,
        cargo: simData.servidor.cargo,
        tempoTotalDias: grade.totalDias,
        tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
        emitidoPor: 'Simulador DGEP (Minuta)',
        snapshot: simData
      });
      carregarHistorico();
      onHistoricoChanged?.();
      triggerFeedback('Certidão de Simulação (Minuta em PDF) gerada com sucesso e registrada no controle!');
    } catch (e) {
      console.error(e);
      triggerFeedback('Erro ao gerar a Certidão de Simulação.', true);
    }
  };

  const handleEmitirAbonoOficial = () => {
    try {
      const numeroOficial = resolverNumeroOficialParaEmissao('abono_permanencia');
      const abonoData: CertidaoData = {
        ...certidaoData,
        numeroCertidao: numeroOficial,
        tipoCertidao: 'abono_permanencia',
        isSimulacao: false
      };
      gerarCertidaoAposentadoriaPadraoPDF(abonoData);
      setCertidaoData(abonoData);
      setNumeroAbono(getProximoNumeroOficial('abono_permanencia'));

      const grade = abonoData.gradeTempo.tempoTotalServicoContribuicao;
      salvarCertidaoEmitida({
        id: `oficial_abono_${Date.now()}`,
        numeroCertidao: numeroOficial,
        tipo: 'oficial',
        dataCertidao: abonoData.dataCertidao,
        dataEmissaoTimestamp: new Date().toISOString(),
        servidorNome: abonoData.servidor.nome,
        matricula: abonoData.servidor.matricula,
        cargo: `${abonoData.servidor.cargo} (Abono de Permanência)`,
        tempoTotalDias: grade.totalDias,
        tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
        emitidoPor: 'Setor de Processos e Benefícios Funcionais / DGEP',
        snapshot: abonoData
      });
      carregarHistorico();
      onHistoricoChanged?.();
      triggerFeedback(`Certidão Oficial de Abono de Permanência nº ${numeroOficial} gerada e registrada!`);
    } catch (e) {
      console.error(e);
      triggerFeedback('Erro ao gerar o PDF da Certidão de Abono de Permanência.', true);
    }
  };

  const handleEmitirAbonoSimulacao = () => {
    try {
      const abonoSimData: CertidaoData = {
        ...certidaoData,
        tipoCertidao: 'abono_permanencia',
        numeroCertidao: 'SIMULAÇÃO',
        isSimulacao: true
      };
      gerarCertidaoAposentadoriaPadraoPDF(abonoSimData);

      const grade = abonoSimData.gradeTempo.tempoTotalServicoContribuicao;
      salvarCertidaoEmitida({
        id: `sim_abono_${Date.now()}`,
        numeroCertidao: 'SIMULAÇÃO (ABONO)',
        tipo: 'simulacao',
        dataCertidao: abonoSimData.dataCertidao,
        dataEmissaoTimestamp: new Date().toISOString(),
        servidorNome: abonoSimData.servidor.nome,
        matricula: abonoSimData.servidor.matricula,
        cargo: `${abonoSimData.servidor.cargo} (Abono de Permanência)`,
        tempoTotalDias: grade.totalDias,
        tempoFormatado: `${grade.anos} anos, ${grade.meses} meses e ${grade.dias} dias`,
        emitidoPor: 'Simulador DGEP (Minuta Abono)',
        snapshot: abonoSimData
      });
      carregarHistorico();
      onHistoricoChanged?.();
      triggerFeedback('Certidão de Abono de Permanência (Simulação) gerada e registrada no histórico!');
    } catch (e) {
      console.error(e);
      triggerFeedback('Erro ao gerar o PDF de simulação de abono.', true);
    }
  };

  const parseDateBR = (str?: string): Date | null => {
    if (!str) return null;
    const parts = str.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y) && y >= 1900 && d >= 1 && d <= 31 && m >= 0 && m <= 11) {
        return new Date(y, m, d);
      }
    }
    return null;
  };

  // Calcula os dias transcorridos após 31/12/2021 até a data de emissão para manter Marcos & Bloco 4 sempre coerentes
  const calcularMarcosCoerentes = (dataCertidaoStr: string, dataAdmissaoEstStr: string, totalGeralDias: number) => {
    const dFim = parseDateBR(dataCertidaoStr);
    const dInicio = parseDateBR(dataAdmissaoEstStr);
    const date31Dez2021 = new Date(2021, 11, 31);

    let diferencaPos2021 = 0;
    if (dFim && Date.UTC(dFim.getFullYear(), dFim.getMonth(), dFim.getDate()) > Date.UTC(2021, 11, 31)) {
      const inicioPos2021 =
        dInicio && Date.UTC(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate()) > Date.UTC(2021, 11, 31)
          ? dInicio
          : date31Dez2021;
      diferencaPos2021 = diffCalendarDays(inicioPos2021, dFim);
    }

    const diasAte31Dez2021 = Math.max(0, totalGeralDias - diferencaPos2021);
    return {
      diasAte31Dez2021,
      diferencaDias: diferencaPos2021,
      tempoEm31Dez2021Anos: Math.max(0, Math.floor(diasAte31Dez2021 / 365))
    };
  };

  // Atualizador da Data da Certidão com vínculo em tempo real no período estatutário e marcos
  const updateDataCertidao = (novaData: string) => {
    hasManualEditsRef.current = true;
    setCertidaoData(prev => {
      const dInicio = parseDateBR(prev.servidor.dataAdmissaoEstatutario);
      const dFim = parseDateBR(novaData);
      const dNasc = parseDateBR(prev.servidor.dataNascimento);

      let updatedServidor = { ...prev.servidor };
      if (dNasc && dFim) {
        updatedServidor.idadeHoje = calculateExactAge(dNasc, dFim);
      }

      let updatedGrade = { ...prev.gradeTempo };
      let updatedMarcos = { ...prev.marcos };
      let updatedRegras = { ...prev.regrasTransitorias };
      let updatedTemposExercicio = { ...prev.temposExercicio };

      if (dInicio && dFim && Date.UTC(dFim.getFullYear(), dFim.getMonth(), dFim.getDate()) >= Date.UTC(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate())) {
        const diffDias = diffCalendarDays(dInicio, dFim);
        const anos = Math.floor(diffDias / 365);
        const rem = diffDias % 365;
        const meses = Math.floor(rem / 30);
        const dias = rem % 30;
        const novoPeriodo = `${prev.servidor.dataAdmissaoEstatutario} a ${novaData}`;

        updatedGrade = recalcularGrade({
          ...updatedGrade,
          tempoEstatutarioCMC: {
            ...updatedGrade.tempoEstatutarioCMC,
            anos,
            meses,
            dias,
            totalDias: diffDias,
            periodoDesc: novoPeriodo
          }
        });

        const marcosCoerentes = calcularMarcosCoerentes(
          novaData,
          prev.servidor.dataAdmissaoEstatutario,
          updatedGrade.tempoTotalServicoContribuicao.totalDias
        );
        updatedMarcos = {
          diasAteEmissao: diffDias,
          diasAte31Dez2021: marcosCoerentes.diasAte31Dez2021,
          diferencaDias: marcosCoerentes.diferencaDias
        };
        updatedRegras = {
          ...updatedRegras,
          tempoEm31Dez2021Anos: marcosCoerentes.tempoEm31Dez2021Anos
        };
        updatedTemposExercicio = {
          servicoPublicoTotal: {
            ...updatedGrade.tempoTotalServicoPublico,
            periodoDesc: prev.servidor.dataAdmissaoServicoPublico ? `${prev.servidor.dataAdmissaoServicoPublico} a ${novaData}` : prev.temposExercicio.servicoPublicoTotal.periodoDesc
          },
          cargoEfetivoTotal: {
            ...updatedGrade.tempoEstatutarioCMC,
            periodoDesc: novoPeriodo
          }
        };
      } else {
        updatedGrade = {
          ...updatedGrade,
          tempoEstatutarioCMC: {
            ...updatedGrade.tempoEstatutarioCMC,
            periodoDesc: `${prev.servidor.dataAdmissaoEstatutario} a ${novaData}`
          }
        };
      }

      return {
        ...prev,
        dataCertidao: novaData,
        servidor: updatedServidor,
        marcos: updatedMarcos,
        regrasTransitorias: updatedRegras,
        temposExercicio: updatedTemposExercicio,
        gradeTempo: updatedGrade
      };
    });
  };

  // Atualizador para campos funcionais do servidor com sincronização automática de idade, período estatutário e marcos
  const updateServidor = (field: string, value: any) => {
    hasManualEditsRef.current = true;
    setCertidaoData(prev => {
      const updatedServidor = { ...prev.servidor, [field]: value };
      let updatedGrade = { ...prev.gradeTempo };
      let updatedMarcos = { ...prev.marcos };
      let updatedRegras = { ...prev.regrasTransitorias };
      let updatedTemposExercicio = { ...prev.temposExercicio };

      if (field === 'cargo' && !prev.servidor.padrao) {
        const autoPadrao = getPatternForCareer(value);
        if (autoPadrao) {
          updatedServidor.padrao = autoPadrao;
        }
      }

      if (field === 'dataNascimento') {
        const dNasc = parseDateBR(value);
        const dRef = parseDateBR(prev.dataCertidao) || new Date();
        if (dNasc) {
          updatedServidor.idadeHoje = calculateExactAge(dNasc, dRef);
          const date2021 = new Date(2021, 11, 31);
          updatedRegras = {
            ...updatedRegras,
            idadeEm31Dez2021: calculateExactAge(dNasc, date2021)
          };
        }
      }

      if (field === 'dataAdmissaoServicoPublico') {
        updatedTemposExercicio = {
          ...updatedTemposExercicio,
          servicoPublicoTotal: {
            ...updatedTemposExercicio.servicoPublicoTotal,
            periodoDesc: value ? `${value} a ${prev.dataCertidao}` : updatedTemposExercicio.servicoPublicoTotal.periodoDesc
          }
        };
      }

      if (field === 'dataAdmissaoEstatutario') {
        const dInicio = parseDateBR(value);
        const dFim = parseDateBR(prev.dataCertidao);
        if (dInicio && dFim && Date.UTC(dFim.getFullYear(), dFim.getMonth(), dFim.getDate()) >= Date.UTC(dInicio.getFullYear(), dInicio.getMonth(), dInicio.getDate())) {
          const diffDias = diffCalendarDays(dInicio, dFim);
          const anos = Math.floor(diffDias / 365);
          const rem = diffDias % 365;
          const meses = Math.floor(rem / 30);
          const dias = rem % 30;
          const novoPeriodo = `${value} a ${prev.dataCertidao}`;

          updatedGrade = recalcularGrade({
            ...updatedGrade,
            tempoEstatutarioCMC: {
              ...updatedGrade.tempoEstatutarioCMC,
              anos,
              meses,
              dias,
              totalDias: diffDias,
              periodoDesc: novoPeriodo
            }
          });

          const marcosCoerentes = calcularMarcosCoerentes(
            prev.dataCertidao,
            value,
            updatedGrade.tempoTotalServicoContribuicao.totalDias
          );
          updatedMarcos = {
            diasAteEmissao: diffDias,
            diasAte31Dez2021: marcosCoerentes.diasAte31Dez2021,
            diferencaDias: marcosCoerentes.diferencaDias
          };
          updatedRegras = {
            ...updatedRegras,
            tempoEm31Dez2021Anos: marcosCoerentes.tempoEm31Dez2021Anos
          };
          updatedTemposExercicio = {
            servicoPublicoTotal: {
              ...updatedGrade.tempoTotalServicoPublico,
              periodoDesc: prev.servidor.dataAdmissaoServicoPublico ? `${prev.servidor.dataAdmissaoServicoPublico} a ${prev.dataCertidao}` : prev.temposExercicio.servicoPublicoTotal.periodoDesc
            },
            cargoEfetivoTotal: {
              ...updatedGrade.tempoEstatutarioCMC,
              periodoDesc: novoPeriodo
            }
          };
        } else {
          updatedGrade = {
            ...updatedGrade,
            tempoEstatutarioCMC: {
              ...updatedGrade.tempoEstatutarioCMC,
              periodoDesc: `${value} a ${prev.dataCertidao}`
            }
          };
        }
      }

      return {
        ...prev,
        servidor: updatedServidor,
        marcos: updatedMarcos,
        regrasTransitorias: updatedRegras,
        temposExercicio: updatedTemposExercicio,
        gradeTempo: updatedGrade
      };
    });
  };

  // Atualizador com recálculo automático de subtotais, marcos e totais
  const updateGradeItem = (itemKey: keyof CertidaoData['gradeTempo'], subField: string, value: any) => {
    hasManualEditsRef.current = true;
    setCertidaoData(prev => {
      const current = prev.gradeTempo[itemKey];
      const updatedItem = { ...current, [subField]: value };
      
      if (['anos', 'meses', 'dias'].includes(subField)) {
        const anos = subField === 'anos' ? Number(value) : (current.anos || 0);
        const meses = subField === 'meses' ? Number(value) : (current.meses || 0);
        const dias = subField === 'dias' ? Number(value) : (current.dias || 0);
        updatedItem.totalDias = (anos * 365) + (meses * 30) + dias;
      } else if (subField === 'totalDias') {
        const total = Number(value) || 0;
        updatedItem.anos = Math.floor(total / 365);
        const rem = total % 365;
        updatedItem.meses = Math.floor(rem / 30);
        updatedItem.dias = rem % 30;
      }

      const tempGrade = {
        ...prev.gradeTempo,
        [itemKey]: updatedItem
      };

      const finalGrade = recalcularGrade(tempGrade);
      const marcosCoerentes = calcularMarcosCoerentes(
        prev.dataCertidao,
        prev.servidor.dataAdmissaoEstatutario,
        finalGrade.tempoTotalServicoContribuicao.totalDias
      );

      const cargoEfetivoPeriodoDesc =
        itemKey === 'tempoEstatutarioCMC' && subField === 'periodoDesc'
          ? String(value || '')
          : prev.temposExercicio.cargoEfetivoTotal.periodoDesc;

      return {
        ...prev,
        marcos: {
          diasAteEmissao: finalGrade.tempoEstatutarioCMC.totalDias,
          diasAte31Dez2021: marcosCoerentes.diasAte31Dez2021,
          diferencaDias: marcosCoerentes.diferencaDias
        },
        regrasTransitorias: {
          ...prev.regrasTransitorias,
          tempoEm31Dez2021Anos: marcosCoerentes.tempoEm31Dez2021Anos
        },
        gradeTempo: finalGrade,
        temposExercicio: {
          servicoPublicoTotal: {
            ...finalGrade.tempoTotalServicoPublico,
            periodoDesc: prev.temposExercicio.servicoPublicoTotal.periodoDesc
          },
          cargoEfetivoTotal: {
            ...finalGrade.tempoEstatutarioCMC,
            periodoDesc: cargoEfetivoPeriodoDesc
          }
        }
      };
    });
  };

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-6 max-w-6xl mx-auto pb-12'}>
      {/* Banner de Título */}
      {!embedded && (
        <div className="bg-gradient-to-r from-[#002f5a] via-[#004b8d] to-[#013564] text-white p-6 sm:p-8 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-white text-xs font-semibold tracking-wide uppercase">
                  <FileCheck size={13} />
                  Módulo Oficial DGEP / CMC
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 text-blue-100 text-xs font-semibold tracking-wide">
                  Documento Oficial em PDF
                </span>
              </div>
              
              <h1 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight">
                Gerador de Certidão de Aposentadoria
              </h1>
              <p className="text-blue-100/90 text-xs sm:text-sm leading-relaxed">
                Emissão oficial da <strong>Certidão de Tempo de Contribuição e Vínculos Funcionais</strong> (padrão Setor de Gestão de Processos e Benefícios Funcionais) com integração automatizada aos dados da simulação previdenciária.
              </p>
            </div>

            <div className="hidden md:flex items-center gap-3 bg-white p-2.5 px-4 rounded-xl shadow-md shrink-0 border border-white/20">
              <img 
                src="/assets/aistudio/horizontal_preto_pequeno_b6636aa0.png" 
                alt="Câmara Municipal de Curitiba" 
                className="h-10 w-auto object-contain" 
              />
            </div>
          </div>

          {/* Feedback flutuante */}
          {mensagemSucesso && (
            <div className={`mt-4 p-3 ${mensagemSucesso.isError ? 'bg-red-600/95' : 'bg-emerald-600/90'} backdrop-blur-md text-white rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-md`}>
              {mensagemSucesso.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <span>{mensagemSucesso.text}</span>
            </div>
          )}
        </div>
      )}

      {embedded && mensagemSucesso && (
        <div className={`p-3 ${mensagemSucesso.isError ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} border rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in`}>
          {mensagemSucesso.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{mensagemSucesso.text}</span>
        </div>
      )}

      {/* Barra de Vinculação com Simulação e Emissão */}
      <div className="bg-white border border-[#dee2e6] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Lado Esquerdo: Seletor Central de Simulações do Sistema */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            {externalSim ? (
              <button
                type="button"
                onClick={() => handleImportarSimulacao(externalSim.id, externalSim)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition-all border border-teal-200 cursor-pointer shadow-2xs"
                title="Recarregar e atualizar todos os campos da certidão com os dados atuais do cadastro"
              >
                <RefreshCw size={13} className="text-teal-600" />
                Sincronizar do Cadastro
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 shrink-0">
                  <FolderSync size={16} className="text-[#004b8d]" />
                  <span>Simulação Vinculada:</span>
                </div>

                <div className="flex-1 min-w-[260px] max-w-xl">
                  <select
                    value={selectedSimId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedSimId(val);
                      if (val === 'blank') {
                        hasManualEditsRef.current = true;
                        linkedSimMetaRef.current = { id: 'blank', updatedAt: undefined };
                        setCertidaoData(getCertidaoInicialVazia());
                        triggerFeedback('Formulário da certidão limpo para edição avulsa.');
                      } else if (val === 'exemplo_valdemir') {
                        hasManualEditsRef.current = true;
                        linkedSimMetaRef.current = { id: 'exemplo_valdemir', updatedAt: undefined };
                        setCertidaoData(DADOS_EXEMPLO_VALDEMIR);
                        triggerFeedback('Modelo de referência (Certidão nº 03/2026 - TCE) carregado.');
                      } else if (val === 'draft') {
                        const latestDraft = getDraftSimulation() || draftSimulation;
                        if (latestDraft) {
                          setDraftSimulation(latestDraft);
                          handleImportarSimulacao('draft', latestDraft);
                        }
                      } else if (val) {
                        handleImportarSimulacao(val);
                      }
                    }}
                    className="w-full text-xs bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 font-semibold focus:ring-2 focus:ring-[#004b8d] focus:outline-none"
                  >
                    {draftSimulation && (
                      <option value="draft">
                        ⭐ Simulação Ativa em Andamento ({draftSimulation.nome || 'Rascunho'} — Matrícula: {draftSimulation.matricula || '---'})
                      </option>
                    )}
                    {savedSimulations.map(sim => (
                      <option key={sim.id} value={sim.id}>
                        📁 {sim.nome || 'Sem Nome'} (Matrícula: {sim.matricula || '---'}) — {getCareerDisplayName(sim.cargo || sim.selectedCareer) || 'Servidor'}
                      </option>
                    ))}
                    <option value="blank">📝 Certidão em Branco (Edição Manual)</option>
                    <option value="exemplo_valdemir">ℹ️ Modelo de Referência Histórico (Certidão 03/2026 - TCE)</option>
                  </select>
                </div>

                {/* Botão de Sincronização / Recarregar */}
                {!editingCertidao && selectedSimId && selectedSimId !== 'blank' && selectedSimId !== 'exemplo_valdemir' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSimId === 'draft') {
                        const latestDraft = getDraftSimulation() || draftSimulation;
                        if (latestDraft) {
                          setDraftSimulation(latestDraft);
                          handleImportarSimulacao('draft', latestDraft);
                        }
                      } else {
                        handleImportarSimulacao(selectedSimId);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold transition-all border border-teal-200 cursor-pointer shadow-2xs"
                    title="Recarregar e atualizar todos os dados com base na simulação selecionada"
                  >
                    <RefreshCw size={13} className="text-teal-600" />
                    Sincronizar Dados
                  </button>
                )}
              </>
            )}

            {/* Campos Editáveis Independentes: Nº Aposentadoria, Nº Abono + Data */}
            {editingCertidao ? (
              <div className="flex flex-wrap items-center gap-1.5 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <Hash size={13} className="text-amber-700 shrink-0" />
                <label className="text-[11px] font-bold text-amber-900 whitespace-nowrap">
                  {certidaoData.tipoCertidao === 'abono_permanencia' ? 'Nº Abono:' : 'Nº Aposentadoria:'}
                </label>
                <input
                  type="text"
                  value={certidaoData.numeroCertidao}
                  onChange={(e) => {
                    hasManualEditsRef.current = true;
                    setCertidaoData(prev => ({
                      ...prev,
                      numeroCertidao: e.target.value,
                      isSimulacao: e.target.value.trim().toUpperCase().startsWith('SIMULA')
                    }));
                  }}
                  placeholder="Ex: 04/2026"
                  className="w-24 bg-white border border-amber-300 rounded px-2 py-1 text-xs font-mono font-bold text-[#002f5a] focus:outline-none focus:ring-2 focus:ring-amber-400"
                  title="Edite livremente o número da certidão em edição"
                />
                <span className="text-amber-300">|</span>
                <Calendar size={12} className="text-amber-700 shrink-0" />
                <input
                  type="text"
                  value={certidaoData.dataCertidao}
                  onChange={(e) => updateDataCertidao(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="w-24 bg-white border border-amber-300 rounded px-2 py-1 text-xs font-mono font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  title="Data de referência da certidão (DD/MM/AAAA)"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1.5">
                {/* Nº Certidão Aposentadoria */}
                <div className="flex items-center gap-1.5">
                  <Hash size={12} className="text-[#004b8d] shrink-0" />
                  <label className="text-[11px] font-bold text-[#002f5a] whitespace-nowrap">Nº Aposentadoria:</label>
                  <input
                    type="text"
                    value={numeroAposentadoria}
                    onChange={(e) => {
                      const val = e.target.value;
                      hasManualEditsRef.current = true;
                      setNumeroAposentadoria(val);
                      if ((certidaoData.tipoCertidao || 'aposentadoria') === 'aposentadoria') {
                        setCertidaoData(prev => ({
                          ...prev,
                          numeroCertidao: val,
                          isSimulacao: val.trim().toUpperCase().startsWith('SIMULA')
                        }));
                      }
                    }}
                    placeholder="Ex: 04/2026"
                    className="w-20 bg-white border border-blue-300 rounded px-2 py-1 text-xs font-mono font-bold text-[#002f5a] focus:outline-none focus:ring-2 focus:ring-blue-400"
                    title="Número independente para Certidão Oficial de Aposentadoria"
                  />
                  <button
                    type="button"
                    onClick={() => sugerirProximoNumero('aposentadoria')}
                    className="px-2 py-1 bg-white hover:bg-blue-50 text-[#004b8d] border border-blue-200 rounded text-[11px] font-bold cursor-pointer transition-colors"
                    title="Sugerir próximo número sequencial de Aposentadoria"
                  >
                    Sugerir
                  </button>
                </div>

                <span className="text-amber-300 hidden sm:inline">|</span>

                {/* Nº Certidão Abono */}
                <div className="flex items-center gap-1.5">
                  <Hash size={12} className="text-[#581c87] shrink-0" />
                  <label className="text-[11px] font-bold text-[#581c87] whitespace-nowrap">Nº Abono:</label>
                  <input
                    type="text"
                    value={numeroAbono}
                    onChange={(e) => {
                      const val = e.target.value;
                      hasManualEditsRef.current = true;
                      setNumeroAbono(val);
                      if (certidaoData.tipoCertidao === 'abono_permanencia') {
                        setCertidaoData(prev => ({
                          ...prev,
                          numeroCertidao: val,
                          isSimulacao: val.trim().toUpperCase().startsWith('SIMULA')
                        }));
                      }
                    }}
                    placeholder="Ex: 01/2026"
                    className="w-20 bg-white border border-purple-300 rounded px-2 py-1 text-xs font-mono font-bold text-[#581c87] focus:outline-none focus:ring-2 focus:ring-purple-400"
                    title="Número independente para Certidão Oficial de Abono de Permanência"
                  />
                  <button
                    type="button"
                    onClick={() => sugerirProximoNumero('abono_permanencia')}
                    className="px-2 py-1 bg-white hover:bg-purple-50 text-[#581c87] border border-purple-200 rounded text-[11px] font-bold cursor-pointer transition-colors"
                    title="Sugerir próximo número sequencial de Abono de Permanência"
                  >
                    Sugerir
                  </button>
                </div>

                <span className="text-amber-300 hidden sm:inline">|</span>

                {/* Data de Referência */}
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-amber-700 shrink-0" />
                  <input
                    type="text"
                    value={certidaoData.dataCertidao}
                    onChange={(e) => updateDataCertidao(e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="w-24 bg-white border border-amber-300 rounded px-2 py-1 text-xs font-mono font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    title="Data de referência da certidão (DD/MM/AAAA)"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lado Direito: Botões de Emissão ou Ações de Edição Posterior */}
          {editingCertidao ? (
            <div className="flex flex-wrap items-center gap-2 self-end lg:self-auto">
              <button
                type="button"
                onClick={handleCancelarEdicaoCertidao}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all cursor-pointer"
              >
                <X size={14} /> Cancelar Edição
              </button>
              <button
                type="button"
                onClick={() => handleSalvarEdicaoCertidao(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#004b8d] hover:bg-[#003768] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Save size={14} /> Salvar Alterações
              </button>
              <button
                type="button"
                onClick={() => handleSalvarEdicaoCertidao(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Download size={14} /> Salvar & Baixar PDF
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-auto">
              {/* Certidão de Simulação (Aposentadoria) */}
              <button
                type="button"
                onClick={handleEmitirSimulacao}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer group"
                title="Gerar Minuta de Aposentadoria (Sem número)"
              >
                <FileCheck size={14} /> Minuta Aposentadoria
              </button>

              {/* Certidão Oficial Aposentadoria */}
              <button
                type="button"
                onClick={handleEmitirPadrao}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#004b8d] hover:bg-[#003768] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group"
                title="Emitir Certidão Oficial de Aposentadoria (Com número)"
              >
                <Download size={14} /> Oficial Aposentadoria
              </button>

              {/* Certidão Abono de Permanência (Simulação) */}
              <button
                type="button"
                onClick={handleEmitirAbonoSimulacao}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer group"
                title="Gerar Minuta de Abono de Permanência (Sem número)"
              >
                <FileCheck size={14} /> Minuta Abono
              </button>

              {/* Certidão Oficial Abono de Permanência */}
              <button
                type="button"
                onClick={handleEmitirAbonoOficial}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#581c87] hover:bg-[#4c1d95] text-white text-xs font-bold transition-all shadow-xs cursor-pointer group"
                title="Emitir Certidão Oficial de Abono de Permanência com Numeração"
              >
                <Award size={14} /> Oficial Abono de Permanência
              </button>
            </div>
          )}
        </div>

        {/* Banner de Modo de Edição Posterior de Certidão Já Emitida */}
        {editingCertidao && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
            <div className="flex items-center gap-2">
              <Pencil size={15} className="text-amber-700 shrink-0" />
              <span>
                <strong>Editando certidão emitida ({editingCertidao.numeroCertidao}):</strong> ajuste livremente qualquer campo nas abas abaixo (incluindo o número). Ao salvar, o registro original será atualizado <strong>sem alterar a contagem sequencial</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Status resumido da certidão (sem repetir dados já exibidos no cabeçalho do dossiê) */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2.5 border-t border-gray-150 gap-2">
          {externalSim ? (
            <div className="flex items-center gap-2 text-gray-600">
              <span className={`inline-block w-2 h-2 rounded-full ${certidaoData.servidor.nome ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
              <span>
                Finalidade atual:{' '}
                <strong className="text-[#002f5a]">
                  {certidaoData.tipoCertidao === 'abono_permanencia'
                    ? 'Certidão para Abono de Permanência'
                    : 'Certidão de Aposentadoria'}
                </strong>
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-gray-600">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${certidaoData.servidor.nome ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
              <span>Servidor Vinculado: <strong className="text-gray-900">{certidaoData.servidor.nome || 'Nenhum servidor vinculado (certidão vazia)'}</strong></span>
              {certidaoData.servidor.matricula && (
                <span className="text-gray-400 font-mono">| Matrícula: <strong className="text-gray-800">{certidaoData.servidor.matricula}</strong></span>
              )}
              {certidaoData.servidor.cargo && (
                <span className="text-gray-400">| Cargo: <strong className="text-gray-800">{certidaoData.servidor.cargo}</strong></span>
              )}
            </div>
          )}

          <div className="text-[11px] text-gray-500">
            Tempo Total na Certidão: <strong className="text-[#002f5a] font-bold">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.anos} anos, {certidaoData.gradeTempo.tempoTotalServicoContribuicao.meses} m, {certidaoData.gradeTempo.tempoTotalServicoContribuicao.dias} d</strong> ({certidaoData.gradeTempo.tempoTotalServicoContribuicao.totalDias} dias)
          </div>
        </div>
      </div>

      {/* Navegação de Abas do Gerador */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === 'preview'
              ? 'border-[#004b8d] text-[#004b8d] bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Eye size={15} />
          Visualização Prévia (Espelho)
        </button>

        <button
          onClick={() => setActiveTab('servidor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === 'servidor'
              ? 'border-[#004b8d] text-[#004b8d] bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <User size={15} />
          1. Dados do Servidor & TCE
        </button>

        <button
          onClick={() => setActiveTab('grade')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === 'grade'
              ? 'border-[#004b8d] text-[#004b8d] bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Clock size={15} />
          2. Grade de Tempos e Vínculos
        </button>

        <button
          onClick={() => setActiveTab('regras')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === 'regras'
              ? 'border-[#004b8d] text-[#004b8d] bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Award size={15} />
          3. Regras Transitórias & Abono
        </button>

        <button
          onClick={() => setActiveTab('lavratura')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === 'lavratura'
              ? 'border-[#004b8d] text-[#004b8d] bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <FileText size={15} />
          4. Lavratura & Assinatura
        </button>

        <button
          onClick={() => {
            carregarHistorico();
            setActiveTab('historico');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 cursor-pointer ${
            activeTab === 'historico'
              ? 'border-[#004b8d] text-[#004b8d] bg-white shadow-xs'
              : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <History size={15} />
          Controle de Certidões Emitidas ({historicoCertidoes.length})
        </button>
      </div>

      {/* Conteúdo das Abas */}

      {/* ABA PREVIEW / ESPELHO VISUAL DA CERTIDÃO */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* Card de Alerta se não houver servidor vinculado */}
          {!certidaoData.servidor.nome && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900 leading-relaxed shadow-xs">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Atenção:</strong> Nenhuma simulação está vinculada a esta certidão no momento. Selecione uma simulação no seletor <strong>Simulação Vinculada</strong> acima para carregar automaticamente todos os dados funcionais, tempos e grade de vínculos, ou preencha manualmente as abas de edição.
              </div>
            </div>
          )}

          {/* Card explicativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-900 leading-relaxed">
            <AlertCircle size={18} className="text-[#004b8d] shrink-0 mt-0.5" />
            <div>
              <strong>Espelho Interativo da Certidão Oficial:</strong> Este painel reflete com máxima precisão o layout adotado pelo Setor de Gestão de Processos e Benefícios Funcionais da CMC. Você pode conferir e ajustar os dados antes de emitir o documento oficial em PDF.
            </div>
          </div>

          {/* Documento Estilizado (Paper Sheet) */}
          <div className="bg-white border-2 border-gray-300 rounded-xl shadow-lg p-6 sm:p-10 font-sans max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none">
            {/* Header Documento com Logomarca Oficial */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b-2 border-[#002f5a] pb-4 gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/assets/aistudio/horizontal_preto_pequeno_b6636aa0.png" 
                  alt="Logomarca da Câmara Municipal de Curitiba" 
                  className="h-12 w-auto object-contain shrink-0" 
                />
                <div className="border-l-2 border-gray-200 pl-4 text-left">
                  <h2 className="text-sm sm:text-base font-black text-[#002f5a] tracking-tight uppercase leading-snug">
                    Diretoria de Gestão de Pessoas — DGEP
                  </h2>
                  <p className="text-xs text-gray-600 font-medium">
                    Setor de Gestão de Processos e Benefícios Funcionais
                  </p>
                </div>
              </div>
            </div>

            {/* Faixa Título */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 py-2.5 rounded-lg gap-2 border ${
              certidaoData.tipoCertidao === 'abono_permanencia'
                ? 'bg-purple-50/80 border-purple-300 text-purple-950'
                : 'bg-[#f0f4f8] border-[#004b8d]/30 text-[#002f5a]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold uppercase">
                  {certidaoData.tipoCertidao === 'abono_permanencia'
                    ? `CERTIDÃO DE ABONO DE PERMANÊNCIA Nº ${certidaoData.numeroCertidao}`
                    : `CERTIDÃO DE APOSENTADORIA Nº ${certidaoData.numeroCertidao}`}
                </span>
                {certidaoData.tipoCertidao === 'abono_permanencia' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900 border border-purple-300">
                    EFEITO: ABONO DE PERMANÊNCIA
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-600">
                Data da certidão: <strong>{certidaoData.dataCertidao}</strong>
              </span>
            </div>

            {/* Bloco 1: Dados do Servidor */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[#002f5a] uppercase border-l-3 border-[#002f5a] pl-2">
                1. Dados do Servidor
              </h3>
              <div className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-xs space-y-3.5">
                {/* Linha 1: NOME (50%) | RG (25%) | CPF (25%) */}
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12 sm:col-span-6">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      NOME
                    </span>
                    <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                      {certidaoData.servidor.nome}
                    </span>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      RG
                    </span>
                    <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                      {certidaoData.servidor.rg}
                    </span>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      CPF
                    </span>
                    <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                      {certidaoData.servidor.cpf}
                    </span>
                  </div>
                </div>

                {/* Linha 2: NASCIMENTO + SEXO (50%) | MATRÍCULA (25%) | IDADE HOJE / 31-12-2021 (25%) */}
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12 sm:col-span-6 grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                        NASCIMENTO
                      </span>
                      <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                        {certidaoData.servidor.dataNascimento}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                        SEXO
                      </span>
                      <span className="block text-[13.5px] font-semibold text-gray-900 leading-tight">
                        {certidaoData.servidor.sexo}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      MATRÍCULA
                    </span>
                    <span className="block text-[13.5px] font-bold text-[#004b8d] leading-tight">
                      {certidaoData.servidor.matricula}
                    </span>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      IDADE HOJE
                    </span>
                    <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                      {certidaoData.servidor.idadeHoje} anos
                    </span>
                  </div>
                </div>

                {/* Linha 3: CARGO (50%) | PADRÃO / REFERÊNCIA (25%) | DATA DE ADMISSÃO (25%) */}
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12 sm:col-span-6">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      CARGO
                    </span>
                    <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                      {certidaoData.servidor.cargo}
                    </span>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      PADRÃO / REFERÊNCIA
                    </span>
                    <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                      {certidaoData.servidor.padrao} / {certidaoData.servidor.referencia}
                    </span>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      DATA DE ADMISSÃO
                    </span>
                    <span className="block text-[13.5px] font-bold text-gray-900 leading-tight">
                      {certidaoData.servidor.dataAdmissaoServicoPublico}
                    </span>
                  </div>
                </div>

                {/* Linha 4: REGISTRO DE ADMISSÃO TCE-PR (100%) */}
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-12">
                    <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
                      REGISTRO DE ADMISSÃO TCE-PR
                    </span>
                    <span className="block text-[13.5px] font-bold italic text-gray-800 leading-tight">
                      {certidaoData.servidor.registroTribunalContas || 'Sem registro'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Grade de Tempo */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[#002f5a] uppercase border-l-3 border-[#002f5a] pl-2 tracking-wide">
                2. Grade de Tempo de Serviço / Contribuição
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#002f5a] text-white text-[11px]">
                      <th className="p-2.5 font-bold">Tempos de serviço/ contribuição:</th>
                      <th className="p-2.5 font-bold text-center w-16">ANOS</th>
                      <th className="p-2.5 font-bold text-center w-16">MESES</th>
                      <th className="p-2.5 font-bold text-center w-16">DIAS</th>
                      <th className="p-2.5 font-bold text-right w-24">EM DIAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {/* 1. Tempo Estatutário na CMC */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">
                        Tempo Estatutário na CMC {certidaoData.gradeTempo.tempoEstatutarioCMC.periodoDesc ? `(${certidaoData.gradeTempo.tempoEstatutarioCMC.periodoDesc.replace(/^\(|\)$/g, '')}):` : ':'}
                      </td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoEstatutarioCMC.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoEstatutarioCMC.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoEstatutarioCMC.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.tempoEstatutarioCMC.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 2. Tempo Fícto */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">Tempo Fícto (licenças-prêmio incorporadas – CMC):</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoFictoLicencaPremio.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoFictoLicencaPremio.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoFictoLicencaPremio.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.tempoFictoLicencaPremio.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 3. Tempo Recibado */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">Tempo de Serviço Público Municipal (Recibado) incorporado:</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoServicoPublicoRecibado.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoServicoPublicoRecibado.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoServicoPublicoRecibado.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.tempoServicoPublicoRecibado.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 4. Tempo Municipal CLT */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">
                        Tempo de Serviço Público Municipal (CLT) incorporado {certidaoData.gradeTempo.tempoServicoPublicoCLT.periodoDesc ? `(${certidaoData.gradeTempo.tempoServicoPublicoCLT.periodoDesc.replace(/^\(|\)$/g, '')}):` : ':'}
                      </td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoServicoPublicoCLT.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoServicoPublicoCLT.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoServicoPublicoCLT.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.tempoServicoPublicoCLT.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 5. Outras incorporações Estatutário */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">Outras incorporações de Tempo de Serviço Público (Estatutário):</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.outrasIncorporacoesEstatutario.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.outrasIncorporacoesEstatutario.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.outrasIncorporacoesEstatutario.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.outrasIncorporacoesEstatutario.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 6. Outras incorporações CLT */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">Outras incorporações de Tempo de Serviço Público (CLT):</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.outrasIncorporacoesCLT.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.outrasIncorporacoesCLT.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.outrasIncorporacoesCLT.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.outrasIncorporacoesCLT.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 7. Afastamentos sem vencimento */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">Afastamentos sem vencimento:</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.afastamentosSemVencimento.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.afastamentosSemVencimento.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.afastamentosSemVencimento.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.afastamentosSemVencimento.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 8. Penalidades Administrativas, suspensão e faltas */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">Penalidades Administrativas, suspensão e faltas:</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.penalidadesAdministrativas.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.penalidadesAdministrativas.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.penalidadesAdministrativas.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.penalidadesAdministrativas.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 9. Subtotal: Tempo Total de Serviço Público */}
                    <tr className="bg-[#f0f7ff] font-bold border-y border-blue-200">
                      <td className="p-2.5 text-[#002f5a] font-extrabold uppercase tracking-wide">Tempo Total de Serviço Público:</td>
                      <td className="p-2.5 text-center text-[#002f5a] font-extrabold">{certidaoData.gradeTempo.tempoTotalServicoPublico.anos}</td>
                      <td className="p-2.5 text-center text-[#002f5a] font-extrabold">{certidaoData.gradeTempo.tempoTotalServicoPublico.meses}</td>
                      <td className="p-2.5 text-center text-[#002f5a] font-extrabold">{certidaoData.gradeTempo.tempoTotalServicoPublico.dias}</td>
                      <td className="p-2.5 text-right text-[#005599] font-extrabold">{certidaoData.gradeTempo.tempoTotalServicoPublico.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 10. Tempo de Contribuição INSS */}
                    <tr className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-2.5 text-gray-800">
                        <div>Tempo de Contribuição na iniciativa privada incorporado (INSS)</div>
                        {certidaoData.gradeTempo.tempoINSSPrivada.periodoDesc && (
                          <div className="text-[11px] text-gray-500 font-normal mt-0.5 leading-snug">
                            {certidaoData.gradeTempo.tempoINSSPrivada.periodoDesc}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoINSSPrivada.anos}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoINSSPrivada.meses}</td>
                      <td className="p-2.5 text-center text-gray-700">{certidaoData.gradeTempo.tempoINSSPrivada.dias}</td>
                      <td className="p-2.5 text-right font-bold text-gray-900">{certidaoData.gradeTempo.tempoINSSPrivada.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>

                    {/* 11. Total Geral: Tempo Total de Serviço/Contribuição */}
                    <tr className="bg-[#e2eef9] font-black border-t-2 border-[#002f5a]">
                      <td className="p-3 text-[#002f5a] uppercase text-xs font-black tracking-wide">Tempo Total de Serviço/Contribuição:</td>
                      <td className="p-3 text-center text-xs text-[#002f5a] font-black">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.anos}</td>
                      <td className="p-3 text-center text-xs text-[#002f5a] font-black">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.meses}</td>
                      <td className="p-3 text-center text-xs text-[#002f5a] font-black">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.dias}</td>
                      <td className="p-3 text-right text-xs text-[#002f5a] font-black">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bloco 3: Tempos de Exercício */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold text-[#002f5a] uppercase border-l-3 border-[#002f5a] pl-2">
                3. Tempos de Exercício
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-[11px]">
                      <th className="p-2 font-bold">Tempos de exercício</th>
                      <th className="p-2 font-bold text-center w-14">ANOS</th>
                      <th className="p-2 font-bold text-center w-14">MESES</th>
                      <th className="p-2 font-bold text-center w-14">DIAS</th>
                      <th className="p-2 font-bold text-right w-24">EM DIAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="p-2 text-gray-800">Tempo de serviço público ({certidaoData.temposExercicio.servicoPublicoTotal.periodoDesc})</td>
                      <td className="p-2 text-center">{certidaoData.temposExercicio.servicoPublicoTotal.anos}</td>
                      <td className="p-2 text-center">{certidaoData.temposExercicio.servicoPublicoTotal.meses}</td>
                      <td className="p-2 text-center">{certidaoData.temposExercicio.servicoPublicoTotal.dias}</td>
                      <td className="p-2 text-right font-bold text-gray-800">{certidaoData.temposExercicio.servicoPublicoTotal.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>
                    <tr>
                      <td className="p-2 text-gray-800">Tempo no cargo efetivo ({certidaoData.temposExercicio.cargoEfetivoTotal.periodoDesc})</td>
                      <td className="p-2 text-center">{certidaoData.temposExercicio.cargoEfetivoTotal.anos}</td>
                      <td className="p-2 text-center">{certidaoData.temposExercicio.cargoEfetivoTotal.meses}</td>
                      <td className="p-2 text-center">{certidaoData.temposExercicio.cargoEfetivoTotal.dias}</td>
                      <td className="p-2 text-right font-bold text-gray-800">{certidaoData.temposExercicio.cargoEfetivoTotal.totalDias.toLocaleString('pt-BR')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bloco 4: Regras Transitórias e Informações Adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div>
                <span className="font-bold text-gray-700 block mb-1 text-[11px] uppercase">Outras Informações</span>
                <p className="text-gray-800">
                  Adicional por Tempo de Serviço: <strong>{certidaoData.regrasTransitorias.atsPercentual}%</strong>
                </p>
                <p className="text-gray-800 mt-1">
                  Recebe Abono de Permanência? <strong>{certidaoData.regrasTransitorias.recebeAbono ? `Sim (Data: ${certidaoData.regrasTransitorias.dataAbono})` : 'Não'}</strong>
                </p>
              </div>

              <div>
                <span className="font-bold text-gray-700 block mb-1 text-[11px] uppercase">Informações para as Regras Transitórias (LC 133/2021)</span>
                <p className="text-gray-800">
                  Idade em 31/12/2021: <strong>{certidaoData.regrasTransitorias.idadeEm31Dez2021} anos</strong>
                </p>
                <p className="text-gray-800 mt-1">
                  Tempo Serviço/Contribuição em 31/12/2021: <strong>{certidaoData.regrasTransitorias.tempoEm31Dez2021Anos} anos</strong> ({certidaoData.marcos.diasAte31Dez2021.toLocaleString('pt-BR')} dias)
                </p>
              </div>
            </div>

            {/* Bloco 5: Lavratura */}
            <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-6 text-xs">
              <div className="text-gray-600">
                {certidaoData.lavratura.cidade}, {certidaoData.lavratura.data}
              </div>
              <div className="text-center space-y-1">
                <div className="w-56 border-t border-gray-400 mx-auto pt-1" />
                <p className="font-bold text-gray-900">{certidaoData.lavratura.servidorNome}</p>
                <p className="text-[11px] text-gray-500">Matrícula {certidaoData.lavratura.servidorMatricula} • {certidaoData.lavratura.setor}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 1: DADOS DO SERVIDOR */}
      {activeTab === 'servidor' && (
        <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-gray-150 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[#004b8d] uppercase tracking-wide flex items-center gap-2">
                <User size={16} /> Identificação Funcional e Registros no TCE-PR
              </h2>
              <span className="text-xs text-gray-400 font-medium">Campos oficiais da certidão (salvos automaticamente no rascunho)</span>
            </div>
            <button
              type="button"
              onClick={handleSalvarDadosIdentificacao}
              disabled={isSavingIdentificacao}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#004b8d] hover:bg-[#003768] disabled:opacity-60 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Salvar alterações da identificação funcional e TCE-PR na simulação vinculada"
            >
              <Save size={14} />
              {isSavingIdentificacao ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {certidaoData.tipoCertidao === 'abono_permanencia'
                  ? 'Número da Certidão (Abono de Permanência)'
                  : 'Número da Certidão (Aposentadoria)'}
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={certidaoData.numeroCertidao}
                  onChange={(e) => {
                    const val = e.target.value;
                    hasManualEditsRef.current = true;
                    if (!editingCertidao) {
                      if (certidaoData.tipoCertidao === 'abono_permanencia') {
                        setNumeroAbono(val);
                      } else {
                        setNumeroAposentadoria(val);
                      }
                    }
                    setCertidaoData({ ...certidaoData, numeroCertidao: val });
                  }}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold text-gray-800"
                  placeholder={certidaoData.tipoCertidao === 'abono_permanencia' ? 'Ex: 01/2026' : 'Ex: 04/2026'}
                />
                {!editingCertidao && (
                  <button
                    type="button"
                    onClick={() => sugerirProximoNumero(certidaoData.tipoCertidao === 'abono_permanencia' ? 'abono_permanencia' : 'aposentadoria')}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#004b8d] border border-blue-200 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors shadow-2xs"
                    title="Preencher com o próximo número sequencial oficial deste tipo de certidão"
                  >
                    Sugerir Próximo
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Finalidade da Certidão</label>
              <select
                value={certidaoData.tipoCertidao || 'aposentadoria'}
                onChange={(e) => {
                  const novoTipo = e.target.value as TipoCertidaoSequencial;
                  hasManualEditsRef.current = true;
                  setCertidaoData(prev => ({
                    ...prev,
                    tipoCertidao: novoTipo,
                    numeroCertidao: editingCertidao
                      ? prev.numeroCertidao
                      : novoTipo === 'abono_permanencia'
                        ? numeroAbono
                        : numeroAposentadoria
                  }));
                }}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold bg-white text-gray-800"
              >
                <option value="aposentadoria">Certidão de Aposentadoria</option>
                <option value="abono_permanencia">Certidão para Abono de Permanência</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data da Certidão</label>
              <input
                type="text"
                value={certidaoData.dataCertidao}
                onChange={(e) => updateDataCertidao(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Matrícula Funcional</label>
              <input
                type="text"
                value={certidaoData.servidor.matricula}
                onChange={(e) => updateServidor('matricula', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo do Servidor</label>
              <input
                type="text"
                value={certidaoData.servidor.nome}
                onChange={(e) => updateServidor('nome', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Sexo</label>
              <select
                value={certidaoData.servidor.sexo}
                onChange={(e) => updateServidor('sexo', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">RG</label>
              <input
                type="text"
                value={certidaoData.servidor.rg}
                onChange={(e) => updateServidor('rg', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">CPF</label>
              <input
                type="text"
                value={certidaoData.servidor.cpf}
                onChange={(e) => updateServidor('cpf', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data de Nascimento</label>
              <input
                type="text"
                value={certidaoData.servidor.dataNascimento}
                onChange={(e) => updateServidor('dataNascimento', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Idade Hoje (anos)</label>
              <input
                type="number"
                value={certidaoData.servidor.idadeHoje}
                onChange={(e) => updateServidor('idadeHoje', Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Cargo Efetivo</label>
              <input
                type="text"
                value={certidaoData.servidor.cargo}
                onChange={(e) => updateServidor('cargo', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Padrão</label>
              <input
                type="text"
                value={certidaoData.servidor.padrao}
                onChange={(e) => updateServidor('padrao', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Referência</label>
              <input
                type="text"
                value={certidaoData.servidor.referencia}
                onChange={(e) => updateServidor('referencia', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data de Admissão</label>
              <input
                type="text"
                value={certidaoData.servidor.dataAdmissaoServicoPublico}
                onChange={(e) => updateServidor('dataAdmissaoServicoPublico', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Admissão Estatutário CMC</label>
              <input
                type="text"
                value={certidaoData.servidor.dataAdmissaoEstatutario}
                onChange={(e) => updateServidor('dataAdmissaoEstatutario', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data do Requerimento Funcional</label>
              <input
                type="text"
                value={certidaoData.servidor.dataRequerimento}
                onChange={(e) => updateServidor('dataRequerimento', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">Registro da Admissão no Tribunal de Contas (TCE-PR)</label>
              <input
                type="text"
                value={certidaoData.servidor.registroTribunalContas}
                onChange={(e) => updateServidor('registroTribunalContas', e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 402750/03 - Resolução nº 8253/2003"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-150">
            <span className="text-xs text-gray-500">
              {selectedSimId && selectedSimId !== 'blank' && selectedSimId !== 'exemplo_valdemir'
                ? 'As alterações são sincronizadas com o cadastro do servidor ao clicar em Salvar Dados no topo deste bloco.'
                : 'As alterações são gravadas localmente no rascunho da certidão.'}
            </span>
          </div>
        </div>
      )}

      {/* ABA 2: GRADE DE TEMPO E CONTRIBUIÇÃO */}
      {activeTab === 'grade' && (
        <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-gray-150 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#004b8d] uppercase tracking-wide flex items-center gap-2">
              <Clock size={16} /> Grade Detalhada de Tempos, Vínculos e Averbações
            </h2>
            <span className="text-xs text-gray-400 font-medium">Anos, meses, dias e total em dias</span>
          </div>

          <div className="space-y-4">
            {/* 1. Tempo Estatutário CMC */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
                <span>1. Tempo Estatutário na CMC</span>
                <span className="text-gray-400 text-[11px]">Vínculo no cargo efetivo</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoEstatutarioCMC.anos}
                    onChange={(e) => updateGradeItem('tempoEstatutarioCMC', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoEstatutarioCMC.meses}
                    onChange={(e) => updateGradeItem('tempoEstatutarioCMC', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoEstatutarioCMC.dias}
                    onChange={(e) => updateGradeItem('tempoEstatutarioCMC', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoEstatutarioCMC.totalDias}
                    onChange={(e) => updateGradeItem('tempoEstatutarioCMC', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-[#004b8d]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Período de Referência</label>
                  <input
                    type="text"
                    value={certidaoData.gradeTempo.tempoEstatutarioCMC.periodoDesc || ''}
                    onChange={(e) => updateGradeItem('tempoEstatutarioCMC', 'periodoDesc', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ex: 02/10/1993 a 22/10/2026"
                  />
                </div>
              </div>
            </div>

            {/* 2. Licenças-prêmio Fíctas */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
                <span>2. Tempo Fícto (licenças-prêmio incorporadas – CMC)</span>
                <span className="text-gray-400 text-[11px]">Adquiridas até a EC 20/1998</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoFictoLicencaPremio.anos}
                    onChange={(e) => updateGradeItem('tempoFictoLicencaPremio', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoFictoLicencaPremio.meses}
                    onChange={(e) => updateGradeItem('tempoFictoLicencaPremio', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoFictoLicencaPremio.dias}
                    onChange={(e) => updateGradeItem('tempoFictoLicencaPremio', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoFictoLicencaPremio.totalDias}
                    onChange={(e) => updateGradeItem('tempoFictoLicencaPremio', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-[#004b8d]"
                  />
                </div>
              </div>
            </div>

            {/* 3. Tempo de Serviço Público Municipal (Recibado) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
                <span>3. Tempo de Serviço Público Municipal (Recibado) incorporado</span>
                <span className="text-gray-400 text-[11px]">Recibado incorporado</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoRecibado.anos}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoRecibado', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoRecibado.meses}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoRecibado', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoRecibado.dias}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoRecibado', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoRecibado.totalDias}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoRecibado', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-[#004b8d]"
                  />
                </div>
              </div>
            </div>

            {/* 4. Tempo Municipal CLT incorporado */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
                <span>4. Tempo de Serviço Público Municipal (CLT) incorporado</span>
                <span className="text-gray-400 text-[11px]">Vínculo CLT anterior à transmudação</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoCLT.anos}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoCLT', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoCLT.meses}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoCLT', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoCLT.dias}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoCLT', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoServicoPublicoCLT.totalDias}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoCLT', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-[#004b8d]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Período CLT</label>
                  <input
                    type="text"
                    value={certidaoData.gradeTempo.tempoServicoPublicoCLT.periodoDesc || ''}
                    onChange={(e) => updateGradeItem('tempoServicoPublicoCLT', 'periodoDesc', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ex: 27/06/1988 a 01/10/1993"
                  />
                </div>
              </div>
            </div>

            {/* 5. Outras incorporações Estatutário */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
                <span>5. Outras incorporações de Tempo de Serviço Público (Estatutário):</span>
                <span className="text-gray-400 text-[11px]">Vínculo estatutário anterior averbado</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesEstatutario.anos}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesEstatutario', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesEstatutario.meses}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesEstatutario', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesEstatutario.dias}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesEstatutario', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesEstatutario.totalDias}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesEstatutario', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-[#004b8d]"
                  />
                </div>
              </div>
            </div>

            {/* 6. Outras incorporações CLT */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
                <span>6. Outras incorporações de Tempo de Serviço Público (CLT):</span>
                <span className="text-gray-400 text-[11px]">Vínculo CLT público averbado</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesCLT.anos}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesCLT', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesCLT.meses}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesCLT', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesCLT.dias}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesCLT', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.outrasIncorporacoesCLT.totalDias}
                    onChange={(e) => updateGradeItem('outrasIncorporacoesCLT', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-[#004b8d]"
                  />
                </div>
              </div>
            </div>

            {/* 7. Afastamentos sem vencimento */}
            <div className="p-4 bg-amber-50/60 rounded-lg border border-amber-200 space-y-3">
              <div className="font-bold text-xs text-amber-900 flex items-center justify-between">
                <span>7. Afastamentos sem vencimento:</span>
                <span className="text-amber-700 text-[11px] font-semibold">Dedução do tempo público</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.afastamentosSemVencimento.anos}
                    onChange={(e) => updateGradeItem('afastamentosSemVencimento', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.afastamentosSemVencimento.meses}
                    onChange={(e) => updateGradeItem('afastamentosSemVencimento', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.afastamentosSemVencimento.dias}
                    onChange={(e) => updateGradeItem('afastamentosSemVencimento', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.afastamentosSemVencimento.totalDias}
                    onChange={(e) => updateGradeItem('afastamentosSemVencimento', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-amber-900"
                  />
                </div>
              </div>
            </div>

            {/* 8. Penalidades Administrativas, suspensão e faltas */}
            <div className="p-4 bg-amber-50/60 rounded-lg border border-amber-200 space-y-3">
              <div className="font-bold text-xs text-amber-900 flex items-center justify-between">
                <span>8. Penalidades Administrativas, suspensão e faltas:</span>
                <span className="text-amber-700 text-[11px] font-semibold">Dedução do tempo público</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.penalidadesAdministrativas.anos}
                    onChange={(e) => updateGradeItem('penalidadesAdministrativas', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.penalidadesAdministrativas.meses}
                    onChange={(e) => updateGradeItem('penalidadesAdministrativas', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.penalidadesAdministrativas.dias}
                    onChange={(e) => updateGradeItem('penalidadesAdministrativas', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.penalidadesAdministrativas.totalDias}
                    onChange={(e) => updateGradeItem('penalidadesAdministrativas', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-amber-900"
                  />
                </div>
              </div>
            </div>

            {/* Subtotal: TEMPO TOTAL DE SERVIÇO PÚBLICO */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl border border-blue-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-[#002f5a] uppercase tracking-wide flex items-center gap-1.5">
                  <Calculator size={15} className="text-[#004b8d]" />
                  Tempo Total de Serviço Público:
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                  Subtotal Calculado Automaticamente (Linhas 1 a 6 menos 7 e 8)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase">Anos</span>
                  <span className="text-base font-extrabold text-[#002f5a]">{certidaoData.gradeTempo.tempoTotalServicoPublico.anos}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase">Meses</span>
                  <span className="text-base font-extrabold text-[#002f5a]">{certidaoData.gradeTempo.tempoTotalServicoPublico.meses}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase">Dias</span>
                  <span className="text-base font-extrabold text-[#002f5a]">{certidaoData.gradeTempo.tempoTotalServicoPublico.dias}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase">Em Dias</span>
                  <span className="text-base font-black text-[#004b8d]">{certidaoData.gradeTempo.tempoTotalServicoPublico.totalDias.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* 10. Tempo INSS Privada Incorporado */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="font-bold text-xs text-gray-800 flex items-center justify-between">
                <span>10. Tempo de Contribuição na iniciativa privada incorporado (INSS)</span>
                <span className="text-gray-400 text-[11px]">Certidão de Tempo de Contribuição CTC</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Anos</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoINSSPrivada.anos}
                    onChange={(e) => updateGradeItem('tempoINSSPrivada', 'anos', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Meses</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoINSSPrivada.meses}
                    onChange={(e) => updateGradeItem('tempoINSSPrivada', 'meses', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoINSSPrivada.dias}
                    onChange={(e) => updateGradeItem('tempoINSSPrivada', 'dias', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Total em Dias</label>
                  <input
                    type="number"
                    value={certidaoData.gradeTempo.tempoINSSPrivada.totalDias}
                    onChange={(e) => updateGradeItem('tempoINSSPrivada', 'totalDias', Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md font-bold text-[#004b8d]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <label className="block text-[10px] text-gray-500 font-bold uppercase">Discriminação dos Períodos INSS</label>
                  <input
                    type="text"
                    value={certidaoData.gradeTempo.tempoINSSPrivada.periodoDesc || ''}
                    onChange={(e) => updateGradeItem('tempoINSSPrivada', 'periodoDesc', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Ex: 01/03/1982 a 20/03/1983; 01/07/1983 a 17/07/1984..."
                  />
                </div>
              </div>
            </div>

            {/* Total Geral: TEMPO TOTAL DE SERVIÇO / CONTRIBUIÇÃO */}
            <div className="p-4 bg-gradient-to-r from-blue-100/70 to-indigo-100/60 rounded-xl border-2 border-[#002f5a]/30 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-[#002f5a] uppercase tracking-wide flex items-center gap-1.5">
                  <Award size={15} className="text-[#002f5a]" />
                  Tempo Total de Serviço/Contribuição:
                </span>
                <span className="text-[11px] font-bold text-[#002f5a] bg-white/80 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Total Geral Consolidado
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                  <span className="block text-[10px] text-gray-600 font-bold uppercase">Anos</span>
                  <span className="text-base font-black text-[#002f5a]">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.anos}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                  <span className="block text-[10px] text-gray-600 font-bold uppercase">Meses</span>
                  <span className="text-base font-black text-[#002f5a]">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.meses}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                  <span className="block text-[10px] text-gray-600 font-bold uppercase">Dias</span>
                  <span className="text-base font-black text-[#002f5a]">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.dias}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-blue-200 shadow-2xs">
                  <span className="block text-[10px] text-gray-600 font-bold uppercase">Em Dias</span>
                  <span className="text-base font-black text-[#002f5a]">{certidaoData.gradeTempo.tempoTotalServicoContribuicao.totalDias.toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: REGRAS TRANSITÓRIAS & ABONO */}
      {activeTab === 'regras' && (
        <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-gray-150 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#004b8d] uppercase tracking-wide flex items-center gap-2">
              <Award size={16} /> Marco Temporal de 31/12/2021 (LC 133/2021) e Abono de Permanência
            </h2>
            <span className="text-xs text-gray-400 font-medium">Requisitos constitucionais</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Adicional por Tempo de Serviço (ATS %)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={certidaoData.regrasTransitorias.atsPercentual}
                  onChange={(e) => setCertidaoData({
                    ...certidaoData,
                    regrasTransitorias: { ...certidaoData.regrasTransitorias, atsPercentual: Number(e.target.value) }
                  })}
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold"
                />
                <span className="text-xs font-bold text-gray-500">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Recebe Abono de Permanência?</label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="recebeAbono"
                    checked={certidaoData.regrasTransitorias.recebeAbono === true}
                    onChange={() => setCertidaoData({
                      ...certidaoData,
                      regrasTransitorias: { ...certidaoData.regrasTransitorias, recebeAbono: true }
                    })}
                    className="text-blue-600"
                  />
                  Sim
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="recebeAbono"
                    checked={certidaoData.regrasTransitorias.recebeAbono === false}
                    onChange={() => setCertidaoData({
                      ...certidaoData,
                      regrasTransitorias: { ...certidaoData.regrasTransitorias, recebeAbono: false }
                    })}
                    className="text-blue-600"
                  />
                  Não
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data de Concessão / Início do Abono</label>
              <input
                type="text"
                value={certidaoData.regrasTransitorias.dataAbono}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  regrasTransitorias: { ...certidaoData.regrasTransitorias, dataAbono: e.target.value }
                })}
                disabled={!certidaoData.regrasTransitorias.recebeAbono}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Idade em 31/12/2021 (anos)</label>
              <input
                type="number"
                value={certidaoData.regrasTransitorias.idadeEm31Dez2021}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  regrasTransitorias: { ...certidaoData.regrasTransitorias, idadeEm31Dez2021: Number(e.target.value) }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tempo de Serviço/Contribuição em 31/12/2021 (anos)</label>
              <input
                type="number"
                value={certidaoData.regrasTransitorias.tempoEm31Dez2021Anos}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  regrasTransitorias: { ...certidaoData.regrasTransitorias, tempoEm31Dez2021Anos: Number(e.target.value) }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Dias até 31/12/2021</label>
              <input
                type="number"
                value={certidaoData.marcos.diasAte31Dez2021}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  marcos: { ...certidaoData.marcos, diasAte31Dez2021: Number(e.target.value) }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA 4: LAVRATURA & ASSINATURA */}
      {activeTab === 'lavratura' && (
        <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-gray-150 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#004b8d] uppercase tracking-wide flex items-center gap-2">
              <FileText size={16} /> Dados da Lavratura da Certidão e Servidor Responsável
            </h2>
            <span className="text-xs text-gray-400 font-medium">Assinatura funcional DGEP</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Cidade</label>
              <input
                type="text"
                value={certidaoData.lavratura.cidade}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  lavratura: { ...certidaoData.lavratura, cidade: e.target.value }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Data por Extenso</label>
              <input
                type="text"
                value={certidaoData.lavratura.data}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  lavratura: { ...certidaoData.lavratura, data: e.target.value }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 22 de outubro de 2026"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Servidor(a) que Lavrou a Certidão</label>
              <input
                type="text"
                value={certidaoData.lavratura.servidorNome}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  lavratura: { ...certidaoData.lavratura, servidorNome: e.target.value }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Larissa Carrera Baginski"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Matrícula Funcional do Servidor Responsável</label>
              <input
                type="text"
                value={certidaoData.lavratura.servidorMatricula}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  lavratura: { ...certidaoData.lavratura, servidorMatricula: e.target.value }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Ex: 2251"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Setor / Lotação</label>
              <input
                type="text"
                value={certidaoData.lavratura.setor}
                onChange={(e) => setCertidaoData({
                  ...certidaoData,
                  lavratura: { ...certidaoData.lavratura, setor: e.target.value }
                })}
                className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* ABA 5: CONTROLE DE CERTIDÕES EMITIDAS */}
      {activeTab === 'historico' && (
        <div className="bg-white border border-[#dee2e6] rounded-xl p-6 shadow-xs space-y-6">
          <div className="border-b border-gray-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#002f5a] flex items-center gap-2">
                <History size={18} className="text-[#004b8d]" />
                Controle e Registro de Certidões Emitidas
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Relação de todas as certidões (Oficiais com número sequencial e Minutas de Simulação) geradas pelo sistema.
              </p>
            </div>

            <button
              type="button"
              onClick={carregarHistorico}
              className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw size={12} /> Atualizar Lista
            </button>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-150 rounded-xl p-4">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide block mb-1">
                Total de Documentos
              </span>
              <strong className="text-2xl font-black text-[#002f5a]">
                {historicoCertidoes.length}
              </strong>
              <span className="text-[10px] text-blue-700 block mt-1">Registros no histórico</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-150 rounded-xl p-4">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide block mb-1">
                Certidões Oficiais
              </span>
              <strong className="text-2xl font-black text-emerald-800">
                {historicoCertidoes.filter(c => c.tipo === 'oficial').length}
              </strong>
              <span className="text-[10px] text-emerald-700 block mt-1">Com numeração sequencial DGEP</span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-150 rounded-xl p-4">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wide block mb-1">
                Certidões de Simulação
              </span>
              <strong className="text-2xl font-black text-amber-800">
                {historicoCertidoes.filter(c => c.tipo === 'simulacao').length}
              </strong>
              <span className="text-[10px] text-amber-700 block mt-1">Minutas sem controle numérico</span>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-lg self-start">
                <button
                  type="button"
                  onClick={() => setFiltroHistorico('todas')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    filtroHistorico === 'todas' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Todas ({historicoCertidoes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroHistorico('oficial')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    filtroHistorico === 'oficial' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Oficiais ({historicoCertidoes.filter(c => c.tipo === 'oficial').length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroHistorico('simulacao')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    filtroHistorico === 'simulacao' ? 'bg-white text-amber-800 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Simulações ({historicoCertidoes.filter(c => c.tipo === 'simulacao').length})
                </button>
              </div>

              {externalSim && (
                <button
                  type="button"
                  onClick={() => setSomenteServidorAtual(prev => !prev)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    somenteServidorAtual
                      ? 'bg-blue-50 text-[#004b8d] border-blue-200'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {somenteServidorAtual ? 'Somente este Servidor' : 'Todos os Servidores'}
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={buscaHistorico}
                onChange={(e) => setBuscaHistorico(e.target.value)}
                placeholder="Buscar por servidor ou matrícula..."
                className="w-full text-xs pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabela de Certidões */}
          {(() => {
            const filtradas = historicoCertidoes.filter(c => {
              if (externalSim && somenteServidorAtual) {
                const cMat = (c.matricula || '').trim().toLowerCase();
                const sMat = (externalSim.matricula || '').trim().toLowerCase();
                const cNome = (c.servidorNome || '').trim().toLowerCase();
                const sNome = (externalSim.nome || '').trim().toLowerCase();
                const sameMat = Boolean(cMat && sMat && cMat === sMat);
                const sameNome = Boolean(cNome && sNome && cNome === sNome);
                if (!sameMat && !sameNome) return false;
              }
              if (filtroHistorico !== 'todas' && c.tipo !== filtroHistorico) return false;
              if (buscaHistorico.trim()) {
                const termo = buscaHistorico.toLowerCase();
                return (
                  c.servidorNome.toLowerCase().includes(termo) ||
                  c.matricula.toLowerCase().includes(termo) ||
                  c.numeroCertidao.toLowerCase().includes(termo) ||
                  c.cargo.toLowerCase().includes(termo)
                );
              }
              return true;
            });

            if (filtradas.length === 0) {
              return (
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-2">
                  <History size={32} className="mx-auto text-gray-300" />
                  <p className="text-xs font-semibold text-gray-500">
                    {historicoCertidoes.length === 0
                      ? 'Nenhuma certidão emitida até o momento. Gere uma certidão oficial ou de simulação para vê-la listada aqui.'
                      : 'Nenhuma certidão encontrada com os filtros informados.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 border-b border-gray-200 font-bold">
                      <th className="p-3">Número / Natureza</th>
                      <th className="p-3">Finalidade</th>
                      <th className="p-3">Servidor</th>
                      <th className="p-3">Data Certidão</th>
                      <th className="p-3">Tempo Certificado</th>
                      <th className="p-3">Emissão</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtradas.map(item => {
                      const isAbono = item.snapshot?.tipoCertidao === 'abono_permanencia';
                      return (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="p-3">
                          {item.tipo === 'oficial' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200 font-mono">
                              <Award size={12} className="text-[#004b8d]" />
                              Nº {item.numeroCertidao}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                              <FileCheck size={12} className="text-amber-700" />
                              SIMULAÇÃO
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isAbono ? 'bg-teal-50 text-teal-800 border-teal-200' : 'bg-blue-50 text-[#004b8d] border-blue-200'
                          }`}>
                            {isAbono ? 'Abono de Permanência' : 'Aposentadoria'}
                          </span>
                        </td>
                        <td className="p-3">
                          <strong className="block text-gray-900 text-[12px]">{item.servidorNome}</strong>
                          <span className="text-[11px] text-gray-500">Matrícula: {item.matricula || '-'} • {item.cargo}</span>
                        </td>
                        <td className="p-3 font-medium text-gray-800">
                          {item.dataCertidao}
                        </td>
                        <td className="p-3">
                          <span className="block font-bold text-gray-900">{item.tempoFormatado}</span>
                          <span className="text-[10px] text-gray-500">{item.tempoTotalDias.toLocaleString('pt-BR')} dias líquidos</span>
                        </td>
                        <td className="p-3 text-gray-600 text-[11px]">
                          {new Date(item.dataEmissaoTimestamp).toLocaleDateString('pt-BR')} às {new Date(item.dataEmissaoTimestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleIniciarEdicaoCertidao(item)}
                              className="p-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Editar esta certidão sem alterar a contagem sequencial"
                            >
                              <Pencil size={13} /> Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                try {
                                  gerarCertidaoAposentadoriaPadraoPDF(item.snapshot);
                                  triggerFeedback(`Certidão (${item.numeroCertidao}) baixada novamente!`);
                                } catch (e) {
                                  triggerFeedback('Erro ao gerar o PDF da certidão selecionada.', true);
                                }
                              }}
                              className="p-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#004b8d] rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Baixar PDF desta certidão novamente"
                            >
                              <Download size={13} /> PDF
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setCertidaoData(item.snapshot);
                                setActiveTab('preview');
                                triggerFeedback(`Certidão (${item.numeroCertidao}) de ${item.servidorNome} carregada para conferência!`);
                              }}
                              className="p-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="Visualizar espelho desta certidão"
                            >
                              <Eye size={13} /> Ver
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteHistTarget(item)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition-colors"
                              title="Excluir este registro"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {deleteHistTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-gray-900">Excluir Registro de Certidão</h3>
                <p className="text-xs text-gray-600">
                  Deseja remover a certidão <strong>{deleteHistTarget.numeroCertidao}</strong> de <strong>{deleteHistTarget.servidorNome}</strong> do controle de emissões?
                </p>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setDeleteHistTarget(null)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      excluirCertidaoEmitida(deleteHistTarget.id);
                      setDeleteHistTarget(null);
                      carregarHistorico();
                      onHistoricoChanged?.();
                      triggerFeedback('Registro de certidão removido com sucesso.');
                    }}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
