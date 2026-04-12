import { Platform } from 'react-native';
// const serverUrl = Platform.OS === 'web' ? 'http://localhost:8080/api' : 'http://172.18.0.3:8080'; // a device accessible IP for mobile
const serverUrl = process.env.EXPO_PUBLIC_API_URL ;

const user = "/user";
const services = "/services";

const userEndpoint = serverUrl + user;
const servicesEndpoint = serverUrl + services;

export const endpoints = {
  register: userEndpoint + "/register",
  login: userEndpoint + "/login",
  addStock: userEndpoint + "/stock",
  getStocks: userEndpoint + "/stocks",
  updateStock: userEndpoint + "/stock",
  deleteStock: userEndpoint + "/stock",
  updateRisk: userEndpoint + "/risk",
  getRiskPreference: userEndpoint + "/risk-preference",
  
  getRiskMetrics: servicesEndpoint + "/risk-metrics",
  getStockRiskCategories: servicesEndpoint + "/stock-risk-categories",
  getDiversificationSuggestions: servicesEndpoint + "/diversification-suggestions",
  getRandomSuggestions: servicesEndpoint + "/random-suggestions",
  getStockNews: servicesEndpoint + "/stock-news",
  getStockSentiment: servicesEndpoint + "/stock-sentiment",
  getPerformanceMetrics: servicesEndpoint + "/performance-metrics",
  getStockRisk: servicesEndpoint + "/check-stock-risk",
  simulateStock: servicesEndpoint + "/simulate-stock"

};
