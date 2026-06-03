import { useState, useEffect } from 'react';
import { 
  FileText, 
  Trash2, 
  Play, 
  Download, 
  AlertCircle, 
  Info,
  CheckCircle,
  Copy,
  Settings
} from 'lucide-react';
import { getSavedFatoresINSS } from '../utils/settingsStore';

const mesesMap: { [key: string]: string } = {
  'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
  'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
};

interface EvaluatedRow {
  competencia: string;
  originalValue: number;
  fator: number;
  updatedValue: number;
}

export default function AtualizacaoContribuicoes() {
  const cacheKey = 'dgep_atualizacao_data';
  
  const savedFatores = getSavedFatoresINSS();
  const fatoresText = savedFatores.fatoresText;
  const referenceMonthYear = savedFatores.referenceMonthYear;

  const [contribuicoesText, setContribuicoesText] = useState(() => {
    const saved = localStorage.getItem(`${cacheKey}_contribuicoes`);
    return saved || '';
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');
  const [outputText, setOutputText] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [calculatedRows, setCalculatedRows] = useState<EvaluatedRow[]>([]);

  useEffect(() => {
    localStorage.setItem(`${cacheKey}_contribuicoes`, contribuicoesText);
  }, [contribuicoesText]);

  function normalizarData(mesStr: string, anoStr: string): string {
    let mes = mesStr.toLowerCase().trim();
    if (mesesMap[mes]) {
      mes = mesesMap[mes];
    } else {
      mes = mes.padStart(2, '0');
    }

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

    // RegEx patterns
    // 1. DD/MM/AAAA (ou DD/mmm/AA)
    const regexComDia = /^(\d{1,2})\/(\d{1,2}|[a-zA-Z]{3})\/(\d{2}|\d{4})\s+(.*)$/;
    // 2. MM/AAAA (ou mmm/AA)
    const regexSemDia = /^(\d{1,2}|[a-zA-Z]{3})\/(\d{2}|\d{4})\s+(.*)$/;

    let match = limpa.match(regexComDia);
    if (match) {
      const competencia = normalizarData(match[2], match[3]);
      const valorStr = match[4].trim().replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(valorStr);
      return { competencia, valor };
    }

    match = limpa.match(regexSemDia);
    if (match) {
      const competencia = normalizarData(match[1], match[2]);
      const valorStr = match[3].trim().replace(/\./g, '').replace(',', '.');
      const valor = parseFloat(valorStr);
      return { competencia, valor };
    }

    return null;
  }

  const handleClear = () => {
    setContribuicoesText('');
    setErrorMsg('');
    setWarningMsg('');
    setOutputText('');
    setCalculatedRows([]);
  };

  const handleCalcular = () => {
    setErrorMsg('');
    setWarningMsg('');
    setOutputText('');
    setCalculatedRows([]);

    // 1. Parse Fatores Conversion
    const fatores = new Map<string, number>();
    const fLines = fatoresText.split('\n');
    for (const line of fLines) {
      const parsed = parseLinha(line);
      if (parsed && !isNaN(parsed.valor)) {
        fatores.set(parsed.competencia, parsed.valor);
      }
    }

    // 2. Parse Contribuicoes
    const cLines = contribuicoesText.split('\n');
    const contribs = [];
    for (const line of cLines) {
      const parsed = parseLinha(line);
      if (parsed && !isNaN(parsed.valor)) {
        contribs.push(parsed);
      }
    }

    if (fatores.size === 0 || contribs.length === 0) {
      setErrorMsg("Atenção ao formato: Não foi possível computar fatores ou salários válidos. Verifique os dados inseridos.");
      return;
    }

    const resultsList: string[] = [];
    const missingCompetencies: string[] = [];
    const evaluationTable: EvaluatedRow[] = [];

    for (const item of contribs) {
      const fator = fatores.get(item.competencia);
      
      if (fator === undefined) {
        missingCompetencies.push(item.competencia);
      } else {
        const valorAtualizado = item.valor * fator;
        resultsList.push(`${item.competencia} ${valorAtualizado.toFixed(2).replace('.', ',')}`);
        evaluationTable.push({
          competencia: item.competencia,
          originalValue: item.valor,
          fator: fator,
          updatedValue: valorAtualizado
        });
      }
    }

    if (missingCompetencies.length > 0) {
      const uniqueMissing = Array.from(new Set(missingCompetencies));
      setWarningMsg(`Fatores ausentes para as competências listadas, que foram ignoradas nos valores de cálculo final: ${uniqueMissing.join(', ')}`);
    }

    if (resultsList.length > 0) {
      setOutputText(resultsList.join('\n'));
      setCalculatedRows(evaluationTable);
    } else {
      setErrorMsg("Nenhuma competência correspondente pôde ser calculada. Verifique se as datas coincidem entre os fatores e os salários.");
    }
  };

  const handleDownload = () => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contribuicoes_atualizadas.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Inputs block */}
      <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-6 sm:p-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
            Atualização de Salários de Contribuição
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Correção e atualização monetária em massa de salários de contribuição a partir de indexação regulamentar
          </p>
        </div>

        {errorMsg && (
          <div className="flex gap-2.5 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg leading-relaxed text-xs sm:text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Falha no processamento:</span> {errorMsg}
            </div>
          </div>
        )}

        {warningMsg && (
          <div className="flex gap-2.5 p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg leading-relaxed text-xs sm:text-sm">
            <Info size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Fatores ausentes:</span> {warningMsg}
            </div>
          </div>
        )}

        {/* Text Areas Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fatores area */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              1. Fatores de Conversão (Histórico)
            </h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <Settings size={18} className="text-indigo-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Tabela extraída do Ministério da Previdêcia</h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    A tabela de fatores agora é configurada no painel de <strong>Gestão de Cadastros</strong>.
                  </p>
                </div>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-md p-3">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Mês/Ano de Referência</span>
                <div className="text-sm font-bold text-indigo-700 mt-0.5">
                  {referenceMonthYear || 'Nenhuma tabela informada'}
                </div>
              </div>
              
              {!fatoresText.trim() && (
                <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs shadow-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">Nenhum fator foi cadastrado no painel. A simulação pode falhar.</span>
                </div>
              )}
            </div>
          </div>

          {/* Contribuicoes area */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-[#004b8d] border-l-4 border-[#004b8d] pl-2.5 uppercase tracking-wider block">
              2. Salários de Contribuição (Ficha Financeira)
            </h2>
            <textarea
              rows={8}
              value={contribuicoesText}
              onChange={(e) => setContribuicoesText(e.target.value)}
              placeholder="Exemplos:&#10;15/07/2012 1500,10&#10;fev/95 800,00"
              className="w-full p-3 font-mono text-xs sm:text-sm bg-white border border-[#dee2e6] focus:outline-none focus:ring-2 focus:ring-[#004b8d]/15 focus:border-[#004b8d] rounded-lg transition-all leading-relaxed"
            />
            <span className="text-[10px] text-gray-400 block leading-tight">
              Mesmo formato da lista anterior. O dia eventualmente inserido (Ex: 15/07) será desconsiderado, operando apenas sobre a competência (Ex: 07/2012).
            </span>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleCalcular}
            className="flex-1 min-w-[180px] flex items-center justify-center gap-1.5 py-3 px-6 bg-[#004b8d] hover:bg-[#003a6d] text-white font-bold text-sm rounded-lg shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play size={15} /> Calcular Atualização
          </button>
          
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center justify-center gap-1.5 py-3 px-5 bg-gray-50 border border-gray-200 text-gray-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 rounded-lg text-sm font-semibold cursor-pointer transition-all"
          >
            <Trash2 size={15} /> Limpar Campos
          </button>
        </div>
      </div>

      {/* Results details */}
      {calculatedRows.length > 0 && (
        <div className="space-y-6">
          <div className="bg-white border border-[#dee2e6] rounded-xl shadow-xs p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-3">
              <h2 className="text-sm font-bold text-gray-800 border-l-4 border-emerald-600 pl-3 uppercase tracking-wider">
                Valores Atualizados Consolidados
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#004b8d] hover:border-[#004b8d]/30 hover:bg-blue-50/50 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  <Copy size={13} /> {copied ? 'Copiado!' : 'Copiar Texto'}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 py-1.5 px-3 bg-[#004b8d] text-white hover:bg-[#003a6d] rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  <Download size={13} /> Download (.txt)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Processed Text output */}
              <div className="lg:col-span-4 space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Cópia Rápida para DGEP / IPMC
                </span>
                <textarea
                  readOnly
                  rows={10}
                  value={outputText}
                  className="w-full p-2.5 font-mono text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none cursor-text select-all"
                />
              </div>

              {/* Graphical result table */}
              <div className="lg:col-span-8 space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Demonstrativo e Tabela de Indexação
                </span>
                <div className="border border-gray-100 rounded-lg overflow-hidden max-h-[290px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="p-2.5">Competência</th>
                        <th className="p-2.5 text-right">Valor Relatório</th>
                        <th className="p-2.5 text-center">Fator Multiplicativo</th>
                        <th className="p-2.5 text-right bg-emerald-50/50 text-emerald-855 font-bold">Valor Corrigido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {calculatedRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="p-2.5 font-mono">{row.competencia}</td>
                          <td className="p-2.5 text-right font-mono">
                            R$ {row.originalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-2.5 text-center font-mono text-gray-500">{row.fator.toFixed(6)}</td>
                          <td className="p-2.5 text-right font-semibold font-mono bg-emerald-50/25 text-emerald-700">
                            R$ {row.updatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
