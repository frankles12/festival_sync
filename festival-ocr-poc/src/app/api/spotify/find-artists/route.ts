import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

interface FoundArtist {
  searchQuery: string;
  id: string;
  name: string;
  uri: string;
}

export async function POST(request: NextRequest) {
  // Protect route: Get token and ensure user is authenticated
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Set the access token for this specific API call
  spotifyApi.setAccessToken(token.accessToken as string);

  try {
    const body = await request.json();
    const artistNames: string[] = body.artists;

    if (!artistNames || !Array.isArray(artistNames) || artistNames.length === 0) {
      return NextResponse.json({ error: 'No artist names provided.' }, { status: 400 });
    }

    console.log(`Searching for ${artistNames.length} artists on Spotify...`);

    const foundArtists: FoundArtist[] = [];
    
    // Process artists sequentially to avoid hitting rate limits too quickly 
    // (Could be parallelized with Promise.all for performance, but adds complexity)
    for (const artistName of artistNames) {
      try {
        const searchResult = await spotifyApi.searchArtists(artistName, { limit: 1 });
        
        if (searchResult.body.artists && searchResult.body.artists.items.length > 0) {
          const spotifyArtist = searchResult.body.artists.items[0];
          console.log(`Found: ${artistName} -> ${spotifyArtist.name} (ID: ${spotifyArtist.id})`);
          foundArtists.push({
            searchQuery: artistName,
            id: spotifyArtist.id,
            name: spotifyArtist.name,
            uri: spotifyArtist.uri,
          });
        } else {
          console.log(`Not found: ${artistName}`);
        }
      } catch (searchError: any) {
        // Log individual search errors but continue with others
        console.error(`Error searching for artist "${artistName}":`, searchError.message || searchError);
        // Handle potential expired token error during search (though JWT refresh should cover most cases)
        if (searchError.statusCode === 401) {
             return NextResponse.json({ error: 'Spotify token expired or invalid.' }, { status: 401 });
        }
      }
       // Optional small delay to help with rate limits if searching many artists
       // await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    console.log(`Found ${foundArtists.length} Spotify artists.`);
    return NextResponse.json({ foundArtists });

  } catch (error: any) {
    console.error('Error in /api/spotify/find-artists:', error.message || error);
    return NextResponse.json({ error: 'Failed to process artist search request.' }, { status: 500 });
  }
} 