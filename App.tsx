
import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  Play, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2, 
  Trash2, 
  ExternalLink, 
  Sparkles, 
  FileUp,
  Globe,
  HelpCircle,
  X,
  Info
} from 'lucide-react';
import { getCompanyInfo } from './services/geminiService';
import { CompanyRow, ProcessingStats } from './types';

const App: React.FC = () => {
  const [data, setData] = useState<CompanyRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedNameCol, setSelectedNameCol] = useState<string>('');
  const [selectedCnpjCol, setSelectedCnpjCol] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [stats, setStats] = useState<ProcessingStats>({ total: 0, processed: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFinished = useMemo(() => {
    return stats.total > 0 && (stats.processed + stats.errors) === stats.total;
  }, [stats]);

  const getFriendlySourceName = (url: string) => {
    const lowUrl = url.toLowerCase();
    if (lowUrl.includes('cnpj.biz')) return 'CNPJ Biz';
    if (lowUrl.includes('econodata.com.br')) return 'Econodata';
    if (lowUrl.includes('casadosdados.com.br')) return 'Casa dos Dados';
    if (lowUrl.includes('solutudo.com.br')) return 'Solutudo';
    if (lowUrl.includes('transparencia.cc')) return 'Transparência CC';
    if (lowUrl.includes('speedio.com.br')) return 'Speedio';
    if (lowUrl.includes('gov.br')) return 'Receita/Portal Gov';
    if (lowUrl.includes('linkedin.com')) return 'LinkedIn';
    if (lowUrl.includes('instagram.com')) return 'Instagram';
    
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch {
      return 'Fonte Externa';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isProcessing && !confirm('Um processamento está em andamento. Deseja cancelar e carregar um novo arquivo?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as CompanyRow[];
      
      if (jsonData.length > 0) {
        const fileHeaders = Object.keys(jsonData[0]);
        setHeaders(fileHeaders);
        setData(jsonData.map(row => ({ ...row, __status: 'pending' })));
        
        const nameGuess = fileHeaders.find(h => h.toLowerCase().includes('nome') || h.toLowerCase().includes('empresa') || h.toLowerCase().includes('razão'));
        const cnpjGuess = fileHeaders.find(h => h.toLowerCase().includes('cnpj') || h.toLowerCase().includes('documento'));
        
        setSelectedNameCol(nameGuess || '');
        setSelectedCnpjCol(cnpjGuess || '');
        
        setStats({ total: jsonData.length, processed: 0, errors: 0 });
        setIsProcessing(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const startProcessing = async () => {
    if (!selectedNameCol || isProcessing) return;
    
    setIsProcessing(true);
    setStats(prev => ({ ...prev, processed: 0, errors: 0 }));

    const updatedData = [...data];

    for (let i = 0; i < updatedData.length; i++) {
      if (!isProcessing && i > 0 && !data.length) break;

      const row = updatedData[i];
      const name = row[selectedNameCol];
      const cnpj = selectedCnpjCol ? row[selectedCnpjCol] : '';

      updatedData[i] = { ...row, __status: 'processing' };
      setData([...updatedData]);

      try {
        const result = await getCompanyInfo(String(name), String(cnpj));
        updatedData[i] = { 
          ...row, 
          __description: result.text, 
          __sources: result.sources,
          __status: 'done' 
        };
        setStats(prev => ({ ...prev, processed: prev.processed + 1 }));
      } catch (error) {
        updatedData[i] = { ...row, __status: 'error' };
        setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
      }
      
      setData([...updatedData]);
      await new Promise(r => setTimeout(r, 400));
    }

    setIsProcessing(false);
  };

  const downloadResults = () => {
    const exportData = data.map(row => {
      const { __status, __sources, __description, ...rest } = row;
      return {
        ...rest,
        'Descrição Atividade (IA)': __description || 'Não processado',
        'Fontes de Pesquisa': (__sources || []).join(' | ')
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empresas Enriquecidas");
    XLSX.writeFile(wb, "agente_mercado_resultado.xlsx");
  };

  const triggerNewUpload = () => {
    fileInputRef.current?.click();
  };

  const resetAll = () => {
    if (confirm('Deseja realmente limpar todos os dados?')) {
      setData([]);
      setHeaders([]);
      setSelectedNameCol('');
      setSelectedCnpjCol('');
      setStats({ total: 0, processed: 0, errors: 0 });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50 text-slate-900 font-inter">
      <div className="max-w-6xl mx-auto space-y-6">
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          accept=".xlsx,.xls,.csv" 
          className="hidden" 
        />

        {/* Modal de Ajuda */}
        {showHelp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
              <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <HelpCircle size={24} />
                  <h3 className="text-xl font-bold">Guia de Uso</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">1</div>
                  <p className="text-sm text-slate-600">Prepare sua planilha com os nomes das empresas em uma coluna.</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">2</div>
                  <p className="text-sm text-slate-600">Carregue o arquivo clicando no botão central ou em "Novo Arquivo".</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">3</div>
                  <p className="text-sm text-slate-600">Selecione no painel lateral a coluna que contém o Nome e, opcionalmente, o CNPJ.</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">4</div>
                  <p className="text-sm text-slate-600">Clique em "Iniciar Pesquisa" e aguarde o robô ler a web. Depois, é só baixar o Excel pronto!</p>
                </div>
                <button 
                  onClick={() => setShowHelp(false)}
                  className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Entendi, vamos lá!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Agente de Inteligência de Mercado</h1>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                Enriquecimento automático via IA
                <button onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-bold ml-1 transition-colors">
                  <Info size={14} />
                  como funciona?
                </button>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {data.length > 0 && (
              <>
                <button 
                  onClick={triggerNewUpload}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-all text-sm"
                >
                  <FileUp size={18} />
                  Novo Arquivo
                </button>
                {!isProcessing && (
                  <button 
                    onClick={resetAll}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    title="Limpar tudo"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </>
            )}
            <button 
              onClick={() => setShowHelp(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 transition-colors md:hidden"
            >
              <HelpCircle size={24} />
            </button>
          </div>
        </header>

        {data.length === 0 ? (
          /* Empty State */
          <div 
            onClick={triggerNewUpload}
            className="group cursor-pointer bg-white border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all rounded-3xl p-20 flex flex-col items-center justify-center text-center space-y-6"
          >
            <div className="p-8 bg-indigo-50 group-hover:bg-indigo-100 rounded-full transition-colors">
              <Upload size={48} className="text-indigo-600" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-2xl font-bold text-slate-800">Selecione sua planilha</h3>
              <p className="text-slate-500">Clique aqui para carregar seu arquivo Excel ou CSV e começar o enriquecimento automático.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> XLSX</span>
              <span className="flex items-center gap-1"><FileSpreadsheet size={14} /> CSV</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6 sticky top-6">
                <div className="space-y-4">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={14} className="text-amber-500" />
                    Configuração
                  </h2>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Coluna da Empresa</label>
                    <select 
                      value={selectedNameCol} 
                      onChange={(e) => setSelectedNameCol(e.target.value)}
                      disabled={isProcessing}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 font-medium text-sm"
                    >
                      <option value="">Selecione...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">Coluna do CNPJ (Opcional)</label>
                    <select 
                      value={selectedCnpjCol} 
                      onChange={(e) => setSelectedCnpjCol(e.target.value)}
                      disabled={isProcessing}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 font-medium text-sm"
                    >
                      <option value="">Nenhuma</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  {!isFinished ? (
                    <button 
                      onClick={startProcessing}
                      disabled={!selectedNameCol || isProcessing}
                      className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Enriquecendo dados...
                        </>
                      ) : (
                        <>
                          <Play size={20} fill="currentColor" />
                          Iniciar Pesquisa
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="text-emerald-500" size={20} />
                        <span className="text-emerald-800 font-bold text-xs uppercase tracking-tight">Pesquisa Finalizada!</span>
                      </div>
                      <button 
                        onClick={downloadResults}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-100 active:scale-[0.98]"
                      >
                        <Download size={20} />
                        Download Resultado
                      </button>
                    </div>
                  )}
                </div>

                {stats.total > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</span>
                      <span className="text-xs font-bold text-slate-900">{Math.round(((stats.processed + stats.errors) / stats.total) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${isFinished ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                        style={{ width: `${((stats.processed + stats.errors) / stats.total) * 100}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Sucessos</p>
                        <p className="text-lg font-bold text-emerald-600">{stats.processed}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Erros</p>
                        <p className="text-lg font-bold text-red-500">{stats.errors}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Table Preview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                  <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-indigo-400" />
                    Lista de Empresas
                  </h2>
                  <div className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase">
                    {data.length} Itens
                  </div>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b w-12 text-center">St</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Empresa</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">Resumo da Atividade & Fontes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.map((row, idx) => (
                        <tr key={idx} className={`group transition-colors ${row.__status === 'processing' ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                          <td className="p-4 align-top">
                            {row.__status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-200 mx-auto" />}
                            {row.__status === 'processing' && <Loader2 className="animate-spin text-indigo-500 mx-auto" size={16} />}
                            {row.__status === 'done' && <CheckCircle2 className="text-emerald-500 mx-auto" size={16} />}
                            {row.__status === 'error' && <AlertCircle className="text-red-500 mx-auto" size={16} />}
                          </td>
                          <td className="p-4 align-top w-1/3">
                            <div className="font-bold text-slate-900 leading-tight text-sm">{String(row[selectedNameCol] || 'Sem Nome')}</div>
                            {selectedCnpjCol && row[selectedCnpjCol] && (
                              <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-tighter">CNPJ: {String(row[selectedCnpjCol])}</div>
                            )}
                          </td>
                          <td className="p-4 align-top">
                            {row.__description ? (
                              <div className="space-y-3">
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">{row.__description}</p>
                                {row.__sources && row.__sources.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {row.__sources.slice(0, 3).map((src, i) => (
                                      <a 
                                        key={i} 
                                        href={src} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-[9px] bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded border border-slate-200 hover:border-indigo-200 transition-all font-bold"
                                      >
                                        <Globe size={10} />
                                        {getFriendlySourceName(src)}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {row.__status === 'processing' ? (
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                      <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Acessando Web...</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Fila de espera</span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
