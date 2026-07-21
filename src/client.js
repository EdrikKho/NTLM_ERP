import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yminvdgvahasibsehzkq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltaW52ZGd2YWhhc2lic2VoemtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDk2MzYsImV4cCI6MjA5MTQyNTYzNn0.47HD8JAc5CnIDwO6Vr_d23KMY0w9vYTq-9vXMaAkbHw'

export const supabase = createClient(supabaseUrl, supabaseKey)