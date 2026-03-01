import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Role hierarchy
export const ROLES = {
  admin: 'admin',
  office_manager: 'office_manager',
  foreman: 'foreman',
  field_crew: 'field_crew',
};

export const ROLE_LABELS = {
  admin: 'Admin',
  office_manager: 'Office Manager',
  foreman: 'Foreman',
  field_crew: 'Field Crew',
};

// What each role can access
export const PERMISSIONS = {
  admin:          { dashboard:true, assets:true,  log:true,  damage:true, invoices:true, history:true, costs:true, pm:true,  users:true  },
  office_manager: { dashboard:true, assets:false, log:false, damage:true, invoices:true, history:true, costs:true, pm:false, users:false },
  foreman:        { dashboard:true, assets:false, log:true,  damage:true, invoices:false,history:true, costs:false,pm:true,  users:false },
  field_crew:     { dashboard:false,assets:false, log:true,  damage:true, invoices:false,history:false,costs:false,pm:false, users:false },
};

export const can = (role, action) => {
  return PERMISSIONS[role]?.[action] ?? false;
};

// Auth helpers
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();
