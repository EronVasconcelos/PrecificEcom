
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
};

const App: React.FC = () => {
  const [data, setData] = useState<ProductData>(INITIAL_STATE);
  const [moeda, setMoeda] = useState('R$');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pixStatus, setPixStatus] = useState('');

  // Initial Load
  useEffect(() => {
    const savedTheme = localStorage.getItem('precificecom_theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);

    const savedHistory = localStorage.getItem('precificecom_final_db');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Update theme on body
  useEffect(() => {
    document.body.className = theme === 'dark' 
      ? 'dark bg-[#020617] text-slate-100 min-h-screen p-4 md:p-8' 
      : 'light bg-slate-50 text-slate-900 min-h-screen p-4 md:p-8';
    localStorage.setItem('precificecom_theme', theme);
  }, [theme]);

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
    const vlrTaxasImp = data.precoVenda * ((data.taxaCheck + data.taxaGate + data.impVenda + data.contingencia) / 100);
    const lucro = data.precoVenda - custoLogistica - vlrMkt - vlrTaxasImp;
    const margem = data.precoVenda > 0 ? (lucro / data.precoVenda) * 100 : 0;
    const markup = custoLogistica > 0 ? data.precoVenda / custoLogistica : 0;
    const breakEvenCpa = data.precoVenda - custoLogistica - vlrTaxasImp;

    return { custoLogistica, vlrMkt, vlrTaxasImp, lucro, margem, markup, breakEvenCpa };
  }, [data]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const novoProjeto = () => {
    if (window.confirm("Deseja zerar todos os campos para uma nova precificação?")) {
      setData(INITIAL_STATE);
    }
  };

  const aplicarSugestao = (margemAlvo: number) => {
    const custoTotalOrigem = (data.custoProd + data.frete) * (1 + (data.impImp + data.icms) / 100);
    const percentuaisVariaveis = (data.taxaCheck + data.taxaGate + data.impVenda + data.mktPerc + data.contingencia) / 100;
    const divisor = 1 - percentuaisVariaveis - margemAlvo;
    if (divisor > 0) {
      setData(prev => ({ ...prev, precoVenda: parseFloat((custoTotalOrigem / divisor).toFixed(2)) }));
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

  return (
    <div className="max-w-[1050px] mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center border-b-2 border-orange-600 pb-4 mb-8 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-extrabold tracking-tighter">
            <span className="text-orange-600">Precific</span>Ecom
          </h1>
          <p className="text-[0.7rem] text-slate-500 font-bold uppercase mt-1">By Eron Vasconcelos</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          <button onClick={novoProjeto} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-all uppercase text-sm shadow-lg">
            + NOVO
          </button>
          <button onClick={exportarCSV} className="border border-orange-600 text-orange-600 hover:bg-orange-600 hover:text-white font-bold py-2 px-4 rounded-lg transition-all uppercase text-sm">
            Exportar CSV
          </button>
          <select 
            value={moeda} 
            onChange={(e) => setMoeda(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white font-bold py-2 px-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 dark:bg-slate-900 light:bg-white light:text-slate-900 light:border-slate-300"
          >
            <option value="R$">BRL (R$)</option>
            <option value="$">USD ($)</option>
            <option value="€">EUR (€)</option>
            <option value="£">GBP (£)</option>
          </select>
          <button onClick={toggleTheme} className="bg-slate-800 border border-slate-700 text-white p-2 rounded-lg hover:bg-slate-700 transition-all dark:bg-slate-900 light:bg-white light:text-slate-900 light:border-slate-300">
            🌓
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          <section className="glass-card p-6 rounded-2xl shadow-xl">
            <h3 className="text-orange-600 font-bold uppercase text-xs tracking-widest mb-6">1. Identificação e Custos</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Nome do Produto</label>
                <input 
                  type="text" id="nomeProd" value={data.nome} onChange={handleChange}
                  placeholder="Ex: Produto A" 
                  className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Custo Produto</label>
                  <input type="number" id="custoProd" value={data.custoProd || ''} onChange={handleChange} placeholder="0.00" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Frete (Envio)</label>
                  <input type="number" id="frete" value={data.frete || ''} onChange={handleChange} placeholder="0.00" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Importação (%)</label>
                  <input type="number" id="impImp" value={data.impImp || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">ICMS / IOF (%)</label>
                  <input type="number" id="icms" value={data.icms || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-6 rounded-2xl shadow-xl">
            <h3 className="text-orange-600 font-bold uppercase text-xs tracking-widest mb-6">2. Operação & Marketing</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Checkout (%)</label>
                  <input type="number" id="taxaCheck" value={data.taxaCheck || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Gateway (%)</label>
                  <input type="number" id="taxaGate" value={data.taxaGate || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Imposto Venda (%)</label>
                  <input type="number" id="impVenda" value={data.impVenda || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
                <div>
                  <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Trocas/Devoluções (%)</label>
                  <input type="number" id="contingencia" value={data.contingencia || ''} onChange={handleChange} placeholder="0" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
                </div>
              </div>
              <div>
                <label className="block text-[0.7rem] text-slate-500 font-bold uppercase mb-2">Marketing (CPA Ideal %)</label>
                <input type="number" id="mktPerc" value={data.mktPerc || ''} onChange={handleChange} placeholder="25" className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-lg outline-none focus:ring-2 focus:ring-orange-600 transition-all dark:bg-slate-900/80 light:bg-slate-100 light:border-slate-300 light:text-slate-900" />
              </div>
            </div>
          </section>

          <section className="bg-slate-900/40 border border-dashed border-orange-600 p-6 rounded-2xl shadow-xl light:bg-slate-200/50">
            <h3 className="text-orange-600 font-bold uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
              <span className="text-lg">💡</span> Consultoria de Margem
            </h3>
            <div className="flex gap-2">
              <button onClick={() => aplicarSugestao(0.2)} className="flex-1 bg-slate-800 hover:bg-orange-600 hover:text-white border border-orange-600 text-slate-300 font-bold py-3 rounded-xl transition-all text-xs dark:bg-slate-900/80 light:bg-white light:text-slate-900">20% LUCRO</button>
              <button onClick={() => aplicarSugestao(0.3)} className="flex-1 bg-slate-800 hover:bg-orange-600 hover:text-white border border-orange-600 text-slate-300 font-bold py-3 rounded-xl transition-all text-xs dark:bg-slate-900/80 light:bg-white light:text-slate-900">30% LUCRO</button>
              <button onClick={() => aplicarSugestao(0.4)} className="flex-1 bg-slate-800 hover:bg-orange-600 hover:text-white border border-orange-600 text-slate-300 font-bold py-3 rounded-xl transition-all text-xs dark:bg-slate-900/80 light:bg-white light:text-slate-900">40% LUCRO</button>
            </div>
          </section>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900/60 border-2 border-orange-600 rounded-[2rem] p-8 text-center shadow-2xl relative overflow-hidden light:bg-white">
            <label className="block text-orange-600 font-black uppercase text-xs tracking-widest mb-4">PREÇO DE VENDA DEFINIDO</label>
            <div className="bg-black/20 border border-slate-700 rounded-2xl p-4 mx-auto max-w-[280px] mb-4 dark:bg-black/40 light:bg-slate-100 light:border-slate-300">
              <div className="flex items-center justify-center">
                <span className="text-2xl font-bold mr-2 text-slate-400">{moeda}</span>
                <input 
                  type="number" id="precoVenda" value={data.precoVenda || ''} onChange={handleChange}
                  placeholder="0.00" 
                  className="bg-transparent border-none text-center text-5xl md:text-6xl font-black text-white outline-none w-full light:text-slate-900"
                />
              </div>
            </div>
            <div className={`text-5xl md:text-6xl font-black tracking-tighter mb-1 ${results.lucro >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {moeda} {formatCurrency(results.lucro)}
            </div>
            <span className="text-xs font-bold text-green-500 uppercase tracking-widest block mb-4">(Lucro Estimado)</span>
            <div className="text-xl font-bold text-green-500 bg-green-500/10 inline-block px-4 py-1 rounded-full border border-green-500/20">
              Margem Final: {results.margem.toFixed(1)}%
            </div>
          </div>

          <section className="glass-card p-6 rounded-2xl shadow-xl flex-1">
            <h3 className="text-orange-600 font-bold uppercase text-xs tracking-widest mb-6">Análise de Viabilidade</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-400">Markup Real:</span>
                <span className="font-bold text-lg">{results.markup.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-400">CPA Break-even:</span>
                <span className="font-bold text-lg text-orange-500">{moeda} {formatCurrency(results.breakEvenCpa)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-400">Lucro Unitário:</span>
                <span className="font-bold text-lg text-green-500">{moeda} {formatCurrency(results.lucro)}</span>
              </div>
              <div className="flex justify-between items-center py-2 mt-4">
                <span className="text-sm font-medium text-slate-400">(-) Logística Total:</span>
                <span className="font-medium">{moeda} {formatCurrency(results.custoLogistica)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-slate-400">(-) CPA Marketing:</span>
                <span className="font-medium">{moeda} {formatCurrency(results.vlrMkt)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-slate-400">(-) Taxas + Impostos:</span>
                <span className="font-medium">{moeda} {formatCurrency(results.vlrTaxasImp)}</span>
              </div>
            </div>
            <button onClick={salvarHistorico} className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest shadow-lg shadow-green-900/20">
              SALVAR NO HISTÓRICO
            </button>
          </section>
        </div>
      </div>

      {/* Projections */}
      <div className="mt-12">
        <h3 className="text-orange-600 font-bold uppercase text-xs tracking-widest mb-6">Projeção Mensal & Meta Diária</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {projectionSteps.map(q => {
            const lucroTotal = results.lucro * q;
            return (
              <div key={q} className="glass-card p-4 rounded-xl text-center border-orange-600/20">
                <small className="block text-[0.6rem] text-slate-500 font-bold uppercase mb-2">{q} VENDAS/MÊS</small>
                <div className={`font-bold text-lg ${lucroTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {moeda} {formatCurrency(lucroTotal)}
                </div>
                <span className="block text-[0.6rem] text-slate-500 mt-2 font-semibold">Média de {(q/30).toFixed(0)} pedidos/dia</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="mt-16 pt-8 border-t border-slate-800">
        <h3 className="text-orange-600 font-bold uppercase text-xs tracking-widest mb-6">Histórico de Produtos Salvos</h3>
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-slate-500 text-center py-8 bg-slate-900/30 rounded-2xl border border-dashed border-slate-700">Nenhum produto salvo no histórico.</p>
          ) : history.map(item => (
            <div key={item.id} className="glass-card p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all hover:border-orange-600/50">
              <div className="text-center md:text-left flex-1">
                <strong className="text-lg block">{item.nome}</strong>
                <small className="text-slate-500 font-bold">{item.data}</small>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <small className="text-slate-500 block">Venda: {item.moeda} {formatCurrency(item.venda)}</small>
                  <strong className="text-green-500">Lucro: {item.lucro}</strong>
                  <small className="text-slate-500 block text-[0.65rem] font-bold">{item.margem} Margem</small>
                </div>
                <button 
                  onClick={() => excluirItem(item.id)}
                  className="w-8 h-8 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-full flex items-center justify-center transition-all border border-red-500/30"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Support */}
      <footer className="mt-20 mb-12 text-center space-y-8">
        <div className="glass-card p-10 rounded-3xl shadow-2xl max-w-2xl mx-auto">
          <h2 className="text-orange-600 text-2xl font-black mb-4">Obrigado por utilizar o PrecificEcom!</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-8 font-medium">
            Ferramenta desenvolvida para ajudar empreendedores a escalarem com lucro real.
          </p>
          <button 
            onClick={fazerPix}
            className="bg-green-600 hover:bg-green-700 text-white font-black py-4 px-8 rounded-2xl transition-all uppercase tracking-widest shadow-lg shadow-green-900/30 text-sm"
          >
            APOIAR O PROJETO (VIA PIX)
          </button>
          <div className="mt-6 text-[0.7rem] text-slate-500 font-bold leading-relaxed">
            CNPJ: 49.276.400/0001-13 <br />
            OTIMIZA NEGOCIOS DIGITAIS LTDA | MEDIATION DIGITAL
          </div>
          {pixStatus && <p className="mt-4 text-xs text-green-500 font-black animate-pulse">{pixStatus}</p>}
        </div>

        <div className="text-[0.65rem] text-slate-600 font-bold tracking-widest uppercase pb-8">
          © 2025 PrecificEcom - Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default App;
