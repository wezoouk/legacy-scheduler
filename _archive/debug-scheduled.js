// Debug scheduled messages in browser console
// Copy and paste this into your browser console at http://localhost:5174

console.log('🔍 Debugging Scheduled Messages...');

// Check if scheduled message service is running
if (window.ScheduledMessageService) {
  console.log('✅ Scheduled message service is available');
  console.log('Service status:', window.ScheduledMessageService.getStatus());
  
  // Manually trigger a check
  console.log('🔄 Triggering manual check...');
  window.ScheduledMessageService.triggerCheck();
} else {
  console.log('❌ Scheduled message service not found');
}

// Check localStorage for scheduled messages
console.log('\n📋 Checking localStorage for users and messages...');

const users = JSON.parse(localStorage.getItem('legacyScheduler_users') || '[]');
console.log(`Found ${users.length} users in localStorage`);

users.forEach(user => {
  const messagesKey = `messages_${user.id}`;
  const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
  const scheduledMessages = messages.filter(m => m.status === 'SCHEDULED');
  
  console.log(`User ${user.email}: ${scheduledMessages.length} scheduled messages`);
  
  scheduledMessages.forEach(msg => {
    const now = new Date();
    const scheduledFor = new Date(msg.scheduledFor);
    const isOverdue = scheduledFor <= now;
    
    console.log(`  - "${msg.title}" scheduled for ${msg.scheduledFor} ${isOverdue ? '(OVERDUE)' : '(FUTURE)'}`);
  });
});

// Check if we have any recipients
const recipientsKeys = Object.keys(localStorage).filter(key => key.startsWith('recipients_'));
console.log(`\n👥 Found ${recipientsKeys.length} recipient sets`);

recipientsKeys.forEach(key => {
  const recipients = JSON.parse(localStorage.getItem(key) || '[]');
  console.log(`${key}: ${recipients.length} recipients`);
});



