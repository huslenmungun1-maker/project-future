import { supabase } from '@/lib/supabaseClient';
import { deleteChapterAction } from './actions';

export default async function ChaptersPage() {
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Load chapters error:', error);
    return (
      <div className="p-6 text-red-500">
        Failed to load chapters.
      </div>
    );
  }

  if (!chapters || chapters.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Chapters</h1>
        <div className="text-sm text-neutral-500">No chapters yet.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
        <a
  href="/"
  className="inline-block mb-4 text-sm px-3 py-1 border border-neutral-400 rounded hover:bg-neutral-200 transition"
>
  ← Back to Home
</a>
      <h1 className="text-2xl font-bold">Chapters</h1>

      <ul className="space-y-2">
        {chapters.map((chapter) => (
          <li
            key={chapter.id}
            className="flex items-center justify-between border rounded-lg px-4 py-2"
          >
            <div>
              <div className="font-semibold">
                {chapter.title || `Chapter ${chapter.chapter_number}`}
              </div>
              <div className="text-xs text-neutral-500">
                ID: {chapter.id}
              </div>
            </div>

            <form
              action={async () => {
                'use server';
                await deleteChapterAction(chapter.id);
              }}
            >
              <button
                type="submit"
                className="text-xs px-3 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-500 hover:text-white transition"
              >
                Delete
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
