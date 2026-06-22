
const LOCAL_API = 'http://localhost:3000/api';
const PROD_API = 'https://DEPLOYED-BACKEND/api'; 

const isLocal =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Use the local backend while developing, and the deployed one in production.
export const API_BASE = isLocal ? LOCAL_API : PROD_API;
