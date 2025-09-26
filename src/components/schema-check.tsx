import React, { useState } from 'react';
import { Button } from './ui/button';
import { supabase } from '@/lib/supabase';

export function SchemaCheck() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const checkSchema = async () => {
    setChecking(true);
    console.log('🔍 Checking database schema...');
    
    try {
      // Check if tables exist and their structure
      const checks = {
        users: null,
        messages: null,
        recipients: null,
        errors: []
      };

      // Test users table
      try {
        const { data, error } = await supabase.from('users').select('*').limit(1);
        if (error) {
          checks.errors.push(`Users table error: ${error.message}`);
          console.error('Users table error:', error);
        } else {
          checks.users = 'OK';
          console.log('✅ Users table accessible');
        }
      } catch (e) {
        checks.errors.push(`Users table exception: ${e}`);
      }

      // Test messages table
      try {
        const { data, error } = await supabase.from('messages').select('*').limit(1);
        if (error) {
          checks.errors.push(`Messages table error: ${error.message}`);
          console.error('Messages table error:', error);
        } else {
          checks.messages = 'OK';
          console.log('✅ Messages table accessible');
        }
      } catch (e) {
        checks.errors.push(`Messages table exception: ${e}`);
      }

      // Test recipients table
      try {
        const { data, error } = await supabase.from('recipients').select('*').limit(1);
        if (error) {
          checks.errors.push(`Recipients table error: ${error.message}`);
          console.error('Recipients table error:', error);
        } else {
          checks.recipients = 'OK';
          console.log('✅ Recipients table accessible');
        }
      } catch (e) {
        checks.errors.push(`Recipients table exception: ${e}`);
      }

      setResults(checks);
      console.log('Schema check results:', checks);
      
    } catch (error) {
      console.error('Schema check failed:', error);
      setResults({ error: error.message });
    }
    
    setChecking(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-50">
      <Button 
        onClick={checkSchema}
        disabled={checking}
        variant="outline"
        className="bg-blue-500 text-white mb-2"
      >
        {checking ? '⏳ Checking...' : '🔍 Check Schema'}
      </Button>
      
      {results && (
        <div className="bg-white border rounded p-2 text-xs max-w-xs">
          <div>Users: {results.users || '❌'}</div>
          <div>Messages: {results.messages || '❌'}</div>
          <div>Recipients: {results.recipients || '❌'}</div>
          {results.errors?.length > 0 && (
            <div className="text-red-600 mt-2">
              <div>Errors:</div>
              {results.errors.map((err, i) => (
                <div key={i} className="text-xs">{err}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}



