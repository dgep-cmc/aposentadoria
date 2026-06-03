import { useState } from 'react';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  TrendingUp, 
  RefreshCw, 
  Award, 
  Menu, 
  ChevronLeft, 
  ChevronRight,
  Calculator, 
  UserCheck,
  Database,
  Layers,
  Inbox
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ activeTab, onSelectTab, isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, color: 'text-blue-500' },
    { id: 'simulacao_completa', label: 'Simulação Completa', icon: Layers, color: 'text-purple-400' },
    { id: 'simulacoes_salvas', label: 'Simulações Salvas', icon: Inbox, color: 'text-pink-400' },
    { id: 'proventos', label: 'Simulador Proventos', icon: TrendingUp, color: 'text-blue-600' },
    { id: 'regras', label: 'Simulador Regras', icon: ShieldAlert, color: 'text-emerald-600' },
    { id: 'atualizacao', label: 'Atualização de Contribuições', icon: RefreshCw, color: 'text-amber-600' },
    { id: 'gratificacao', label: 'Gratificação Especial', icon: Award, color: 'text-red-700' },
    { id: 'cadastros', label: 'Gestão de Cadastros', icon: Database, color: 'text-indigo-400' }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-[#001f3f]/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        className={`bg-[#002f5a] text-white flex flex-col justify-between h-screen fixed top-0 left-0 z-40 transition-transform duration-300 shadow-xl border-r border-[#001f3f] w-64 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header Branding */}
          <div className="flex items-center gap-3 p-4 border-b border-[#012547] relative">
            <div className="p-2 bg-white/10 rounded-lg text-white">
              <Calculator size={20} />
            </div>
            <div className="space-y-0.5 select-none animate-fade-in">
              <strong className="text-[11px] sm:text-xs font-extrabold tracking-tight uppercase block leading-none text-white/90">
                Simulador de Aposentadoria
              </strong>
              <span className="text-[10px] text-blue-200/70 font-semibold uppercase tracking-wider block">
                DGEP
              </span>
            </div>
          </div>

          {/* Navigation list */}
          <nav className="flex-1 p-3 space-y-1 pt-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer group hover:bg-white/10 ${
                    isActive 
                      ? 'bg-[#004b8d] text-white shadow-inner font-bold border-l-4 border-l-blue-400' 
                      : 'text-blue-100/80 hover:text-white'
                  }`}
                >
                  <Icon size={18} className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : item.color}`} />
                  <span className="whitespace-normal break-words text-left transition-opacity select-none leading-tight pt-0.5" style={{ wordBreak: 'break-word' }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>


      </aside>
    </>
  );
}
