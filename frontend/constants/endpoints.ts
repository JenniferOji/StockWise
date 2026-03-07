import { getRiskMetrics } from '@/services/user';
import { Platform } from 'react-native';

// const serverUrl = Platform.OS === 'web' ? 'http://localhost:4000/api' : 'http://10.0.4.109:4000/api'; // a device accessible IP for mobile
const serverUrl = Platform.OS === 'web' ? 'https://ominous-doodle-pj7qx4vgg4qh944q-4000.app.github.dev/api' : 'https://ominous-doodle-pj7qx4vgg4qh944q-4000.app.github.dev/api'; // a device accessible URL for Codespaces
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
  getStockNews: userEndpoint + "/stock-news"


};