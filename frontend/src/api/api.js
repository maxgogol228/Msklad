
import axios from "axios";
import { getUser } from "../utils/user";

const API = axios.create({
  baseURL: "https://m-sklad.onrender.com/api"
});

API.interceptors.request.use(config=>{
  config.headers["x-user"] = getUser();
  return config;
});

export default API;
