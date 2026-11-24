import { supabase } from './supabase';

export const logAuditAction = async (adminHandle: string, action: string, target: string, details: string) => {
  try {
    const savedHandle = localStorage.getItem('admin_handle');
    const handle = (adminHandle && adminHandle !== 'admin' && adminHandle !== 'super_admin')
      ? adminHandle
      : (savedHandle || adminHandle || 'admin');

    const entry = {
      admin_handle: handle.toLowerCase(),
      action: action.toUpperCase(),
      target: target || 'system',
      details: details || '',
      can_undo: true,
      created_at: new Date().toISOString()
    };
    await supabase.from('audit_logs').insert(entry);
    await supabase.from('admin_activity_logs').insert(entry);
  } catch (err) {
    console.error('Failed to log audit action in Supabase:', err);
  }
};
