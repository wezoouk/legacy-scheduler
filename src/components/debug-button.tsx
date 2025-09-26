import React from 'react';
import { Button } from './ui/button';

export function DebugButton() {
  const handleDebug = () => {
    console.log('🔍 Full App Debug...');
    
    // 1. Check auth state
    const authUser = JSON.parse(localStorage.getItem('legacyScheduler_user') || '{}');
    console.log('Auth User:', authUser);
    
    // 2. Check Supabase availability
    if ((window as any).supabase) {
      console.log('✅ Supabase available');
    } else {
      console.log('❌ Supabase not available');
    }
    
    // 3. Check scheduled message service
    if ((window as any).ScheduledMessageService) {
      console.log('✅ Scheduled service available');
      (window as any).ScheduledMessageService.triggerCheck();
    } else {
      console.log('❌ Scheduled service not found');
    }
    
    // 4. Check recipients
    const recipients = JSON.parse(localStorage.getItem(`recipients_${authUser.id}`) || '[]');
    console.log(`Recipients in localStorage: ${recipients.length}`);
    recipients.forEach(r => console.log(`  - ${r.name} (${r.email})`));
    
    // 5. Check messages
    const messages = JSON.parse(localStorage.getItem(`messages_${authUser.id}`) || '[]');
    const scheduled = messages.filter(m => m.status === 'SCHEDULED');
    console.log(`Messages: ${messages.length} total, ${scheduled.length} scheduled`);
    
    scheduled.forEach(msg => {
      const isOverdue = new Date(msg.scheduledFor) <= new Date();
      console.log(`  - "${msg.title}" ${isOverdue ? '(OVERDUE)' : '(FUTURE)'}`);
    });
    
    alert('Full debug logged to console! Press F12 to see all results.');
  };

  return (
    <Button 
      onClick={handleDebug}
      variant="outline"
      className="fixed bottom-4 right-4 z-50 bg-red-500 text-white"
    >
      🔍 Debug Emails
    </Button>
  );
}
