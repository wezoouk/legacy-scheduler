// Debug script to test scheduled message processing
const SUPABASE_URL = 'https://cvhanylywsdeblhebicj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aGFueWx5d3NkZWJsYmViaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjQ3MjQsImV4cCI6MjA3NDIwMDcyNH0._nA5MbOSQciz-Xy_zv6Z-IIb0ssrY5ZLVqBtaVoDRM4';

async function testScheduledMessages() {
  console.log('🔍 Testing scheduled message processing...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-scheduled-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5175'
      },
      body: JSON.stringify({ emergency_release: false })
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Response:', result);
    } else {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testScheduledMessages();
