import { Platform } from 'react-native';

const serverUrl = Platform.OS === 'web' ? 'http://localhost:4000/api' : 'http://192.168.1.21:4000/api'; // a device accessible IP for mobile
const user = "/user";

const userEndpoint = serverUrl + user;

export const endpoints = {
  register: userEndpoint + "/register",
  login: userEndpoint + "/login",
  addStock: userEndpoint + "/stock",
  getStocks: userEndpoint + "/stocks",
  updateStock: userEndpoint + "/stock",
  deleteStock: userEndpoint + "/stock",
  updateRisk: userEndpoint + "/risk",
};