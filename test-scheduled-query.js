// Test script to check if scheduled messages exist in database
const SUPABASE_URL = 'https://cvhanylywsdeblhebicj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsYmViaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjQ3MjQsImV4cCI6MjA3NDIwMDcyNH0._nA5MbOSQciz-Xy_zv6Z-IIb0ssrY5ZLVqBtaVoDRM4';

async function testScheduledQuery() {
  console.log('🔍 Testing scheduled message query...');
  
  try {
    // Query messages table directly
    const response = await fetch(`${SUPABASE_URL}/rest/v1/messages?status=eq.SCHEDULED&select=*`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const messages = await response.json();
      console.log('✅ Found scheduled messages:', messages.length);
      
      if (messages.length > 0) {
        console.log('📋 Scheduled messages:');
        messages.forEach(msg => {
          console.log(`  - ${msg.id}: ${msg.title}`);
          console.log(`    Status: ${msg.status}`);
          console.log(`    Scheduled for: ${msg.scheduledFor}`);
          console.log(`    Now: ${new Date().toISOString()}`);
          console.log(`    Is past due: ${new Date(msg.scheduledFor) <= new Date()}`);
          console.log('    ---');
        });
      } else {
        console.log('❌ No scheduled messages found');
      }
    } else {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testScheduledQuery();


