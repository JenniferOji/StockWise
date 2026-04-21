import { Platform } from 'react-native';
// const serverUrl = Platform.OS === 'web' ? 'http://localhost:8080' : 'http://172.18.0.3:8080'; // a device accessible IP for mobile
const serverUrl = process.env.EXPO_PUBLIC_API_URL ;

const api = "/api";
const users = "/users";
const sessions = "/sessions";
const portfolios = "/portfolios";
const stocks = "/stocks";

const usersEndpoint = serverUrl + api + users;
const sessionsEndpoint = serverUrl + api + sessions;
const portfoliosEndpoint = serverUrl + api + portfolios;
const stocksEndpoint = serverUrl + api + stocks;


export const endpoints = {
  register: usersEndpoint,
  login: sessionsEndpoint,
  addStock: (userId: number) => `${usersEndpoint}/${userId}/stocks`,
  getStocks: (userId: number) => `${usersEndpoint}/${userId}/stocks`,
  updateStock: (userId: number, stockId: number) => `${usersEndpoint}/${userId}/stocks/${stockId}`,
  deleteStock: (userId: number, stockId: number) => `${usersEndpoint}/${userId}/stocks/${stockId}`,
  updateRisk: (userId: number) => `${usersEndpoint}/${userId}/risk-preference`,
  getRiskPreference: (userId: number) => `${usersEndpoint}/${userId}/risk-preference`,
  
  getRiskMetrics: portfoliosEndpoint + "/risk-metrics",
  getStockRiskCategories: portfoliosEndpoint + "/risk-categories",
  getDiversificationSuggestions: portfoliosEndpoint + "/diversification-suggestions",
  getRandomSuggestions: portfoliosEndpoint + "/random-suggestions",
  getPerformanceMetrics: portfoliosEndpoint + "/performance-metrics",
  getStockRisk: (symbol: string) => `${stocksEndpoint}/${encodeURIComponent(symbol)}/risk`,
  getStockNews: (symbol: string) => `${stocksEndpoint}/${encodeURIComponent(symbol)}/news`,
  getStockSentiment: (symbol: string) => `${stocksEndpoint}/${encodeURIComponent(symbol)}/sentiment`,
  simulateStock: portfoliosEndpoint + "/simulations"

};
