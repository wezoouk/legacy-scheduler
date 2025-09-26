import React, { useState } from 'react';
import { Button } from './ui/button';
import { supabase } from '@/lib/supabase';
import { useAuthUserId } from '@/lib/useAuthUserId';

export function RecipientDebug() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');
  const authUser = useAuthUserId();

  const testRecipientSave = async () => {
    setTesting(true);
    setResult('');
    
    try {
      console.log('🧪 Testing recipient save...');
      console.log('Auth user:', authUser);
      
      if (!authUser.id) {
        setResult('❌ No auth user ID');
        return;
      }

      const testRecipient = {
        id: crypto.randomUUID(),
        userId: authUser.id,
        name: 'Test User',
        email: 'test@example.com',
        timezone: 'Europe/London',
        verified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Test recipient:', testRecipient);

      if (supabase) {
        console.log('Testing direct Supabase insert...');
        const { data, error } = await supabase
          .from('recipients')
          .insert(testRecipient)
          .select();

        if (error) {
          console.error('Supabase insert error:', error);
          setResult(`❌ Supabase error: ${error.message}`);
        } else {
          console.log('✅ Supabase insert successful:', data);
          setResult(`✅ Success! Inserted recipient: ${data?.[0]?.name}`);
          
          // Clean up test data
          await supabase.from('recipients').delete().eq('email', 'test@example.com');
        }
      } else {
        setResult('❌ Supabase not available');
      }
    } catch (error) {
      console.error('Test failed:', error);
      setResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed bottom-32 right-4 z-50">
      <Button 
        onClick={testRecipientSave}
        disabled={testing}
        variant="outline"
        className="bg-purple-500 text-white mb-2"
      >
        {testing ? '⏳ Testing...' : '🧪 Test Recipient'}
      </Button>
      
      {result && (
        <div className="bg-white border rounded p-2 text-xs max-w-xs">
          {result}
        </div>
      )}
    </div>
  );
}



