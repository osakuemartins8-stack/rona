// Supabase Configuration
const SUPABASE_URL = 'https://glnfhjudzdwetdloofvk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsbmZoanVkemR3ZXRkbG9vZnZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTE2MzcsImV4cCI6MjA4NTM2NzYzN30.74j2K1FprAH4C3d_H3b588RcRPj39EKtSV1UUskNOW0';

// Initialize Supabase client (only if not already exists)
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Also set as supabase for compatibility
if (typeof window.supabase === 'undefined' || !window.supabase.auth) {
    window.supabase = window.supabaseClient;
}
