import React, { useState, useEffect } from 'react';
import { getSavedSimulations, deleteSimulation, saveSimulation, UnifiedSimulation } from '../utils/simulationsStore';
import { FileText, Trash2, Calendar, User, Briefcase, PlaySquare, ArrowUpDown, ChevronDown, ChevronUp, AlertTriangle, Copy } from 'lucide-react';

interface SimulacoesSalvasProps {
  onNavigate?: (tab: string) => void;
}

type SortField = 'nome' | 'matricula' | 'data';
type SortDirection = 'asc' | 'desc';

export default function SimulacoesSalvas({ onNavigate }: SimulacoesSalvasProps) {
  const [simulations, setSimulations] = useState<UnifiedSimulation[]>([]);
  const [sortField, setSortField] = useState<SortField>('data');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [simulationToDelete, setSimulationToDelete] = useState<UnifiedSimulation | null>(null);

  useEffect(() => {
    loadSimulations();
  }, []);

  const loadSimulations = async () => {
    const data = await getSavedSimulations();
    setSimulations(data);
  };

  const handleDeleteClick = (sim: UnifiedSimulation) => {
    setSimulationToDelete(sim);
    setDeleteTargetId(sim.id);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      await deleteSimulation(deleteTargetId);
      setDeleteTargetId(null);
      setSimulationToDelete(null);
      loadSimulations();
    }
  };

  const cancelDelete = () => {
    setDeleteTargetId(null);
    setSimulationToDelete(null);
  };

  const handleResume = (sim: UnifiedSimulation) => {
    // Save as draft to load context
    localStorage.setItem('dgep_unified_draft', JSON.stringify(sim));
    if (onNavigate) {
      onNavigate('simulacao_completa');
    } else {
      alert("Simulação carregada! Navegue até a tela 'Fluxo Combinado de Simulação' para continuar.");
    }
  };

  const handleCopy = async (sim: UnifiedSimulation) => {
    try {
      const copiedSim: UnifiedSimulation = {
        ...sim,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
        nome: `Cópia de ${sim.nome || 'Servidor Sem Nome'}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveSimulation(copiedSim);
      await loadSimulations();
    } catch (e) {
      console.error("Erro ao copiar simulação:", e);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedSimulations = [...simulations].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'nome':
        comparison = (a.nome || '').localeCompare(b.nome || '');
        break;
      case 'matricula':
        comparison = (a.matricula || '').localeCompare(b.matricula || '');
        break;
      case 'data':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-gray-400 opacity-50 ml-1" />;
    return sortDir === 'asc' ? <ChevronUp size={14} className="text-[#004b8d] ml-1" /> : <ChevronDown size={14} className="text-[#004b8d] ml-1" />;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-4 mb-4">
          <FileText className="text-[#004b8d]" size={24} />
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 uppercase">Simulações Salvas</h2>
        </div>
        
        <p className="text-sm text-gray-500 mb-6">
          Nesta tela você encontra o histórico de simulações integradas salvas. Clique em carregar para abrir a simulação diretamente.
        </p>

        {simulations.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500 font-medium">Nenhuma simulação salva no banco de dados local.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider select-none">
                  <tr>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('nome')}>
                      <div className="flex items-center">
                        Servidor / Cargo
                        <SortIcon field="nome" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('matricula')}>
                      <div className="flex items-center">
                        Matrícula
                        <SortIcon field="matricula" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('data')}>
                      <div className="flex items-center">
                        Última Modificação
                        <SortIcon field="data" />
                      </div>
                    </th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/80 text-gray-700">
                  {sortedSimulations.map((sim) => (
                    <tr key={sim.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <User size={14} className="text-gray-400" />
                          {sim.nome || 'Servidor Sem Nome'}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 uppercase w-full truncate max-w-[300px]">
                          <Briefcase size={12} className="text-[#004b8d]" />
                          {(sim.cargo || sim.selectedCareer).replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs">{sim.matricula || '---'}</td>
                      <td className="p-4 text-xs font-medium text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          {new Date(sim.updatedAt).toLocaleDateString('pt-BR')} às {new Date(sim.updatedAt).toLocaleTimeString('pt-BR')}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleResume(sim)}
                            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 text-xs rounded-lg transition-all"
                            title="Carregar Simulação"
                          >
                            <PlaySquare size={14} /> Carregar
                          </button>
                          <button 
                            onClick={() => handleCopy(sim)}
                            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 text-xs rounded-lg transition-all"
                            title="Copiar/Duplicar Simulação"
                          >
                            <Copy size={13} /> Copiar
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(sim)}
                            className="bg-red-50 hover:bg-red-100 text-red-700 p-1.5 rounded-lg transition-all"
                            title="Excluir Simulação"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modern, high-contrast, beautiful custom confirmation modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div 
            className="bg-white rounded-2xl max-w-md w-full border border-gray-100 shadow-2xl p-6 relative overflow-hidden animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Red alert Top Border */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-full shrink-0">
                <Trash2 size={24} />
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  Excluir Simulação
                </h3>
                <p className="text-sm text-gray-500 font-sans">
                  Tem certeza que deseja excluir permanentemente a simulação de{' '}
                  <span className="font-bold text-gray-800 break-words">
                    {simulationToDelete?.nome || 'Servidor Sem Nome'}
                  </span>
                  ? Esta ação é irreversível e o registro será removido do banco de dados.
                </p>
                {simulationToDelete?.matricula && (
                  <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600 flex justify-between font-mono mt-1 border border-gray-100">
                    <span>Matrícula:</span>
                    <span className="font-bold">{simulationToDelete.matricula}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-sm rounded-lg transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-all shadow-sm cursor-pointer"
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
