import React, { useState } from 'react';
import { Button } from './ui/button';
import { supabase } from '@/lib/supabase';
import { useAuthUserId } from '@/lib/useAuthUserId';

export function RecipientTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');
  const authUser = useAuthUserId();

  const fullTest = async () => {
    setTesting(true);
    console.log('🔍 FULL RECIPIENT TEST START');
    
    let report = '';
    
    try {
      // 1. Check auth
      report += `Auth User: ${JSON.stringify(authUser)}\n`;
      console.log('Auth User:', authUser);
      
      // 2. Check UUID
      const isSupabaseUser = authUser.id && authUser.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      report += `Is Supabase User: ${isSupabaseUser}\n`;
      console.log('Is Supabase User:', isSupabaseUser);
      
      // 3. Check Supabase
      if (!supabase) {
        report += 'ERROR: Supabase not available\n';
        setResult(report);
        return;
      }
      
      // 4. Test table access
      try {
        const { data: testSelect, error: selectError } = await supabase
          .from('recipients')
          .select('count')
          .limit(1);
        
        if (selectError) {
          report += `Table access error: ${selectError.message}\n`;
        } else {
          report += 'Table access: OK\n';
        }
      } catch (e) {
        report += `Table access exception: ${e}\n`;
      }
      
      // 5. Test insert with minimal data
      const testData = {
        id: crypto.randomUUID(),
        userId: authUser.id,
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        timezone: 'Europe/London',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      report += `Test data: ${JSON.stringify(testData, null, 2)}\n`;
      console.log('Test data:', testData);
      
      // 6. Attempt insert
      const { data: insertData, error: insertError } = await supabase
        .from('recipients')
        .insert(testData)
        .select();
      
      if (insertError) {
        report += `Insert error: ${insertError.message}\n`;
        console.error('Insert error:', insertError);
      } else {
        report += `Insert success: ${JSON.stringify(insertData)}\n`;
        console.log('Insert success:', insertData);
        
        // Clean up
        await supabase.from('recipients').delete().eq('id', testData.id);
        report += 'Cleanup completed\n';
      }
      
    } catch (error) {
      report += `Exception: ${error}\n`;
      console.error('Test exception:', error);
    }
    
    console.log('🔍 FULL RECIPIENT TEST END');
    setResult(report);
    setTesting(false);
  };

  return (
    <div className="fixed bottom-44 right-4 z-50">
      <Button 
        onClick={fullTest}
        disabled={testing}
        variant="outline"
        className="bg-green-500 text-white mb-2"
      >
        {testing ? '⏳ Testing...' : '🔬 Full Test'}
      </Button>
      
      {result && (
        <div className="bg-white border rounded p-2 text-xs max-w-md max-h-64 overflow-auto">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}



