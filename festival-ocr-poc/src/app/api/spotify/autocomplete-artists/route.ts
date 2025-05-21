import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

interface AutocompleteArtist {
  id: string;
  name: string;
  uri: string;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  spotifyApi.setAccessToken(token.accessToken as string);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query || query.trim().length < 2) { // Require at least 2 characters for search
    return NextResponse.json({ suggestions: [] }); // Return empty if query too short
  }

  try {
    const searchResult = await spotifyApi.searchArtists(query, { limit: 5 }); // Limit to 5 suggestions
    
    const suggestions: AutocompleteArtist[] = [];
    if (searchResult.body.artists && searchResult.body.artists.items.length > 0) {
      searchResult.body.artists.items.forEach(spotifyArtist => {
        suggestions.push({
          id: spotifyArtist.id,
          name: spotifyArtist.name,
          uri: spotifyArtist.uri,
        });
      });
    }
    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error(`Error searching for artist autocomplete "${query}":`, error.message || error);
    if (error.statusCode === 401) {
         return NextResponse.json({ error: 'Spotify token expired or invalid.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch artist suggestions.' }, { status: 500 });
  }
} 