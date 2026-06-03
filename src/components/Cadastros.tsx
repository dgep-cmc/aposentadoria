import React, { useState, useEffect } from 'react';
import { 
  Save, 
  RotateCcw, 
  Award, 
  Briefcase, 
  CheckCircle, 
  HelpCircle, 
  AlertCircle,
  TrendingUp,
  Search,
  Sliders,
  Database,
  Info,
  Users,
  UserPlus,
  Trash2,
  Shield,
  UserCheck,
  XCircle,
  X
} from 'lucide-react';
import { 
  romanNumerals, 
  careerDisplayNames 
} from '../data/careers';
import { 
  getSavedCareerData, 
  getSavedFGValues, 
  getSavedFatoresINSS,
  getSavedSalaryCaps,
  saveCareerData, 
  saveFGValues, 
  saveFatoresINSS,
  saveSalaryCaps,
  resetSettingsToDefaults,
  CareerDataType,
  FGValuesType,
  FatoresINSSData,
  defaultFatoresINSS,
  SalaryCapType,
  defaultSalaryCap
} from '../utils/settingsStore';
import { 
  auth, 
  getRegisteredUser, 
  SystemUser, 
  getAllRegisteredUsers, 
  saveRegisteredUser, 
  deleteRegisteredUser 
} from '../utils/firebase';

export default function Cadastros() {
  // Tabs in order: 'users' | 'fatores' | 'careers' | 'fgs' | 'salaryCaps'
  const [activeTab, setActiveTab] = useState<'users' | 'fatores' | 'careers' | 'fgs' | 'salaryCaps'>('users');
  
  // Selected career for career editing
  const [selectedCareer, setSelectedCareer] = useState<string>('assistente_administrativo');
  const [searchFilter, setSearchFilter] = useState('');

  // Firebase Users State
  const [usersList, setUsersList] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  // User Registration form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserNome, setNewUserNome] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [newUserAllowed, setNewUserAllowed] = useState<boolean>(true);

  // Local state for loaded data (allows batch editing before saving)
  const [careersData, setCareersData] = useState<CareerDataType>(() => {
    const loaded = getSavedCareerData();
    const draft = localStorage.getItem('dgep_draft_career_data');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed && Object.keys(parsed).length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return loaded;
  });

  const [fgValues, setFgValues] = useState<FGValuesType>(() => {
    const loaded = getSavedFGValues();
    const draft = localStorage.getItem('dgep_draft_fg_values');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed && typeof parsed === 'object' && parsed.FG4 > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return loaded;
  });

  const [fatoresINSS, setFatoresINSS] = useState<FatoresINSSData>(() => {
    const loaded = getSavedFatoresINSS();
    const draft = localStorage.getItem('dgep_draft_fatores_inss');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed && (parsed.referenceMonthYear || parsed.fatoresText)) {
          return parsed;
        }
      } catch (e) {}
    }
    return loaded;
  });

  // Load monthly factors when selecting a different month/year from history
  useEffect(() => {
    if (fatoresINSS.referenceMonthYear) {
      const history = fatoresINSS.history || {};
      const savedTextForMonth = history[fatoresINSS.referenceMonthYear] || '';
      if (fatoresINSS.fatoresText !== savedTextForMonth) {
        setFatoresINSS(prev => ({
          ...prev,
          fatoresText: savedTextForMonth
        }));
      }
    }
  }, [fatoresINSS.referenceMonthYear]);

  const [salaryCaps, setSalaryCaps] = useState<SalaryCapType>(() => {
    const loaded = getSavedSalaryCaps();
    const draft = localStorage.getItem('dgep_draft_salary_caps');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed && typeof parsed === 'object' && parsed.general > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return loaded;
  });

  // Base persistent states to compare with (isDirty checks)
  const [pristineCareersData, setPristineCareersData] = useState<CareerDataType>(() => {
    return JSON.parse(JSON.stringify(getSavedCareerData()));
  });
  const [pristineFgValues, setPristineFgValues] = useState<FGValuesType>(() => {
    return JSON.parse(JSON.stringify(getSavedFGValues()));
  });
  const [pristineFatoresINSS, setPristineFatoresINSS] = useState<FatoresINSSData>(() => {
    return JSON.parse(JSON.stringify(getSavedFatoresINSS()));
  });
  const [pristineSalaryCaps, setPristineSalaryCaps] = useState<SalaryCapType>(() => {
    return JSON.parse(JSON.stringify(getSavedSalaryCaps()));
  });

  // Action status messages
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | ''; message: string }>({
    type: '', message: ''
  });
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Load saved tab on mount
  useEffect(() => {
    const draftTab = localStorage.getItem('dgep_draft_cadastros_tab');
    if (draftTab === 'users' || draftTab === 'careers' || draftTab === 'fgs' || draftTab === 'fatores') {
      setActiveTab(draftTab as any);
    }
    
    const draftSearch = localStorage.getItem('dgep_draft_cadastros_search');
    if (draftSearch) setSearchFilter(draftSearch);
    
    const draftSelectedCareer = localStorage.getItem('dgep_draft_cadastros_selected_career');
    if (draftSelectedCareer) setSelectedCareer(draftSelectedCareer);
  }, []);

  // Fetch Firestore users list and check current user authorization level
  const loadUsersAndPrivileges = async () => {
    try {
      setLoadingUsers(true);
      const email = auth.currentUser?.email || '';
      if (email) {
        const profile = await getRegisteredUser(email);
        setIsAdminUser(profile?.role === 'admin' || email === 'diegofmartins@gmail.com');
      }
      
      const list = await getAllRegisteredUsers();
      setUsersList(list);
    } catch (e) {
      console.error("Error loading system authorization data: ", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsersAndPrivileges();
  }, [activeTab]);

  // Sync drafts to local storage
  useEffect(() => {
    if (Object.keys(careersData).length > 0) {
      localStorage.setItem('dgep_draft_career_data', JSON.stringify(careersData));
    }
  }, [careersData]);

  useEffect(() => {
    if (Object.keys(fgValues).length > 0 && fgValues.FG4 > 0) {
      localStorage.setItem('dgep_draft_fg_values', JSON.stringify(fgValues));
    }
  }, [fgValues]);

  useEffect(() => {
    if (fatoresINSS.referenceMonthYear || fatoresINSS.fatoresText) {
      localStorage.setItem('dgep_draft_fatores_inss', JSON.stringify(fatoresINSS));
    }
  }, [fatoresINSS]);

  useEffect(() => {
    if (salaryCaps.general > 0) {
      localStorage.setItem('dgep_draft_salary_caps', JSON.stringify(salaryCaps));
    }
  }, [salaryCaps]);

  useEffect(() => {
    localStorage.setItem('dgep_draft_cadastros_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('dgep_draft_cadastros_search', searchFilter);
  }, [searchFilter]);

  useEffect(() => {
    localStorage.setItem('dgep_draft_cadastros_selected_career', selectedCareer);
  }, [selectedCareer]);

  // Is database currently modified?
  const isCareersDirty = JSON.stringify(careersData) !== JSON.stringify(pristineCareersData);
  const isFGSDirty = JSON.stringify(fgValues) !== JSON.stringify(pristineFgValues);
  const isFatoresDirty = JSON.stringify(fatoresINSS) !== JSON.stringify(pristineFatoresINSS);
  const isSalaryCapsDirty = JSON.stringify(salaryCaps) !== JSON.stringify(pristineSalaryCaps);
  const isDirty = activeTab !== 'users' && (isCareersDirty || isFGSDirty || isFatoresDirty || isSalaryCapsDirty);

  // Utility to show notification
  const showNotificationObj = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification({ type: '', message: '' });
    }, 4000);
  };

  // User Actions (Create, Delete, Toggle access)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserNome.trim()) {
      showNotificationObj('error', 'Por favor, preencha o nome e o e-mail do usuário.');
      return;
    }
    
    // Strict email check
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(newUserEmail.trim())) {
      showNotificationObj('error', 'O formato do e-mail inserido é inválido.');
      return;
    }

    try {
      const newUser: SystemUser = {
        email: newUserEmail.trim().toLowerCase(),
        nome: newUserNome.trim(),
        role: newUserRole,
        allowed: newUserAllowed,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveRegisteredUser(newUser);
      showNotificationObj('success', `Usuário ${newUser.nome} cadastrado com sucesso!`);
      setNewUserEmail('');
      setNewUserNome('');
      setNewUserRole('user');
      setNewUserAllowed(true);
      loadUsersAndPrivileges();
    } catch (err: any) {
      showNotificationObj('error', `Falha ao registrar usuário: ${err.message}`);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email === auth.currentUser?.email || email === 'diegofmartins@gmail.com') {
      showNotificationObj('error', 'Não é possível remover a si mesmo ou o Administrador Master do sistema.');
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir as permissões do usuário ${email}?`)) {
      try {
        await deleteRegisteredUser(email);
        showNotificationObj('success', 'Usuário removido com sucesso!');
        loadUsersAndPrivileges();
      } catch (err: any) {
        showNotificationObj('error', `Erro ao remover usuário: ${err.message}`);
      }
    }
  };

  const handleToggleUserAccess = async (userObj: SystemUser) => {
    if (userObj.email === 'diegofmartins@gmail.com') {
      showNotificationObj('error', 'Não é permitido desautorizar o Administrador Master do sistema.');
      return;
    }

    try {
      const updatedUser: SystemUser = {
        ...userObj,
        allowed: !userObj.allowed
      };
      await saveRegisteredUser(updatedUser);
      showNotificationObj('success', `Status de acesso do usuário ${userObj.nome} atualizado com sucesso!`);
      loadUsersAndPrivileges();
    } catch (err: any) {
      showNotificationObj('error', `Erro ao alterar status: ${err.message}`);
    }
  };

  // String formatting helpers
  const formatValueBRL = (val: number): string => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Currency masking on user input to enforce BRL visual layout
  const handleCareerLevelChange = (band: string, inputVal: string) => {
    let numericOnly = inputVal.replace(/\D/g, '');
    const numericInt = parseInt(numericOnly, 10) || 0;
    const decimalValue = numericInt / 100;

    setCareersData(prev => {
      const updatedCareer = { ...prev[selectedCareer] };
      updatedCareer[band] = decimalValue;
      return {
        ...prev,
        [selectedCareer]: updatedCareer
      };
    });
  };

  const handleFGValueChange = (fgKey: keyof FGValuesType, inputVal: string) => {
    let numericOnly = inputVal.replace(/\D/g, '');
    const numericInt = parseInt(numericOnly, 10) || 0;
    const decimalValue = numericInt / 100;

    setFgValues(prev => ({
      ...prev,
      [fgKey]: decimalValue
    }));
  };

  const handleSalaryCapChange = (capKey: keyof SalaryCapType, inputVal: string) => {
    let numericOnly = inputVal.replace(/\D/g, '');
    const numericInt = parseInt(numericOnly, 10) || 0;
    const decimalValue = numericInt / 100;

    setSalaryCaps(prev => ({
      ...prev,
      [capKey]: decimalValue
    }));
  };

  // Search career list
  const filteredCareers = Object.entries(careerDisplayNames).filter(([key, name]) => {
    return name.toLowerCase().includes(searchFilter.toLowerCase()) || key.toLowerCase().includes(searchFilter.toLowerCase());
  });

  // Save changes
  const handleSaveAll = () => {
    try {
      if (activeTab === 'careers') {
        saveCareerData(careersData);
        setPristineCareersData(JSON.parse(JSON.stringify(careersData)));
        localStorage.removeItem('dgep_draft_career_data');
        showNotificationObj('success', 'Os valores dos salários por cargo foram salvos e aplicados com sucesso!');
      } else if (activeTab === 'fgs') {
        saveFGValues(fgValues);
        setPristineFgValues(JSON.parse(JSON.stringify(fgValues)));
        localStorage.removeItem('dgep_draft_fg_values');
        showNotificationObj('success', 'Os valores das Funções Gratificadas (FGs) foram salvos e aplicados com sucesso!');
      } else if (activeTab === 'fatores') {
        saveFatoresINSS(fatoresINSS);
        const saved = getSavedFatoresINSS();
        setFatoresINSS(saved);
        setPristineFatoresINSS(JSON.parse(JSON.stringify(saved)));
        localStorage.removeItem('dgep_draft_fatores_inss');
        showNotificationObj('success', 'A tabela de Fatores de Conversão foi salva e aplicada com sucesso!');
      } else if (activeTab === 'salaryCaps') {
        saveSalaryCaps(salaryCaps);
        setPristineSalaryCaps(JSON.parse(JSON.stringify(salaryCaps)));
        localStorage.removeItem('dgep_draft_salary_caps');
        showNotificationObj('success', 'Os limites do Teto Constitucional foram salvos e aplicados com sucesso!');
      }
      setShowConfirmSave(false);
    } catch (err: any) {
      showNotificationObj('error', `Falha ao salvar as configurações: ${err.message}`);
      setShowConfirmSave(false);
    }
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    resetSettingsToDefaults();
    localStorage.removeItem('dgep_draft_career_data');
    localStorage.removeItem('dgep_draft_fg_values');
    localStorage.removeItem('dgep_draft_salary_caps');
    const loadedCareers = getSavedCareerData();
    const loadedFGs = getSavedFGValues();
    const loadedSalaryCaps = getSavedSalaryCaps();
    setCareersData(loadedCareers);
    setPristineCareersData(JSON.parse(JSON.stringify(loadedCareers)));
    setFgValues(loadedFGs);
    setPristineFgValues(JSON.parse(JSON.stringify(loadedFGs)));
    setSalaryCaps(loadedSalaryCaps);
    setPristineSalaryCaps(JSON.parse(JSON.stringify(loadedSalaryCaps)));
    setShowConfirmReset(false);
    showNotificationObj('success', 'Os salários base, referências das FGs e limites do Teto Constitucional foram restaurados com sucesso para os padrões. O cadastro dos Fatores de Conversão foi preservado.');
  };

  const currentCareerValues = careersData[selectedCareer] || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Controls */}
      <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Database className="text-indigo-650" size={24} />
              Gestão de Cadastros
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">
              Painel administrativo para controle de acesso de usuários e parametrização dos fatores, cargos e funções do sistema
            </p>
          </div>
          <button 
            type="button" 
            onClick={() => setShowConfirmReset(true)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-gray-50 border border-gray-200 text-gray-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <RotateCcw size={13} /> Restaurar Padrões
          </button>
        </div>

        {/* Notifications and Toasts */}
        {notification.message && (
          <div className={`flex gap-2.5 p-4 border rounded-lg leading-relaxed text-xs sm:text-sm animate-fade-in ${
            notification.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold">
                {notification.type === 'success' ? 'Operação realizada: ' : 'Erro de validação: '}
              </span> 
              {notification.message}
            </div>
          </div>
        )}

        {/* Navigation Tabs - Reordered as requested */}
        <div className="flex border-b border-gray-200 overflow-x-auto w-full scrollbar-none">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={16} /> Usuários
          </button>
          <button
            onClick={() => setActiveTab('fatores')}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'fatores'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp size={16} /> Fatores de Conversão
          </button>
          <button
            onClick={() => setActiveTab('careers')}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'careers'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Briefcase size={16} /> Salários Base por Cargo
          </button>
          <button
            onClick={() => setActiveTab('fgs')}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'fgs'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Award size={16} /> Funções Gratificadas
          </button>
          <button
            onClick={() => setActiveTab('salaryCaps')}
            className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'salaryCaps'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sliders size={16} /> Teto Constitucional
          </button>
        </div>

        {/* Info panel */}
        <div className="flex items-start gap-2.5 p-4 bg-blue-50/50 border border-blue-100 text-[#004b8d] rounded-lg text-xs">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-600" />
          <div>
            {activeTab === 'users' ? (
              <span>Os usuários cadastrados nesta tela possuem acesso controlado via Google Authentication. Apenas administradores do sistema têm permissão para adicionar ou remover perfis de acesso.</span>
            ) : (
              <span>As calculadoras do **Simulador de Proventos** e da **Gratificação Especial** utilizam em tempo real os valores cadastrados neste painel. Quaisquer alterações salvas aqui afetarão imediatamente as projeções salariais.</span>
            )}
          </div>
        </div>

        {/* Unsaved changes alert */}
        {isDirty && (
          <div className="flex items-center gap-2.5 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs sm:text-sm animate-fade-in shadow-2xs">
            <AlertCircle size={18} className="shrink-0 text-amber-655 animate-pulse" />
            <div>
              <span className="font-bold">Alterações pendentes de salvamento:</span> Você alterou valores da tabela administrativa que ainda não foram gravados localmente. Clique em <strong>Salvar Parâmetros do Cadastro</strong> para confirmar e sincronizar.
            </div>
          </div>
        )}

        {/* USER ADMINISTRATION SCREEN */}
        {activeTab === 'users' && (
          <div className="space-y-6 pt-2">
            
            {/* Form to manual register users - visible for admin eyes only */}
            {isAdminUser ? (
              <form onSubmit={handleCreateUser} className="bg-gray-50 border border-gray-150 rounded-xl p-5 space-y-4 shadow-3xs">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 pb-2 border-b border-gray-200/60">
                  <UserPlus size={16} className="text-indigo-600" />
                  Cadastrar Novo Usuário Autorizado
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">Nome Completo</label>
                    <input
                      type="text"
                      required
                      value={newUserNome}
                      onChange={(e) => setNewUserNome(e.target.value)}
                      placeholder="Ex: Maria Souza"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1.5 focus:ring-indigo-600 transition-all text-gray-800 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">E-mail (Google)</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="Ex: m.souza@gmail.com"
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1.5 focus:ring-indigo-600 transition-all text-gray-800 font-medium font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">Perfil / Permissão</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1.5 focus:ring-indigo-600 transition-all text-gray-800 font-medium"
                    >
                      <option value="user">Usuário Comum</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    <UserPlus size={14} /> Registrar Usuário
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 text-amber-850 rounded-lg text-xs">
                <AlertCircle size={15} />
                Caso precise cadastrar algum colega, solicite à administração (<strong>diegofmartins@gmail.com</strong>) para registrá-lo. Apenas portadores de perfil Administrador possuem permissões de cadastro.
              </div>
            )}

            {/* List of Whitelisted Users */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-3xs">
              <div className="px-5 py-4 border-b border-gray-150 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Relação de Usuários Autorizados ({usersList.length})
                </h3>
                {loadingUsers && (
                  <span className="text-[10px] text-gray-400 font-medium block animate-pulse">Sincronizando...</span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-150 bg-gray-50 text-gray-500 uppercase tracking-wide font-bold">
                      <th className="py-3 px-4">Nome Completo</th>
                      <th className="py-3 px-4">E-mail de Acesso</th>
                      <th className="py-3 px-4 text-center">Perfil</th>
                      <th className="py-3 px-4 text-center">Acesso</th>
                      {isAdminUser && <th className="py-3 px-4 text-center">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {usersList.map((usr) => (
                      <tr key={usr.email} className="hover:bg-gray-50/30 transition-all text-gray-700">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{usr.nome}</td>
                        <td className="py-3.5 px-4 font-mono font-normal text-gray-550">{usr.email}</td>
                        <td className="py-3.5 px-4 text-center">
                          {usr.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold uppercase text-[9px] tracking-wide">
                              <Shield size={10} /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold uppercase text-[9px] tracking-wide">
                              Membro
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {usr.allowed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wide">
                              ● Liberado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[9px] uppercase tracking-wide">
                              ● Bloqueado
                            </span>
                          )}
                        </td>
                        {isAdminUser && (
                          <td className="py-3.5 px-4 text-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleToggleUserAccess(usr)}
                              disabled={usr.email === 'diegofmartins@gmail.com'}
                              className={`p-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wide transition-all ${
                                usr.email === 'diegofmartins@gmail.com'
                                  ? 'opacity-30 cursor-not-allowed border-gray-105 bg-gray-50 text-gray-400'
                                  : usr.allowed
                                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 cursor-pointer'
                                    : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer'
                              }`}
                              title={usr.allowed ? 'Alternar para Bloquear acesso' : 'Reverter para Autorizar acesso'}
                            >
                              {usr.allowed ? 'Bloquear' : 'Autorizar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(usr.email)}
                              disabled={usr.email === auth.currentUser?.email || usr.email === 'diegofmartins@gmail.com'}
                              className={`p-1.5 rounded-lg border inline-flex items-center justify-center transition-all ${
                                usr.email === auth.currentUser?.email || usr.email === 'diegofmartins@gmail.com'
                                  ? 'opacity-30 cursor-not-allowed border-gray-105 bg-gray-50 text-gray-400'
                                  : 'border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 cursor-pointer'
                              }`}
                              title="Remover cadastro permanentemente"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr>
                        <td colSpan={isAdminUser ? 5 : 4} className="py-8 px-4 text-center italic text-gray-400">
                          Nenhum usuário foi cadastrado na base de dados do Firestore.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'careers' && (
          /* SECTION 1: CAREERS GRID EDITOR */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-2">
            
            {/* Left sidebar: Career Listing & Search */}
            <div className="lg:col-span-4 space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Selecionar Cargo Efetivo
              </label>
              
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrar cargos listados..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 rounded-lg text-xs sm:text-sm"
                />
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[460px] overflow-y-auto divide-y divide-gray-100 bg-white shadow-2xs">
                {filteredCareers.map(([key, name]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCareer(key)}
                    className={`w-full text-left p-3 text-xs sm:text-sm font-semibold transition-all hover:bg-gray-50 flex items-center justify-between cursor-pointer ${
                      selectedCareer === key
                        ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600 text-indigo-900 font-bold'
                        : 'text-gray-600'
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full group-hover:bg-indigo-100">
                      36 faixas
                    </span>
                  </button>
                ))}
                {filteredCareers.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400 italic">
                    Nenhum cargo coincide com a pesquisa.
                  </div>
                )}
              </div>
            </div>

            {/* Right container: River Grid Editor */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-indigo-50/40 p-4 border border-indigo-100/40 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">
                    {careerDisplayNames[selectedCareer] || selectedCareer}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Modifique diretamente no campo de texto o salário básico cadastrado para cada faixa (BRL)
                  </p>
                </div>
                <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded-full uppercase">
                  Cargo ID: {selectedCareer}
                </span>
              </div>

              {/* Faixas Grid list */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border border-gray-200 rounded-xl p-4 bg-[#fcfdfe] max-h-[400px] overflow-y-auto shadow-2xs">
                {romanNumerals.map((band) => {
                  const currentVal = currentCareerValues[band] ?? 0;
                  return (
                    <div 
                      key={band}
                      className="border border-gray-100 bg-white hover:bg-gray-50/50 p-2 rounded-lg flex flex-col gap-1 transition-all"
                    >
                      <label className="text-[10px] uppercase font-bold text-gray-400 font-mono">
                        Nível {band}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-[11px] text-gray-400 font-bold select-none">R$</span>
                        <input
                          type="text"
                          value={formatValueBRL(currentVal)}
                          onChange={(e) => handleCareerLevelChange(band, e.target.value)}
                          className="w-full pl-7 pr-2 py-1 bg-[#fbfcfd] border border-gray-200 focus:bg-white focus:outline-none focus:ring-1.5 focus:ring-indigo-600/20 focus:border-indigo-600 rounded-md text-xs font-bold text-gray-800 text-right font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fgs' && (
          /* SECTION 2: FG REFERENCES EDITOR */
          <div className="space-y-6 pt-2">
            <div className="bg-[#fcfdfe] border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Referências de Função Gratificada (FGs)
                </h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  Ajuste o teto fixo de remuneração complementar regulamentar utilizado nos cálculos de Incorporação Proporcional.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {(Object.keys(fgValues) as Array<keyof FGValuesType>).sort().map((fgKey) => {
                  const val = fgValues[fgKey] ?? 0;
                  return (
                    <div 
                      key={fgKey} 
                      className="bg-white border hover:bg-red-50/5 hover:border-red-200 border-gray-200/50 p-4 rounded-xl flex flex-col gap-2 shadow-2xs transition-all text-center"
                    >
                      <span className="inline-flex self-center px-3 py-1 bg-red-50 text-red-700 text-xs font-bold font-mono rounded-full uppercase tracking-wider">
                        {fgKey}
                      </span>
                      <div className="relative mt-2">
                        <span className="absolute left-2.5 top-2 text-[11px] text-gray-400 font-semibold select-none">R$</span>
                        <input
                          type="text"
                          value={formatValueBRL(val)}
                          onChange={(e) => handleFGValueChange(fgKey, e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 border border-gray-250 focus:outline-none focus:ring-1.5 focus:ring-indigo-600/20 focus:border-indigo-600 rounded-md text-xs font-black text-gray-855 text-right font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fatores' && (
          /* SECTION 3: FATORES INSS EDITOR */
          <div className="space-y-6 pt-2">
            <div className="bg-[#fcfdfe] border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Índice de atualização das contribuições para cálculo do salário-de-benefício
                </h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  Insira os fatores informados pelo Ministério da Previdência atualizados para manter a calculadora de atualização sincronizada com o referencial do mês.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Mês/Ano de Referência da Planilha
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={fatoresINSS.referenceMonthYear.split('/')[0] || ''}
                      onChange={(e) => {
                        const currentYear = fatoresINSS.referenceMonthYear.split('/')[1] || new Date().getFullYear().toString();
                        setFatoresINSS(prev => ({ ...prev, referenceMonthYear: `${e.target.value}/${currentYear}` }));
                      }}
                      className="w-full p-2.5 bg-white border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 rounded-lg transition-all text-sm font-medium"
                    >
                      <option value="" disabled>Selecione o Mês</option>
                      {['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={fatoresINSS.referenceMonthYear.split('/')[1] || ''}
                      onChange={(e) => {
                        const currentMonth = fatoresINSS.referenceMonthYear.split('/')[0] || 'Janeiro';
                        setFatoresINSS(prev => ({ ...prev, referenceMonthYear: `${currentMonth}/${e.target.value}` }));
                      }}
                      className="w-1/2 p-2.5 bg-white border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 rounded-lg transition-all text-sm font-medium"
                    >
                      <option value="" disabled>Ano</option>
                      {Array.from({length: 16}, (_, i) => 2020 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[10px] text-gray-400 block pb-1">
                    Este texto será exibido na calculadora para guiar o usuário sobre a validade da tabela.
                  </span>
                </div>
                
                <div className="col-span-1 md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Conteúdo Extraído da Planilha (Cópia e Cola)
                  </label>
                  <textarea
                    rows={12}
                    value={fatoresINSS.fatoresText}
                    onChange={(e) => setFatoresINSS(prev => ({ ...prev, fatoresText: e.target.value }))}
                    placeholder="Exemplo para preenchimento:&#10;jan/26 1,026961&#10;fev/26 1,022970&#10;mar/26 1,017274&#10;abr/26 1,008100"
                    className="w-full p-3 font-mono text-xs sm:text-sm bg-white border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 rounded-lg transition-all leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'salaryCaps' && (
          /* SECTION 5: SALARY CAPS EDITOR */
          <div className="space-y-6 pt-2">
            <div className="bg-[#fcfdfe] border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Teto Constitucional
                </h3>
                <p className="text-[11px] text-gray-500 mt-1">
                  Ajuste os valores limites de teto constitucional para remunerações atuais e projetadas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white border hover:bg-slate-50/5 hover:border-slate-200 border-gray-200/50 p-5 rounded-xl flex flex-col gap-3 shadow-2xs transition-all">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Teto Geral (Demais Cargos)
                  </span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-semibold select-none">R$</span>
                    <input
                      type="text"
                      value={formatValueBRL(salaryCaps.general)}
                      onChange={(e) => handleSalaryCapChange('general', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-250 focus:outline-none focus:ring-1.5 focus:ring-indigo-600/20 focus:border-indigo-600 rounded-lg text-sm font-black text-gray-855 text-right font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Teto municipal de remuneração aplicável aos servidores de carreira geral (Padrão: R$ 37.068,57).
                  </span>
                </div>

                <div className="bg-white border hover:bg-slate-50/5 hover:border-slate-200 border-gray-200/50 p-5 rounded-xl flex flex-col gap-3 shadow-2xs transition-all">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    Teto para Procurador Jurídico
                  </span>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-semibold select-none">R$</span>
                    <input
                      type="text"
                      value={formatValueBRL(salaryCaps.procurador)}
                      onChange={(e) => handleSalaryCapChange('procurador', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-250 focus:outline-none focus:ring-1.5 focus:ring-indigo-600/20 focus:border-indigo-600 rounded-lg text-sm font-black text-gray-855 text-right font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Limite constitucional diferenciado para os ocupantes do cargo de Procurador Jurídico (Padrão: R$ 46.366,19).
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Action Save bar - Only visible for parameters tabs */}
        {activeTab !== 'users' && (
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100 items-center justify-between">
            <div className="text-xs">
              {isDirty ? (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5 animate-pulse">
                  ● Alterações pendentes de salvamento
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                  ● Configurações salvas e sincronizadas
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmSave(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 py-3 px-8 text-white font-bold text-sm bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer"
            >
              <Save size={15} /> Salvar Parâmetros do Cadastro
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Save Modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-[#dee2e6] max-w-sm w-full p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Save size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Confirmar Salvamento?</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              Tem certeza que deseja aplicar e salvar os novos parâmetros? Todas as calculadoras passarão a utilizar estes novos valores atualizados do cadastro imediatamente.
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowConfirmSave(false)}
                className="flex-1 py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-750 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleSaveAll}
                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg cursor-pointer transition-all shadow-xs"
              >
                Sim, Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Reset Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg border border-[#dee2e6] max-w-sm w-full p-6 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-650">
              <RotateCcw size={24} />
            </div>
            <h3 className="text-lg font-bold text-red-700">Restaurar Valores Padrão?</h3>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              Tem certeza de que deseja descartar as alterações atuais e retornar para as tabelas de salários e FGs padrão (incluindo os cadastros cristalizados de fábrica)?
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-750 text-xs sm:text-sm font-semibold rounded-lg cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={handleResetDefaults}
                className="flex-1 py-2 px-4 bg-red-650 hover:bg-red-755 text-white text-xs sm:text-sm font-semibold rounded-lg cursor-pointer transition-all shadow-xs"
              >
                Sim, Reverter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
