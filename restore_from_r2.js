import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://crlrjkpoxlkbpjfqnyyr.supabase.co';
// Use service role key if available for administrative recovery, or anon key
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNybHJqa3BveGxrYnBqZnFueXlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMTY5MTQsImV4cCI6MjEwMTY5MjkxNH0.khdA6Dm5RinWa00YdKKrQY9sJ1r553GEMxIll5i6Wdk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function restoreUserAndContent(uid, handle, name, mediaPaths) {
  console.log(`Restoring user: @${handle} (${uid})`);

  // 1. Ensure user exists in app_users
  const { error: userError } = await supabase
    .from('app_users')
    .upsert({
      uid: uid,
      handle: handle,
      name: name || handle,
      email: `${handle}@avsocial.app`,
      role: 'USER',
      is_banned: false
    }, { onConflict: 'uid' });

  if (userError) {
    console.error(`Error restoring user @${handle}:`, userError);
    return;
  }

  // 2. Restore posts/reels for each media path found in R2
  for (const path of mediaPaths) {
    if (path.includes('posts/images/') || path.includes('posts/videos/')) {
      console.log(`Restoring post for path: ${path}`);
      await supabase.from('posts').insert({
        username: name || handle,
        user_handle: handle,
        storage_path: path,
        post_image_res: path,
        caption: 'Restored post from R2 storage ✨',
        likes_count: 0,
        comments_count: 0,
        is_public: true,
        timestamp: Date.now()
      });
    } else if (path.includes('reels/')) {
      console.log(`Restoring reel for path: ${path}`);
      await supabase.from('reels').insert({
        author: name || handle,
        handle: handle,
        storage_path: path,
        video_url: path,
        caption: 'Restored reel from R2 storage 🎥',
        likes_count: 0,
        comments_count: 0,
        duration_secs: 15,
        is_public: true,
        timestamp: Date.now()
      });
    }
  }
  console.log(`Successfully restored user @${handle} and content.`);
}

async function runRecovery() {
  console.log('--- AvSocial R2 & Database Recovery Tool ---');
  console.log('If you have list of R2 object paths, pass them here to backfill app_users, posts, and reels.');
}

runRecovery();
