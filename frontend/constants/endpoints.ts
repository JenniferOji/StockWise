const serverUrl = "http://192.168.30.24:4000/api"; // use device-accessible IP for mobile
const user = "/user";

const userEndpoint = serverUrl + user;

export const endpoints = {
  register: userEndpoint + "/register",
  login: userEndpoint + "/login",
};