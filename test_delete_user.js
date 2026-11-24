import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://crlrjkpoxlkbpjfqnyyr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNybHJqa3BveGxrYnBqZnFueXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTY5MTQsImV4cCI6MjEwMTY5MjkxNH0.khdA6Dm5RinWa00YdKKrQY9sJ1r553GEMxIll5i6Wdk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
  console.log('--- Starting User Deletion Test (AvSocial-Admin) ---');
  const testUid = '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0');
  const testHandle = 'testdel_' + Date.now();
  const testEmail = testHandle + '@test.com';

  try {
    // 1. Insert test user into app_users
    console.log(`Inserting test user: ${testHandle} (${testUid})`);
    const { error: insertError } = await supabase
      .from('app_users')
      .insert({
        uid: testUid,
        handle: testHandle,
        email: testEmail,
        name: 'Test Delete User',
        role: 'USER',
        is_banned: false
      });

    if (insertError) {
      console.error('Failed to insert test user:', insertError);
      process.exit(1);
    }
    console.log('Test user inserted successfully.');

    // 2. Verify test user exists
    const { data: beforeData, error: beforeError } = await supabase
      .from('app_users')
      .select('*')
      .eq('uid', testUid)
      .single();

    if (beforeError || !beforeData) {
      console.error('Test user not found in app_users before deletion:', beforeError);
      process.exit(1);
    }
    console.log('Verified test user exists in app_users.');

    // 3. Call delete_user_rpc
    console.log(`Calling delete_user_rpc for target_uid: ${testUid}`);
    const { error: rpcError } = await supabase.rpc('delete_user_rpc', {
      target_uid: testUid
    });

    if (rpcError) {
      console.error('delete_user_rpc returned error:', rpcError);
      process.exit(1);
    }
    console.log('delete_user_rpc executed without error.');

    // 4. Verify test user is deleted from app_users
    const { data: afterData, error: afterError } = await supabase
      .from('app_users')
      .select('*')
      .eq('uid', testUid)
      .maybeSingle();

    if (afterData) {
      console.error('TEST FAILED: User still exists in app_users after deletion!');
      process.exit(1);
    } else {
      console.log('TEST PASSED: User successfully deleted from app_users and auth cascade handled!');
    }

  } catch (err) {
    console.error('Test encountered an exception:', err);
    process.exit(1);
  }
}

runTest();
