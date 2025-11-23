'use server';

import { supabase } from '@/lib/supabaseClient';

export async function deleteChapterAction(chapterId: string) {
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId);

  if (error) {
    console.error('Delete chapter error:', error);
    throw new Error('Failed to delete chapter');
  }

  return { success: true };
}
