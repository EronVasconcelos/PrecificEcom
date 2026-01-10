
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductData, CalculationResults, HistoryItem } from './types';

const INITIAL_STATE: ProductData = {
  nome: '',
  custoProd: 0,
  frete: 0,
  impImp: 0,
  icms: 0,
  taxaCheck: 0,
  taxaGate: 0,
  impVenda: 0,
  contingencia: 0,
  mktPerc: 25,
  precoVenda: 0,
  taxaFixaPedido: 0,
  taxaConversao: 0,
};

const App: React.FC = () => {
  const [data, setData] = useState<ProductData>(INITIAL_STATE);
  const [moeda, setMoeda] = useState('R$');
  const [taxaCambio, setTaxaCambio] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pixStatus, setPixStatus] = useState('');
  
  // Estados para simulação de kits
  const [kit2Preco, setKit2Preco] = useState(0);
  const [kit3Preco, setKit3Preco] = useState(0);

  // Estado para planejamento de ads
  const [orcamentoDiario, setOrcamentoDiario] = useState(100);

  // Initial Load
  useEffect(() => {
    const savedTheme = localStorage.getItem('precificecom_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    const savedHistory = localStorage.getItem('precificecom_final_db');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Default exchange rates when currency changes
  useEffect(() => {
    if (moeda === 'R$') setTaxaCambio(1);
    else if (moeda === '$') setTaxaCambio(5.0);
    else if (moeda === '€') setTaxaCambio(5.5);
    else if (moeda === '£') setTaxaCambio(6.5);
  }, [moeda]);

  // Update theme on body
  useEffect(() => {
    document.body.className = theme === 'dark' 
      ? 'dark bg-[#020617] text-slate-100 min-h-screen p-4 md:p-8' 
      : 'light bg-slate-50 text-slate-900 min-h-screen p-4 md:p-8';
    localStorage.setItem('precificecom_theme', theme);
  }, [theme]);

  // Atualizar sugestão de kits quando o preço unitário mudar
  useEffect(() => {
    if (data.precoVenda > 0) {
      setKit2Preco(parseFloat((data.precoVenda * 2 * 0.9).toFixed(2))); // 10% de desconto inicial
      setKit3Preco(parseFloat((data.precoVenda * 3 * 0.85).toFixed(2))); // 15% de desconto inicial
    }
  }, [data.precoVenda]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type } = e.target;
    setData(prev => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const results = useMemo((): CalculationResults => {
    const custoLogistica = (data.custoProd + data.frete) * (1 + (data.impImp + data.icms) / 100);
    const vlrMkt = data.precoVenda * (data.mktPerc / 100);
    const vlrTaxasImp = (data.precoVenda * ((data.taxaCheck + data.taxaGate + data.impVenda + data.contingencia + data.taxaConversao) / 100)) + data.taxaFixaPedido;
    const lucro = data.precoVenda - custoLogistica - vlrMkt - vlrTaxasImp;
    const margem = data.precoVenda > 0 ? (lucro / data.precoVenda) * 100 : 0;
    const markup = custoLogistica > 0 ? data.precoVenda / custoLogistica : 0;
    const breakEvenCpa = data.precoVenda - custoLogistica - vlrTaxasImp;

    return { custoLogistica, vlrMkt, vlrTaxasImp, lucro, margem, markup, breakEvenCpa };
  }, [data]);

  const scaleMetrics = useMemo(() => {
    const cpaIdeal = data.precoVenda * (data.mktPerc / 100);
    const vendasProjetadas = cpaIdeal > 0 ? orcamentoDiario / cpaIdeal : 0;
    const lucroProjetado = results.lucro * vendasProjetadas;
    const faturamentoProjetado = data.precoVenda * vendasProjetadas;
    const roiEstimado = orcamentoDiario > 0 ? (lucroProjetado / orcamentoDiario) * 100 : 0;
    
    let healthScore = 0;
    if (results.margem > 30) healthScore += 40;
    else if (results.margem > 15) healthScore += 20;
    
    if (results.markup > 3) healthScore += 40;
    else if (results.markup > 2) healthScore += 20;

    if (results.breakEvenCpa > results.vlrMkt) healthScore += 20;

    return { vendasProjetadas, lucroProjetado, faturamentoProjetado, roiEstimado, healthScore };
  }, [orcamentoDiario, data.mktPerc, data.precoVenda, results]);

  const calculateKitProfit = (units: number, totalPrice: number) => {
    const custoProdutos = data.custoProd * units * (1 + (data.impImp + data.icms) / 100);
    const custoEnvio = data.frete * (1 + (data.impImp + data.icms) / 100);
    const cpaMarketing = data.precoVenda * (data.mktPerc / 100); 
    const taxaFixa = data.taxaFixaPedido;
    
    const taxasVariaveisPerc = (data.taxaCheck + data.taxaGate + data.impVenda + data.contingencia + data.taxaConversao) / 100;
    const valorTaxasVariaveis = totalPrice * taxasVariaveisPerc;

    const lucro = totalPrice - custoProdutos - custoEnvio - cpaMarketing - valorTaxasVariaveis - taxaFixa;
    const margem = totalPrice > 0 ? (lucro / totalPrice) * 100 : 0;
    const desconto = data.precoVenda > 0 ? (1 - (totalPrice / (data.precoVenda * units))) * 100 : 0;

    return { lucro, margem, desconto };
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const novoProjeto = () => {
    if (window.confirm("Deseja zerar todos os campos para uma nova precificação?")) {
      setData(INITIAL_STATE);
      setKit2Preco(0);
      setKit3Preco(0);
    }
  };

  const aplicarSugestao = (margemAlvo: number) => {
    const custoTotalOrigem = (data.custoProd + data.frete) * (1 + (data.impImp + data.icms) / 100);
    const percentuaisVariaveis = (data.taxaCheck + data.taxaGate + data.impVenda + data.mktPerc + data.contingencia + data.taxaConversao) / 100;
    const taxaFixa = data.taxaFixaPedido;
    
    const divisor = 1 - percentuaisVariaveis - margemAlvo;
    if (divisor > 0) {
      setData(prev => ({ ...prev, precoVenda: parseFloat(((custoTotalOrigem + taxaFixa) / divisor).toFixed(2)) }));
    }
  };

  const salvarHistorico = () => {
    const item: HistoryItem = {
      id: Date.now(),
      nome: data.nome || "Produto Sem Nome",
      venda: data.precoVenda,
      lucro: results.lucro.toFixed(2),
      margem: results.margem.toFixed(1) + "%",
      moeda: moeda,
      data: new Date().toLocaleDateString('pt-BR')
    };
    const newHistory = [item, ...history].slice(0, 15);
    setHistory(newHistory);
    localStorage.setItem('precificecom_final_db', JSON.stringify(newHistory));
  };

  const excluirItem = (id: number) => {
    const newHistory = history.filter(i => i.id !== id);
    setHistory(newHistory);
    localStorage.setItem('precificecom_final_db', JSON.stringify(newHistory));
  };

  const exportarCSV = () => {
    if (history.length === 0) return alert("Histórico vazio!");
    let csv = "Produto;Preco Venda;Lucro;Margem;Data\n";
    history.forEach(i => csv += `${i.nome};${i.venda};${i.lucro};${i.margem};${i.data}\n`);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "precific_ecom_export.csv";
    link.click();
  };

  const fazerPix = () => {
    const chavePix = "b8e85c5f-973c-4a64-8d9b-7b26e5f620fe";
    navigator.clipboard.writeText(chavePix).then(() => {
      setPixStatus("CHAVE PIX COPIADA! Cole no seu banco em 'Pix Copia e Cola'.");
      setTimeout(() => setPixStatus(''), 5000);
      alert("Chave Pix copiada com sucesso!");
    });
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const projectionSteps = [30, 150, 300, 1500, 3000, 10000];

  const labelStyle = "block text-[0.85rem] text-slate-500 font-bold uppercase mb-2";
  const sectionTitleStyle = "text-orange-600 font-black uppercase text-sm tracking-widest mb-6 text-center";
  const inputStyle = "w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900 text-center text-base font-semibold";

  const kit2Results = calculateKitProfit(2, kit2Preco);
  const kit3Results = calculateKitProfit(3, kit3Preco);

  return (
    <div className="max-w-[1440px] mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b-2 border-orange-600 pb-4 mb-8 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold tracking-tighter">
            <span className="text-orange-600">Precific</span>Ecom
          </h1>
          <p className="text-[0.85rem] text-slate-500 font-bold uppercase mt-1 text-center md:text-left">By Eron Vasconcelos</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center items-center">
          <button onClick={novoProjeto} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-lg transition-all uppercase text-base shadow-lg">
            + NOVO
          </button>
          
          <div className="flex bg-slate-800 border border-slate-700 rounded-lg overflow-hidden dark:bg-slate-900 light:bg-white light:border-slate-300">
             <select 
              value={moeda} 
              onChange={(e) => setMoeda(e.target.value)}
              className="bg-transparent text-white font-bold py-2.5 px-4 outline-none focus:ring-2 focus:ring-orange-600 light:text-slate-900 text-base"
            >
              <option value="R$">BRL (R$)</option>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
            </select>
            {moeda !== 'R$' && (
              <div className="flex items-center border-l border-slate-700 px-3 bg-orange-600/10">
                <span className="text-[0.7rem] font-bold text-orange-600 mr-2">CÂMBIO:</span>
                <input 
                  type="number" 
                  value={taxaCambio} 
                  onChange={(e) => setTaxaCambio(parseFloat(e.target.value) || 0)}
                  className="w-16 bg-transparent text-white font-bold text-base outline-none light:text-slate-900 text-center"
                  step="0.01"
                />
              </div>
            )}
          </div>

          <button onClick={exportarCSV} className="border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-bold py-2.5 px-5 rounded-lg transition-all uppercase text-base flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            CSV
          </button>
          <button onClick={toggleTheme} className="bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg hover:bg-slate-700 transition-all dark:bg-slate-900 light:bg-white light:text-slate-900 light:border-slate-300">
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Main Layout - 3 COLUNAS HARMONIZADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* COLUNA 1: ENTRADAS */}
        <div className="flex flex-col gap-8 h-full">
          <section className="glass-card p-6 rounded-2xl shadow-xl flex-1">
            <h3 className={sectionTitleStyle}>Identificação e Custos</h3>
            <div className="space-y-4">
              <div className="text-center">
                <label className={labelStyle}>Nome do Produto</label>
                <input 
                  type="text" id="nome" value={data.nome} onChange={handleChange}
                  placeholder="Ex: Produto A" 
                  className={inputStyle}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <label className={labelStyle}>Custo Produto</label>
                  <input type="number" id="custoProd" value={data.custoProd || ''} onChange={handleChange} placeholder="0.00" className={inputStyle} />
                </div>
                <div className="text-center">
                  <label className={labelStyle}>Frete (Envio)</label>
                  <input type="number" id="frete" value={data.frete || ''} onChange={handleChange} placeholder="0.00" className={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <label className={labelStyle}>Importação (%)</label>
                  <input type="number" id="impImp" value={data.impImp || ''} onChange={handleChange} placeholder="0" className={inputStyle} />
                </div>
                <div className="text-center">
                  <label className={labelStyle}>ICMS / IOF (%)</label>
                  <input type="number" id="icms" value={data.icms || ''} onChange={handleChange} placeholder="0" className={inputStyle} />
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-6 rounded-2xl shadow-xl flex-1">
            <h3 className={sectionTitleStyle}>Operação & Marketing</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <label className={labelStyle}>Checkout (%)</label>
                  <input type="number" id="taxaCheck" value={data.taxaCheck || ''} onChange={handleChange} placeholder="0" className={inputStyle} />
                </div>
                <div className="text-center">
                  <label className={labelStyle}>Gateway (%)</label>
                  <input type="number" id="taxaGate" value={data.taxaGate || ''} onChange={handleChange} placeholder="0" className={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <label className={labelStyle}>Taxa Fixa / Pedido ({moeda})</label>
                  <input type="number" id="taxaFixaPedido" value={data.taxaFixaPedido || ''} onChange={handleChange} placeholder="0.00" className={inputStyle} />
                </div>
                <div className="text-center">
                  <label className={labelStyle}>Conv. Moeda / Taxa Ext. (%)</label>
                  <input type="number" id="taxaConversao" value={data.taxaConversao || ''} onChange={handleChange} placeholder="0" className={inputStyle} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <label className={labelStyle}>Imposto Venda (%)</label>
                  <input type="number" id="impVenda" value={data.impVenda || ''} onChange={handleChange} placeholder="0" className={inputStyle} />
                </div>
                <div className="text-center">
                  <label className={labelStyle}>Trocas/Devoluções (%)</label>
                  <input type="number" id="contingencia" value={data.contingencia || ''} onChange={handleChange} placeholder="0" className={inputStyle} />
                </div>
              </div>
              <div className="text-center">
                <label className={labelStyle}>Marketing (CPA Ideal %)</label>
                <input type="number" id="mktPerc" value={data.mktPerc || ''} onChange={handleChange} placeholder="25" className={inputStyle} />
              </div>
            </div>
          </section>
        </div>

        {/* COLUNA 2: ESTRATÉGIA E OFERTA */}
        <div className="flex flex-col gap-8 h-full">
          <section className="glass-card p-6 rounded-2xl shadow-xl">
            <h3 className={sectionTitleStyle}>💡 Consultoria de Margem</h3>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => aplicarSugestao(0.2)} 
                className="bg-slate-900/50 border border-slate-700 hover:border-orange-600 hover:text-orange-600 text-slate-300 font-semibold py-3 rounded-lg transition-all text-[0.85rem] light:bg-slate-100 light:text-slate-900 light:border-slate-300"
              >
                20% LUCRO
              </button>
              <button 
                onClick={() => aplicarSugestao(0.3)} 
                className="bg-slate-900/50 border border-slate-700 hover:border-orange-600 hover:text-orange-600 text-slate-300 font-semibold py-3 rounded-lg transition-all text-[0.85rem] light:bg-slate-100 light:text-slate-900 light:border-slate-300"
              >
                30% LUCRO
              </button>
              <button 
                onClick={() => aplicarSugestao(0.4)} 
                className="bg-slate-900/50 border border-slate-700 hover:border-orange-600 hover:text-orange-600 text-slate-300 font-semibold py-3 rounded-lg transition-all text-[0.85rem] light:bg-slate-100 light:text-slate-900 light:border-slate-300"
              >
                40% LUCRO
              </button>
            </div>
          </section>

          <div className="bg-slate-900/60 border-2 border-orange-600 rounded-[2rem] p-6 text-center shadow-2xl relative overflow-hidden light:bg-white">
            <label className="block text-orange-600 font-black uppercase text-[0.65rem] tracking-widest mb-3">PREÇO DE VENDA DEFINIDO</label>
            <div className="bg-black/20 border border-slate-700 rounded-xl p-3 mx-auto max-w-[280px] mb-4 dark:bg-black/40 light:bg-slate-100 light:border-slate-300">
              <div className="flex items-center justify-center">
                <span className="text-2xl font-bold mr-2 text-slate-400">{moeda}</span>
                <input 
                  type="number" id="precoVenda" value={data.precoVenda || ''} onChange={handleChange}
                  placeholder="0.00" 
                  className="bg-transparent border-none text-center text-3xl md:text-4xl font-black text-white outline-none w-full light:text-slate-900"
                />
              </div>
            </div>
            <div className={`text-3xl md:text-4xl font-bold tracking-tighter mb-1 ${results.lucro >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {moeda} {formatCurrency(results.lucro)}
            </div>
            <div className="text-xl font-bold text-green-500 bg-green-500/10 inline-block px-4 py-1.5 rounded-full border border-green-500/20 mt-2">
              Margem: {results.margem.toFixed(1)}%
            </div>
          </div>

          <section className="glass-card p-6 rounded-2xl shadow-xl flex-1">
            <h3 className={sectionTitleStyle}>🚀 Simulador de Ofertas (Kits)</h3>
            <div className="space-y-4">
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 light:bg-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[0.75rem] text-slate-400 font-bold uppercase">LEVE 2 UNIDADES</label>
                  <span className="bg-orange-600 text-white text-[0.6rem] font-black px-1.5 py-0.5 rounded">-{kit2Results.desconto.toFixed(0)}% OFF</span>
                </div>
                <div className="flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-slate-500 mr-1">{moeda}</span>
                  <input 
                    type="number" 
                    value={kit2Preco || ''} 
                    onChange={(e) => setKit2Preco(parseFloat(e.target.value) || 0)}
                    className="bg-transparent border-b border-slate-600 text-center text-xl font-bold w-full outline-none light:text-slate-900"
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-[0.7rem] text-slate-500 uppercase">Lucro: <span className={kit2Results.lucro >= 0 ? 'text-green-500' : 'text-red-500'}>{moeda} {formatCurrency(kit2Results.lucro)}</span></span>
                  <span className="text-orange-500 text-[0.7rem]">{kit2Results.margem.toFixed(1)}%</span>
                </div>
              </div>

              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 light:bg-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[0.75rem] text-slate-400 font-bold uppercase">LEVE 3 UNIDADES</label>
                  <span className="bg-orange-600 text-white text-[0.6rem] font-black px-1.5 py-0.5 rounded">-{kit3Results.desconto.toFixed(0)}% OFF</span>
                </div>
                <div className="flex items-center justify-center mb-3">
                  <span className="text-sm font-bold text-slate-500 mr-1">{moeda}</span>
                  <input 
                    type="number" 
                    value={kit3Preco || ''} 
                    onChange={(e) => setKit3Preco(parseFloat(e.target.value) || 0)}
                    className="bg-transparent border-b border-slate-600 text-center text-xl font-bold w-full outline-none light:text-slate-900"
                  />
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-[0.7rem] text-slate-500 uppercase">Lucro: <span className={kit3Results.lucro >= 0 ? 'text-green-500' : 'text-red-500'}>{moeda} {formatCurrency(kit3Results.lucro)}</span></span>
                  <span className="text-orange-500 text-[0.7rem]">{kit3Results.margem.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* COLUNA 3: VIABILIDADE E ROI */}
        <div className="flex flex-col gap-8 h-full">
          <section className="glass-card p-6 rounded-2xl shadow-xl flex-1">
            <h3 className={sectionTitleStyle}>Análise de Viabilidade</h3>
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50 mb-3 font-black text-[0.7rem] text-slate-500 uppercase tracking-widest">
              <span>Indicador</span>
              <span className="text-right">Original</span>
              <span className="text-right text-orange-500">R$</span>
            </div>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-400">Markup Real:</span>
                <span className="font-bold text-lg text-right">{results.markup.toFixed(2)}x</span>
                <span className="font-bold text-lg text-right text-slate-600">-</span>
              </div>
              {[
                { label: 'CPA Break-even', val: results.breakEvenCpa, color: 'text-orange-500' },
                { label: 'Lucro Unitário', val: results.lucro, color: 'text-green-500' },
                { label: 'Custo Produto', val: results.custoLogistica, color: '' },
                { label: 'CPA Marketing', val: results.vlrMkt, color: '' },
                { label: 'Taxas + Imp.', val: results.vlrTaxasImp, color: '' }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-sm font-medium text-slate-400">{item.label}:</span>
                  <span className={`font-bold text-[0.8rem] text-right ${moeda === 'R$' ? 'text-slate-600' : (item.color || '')}`}>
                    {moeda === 'R$' ? '-' : formatCurrency(item.val)}
                  </span>
                  <span className={`font-bold text-[0.8rem] text-right ${item.color || ''}`}>
                    {formatCurrency(item.val * taxaCambio)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-6 rounded-2xl shadow-xl relative overflow-hidden flex-1">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-orange-600 font-black uppercase text-sm tracking-widest mb-6 flex items-center gap-2">
              <span className="text-xl">📈</span> Planejamento de Escala & ROI
            </h3>
            <div className="space-y-6">
              <div className="text-center">
                <label className={labelStyle}>Orçamento Diário Ads ({moeda})</label>
                <input 
                  type="number" 
                  value={orcamentoDiario || ''} 
                  onChange={(e) => setOrcamentoDiario(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800/80 border border-slate-700 p-2.5 rounded-lg text-center text-xl font-bold outline-none focus:ring-2 focus:ring-orange-600 light:bg-slate-100 light:text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50 light:bg-slate-50 text-center">
                  <small className="block text-[0.55rem] text-slate-500 font-bold uppercase mb-1 leading-tight">Lucro Diário</small>
                  <div className={`text-base font-black ${scaleMetrics.lucroProjetado >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {moeda} {formatCurrency(scaleMetrics.lucroProjetado)}
                  </div>
                </div>
                <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50 light:bg-slate-50 text-center">
                  <small className="block text-[0.55rem] text-slate-500 font-bold uppercase mb-1 leading-tight">ROI Projetado</small>
                  <div className="text-base font-black text-orange-500">
                    {scaleMetrics.roiEstimado.toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[0.65rem] font-bold uppercase text-slate-500">
                  <span>Saúde da Oferta</span>
                  <span className={scaleMetrics.healthScore > 70 ? 'text-green-500' : scaleMetrics.healthScore > 40 ? 'text-yellow-500' : 'text-red-500'}>
                    {scaleMetrics.healthScore}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 light:bg-slate-200 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${scaleMetrics.healthScore > 70 ? 'bg-green-500' : scaleMetrics.healthScore > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                    style={{ width: `${scaleMetrics.healthScore}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Projections */}
      <div className="mt-12">
        <h3 className={sectionTitleStyle}>Projeção Mensal & Meta Diária</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {projectionSteps.map(q => {
            const lucroTotal = results.lucro * q;
            const lucroTotalBRL = lucroTotal * taxaCambio;
            return (
              <div key={q} className="glass-card p-5 rounded-xl text-center border-orange-600/20 shadow-lg">
                <small className="block text-[0.8rem] text-slate-500 font-bold uppercase mb-2">{q} VENDAS/MÊS</small>
                <div className={`font-bold text-2xl ${lucroTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {moeda} {formatCurrency(lucroTotal)}
                </div>
                {moeda !== 'R$' && (
                  <div className="text-[0.85rem] text-slate-500 font-medium leading-tight text-center mt-0.5">
                    R$ {formatCurrency(lucroTotalBRL)}
                  </div>
                )}
                <span className="block text-[0.8rem] text-slate-500 mt-2 font-semibold">Média {(q/30).toFixed(0)}/dia</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTÃO SALVAR CENTRALIZADO APÓS PROJEÇÕES */}
      <div className="mt-10 flex justify-center">
        <div className="w-full max-w-[400px]">
          <button 
            onClick={salvarHistorico} 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-2xl transition-all uppercase tracking-widest shadow-xl shadow-green-900/20 text-base"
          >
            SALVAR NO HISTÓRICO
          </button>
        </div>
      </div>

      {/* History */}
      <div className="mt-16 pt-8 border-t border-slate-800">
        <h3 className={sectionTitleStyle}>Histórico de Produtos Salvos</h3>
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-slate-500 text-center py-10 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700 text-base">Nenhum produto salvo no histórico.</p>
          ) : history.map(item => (
            <div key={item.id} className="glass-card p-5 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:border-orange-600/50 shadow-md">
              <div className="text-center md:text-left flex-1">
                <strong className="text-xl block">{item.nome}</strong>
                <small className="text-slate-500 font-bold text-[0.85rem]">{item.data}</small>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <small className="text-slate-500 block text-[0.85rem]">Venda: {item.moeda} {formatCurrency(item.venda)}</small>
                  <strong className="text-green-500 text-lg">Lucro: {item.lucro}</strong>
                  <small className="text-slate-500 block text-[0.75rem] font-bold uppercase tracking-wider">{item.margem} Margem</small>
                </div>
                <button 
                  onClick={() => excluirItem(item.id)}
                  className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full flex items-center justify-center transition-all border border-red-500/30"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Support */}
      <footer className="mt-20 mb-12 text-center space-y-10">
        <div className="glass-card p-12 rounded-[2.5rem] shadow-2xl max-w-3xl mx-auto text-center border-orange-600/30">
          <h2 className="text-orange-600 text-3xl font-black mb-6">Obrigado por utilizar o PrecificEcom!</h2>
          <p className="text-slate-400 text-base max-w-lg mx-auto mb-10 font-medium leading-relaxed">
            Ferramenta desenvolvida para ajudar empreendedores a escalarem com lucro real no e-commerce.
          </p>
          <button 
            onClick={fazerPix}
            className="bg-green-600 hover:bg-green-700 text-white font-black py-5 px-10 rounded-2xl transition-all uppercase tracking-widest shadow-lg shadow-green-900/40 text-base"
          >
            APOIAR O PROJETO (VIA PIX)
          </button>
          <div className="mt-8 text-[0.8rem] text-slate-500 font-bold leading-relaxed">
            CNPJ: 49.276.400/0001-13 <br />
            OTIMIZA NEGOCIOS DIGITAIS LTDA | MEDIATION DIGITAL
          </div>
          {pixStatus && <p className="mt-6 text-sm text-green-500 font-black animate-pulse">{pixStatus}</p>}
        </div>
        <div className="text-[0.75rem] text-slate-600 font-bold tracking-widest uppercase pb-10">
          © 2025 PrecificEcom - Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default App;
