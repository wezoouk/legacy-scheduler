// Debug recipient saving in browser console
// Copy and paste this into your browser console at http://localhost:5174

console.log('🔍 Testing recipient save functionality...');

// Check current auth state
const authData = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
console.log('Current auth user:', authData);

// Check Supabase connection
if (window.supabase) {
  console.log('✅ Supabase is available');
  
  // Test direct insert to recipients table
  window.supabase.from('recipients').select('count').single().then(result => {
    console.log('Recipients table access test:', result);
  }).catch(err => {
    console.error('❌ Recipients table access failed:', err);
  });
} else {
  console.log('❌ Supabase not available');
}

// Check if we can access the recipient creation function
console.log('Checking useRecipients hook...');
if (window.React) {
  console.log('React is available - hook should work');
} else {
  console.log('React context not available');
}

// Create a test recipient manually
const testRecipient = {
  name: 'Test Recipient',
  email: 'test@example.com',
  timezone: 'Europe/London',
  verified: false
};

console.log('Test recipient data:', testRecipient);
console.log('Try creating a recipient in the UI and watch for errors...');



