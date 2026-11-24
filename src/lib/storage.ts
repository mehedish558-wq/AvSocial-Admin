import { supabase } from './supabase';

export async function ensureAudioBucketExists() {
  try {
    const { data: bucket, error: getError } = await supabase.storage.getBucket('audio-tracks');
    if (getError || !bucket) {
      const { error: createError } = await supabase.storage.createBucket('audio-tracks', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm']
      });
      if (createError) {
        console.warn('Note on auto-creating audio-tracks bucket:', createError.message);
      }
    }
  } catch (err) {
    console.warn('ensureAudioBucketExists exception:', err);
  }
}
