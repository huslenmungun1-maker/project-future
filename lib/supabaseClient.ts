import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://rkxmpchvekmusphhkvtu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJreG1wY2h2ZWttdXNwaGhrdnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMjI5ODQsImV4cCI6MjA3NzY5ODk4NH0.0cO3v1dYFNUVV_oe7S98T5qevvbmRPF81_G7dCmT6MQ"
);
