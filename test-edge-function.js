import { createClient } from '@supabase/supabase-js';

const serviceSupabase = createClient(
  'https://cvhanylywsdeblhebicj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsaGViaWNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYyNDcyNCwiZXhwIjoyMDc0MjAwNzI0fQ.CqI4AaeeLIAHkDHI56-nXV2JITCEY2-IPtl6h7renKA'
);

async function testEdgeFunctionLogic() {
  console.log('🔍 Testing edge function logic...');
  
  const now = new Date().toISOString();
  console.log('⏰ Current time (now):', now);
  
  // Test the exact query the edge function uses
  const { data: scheduledMessages, error: scheduledError } = await serviceSupabase
    .from('messages')
    .select('*')
    .eq('status', 'SCHEDULED')
    .lte('scheduledFor', now);
  
  if (scheduledError) {
    console.error('❌ Error:', scheduledError);
  } else {
    console.log('📧 Messages found by edge function query:', scheduledMessages?.length || 0);
    
    if (scheduledMessages && scheduledMessages.length > 0) {
      scheduledMessages.forEach((msg, i) => {
        console.log(`${i + 1}. ${msg.title} - Scheduled: ${msg.scheduledFor} - Status: ${msg.status}`);
        console.log(`   - scheduledFor <= now: ${msg.scheduledFor <= now}`);
        console.log(`   - scheduledFor: ${msg.scheduledFor}`);
        console.log(`   - now: ${now}`);
      });
    }
  }
  
  // Also test without the lte filter
  console.log('\n🔍 All SCHEDULED messages (without time filter):');
  const { data: allScheduled, error: allScheduledError } = await serviceSupabase
    .from('messages')
    .select('*')
    .eq('status', 'SCHEDULED');
  
  if (allScheduledError) {
    console.error('❌ Error:', allScheduledError);
  } else {
    console.log('📧 All scheduled messages:', allScheduled?.length || 0);
    allScheduled?.forEach((msg, i) => {
      const isOverdue = msg.scheduledFor <= now;
      console.log(`${i + 1}. ${msg.title} - Scheduled: ${msg.scheduledFor} - Overdue: ${isOverdue}`);
    });
  }
}

testEdgeFunctionLogic().catch(console.error);
