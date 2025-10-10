import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cvhanylywsdeblhebicj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsaGViaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjQ3MjQsImV4cCI6MjA3NDIwMDcyNH0._nA5MbOSQciz-Xy_zv6Z-IIb0ssrY5ZLVqBtaVoDRM4'
);

async function checkScheduledMessages() {
  console.log('🔍 Checking for scheduled messages...');
  
  // Try with RLS bypass (service role)
  const serviceSupabase = createClient(
    'https://cvhanylywsdeblhebicj.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsaGViaWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYyNDcyNCwiZXhwIjoyMDc0MjAwNzI0fQ.CqI4AaeeLIAHkDHI56-nXV2JITCEY2-IPtl6h7renKA'
  );
  
  const { data, error } = await serviceSupabase
    .from('messages')
    .select('*')
    .eq('status', 'SCHEDULED')
    .order('scheduledFor', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📧 Scheduled messages found:', data?.length || 0);
  
  if (data && data.length > 0) {
    data.forEach((msg, i) => {
      const scheduledFor = new Date(msg.scheduledFor);
      const now = new Date();
      const isOverdue = scheduledFor <= now;
      console.log(`${i + 1}. ${msg.title} - Scheduled: ${scheduledFor.toISOString()} - Overdue: ${isOverdue}`);
    });
  }
  
  // Also check all messages to see their status (with service role)
  console.log('\n🔍 Checking all messages...');
  const { data: allMessages, error: allError } = await serviceSupabase
    .from('messages')
    .select('id, title, status, scheduledFor, createdAt, recipientIds')
    .order('createdAt', { ascending: false })
    .limit(10);
  
  if (allError) {
    console.error('❌ Error fetching all messages:', allError);
  } else {
    console.log('📧 Recent messages:');
    allMessages?.forEach((msg, i) => {
      console.log(`${i + 1}. ${msg.title} - Status: ${msg.status} - Scheduled: ${msg.scheduledFor || 'N/A'} - Recipients: ${msg.recipientIds?.length || 0}`);
    });
  }
  
  // Check recipients too (with service role)
  console.log('\n🔍 Checking recipients...');
  const { data: recipients, error: recipientsError } = await serviceSupabase
    .from('recipients')
    .select('id, email, name')
    .limit(5);
  
  if (recipientsError) {
    console.error('❌ Error fetching recipients:', recipientsError);
  } else {
    console.log('👥 Recipients found:', recipients?.length || 0);
    recipients?.forEach((recip, i) => {
      console.log(`${i + 1}. ${recip.email} (${recip.name})`);
    });
  }
}

checkScheduledMessages().catch(console.error);
