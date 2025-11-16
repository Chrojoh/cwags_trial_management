// Minimal placeholder until full Supabase types are generated
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          first_name: string | null;
          last_name: string | null;
          role: string | null;
          club_name: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          password_hash: string | null;
        };
      };
    };
  };
}
