const LOCAL_API = 'http://localhost:3000/api';
const PROD_API = 'https://sportie-server.onrender.com/api'; 

const isLocal = 
    window.location.href.includes('localhost') || 
    window.location.href.includes('127.0.0.1');

export const API_BASE = isLocal ? LOCAL_API : PROD_API;