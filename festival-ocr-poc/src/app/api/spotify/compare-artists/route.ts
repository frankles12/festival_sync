import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import SpotifyWebApi from 'spotify-web-api-node';

// Reusable Spotify API instance
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

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
                currentPage++; // Conceptually represents the current page/offset block
                console.log(`Fetching page ${currentPage} (offset ${offset}, limit ${limit})...`);
                const result = await apiCall({ limit, offset });
                
                if (result && result.body && result.body.items) {
                    responseBody = result.body;
                    items = items.concat(responseBody.items);
                    offset += responseBody.items.length; // Move offset by actual items received
                    success = true; // Mark as successful for this page
                } else {
                    console.warn("Unexpected response or no items found on page", currentPage, result);
                    shouldContinue = false; // Stop pagination if response is bad
                    break; // Exit retry loop for this page
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
                    // For other errors or max retries reached, stop and re-throw
                    console.error(`Failed to fetch page ${currentPage} after ${retries} attempts. Error:`, error);
                    throw error; // Re-throw the error to be caught by the main route handler
                }
            }
        } // End retry loop

        if (!success) {
            console.error(`Pagination failed permanently on page ${currentPage}.`);
            shouldContinue = false; // Stop pagination if retries failed
        }

        // Determine if we need to fetch the next page
        if (success && responseBody && responseBody.total && responseBody.total > items.length) {
             // Continue fetching next page
             // No explicit delay needed here as the retry logic handles pauses
             shouldContinue = true;
        } else {
             // Stop if all items fetched or an error occurred
             shouldContinue = false; 
        }

    } // End pagination (while shouldContinue)

    console.log("Pagination finished. Total items fetched:", items.length);
    return items;
}

// This route now fetches ONLY playlists
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  spotifyApi.setAccessToken(token.accessToken as string);

  try {
    // Removed receiving festival artists - not needed for fetching playlists
    // const body: CompareRequest = await request.json(); 
    // const festivalArtistIds = new Set(body.festivalArtists.map(artist => artist.id));
    // if (!body.festivalArtists || festivalArtistIds.size === 0) {
    //   return NextResponse.json({ error: 'No festival artist IDs provided.' }, { status: 400 });
    // }
    
    // --- Get the User ID first ---
    console.log("Fetching user ID...");
    const meData = await spotifyApi.getMe();
    const userId = meData.body.id;
    if (!userId) {
        throw new Error("Could not retrieve Spotify User ID.");
    }
    console.log("User ID retrieved:", userId);
    // ---------------------------
    
    // 1. Get all user playlists using the enhanced helper
    console.log("Fetching user playlists...");
    const playlistsData = await getAllPaginatedItems<SpotifyApi.PlaylistObjectSimplified>(
        (options) => spotifyApi.getUserPlaylists(userId, options) 
    );
    console.log(`Found ${playlistsData.length} playlists.`);

    // Select only relevant fields to send back
    const playlists = playlistsData.map(p => ({
      id: p.id,
      name: p.name,
      owner: p.owner.display_name || p.owner.id, // Get owner display name or ID
      trackCount: p.tracks.total // Include track count
    }));

    // Remove track fetching and comparison logic
    /*
    const userPlaylistArtistIds = new Set<string>();
    // ... loop through playlists to get tracks ...
    console.log(`Found ${userPlaylistArtistIds.size} unique artists across all playlists.`);
    // ... comparison logic ...
    console.log(`Comparison complete. Matched ${matchedFestivalArtists.length} artists.`);
    return NextResponse.json({ matchedArtists: matchedFestivalArtists });
    */

    // Return the list of playlists
    return NextResponse.json({ playlists });

  } catch (error: any) {
    // Log the full error object for better debugging
    console.error('Error fetching playlists (full error object):', error);
    if (error.statusCode === 401) {
         return NextResponse.json({ error: 'Spotify token expired or invalid.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch user playlists.' }, { status: 500 });
  }
} 