import { openai, supabase, EMBEDDING_MODEL } from '../lib/config';
import movies from '../lib/content';

export async function seedMoviesIfEmpty() {
  const { data, error } = await supabase.from('movies').select('id').limit(1);
  if (error) throw error;
  if (data && data.length) return 'Already seeded';

  for (const m of movies) {
    const text = `${m.title} (${m.releaseYear}). ${m.content}`;
    const emb = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    const { error: insErr } = await supabase.from('movies').insert({
      title: m.title,
      release_year: m.releaseYear,
      description: m.content,
      embedding: emb.data[0].embedding,
    });
    if (insErr) throw insErr;
  }
  return 'Seed complete';
}
