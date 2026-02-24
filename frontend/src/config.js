// export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
// export const MINIO_BASE_URL = import.meta.env.VITE_VIDEO_STORAGE_URL || "http://localhost:9000";
// export const BUCKET_NAME = "introduction"; 
// export const AGENT_ID = import.meta.env.VITE_AGENT_ID || "default_agent";
// --- ADD THIS LINE ---
// export const PARLANT_URL = import.meta.env.VITE_PARLANT_URL || "http://localhost:8800";


export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
export const MINIO_BASE_URL = import.meta.env.VITE_VIDEO_STORAGE_URL || "http://127.0.0.1:9000";
export const BUCKET_NAME = "introduction"; 

// --- UPDATED: Use 127.0.0.1 explicitly ---
export const PARLANT_URL = import.meta.env.VITE_PARLANT_URL || "http://127.0.0.1:8800"; 

export const AGENT_ID = import.meta.env.VITE_AGENT_ID || "default_agent";