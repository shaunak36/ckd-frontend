import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://noncdetuaauxwxbrplqf.supabase.co";
const SUPABASE_KEY =
  "sb_publishable_QvBYHk4zCsFh4nFPQXvGJA_WqqyDm7k";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
