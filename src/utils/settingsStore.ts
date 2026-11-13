import { 
  careerData as defaultCareerData, 
  careerDefaultPatterns as defaultCareerPatterns,
  resolveCareerPattern,
  fgValues as defaultFGValues,
  SALARY_CAP_GENERAL,
  SALARY_CAP_PROCURADOR 
} from '../data/careers';
import { 
  isFirebaseConfigured, 
  getFirestoreSettings, 
  writeFirestoreSettings 
} from './firebase';

const CAREERS_CACHE_KEY = 'dgep_custom_career_data';
const CAREER_PATTERNS_CACHE_KEY = 'dgep_custom_career_patterns';
const FG_CACHE_KEY = 'dgep_custom_fg_values';
const INSS_FATORES_CACHE_KEY = 'dgep_custom_inss_fatores';
const SALARY_CAPS_CACHE_KEY = 'dgep_custom_salary_caps';

export interface FGValuesType {
  FG4: number;
  FG5: number;
  FG6: number;
  FG7: number;
  FG8: number;
}

export interface CareerDataType {
  [careerKey: string]: {
    [band: string]: number;
  };
}

export interface CareerPatternMap {
  [careerKey: string]: string;
}

export interface FatoresINSSData {
  referenceMonthYear: string;
  fatoresText: string;
  history?: { [monthYear: string]: string };
}

export interface SalaryCapType {
  general: number;
  procurador: number;
}

export const defaultFatoresINSS: FatoresINSSData = {
  referenceMonthYear: '',
  fatoresText: '',
  history: {}
};

export const defaultSalaryCap: SalaryCapType = {
  general: SALARY_CAP_GENERAL,
  procurador: SALARY_CAP_PROCURADOR
};

// Helper to generate a robust API URL to avoid relative URL parsing bugs in restricted iframes
function getSafeApiUrl(path: string): string {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const href = window.location.href;
      if (href.startsWith('http://') || href.startsWith('https://')) {
        return new URL(path, href).href;
      }
    }
  } catch (e) {
    // Ignore URL derivation errors
  }
  return path;
}

// Global cache to serve sync calls
let settingsCache: {
  fatoresINSS: FatoresINSSData;
  careers: CareerDataType;
  careerPatterns: CareerPatternMap;
  fgs: FGValuesType;
  salaryCaps: SalaryCapType;
} = {
  fatoresINSS: defaultFatoresINSS,
  careers: defaultCareerData,
  careerPatterns: { ...defaultCareerPatterns },
  fgs: defaultFGValues as FGValuesType,
  salaryCaps: defaultSalaryCap
};

// Sync with backend & LocalStorage fallback for high resilience on static hosts
async function persistSettings() {
  try {
    localStorage.setItem(CAREERS_CACHE_KEY, JSON.stringify(settingsCache.careers));
    localStorage.setItem(CAREER_PATTERNS_CACHE_KEY, JSON.stringify(settingsCache.careerPatterns));
    localStorage.setItem(FG_CACHE_KEY, JSON.stringify(settingsCache.fgs));
    localStorage.setItem(INSS_FATORES_CACHE_KEY, JSON.stringify(settingsCache.fatoresINSS));
    localStorage.setItem(SALARY_CAPS_CACHE_KEY, JSON.stringify(settingsCache.salaryCaps));
  } catch (lsErr) {
    console.warn('Persisted settings in local memory fallback:', lsErr);
  }

  // If Firebase is configured, write to Firestore
  if (isFirebaseConfigured) {
    try {
      await writeFirestoreSettings(settingsCache);
    } catch (fsErr) {
      console.warn('Failed to write settings to Firestore:', fsErr);
    }
  }

  try {
    const url = getSafeApiUrl('/api/settings');
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsCache),
    });
  } catch (err) {
    console.warn('Sync parameters saved to local browser cache (offline/sandbox sandbox mode active).');
  }
}

// Called once on App init
export async function loadSettingsFromServer(): Promise<void> {
  // First load from localStorage to have immediate values and support static hosts
  try {
    const localCareers = localStorage.getItem(CAREERS_CACHE_KEY);
    if (localCareers) settingsCache.careers = JSON.parse(localCareers);

    const localCareerPatterns = localStorage.getItem(CAREER_PATTERNS_CACHE_KEY);
    if (localCareerPatterns) {
      settingsCache.careerPatterns = { ...defaultCareerPatterns, ...JSON.parse(localCareerPatterns) };
    }
    
    const localFGs = localStorage.getItem(FG_CACHE_KEY);
    if (localFGs) settingsCache.fgs = JSON.parse(localFGs);
    
    const localFatores = localStorage.getItem(INSS_FATORES_CACHE_KEY);
    if (localFatores) settingsCache.fatoresINSS = JSON.parse(localFatores);

    const localSalaryCaps = localStorage.getItem(SALARY_CAPS_CACHE_KEY);
    if (localSalaryCaps) settingsCache.salaryCaps = JSON.parse(localSalaryCaps);
  } catch (e) {
    console.warn('Error loading local settings cache:', e);
  }

  // If Firebase is configured, prioritize Firestore as the single source of truth
  if (isFirebaseConfigured) {
    try {
      const fsSettings = await getFirestoreSettings();
      if (fsSettings) {
        if (fsSettings.fatoresINSS && (fsSettings.fatoresINSS.referenceMonthYear || fsSettings.fatoresINSS.fatoresText)) {
          settingsCache.fatoresINSS = fsSettings.fatoresINSS;
          localStorage.setItem(INSS_FATORES_CACHE_KEY, JSON.stringify(fsSettings.fatoresINSS));
        }
        if (fsSettings.careers && Object.keys(fsSettings.careers).length > 0) {
          settingsCache.careers = fsSettings.careers;
          localStorage.setItem(CAREERS_CACHE_KEY, JSON.stringify(fsSettings.careers));
        }
        if (fsSettings.careerPatterns && Object.keys(fsSettings.careerPatterns).length > 0) {
          settingsCache.careerPatterns = { ...defaultCareerPatterns, ...fsSettings.careerPatterns };
          localStorage.setItem(CAREER_PATTERNS_CACHE_KEY, JSON.stringify(settingsCache.careerPatterns));
        }
        if (fsSettings.fgs && fsSettings.fgs.FG4 > 0) {
          settingsCache.fgs = fsSettings.fgs;
          localStorage.setItem(FG_CACHE_KEY, JSON.stringify(fsSettings.fgs));
        }
        if (fsSettings.salaryCaps && fsSettings.salaryCaps.general > 0) {
          settingsCache.salaryCaps = fsSettings.salaryCaps;
          localStorage.setItem(SALARY_CAPS_CACHE_KEY, JSON.stringify(fsSettings.salaryCaps));
        }
        return; // Firestore load successful
      }
    } catch (err) {
      console.warn('Failed to load settings from Firestore, trying local API', err);
    }
  }

  try {
    const url = getSafeApiUrl('/api/settings');
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      
      let needsUpload = false;
      
      // Merge server settings if they exist and are valid, otherwise mark for upload
      if (data.fatoresINSS && (data.fatoresINSS.referenceMonthYear || data.fatoresINSS.fatoresText)) {
        settingsCache.fatoresINSS = data.fatoresINSS;
        localStorage.setItem(INSS_FATORES_CACHE_KEY, JSON.stringify(data.fatoresINSS));
      } else if (settingsCache.fatoresINSS.referenceMonthYear || settingsCache.fatoresINSS.fatoresText) {
        needsUpload = true;
      }
      
      if (data.careers && Object.keys(data.careers).length > 0) {
        settingsCache.careers = data.careers;
        localStorage.setItem(CAREERS_CACHE_KEY, JSON.stringify(data.careers));
      } else if (Object.keys(settingsCache.careers).length > 0) {
        needsUpload = true;
      }

      if (data.careerPatterns && Object.keys(data.careerPatterns).length > 0) {
        settingsCache.careerPatterns = { ...defaultCareerPatterns, ...data.careerPatterns };
        localStorage.setItem(CAREER_PATTERNS_CACHE_KEY, JSON.stringify(settingsCache.careerPatterns));
      } else {
        needsUpload = true;
      }
      
      if (data.fgs && data.fgs.FG4 > 0) {
        settingsCache.fgs = data.fgs;
        localStorage.setItem(FG_CACHE_KEY, JSON.stringify(data.fgs));
      } else if (settingsCache.fgs.FG4 > 0) {
        needsUpload = true;
      }

      if (data.salaryCaps && data.salaryCaps.general > 0) {
        settingsCache.salaryCaps = data.salaryCaps;
        localStorage.setItem(SALARY_CAPS_CACHE_KEY, JSON.stringify(data.salaryCaps));
      } else if (settingsCache.salaryCaps.general > 0) {
        needsUpload = true;
      }
      
      if (needsUpload) {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settingsCache),
        }).catch(err => console.warn('Failed to auto-restore server settings:', err));
      }
    }
  } catch (err) {
    console.info('Settings initialized from database local cache fallback successfully.');
  }
}

// Get helper for Career Salary Data
export function getSavedCareerData(): CareerDataType {
  return settingsCache.careers;
}

// Save helper for Career Salary Data
export function saveCareerData(data: CareerDataType): void {
  settingsCache.careers = data;
  persistSettings();
}

// Get helper for Career Patterns (Padrão por Cargo)
export function getSavedCareerPatterns(): CareerPatternMap {
  return settingsCache.careerPatterns || { ...defaultCareerPatterns };
}

// Save helper for Career Patterns (Padrão por Cargo)
export function saveCareerPatterns(patterns: CareerPatternMap): void {
  settingsCache.careerPatterns = patterns;
  persistSettings();
}

// Resolve Padrão by career key or cargo display name
export function getPatternForCareer(careerOrCargo?: string): string {
  return resolveCareerPattern(careerOrCargo, getSavedCareerPatterns());
}

// Get helper for FG values
export function getSavedFGValues(): FGValuesType {
  return settingsCache.fgs;
}

// Save helper for FG values
export function saveFGValues(values: FGValuesType): void {
  settingsCache.fgs = values;
  persistSettings();
}

// Get helper for Fatores INSS
export function getSavedFatoresINSS(): FatoresINSSData {
  return settingsCache.fatoresINSS;
}

// Save helper for Fatores INSS
export function saveFatoresINSS(data: FatoresINSSData): void {
  const currentHistory = settingsCache.fatoresINSS.history || {};
  if (data.referenceMonthYear) {
    currentHistory[data.referenceMonthYear] = data.fatoresText;
  }
  settingsCache.fatoresINSS = {
    referenceMonthYear: data.referenceMonthYear,
    fatoresText: data.fatoresText,
    history: currentHistory
  };
  persistSettings();
}

// Get helper for Salary Caps
export function getSavedSalaryCaps(): SalaryCapType {
  return settingsCache.salaryCaps || defaultSalaryCap;
}

// Save helper for Salary Caps
export function saveSalaryCaps(values: SalaryCapType): void {
  settingsCache.salaryCaps = values;
  persistSettings();
}

// Reset all values to initial defaults from careers.ts (but keep Fatores de Conversão intact)
export function resetSettingsToDefaults(): void {
  settingsCache.careers = defaultCareerData;
  settingsCache.careerPatterns = { ...defaultCareerPatterns };
  settingsCache.fgs = defaultFGValues as FGValuesType;
  settingsCache.salaryCaps = defaultSalaryCap;
  persistSettings();
}
