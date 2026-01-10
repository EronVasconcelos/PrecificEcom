
export interface ProductData {
  nome: string;
  custoProd: number;
  frete: number;
  impImp: number;
  icms: number;
  taxaCheck: number;
  taxaGate: number;
  impVenda: number;
  contingencia: number;
  mktPerc: number;
  precoVenda: number;
  taxaFixaPedido: number;
  taxaConversao: number;
}

export interface CalculationResults {
  custoLogistica: number;
  vlrMkt: number;
  vlrTaxasImp: number;
  lucro: number;
  margem: number;
  markup: number;
  breakEvenCpa: number;
}

export interface HistoryItem {
  id: number;
  nome: string;
  venda: number;
  lucro: string;
  margem: string;
  moeda: string;
  data: string;
}
