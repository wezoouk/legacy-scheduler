// Check the actual message status and scheduledFor time
const SUPABASE_URL = 'https://cvhanylywsdeblhebicj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsYmViaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjQ3MjQsImV4cCI6MjA3NDIwMDcyNH0._nA5MbOSQciz-Xy_zv6Z-IIb0ssrY5ZLVqBtaVoDRM4';

async function checkMessageStatus() {
  console.log('🔍 Checking message status...');
  
  try {
    // Get all messages
    const response = await fetch(`${SUPABASE_URL}/rest/v1/messages?select=*`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const messages = await response.json();
      console.log('📋 All messages:');
      
      messages.forEach(msg => {
        console.log(`  - ID: ${msg.id}`);
        console.log(`    Title: ${msg.title}`);
        console.log(`    Status: ${msg.status}`);
        console.log(`    Scheduled For: ${msg.scheduledFor}`);
        console.log(`    Scope: ${msg.scope}`);
        console.log(`    Now: ${new Date().toISOString()}`);
        console.log(`    Is past due: ${msg.scheduledFor ? new Date(msg.scheduledFor) <= new Date() : 'N/A'}`);
        console.log('    ---');
      });
      
      // Check specifically for scheduled messages
      const scheduled = messages.filter(m => m.status === 'SCHEDULED');
      console.log(`\n📅 Scheduled messages: ${scheduled.length}`);
      
      const pastDue = scheduled.filter(m => m.scheduledFor && new Date(m.scheduledFor) <= new Date());
      console.log(`⏰ Past due scheduled messages: ${pastDue.length}`);
      
    } else {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the check
checkMessageStatus();


