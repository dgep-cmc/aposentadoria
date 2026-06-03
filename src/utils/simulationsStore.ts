export interface UnifiedSimulation {
  id: string; // Unique identifier (e.g. UUID or timestamp)
  nome: string;
  matricula: string;
  sexo: 'M' | 'F' | '';
  dataNascimento: string; // YYYY-MM-DD
  
  // Carreira
  ingressoCmc: string; // YYYY-MM-DD
  ingressoCargoAtual: string; // YYYY-MM-DD
  cargo: string;
  selectedCareer: string; 
  careerLevel: 'M' | 'S'; // Nível Médio ou Superior (para proventos)
  selectedLevel: string; // Faixa atual (e.g. 'I', 'II', 'VI')
  
  // Adicionais e FGs
  lastAtsConcession: string; // YYYY-MM-DD
  lastAtsNumber: number;
  fgRows: { start: string; end: string; nivel: string }[];
  stimulusRows: { tipo: string; start: string; end: string }[];
  
  // Contribuições e Proventos
  historicalData: string; // Text string for past salaries
  needsUpdate: boolean; // Flag if values need to be updated with INSS factors
  incorporacoes: { 
    tipo: string; 
    years: number; 
    months: number; 
    days: number; 
    valor: string; 
    needsUpdate?: boolean; 
    status?: 'efetivada' | 'simular';
    nome?: string;
    dataInicio?: string;
    dataFim?: string;
    useDates?: boolean;
  }[];
  
  // Tempos
  diasAverbadosINSS: number;
  diasAverbadosSP: number;
  diasAfastamento: number;
  extensionMonths: number; // Trabalhar mais X meses
  
  // Congelamento de dados
  congelada?: boolean;
  fatoresCongeladosText?: string;
  fatoresCongeladosMonthYear?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'dgep_unified_simulations';
const DRAFT_KEY = 'dgep_unified_draft';

import { 
  getFirestoreSimulations, 
  writeFirestoreSimulation, 
  deleteFirestoreSimulation,
  isFirebaseConfigured
} from './firebase';

function getSafeApiUrl(path: string): string {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const href = window.location.href;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return new URL(path, href).href;
      }
    }
  } catch (e) {}
  return path;
}

// Run migration on init
export async function initMigration(): Promise<void> {
  const localSaved = localStorage.getItem(STORAGE_KEY);
  if (localSaved) {
    try {
      const localSims: UnifiedSimulation[] = JSON.parse(localSaved);
      if (localSims.length > 0) {
        console.log(`Migrating ${localSims.length} simulations from localStorage to Firestore...`);
        const promises = localSims.map(sim => writeFirestoreSimulation(sim));
        await Promise.all(promises);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.error('Error migrating local simulations', err);
    }
  }
}

// Get all saved simulations
export async function getSavedSimulations(): Promise<UnifiedSimulation[]> {
  try {
    const list = await getFirestoreSimulations();
    
    // Now if Firebase is not configured, we sync with the server-side /api/simulations
    if (!isFirebaseConfigured) {
      try {
        const url = getSafeApiUrl('/api/simulations');
        const res = await fetch(url);
        if (res.ok) {
          const serverSims: UnifiedSimulation[] = await res.json();
          
          // Create map of ID -> Simulation to merge
          const mergedMap = new Map<string, UnifiedSimulation>();
          
          // Add local simulations first
          list.forEach(sim => {
            mergedMap.set(sim.id, sim);
          });
          
          let modified = false;
          
          // Merge server simulations
          serverSims.forEach(serverSim => {
            const localSim = mergedMap.get(serverSim.id);
            if (!localSim) {
              mergedMap.set(serverSim.id, serverSim);
              modified = true;
            } else {
              // Compare updatedAt to see which one is newer
              const localTime = new Date(localSim.updatedAt || localSim.createdAt || 0).getTime();
              const serverTime = new Date(serverSim.updatedAt || serverSim.createdAt || 0).getTime();
              if (serverTime > localTime) {
                mergedMap.set(serverSim.id, serverSim);
                modified = true;
              } else if (localTime > serverTime) {
                // Local is newer, upload to server
                fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(localSim)
                }).catch(err => console.warn("Fallback upload failed:", err));
              }
            }
          });
          
          const finalList = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
          );
          
          if (modified) {
            // Write back to local storage
            localStorage.setItem('dgep_local_legacy_simulations', JSON.stringify(finalList));
          }
          
          // Upload any local simulations that are entirely missing on the server
          finalList.forEach(sim => {
            const onServer = serverSims.some(s => s.id === sim.id);
            if (!onServer) {
              fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sim)
              }).catch(err => console.warn("Fallback upload of new simulation failed:", err));
            }
          });
          
          return finalList;
        }
      } catch (apiErr) {
        console.warn("Could not sync simulations with server API:", apiErr);
      }
    }
    
    return list;
  } catch (e) {
    console.error('Error fetching unified simulations', e);
    return [];
  }
}

// Save a simulation
export async function saveSimulation(sim: UnifiedSimulation): Promise<void> {
  try {
    sim.updatedAt = new Date().toISOString();
    await writeFirestoreSimulation(sim);
    
    // Server API Sync when offline
    if (!isFirebaseConfigured) {
      try {
        const url = getSafeApiUrl('/api/simulations');
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sim)
        });
      } catch (err) {
        console.warn("Could not sync saved simulation to server API (offline fallback active):", err);
      }
    }
  } catch (e) {
    console.error('Error saving simulation to firestore', e);
    throw e;
  }
}

// Delete a simulation
export async function deleteSimulation(id: string): Promise<void> {
  try {
    await deleteFirestoreSimulation(id);
    
    // Server API Sync when offline
    if (!isFirebaseConfigured) {
      try {
        const url = getSafeApiUrl(`/api/simulations/${id}`);
        await fetch(url, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn("Could not delete simulation from server API:", err);
      }
    }
  } catch (e) {
    console.error('Error deleting simulation from firestore', e);
    throw e;
  }
}

// Get the current draft
export function getDraftSimulation(): UnifiedSimulation | null {
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) {
    try {
      return JSON.parse(draft);
    } catch (e) {
      console.error('Error parsing draft simulation', e);
    }
  }
  return null;
}

// Save draft
export function saveDraftSimulation(draft: UnifiedSimulation): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

// Clear draft
export function clearDraftSimulation(): void {
  localStorage.removeItem(DRAFT_KEY);
}

export function createNewSimulation(): UnifiedSimulation {
  return {
    id: Date.now().toString(),
    nome: '',
    matricula: '',
    sexo: '',
    dataNascimento: '',
    ingressoCmc: '',
    ingressoCargoAtual: '',
    cargo: '',
    selectedCareer: 'assistente_administrativo',
    careerLevel: 'M',
    selectedLevel: 'I',
    lastAtsConcession: '',
    lastAtsNumber: 0,
    fgRows: [],
    stimulusRows: [],
    historicalData: '',
    needsUpdate: true,
    incorporacoes: [],
    diasAverbadosINSS: 0,
    diasAverbadosSP: 0,
    diasAfastamento: 0,
    extensionMonths: 0,
    congelada: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
