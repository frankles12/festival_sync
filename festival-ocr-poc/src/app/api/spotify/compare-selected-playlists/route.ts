import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import SpotifyWebApi from 'spotify-web-api-node';

// Reusable Spotify API instance
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Interface for the expected request body
interface CompareSelectedRequest {
  festivalArtists: { id: string; name: string; uri: string }[];
  selectedPlaylistIds: string[];
}

// Define the structure returned by spotify-web-api-node methods
interface SpotifyApiResponse<T> {
  body: SpotifyApi.PagingObject<T>;
  headers: Record<string, string>;
  statusCode: number;
}

// Enhanced helper function with rate limit handling and retries
async function getAllPaginatedItems<T>(
  apiCall: (options: { limit: number; offset: number }) => Promise<SpotifyApiResponse<T>>,
  maxRetries = 3 // Maximum number of retries for rate limit errors
): Promise<T[]> {
    let items: T[] = [];
    let offset = 0;
    const limit = 50; 
    let currentPage = 0; // Keep track of pages for logging

    let shouldContinue = true;
    while (shouldContinue) {
        let retries = 0;
        let success = false;
        let responseBody: SpotifyApi.PagingObject<T> | undefined;

        while (retries < maxRetries && !success) {
            try {
                currentPage++;
                console.log(`Fetching page ${currentPage} (offset ${offset}, limit ${limit})...`);
                const result = await apiCall({ limit, offset });
                
                if (result && result.body && result.body.items) {
                    responseBody = result.body;
                    items = items.concat(responseBody.items);
                    offset += responseBody.items.length;
                    success = true; 
                } else {
                    console.warn("Unexpected response or no items found on page", currentPage, result);
                    shouldContinue = false; 
                    break; 
                }

            } catch (error: any) {
                retries++;
                if (error.statusCode === 429 && retries < maxRetries) {
                    const retryAfterHeader = error.headers?.['retry-after'];
                    console.log(`Retry-After header received: ${retryAfterHeader}`); // Log the raw header
                    let waitTimeSeconds = 1; // Default/minimum wait
                    const maxWaitSeconds = 60; // Maximum wait time in seconds

                    if (retryAfterHeader) {
                        const parsedWaitTime = parseInt(retryAfterHeader, 10);
                        // Use the header value, but cap it at maxWaitSeconds
                        waitTimeSeconds = Math.max(1, Math.min(parsedWaitTime, maxWaitSeconds)); 
                        console.warn(`Rate limit hit (429). Header specified ${parsedWaitTime}s. Waiting ${waitTimeSeconds}s before retry... (Attempt ${retries}/${maxRetries})`);
                    } else {
                        // Exponential backoff if no header, capped
                        waitTimeSeconds = Math.min(Math.pow(2, retries), maxWaitSeconds);
                        console.warn(`Rate limit hit (429) - No Retry-After header. Waiting ${waitTimeSeconds}s before retry... (Attempt ${retries}/${maxRetries})`);
                    }
                    await new Promise(resolve => setTimeout(resolve, waitTimeSeconds * 1000 + 100)); 
                } else {
                    console.error(`Failed to fetch page ${currentPage} after ${retries} attempts. Error:`, error);
                    throw error; 
                }
            }
        } // End retry loop

        if (!success) {
            console.error(`Pagination failed permanently on page ${currentPage}.`);
            shouldContinue = false; 
        }

        if (success && responseBody && responseBody.total && responseBody.total > items.length) {
             shouldContinue = true;
        } else {
             shouldContinue = false; 
        }

    } // End pagination (while shouldContinue)

    console.log("Pagination finished. Total items fetched:", items.length);
    return items;
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  spotifyApi.setAccessToken(token.accessToken as string);

  try {
    const body: CompareSelectedRequest = await request.json();
    const festivalArtistIds = new Set(body.festivalArtists.map(artist => artist.id));
    const selectedPlaylistIds = body.selectedPlaylistIds;

    if (!body.festivalArtists || festivalArtistIds.size === 0) {
      return NextResponse.json({ error: 'No festival artist IDs provided.' }, { status: 400 });
    }
    if (!selectedPlaylistIds || selectedPlaylistIds.length === 0) {
      return NextResponse.json({ error: 'No playlist IDs provided.' }, { status: 400 });
    }

    console.log(`Starting comparison for ${festivalArtistIds.size} artists against ${selectedPlaylistIds.length} selected playlists.`);

    const userPlaylistArtistIds = new Set<string>();

    // Get tracks ONLY for SELECTED playlists and extract artist IDs
    for (const playlistId of selectedPlaylistIds) {
        console.log(`Fetching tracks for selected playlist: ${playlistId}`);
        try {
            // Use the enhanced helper for fetching tracks
            const tracks = await getAllPaginatedItems<SpotifyApi.PlaylistTrackObject>(
                (options) => spotifyApi.getPlaylistTracks(playlistId, options)
            );
            console.log(` > Found ${tracks.length} tracks.`);
            tracks.forEach(item => {
                if (item && item.track && item.track.artists) {
                    item.track.artists.forEach(artist => {
                        if (artist && artist.id) {
                            userPlaylistArtistIds.add(artist.id);
                        }
                    });
                }
            });
        } catch (playlistError: any) {
            console.error(`Error fetching tracks for playlist ${playlistId}:`, playlistError.message || playlistError);
            // Optionally skip this playlist or handle error
        }
    }

    console.log(`Found ${userPlaylistArtistIds.size} unique artists across selected playlists.`);

    // Find the intersection
    const matchedFestivalArtists = body.festivalArtists.filter(artist => 
        userPlaylistArtistIds.has(artist.id)
    );

    console.log(`Comparison complete. Matched ${matchedFestivalArtists.length} artists.`);

    return NextResponse.json({ matchedArtists: matchedFestivalArtists });

  } catch (error: any) {
    console.error('Error in /api/spotify/compare-selected-playlists:', error.message || error);
    if (error.statusCode === 401) {
         return NextResponse.json({ error: 'Spotify token expired or invalid.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to process artist comparison request.' }, { status: 500 });
  }
} 