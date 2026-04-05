import { Platform } from 'react-native';
import { get } from 'react-native/Libraries/NativeComponent/NativeComponentRegistry';

// const serverUrl = Platform.OS === 'web' ? 'http://localhost:8080/api' : 'http://172.18.0.3:8080'; // a device accessible IP for mobile
// const serverUrl = Platform.OS === 'web' ? 'https://ominous-doodle-pj7qx4vgg4qh944q-4000.app.github.dev/api' : 'https://ominous-doodle-pj7qx4vgg4qh944q-4000.app.github.dev/api'; // a device accessible URL for Codespaces
const serverUrl = process.env.EXPO_PUBLIC_API_URL;

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
  
  getRiskMetrics: servicesEndpoint + "/risk-metrics",
  getStockRiskCategories: servicesEndpoint + "/stock-risk-categories",
  getRiskPreference: userEndpoint + "/risk-preference",
  getDiversificationSuggestions: userEndpoint + "/diversification-suggestions",
  getRandomSuggestions: userEndpoint + "/random-suggestions",
  getStockNews: userEndpoint + "/stock-news",
  getStockSentiment: userEndpoint + "/stock-sentiment",
  getPerformanceMetrics: servicesEndpoint + "/performance-metrics",
  getStockRisk: servicesEndpoint + "/check-stock-risk",
  simulateStock: servicesEndpoint + "/simulate-stock"

};
