import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import SpotifyWebApi from 'spotify-web-api-node';

// Reusable Spotify API instance
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Interface for the expected request body
interface CompareRequest {
  festivalArtists: { id: string; name: string; uri: string }[]; // Expecting artists found in the previous step
}

// Define the structure returned by spotify-web-api-node methods
interface SpotifyApiResponse<T> {
  body: SpotifyApi.PagingObject<T>;
  headers: Record<string, string>;
  statusCode: number;
}

// Helper function to handle pagination for getting all items from a Spotify endpoint
async function getAllPaginatedItems<T>(
  apiCall: (options: { limit: number; offset: number }) => Promise<SpotifyApiResponse<T>>
): Promise<T[]> {
    let items: T[] = [];
    let offset = 0;
    const limit = 50; // Max limit for many endpoints
    let responseBody: SpotifyApi.PagingObject<T> | undefined;

    do {
        const result = await apiCall({ limit, offset });
        // Check if result and necessary properties exist
        if (result && result.body && result.body.items) {
            responseBody = result.body;
            items = items.concat(responseBody.items);
            offset += limit;
        } else {
            console.warn("Unexpected response or no items found in pagination call at offset", offset, result);
            break; 
        }
    } while (responseBody && responseBody.total && responseBody.total > items.length);

    return items;
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  spotifyApi.setAccessToken(token.accessToken as string);

  try {
    const body: CompareRequest = await request.json();
    const festivalArtistIds = new Set(body.festivalArtists.map(artist => artist.id));

    if (!body.festivalArtists || festivalArtistIds.size === 0) {
      return NextResponse.json({ error: 'No festival artist IDs provided.' }, { status: 400 });
    }

    console.log("Starting comparison for", festivalArtistIds.size, "festival artists.");

    // 1. Get all user playlists
    console.log("Fetching user playlists...");
    // Explicitly type the expected item type
    const playlists = await getAllPaginatedItems<SpotifyApi.PlaylistObjectSimplified>(
        (options) => spotifyApi.getUserPlaylists(options)
    );
    console.log(`Found ${playlists.length} playlists.`);

    const userPlaylistArtistIds = new Set<string>();

    // 2. Get tracks for each playlist and extract artist IDs
    for (const playlist of playlists) {
        console.log(`Fetching tracks for playlist: ${playlist.name} (${playlist.id})`);
        try {
            // Explicitly type the expected item type
            const tracks = await getAllPaginatedItems<SpotifyApi.PlaylistTrackObject>(
                (options) => spotifyApi.getPlaylistTracks(playlist.id, options)
            );
            console.log(` > Found ${tracks.length} tracks.`);
            tracks.forEach(item => {
                // Check track and artists exist before accessing
                if (item && item.track && item.track.artists) {
                    item.track.artists.forEach(artist => {
                        if (artist && artist.id) { // Check artist and artist.id
                            userPlaylistArtistIds.add(artist.id);
                        }
                    });
                }
            });
        } catch (playlistError: any) {
            console.error(`Error fetching tracks for playlist ${playlist.id}:`, playlistError.message || playlistError);
            // Decide if you want to skip this playlist or stop the whole process
            // Potentially check for 401/403 errors here too
        }
        // Optional delay between fetching playlist tracks
        // await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`Found ${userPlaylistArtistIds.size} unique artists across all playlists.`);

    // 3. Find the intersection
    const matchedFestivalArtists = body.festivalArtists.filter(artist => 
        userPlaylistArtistIds.has(artist.id)
    );

    console.log(`Comparison complete. Matched ${matchedFestivalArtists.length} artists.`);

    return NextResponse.json({ matchedArtists: matchedFestivalArtists });

  } catch (error: any) {
    console.error('Error in /api/spotify/compare-artists:', error.message || error);
    // Handle potential expired token error during the process
    if (error.statusCode === 401) {
         return NextResponse.json({ error: 'Spotify token expired or invalid.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to process artist comparison request.' }, { status: 500 });
  }
} 