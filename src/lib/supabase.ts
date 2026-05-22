import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Schema:
//
// -- generations
// -- id uuid primary key default gen_random_uuid()
// -- city text not null
// -- decade text not null
// -- sports text[] not null
// -- model_used text not null
// -- results jsonb not null (array of 3 memories)
// -- created_at timestamp with time zone default now()
//
// -- feedback
// -- id uuid primary key default gen_random_uuid()
// -- generation_id uuid references generations(id)
// -- type text not null (not_accurate/not_good/reorder/freeform)
// -- card_index integer
// -- reorder_value text
// -- freeform_text text
// -- created_at timestamp with time zone default now()
