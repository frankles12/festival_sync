import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import SpotifyWebApi from 'spotify-web-api-node';

// Reusable Spotify API instance
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// Interface for the expected artist data
interface MatchedArtist {
  id: string;
  name: string;
  uri: string; // Keep uri if needed, though not strictly necessary for this route
}

// Interface for the expected request body
interface CreatePlaylistRequest {
  artists: MatchedArtist[];
  playlistName?: string; // Optional custom name
}

// Helper function to get user market (country)
async function getUserMarket(apiInstance: SpotifyWebApi): Promise<string> {
    try {
        const me = await apiInstance.getMe();
        return me.body.country || 'US'; // Default to US if market not found
    } catch (error) {
        console.error("Error getting user market, defaulting to US:", error);
        return 'US';
    }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token || !token.accessToken || !token.user?.id) { // Ensure user ID is present
    return NextResponse.json({ error: 'Unauthorized or missing user ID in token' }, { status: 401 });
  }

  spotifyApi.setAccessToken(token.accessToken as string);
  const userId = token.user.id as string;

  try {
    const body: CreatePlaylistRequest = await request.json();
    const matchedArtists = body.artists;
    
    if (!matchedArtists || matchedArtists.length === 0) {
      return NextResponse.json({ error: 'No artists provided to create playlist.' }, { status: 400 });
    }

    // Determine playlist name
    const defaultPlaylistName = `Festival Sync Matches (${new Date().toLocaleDateString()})`;
    const playlistName = body.playlistName || defaultPlaylistName;
    console.log(`Creating playlist named: "${playlistName}" for user: ${userId}`);

    // 1. Correctly call createPlaylist with options object
    const newPlaylistResponse = await spotifyApi.createPlaylist(playlistName, { // Removed userId, it's implicit for logged-in user
        public: true, 
        description: `Artists from your festival sync results (${new Date().toLocaleDateString()})`
        // Add other options like collaborative if needed
    });
    const newPlaylist = newPlaylistResponse.body; // Access the body of the response
    const newPlaylistId = newPlaylist.id;
    const newPlaylistUrl = newPlaylist.external_urls?.spotify;
    console.log(`Playlist created with ID: ${newPlaylistId}`);

    // 2. Get user's market for top tracks
    const market = await getUserMarket(spotifyApi);
    console.log(`Using market: ${market} for top tracks.`);

    // 3. Fetch top tracks for each artist and collect URIs
    let trackUris: string[] = [];
    const tracksToAddPerArtist = 2; // Get top 2 tracks per artist
    const maxTotalTracks = 100; // Spotify API limit for adding tracks in one go

    console.log(`Fetching top ${tracksToAddPerArtist} tracks for ${matchedArtists.length} artists...`);
    for (const artist of matchedArtists) {
        if (trackUris.length >= maxTotalTracks) {
            console.log("Reached max tracks limit, stopping track fetching.");
            break;
        }
        try {
            const topTracksData = await spotifyApi.getArtistTopTracks(artist.id, market);
            const topTracks = topTracksData.body.tracks;
            const urisToAdd = topTracks
                                .slice(0, tracksToAddPerArtist)
                                .map(track => track.uri)
                                .filter(uri => !!uri); // Filter out any potentially undefined URIs
            
            console.log(` > Found ${urisToAdd.length} tracks for ${artist.name}`);
            trackUris = trackUris.concat(urisToAdd);
        } catch (error: any) {
            console.error(`Error getting top tracks for ${artist.name} (${artist.id}):`, error.message || error);
            // Continue to next artist if one fails
        }
        // Optional delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 50)); 
    }

    // Remove duplicates just in case
    trackUris = Array.from(new Set(trackUris)); 
    console.log(`Collected ${trackUris.length} unique track URIs to add.`);

    // 4. Add tracks to the playlist (handle potential empty list)
    if (trackUris.length > 0) {
        // Spotify API can add max 100 tracks per request. Chunk if needed (though unlikely here).
        await spotifyApi.addTracksToPlaylist(newPlaylistId, trackUris);
        console.log("Tracks added successfully.");
    } else {
        console.log("No track URIs found to add to the playlist.");
    }

    return NextResponse.json({ 
        message: 'Playlist created successfully!', 
        playlistUrl: newPlaylistUrl,
        playlistId: newPlaylistId 
    });

  } catch (error: any) {
    console.error('Error in /api/spotify/create-playlist:', error.message || error);
    if (error.statusCode === 401) {
         return NextResponse.json({ error: 'Spotify token expired or invalid.' }, { status: 401 });
    }
    if (error.statusCode === 403) {
         return NextResponse.json({ error: 'Missing permissions (scope) to create/modify playlists.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to create playlist.' }, { status: 500 });
  }
} 