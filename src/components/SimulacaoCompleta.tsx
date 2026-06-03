import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Save, 
  CheckCircle, 
  User, 
  Briefcase, 
  TrendingUp,
  FileText,
  Clock,
  Settings,
  Plus,
  Trash2,
  FilePlus,
  AlertTriangle,
  X,
  Star,
  XSquare,
  Sparkles,
  Info,
  Lock,
  Unlock
} from 'lucide-react';
import { 
  UnifiedSimulation, 
  getDraftSimulation, 
  saveDraftSimulation, 
  createNewSimulation,
  saveSimulation
} from '../utils/simulationsStore';
import { getSavedCareerData, getSavedFatoresINSS, getSavedFGValues, getSavedSalaryCaps } from '../utils/settingsStore';
import { exportToPDF, exportToExcel } from '../utils/exportHelpers';
import { romanNumerals, stimulusPercentages, ATS_PERCENTAGES, SALARY_CAP_GENERAL, SALARY_CAP_PROCURADOR } from '../data/careers';

function calcularTempoRPPS(d1: Date, d2: Date) {
  // Inclusive date logic
  const d2_exclusive = new Date(d2.getTime());
  d2_exclusive.setDate(d2_exclusive.getDate() + 1);

  let years = 0;
  let months = 0;
  let days = 0;

  let current = new Date(d1.getTime());

  // 1. Advance by years as much as possible
  while (true) {
    const nextYear = new Date(current.getTime());
    nextYear.setFullYear(current.getFullYear() + 1);
    if (nextYear.getTime() <= d2_exclusive.getTime()) {
      current = nextYear;
      years++;
    } else {
      break;
    }
  }

  // 2. Advance by months as much as possible
  while (true) {
    const nextMonth = new Date(current.getTime());
    const currentDay = current.getDate();
    nextMonth.setMonth(current.getMonth() + 1);
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

  // 3. Leftover days
  const diffMs = d2_exclusive.getTime() - current.getTime();
  days = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return { years, months, days };
}

export default function SimulacaoCompleta() {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  const [sim, setSim] = useState<UnifiedSimulation>(() => {
    const draft = getDraftSimulation();
    const defaults = createNewSimulation();
    if (draft) {
      return { 
        ...defaults, 
        ...draft,
        fgRows: draft.fgRows || defaults.fgRows,
        stimulusRows: draft.stimulusRows || defaults.stimulusRows,
        needsUpdate: draft.needsUpdate ?? defaults.needsUpdate,
      };
    }
    return defaults;
  });
  
  const [notification, setNotification] = useState('');
  const [showNewSimModal, setShowNewSimModal] = useState(false);

  useEffect(() => {
    saveDraftSimulation(sim);
  }, [sim]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleSave = async () => {
    try {
      await saveSimulation(sim);
      showNotification('Simulação salva com sucesso!');
    } catch (e) {
      showNotification('Erro ao salvar simulação');
    }
  };

  const handleNewSimulation = async (saveCurrent: boolean) => {
    if (saveCurrent) {
      try {
        await saveSimulation(sim);
        showNotification('Simulação salva com sucesso!');
      } catch (e) {
        showNotification('Erro ao salvar simulação');
      }
    }
    const defaults = createNewSimulation();
    setSim(defaults);
    saveDraftSimulation(defaults);
    setCurrentStep(1);
    setShowNewSimModal(false);
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const updateSim = (field: keyof UnifiedSimulation, value: any) => {
    setSim(prev => ({ ...prev, [field]: value }));
  };

  const stepVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-gray-900 uppercase leading-tight">Simulação Integrada</h1>
          <p className="text-xs sm:text-sm font-semibold text-gray-500 uppercase">Fluxo Completo de Aposentadoria</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowNewSimModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white text-[#004b8d] border border-[#004b8d] px-3 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:bg-blue-50 transition-all cursor-pointer"
          >
            <FilePlus size={15} /> Nova Simulação
          </button>
          
          {sim.congelada ? (
            <button 
              onClick={() => {
                updateSim('congelada', false);
                showNotification('Simulação descongelada. Usando fatores mais recentes.');
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-amber-500 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:bg-amber-600 transition-all cursor-pointer"
              title="Esta simulação está congelada com fatores antigos. Clique para descongelar."
            >
              <Lock size={15} /> Congelada
            </button>
          ) : (
            <button 
              onClick={() => {
                const latestFatores = getSavedFatoresINSS();
                setSim(prev => ({
                  ...prev,
                  congelada: true,
                  fatoresCongeladosText: latestFatores.fatoresText,
                  fatoresCongeladosMonthYear: latestFatores.referenceMonthYear
                }));
                showNotification(`Simulação finalizada e congelada (Fatores Ref: ${latestFatores.referenceMonthYear || 'Atual'}).`);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gray-500 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:bg-gray-650 transition-all cursor-pointer"
              title="Congelar fatores de conversão vigentes para esta simulação"
            >
              <Unlock size={15} /> Finalizar e Congelar
            </button>
          )}

          <button 
            onClick={handleSave}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#004b8d] text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:bg-[#003a6d] transition-all cursor-pointer"
          >
            <Save size={15} /> Salvar Progresso
          </button>
        </div>
      </div>
      
      {notification && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 text-sm font-bold">
          <CheckCircle size={16} /> {notification}
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full transition-all">
        <div className="flex items-center min-w-max justify-between">
          {[
            { step: 1, label: 'Pessoais', icon: User },
            { step: 2, label: 'Carreira', icon: Briefcase },
            { step: 3, label: 'Gratificações', icon: TrendingUp },
            { step: 4, label: 'Contribuições', icon: FileText },
            { step: 5, label: 'Tempos', icon: Clock },
            { step: 6, label: 'Simulações', icon: Settings },
          ].map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.step;
            const isPast = currentStep > s.step;
            return (
              <div key={s.step} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(s.step)}
                  className="flex items-center group cursor-pointer focus:outline-none transition-transform active:scale-95"
                  title={`Ir para: ${s.label}`}
                >
                  <div 
                    className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 text-[10px] sm:text-xs font-bold transition-all shrink-0 ${
                      isActive ? 'bg-[#004b8d] border-[#004b8d] text-white shadow-md' : 
                      isPast ? 'bg-emerald-600 border-emerald-600 text-white group-hover:bg-emerald-700 group-hover:border-emerald-700 shadow-sm' : 
                      'bg-white border-gray-300 text-gray-400 group-hover:border-[#004b8d] group-hover:text-[#004b8d]'
                    }`}
                  >
                    {isPast ? <CheckCircle size={12} className="sm:w-3.5 sm:h-3.5" /> : s.step}
                  </div>
                  <div className={`ml-1.5 sm:ml-2 text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${
                    isActive ? 'text-[#004b8d]' : 
                    isPast ? 'text-emerald-700 group-hover:text-emerald-800' : 
                    'text-gray-400 group-hover:text-[#004b8d]'
                  }`}>
                    {s.label}
                  </div>
                </button>
                {s.step < totalSteps && (
                  <div className={`w-3 sm:w-5 lg:w-8 h-0.5 mx-1.5 sm:mx-2 transition-colors ${isPast ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {currentStep === 1 && <StepPessoais sim={sim} updateSim={updateSim} />}
            {currentStep === 2 && <StepCarreira sim={sim} updateSim={updateSim} />}
            {currentStep === 3 && <StepGratificacoes sim={sim} updateSim={updateSim} />}
            {currentStep === 4 && <StepContribuicoes sim={sim} updateSim={updateSim} />}
            {currentStep === 5 && <StepTempos sim={sim} updateSim={updateSim} />}
            {currentStep === 6 && <StepGerar sim={sim} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 text-sm"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
        <button
          onClick={nextStep}
          disabled={currentStep === totalSteps}
          className="flex items-center gap-1 bg-[#004b8d] hover:bg-[#003a6d] text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-50 text-sm"
        >
          Próximo <ChevronRight size={16} />
        </button>
      </div>

      {/* New Simulation Modal */}
      <AnimatePresence>
        {showNewSimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md overflow-hidden relative"
            >
              <button 
                onClick={() => setShowNewSimModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                title="Fechar modal"
              >
                <X size={20} />
              </button>
              
              <div className="p-6 pb-0">
                <div className="flex items-center gap-3 text-[#004b8d] mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FilePlus size={24} />
                  </div>
                  <h3 className="text-lg font-bold mt-1">Nova Simulação</h3>
                </div>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-6 font-medium">
                  Deseja salvar o progresso atual e iniciar uma nova simulação?
                </p>
              </div>

              <div className="p-4 bg-gray-50 flex flex-col gap-2">
                <button
                  onClick={() => handleNewSimulation(true)}
                  className="w-full py-2.5 px-4 bg-[#004b8d] text-white rounded-lg text-sm font-bold hover:bg-[#003a6d] transition-all shadow-sm"
                >
                  Salvar e iniciar nova simulação
                </button>
                <button
                  onClick={() => handleNewSimulation(false)}
                  className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-100 hover:text-gray-900 transition-all shadow-sm"
                >
                  Não salvar e iniciar nova simulação
                </button>
                <button
                  onClick={() => setShowNewSimModal(false)}
                  className="w-full py-2 px-4 text-gray-500 rounded-lg text-sm font-bold hover:text-gray-700 hover:bg-gray-200/50 transition-all mt-1"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Separate components for each step to keep the code manageable

function StepPessoais({ sim, updateSim }: { sim: UnifiedSimulation, updateSim: any }) {
  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider">
        Identificação do Servidor
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nome Completo</label>
          <input
            type="text"
            value={sim.nome || ''}
            onChange={e => updateSim('nome', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Matrícula</label>
          <input
            type="text"
            value={sim.matricula || ''}
            onChange={e => updateSim('matricula', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Data de Nascimento</label>
          <input
            type="date"
            value={sim.dataNascimento || ''}
            onChange={e => updateSim('dataNascimento', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Sexo</label>
          <select
            value={sim.sexo || ''}
            onChange={e => updateSim('sexo', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          >
            <option value="">Selecione...</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function StepCarreira({ sim, updateSim }: { sim: UnifiedSimulation, updateSim: any }) {
  const careers = getSavedCareerData();
  const careerOptions = Object.keys(careers);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider">
        Dados da Carreira
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Ingresso Serviço Público (CMC)</label>
          <input
            type="date"
            value={sim.ingressoCmc || ''}
            onChange={e => updateSim('ingressoCmc', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Ingresso no Cargo Atual</label>
          <input
            type="date"
            value={sim.ingressoCargoAtual || ''}
            onChange={e => updateSim('ingressoCargoAtual', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Plano de Carreira Selecionado</label>
          <select
            value={sim.selectedCareer || ''}
            onChange={e => updateSim('selectedCareer', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all capitalize"
          >
            <option value="">Selecione a Carreira...</option>
            {careerOptions.map(c => (
              <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nível de Carreira</label>
          <select
            value={sim.careerLevel || ''}
            onChange={e => updateSim('careerLevel', e.target.value as any)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          >
            <option value="M">Nível Médio</option>
            <option value="S">Nível Superior</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Progresso de Faixa</label>
          <select
            value={sim.selectedLevel || ''}
            onChange={e => updateSim('selectedLevel', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          >
             {['I','II','III','IV','V','VI','VII','VIII','IX','X',
             'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX',
             'XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX',
             'XXXI','XXXII','XXXIII','XXXIV','XXXV','XXXVI'].map(lvl => (
               <option key={lvl} value={lvl}>{lvl}</option>
             ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function StepGratificacoes({ sim, updateSim }: { sim: UnifiedSimulation, updateSim: any }) {
  let isEligible = true;
  if (sim.ingressoCmc) {
    const entryDate = new Date(sim.ingressoCmc + 'T00:00:00');
    const limitDate = new Date('2003-12-31T00:00:00');
    if (entryDate > limitDate) {
      isEligible = false;
    }
  }

  const addStimulusRow = () => {
    updateSim('stimulusRows', [...sim.stimulusRows, { tipo: 'graduacao', start: '', end: '' }]);
  };

  const removeStimulusRow = (index: number) => {
    updateSim('stimulusRows', sim.stimulusRows.filter((_, i) => i !== index));
  };

  const updateStimulusRow = (index: number, field: string, value: string) => {
    const newRows = [...sim.stimulusRows];
    newRows[index] = { ...newRows[index], [field]: value };
    updateSim('stimulusRows', newRows);
  };

  const addFgRow = () => {
    updateSim('fgRows', [...sim.fgRows, { nivel: 'FG4', start: '', end: '' }]);
  };

  const removeFgRow = (index: number) => {
    updateSim('fgRows', sim.fgRows.filter((_, i) => i !== index));
  };

  const updateFgRow = (index: number, field: string, value: string) => {
    const newRows = [...sim.fgRows];
    newRows[index] = { ...newRows[index], [field]: value };
    updateSim('fgRows', newRows);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider">
        Gratificações e Adicionais
      </h2>

      {!isEligible && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong className="block font-bold">Servidor Inelegível para Gratificação Especial (GE)</strong>
            <p className="text-xs text-amber-700 mt-1">
              Data de ingresso no serviço público ({sim.ingressoCmc ? new Date(sim.ingressoCmc + 'T00:00:00').toLocaleDateString('pt-BR') : 'não informada'}) é superior a 31/12/2003. Conforme regulamento, apenas servidores admitidos até esta data possuem direito à incorporação de Gratificação Especial. Os valores inseridos abaixo serão demonstrados como zero no cálculo final.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Data da Última Concessão de ATS</label>
          <input
            type="date"
            value={sim.lastAtsConcession || ''}
            onChange={e => updateSim('lastAtsConcession', e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nº de Adicionais (ATS) Concedidos</label>
          <input
            type="number"
            value={sim.lastAtsNumber ?? 0}
            onChange={e => updateSim('lastAtsNumber', parseFloat(e.target.value) || 0)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
          />
        </div>
      </div>
      
      <div className="mt-6 border-t border-gray-100 pt-6">
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Estímulo Acadêmico</h3>
            <p className="text-[10px] text-gray-400 max-w-xl leading-relaxed">
              * A graduação (30%) acumula com títulos superiores. Títulos superiores (Especialização 10%, Mestrado 15%, Doutorado 20%) não acumulam entre si. A aplicação calculará automaticamente o fim da gratificação menor quando uma maior iniciar.
            </p>
          </div>
          <button 
            onClick={addStimulusRow}
            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md text-xs font-bold transition-all"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
        
        {sim.stimulusRows.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-medium tracking-wide">Nenhum Estímulo Acadêmico informado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sim.stimulusRows.map((row, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="w-full sm:w-1/2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Tipo / Nível</label>
                  <select
                    value={row.tipo || ''}
                    onChange={(e) => updateStimulusRow(idx, 'tipo', e.target.value)}
                    className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d] focus:border-transparent transition-all"
                  >
                    <option value="graduacao">Graduação (30%)</option>
                    <option value="pos_graduacao">Especialização (10%)</option>
                    <option value="mestrado">Mestrado (15%)</option>
                    <option value="doutorado">Doutorado (20%)</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/2 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Data Início</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={row.start || ''}
                      onChange={(e) => updateStimulusRow(idx, 'start', e.target.value)}
                      className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d] focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => removeStimulusRow(idx)}
                      className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-all shrink-0"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-gray-100 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Funções Gratificadas (FG)</h3>
          <button 
            onClick={addFgRow}
            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md text-xs font-bold transition-all"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>
        
        {sim.fgRows.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-medium tracking-wide">Nenhuma Função Gratificada informada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sim.fgRows.map((row, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="w-full sm:w-1/3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Nível (Símbolo)</label>
                  <select
                    value={row.nivel || ''}
                    onChange={(e) => updateFgRow(idx, 'nivel', e.target.value)}
                    className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d] focus:border-transparent transition-all"
                  >
                    <option value="FG4">FG-4</option>
                    <option value="FG5">FG-5</option>
                    <option value="FG6">FG-6</option>
                    <option value="FG7">FG-7</option>
                    <option value="FG8">FG-8</option>
                  </select>
                </div>
                <div className="w-full sm:w-1/3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Data Início</label>
                  <input
                    type="date"
                    value={row.start || ''}
                    onChange={(e) => updateFgRow(idx, 'start', e.target.value)}
                    className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d] focus:border-transparent transition-all"
                  />
                </div>
                <div className="w-full sm:w-1/3 space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Data Fim <span className="font-normal normal-case">(se houver)</span></label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={row.end || ''}
                      onChange={(e) => updateFgRow(idx, 'end', e.target.value)}
                      className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d] focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => removeFgRow(idx)}
                      className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-all shrink-0"
                      title="Remover"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepContribuicoes({ sim, updateSim }: { sim: UnifiedSimulation, updateSim: any }) {
  const [calculatedRows, setCalculatedRows] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sim.needsUpdate || !sim.historicalData.trim()) {
      setCalculatedRows([]);
      setErrorMsg('');
      return;
    }

    const fatoresText = (sim.congelada && sim.fatoresCongeladosText !== undefined)
      ? sim.fatoresCongeladosText
      : getSavedFatoresINSS().fatoresText;
    
    // Normalization helper
    const mesesMap: { [key: string]: string } = {
      'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
      'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
    };

    function normalizarData(mesStr: string, anoStr: string): string {
      let mes = mesStr.toLowerCase().trim();
      if (mesesMap[mes]) mes = mesesMap[mes];
      else mes = mes.padStart(2, '0');
      let ano = anoStr.trim();
      if (ano.length === 2) {
        const yearInt = parseInt(ano, 10);
        ano = yearInt >= 70 ? `19${ano}` : `20${ano}`;
      }
      return `${mes}/${ano}`;
    }

    function parseLinha(linha: string) {
      const limpa = linha.trim();
      if (!limpa) return null;
      const regexComDia = /^(\d{1,2})\/(\d{1,2}|[a-zA-Z]{3})\/(\d{2}|\d{4})\s+(.*)$/;
      const regexSemDia = /^(\d{1,2}|[a-zA-Z]{3})\/(\d{2}|\d{4})\s+(.*)$/;
      let match = limpa.match(regexComDia);
      if (match) {
        return { competencia: normalizarData(match[2], match[3]), valor: parseFloat(match[4].trim().replace(/\./g, '').replace(',', '.')) };
      }
      match = limpa.match(regexSemDia);
      if (match) {
        return { competencia: normalizarData(match[1], match[2]), valor: parseFloat(match[3].trim().replace(/\./g, '').replace(',', '.')) };
      }
      return null;
    }

    const fatores = new Map<string, number>();
    for (const line of fatoresText.split('\n')) {
      const parsed = parseLinha(line);
      if (parsed && !isNaN(parsed.valor)) fatores.set(parsed.competencia, parsed.valor);
    }

    const contribs = [];
    for (const line of sim.historicalData.split('\n')) {
      const parsed = parseLinha(line);
      if (parsed && !isNaN(parsed.valor)) contribs.push(parsed);
    }

    if (fatores.size === 0 || contribs.length === 0) {
      setErrorMsg("Falha ao analisar valores. Verifique os dados inseridos.");
      setCalculatedRows([]);
      return;
    }

    const evaluationTable = [];
    let missing = 0;
    for (const item of contribs) {
      const fator = fatores.get(item.competencia);
      if (fator === undefined) {
        missing++;
      } else {
        evaluationTable.push({
          ...item,
          fator,
          updatedValue: item.valor * fator
        });
      }
    }

    if (missing > 0) {
      setErrorMsg(`Aviso: ${missing} competência(s) não encontrou(aram) fator de correção e foi(foram) ignorada(s).`);
    } else {
      setErrorMsg('');
    }
    setCalculatedRows(evaluationTable);
  }, [sim.historicalData, sim.needsUpdate]);

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider">
        Salários de Contribuição Históricos
      </h2>

      {/* INSS Toggle for Wizard Step 4 */}
      <div className="bg-gray-50/50 p-2 border border-gray-200 rounded-lg flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-700">Atualizar Valores Pelo Fator do INSS</span>
          <span className="text-[10px] text-gray-500">Aplica a correção automática cadastrada em "Cadastros"</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <div className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={!!sim.needsUpdate} 
              onChange={e => updateSim('needsUpdate', e.target.checked)} 
            />
            <div className="w-8 h-[18px] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#004b8d]"></div>
          </div>
        </label>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 text-amber-800 border border-amber-200 p-3 rounded-lg text-xs font-bold">
          {errorMsg}
        </div>
      )}

      <div className={`grid grid-cols-1 ${sim.needsUpdate ? 'lg:grid-cols-2' : ''} gap-6`}>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
            Cole a Ficha Mensal (Ex: 07/1994 2316,40)
          </label>
          <textarea
            rows={12}
            value={sim.historicalData || ''}
            onChange={e => updateSim('historicalData', e.target.value)}
            className="w-full p-3 font-mono text-xs sm:text-sm bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b8d] rounded-lg transition-all"
            placeholder="Mês/Ano Valor&#10;jan/2000 1500,00&#10;fev/2000 1550,00..."
          />
          <span className="text-[10px] text-gray-400 block pb-1 md:max-w-xs leading-relaxed">
             Estas informações farão parte da simulação de Proventos baseada na EC 103/2019.
          </span>
        </div>

        {sim.needsUpdate && calculatedRows.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
              Valores Atualizados Consolidados
            </label>
            <div className="border border-gray-200 rounded-lg h-[290px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700 bg-white">
                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="p-2">Competência</th>
                    <th className="p-2 text-right">Original</th>
                    <th className="p-2 text-right bg-emerald-50 text-emerald-800">Corrigido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calculatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2 font-mono">{row.competencia}</td>
                      <td className="p-2 text-right font-mono text-gray-500">
                        {row.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-semibold font-mono bg-emerald-50/25 text-emerald-700">
                        {row.updatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-emerald-50 text-emerald-700 p-2 text-[10px] font-bold text-center rounded-lg border border-emerald-100">
              {calculatedRows.length} competências atualizadas com sucesso
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepTempos({ sim, updateSim }: { sim: UnifiedSimulation, updateSim: any }) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>(() => {
    // Expand the first card initially to provide immediate feedback
    return { 0: true };
  });

  const addIncorporacao = () => {
    const nextIdx = sim.incorporacoes.length;
    updateSim('incorporacoes', [
      ...sim.incorporacoes,
      { 
        tipo: 'contribution-only', 
        years: 0, 
        months: 0, 
        days: 0, 
        valor: '', 
        needsUpdate: true, 
        status: 'efetivada', 
        useDates: false, 
        nome: '' 
      }
    ]);
    setExpandedIndices(prev => ({ ...prev, [nextIdx]: true }));
  };

  const removeIncorporacao = (index: number) => {
    updateSim('incorporacoes', sim.incorporacoes.filter((_, i) => i !== index));
    // Clean up expansion keys and shift larger indexes down
    setExpandedIndices(prev => {
      const clone = { ...prev };
      delete clone[index];
      const shifted: Record<number, boolean> = {};
      Object.keys(clone).forEach(k => {
        const ki = parseInt(k, 10);
        if (ki > index) {
          shifted[ki - 1] = clone[ki];
        } else {
          shifted[ki] = clone[ki];
        }
      });
      return shifted;
    });
  };

  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const updateIncorporacao = (index: number, field: string, value: any) => {
    const newInc = [...sim.incorporacoes];
    
    if (field === 'useDates') {
      newInc[index] = { ...newInc[index], useDates: value };
      if (value) {
        if (!newInc[index].dataInicio) newInc[index].dataInicio = '';
        if (!newInc[index].dataFim) newInc[index].dataFim = '';
      }
    } else {
      newInc[index] = { ...newInc[index], [field]: value };
    }
    
    // If pre-1994, force value to empty string
    if (field === 'tipo' && value === 'pre-1994') {
      newInc[index].valor = '';
    }
    
    // Convert all negative inputs to 0 for years, months, days
    if (['years', 'months', 'days'].includes(field)) {
      if (newInc[index][field] < 0) {
         newInc[index][field] = 0;
      }
    }

    // Auto-calculate years, months, days if using dates
    if (newInc[index].useDates) {
      const start = newInc[index].dataInicio;
      const end = newInc[index].dataFim;
      if (start && end) {
        const d1 = new Date(start + 'T12:00:00');
        const d2 = new Date(end + 'T12:00:00');
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
          const rpps = calcularTempoRPPS(d1, d2);
          newInc[index].years = rpps.years;
          newInc[index].months = rpps.months;
          newInc[index].days = rpps.days;
        } else {
          newInc[index].years = 0;
          newInc[index].months = 0;
          newInc[index].days = 0;
        }
      }
    }
    
    updateSim('incorporacoes', newInc);
  };

  const fatoresText = (sim.congelada && sim.fatoresCongeladosText !== undefined)
    ? sim.fatoresCongeladosText
    : getSavedFatoresINSS().fatoresText;
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

  const parseLinhaY = (linha: string) => {
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

  const fatores = new Map<string, number>();
  for (const line of fatoresText.split('\n')) {
    const parsed = parseLinhaY(line);
    if (parsed && !isNaN(parsed.valor)) fatores.set(parsed.competencia, parsed.valor);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
        Averbações de Tempo de Serviço e Incorporações
      </h2>

      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
            Incorporações Previstas ou Homologadas
          </h3>
          <button
            type="button"
            onClick={addIncorporacao}
            className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-3 py-1.5 bg-[#004b8d] text-white hover:bg-[#003a6d] rounded-lg transition-all"
          >
            <Plus size={12} /> Novo Período
          </button>
        </div>

        {sim.incorporacoes.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs">
            Nenhum período de incorporação de tempo externo foi declarado.
          </div>
        ) : (
          <div className="space-y-4">
            {sim.incorporacoes.map((row, idx) => {
              // No caso de serem informados dias, descartar as sobras de meses não fechados para compatibilizar a conversão de dias em meses e a quantidade de meses informados.
              const mEsperados = (row.years * 12) + row.months + Math.floor(row.days / 30);
              const lineStr = typeof row.valor === 'string' ? row.valor : '';
              const linesVal = lineStr.split('\n').filter(l => l.trim().length > 0);
              
              let isConsistent = false;
              let rangeTxt = '';

              if (row.useDates && row.dataInicio && row.dataFim) {
                const d1 = new Date(row.dataInicio + 'T12:00:00');
                const d2 = new Date(row.dataFim + 'T12:00:00');
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
                  const calendarMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
                  // If dates are used, we accept any number of pasted competencies between mEsperados and calendarMonths!
                  isConsistent = linesVal.length >= mEsperados && linesVal.length <= calendarMonths;
                  rangeTxt = mEsperados === calendarMonths 
                    ? `${mEsperados}` 
                    : `${mEsperados} a ${calendarMonths}`;
                } else {
                  isConsistent = linesVal.length === mEsperados;
                  rangeTxt = `${mEsperados}`;
                }
              } else {
                if (row.days > 0) {
                  isConsistent = linesVal.length === mEsperados || linesVal.length === (mEsperados + 1);
                  rangeTxt = `${mEsperados} ou ${mEsperados + 1}`;
                } else {
                  isConsistent = linesVal.length === mEsperados;
                  rangeTxt = `${mEsperados}`;
                }
              }

              const isExpanded = expandedIndices[idx] !== false; // default to expanded if not set, or we can use === true

              // Calculate leap-year-safe calendar range
              const hasValidDates = row.useDates && row.dataInicio && row.dataFim;
              let computedDays = 0;
              if (hasValidDates) {
                const d1 = new Date(row.dataInicio + 'T12:00:00');
                const d2 = new Date(row.dataFim + 'T12:00:00');
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
                  const rpps = calcularTempoRPPS(d1, d2);
                  computedDays = (rpps.years * 365) + (rpps.months * 30) + rpps.days;
                }
              }

              let originalSum = 0;
              let updatedSum = 0;
              const interpretedRows = linesVal.map(line => {
                const parsed = parseLinhaY(line);
                if (parsed && !isNaN(parsed.valor)) {
                  const f = fatores.get(parsed.competencia) ?? 1;
                  originalSum += parsed.valor;
                  updatedSum += parsed.valor * f;
                  return {
                    competencia: parsed.competencia,
                    original: parsed.valor,
                    fator: fatores.get(parsed.competencia) ?? null,
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
                  key={idx}
                  className={`bg-white border rounded-xl overflow-hidden transition-all flex flex-col ${
                    row.status === 'simular' 
                      ? 'border-dashed border-amber-400 bg-amber-50/10 shadow-xs' 
                      : 'border-gray-200 hover:shadow-xs'
                  }`}
                >
                  {/* CARD HEADER / TOGGLE */}
                  <div 
                    onClick={() => toggleExpand(idx)}
                    className="p-4 bg-gray-50/70 hover:bg-gray-100 flex justify-between items-center flex-wrap gap-3 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                      {/* Renaming Period Input */}
                      <input
                        type="text"
                        placeholder={`Período de Incorporação #${idx + 1}`}
                        value={row.nome || ''}
                        onChange={e => updateIncorporacao(idx, 'nome', e.target.value)}
                        className="bg-transparent border-b border-dashed border-gray-300 hover:border-[#004b8d] focus:border-[#004b8d] font-bold text-xs text-[#004b8d] uppercase tracking-wider focus:outline-none py-0.5 px-1 w-full max-w-[200px] sm:max-w-xs transition-colors shrink-0"
                        onClick={e => e.stopPropagation()}
                      />

                      {/* Badges */}
                      <div className="flex items-center gap-1">
                        {row.status === 'simular' ? (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider">
                            Simular
                          </span>
                        ) : (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider">
                            Efetivado
                          </span>
                        )}

                        <span className="text-[9px] bg-blue-50 text-blue-800 font-bold uppercase px-1.5 py-0.5 rounded-md tracking-normal max-w-[140px] truncate">
                          {row.tipo === 'contribution-only' && 'Tempo/Contrib (Pós-94)'}
                          {row.tipo === 'all-effects' && 'Todos Efeitos'}
                          {row.tipo === 'pre-1994' && 'Tempo Pré-1994'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-auto font-mono text-xs font-bold text-gray-600">
                      <span>
                        {row.useDates && row.dataInicio && row.dataFim ? (
                          <span className="text-xs text-gray-500 font-sans font-medium">
                            {row.dataInicio.split('-').reverse().join('/')} a {row.dataFim.split('-').reverse().join('/')}{' '}
                            <span className="text-gray-400 font-mono font-bold">({computedDays}d)</span>
                          </span>
                        ) : (
                          `${row.years || 0}a ${row.months || 0}m ${row.days || 0}d`
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeIncorporacao(idx);
                        }}
                        className="p-1 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md cursor-pointer transition-all border border-red-100 shrink-0"
                        title="Remover Período"
                      >
                        <Trash2 size={13} />
                      </button>

                      <ChevronDown 
                        size={15} 
                        className={`text-gray-400 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : 'rotate-0'}`} 
                      />
                    </div>
                  </div>

                  {/* CARD BODY */}
                  {isExpanded && (
                    <div className="p-5 border-t border-gray-100 flex flex-col gap-4">
                      {/* Configuration: Input Method */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Método de Lançamento</span>
                          <span className="text-[11px] text-gray-600">Escolha carregar o tempo digitando a duração diretamente ou informando as datas correspondentes.</span>
                        </div>
                        <div className="flex bg-white p-0.5 rounded-lg border border-gray-200 self-start sm:self-auto shadow-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => updateIncorporacao(idx, 'useDates', false)}
                            className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                              !row.useDates
                                ? 'bg-[#004b8d] text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Anos, Meses e Dias
                          </button>
                          <button
                            type="button"
                            onClick={() => updateIncorporacao(idx, 'useDates', true)}
                            className={`text-[11px] font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                              row.useDates
                                ? 'bg-[#004b8d] text-white shadow-xs'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Período de Datas
                          </button>
                        </div>
                      </div>

                      {row.useDates ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-4 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data de Entrada</label>
                            <input 
                              type="date"
                              value={row.dataInicio || ''}
                              onChange={(e) => updateIncorporacao(idx, 'dataInicio', e.target.value)}
                              className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                            />
                          </div>

                          <div className="md:col-span-4 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data de Saída</label>
                            <input 
                              type="date"
                              value={row.dataFim || ''}
                              onChange={(e) => updateIncorporacao(idx, 'dataFim', e.target.value)}
                              className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                            />
                          </div>

                          <div className="md:col-span-4 self-center pb-0.5">
                            {row.dataInicio && row.dataFim ? (
                              computedDays > 0 ? (
                                <div className="text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg p-2 font-medium flex flex-col">
                                  <span>Cálculo Automático (Bissextos Ok):</span>
                                  <strong className="font-mono text-xs mt-0.5">
                                    {computedDays} dias <span className="font-sans text-[10px] font-normal">({row.years}a {row.months}m {row.days}d)</span>
                                  </strong>
                                </div>
                              ) : (
                                <div className="text-[11px] bg-red-50 text-red-800 border border-red-200 rounded-lg p-2 font-medium">
                                  Data de saída deve ser posterior ou igual à de entrada!
                                </div>
                              )
                            ) : (
                              <div className="text-[11px] bg-gray-50 text-gray-600 border border-dashed border-gray-200 rounded-lg p-2 font-medium text-center">
                                Insira as datas para cálculo em dias automático.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-6 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Anos</label>
                            <input 
                              type="number"
                              min={0}
                              placeholder="0"
                              value={row.years === 0 ? '' : row.years}
                              onChange={(e) => updateIncorporacao(idx, 'years', parseInt(e.target.value) || 0)}
                              className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                            />
                          </div>

                          <div className="md:col-span-3 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Meses</label>
                            <input 
                              type="number"
                              min={0}
                              max={11}
                              placeholder="0"
                              value={row.months === 0 ? '' : row.months}
                              onChange={(e) => updateIncorporacao(idx, 'months', parseInt(e.target.value) || 0)}
                              className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                            />
                          </div>

                          <div className="md:col-span-3 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Dias</label>
                            <input 
                              type="number"
                              min={0}
                              placeholder="0"
                              value={row.days === 0 ? '' : row.days}
                              onChange={(e) => updateIncorporacao(idx, 'days', parseInt(e.target.value) || 0)}
                              className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                        {/* Tipo */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo Incorporação</label>
                          <select
                            value={row.tipo}
                            onChange={(e) => updateIncorporacao(idx, 'tipo', e.target.value)}
                            className="w-full p-2 bg-white border border-[#dee2e6] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#004b8d]"
                          >
                            <option value="contribution-only">Tempo e contribuição - Pós 07/1994</option>
                            <option value="all-effects">Para todos os efeitos</option>
                            <option value="pre-1994">Apenas tempo - Pré 07/1994</option>
                          </select>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Impacto Cenário</label>
                          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                            <button
                              type="button"
                              onClick={() => updateIncorporacao(idx, 'status', 'efetivada')}
                              className={`text-[10px] font-bold flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                                (row.status || 'efetivada') === 'efetivada'
                                  ? 'bg-[#004b8d] text-white shadow-xs'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              Efetivada
                            </button>
                            <button
                              type="button"
                              onClick={() => updateIncorporacao(idx, 'status', 'simular')}
                              className={`text-[10px] font-bold flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                                row.status === 'simular'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-gray-500 hover:text-gray-800'
                              }`}
                            >
                              Simular
                            </button>
                          </div>
                        </div>

                        {/* Factor checkbox */}
                        <div className="flex flex-col justify-end pb-0.5">
                          {row.tipo !== 'pre-1994' ? (
                            <label className="flex items-center justify-between gap-1.5 cursor-pointer p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100/50 transition-colors">
                              <span className="text-[10px] font-bold text-gray-600 uppercase">Atualizar valores (Fator)</span>
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={row.needsUpdate !== false} 
                                  onChange={e => updateIncorporacao(idx, 'needsUpdate', e.target.checked)} 
                                />
                                <div className="w-8 h-[18px] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3.5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#004b8d]"></div>
                              </div>
                            </label>
                          ) : (
                            <div className="text-[10px] text-gray-400 font-bold uppercase p-2 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50/10">
                              Não aplicável ao tempo Pré-94
                            </div>
                          )}
                        </div>
                      </div>

                      {row.tipo !== 'pre-1994' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-2 pt-4 border-t border-gray-100">
                          <div className="lg:col-span-7 flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                              Cole a Ficha Mensal (Ex: 01/2005 1500,00)
                            </label>
                            <textarea
                              rows={6}
                              value={lineStr}
                              onChange={(e) => updateIncorporacao(idx, 'valor', e.target.value)}
                              placeholder="Comp. Valor&#10;jan/2005 1.500,00&#10;fev/2005 1.550,00"
                              className="w-full p-3 font-mono text-xs bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004b8d] rounded-lg transition-all"
                            />
                            <span className="text-[9px] text-gray-400">
                              Cole as competências pertencentes a este período de incorporação (uma por linha).
                            </span>

                            {linesVal.length > 0 && (
                              <>
                                {isConsistent ? (
                                  <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center gap-1.5 font-sans">
                                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                                    <span>Consistência confirmada: {linesVal.length} {linesVal.length === 1 ? 'competência colada' : 'competências coladas'} para o período de tempo calculado ({rangeTxt} {rangeTxt === '1' ? 'esperada' : 'esperadas'}).</span>
                                  </div>
                                ) : (
                                  <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-1.5 font-sans">
                                    <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" /> 
                                    <div>
                                      Inconsistência identificada: O período selecionado equivale a <strong>{rangeTxt} {rangeTxt === '1' ? 'competência' : 'competências'}</strong>, mas você inseriu <strong>{linesVal.length}</strong>. Por favor, verifique para que coincidam ou ajuste o tempo.
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {mEsperados > 0 && linesVal.length === 0 && (
                              <div className="text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-2.5 font-sans">
                                Aguardando colagem: {rangeTxt === '1' ? 'É esperada exatamente' : 'São esperadas de'} <strong>{rangeTxt} {rangeTxt === '1' ? 'competência' : 'competências'}</strong> coladas acima.
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
                                        {row.needsUpdate !== false && <th className="py-0.5 px-1 text-right text-emerald-700 animate-pulse">Corr.</th>}
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
                      ) : (
                        <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 text-center text-xs text-gray-500 mt-2">
                          Os períodos de incorporação anteriores a 07/1994 são considerados apenas como tempo de contribuição e não integram as médias de proventos.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-6 border-t border-gray-100">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-4">
          Afastamentos e Extensão Profissional
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Dias de Afastamento (Sem Contribuição)</label>
            <input
              type="number"
              value={sim.diasAfastamento ?? 0}
              onChange={e => updateSim('diasAfastamento', parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Extensão (Deseja trabalhar mais quantos meses?)</label>
            <input
              type="number"
              value={sim.extensionMonths ?? 0}
              onChange={e => updateSim('extensionMonths', parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#004b8d] transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepGerar({ sim }: { sim: UnifiedSimulation }) {
  const [opts, setOpts] = useState({ regras: true, proventos: true, ge: true });
  const [showReport, setShowReport] = useState(false);

  // --- Helpers ---
  const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const diffEmDias = (d1: Date, d2: Date) => Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  const calcularIdade = (dataNasc: Date, dataRef: Date): number => {
    let age = dataRef.getFullYear() - dataNasc.getFullYear();
    const m = dataRef.getMonth() - dataNasc.getMonth();
    if (m < 0 || (m === 0 && dataRef.getDate() < dataNasc.getDate())) {
      age--;
    }
    return age;
  };
  const formatarData = (d: Date | undefined) => d ? d.toLocaleDateString('pt-BR') : 'N/A';
  const calcularIdadeCompleta = (dataNasc: string | undefined, dataRef: Date | undefined) => {
    if (!dataNasc || !dataRef) return 'N/A';
    const nasc = new Date(dataNasc + 'T00:00:00');
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
  };
  const formatarTempo = (totalDias: number) => {
    const y = Math.floor(totalDias / 365);
    const rem = totalDias % 365;
    const m = Math.floor(rem / 30);
    const d = rem % 30;
    const yStr = y === 1 ? '1 ano' : `${y} anos`;
    const mStr = m === 1 ? '1 mês' : `${m} meses`;
    const dStr = d === 1 ? '1 dia' : `${d} dias`;
    return `${yStr}, ${mStr} e ${dStr} (${totalDias.toLocaleString('pt-BR')} dias)`;
  };

  // --- GE (Estático do Servidor) ---
  const getRetirementDate = (sim: any) => {
    if (!sim.ingressoCmc || !sim.ingressoCargoAtual || !sim.dataNascimento) {
      return new Date();
    }
    const calculatedDiasINSS = (sim.incorporacoes || []).reduce((acc: number, inc: any) => {
      if (inc.tipo === 'contribution-only' || inc.tipo === 'pre-1994') {
        if (inc.useDates && inc.dataInicio && inc.dataFim) {
          const d1 = new Date(inc.dataInicio + 'T12:00:00');
          const d2 = new Date(inc.dataFim + 'T12:00:00');
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
            const rpps = calcularTempoRPPS(d1, d2);
            return acc + (rpps.years * 365) + (rpps.months * 30) + rpps.days;
          }
        }
        return acc + (inc.years * 365) + (inc.months * 30) + inc.days;
      }
      return acc;
    }, 0);

    const calculatedDiasSP = (sim.incorporacoes || []).reduce((acc: number, inc: any) => {
      if (inc.tipo === 'all-effects') {
        if (inc.useDates && inc.dataInicio && inc.dataFim) {
          const d1 = new Date(inc.dataInicio + 'T12:00:00');
          const d2 = new Date(inc.dataFim + 'T12:00:00');
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
            const rpps = calcularTempoRPPS(d1, d2);
            return acc + (rpps.years * 365) + (rpps.months * 30) + rpps.days;
          }
        }
        return acc + (inc.years * 365) + (inc.months * 30) + inc.days;
      }
      return acc;
    }, 0);

    const REGRAS_DEF = [
      { nome: "Regra Geral (Art. 6º)", checker: (s: any, p: any, id: number) => id >= (s.sexo === 'M' ? 65 : 62) && p.contrib >= 25 * 360 && p.sp >= 10 * 360 && p.cargo >= 5 * 360 },
      { nome: "Pedágio 100% (Art. 11)", checker: (s: any, p: any, id: number) => {
        if (s.dataIngressoSP > new Date(2022, 0, 1)) return false;
        const minC = (s.sexo === 'M' ? 35 : 30) * 360;
        const pedagio = Math.max(0, minC - s.tempoEm2022);
        return id >= (s.sexo === 'M' ? 60 : 57) && p.contrib >= (minC + pedagio) && p.sp >= 20 * 360 && p.cargo >= 5 * 360;
      }},
      { nome: "Regra de Pontos (Art. 10)", checker: (s: any, p: any, id: number) => {
        if (s.dataIngressoSP > new Date(2021, 11, 31)) return false;
        const minId = s.dataIngressoSP <= new Date(2003, 11, 31) ? (s.sexo === 'M' ? 65 : 62) : (s.sexo === 'M' ? 62 : 57);
        const minC = (s.sexo === 'M' ? 35 : 30) * 360;
        const ptsBase = s.sexo === 'M' ? 98 : 88;
        const ptsExig = Math.min(s.sexo === 'M' ? 105 : 100, ptsBase + Math.max(0, p.data.getFullYear() - 2022));
        const ptsAtuais = (diffEmDias(s.dataNasc, p.data) / 365.25) + (p.contrib / 360);
        return id >= minId && p.contrib >= minC && p.sp >= 20 * 360 && p.cargo >= 5 * 360 && ptsAtuais >= ptsExig;
      }}
    ];

    const s = {
      dataNasc: new Date(sim.dataNascimento + 'T00:00:00'),
      sexo: sim.sexo,
      dataIngressoSP: new Date(sim.ingressoCmc + 'T00:00:00'),
      dataIngressoCargo: new Date(sim.ingressoCargoAtual + 'T00:00:00'),
      averbRgps: calculatedDiasINSS, averbSp: calculatedDiasSP, afastamentos: sim.diasAfastamento || 0
    };
    const inicioProjecao = new Date(Math.max(s.dataIngressoSP.getTime(), s.dataIngressoCargo.getTime(), new Date(2022, 0, 1).getTime()));
    const tempoEm2022 = diffEmDias(s.dataIngressoSP, new Date(2022, 0, 1)) + s.averbRgps + s.averbSp - s.afastamentos;
    const serverObj = { ...s, inicioProjecao, tempoEm2022 };
    
    const regrasResults = REGRAS_DEF.map((regra: any) => {
      const proj = { data: new Date(inicioProjecao), contrib: diffEmDias(serverObj.dataIngressoSP, inicioProjecao) + serverObj.averbRgps + serverObj.averbSp - serverObj.afastamentos, sp: diffEmDias(serverObj.dataIngressoSP, inicioProjecao) + serverObj.averbSp - serverObj.afastamentos, cargo: diffEmDias(serverObj.dataIngressoCargo, inicioProjecao) - serverObj.afastamentos };
      for (let i = 0; i < 18250; i++) {
        if (i > 0) { proj.data.setDate(proj.data.getDate() + 1); proj.contrib++; proj.sp++; if (proj.data >= serverObj.dataIngressoCargo) proj.cargo++; }
        const idade = calcularIdade(serverObj.dataNasc, proj.data);
        if (idade >= 75) return { nome: regra.nome, aplicavel: false };
        if (regra.checker(serverObj, proj, idade)) return { nome: regra.nome, aplicavel: true, data: new Date(proj.data) };
      }
      return { nome: regra.nome, aplicavel: false };
    });

    const aplicaveis = regrasResults.filter(r => r.aplicavel);
    let activeRule = null;
    if (aplicaveis.length > 0) {
      activeRule = aplicaveis.sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))[0];
    }
    const endDate = (activeRule && activeRule.data) ? new Date(activeRule.data) : new Date();
    if (sim.extensionMonths && sim.extensionMonths > 0) {
      endDate.setMonth(endDate.getMonth() + sim.extensionMonths);
    }
    return endDate;
  };

  const geResults = React.useMemo(() => {
    const databaseFGs = getSavedFGValues();
    const careers = getSavedCareerData();
    const baseSalary = careers[sim.selectedCareer]?.[sim.selectedLevel] || 0;

    let isEligible = true;
    if (sim.ingressoCmc) {
      const entryDate = new Date(sim.ingressoCmc + 'T00:00:00');
      const limitDate = new Date('2003-12-31T00:00:00');
      if (entryDate > limitDate) {
        isEligible = false;
      }
    }

    const diffM = (sStr: string, eStr: string) => {
      if (!sStr) return 0;
      const d1 = new Date(sStr + 'T12:00:00'); 
      const retirementDate = getRetirementDate(sim);
      let d2 = eStr ? new Date(eStr + 'T12:00:00') : retirementDate;
      if (isNaN(d2.getTime())) d2 = retirementDate;
      if (d2 > retirementDate) d2 = retirementDate;
      
      let m = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
      if (d2.getDate() < d1.getDate()) m--;
      return Math.max(0, m);
    };
    const fgs = sim.fgRows.map(row => {
      const meses = isEligible ? diffM(row.start, row.end) : 0;
      const valRef = databaseFGs[row.nivel as keyof typeof databaseFGs] || 0;
      return { ...row, meses, valRef, inc: isEligible ? (valRef * meses) / 240 : 0 };
    });
    const stims = sim.stimulusRows.map(row => {
      const meses = isEligible ? diffM(row.start, row.end) : 0;
      const perc = stimulusPercentages[row.tipo as keyof typeof stimulusPercentages] || 0;
      const inc = isEligible ? (baseSalary * perc * meses) / 240 : 0;
      return { ...row, meses, perc, inc };
    });
    return { 
      baseSalary, 
      fgs, 
      stims, 
      totalFGs: isEligible ? fgs.reduce((a, b) => a + b.inc, 0) : 0, 
      totalStims: isEligible ? stims.reduce((a, b) => a + b.inc, 0) : 0,
      isEligible
    };
  }, [sim]);

  // --- FUNÇÃO CENTRALIZADA DE CÁLCULO DE CENÁRIO ---
  const calcularResultadosParaCenario = React.useCallback((activeIncs: typeof sim.incorporacoes) => {
    const calculatedDiasINSS = activeIncs.reduce((acc, inc) => {
      if (inc.tipo === 'contribution-only' || inc.tipo === 'pre-1994') {
        if (inc.useDates && inc.dataInicio && inc.dataFim) {
          const d1 = new Date(inc.dataInicio + 'T12:00:00');
          const d2 = new Date(inc.dataFim + 'T12:00:00');
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
            const rpps = calcularTempoRPPS(d1, d2);
            return acc + (rpps.years * 365) + (rpps.months * 30) + rpps.days;
          }
        }
        return acc + (inc.years * 365) + (inc.months * 30) + inc.days;
      }
      return acc;
    }, 0);

    const calculatedDiasSP = activeIncs.reduce((acc, inc) => {
      if (inc.tipo === 'all-effects') {
        if (inc.useDates && inc.dataInicio && inc.dataFim) {
          const d1 = new Date(inc.dataInicio + 'T12:00:00');
          const d2 = new Date(inc.dataFim + 'T12:00:00');
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
            const rpps = calcularTempoRPPS(d1, d2);
            return acc + (rpps.years * 365) + (rpps.months * 30) + rpps.days;
          }
        }
        return acc + (inc.years * 365) + (inc.months * 30) + inc.days;
      }
      return acc;
    }, 0);

    // --- REGRAS DO CENÁRIO ---
    const REGRAS_DEF = [
      { nome: "Regra Geral (Art. 6º)", proventos: () => "Média", checker: (s: any, p: any, id: number) => id >= (s.sexo === 'M' ? 65 : 62) && p.contrib >= 25 * 360 && p.sp >= 10 * 360 && p.cargo >= 5 * 360 },
      { nome: "Pedágio 100% (Art. 11)", proventos: (s: any) => s.dataIngressoSP <= new Date(2003, 11, 31) ? "Integralidade" : "Média", checker: (s: any, p: any, id: number) => {
        if (s.dataIngressoSP > new Date(2022, 0, 1)) return false;
        const minC = (s.sexo === 'M' ? 35 : 30) * 360;
        const pedagio = Math.max(0, minC - s.tempoEm2022);
        return id >= (s.sexo === 'M' ? 60 : 57) && p.contrib >= (minC + pedagio) && p.sp >= 20 * 360 && p.cargo >= 5 * 360;
      }},
      { nome: "Regra de Pontos (Art. 10)", proventos: (s: any) => s.dataIngressoSP <= new Date(2003, 11, 31) ? "Integralidade (Inciso I)" : "Média (Inciso II)", checker: (s: any, p: any, id: number) => {
        if (s.dataIngressoSP > new Date(2021, 11, 31)) return false;
        const minId = s.dataIngressoSP <= new Date(2003, 11, 31) ? (s.sexo === 'M' ? 65 : 62) : (s.sexo === 'M' ? 62 : 57);
        const minC = (s.sexo === 'M' ? 35 : 30) * 360;
        const ptsBase = s.sexo === 'M' ? 98 : 88;
        const ptsExig = Math.min(s.sexo === 'M' ? 105 : 100, ptsBase + Math.max(0, p.data.getFullYear() - 2022));
        const ptsAtuais = (diffEmDias(s.dataNasc, p.data) / 365.25) + (p.contrib / 360);
        return id >= minId && p.contrib >= minC && p.sp >= 20 * 360 && p.cargo >= 5 * 360 && ptsAtuais >= ptsExig;
      }}
    ];

    let regrasResults: any[] = [];
    if (sim.ingressoCmc && sim.ingressoCargoAtual && sim.dataNascimento) {
      const s = {
        dataNasc: new Date(sim.dataNascimento + 'T00:00:00'),
        sexo: sim.sexo,
        dataIngressoSP: new Date(sim.ingressoCmc + 'T00:00:00'),
        dataIngressoCargo: new Date(sim.ingressoCargoAtual + 'T00:00:00'),
        averbRgps: calculatedDiasINSS, averbSp: calculatedDiasSP, afastamentos: sim.diasAfastamento || 0
      };
      const inicioProjecao = new Date(Math.max(s.dataIngressoSP.getTime(), s.dataIngressoCargo.getTime(), new Date(2022, 0, 1).getTime()));
      const tempoEm2022 = diffEmDias(s.dataIngressoSP, new Date(2022, 0, 1)) + s.averbRgps + s.averbSp - s.afastamentos;
      const serverObj = { ...s, inicioProjecao, tempoEm2022 };
      
      regrasResults = REGRAS_DEF.map((regra: any) => {
        const proj = { data: new Date(inicioProjecao), contrib: diffEmDias(serverObj.dataIngressoSP, inicioProjecao) + serverObj.averbRgps + serverObj.averbSp - serverObj.afastamentos, sp: diffEmDias(serverObj.dataIngressoSP, inicioProjecao) + serverObj.averbSp - serverObj.afastamentos, cargo: diffEmDias(serverObj.dataIngressoCargo, inicioProjecao) - serverObj.afastamentos };
        for (let i = 0; i < 18250; i++) {
          if (i > 0) { proj.data.setDate(proj.data.getDate() + 1); proj.contrib++; proj.sp++; if (proj.data >= serverObj.dataIngressoCargo) proj.cargo++; }
          const idade = calcularIdade(serverObj.dataNasc, proj.data);
          if (idade >= 75) return { nome: regra.nome, aplicavel: false, motivo: "Atingiu IDADE COMPULSÓRIA (75 anos)." };
          if (regra.checker(serverObj, proj, idade)) return { nome: regra.nome, aplicavel: true, data: new Date(proj.data), proventos: regra.proventos(serverObj), detalhes: { idade, contrib: proj.contrib, sp: proj.sp, cargo: proj.cargo, pontos: (diffEmDias(serverObj.dataNasc, proj.data) / 365.25) + (proj.contrib / 360) }};
        }
        return { nome: regra.nome, aplicavel: false, motivo: "Requisitos não atingidos em 50 anos." };
      });

      const aplicaveis = regrasResults.filter(r => r.aplicavel);
      if (aplicaveis.length > 0) {
        let topRule = aplicaveis.filter(r => r.proventos?.includes("Integral")).sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))[0];
        if (!topRule) topRule = aplicaveis.sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0))[0];
        regrasResults = regrasResults.map(r => r.nome === topRule.nome ? { ...r, isVantajosa: true } : r);
      }
    }

    // --- PROVENTOS DO CENÁRIO ---
    let perc = 0.60;
    let yearsTotal = 0;
    
    if (sim.ingressoCmc) {
      const activeRule = regrasResults.find((r: any) => r.isVantajosa);
      const endDate = (activeRule && activeRule.aplicavel && activeRule.data) ? new Date(activeRule.data) : new Date();
      
      const adm = new Date(sim.ingressoCmc + 'T00:00:00');
      const timeInDays = (endDate.getTime() - adm.getTime()) / (1000 * 60 * 60 * 24);
      
      const totalDays = timeInDays + calculatedDiasINSS + calculatedDiasSP;
      yearsTotal = totalDays / 365.25 + (sim.extensionMonths || 0) / 12;
      
      // Regra progressiva IPMC: 60% aos 20 anos + 2% ao ano para ambos os sexos (município de Curitiba - LC 133/2021)
      const baseExcedente = 20;
      perc = 0.60 + (yearsTotal > baseExcedente ? (Math.floor(yearsTotal) - baseExcedente) * 0.02 : 0);
      perc = Math.min(Math.max(perc, 0.60), 1.0);
    }

    const fatoresText = (sim.congelada && sim.fatoresCongeladosText !== undefined)
      ? sim.fatoresCongeladosText
      : getSavedFatoresINSS().fatoresText;
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
    const isPre07_1994 = (comp: string): boolean => {
      const pts = comp.split('/');
      if (pts.length === 2) {
        const m = parseInt(pts[0], 10);
        const y = parseInt(pts[1], 10);
        if (!isNaN(m) && !isNaN(y)) {
          return y < 1994 || (y === 1994 && m < 7);
        }
      }
      return false;
    };
    const getCompIndex = (comp: string): number => {
      const pts = comp.split('/');
      if (pts.length === 2) {
        const m = parseInt(pts[0], 10);
        const y = parseInt(pts[1], 10);
        if (!isNaN(m) && !isNaN(y)) {
          return y * 12 + m;
        }
      }
      return 0;
    };
    const parseLinhaX = (linha: string) => {
      const limpa = linha.trim();
      if (!limpa) return null;

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

    const fatores = new Map<string, number>();
    for (const line of fatoresText.split('\n')) {
      const parsed = parseLinhaX(line);
      if (parsed && !isNaN(parsed.valor)) fatores.set(parsed.competencia, parsed.valor);
    }

    const lines = (sim.historicalData || '').split('\n').filter(l => l.trim().length > 0);
    
    const parsedHistorical = lines.map((l, hIdx) => {
      const parsed = parseLinhaX(l);
      if (parsed && !isNaN(parsed.valor)) {
        let correctedVal = parsed.valor;
        if (sim.needsUpdate) {
          const fator = fatores.get(parsed.competencia);
          if (fator !== undefined) {
            correctedVal = parsed.valor * fator;
          }
        }
        return {
          competencia: parsed.competencia,
          originalValue: parsed.valor,
          value: correctedVal,
          isPre94: isPre07_1994(parsed.competencia),
          rowIdx: hIdx + 1
        };
      } else {
        const parts = l.trim().split(/\s+/);
        const valStr = parts.length > 1 ? parts[parts.length - 1] : parts[0];
        const rawVal = (parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0);
        
        let comp = "MM/AAAA";
        const dateComDiaRegex = /\b(\d{1,2})[\/\-](\d{1,2}|[a-zA-Z]{3,9})[\/\-](\d{2}|\d{4})\b/;
        const dateSemDiaRegex = /\b(\d{1,2}|[a-zA-Z]{3,9})[\/\-](\d{2}|\d{4})\b/;
        const dateYearMonthRegex = /\b(\d{4})[\/\-](\d{1,2})\b/;

        let mComDia = l.match(dateComDiaRegex);
        let mSemDia = l.match(dateSemDiaRegex);
        let mYearMonth = l.match(dateYearMonthRegex);

        if (mComDia) {
          comp = normalizarData(mComDia[2], mComDia[3]);
        } else if (mSemDia) {
          comp = normalizarData(mSemDia[1], mSemDia[2]);
        } else if (mYearMonth) {
          comp = normalizarData(mYearMonth[2], mYearMonth[1]);
        }

        return {
          competencia: comp,
          originalValue: rawVal,
          value: rawVal,
          isPre94: isPre07_1994(comp),
          rowIdx: hIdx + 1
        };
      }
    });

    const post94_Hist = parsedHistorical.filter(p => !p.isPre94);

    let totalHistValue = 0;
    let missingFactorsMsg = '';
    
    if (post94_Hist.length > 0) {
      if (sim.needsUpdate) {
        let missing = 0;
        totalHistValue = post94_Hist.reduce((acc, item) => {
          const fator = fatores.get(item.competencia);
          if (fator !== undefined) {
            return acc + item.value;
          }
          missing++;
          return acc + item.originalValue;
        }, 0);
        
        if (missing > 0) {
          missingFactorsMsg = `\n   *Aviso: ${missing} competência(s) sem fator de correção no histórico (valor original mantido).`;
        }
      } else {
        totalHistValue = post94_Hist.reduce((acc, item) => acc + item.originalValue, 0);
      }
    }
    
    const histAvg = post94_Hist.length > 0 ? (totalHistValue / post94_Hist.length) : geResults.baseSalary;
    
    let totalIncVal = 0; 
    let totalIncM = 0;
    let pre94M = 0;
    let incMissingFactors = 0;
    const candidateMonths: {
      competencia: string;
      originalValue: number;
      value: number;
      type: string;
      rowId: string;
      rowIdx: number;
    }[] = [];

    post94_Hist.forEach((item) => {
      candidateMonths.push({
        competencia: item.competencia,
        originalValue: item.originalValue,
        value: item.value,
        type: 'chamber-historical',
        rowId: 'chamber-hist',
        rowIdx: item.rowIdx
      });
    });

    // --- Projeção de Períodos Futuros ---
    const projFutureMonths: {
      competencia: string;
      originalValue: number;
      value: number;
      type: string;
      isPre94: boolean;
      isExcluded: boolean;
    }[] = [];

    const activeRule = regrasResults.find((r: any) => r.isVantajosa);
    let projectedMonthsCount = 0;
    let projStartComp = '';
    let projEndComp = '';
    const projSalary = geResults ? geResults.baseSalary : 0;

    const careers = getSavedCareerData();
    const levelNames = [
      'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX', 'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI'
    ];
    const initialBandIdx = levelNames.indexOf(sim.selectedLevel || 'I');

    // Helper calculate component salary values for each projected month
    const calculateFullProjectedValue = (base: number, projDate: Date) => {
      // 1. Technical Responsibility (30%)
      const techVal = base * 0.30;

      // 2. ATS (Adicional por Tempo de Serviço)
      const yearInt = projDate.getFullYear();
      const monthInt = projDate.getMonth() + 1;
      const targetDate = new Date(yearInt, monthInt - 1, 1);
      
      let initialAtsNum = sim.lastAtsNumber ?? 0;
      let atsPercent = 0;
      let baseDateStr = sim.lastAtsConcession || sim.ingressoCmc || '';
      
      if (baseDateStr) {
        const baseDate = new Date(baseDateStr + 'T00:00:00');
        if (!isNaN(baseDate.getTime())) {
          let diffYears = targetDate.getFullYear() - baseDate.getFullYear();
          let diffMonths = targetDate.getMonth() - baseDate.getMonth();
          let totalMonths = diffYears * 12 + diffMonths;
          let additionalAts = Math.floor(totalMonths / 60);
          if (additionalAts < 0) additionalAts = 0;
          const finalAts = Math.min(10, initialAtsNum + additionalAts);
          atsPercent = ATS_PERCENTAGES[finalAts] ?? 0;
        } else {
          atsPercent = ATS_PERCENTAGES[initialAtsNum] ?? 0;
        }
      } else {
        atsPercent = ATS_PERCENTAGES[initialAtsNum] ?? 0;
      }
      const atsVal = base * atsPercent;

      // 3. Academic Stimulus
      let activeGrad = 0;
      let activeNonGrad = 0;
      
      sim.stimulusRows.forEach(row => {
        if (row.start && row.tipo) {
          const startParts = row.start.split('-');
          if (startParts.length >= 2) {
            const sY = parseInt(startParts[0], 10);
            const sM = parseInt(startParts[1], 10);
            const hasStarted = (yearInt > sY) || (yearInt === sY && monthInt >= sM);
            if (hasStarted) {
              if (row.tipo === 'graduacao') {
                activeGrad = 0.30;
              } else {
                const perc = stimulusPercentages[row.tipo as keyof typeof stimulusPercentages] || 0;
                if (perc > activeNonGrad) {
                  activeNonGrad = perc;
                }
              }
            }
          }
        }
      });
      const stimVal = base * (activeGrad + activeNonGrad);

      // 4. FG / Function / Special Career Gratifications
      let funcVal = 0;
      const databaseFGs = getSavedFGValues();
      sim.fgRows.forEach(row => {
        if (row.start && row.nivel) {
          const startParts = row.start.split('-');
          if (startParts.length >= 2) {
            const sY = parseInt(startParts[0], 10);
            const sM = parseInt(startParts[1], 10);
            
            const isAfterStart = (yearInt > sY) || (yearInt === sY && monthInt >= sM);
            
            let isBeforeEnd = true;
            if (row.end && row.end.trim() !== '') {
              const endParts = row.end.split('-');
              if (endParts.length >= 2) {
                const eY = parseInt(endParts[0], 10);
                const eM = parseInt(endParts[1], 10);
                isBeforeEnd = (yearInt < eY) || (yearInt === eY && monthInt <= eM);
              }
            }
            
            if (isAfterStart && isBeforeEnd) {
              const val = databaseFGs[row.nivel as keyof typeof databaseFGs] || 0;
              if (val > funcVal) {
                funcVal = val;
              }
            }
          }
        }
      });
      const carrGrat = (sim.selectedCareer === 'procurador_juridico') ? base * 0.60 : (sim.selectedCareer === 'contador' ? base * 0.75 : 0);
      const chosenGrat = Math.max(funcVal, carrGrat);

      const rawVal = base + techVal + atsVal + stimVal + chosenGrat;
      return rawVal;
    };

    if (activeRule && activeRule.aplicavel && activeRule.data) {
      let maxHistDate = new Date();
      if (post94_Hist.length > 0) {
        let maxCompInt = 0;
        post94_Hist.forEach(item => {
          const compInt = getCompIndex(item.competencia);
          if (compInt > maxCompInt) {
            maxCompInt = compInt;
            const [m, y] = item.competencia.split('/').map(Number);
            maxHistDate = new Date(y, m - 1, 1);
          }
        });
      } else if (sim.ingressoCmc) {
        maxHistDate = new Date(sim.ingressoCmc + 'T00:00:00');
      }
      
      const targetEndDate = new Date(activeRule.data);
      if (sim.extensionMonths && sim.extensionMonths > 0) {
        targetEndDate.setMonth(targetEndDate.getMonth() + sim.extensionMonths);
      }
      
      let currentProjDate = new Date(maxHistDate);
      currentProjDate.setMonth(currentProjDate.getMonth() + 1);
      
      let currentBandIdx = initialBandIdx;
      let safetyCounter = 0;
      while (currentProjDate <= targetEndDate && safetyCounter < 500) {
        safetyCounter++;
        if (currentProjDate.getMonth() === 9 && currentBandIdx < 35) {
          currentBandIdx++;
        }
        const m = String(currentProjDate.getMonth() + 1).padStart(2, '0');
        const y = currentProjDate.getFullYear();
        const comp = `${m}/${y}`;
        
        if (projectedMonthsCount === 0) projStartComp = comp;
        projEndComp = comp;
        
        const currentLevelName = levelNames[currentBandIdx] || 'I';
        const dynamicBaseSalary = careers[sim.selectedCareer]?.[currentLevelName] || 0;
        
        const fullFutureVal = calculateFullProjectedValue(dynamicBaseSalary, currentProjDate);
        projFutureMonths.push({
          competencia: comp,
          originalValue: fullFutureVal,
          value: fullFutureVal,
          type: 'projected-future',
          isPre94: false,
          isExcluded: false
        });
        projectedMonthsCount++;
        currentProjDate.setMonth(currentProjDate.getMonth() + 1);
      }
    } else if (sim.extensionMonths && sim.extensionMonths > 0) {
      let maxHistDate = new Date();
      if (post94_Hist.length > 0) {
        let maxCompInt = 0;
        post94_Hist.forEach(item => {
          const compInt = getCompIndex(item.competencia);
          if (compInt > maxCompInt) {
            maxCompInt = compInt;
            const [m, y] = item.competencia.split('/').map(Number);
            maxHistDate = new Date(y, m - 1, 1);
          }
        });
      } else if (sim.ingressoCmc) {
        maxHistDate = new Date(sim.ingressoCmc + 'T00:00:00');
      }
      
      const targetEndDate = new Date(maxHistDate);
      targetEndDate.setMonth(targetEndDate.getMonth() + sim.extensionMonths);
      
      let currentProjDate = new Date(maxHistDate);
      currentProjDate.setMonth(currentProjDate.getMonth() + 1);
      
      let currentBandIdx = initialBandIdx;
      let safetyCounter = 0;
      while (currentProjDate <= targetEndDate && safetyCounter < 500) {
        safetyCounter++;
        if (currentProjDate.getMonth() === 9 && currentBandIdx < 35) {
          currentBandIdx++;
        }
        const m = String(currentProjDate.getMonth() + 1).padStart(2, '0');
        const y = currentProjDate.getFullYear();
        const comp = `${m}/${y}`;
        
        if (projectedMonthsCount === 0) projStartComp = comp;
        projEndComp = comp;
        
        const currentLevelName = levelNames[currentBandIdx] || 'I';
        const dynamicBaseSalary = careers[sim.selectedCareer]?.[currentLevelName] || 0;
        
        const fullFutureVal = calculateFullProjectedValue(dynamicBaseSalary, currentProjDate);
        projFutureMonths.push({
          competencia: comp,
          originalValue: fullFutureVal,
          value: fullFutureVal,
          type: 'projected-future',
          isPre94: false,
          isExcluded: false
        });
        projectedMonthsCount++;
        currentProjDate.setMonth(currentProjDate.getMonth() + 1);
      }
    }

    projFutureMonths.forEach((item, fIdx) => {
      const caps = getSavedSalaryCaps();
      const cap = (sim.selectedCareer === 'procurador_juridico' ? caps.procurador : caps.general);
      const cappedVal = Math.min(item.originalValue, cap);

      candidateMonths.push({
        competencia: item.competencia,
        originalValue: item.originalValue,
        value: cappedVal,
        type: item.type,
        rowId: 'proj-fut',
        rowIdx: 1000 + fIdx
      });
    });

    activeIncs.forEach((i, rIdx) => {
      const m = (i.years * 12) + i.months + Math.floor(i.days / 30);
      
      if (i.tipo !== 'pre-1994') { 
        const lineStr = typeof i.valor === 'string' ? i.valor : '';
        const incLines = lineStr.split('\n').filter(l => l.trim().length > 0);
        
        // Se houverem competências coladas, usar a quantidade de competências real para o número de meses, senão usar o tempo calculado "m"
        const effectiveMonths = incLines.length > 0 ? incLines.length : m;
        totalIncM += effectiveMonths;
        
        let incSum = 0;
        
        incLines.forEach(l => {
          const parsed = parseLinhaX(l);
          if (parsed && !isNaN(parsed.valor)) {
            let correctedVal = parsed.valor;
            if (i.needsUpdate !== false) {
              const f = fatores.get(parsed.competencia);
              if (f !== undefined) {
                correctedVal = (parsed.valor * f);
              } else {
                incMissingFactors++;
              }
            }
            incSum += correctedVal;

            candidateMonths.push({
              competencia: parsed.competencia,
              originalValue: parsed.valor,
              value: correctedVal,
              type: i.tipo,
              rowId: String(rIdx),
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
              type: i.tipo,
              rowId: String(rIdx),
              rowIdx: rIdx + 1
            });
          }
        });
        
        totalIncVal += incSum;
      } else {
        pre94M += m;
      }
    });

    const incAvg = totalIncM > 0 ? totalIncVal / totalIncM : 0;
    
    const totalMeses = candidateMonths.length;
    const totalSum = candidateMonths.reduce((sum, item) => sum + item.value, 0);
    const mediaSalarialGeral = totalMeses > 0 ? totalSum / totalMeses : histAvg;
    
    const geTotal = geResults.totalFGs + geResults.totalStims;
    const beneficioTotalSemGE = mediaSalarialGeral * perc;

    // --- Otimização § 10 LC 133/2021 ---
    const limitExclusion = Math.floor(candidateMonths.length * 0.2);
    const sortedCandidates = [...candidateMonths].sort((a, b) => a.value - b.value);

    let bestK = 0;
    let bAverage = mediaSalarialGeral;
    let bPerc = perc;
    let bBenefit = beneficioTotalSemGE;
    let bExcluded: typeof candidateMonths = [];

    const optimizationHistory: any[] = [{
      k: 0,
      average: mediaSalarialGeral,
      perc: perc,
      benefit: beneficioTotalSemGE,
      excludedList: []
    }];

    let minContributionYearsRequired = 25; // Default minimum is 25 years
    if (activeRule) {
      if (activeRule.nome === "Pedágio 100% (Art. 11)" || activeRule.nome === "Regra de Pontos (Art. 10)") {
        minContributionYearsRequired = sim.sexo === 'M' ? 35 : 30;
      } else {
        minContributionYearsRequired = 25;
      }
    }

    for (let k = 1; k <= limitExclusion; k++) {
      const excludedThisStep = sortedCandidates.slice(0, k);
      const sumOfSmallestK = excludedThisStep.reduce((s, item) => s + item.value, 0);

      const totalSum_adj = totalSum - sumOfSmallestK;
      const totalMonths_adj = totalMeses - k;
      const avg_adj = totalMonths_adj > 0 ? totalSum_adj / totalMonths_adj : 0;

      const yearsTotal_adj = Math.max(0, yearsTotal - (k / 12));
      
      // Trava de tempo de contribuição mínimo: o tempo de contribuição líquido após descartes não pode ser menor que o exigido pela regra
      if (yearsTotal_adj < minContributionYearsRequired) {
        break;
      }

      let perc_adj = 0.60;
      
      if (sim.ingressoCmc) {
        const bExcAdj = 20;
        perc_adj = 0.60 + (yearsTotal_adj > bExcAdj ? (Math.floor(yearsTotal_adj) - bExcAdj) * 0.02 : 0);
        perc_adj = Math.min(Math.max(perc_adj, 0.60), 1.0);
      }

      const benefit_adj = avg_adj * perc_adj;

      optimizationHistory.push({
        k,
        average: avg_adj,
        perc: perc_adj,
        benefit: benefit_adj,
        excludedList: excludedThisStep.map(item => ({
          competencia: item.competencia,
          value: item.value,
          originalValue: item.originalValue,
          rowIdx: item.rowIdx,
          type: item.type
        }))
      });

      if (benefit_adj > bBenefit) {
        bBenefit = benefit_adj;
        bAverage = avg_adj;
        bPerc = perc_adj;
        bestK = k;
        bExcluded = excludedThisStep;
      }
    }

    const optimizationResult = {
      bestK,
      originalAverage: mediaSalarialGeral,
      originalPerc: perc,
      originalBenefit: beneficioTotalSemGE,
      bestAverage: bAverage,
      bestPerc: bPerc,
      bestBenefit: bBenefit,
      bestExcluded: bExcluded.map(item => ({
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
      totalIncCount: candidateMonths.length
    };
    
    // Calculation Memory Log
    let log = "--- MEMÓRIA DE CÁLCULO DE PROVENTOS ---\n\n";
    log += `1. Período Histórico (Base de Contribuição):\n`;
    log += `   - Valor Total: R$ ${formatCurrency(totalHistValue)}${sim.needsUpdate ? ' (Corrigido)' : ''}\n`;
    log += `   - Qtd. de Meses: ${post94_Hist.length} meses\n`;
    log += `   - Média do Período: R$ ${formatCurrency(histAvg)}${missingFactorsMsg}\n\n`;
    
    if (totalIncM > 0) {
      const usesAnyCorrection = activeIncs.some(i => i.tipo !== 'pre-1994' && i.needsUpdate !== false);
      log += `2. Período de Incorporação (Tempo Externo Pós-1994):\n`;
      log += `   - Valor Total: R$ ${formatCurrency(totalIncVal)}${usesAnyCorrection ? ' (Corrigido)' : ''}\n`;
      log += `   - Qtd. de Meses: ${totalIncM} meses\n`;
      log += `   - Média do Período: R$ ${formatCurrency(incAvg)}\n`;
      if (usesAnyCorrection && incMissingFactors > 0) {
        log += `     (*Aviso: ${incMissingFactors} competência(s) de incorporações sem fator de correção, mantendo valor original).\n`;
      }
      log += `\n`;
    }
    
    if (pre94M > 0) {
      log += `3. Período de Incorporação Anterior a 07/1994 (Apenas Tempo):\n`;
      log += `   - Valor Total: R$ 0,00 (Não computável na média salarial)\n`;
      log += `   - Qtd. de Meses: ${pre94M} meses\n`;
      log += `   - Média do Período: R$ 0,00\n\n`;
    }
    
    log += `--------------------------------------------------\n`;
    log += `CONSOLIDADO PARA MÉDIA:\n`;
    log += `- Soma Geral das Contribuições (Pós-1994): R$ ${formatCurrency(totalHistValue + totalIncVal)}\n`;
    log += `- Divisor Total (Tempo Pós-1994): ${totalMeses} meses\n`;
    log += `- Média Salarial Geral Apurada: R$ ${formatCurrency(mediaSalarialGeral)}\n\n`;
    
    log += `CÁLCULO DO BENEFÍCIO FINAL (APLICAÇÃO DO PERCENTUAL):\n`;
    log += `- Tempo de Contribuição Geral Estimado: ${formatarTempo(Math.round(yearsTotal * 365.25))}\n`;
    log += `- Alíquota de Benefício Atingida: ${(perc * 100).toFixed(2).replace('.', ',')}%\n`;
    log += `  (Regra: 60% aos 20 anos + 2% a cada ano adicional)\n`;
    log += `- Aplicação da Alíquota sobre a Média Geral:\n`;
    log += `  R$ ${formatCurrency(mediaSalarialGeral)} x ${(perc * 100).toFixed(2).replace('.', ',')}% = R$ ${formatCurrency(beneficioTotalSemGE)}\n`;
    log += `- Benefício Estimado de Proventos: R$ ${formatCurrency(beneficioTotalSemGE)}\n`;

    const allMonthlyDetails: any[] = [];

    parsedHistorical.forEach(item => {
      allMonthlyDetails.push({
        competencia: item.competencia,
        originalValue: item.originalValue,
        value: item.value,
        type: 'chamber-historical',
        isPre94: item.isPre94,
        isExcluded: false
      });
    });

    activeIncs.forEach((inc) => {
      const lineStr = typeof inc.valor === 'string' ? inc.valor : '';
      const incLines = lineStr.split('\n').filter(l => l.trim().length > 0);
      incLines.forEach(l => {
        const parsed = parseLinhaX(l);
        if (parsed) {
          let correctedVal = parsed.valor;
          if (inc.needsUpdate !== false) {
            const f = fatores.get(parsed.competencia);
            if (f !== undefined) {
              correctedVal = parsed.valor * f;
            }
          }
          allMonthlyDetails.push({
            competencia: parsed.competencia,
            originalValue: parsed.valor,
            value: correctedVal,
            type: inc.tipo,
            isPre94: isPre07_1994(parsed.competencia),
            isExcluded: false
          });
        } else {
          const parts = l.trim().split(/\s+/);
          const valStr = parts.length > 1 ? parts[parts.length - 1] : parts[0];
          const rawVal = (parseFloat(valStr.replace(/\./g, '').replace(',', '.')) || 0);
          
          let comp = "MM/AAAA";
          const dateComDiaRegex = /\b(\d{1,2})[\/\-](\d{1,2}|[a-zA-Z]{3,9})[\/\-](\d{2}|\d{4})\b/;
          const dateSemDiaRegex = /\b(\d{1,2}|[a-zA-Z]{3,9})[\/\-](\d{2}|\d{4})\b/;
          const dateYearMonthRegex = /\b(\d{4})[\/\-](\d{1,2})\b/;

          let mComDia = l.match(dateComDiaRegex);
          let mSemDia = l.match(dateSemDiaRegex);
          let mYearMonth = l.match(dateYearMonthRegex);

          if (mComDia) {
            comp = normalizarData(mComDia[2], mComDia[3]);
          } else if (mSemDia) {
            comp = normalizarData(mSemDia[1], mSemDia[2]);
          } else if (mYearMonth) {
            comp = normalizarData(mYearMonth[2], mYearMonth[1]);
          }

          allMonthlyDetails.push({
            competencia: comp,
            originalValue: rawVal,
            value: rawVal,
            type: inc.tipo,
            isPre94: isPre07_1994(comp),
            isExcluded: false
          });
        }
      });
    });

    projFutureMonths.forEach((item) => {
      const caps = getSavedSalaryCaps();
      const cap = (sim.selectedCareer === 'procurador_juridico' ? caps.procurador : caps.general);
      const cappedVal = Math.min(item.originalValue, cap);

      allMonthlyDetails.push({
        competencia: item.competencia,
        originalValue: item.originalValue,
        value: cappedVal,
        type: item.type,
        isPre94: false,
        isExcluded: false
      });
    });

    const bestExcludedKeys = new Set(bExcluded.map(x => `${x.competencia}_${x.type}_${x.originalValue}`));
    allMonthlyDetails.forEach(item => {
      if (bestExcludedKeys.has(`${item.competencia}_${item.type}_${item.originalValue}`)) {
        item.isExcluded = true;
      }
    });

    const sortedMonthlyDetails = [...allMonthlyDetails].sort((a, b) => {
      const idxA = getCompIndex(a.competencia);
      const idxB = getCompIndex(b.competencia);
      return idxA - idxB;
    });

    let analyticalListStr = "\n======================================================================\n";
    analyticalListStr += `LISTAGEM ANALÍTICA DAS COMPETÊNCIAS E CONTRIBUIÇÕES CONSIDERADAS:\n`;
    analyticalListStr += `======================================================================\n`;
    
    sortedMonthlyDetails.forEach((item) => {
      const compLabel = item.competencia.padEnd(10);
      let descLabel = "";
      if (item.type === 'chamber-historical') descLabel = "Câmara (Histórico)";
      else if (item.type === 'chamber-projected' || item.type === 'chamber-proj') descLabel = "Câmara (Projetado)";
      else if (item.type === 'projected-future') descLabel = "Período Futuro Projetado";
      else if (item.type === 'contribution-only') descLabel = "Incorporação (Tempo e Contrib.)";
      else if (item.type === 'all-effects') descLabel = "Incorporação (Todos Efeitos)";
      else if (item.type === 'pre-1994') descLabel = "Incorporação (Tempo Pré-1994)";
      else descLabel = "Contribuição";

      descLabel = descLabel.padEnd(30);

      if (item.isPre94) {
        analyticalListStr += `   ${compLabel} | ${descLabel} | (Período anterior a 07/1994 desconsiderado do cálculo da média)\n`;
      } else {
        let valBlock = "";
        if (item.type === 'projected-future') {
          const caps = getSavedSalaryCaps();
          const cap = (sim.selectedCareer === 'procurador_juridico' ? caps.procurador : caps.general);
          
          const origValStr = `Orig: R$ ${formatCurrency(item.originalValue)}`;
          if (item.originalValue > cap) {
            const diff = item.originalValue - cap;
            valBlock = `${origValStr.padEnd(18)} | Teto: R$ ${formatCurrency(cap)} (Acima do teto R$ ${formatCurrency(diff)})`;
          } else {
            valBlock = `${origValStr.padEnd(18)}`;
          }
        } else {
          const origValStr = `Orig: R$ ${formatCurrency(item.originalValue)}`;
          const corrValStr = sim.needsUpdate ? `Corr: R$ ${formatCurrency(item.value)}` : "";
          valBlock = `${origValStr.padEnd(18)} ${corrValStr ? '| ' + corrValStr.padEnd(18) : ''}`;
        }
        
        let annotation = "";
        if (item.isExcluded) {
          annotation = " (Excluída)";
        }
        
        analyticalListStr += `   ${compLabel} | ${descLabel} | ${valBlock}${annotation}\n`;
      }
    });
    analyticalListStr += `======================================================================\n\n`;

    log += analyticalListStr;
    
    return { 
      calculatedDiasINSS,
      calculatedDiasSP,
      regrasResults,
      proventosResults: { 
        average: mediaSalarialGeral, 
        yearsTotal,
        benefit: beneficioTotalSemGE, 
        perc, 
        histCount: post94_Hist.length,
        log,
        geTotal,
        optimizationResult,
        allContributions: sortedMonthlyDetails
      }
    };
  }, [sim, geResults]);

  const temSimulado =React.useMemo(() => sim.incorporacoes.some(inc => inc.status === 'simular'), [sim.incorporacoes]);
  const [cenarioAtivo, setCenarioAtivo] = useState<'com_simulado' | 'sem_simulado'>('com_simulado');

  const cenarioCom = React.useMemo(() => {
    return calcularResultadosParaCenario(sim.incorporacoes);
  }, [sim, calcularResultadosParaCenario]);

  const cenarioSem = React.useMemo(() => {
    return calcularResultadosParaCenario(sim.incorporacoes.filter(inc => inc.status !== 'simular'));
  }, [sim, calcularResultadosParaCenario]);

  const resultadosAtuais = (temSimulado && cenarioAtivo === 'sem_simulado') ? cenarioSem : cenarioCom;

  const regrasResults = resultadosAtuais.regrasResults;
  const proventosResults = resultadosAtuais.proventosResults;
  const calculatedDiasINSS = resultadosAtuais.calculatedDiasINSS;
  const calculatedDiasSP = resultadosAtuais.calculatedDiasSP;

  const simFiltrado = React.useMemo(() => {
    if (temSimulado && cenarioAtivo === 'sem_simulado') {
      return {
        ...sim,
        incorporacoes: sim.incorporacoes.filter(i => i.status !== 'simular')
      };
    }
    return sim;
  }, [sim, temSimulado, cenarioAtivo]);

  if (showReport) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 print:hidden">
          <button onClick={() => setShowReport(false)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-all font-bold self-start sm:self-auto"> Voltar</button>
          <div className="flex flex-wrap gap-2">
            <button 
              className="bg-emerald-600 text-white font-extrabold py-2 px-3.5 rounded-lg hover:bg-emerald-700 transition-all uppercase tracking-wide text-xs flex items-center gap-1.5 shadow-sm" 
              onClick={() => {
                exportToExcel(simFiltrado, regrasResults, geResults, proventosResults, calculatedDiasSP, calculatedDiasINSS);
              }}
            >
              <FileText size={14} /> Exportar Excel (.csv)
            </button>
            <button 
              className="bg-indigo-600 text-white font-extrabold py-2 px-3.5 rounded-lg hover:bg-indigo-700 transition-all uppercase tracking-wide text-xs flex items-center gap-1.5 shadow-sm"
              style={{ backgroundColor: '#4f46e5' }}
              onClick={() => {
                exportToPDF(simFiltrado, regrasResults, geResults, proventosResults, calculatedDiasSP, calculatedDiasINSS);
              }}
            >
              <FilePlus size={14} /> Exportar PDF Direto
            </button>
            <button 
              className="border border-gray-300 text-gray-700 font-bold py-2 px-3.5 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all uppercase tracking-wide text-xs flex items-center gap-1.5 bg-white shadow-xs" 
              onClick={() => {
                try {
                  window.print();
                } catch (e) {
                  alert("O recurso de impressão pode estar bloqueado neste ambiente de visualização. Tente abrir o aplicativo em uma nova aba para imprimir.");
                }
              }}
            >
              Imprimir Relatório
            </button>
          </div>
        </div>

        <div className="p-8 border border-gray-200 shadow-sm rounded-xl bg-white text-gray-900 space-y-8" id="print-container">
          <div className="text-center border-b-2 border-gray-900 pb-4">
            <h1 className="text-2xl font-bold uppercase tracking-tight">Câmara Municipal de Curitiba</h1>
            <h2 className="text-sm font-semibold uppercase text-gray-600">Diretoria de Gestão de Pessoas - DGEP</h2>
            <h3 className="text-lg font-bold uppercase mt-2">Dossiê Analítico de Aposentadoria</h3>
            {sim.congelada && (
              <div className="mt-3 inline-block bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-200">
                ⚠️ SIMULAÇÃO CONGELADA — Fatores de conversão vigentes na simulação (RF: {sim.fatoresCongeladosMonthYear || 'N/A'})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm font-mono border-b border-gray-300 pb-4">
            <div className="break-words"><span className="font-bold text-gray-500 block text-[10px] uppercase">Nome do Servidor</span>{sim.nome || 'NÃO IDENTIFICADO'}</div>
            <div className="break-words"><span className="font-bold text-gray-500 block text-[10px] uppercase">Matrícula</span>{sim.matricula || 'N/A'}</div>
            <div className="break-words"><span className="font-bold text-gray-500 block text-[10px] uppercase">Cargo Atual</span>{(sim.cargo || sim.selectedCareer).replace(/_/g, ' ')} / {sim.selectedLevel}</div>
            <div className="break-words"><span className="font-bold text-gray-500 block text-[10px] uppercase">Nasc. / Sexo</span>{sim.dataNascimento ? new Date(sim.dataNascimento).toLocaleDateString('pt-BR') : 'N/A'} - {sim.sexo || 'N/A'}</div>
          </div>

          {/* DOSSIÊ DETALHADO DE PERÍODOS DE CONTRIBUIÇÃO CONSIDERADOS (Anos, Meses, Dias vs Dias Absolutos) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Info size={16} className="text-slate-600 shrink-0" />
              Detalhamento dos Períodos Contributivos Considerados (Análise Consolidada)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Tempo no Município (PMC/SP Efetivo)</span>
                <strong className="text-sm text-slate-900 block font-mono font-bold">{formatarTempo(calculatedDiasSP)}</strong>
                <span className="text-[11px] text-gray-500 block">Tempo acumulado cumprido em exercício efetivo no âmbito do município, com todos os efeitos legais.</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block">Tempo Externo Averbado (INSS)</span>
                <strong className="text-sm text-slate-900 block font-mono font-bold">{formatarTempo(calculatedDiasINSS)}</strong>
                <span className="text-[11px] text-gray-500 block">Tempo total convalidado que foi averbado junto ao Regime Geral (RGPS) ou outros regimes institucionais.</span>
              </div>
              {sim.diasAfastamento && sim.diasAfastamento > 0 ? (
                <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wide block">Afastamentos / Deduções</span>
                  <strong className="text-sm text-red-600 block font-mono font-bold">{formatarTempo(sim.diasAfastamento)}</strong>
                  <span className="text-[11px] text-gray-500 block">Soma de dias desconsiderados da contagem geral devido a interrupções legais de vínculo.</span>
                </div>
              ) : null}
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-1 md:col-span-2 lg:col-span-1">
                <span className="text-[10px] font-bold text-[#004b8d] uppercase tracking-wide block">Tempo Total de Contribuição Consolidado</span>
                <strong className="text-sm text-[#004b8d] block font-mono font-bold">
                  {formatarTempo(Math.max(0, calculatedDiasSP + calculatedDiasINSS - (sim.diasAfastamento || 0)))}
                </strong>
                <span className="text-[11px] text-gray-500 block">Saldo líquido final dos tempos de cooperação previdenciária computados nesta simulação.</span>
              </div>
            </div>
          </div>

          {/* PAINEL DE CENÁRIOS PREVIDENCIÁRIOS EM DESTAQUE */}
          {temSimulado && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 bg-[#fffbeb]/40 border border-amber-300 rounded-xl p-5 md:p-6 space-y-4 print:hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <Star size={18} className="text-amber-600 shrink-0" fill="currentColor" />
                  <div>
                    <h3 className="text-sm font-extrabold text-amber-950 uppercase tracking-wide">Painel de Impacto de Cenários Previdenciários</h3>
                    <p className="text-xs text-amber-700">Explore e audite o impacto dos tempos simulados do Campo 5 lado-a-lado</p>
                  </div>
                </div>
                {/* Abas para definir qual cenário exibir no relatório detalhado abaixo */}
                <div className="flex bg-amber-100 p-0.5 rounded-lg border border-amber-200 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setCenarioAtivo('com_simulado')}
                    className={`text-xs font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                      cenarioAtivo === 'com_simulado'
                        ? 'bg-[#004b8d] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Exibir Completo (Com Simulação)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCenarioAtivo('sem_simulado')}
                    className={`text-xs font-bold px-3 py-1 rounded-md transition-all cursor-pointer ${
                      cenarioAtivo === 'sem_simulado'
                        ? 'bg-amber-700 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Exibir Apenas Efetivado
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Impacto no Tempo e Cota */}
                <div className="bg-white/90 p-4 rounded-lg border border-amber-200 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tempo & Alíquota Final</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-gray-500">Apenas Efetivado:</span>
                      <strong className="text-sm font-mono text-gray-800">{(cenarioSem.proventosResults.perc * 100).toFixed(0)}%</strong>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs font-semibold text-amber-800">Com Simulado:</span>
                      <strong className="text-sm font-mono text-amber-600">{(cenarioCom.proventosResults.perc * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                  <div className="text-[10px] bg-amber-50 rounded p-1.5 text-amber-900 font-medium">
                    A simulação eleva a cota em <span className="font-bold">+ {((cenarioCom.proventosResults.perc - cenarioSem.proventosResults.perc) * 100).toFixed(0)} pontos percentuais</span>.
                  </div>
                </div>

                {/* 2. Impacto nos Descartes */}
                <div className="bg-white/90 p-4 rounded-lg border border-amber-200 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Descarte de Menores (§10)</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-gray-500">Apenas Efetivado:</span>
                      <strong className="text-sm font-mono text-gray-800">{cenarioSem.proventosResults.optimizationResult?.bestK || 0} meses</strong>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs font-semibold text-amber-800">Com Simulado:</span>
                      <strong className="text-sm font-mono text-amber-600">{cenarioCom.proventosResults.optimizationResult?.bestK || 0} meses</strong>
                    </div>
                  </div>
                  <div className="text-[10px] bg-amber-50 rounded p-1.5 text-amber-900 font-medium">
                    Número de meses descartados para obter a maior média de provento de cada cenário.
                  </div>
                </div>

                {/* 3. Impacto nos Proventos */}
                <div className="bg-white/90 p-4 rounded-lg border border-amber-200 flex flex-col justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Provento Final Estimado</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-gray-500">Apenas Efetivado:</span>
                      <strong className="text-sm font-mono text-gray-800">R$ {formatCurrency(cenarioSem.proventosResults.benefit)}</strong>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs font-semibold text-amber-800">Com Simulado:</span>
                      <strong className="text-sm font-mono text-amber-600">R$ {formatCurrency(cenarioCom.proventosResults.benefit)}</strong>
                    </div>
                  </div>
                  <div className="text-[10px] bg-amber-100 rounded p-1.5 text-amber-950 font-bold border border-amber-200 flex justify-between">
                    <span>GANHO ESTIMADO:</span>
                    <span>+ R$ {formatCurrency(cenarioCom.proventosResults.benefit - cenarioSem.proventosResults.benefit)} /mês</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {opts.regras && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2 uppercase tracking-wider">1. Elegibilidade e Regras de Transição (IPMC)</h4>
              <div className="grid grid-cols-1 gap-4">
                {regrasResults.map((r: any, i: number) => (
                  <div key={i} className={`bg-white border rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden ${r.aplicavel ? r.isVantajosa ? 'border-amber-300 bg-amber-50/15 border-l-6 border-l-amber-400' : 'border-emerald-200 border-l-6 border-l-emerald-600' : 'border-red-200 border-l-6 border-l-red-500 opacity-85'}`}>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-base ${r.isVantajosa ? 'text-amber-800' : 'text-[#004b8d]'}`}>{r.nome}</h3>
                        {r.isVantajosa && <span className="inline-flex items-center gap-1 py-0.5 px-2.5 rounded-full bg-amber-100 text-amber-950 text-[10px] font-bold uppercase tracking-wider shadow-xs"><Star size={9} fill="currentColor" /> Mais Vantajosa</span>}
                      </div>
                      {r.aplicavel && r.detalhes ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs font-sans">
                          <div className="space-y-0.5">
                            <span className="block text-gray-400 font-bold uppercase text-[9px]">Data de Elegibilidade</span>
                            <strong className="text-gray-900 text-sm block">{formatarData(r.data)}</strong>
                          </div>
                          <div className="space-y-0.5">
                            <span className="block text-gray-400 font-bold uppercase text-[9px]">Cálculo de Proventos</span>
                            <strong className="text-[#004b8d] text-sm font-semibold block">{r.proventos}</strong>
                          </div>
                          <div className="space-y-0.5">
                            <span className="block text-gray-400 font-bold uppercase text-[9px]">Idade Prevista na Elegibilidade</span>
                            <strong className="text-gray-900 text-sm font-semibold block">
                              {r.detalhes.idade} anos
                            </strong>
                            <span className="text-[10px] text-gray-500 block leading-tight">
                              ({calcularIdadeCompleta(sim.dataNascimento, r.data)})
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="block text-gray-400 font-bold uppercase text-[9px]">Pontuação</span>
                            {r.nome === "Regra de Pontos (Art. 10)" ? (
                              <>
                                <strong className="text-[#004b8d] text-sm font-semibold block">
                                  {r.detalhes.pontos.toFixed(2)} pts
                                </strong>
                                <span className="text-[10px] text-gray-500 block leading-tight">
                                  Exigido para elegibilidade nesta regra.
                                </span>
                              </>
                            ) : (
                              <>
                                <strong className="text-gray-405 text-sm font-normal block italic">
                                  Não se aplica
                                </strong>
                                <span className="text-[9px] text-gray-450 block leading-tight">
                                  Pontos não são exigidos nesta regra.
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ) : <p className="text-red-700 text-sm flex items-center gap-1.5 font-medium"><XSquare size={16} /> Pendente: {r.motivo}</p>}
                    </div>
                    <div className="shrink-0 flex items-center">
                      {r.aplicavel ? <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200"><CheckCircle size={22} /></div> : <div className="p-2.5 bg-red-50 text-red-600 rounded-full border border-red-100"><XSquare size={22} /></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {opts.ge && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2 uppercase tracking-wider">2. Gratificação Especial (GE)</h4>
              
              {!geResults.isEligible && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-4 rounded-xl leading-relaxed">
                  <strong>Servidor Inelegível para Incorporação de Gratificação Especial (GE):</strong> O ingresso no serviço público ocorreu em {sim.ingressoCmc ? new Date(sim.ingressoCmc + 'T00:00:00').toLocaleDateString('pt-BR') : 'data não informada'} (limite para este direito: ingresso até 31/12/2003). Por este motivo, as eventuais funções e adicionais informados foram desconsiderados e fixados com valor proporcional zerado no cálculo geral de benefício.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
                  <h5 className="font-bold text-[#004b8d] text-sm uppercase">Acúmulo de FGs Adicionais</h5>
                  {geResults.fgs.map((fg, i) => (
                    <div key={i} className="flex justify-between text-xs border-b border-gray-200 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-gray-600">{fg.nivel} ({fg.meses} meses)</span>
                      <strong className="text-gray-900">+ R$ {formatCurrency(fg.inc)}</strong>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-bold text-sm text-[#004b8d]"><span className="uppercase">Subtotal FG:</span><span>R$ {formatCurrency(geResults.totalFGs)}</span></div>
                </div>
                
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-3">
                  <h5 className="font-bold text-[#004b8d] text-sm uppercase">Estímulos Acadêmicos</h5>
                  {geResults.stims.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs border-b border-gray-200 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-gray-600 capitalize">{s.tipo.replace('_', ' ')} ({(s.perc * 100).toFixed(0)}%) - {s.meses} meses</span>
                      <strong className="text-gray-900">+ R$ {formatCurrency(s.inc)}</strong>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-bold text-sm text-[#004b8d]"><span className="uppercase">Subtotal Acadêmicos:</span><span>R$ {formatCurrency(geResults.totalStims)}</span></div>
                </div>
              </div>
              <div className="bg-gray-100 text-[#004b8d] border border-gray-300 p-4 rounded-xl flex justify-between items-center shadow-sm">
                <span className="font-bold uppercase tracking-wider text-sm">Prêmio Fixado Total a Incorporar na Aposentadoria (GE)</span>
                <span className="text-2xl font-bold tracking-tight">R$ {formatCurrency(geResults.totalFGs + geResults.totalStims)}</span>
              </div>
            </div>
          )}

          {opts.proventos && (
            <div className="space-y-6">
              <h4 className="text-lg font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2 uppercase tracking-wider">3. Estimativa de Proventos a Conceder</h4>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 relative overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Média Salarial Apurada (Estimada)</span>
                    <strong className="text-3xl text-emerald-900 font-bold tracking-tight">R$ {formatCurrency(proventosResults.average)}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Cota Progressiva (EC 103/2019)</span>
                    <strong className="text-3xl text-emerald-900 font-bold tracking-tight">{(proventosResults.perc * 100).toFixed(2)}%</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Benefício Teto de Proventos</span>
                    <strong className="text-3xl text-emerald-900 font-bold tracking-tight">R$ {formatCurrency(proventosResults.benefit)}</strong>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-200/60 text-xs text-emerald-800 flex gap-4">
                  <span><strong>Meses no Histórico:</strong> {proventosResults.histCount} contribuições informadas.</span>
                  <span><strong>Extensão Trabalhada:</strong> {sim.extensionMonths ?? 0} {sim.extensionMonths === 1 ? 'mês projetado' : 'meses projetados'} a mais para cota percentual.</span>
                </div>
              </div>

              {/* Otimização de Média – Lei Complementar 133/2021, Art. 15 § 10 */}
              {proventosResults.optimizationResult && (
                <div className="border border-indigo-105 bg-indigo-50/15 rounded-xl p-5 sm:p-6 space-y-5" style={{ borderColor: '#e0e7ff' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100/60 font-sans">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 text-white rounded-lg flex items-center justify-center" style={{ backgroundColor: '#4f46e5' }}>
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

                  {proventosResults.optimizationResult.bestK === 0 ? (
                    <div className="flex items-start gap-4 bg-white border border-gray-250 p-4 rounded-xl">
                      <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                      <div className="text-sm text-gray-700 leading-relaxed font-sans">
                        <p className="font-bold text-gray-900">Sua média original é a ideal!</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Todos os meses incorporados ajudam a manter o coeficiente ou coeficiente geral estável. Nenhuma exclusão de contribuição externa pós-07/1994 resultará em benefício final superior a este.
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
                          <div className="flex justify-between text-xs sm:text-sm text-gray-600 border-b border-gray-150 pb-1.5 pt-1">
                            <span>Média Salarial Apurada:</span>
                            <strong className="text-gray-800 font-semibold">R$ {formatCurrency(proventosResults.optimizationResult.originalAverage)}</strong>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm text-gray-600 border-b border-gray-50 pb-1.5">
                            <span>Alíquota do Benefício:</span>
                            <strong className="text-gray-800 font-semibold">{(proventosResults.optimizationResult.originalPerc * 100).toFixed(2)}%</strong>
                          </div>
                          <div className="flex justify-between text-sm pt-1">
                            <span className="text-gray-500">Benefício Mensal Estimado:</span>
                            <strong className="text-gray-800 font-mono">R$ {formatCurrency(proventosResults.optimizationResult.originalBenefit)}</strong>
                          </div>
                        </div>

                        {/* Cenário Otimizado */}
                        <div className="bg-emerald-50/45 border border-emerald-200 p-4 rounded-xl space-y-2 relative overflow-hidden">
                          <div className="absolute top-0 right-0 -mr-2 -mt-2 w-8 h-8 rotate-12 bg-emerald-100/40" />
                          <span className="block text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">Cenário Otimizado (Recomendado)</span>
                          <div className="flex justify-between text-xs sm:text-sm text-[#004b8d] border-b border-emerald-100 pb-1.5 pt-1">
                            <span>Média Otimizada (+{(((proventosResults.optimizationResult.bestAverage - proventosResults.optimizationResult.originalAverage) / (proventosResults.optimizationResult.originalAverage || 1)) * 100).toFixed(1)}%):</span>
                            <strong className="text-emerald-950 font-bold">R$ {formatCurrency(proventosResults.optimizationResult.bestAverage)}</strong>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm text-[#004b8d] border-b border-emerald-100 pb-1.5">
                            <span>Alíquota Ajustada (Perda de {proventosResults.optimizationResult.bestK} meses):</span>
                            <strong className="text-red-750 font-bold">{(proventosResults.optimizationResult.bestPerc * 100).toFixed(2)}%</strong>
                          </div>
                          <div className="flex justify-between text-sm pt-1">
                            <span className="font-extrabold text-emerald-800">Benefício Otimizado Final:</span>
                            <strong className="text-emerald-900 font-bold font-mono">R$ {formatCurrency(proventosResults.optimizationResult.bestBenefit)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="bg-emerald-600 text-white px-5 py-3.5 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={20} />
                          <div>
                            <span className="text-xs text-emerald-100 block font-medium uppercase tracking-wider leading-none mb-1">Vantagem Financeira Líquida</span>
                            <span className="text-[11px] text-white">Descarte otimizado de {proventosResults.optimizationResult.bestK} meses de menor contribuição.</span>
                          </div>
                        </div>
                        <span className="text-xl sm:text-2xl font-bold font-mono shrink-0">
                          + R$ {formatCurrency(proventosResults.optimizationResult.bestBenefit - proventosResults.optimizationResult.originalBenefit)}<span className="text-xs font-normal text-emerald-100">/mês</span>
                        </span>
                      </div>

                      {/* Excluded contribution elements */}
                      <div className="space-y-2.5">
                        <h4 className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                          <Info size={13} className="text-indigo-600" />
                          Lançamentos Sugeridos Para Exclusão da Média:
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          As seguintes {proventosResults.optimizationResult.bestK} contribuições foram identificadas como desvantajosas para sua média (baixando o cálculo salarial mais do que compensavam em tempo de serviço). Elas devem ser descartadas pelo RPPS conforme Art. 15 § 10 da LC 133/2021:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {proventosResults.optimizationResult.bestExcluded.map((exc: any, index: number) => (
                            <div key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-950 text-xs font-bold rounded-lg border border-red-100 transition-colors shadow-2xs">
                              <span className="bg-red-200 text-red-800 w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px]">{index + 1}</span>
                              <span className="font-mono">{exc.competencia}</span>
                              <span className="text-red-400 font-normal text-[10px]">
                                {exc.type === 'chamber-historical' ? '(Histórico)' : exc.type === 'chamber-projected' ? '(Projetado)' : `(Período ${exc.rowIdx})`}
                              </span>
                              <span className="text-red-450">•</span>
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
                              {proventosResults.optimizationResult.history.map((step: any) => {
                                const isOptimal = step.k === proventosResults.optimizationResult.bestK;
                                return (
                                  <tr key={step.k} className={`border-b last:border-0 hover:bg-gray-50/50 ${isOptimal ? 'bg-emerald-50/80 font-bold border-emerald-200 text-emerald-950' : 'text-gray-600 border-indigo-50/40'}`}>
                                    <td className="py-2 px-3 flex items-center gap-1.5">
                                      {isOptimal ? <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">Ótimo</span> : null}
                                      {step.k === 0 ? 'Cenário Inicial (0)' : `${step.k} menor(es) competência(s)`}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono">R$ {formatCurrency(step.average)}</td>
                                    <td className="py-2 px-3 text-right font-mono">{(step.perc * 100).toFixed(2)}%</td>
                                    <td className="py-2 px-3 text-right font-mono">R$ {formatCurrency(step.benefit)}</td>
                                    <td className={`py-2 px-3 text-right font-mono font-bold ${step.k === 0 ? 'text-gray-400' : (step.benefit > proventosResults.optimizationResult.originalBenefit ? 'text-emerald-700' : 'text-rose-600')}`}>
                                      {step.k === 0 ? 'Linha Base' : `${step.benefit >= proventosResults.optimizationResult.originalBenefit ? '+' : ''}R$ ${formatCurrency(step.benefit - proventosResults.optimizationResult.originalBenefit)}`}
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

              {/* PROSPECÇÃO DE FUTURO: IMPACTO DE CONTINUAR TRABALHANDO MAIS TEMPO */}
              {sim.extensionMonths && sim.extensionMonths > 0 ? (() => {
                const yearsTotal = proventosResults.yearsTotal || 0;
                const mediaSalarialGeral = proventosResults.average || 0;
                return (
                  <div className="border border-slate-205 bg-slate-50/50 rounded-xl p-5 sm:p-6 space-y-6" style={{ borderColor: '#e2e8f0' }}>
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                  <div className="p-2 text-white rounded-lg flex items-center justify-center bg-emerald-600">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-normal">Prospecção de Futuro: Impacto de Continuar Trabalhando</h3>
                    <p className="text-xs text-slate-600">Comparação dos proventos entre trabalhar mais tempo, com ou sem o descarte de menores salários</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  <p>
                    A regra de proventos do município incrementa a sua quota de aposentadoria em <strong>2% para cada ano de trabalho adicional</strong> que excede 20 anos de contribuição (limitado ao teto de 100%). Abaixo, veja a projeção financeira real de sua aposentadoria ao optar por estender a permanência no cargo por até 4 anos:
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  {/* Custom SVG Line Chart */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">Gráfico Comparativo de Projeção Monetária</span>
                    
                    {/* SVG Canvas */}
                    <div className="relative w-full overflow-hidden flex justify-center">
                      {(() => {
                        const yearsTotalBase = yearsTotal - ((sim.extensionMonths || 0) / 12);
                        const selectedExt = sim.extensionMonths || 0;
                        const extScenarios = [0, 12, 24, 36, 48];
                        
                        if (selectedExt > 0 && !extScenarios.includes(selectedExt)) {
                          extScenarios.push(selectedExt);
                          extScenarios.sort((a, b) => a - b);
                        }

                        const projections = extScenarios.map(ext => {
                          const yearsTotalOriginalExt = yearsTotalBase + (ext / 12);
                          let percOriginalExt = 0.60;
                          if (sim.ingressoCmc) {
                            percOriginalExt = 0.60 + (yearsTotalOriginalExt > 20 ? (Math.floor(yearsTotalOriginalExt) - 20) * 0.02 : 0);
                            percOriginalExt = Math.min(Math.max(percOriginalExt, 0.60), 1.0);
                          }
                          const benefitOriginalExt = mediaSalarialGeral * percOriginalExt;

                          const yearsTotalOptimizedExt = Math.max(0, yearsTotalOriginalExt - (proventosResults.optimizationResult?.bestK || 0) / 12);
                          let percOptimizedExt = 0.60;
                          if (sim.ingressoCmc) {
                            percOptimizedExt = 0.60 + (yearsTotalOptimizedExt > 20 ? (Math.floor(yearsTotalOptimizedExt) - 20) * 0.02 : 0);
                            percOptimizedExt = Math.min(Math.max(percOptimizedExt, 0.60), 1.0);
                          }
                          const benefitOptimizedExt = (proventosResults.optimizationResult?.bestAverage || mediaSalarialGeral) * percOptimizedExt;

                          return {
                            ext,
                            semDescarte: benefitOriginalExt,
                            comDescarte: benefitOptimizedExt
                          };
                        });

                        const allVals = projections.flatMap(p => [p.semDescarte, p.comDescarte]);
                        const maxVal = Math.max(...allVals);
                        const minVal = Math.min(...allVals);
                        
                        // Buffer
                        const buffer = (maxVal - minVal) * 0.1 || maxVal * 0.1 || 1000;
                        const minYPrice = Math.max(0, minVal - buffer);
                        const maxYPrice = maxVal + buffer;

                        // Dimensions
                        const svgW = 400;
                        const svgH = 180;
                        const padL = 50;
                        const padR = 20;
                        const padT = 20;
                        const padB = 30;

                        const getX = (index: number) => padL + (index * (svgW - padL - padR)) / (projections.length - 1 || 1);
                        const getY = (val: number) => {
                          const range = maxYPrice - minYPrice;
                          if (range === 0) return svgH / 2;
                          return svgH - padB - ((val - minYPrice) / range) * (svgH - padT - padB);
                        };

                        const pointsSem = projections.map((p, i) => `${getX(i)},${getY(p.semDescarte)}`).join(' ');
                        const pointsCom = projections.map((p, i) => `${getX(i)},${getY(p.comDescarte)}`).join(' ');

                        return (
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full max-w-md h-auto font-sans text-[9px] text-gray-500">
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                              const yVal = minYPrice + ratio * (maxYPrice - minYPrice);
                              const yPos = getY(yVal);
                              return (
                                <g key={idx}>
                                  <line x1={padL} y1={yPos} x2={svgW - padR} y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
                                  <text x={padL - 6} y={yPos + 3} textAnchor="end" className="fill-slate-400 font-mono">
                                    {Math.round(yVal).toLocaleString('pt-BR')}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Active Scenario Vertical Bar Indicator */}
                            {projections.map((p, i) => {
                              if (p.ext !== selectedExt) return null;
                              const xPos = getX(i);
                              return (
                                <line key={`active-col-${i}`} x1={xPos} y1={padT} x2={xPos} y2={svgH - padB} stroke="#d97706" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
                              );
                            })}

                            {/* X-axis labels */}
                            {projections.map((p, i) => {
                              const xPos = getX(i);
                              const isSelected = p.ext === selectedExt;
                              let label = '';
                              if (p.ext === 0) {
                                label = isSelected ? 'Elegível (Ativo)' : 'Elegível';
                              } else {
                                const anos = p.ext / 12;
                                label = Number.isInteger(anos) ? `+${anos} ${anos === 1 ? 'ano' : 'anos'}` : `+${p.ext} m`;
                                if (isSelected) label += ' (Ativo)';
                              }
                              return (
                                <g key={i}>
                                  <line x1={xPos} y1={svgH - padB} x2={xPos} y2={svgH - padB + 4} stroke={isSelected ? '#d97706' : '#cbd5e1'} strokeWidth={isSelected ? '1.5' : '1'} />
                                  <text x={xPos} y={svgH - padB + 14} textAnchor="middle" className={`${isSelected ? 'fill-amber-700 font-extrabold' : 'fill-slate-600'} text-[8px]`}>
                                    {label}
                                  </text>
                                </g>
                              );
                            })}

                            <line x1={padL} y1={svgH - padB} x2={svgW - padR} y2={svgH - padB} stroke="#cbd5e1" strokeWidth="1" />

                            {/* Line Sem Descarte */}
                            <polyline points={pointsSem} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="3,3" />
                            {/* Line Com Descarte */}
                            <polyline points={pointsCom} fill="none" stroke="#4f46e5" strokeWidth="3" />

                            {/* Circles */}
                            {projections.map((p, i) => {
                              const isSelected = p.ext === selectedExt;
                              return (
                                <g key={i}>
                                  {/* Sem descarte dot */}
                                  <circle cx={getX(i)} cy={getY(p.semDescarte)} r={isSelected ? "4" : "3"} className={`fill-white ${isSelected ? 'stroke-amber-500' : 'stroke-slate-400'}`} strokeWidth={isSelected ? "2.5" : "1.8"} />
                                  
                                  {/* Com descarte dot */}
                                  <circle cx={getX(i)} cy={getY(p.comDescarte)} r={isSelected ? "5" : "4"} className={`fill-white ${isSelected ? 'stroke-amber-600' : 'stroke-indigo-600'}`} strokeWidth={isSelected ? "3" : "2.2"} />
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex justify-center gap-6 text-[10px] border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
                        <span className="text-slate-500 font-medium">Média Sem Descarte</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-0.5 border-t-2 border-indigo-600 inline-block" />
                        <span className="text-indigo-950 font-bold">Média Com Descarte (§ 10)</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div className="w-full space-y-4">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tabela Analítica de Incremento de Tempo</span>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs font-sans">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                            <th className="py-2.5 px-3">Tempo Adicional</th>
                            <th className="py-2.5 px-3 text-center">Quota (%)</th>
                            <th className="py-2.5 px-3 text-right">Sem Descarte</th>
                            <th className="py-2.5 px-3 text-right">Com Descarte (§ 10)</th>
                            <th className="py-2.5 px-3 text-right text-indigo-700 font-extrabold">Plus Descarte</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const yearsTotalBase = yearsTotal - ((sim.extensionMonths || 0) / 12);
                            const selectedExt = sim.extensionMonths || 0;
                            const extScenarios = [0, 12, 24, 36, 48];
                            
                            if (selectedExt > 0 && !extScenarios.includes(selectedExt)) {
                              extScenarios.push(selectedExt);
                              extScenarios.sort((a, b) => a - b);
                            }

                            return extScenarios.map((ext) => {
                              const yearsTotalOriginalExt = yearsTotalBase + (ext / 12);
                              let percOriginalExt = 0.60;
                              if (sim.ingressoCmc) {
                                percOriginalExt = 0.60 + (yearsTotalOriginalExt > 20 ? (Math.floor(yearsTotalOriginalExt) - 20) * 0.02 : 0);
                                percOriginalExt = Math.min(Math.max(percOriginalExt, 0.60), 1.0);
                              }
                              const benefitOriginalExt = mediaSalarialGeral * percOriginalExt;

                              const yearsTotalOptimizedExt = Math.max(0, yearsTotalOriginalExt - (proventosResults.optimizationResult?.bestK || 0) / 12);
                              let percOptimizedExt = 0.60;
                              if (sim.ingressoCmc) {
                                percOptimizedExt = 0.60 + (yearsTotalOptimizedExt > 20 ? (Math.floor(yearsTotalOptimizedExt) - 20) * 0.02 : 0);
                                percOptimizedExt = Math.min(Math.max(percOptimizedExt, 0.60), 1.0);
                              }
                              const benefitOptimizedExt = (proventosResults.optimizationResult?.bestAverage || mediaSalarialGeral) * percOptimizedExt;
                              const diffValue = benefitOptimizedExt - benefitOriginalExt;

                              const isSelected = ext === selectedExt;

                              return (
                                <tr key={ext} className={`border-b last:border-0 hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-amber-50/70 border-l-[3px] border-l-amber-500 font-bold text-amber-950 font-sans' : ''}`}>
                                  <td className="py-2.5 px-3 font-semibold text-slate-800 flex items-center gap-1">
                                    {isSelected ? <span className="text-[9px] bg-amber-500 text-white rounded px-1.5 py-0.5 uppercase tracking-wider">Cenário Ativo</span> : null}
                                    {ext === 0 ? 'Elegibilidade Imediata' : `+ ${ext / 12} ${ext === 12 ? 'ano' : 'anos'}`}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono">
                                    {(percOriginalExt * 100).toFixed(0)}%
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    R$ {formatCurrency(benefitOriginalExt)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                    R$ {formatCurrency(benefitOptimizedExt)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-indigo-750">
                                    + R$ {formatCurrency(diffValue)}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
                );
              })() : null}

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm overflow-x-auto">
                <h5 className="font-bold text-[#004b8d] text-sm uppercase mb-3 border-b border-gray-200 pb-2">Memória de Cálculo Analítica</h5>
                <pre className="text-[10px] sm:text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">{proventosResults.log}</pre>
              </div>

              {opts.ge && proventosResults.geTotal > 0 && (
                <div className="bg-[#004b8d] text-white p-6 rounded-xl flex flex-col md:flex-row justify-between items-center shadow-lg mt-4">
                  <div>
                    <span className="font-bold uppercase tracking-wider text-sm md:text-base block">Benefício Final Combinado Estimado</span>
                    <span className="text-xs md:text-sm text-blue-200 mt-1 block">Soma de Proventos (Média/Cota) + Gratificação Especial Incorporada.</span>
                  </div>
                  <span className="text-3xl md:text-4xl font-bold tracking-tight mt-4 md:mt-0">
                    R$ {formatCurrency(proventosResults.benefit + proventosResults.geTotal)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="pt-8 text-center text-xs text-gray-400 font-semibold uppercase">Diretoria de Gestão de Pessoas - Elaborado pelo Sistema DGEP Web<br />{new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider">Executar Simulação</h2>
      <p className="text-sm text-gray-600">Selecione os módulos que deseja executar combinados em um único relatório para este servidor (<strong>{sim.nome || 'Não identificado'}</strong>, Matrícula: {sim.matricula || '-'}).</p>

      <div className="space-y-2 bg-gray-50 border border-gray-200 p-4 rounded-xl shadow-xs">
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer hover:bg-gray-100 p-2 rounded transition-all"><input type="checkbox" checked={opts.regras} onChange={(e) => setOpts(p => ({...p, regras: e.target.checked}))} className="w-4 h-4 text-[#004b8d]" />Regras de Aposentadoria e Elegibilidade</label>
        <label className="flex items-center gap-2 text-sm font-bold cursor-pointer hover:bg-gray-100 p-2 rounded transition-all"><input type="checkbox" checked={opts.proventos} onChange={(e) => setOpts(p => ({...p, proventos: e.target.checked}))} className="w-4 h-4 text-[#004b8d]" />Simulação de Proventos e Salário de Benefício</label>
        <label className={`flex items-center gap-2 text-sm font-bold cursor-pointer hover:bg-gray-100 p-2 rounded transition-all ${!geResults.isEligible ? 'opacity-60' : ''}`}>
          <input type="checkbox" checked={opts.ge} onChange={(e) => setOpts(p => ({...p, ge: e.target.checked}))} className="w-4 h-4 text-[#004b8d]" />
          Gratificação Especial (GE) {!geResults.isEligible && <span className="text-xs text-amber-600 font-semibold uppercase ml-1">(! Inelegível - Ingresso pós-2003)</span>}
        </label>
      </div>

      <div className="pt-4 flex flex-col sm:flex-row gap-4">
        <button className="flex-1 bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-all shadow-md uppercase tracking-wide flex justify-center items-center gap-2" onClick={() => setShowReport(true)}>Gerar Relatório Integrado</button>
      </div>
    </div>
  );
}
