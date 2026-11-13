import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Users,
  Briefcase,
  TrendingUp,
  Clock,
  Calculator,
  FileCheck,
  Save,
  Plus,
  Search,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Calendar,
  FolderOpen,
  Award,
  Download,
  ClipboardList,
  ShieldCheck,
  FileBadge,
  Pencil
} from 'lucide-react';
import {
  UnifiedSimulation,
  getSavedSimulations,
  saveSimulation,
  deleteSimulation,
  getDraftSimulation,
  saveDraftSimulation,
  createNewSimulation
} from '../utils/simulationsStore';
import { getSavedFatoresINSS, getPatternForCareer } from '../utils/settingsStore';
import { getCareerDisplayName } from '../data/careers';
import {
  CertidaoEmitida,
  getCertidoesEmitidas,
  excluirCertidaoEmitida
} from '../utils/certidoesEmitidasStore';
import { gerarCertidaoAposentadoriaPadraoPDF } from '../utils/exportCertidaoPDF';
import {
  StepPessoais,
  StepCarreira,
  StepGratificacoes,
  StepTemposEContribuicoes,
  StepGerar
} from './SimulacaoCompleta';
import GeradorCertidao from './GeradorCertidao';

type HubView = 'lista' | 'dossie';
type ListTab = 'carteira' | 'acompanhamento';
type CertTypeFilter =
  | 'todas'
  | 'aposentadoria_oficial'
  | 'aposentadoria_simulacao'
  | 'abono_oficial'
  | 'abono_simulacao';
type DossieSection = 'cadastro' | 'simulacoes' | 'certidoes';
type SortField = 'nome' | 'matricula' | 'data';
type SortDir = 'asc' | 'desc';

interface ServidoresHubProps {
  initialView?: HubView;
  initialListTab?: ListTab;
  initialSection?: DossieSection;
}

export default function ServidoresHub({
  initialView,
  initialListTab = 'carteira',
  initialSection = 'cadastro'
}: ServidoresHubProps) {
  const [servidores, setServidores] = useState<UnifiedSimulation[]>([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<UnifiedSimulation | null>(null);

  const [sim, setSim] = useState<UnifiedSimulation>(() => {
    const draft = getDraftSimulation();
    const defaults = createNewSimulation();
    if (draft) {
      return {
        ...defaults,
        ...draft,
        fgRows: draft.fgRows || defaults.fgRows,
        stimulusRows: draft.stimulusRows || defaults.stimulusRows,
        incorporacoes: draft.incorporacoes || defaults.incorporacoes,
        needsUpdate: draft.needsUpdate ?? defaults.needsUpdate
      };
    }
    return defaults;
  });

  const hasActiveDraft = Boolean(
    sim.nome || sim.matricula || sim.cpf || sim.ingressoCmc || sim.ingressoCargoAtual
  );

  const [viewMode, setViewMode] = useState<HubView>(() => {
    if (initialView) return initialView;
    return 'lista';
  });
  const [activeSection, setActiveSection] = useState<DossieSection>(initialSection);
  const [notification, setNotification] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [certidoesCountByMat, setCertidoesCountByMat] = useState<Record<string, number>>({});
  const [certidoesList, setCertidoesList] = useState<CertidaoEmitida[]>([]);
  const [listTab, setListTab] = useState<ListTab>(initialListTab);
  const [certTypeFilter, setCertTypeFilter] = useState<CertTypeFilter>('todas');
  const [certSearchTerm, setCertSearchTerm] = useState('');
  const [deleteCertTarget, setDeleteCertTarget] = useState<CertidaoEmitida | null>(null);
  const [editCertIdToOpen, setEditCertIdToOpen] = useState<string | null>(null);

  const loadServidores = async () => {
    setLoadingLista(true);
    try {
      const data = await getSavedSimulations();
      setServidores(data);
    } catch (e) {
      console.error('Erro ao carregar servidores:', e);
    } finally {
      setLoadingLista(false);
    }

    try {
      const certs = getCertidoesEmitidas();
      setCertidoesList(certs);
      const counts: Record<string, number> = {};
      certs.forEach(c => {
        const key = (c.matricula || c.servidorNome || '').trim().toLowerCase();
        if (key) counts[key] = (counts[key] || 0) + 1;
      });
      setCertidoesCountByMat(counts);
    } catch (e) {}
  };

  useEffect(() => {
    loadServidores();
  }, []);

  useEffect(() => {
    if (initialView) setViewMode(initialView);
  }, [initialView]);

  useEffect(() => {
    if (initialListTab) setListTab(initialListTab);
  }, [initialListTab]);

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    saveDraftSimulation(sim);
  }, [sim]);

  const showToast = (text: string, isError = false) => {
    setNotification({ text, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const updateSim = (field: keyof UnifiedSimulation, value: any) => {
    setSim(prev => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString()
    }));
  };

  const handleSaveDossie = async () => {
    setIsSaving(true);
    try {
      const updated = { ...sim, updatedAt: new Date().toISOString() };
      setSim(updated);
      await saveSimulation(updated);
      await loadServidores();
      showToast('Cadastro do servidor salvo com sucesso!');
    } catch (e) {
      showToast('Erro ao salvar o cadastro do servidor.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenServidor = (
    target: UnifiedSimulation,
    section: DossieSection = 'cadastro'
  ) => {
    const defaults = createNewSimulation();
    const hydrated: UnifiedSimulation = {
      ...defaults,
      ...target,
      fgRows: target.fgRows || defaults.fgRows,
      stimulusRows: target.stimulusRows || defaults.stimulusRows,
      incorporacoes: target.incorporacoes || defaults.incorporacoes,
      needsUpdate: target.needsUpdate ?? defaults.needsUpdate
    };
    localStorage.removeItem('dgep_certidao_draft_v1');
    setSim(hydrated);
    saveDraftSimulation(hydrated);
    setActiveSection(section);
    setViewMode('dossie');
  };

  const handleCreateNovoServidor = () => {
    const fresh = createNewSimulation();
    localStorage.removeItem('dgep_certidao_draft_v1');
    setSim(fresh);
    saveDraftSimulation(fresh);
    setActiveSection('cadastro');
    setViewMode('dossie');
  };

  const handleDuplicateServidor = async (target: UnifiedSimulation) => {
    try {
      const copy: UnifiedSimulation = {
        ...target,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        nome: `Cópia de ${target.nome || 'Servidor Sem Nome'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveSimulation(copy);
      await loadServidores();
      showToast('Cadastro duplicado com sucesso!');
    } catch (e) {
      showToast('Erro ao duplicar cadastro do servidor.', true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSimulation(deleteTarget.id);
      if (sim.id === deleteTarget.id) {
        const fresh = createNewSimulation();
        setSim(fresh);
        saveDraftSimulation(fresh);
      }
      setDeleteTarget(null);
      await loadServidores();
      showToast('Cadastro excluído com sucesso.');
    } catch (e) {
      showToast('Erro ao excluir cadastro.', true);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredAndSorted = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = servidores.filter(item => {
      if (!q) return true;
      const nome = (item.nome || '').toLowerCase();
      const mat = (item.matricula || '').toLowerCase();
      const cpf = (item.cpf || '').toLowerCase();
      const cargo = getCareerDisplayName(item.cargo || item.selectedCareer).toLowerCase();
      return nome.includes(q) || mat.includes(q) || cpf.includes(q) || cargo.includes(q);
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'nome') {
        comparison = (a.nome || '').localeCompare(b.nome || '');
      } else if (sortField === 'matricula') {
        comparison = (a.matricula || '').localeCompare(b.matricula || '');
      } else {
        comparison =
          new Date(a.updatedAt || a.createdAt || 0).getTime() -
          new Date(b.updatedAt || b.createdAt || 0).getTime();
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [servidores, searchTerm, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} className="text-gray-400 opacity-50 ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ChevronUp size={13} className="text-[#004b8d] ml-1" />
    ) : (
      <ChevronDown size={13} className="text-[#004b8d] ml-1" />
    );
  };

  const scrollToCadastroSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getCertKind = (c: CertidaoEmitida): Exclude<CertTypeFilter, 'todas'> => {
    const isAbono = c.snapshot?.tipoCertidao === 'abono_permanencia';
    const isOficial = c.tipo === 'oficial';
    if (isAbono) return isOficial ? 'abono_oficial' : 'abono_simulacao';
    return isOficial ? 'aposentadoria_oficial' : 'aposentadoria_simulacao';
  };

  const certMatchesServidor = (c: CertidaoEmitida, s: UnifiedSimulation): boolean => {
    const cMat = (c.matricula || '').trim().toLowerCase();
    const sMat = (s.matricula || '').trim().toLowerCase();
    if (cMat && sMat) return cMat === sMat;
    const cNome = (c.servidorNome || '').trim().toLowerCase();
    const sNome = (s.nome || '').trim().toLowerCase();
    return Boolean(cNome && sNome && cNome === sNome);
  };

  const certSummaryStats = useMemo(() => {
    const stats = {
      total: certidoesList.length,
      aposentadoria_oficial: 0,
      aposentadoria_simulacao: 0,
      abono_oficial: 0,
      abono_simulacao: 0
    };
    certidoesList.forEach(c => {
      stats[getCertKind(c)] += 1;
    });
    return stats;
  }, [certidoesList]);

  const servidoresAcompanhamento = useMemo(() => {
    const q = certSearchTerm.trim().toLowerCase();
    return servidores
      .filter(s => {
        if (!q) return true;
        const nome = (s.nome || '').toLowerCase();
        const mat = (s.matricula || '').toLowerCase();
        const cargo = getCareerDisplayName(s.cargo || s.selectedCareer).toLowerCase();
        return nome.includes(q) || mat.includes(q) || cargo.includes(q);
      })
      .map(s => {
        const matched = certidoesList.filter(c => certMatchesServidor(c, s));
        const counts = {
          aposentadoria_oficial: 0,
          aposentadoria_simulacao: 0,
          abono_oficial: 0,
          abono_simulacao: 0
        };
        matched.forEach(c => {
          counts[getCertKind(c)] += 1;
        });
        const hasPessoais = Boolean(
          s.nome?.trim() && s.cpf?.trim() && s.dataNascimento?.trim()
        );
        const hasCarreira = Boolean(s.ingressoCmc?.trim() || s.ingressoCargoAtual?.trim());
        const hasSalariosOuAverbacoes = Boolean(
          (s.historicalData && s.historicalData.trim().length > 0) ||
            (s.incorporacoes && s.incorporacoes.length > 0) ||
            (s.diasAverbadosINSS || 0) > 0 ||
            (s.diasAverbadosSP || 0) > 0
        );
        const missingBlocks: string[] = [];
        if (!hasPessoais) missingBlocks.push('Dados Pessoais');
        if (!hasCarreira) missingBlocks.push('Carreira');
        if (!hasSalariosOuAverbacoes) missingBlocks.push('Tempos/Salários');
        const filledBlocks = 3 - missingBlocks.length;

        const lastCert = matched[0] || null;
        return {
          servidor: s,
          counts,
          totalCertidoes: matched.length,
          filledBlocks,
          missingBlocks,
          lastCert
        };
      });
  }, [servidores, certidoesList, certSearchTerm]);

  const filteredCertidoes = useMemo(() => {
    const q = certSearchTerm.trim().toLowerCase();
    return certidoesList.filter(c => {
      if (certTypeFilter !== 'todas' && getCertKind(c) !== certTypeFilter) return false;
      if (!q) return true;
      const nome = (c.servidorNome || '').toLowerCase();
      const mat = (c.matricula || '').toLowerCase();
      const num = (c.numeroCertidao || '').toLowerCase();
      const cargo = (c.cargo || '').toLowerCase();
      return nome.includes(q) || mat.includes(q) || num.includes(q) || cargo.includes(q);
    });
  }, [certidoesList, certTypeFilter, certSearchTerm]);

  const handleConfirmDeleteCert = () => {
    if (!deleteCertTarget) return;
    excluirCertidaoEmitida(deleteCertTarget.id);
    setDeleteCertTarget(null);
    loadServidores();
    showToast('Registro de certidão removido do controle.');
  };

  const handleEditarCertidaoEmitida = (cert: CertidaoEmitida) => {
    const matchedServidor = servidores.find(s => certMatchesServidor(cert, s));
    if (matchedServidor) {
      handleOpenServidor(matchedServidor, 'certidoes');
    } else {
      setActiveSection('certidoes');
      setViewMode('dossie');
    }
    setEditCertIdToOpen(cert.id);
  };

  if (viewMode === 'lista') {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header da Carteira de Servidores */}
        <div className="bg-gradient-to-r from-[#002f5a] via-[#004b8d] to-[#013564] text-white p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/15 text-white text-[11px] font-bold uppercase tracking-wider">
              <Users size={13} /> Dossiê Único do Servidor
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Servidores, Simulações e Documentos
            </h1>
            <p className="text-blue-100/90 text-xs sm:text-sm leading-relaxed">
              Cadastre ou selecione um servidor para editar seus dados em uma única tela e gerar todas as simulações de aposentadoria, cálculos de proventos, certidões e remessas ao IPMC.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCreateNovoServidor}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#002f5a] hover:bg-blue-50 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus size={16} /> Cadastrar Novo Servidor
          </button>
        </div>

        {notification && (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold border ${
              notification.isError
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {notification.isError ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            <span>{notification.text}</span>
          </div>
        )}

        {/* Sub-abas da Carteira de Servidores */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-xs">
          <button
            type="button"
            onClick={() => setListTab('carteira')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              listTab === 'carteira'
                ? 'bg-[#004b8d] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Users size={15} />
            Carteira de Servidores ({servidores.length})
          </button>

          <button
            type="button"
            onClick={() => {
              loadServidores();
              setListTab('acompanhamento');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              listTab === 'acompanhamento'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <ClipboardList size={15} />
            Acompanhamento de Cadastros & Controle de Certidões ({certidoesList.length})
          </button>
        </div>

        {/* Destaque do Dossiê em Andamento (se houver rascunho preenchido) */}
        {hasActiveDraft && listTab === 'carteira' && (
          <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-white border border-indigo-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shrink-0">
                <FolderOpen size={20} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                  Dossiê Aberto em Andamento
                </span>
                <strong className="text-sm sm:text-base text-gray-900 block">
                  {sim.nome || 'Servidor em Edição'} {sim.matricula ? `• Matrícula ${sim.matricula}` : ''}
                </strong>
                <span className="text-xs text-gray-600">
                  {getCareerDisplayName(sim.cargo || sim.selectedCareer)} • Padrão{' '}
                  {sim.padrao || getPatternForCareer(sim.selectedCareer || sim.cargo) || '-'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveSection('cadastro');
                  setViewMode('dossie');
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <User size={14} /> Abrir Cadastro
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('simulacoes');
                  setViewMode('dossie');
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Calculator size={14} /> Simulações
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSection('certidoes');
                  setViewMode('dossie');
                }}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <FileCheck size={14} /> Certidões & IPMC
              </button>
            </div>
          </div>
        )}

        {/* Busca + Tabela de Servidores */}
        {listTab === 'carteira' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#002f5a] uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-[#004b8d]" />
              Servidores Cadastrados ({filteredAndSorted.length})
            </h2>

            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, matrícula, CPF ou cargo..."
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d] focus:bg-white transition-all"
              />
            </div>
          </div>

          {loadingLista ? (
            <div className="py-12 text-center text-xs font-semibold text-gray-500">
              Carregando cadastros de servidores...
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 space-y-3">
              <p className="text-sm font-semibold text-gray-600">
                {searchTerm
                  ? 'Nenhum servidor encontrado com os critérios da busca.'
                  : 'Nenhum servidor cadastrado ainda.'}
              </p>
              <button
                type="button"
                onClick={handleCreateNovoServidor}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#004b8d] text-white text-xs font-bold rounded-lg hover:bg-[#003a6d] transition-all cursor-pointer"
              >
                <Plus size={14} /> Cadastrar Primeiro Servidor
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider select-none">
                    <tr>
                      <th
                        className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('nome')}
                      >
                        <div className="flex items-center">
                          Servidor / Cargo & Padrão
                          <SortIcon field="nome" />
                        </div>
                      </th>
                      <th
                        className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('matricula')}
                      >
                        <div className="flex items-center">
                          Matrícula / CPF
                          <SortIcon field="matricula" />
                        </div>
                      </th>
                      <th
                        className="p-3.5 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('data')}
                      >
                        <div className="flex items-center">
                          Atualizado em
                          <SortIcon field="data" />
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Abrir / Gerar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredAndSorted.map(item => {
                      const padraoItem =
                        item.padrao || getPatternForCareer(item.selectedCareer || item.cargo);
                      const certKey = (item.matricula || item.nome || '').trim().toLowerCase();
                      const certCount = certKey ? certidoesCountByMat[certKey] || 0 : 0;

                      return (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="p-3.5">
                            <div className="font-bold text-gray-900 flex items-center gap-2">
                              <User size={14} className="text-[#004b8d] shrink-0" />
                              <span>{item.nome || 'Servidor Sem Nome'}</span>
                              {certCount > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded font-bold">
                                  {certCount} doc{certCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 truncate max-w-[320px]">
                              <Briefcase size={12} className="text-[#004b8d] shrink-0" />
                              <span>{getCareerDisplayName(item.cargo || item.selectedCareer)}</span>
                              {padraoItem && (
                                <span className="font-mono font-bold text-[#002f5a]">
                                  • Padrão {padraoItem}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-mono text-xs font-bold text-gray-800">
                              {item.matricula || '---'}
                            </div>
                            {item.cpf && (
                              <div className="font-mono text-[11px] text-gray-500 mt-0.5">
                                {item.cpf}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-xs text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-gray-400" />
                              {new Date(item.updatedAt || item.createdAt).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenServidor(item, 'cadastro')}
                                className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
                                title="Editar cadastro único do servidor"
                              >
                                <User size={13} /> Ficha
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenServidor(item, 'simulacoes')}
                                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer"
                                title="Gerar regras, proventos e relatórios"
                              >
                                <Calculator size={13} /> Simular
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenServidor(item, 'certidoes')}
                                className="inline-flex items-center gap-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold px-2.5 py-1.5 text-xs rounded-lg transition-all border border-teal-200 cursor-pointer"
                                title="Emitir Certidões e Remessa ao IPMC"
                              >
                                <FileCheck size={13} /> Documentos
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateServidor(item)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="Duplicar cadastro para cenário alternativo"
                              >
                                <Copy size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="bg-red-50 hover:bg-red-100 text-red-700 p-1.5 rounded-lg transition-all cursor-pointer"
                                title="Excluir cadastro"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        )}

        {/* ABA ACOMPANHAMENTO DE CADASTROS & CONTROLE DE CERTIDÕES POR TIPO */}
        {listTab === 'acompanhamento' && (
          <div className="space-y-6">
            {/* Resumo Numérico Geral (clicável para filtrar) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => setCertTypeFilter('todas')}
                className={`text-left bg-white rounded-xl p-4 shadow-xs transition-all cursor-pointer border ${
                  certTypeFilter === 'todas'
                    ? 'border-[#004b8d] ring-2 ring-[#004b8d]/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-gray-500 block">
                  Cadastros Ativos
                </span>
                <span className="text-2xl font-extrabold text-[#002f5a] mt-1 block">
                  {servidores.length}
                </span>
                <span className="text-[11px] text-gray-500">
                  Servidores salvos ({certSummaryStats.total} docs)
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCertTypeFilter(prev =>
                    prev === 'aposentadoria_oficial' ? 'todas' : 'aposentadoria_oficial'
                  )
                }
                className={`text-left bg-emerald-50/70 rounded-xl p-4 shadow-xs transition-all cursor-pointer border ${
                  certTypeFilter === 'aposentadoria_oficial'
                    ? 'border-emerald-600 ring-2 ring-emerald-500/25'
                    : 'border-emerald-200 hover:border-emerald-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                  Aposentadoria • Oficial
                </span>
                <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">
                  {certSummaryStats.aposentadoria_oficial}
                </span>
                <span className="text-[11px] text-emerald-700">Numeradas</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCertTypeFilter(prev =>
                    prev === 'aposentadoria_simulacao' ? 'todas' : 'aposentadoria_simulacao'
                  )
                }
                className={`text-left bg-blue-50/70 rounded-xl p-4 shadow-xs transition-all cursor-pointer border ${
                  certTypeFilter === 'aposentadoria_simulacao'
                    ? 'border-blue-600 ring-2 ring-blue-500/25'
                    : 'border-blue-200 hover:border-blue-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-blue-800 block">
                  Aposentadoria • Minuta
                </span>
                <span className="text-2xl font-extrabold text-blue-900 mt-1 block">
                  {certSummaryStats.aposentadoria_simulacao}
                </span>
                <span className="text-[11px] text-blue-700">Simulações</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCertTypeFilter(prev =>
                    prev === 'abono_oficial' ? 'todas' : 'abono_oficial'
                  )
                }
                className={`text-left bg-teal-50/70 rounded-xl p-4 shadow-xs transition-all cursor-pointer border ${
                  certTypeFilter === 'abono_oficial'
                    ? 'border-teal-600 ring-2 ring-teal-500/25'
                    : 'border-teal-200 hover:border-teal-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-teal-800 block">
                  Abono • Oficial
                </span>
                <span className="text-2xl font-extrabold text-teal-900 mt-1 block">
                  {certSummaryStats.abono_oficial}
                </span>
                <span className="text-[11px] text-teal-700">Numeradas</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setCertTypeFilter(prev =>
                    prev === 'abono_simulacao' ? 'todas' : 'abono_simulacao'
                  )
                }
                className={`text-left bg-amber-50/70 rounded-xl p-4 shadow-xs transition-all cursor-pointer border ${
                  certTypeFilter === 'abono_simulacao'
                    ? 'border-amber-600 ring-2 ring-amber-500/25'
                    : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                <span className="text-[10px] font-bold uppercase text-amber-800 block">
                  Abono • Minuta
                </span>
                <span className="text-2xl font-extrabold text-amber-900 mt-1 block">
                  {certSummaryStats.abono_simulacao}
                </span>
                <span className="text-[11px] text-amber-700">Simulações</span>
              </button>
            </div>

            {/* Painel de Filtro Global do Acompanhamento */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={certSearchTerm}
                  onChange={e => setCertSearchTerm(e.target.value)}
                  placeholder="Filtrar acompanhamento por nome, matrícula, cargo ou nº da certidão..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'todas' as CertTypeFilter, label: `Todas (${certSummaryStats.total})` },
                  {
                    id: 'aposentadoria_oficial' as CertTypeFilter,
                    label: `Apos. Oficial (${certSummaryStats.aposentadoria_oficial})`
                  },
                  {
                    id: 'aposentadoria_simulacao' as CertTypeFilter,
                    label: `Apos. Minuta (${certSummaryStats.aposentadoria_simulacao})`
                  },
                  {
                    id: 'abono_oficial' as CertTypeFilter,
                    label: `Abono Oficial (${certSummaryStats.abono_oficial})`
                  },
                  {
                    id: 'abono_simulacao' as CertTypeFilter,
                    label: `Abono Minuta (${certSummaryStats.abono_simulacao})`
                  }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setCertTypeFilter(f.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      certTypeFilter === f.id
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Acompanhamento por Servidor Cadastrado */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#002f5a] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-teal-700" />
                  Acompanhamento de Cadastros e Emissões por Servidor ({servidoresAcompanhamento.length})
                </h2>
                <span className="text-[11px] text-gray-500">
                  Cruzamento automático entre dossiês salvos e certidões emitidas por tipo
                </span>
              </div>

              {servidoresAcompanhamento.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Nenhum servidor encontrado para o filtro informado.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                          <th className="p-3">Servidor / Matrícula</th>
                          <th className="p-3">Status do Cadastro</th>
                          <th className="p-3 text-center">Apos. Oficial</th>
                          <th className="p-3 text-center">Apos. Minuta</th>
                          <th className="p-3 text-center">Abono Oficial</th>
                          <th className="p-3 text-center">Abono Minuta</th>
                          <th className="p-3">Última Emissão</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {servidoresAcompanhamento.map(row => {
                          const { servidor: s, counts, filledBlocks, missingBlocks, lastCert } = row;
                          const padraoItem =
                            s.padrao || getPatternForCareer(s.selectedCareer || s.cargo);
                          return (
                            <tr key={s.id} className="hover:bg-teal-50/20 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-gray-900">
                                  {s.nome || 'Servidor Sem Nome'}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Mat. {s.matricula || '---'} •{' '}
                                  {getCareerDisplayName(s.cargo || s.selectedCareer)}
                                  {padraoItem ? ` (Padrão ${padraoItem})` : ''}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      filledBlocks === 3
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : filledBlocks === 2
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {filledBlocks === 3
                                      ? 'Completo (3/3)'
                                      : `Parcial (${filledBlocks}/3)`}
                                  </span>
                                  {missingBlocks.length > 0 && (
                                    <span className="text-[10px] text-gray-500 whitespace-normal max-w-[180px]">
                                      Falta: {missingBlocks.join(', ')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center font-mono font-bold">
                                {counts.aposentadoria_oficial > 0 ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded">
                                    {counts.aposentadoria_oficial}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold">
                                {counts.aposentadoria_simulacao > 0 ? (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded">
                                    {counts.aposentadoria_simulacao}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold">
                                {counts.abono_oficial > 0 ? (
                                  <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded">
                                    {counts.abono_oficial}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                              <td className="p-3 text-center font-mono font-bold">
                                {counts.abono_simulacao > 0 ? (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded">
                                    {counts.abono_simulacao}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-gray-600">
                                {lastCert ? (
                                  <div>
                                    <span className="font-mono font-bold text-gray-800">
                                      {lastCert.numeroCertidao}
                                    </span>{' '}
                                    • {lastCert.dataCertidao}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Nenhuma emitida</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenServidor(s, 'cadastro')}
                                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-lg transition-all cursor-pointer"
                                  >
                                    Ficha
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenServidor(s, 'certidoes')}
                                    className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold rounded-lg transition-all cursor-pointer"
                                  >
                                    Emitir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Controle Geral de Certidões Emitidas por Tipo */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-[#002f5a] uppercase tracking-wider flex items-center gap-2">
                  <FileBadge size={16} className="text-[#004b8d]" />
                  Controle Geral de Certidões Emitidas ({filteredCertidoes.length})
                </h2>
                <span className="text-[11px] text-gray-500">
                  Histórico classificado por finalidade (Aposentadoria / Abono) e natureza (Oficial / Minuta)
                </span>
              </div>

              {filteredCertidoes.length === 0 ? (
                <div className="py-10 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Nenhuma certidão emitida encontrada para este tipo ou filtro.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                        <tr>
                          <th className="p-3">Nº / Natureza</th>
                          <th className="p-3">Finalidade (Tipo)</th>
                          <th className="p-3">Servidor / Matrícula</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">Tempo Total</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {filteredCertidoes.map(cert => {
                          const kind = getCertKind(cert);
                          const isAbono =
                            kind === 'abono_oficial' || kind === 'abono_simulacao';
                          const isOficial =
                            kind === 'aposentadoria_oficial' || kind === 'abono_oficial';

                          return (
                            <tr key={cert.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-gray-900">
                                    {cert.numeroCertidao}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      isOficial
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {isOficial ? 'Oficial' : 'Minuta'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    isAbono
                                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                                      : 'bg-blue-50 text-[#004b8d] border-blue-200'
                                  }`}
                                >
                                  {isAbono ? 'Abono de Permanência' : 'Aposentadoria'}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-gray-900">
                                  {cert.servidorNome || 'Não informado'}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Mat. {cert.matricula || '---'} • {cert.cargo || '---'}
                                </div>
                              </td>
                              <td className="p-3 text-gray-600">{cert.dataCertidao}</td>
                              <td className="p-3 font-medium text-gray-800">
                                {cert.tempoFormatado}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEditarCertidaoEmitida(cert)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-lg transition-all cursor-pointer"
                                    title="Editar certidão emitida sem alterar a contagem sequencial"
                                  >
                                    <Pencil size={12} /> Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => gerarCertidaoAposentadoriaPadraoPDF(cert.snapshot)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#004b8d] hover:bg-[#003a6d] text-white font-bold rounded-lg transition-all cursor-pointer"
                                    title="Baixar PDF desta certidão"
                                  >
                                    <Download size={12} /> PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteCertTarget(cert)}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all cursor-pointer"
                                    title="Excluir registro de certidão"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão de Certidão */}
        {deleteCertTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-full shrink-0">
                  <Trash2 size={22} />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">Excluir Registro de Certidão</h3>
                  <p className="text-sm text-gray-500">
                    Deseja remover a certidão{' '}
                    <strong className="text-gray-800">{deleteCertTarget.numeroCertidao}</strong> de{' '}
                    <strong className="text-gray-800">
                      {deleteCertTarget.servidorNome || 'Servidor'}
                    </strong>{' '}
                    do histórico de controle?
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeleteCertTarget(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteCert}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-full shrink-0">
                  <Trash2 size={22} />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900">Excluir Cadastro do Servidor</h3>
                  <p className="text-sm text-gray-500">
                    Deseja excluir permanentemente o dossiê de{' '}
                    <strong className="text-gray-800">
                      {deleteTarget.nome || 'Servidor Sem Nome'}
                    </strong>
                    ? Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISÃO 2: DOSSIÊ ÚNICO DO SERVIDOR (CADASTRO -> SIMULAÇÕES -> DOCUMENTOS)
  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* Cabeçalho Persistente do Servidor Ativo */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              loadServidores();
              setViewMode('lista');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#004b8d] transition-colors cursor-pointer"
            title="Voltar à lista de servidores cadastrados"
          >
            <ArrowLeft size={14} /> Voltar para Carteira de Servidores
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {sim.congelada ? (
              <button
                type="button"
                onClick={() => {
                  updateSim('congelada', false);
                  showToast('Fatores descongelados. Usando tabela INSS mais recente.');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                title="Clique para usar os fatores mais recentes"
              >
                <Lock size={13} /> Fatores Congelados
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const latestFatores = getSavedFatoresINSS();
                  setSim(prev => ({
                    ...prev,
                    congelada: true,
                    fatoresCongeladosText: latestFatores.fatoresText,
                    fatoresCongeladosMonthYear: latestFatores.referenceMonthYear,
                    updatedAt: new Date().toISOString()
                  }));
                  showToast(
                    `Fatores congelados na referência ${latestFatores.referenceMonthYear || 'Atual'}.`
                  );
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition-all cursor-pointer border border-gray-200"
                title="Congelar tabela de fatores INSS vigente para este servidor"
              >
                <Unlock size={13} /> Congelar Fatores
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveDossie}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#004b8d] hover:bg-[#003a6d] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Save size={13} /> {isSaving ? 'Salvando...' : 'Salvar Cadastro'}
            </button>
          </div>
        </div>

        <div className="p-5 pb-0 space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#002f5a] tracking-tight truncate">
              {sim.nome || 'Novo Cadastro de Servidor'}
            </h1>
            {sim.matricula && (
              <p className="text-xs font-mono font-semibold text-gray-700 mt-1">
                Matrícula {sim.matricula}
              </p>
            )}
          </div>

          {/* Navegação Central do Dossiê: Cadastro -> Simulações -> Certidões */}
          <div className="flex flex-wrap gap-1 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setActiveSection('cadastro')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeSection === 'cadastro'
                  ? 'border-[#002f5a] text-[#002f5a] bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User size={15} />
              1. Cadastro do Servidor
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('simulacoes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeSection === 'simulacoes'
                  ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Calculator size={15} />
              2. Simulações, Regras & Proventos
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('certidoes')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeSection === 'certidoes'
                  ? 'border-teal-700 text-teal-800 bg-teal-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Award size={15} />
              3. Certidões, Abono & Remessa IPMC
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-2 text-xs sm:text-sm font-bold border ${
            notification.isError
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {notification.isError ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          <span>{notification.text}</span>
        </div>
      )}

      {/* ABA 1: CADASTRO COMPLETO DO SERVIDOR EM UMA ÚNICA TELA */}
      {activeSection === 'cadastro' && (
        <div className="space-y-6">
          {/* Atalhos de navegação interna dentro do cadastro */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-bold text-[#002f5a] uppercase text-[10px] tracking-wider px-1">
              Ir para seção:
            </span>
            {[
              { id: 'sec-pessoais', label: 'Identificação & TCE-PR', icon: User },
              { id: 'sec-carreira', label: 'Carreira & Padrão', icon: Briefcase },
              { id: 'sec-gratificacoes', label: 'ATS, FGs & Estímulos', icon: TrendingUp },
              { id: 'sec-tempos-contribuicoes', label: 'Averbações & Salários (CMC)', icon: Clock }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToCadastroSection(item.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-blue-100/60 text-[#004b8d] border border-blue-200 rounded-lg font-semibold transition-all cursor-pointer"
                >
                  <Icon size={12} /> {item.label}
                </button>
              );
            })}
          </div>

          <div id="sec-pessoais" className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs scroll-mt-4">
            <StepPessoais sim={sim} updateSim={updateSim} />
          </div>

          <div id="sec-carreira" className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs scroll-mt-4">
            <StepCarreira sim={sim} updateSim={updateSim} />
          </div>

          <div id="sec-gratificacoes" className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs scroll-mt-4">
            <StepGratificacoes sim={sim} updateSim={updateSim} />
          </div>

          <div id="sec-tempos-contribuicoes" className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs scroll-mt-4">
            <StepTemposEContribuicoes sim={sim} updateSim={updateSim} />
          </div>

          {/* Rodapé leve de progressão */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-500">
              Todas as alterações são mantidas automaticamente no rascunho. Use <strong>Salvar Cadastro</strong> no topo para gravar no servidor.
            </span>
            <button
              type="button"
              onClick={() => setActiveSection('simulacoes')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <Calculator size={14} /> Avançar para Simulações
            </button>
          </div>
        </div>
      )}

      {/* ABA 2: SIMULAÇÕES E RELATÓRIOS GERADOS DO CADASTRO */}
      {activeSection === 'simulacoes' && (
        <div className="bg-white p-5 sm:p-6 rounded-xl border border-gray-200 shadow-xs">
          <StepGerar sim={sim} initialShowReport={true} />
        </div>
      )}

      {/* ABA 3: CERTIDÕES, ABONO E REMESSA IPMC GERADOS DO CADASTRO */}
      {activeSection === 'certidoes' && (
        <GeradorCertidao
          externalSim={sim}
          onSyncSim={updated => {
            setSim(updated);
            saveDraftSimulation(updated);
          }}
          embedded={true}
          initialEditCertId={editCertIdToOpen}
          onClearInitialEditCert={() => setEditCertIdToOpen(null)}
          onHistoricoChanged={loadServidores}
        />
      )}
    </div>
  );
}
