// src/lib/config.js
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// Use the same embedding model that matches your Supabase DB vectors
// Your current DB uses 1536 dimensions → text-embedding-3-small
export const EMBEDDING_MODEL = "text-embedding-3-small";

// Load from Vite environment variables
const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!openaiKey || !supabaseUrl || !supabaseAnon) {
  console.warn("⚠️ Config error: check .env (OpenAI & Supabase). The UI will still load.");
}

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: openaiKey,
  dangerouslyAllowBrowser: true, // Allows frontend use (for educational/demo apps)
});

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnon);
