import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProventosAposentadoria from './components/ProventosAposentadoria';
import RegrasAposentadoria from './components/RegrasAposentadoria';
import AtualizacaoContribuicoes from './components/AtualizacaoContribuicoes';
import GratificacaoEspecial from './components/GratificacaoEspecial';
import SimulacaoCompleta from './components/SimulacaoCompleta';
import SimulacoesSalvas from './components/SimulacoesSalvas';
import Cadastros from './components/Cadastros';
import { Scale, CheckCircle2, Menu, LogOut, ShieldAlert, UserCheck } from 'lucide-react';
import { initMigration } from './utils/simulationsStore';
import { loadSettingsFromServer } from './utils/settingsStore';
import { 
  auth, 
  loginWithGoogle, 
  logoutUser, 
  getRegisteredUser, 
  SystemUser,
  onAuthStateChanged,
  isFirebaseConfigured
} from './utils/firebase';
import { User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [systemUser, setSystemUser] = useState<SystemUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Monitor Google Login Authentication status & retrieve custom database profile
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoadingAuth(true);
      if (fbUser) {
        try {
          const regUser = await getRegisteredUser(fbUser.email || '');
          if (regUser && regUser.allowed) {
            setUser(fbUser);
            setSystemUser(regUser);
            setAccessDenied(false);
          } else {
            setUser(fbUser);
            setSystemUser(null);
            setAccessDenied(true);
          }
        } catch (e) {
          console.error("Error retrieving user permission: ", e);
          setUser(fbUser);
          setSystemUser(null);
          setAccessDenied(true);
        }
      } else {
        setUser(null);
        setSystemUser(null);
        setAccessDenied(false);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && systemUser && !appReady) {
      Promise.all([
        initMigration(),
        loadSettingsFromServer()
      ]).then(() => setAppReady(true));
    }
  }, [user, systemUser]);

  // Loading page spinner
  if (loadingAuth || (user && systemUser && !appReady)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f7f6] gap-3">
        <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-indigo-900 font-bold text-sm">Carregando sistema DGEP / IPMC...</div>
      </div>
    );
  }

  // Restrict screen rendering to authorized users
  if (!user || accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f7f6] p-4 text-[#212529] font-sans antialiased">
        <div className="w-full max-w-sm bg-white border border-[#dee2e6] rounded-2xl shadow-lg p-6 sm:p-8 space-y-6 text-center">
          {/* Logo brand */}
          <div className="space-y-1">
            <span className="text-[10px] text-indigo-750 font-bold uppercase tracking-wider block bg-indigo-50 text-indigo-800 py-1 px-3 rounded-full w-max mx-auto">
              DGEP — Diretoria de Gestão de Pessoas
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">
              Simulador de Aposentadoria
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm">
              Sistema de Simulação de Aposentadoria e Proventos
            </p>
          </div>

          <div className="border-t border-gray-100 my-4"></div>

          {/* User is authenticated but is not present in whitelist/allowed collection */}
          {accessDenied ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <ShieldAlert size={36} className="text-amber-500" />
                <h3 className="text-sm font-bold">Acesso Pendente de Aprovação</h3>
                <p className="text-xs text-amber-800 text-center leading-relaxed">
                  O e-mail <strong>{user?.email}</strong> não está cadastrado ou autorizado.
                </p>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed text-center">
                Os novos usuários devem ser incluídos de forma manual por um administrador do sistema. O e-mail <strong>diegofmartins@gmail.com</strong> já está configurado como Administrador Master.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => logoutUser()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs sm:text-sm rounded-lg transition-all cursor-pointer"
                >
                  <LogOut size={14} /> Sair e Usar Outra Conta
                </button>
              </div>
            </div>
          ) : (
            /* Google login trigger */
            <div className="space-y-4 animate-fade-in">
              <p className="text-xs sm:text-sm text-gray-550 leading-relaxed">
                Este simulador é de acesso exclusivo de servidores autorizados da Câmara Municipal de Curitiba. Faça login com sua conta do Google para prosseguir.
              </p>
              
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch (e: any) {
                    alert("Erro ao realizar o login do Google: " + e.message);
                  }
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Acessar com Cadastro Google
              </button>
            </div>
          )}
          
          <div className="text-[10px] text-gray-400 select-none pt-2">
            Diretoria de Gestão de Pessoas (DGEP) • CMC
          </div>
        </div>
      </div>
    );
  }

  const renderActiveSection = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tabId) => setActiveTab(tabId)} />;
      case 'proventos':
        return <ProventosAposentadoria />;
      case 'regras':
        return <RegrasAposentadoria />;
      case 'atualizacao':
        return <AtualizacaoContribuicoes />;
      case 'gratificacao':
        return <GratificacaoEspecial />;
      case 'simulacao_completa':
        return <SimulacaoCompleta />;
      case 'simulacoes_salvas':
        return <SimulacoesSalvas onNavigate={(tabId) => setActiveTab(tabId)} />;
      case 'cadastros':
        return <Cadastros />;
      default:
        return <Dashboard onNavigate={(tabId) => setActiveTab(tabId)} />;
    }
  };

  const getBreadcrumb = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Início';
      case 'proventos':
        return 'Cálculo de Proventos de Aposentadoria';
      case 'regras':
        return 'Elegibilidade de Regras IPMC';
      case 'atualizacao':
        return 'Atualização Monetária de Contribuições';
      case 'gratificacao':
        return 'Simulador de Gratificação Especial';
      case 'simulacao_completa':
        return 'Simulação Completa';
      case 'simulacoes_salvas':
        return 'Simulações Salvas';
      case 'cadastros':
        return 'Gestão de Cadastros';
      default:
        return 'Painel de Controle';
    }
  };

  return (
    <div className="flex bg-[#f4f7f6] min-h-screen text-[#212529] font-sans antialiased selection:bg-[#004b8d]/10">
      {/* Retractable Sidebar Menu */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

      {/* Main viewport area - offset for fixed sidebar width transition */}
      <div className="flex-1 flex flex-col pl-0 md:pl-64 transition-all duration-300 min-h-screen print:pl-0">
        
        {/* Dynamic Header Panel */}
        <header className="bg-white border-b border-[#dee2e6] py-4.5 px-4 sm:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="p-1 -ml-1 text-gray-500 hover:bg-gray-100 rounded-md md:hidden flex-shrink-0 cursor-pointer"
            >
              <Menu size={24} />
            </button>
            <div className="space-y-0.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                DGEP — Diretoria de Gestão de Pessoas
              </span>
              <h2 className="text-sm font-bold text-gray-800 leading-none">
                {getBreadcrumb()}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4 self-end sm:self-auto">
            {/* Logged in User Identity Card */}
            <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-150 py-1.5 px-3 rounded-xl">
              <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs select-none uppercase">
                {user.displayName ? user.displayName.substring(0, 2) : user.email?.substring(0, 2)}
              </div>
              <div className="text-left leading-tight hidden xl:block">
                <span className="text-[10px] font-bold text-gray-650 block">
                  {user.displayName || 'Servidor CMC'}
                </span>
                <span className="text-[9px] font-medium text-gray-400 block max-w-[120px] truncate">
                  {user.email}
                </span>
              </div>
              
              {systemUser?.role === 'admin' && (
                <span className="text-[9px] bg-red-100 text-red-700 font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" title="Administrador do Sistema">
                  Admin
                </span>
              )}

              <button
                type="button"
                onClick={() => logoutUser()}
                className="p-1 text-gray-400 hover:text-red-650 rounded-md hover:bg-red-50 cursor-pointer transition-all ml-1"
                title="Sair do Sistema"
              >
                <LogOut size={13} />
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-gray-400 font-semibold block leading-none">
                Data do Sistema
              </span>
              <strong className="text-xs font-bold text-gray-700 block mt-0.5 select-none">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </strong>
            </div>
            {!isFirebaseConfigured && (
              <span className="text-[9px] bg-amber-50 text-amber-700 font-bold border border-amber-200 uppercase tracking-widest px-2 py-0.5 rounded-full" title="Firebase não detectado. Usando armazenamento offline local.">
                Modo Offline
              </span>
            )}
            <div 
              className={`h-2 w-2 rounded-full animate-pulse outline outline-3 transition-colors duration-300 ${
                isFirebaseConfigured 
                  ? 'bg-emerald-500 outline-emerald-500/20' 
                  : 'bg-amber-500 outline-amber-500/20'
              }`} 
              title={isFirebaseConfigured ? "Firebase Conectado" : "Firebase Desconectado (Usando Modo Offline)"} 
            />
          </div>
        </header>

        {/* Dynamic section wrapper container */}
        <main className="flex-1 p-4 sm:p-8 overflow-x-hidden print:p-0">
          <div className="animate-fade-in duration-200">
            {renderActiveSection()}
          </div>
        </main>
        
        {/* Global Footer */}
        <footer className="py-6 px-8 border-t border-[#dee2e6] text-center text-xs text-gray-400 print:hidden select-none">
          Portal Integrado DGEP / IPMC — Versão 3.12 • Câmara Municipal de Curitiba
        </footer>
      </div>
    </div>
  );
}
