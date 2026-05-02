import axios from "axios";

const API = axios.create({
  baseURL: "https://m-sklad.onrender.com"
});

export default API;
