// Devuelve todos los vídeos de la playlist configurada (secrets
// YOUTUBE_API_KEY y YOUTUBE_PLAYLIST_ID), paginando en el servidor.
// El cliente cachea el resultado 7 días en localStorage.
import { corsHeaders, json, requireAllowedUser } from '../_shared/mod.ts';

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const denied = await requireAllowedUser(req);
  if (denied) return denied;

  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  const playlistId = Deno.env.get('YOUTUBE_PLAYLIST_ID');
  if (!apiKey || !playlistId) {
    return json({ error: 'YOUTUBE_API_KEY o YOUTUBE_PLAYLIST_ID no configurados en el servidor' }, 500);
  }

  const videos: Video[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${YT_API_BASE}/playlistItems`);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('playlistId', playlistId);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      return json({ error: `YouTube API: ${data.error.message}` }, 502);
    }

    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      if (snippet?.resourceId?.kind === 'youtube#video') {
        videos.push({
          id: snippet.resourceId.videoId,
          title: snippet.title,
          thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
          description: (snippet.description || '').slice(0, 2000),
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return json({ videos });
});
