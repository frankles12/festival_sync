// Path: src/app/api/spotify/artist-alternatives/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import SpotifyWebApi from 'spotify-web-api-node';

// Initialize Spotify API client (consider moving to a shared utility if used in multiple places)
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

interface ArtistAlternative {
  id: string;
  name: string;
  uri: string;
  images?: SpotifyApi.ImageObject[]; // Optional: useful for display
  // Add any other fields you might want to show the user
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
    const artistName: string = body.artistName;

    if (!artistName || typeof artistName !== 'string' || artistName.trim() === '') {
      return NextResponse.json({ error: 'Artist name must be provided and be a non-empty string.' }, { status: 400 });
    }

    console.log(`Searching for alternatives for "${artistName}" on Spotify...`);

    // Search for artists, requesting a few alternatives (e.g., limit: 5)
    const searchResult = await spotifyApi.searchArtists(artistName, { limit: 5 });

    const alternatives: ArtistAlternative[] = [];
    if (searchResult.body.artists && searchResult.body.artists.items.length > 0) {
      searchResult.body.artists.items.forEach(spotifyArtist => {
        alternatives.push({
          id: spotifyArtist.id,
          name: spotifyArtist.name,
          uri: spotifyArtist.uri,
          images: spotifyArtist.images, // Include images for better UI
        });
      });
      console.log(`Found ${alternatives.length} alternatives for "${artistName}".`);
    } else {
      console.log(`No alternatives found for "${artistName}".`);
    }

    return NextResponse.json({ alternatives });

  } catch (error: any) {
    // It's good practice to log the specific artist name if available, for easier debugging
    let requestArtistName = 'unknown artist';
    try {
      const body = await request.json(); // Re-parse or store earlier
      if(body && body.artistName) requestArtistName = body.artistName;
    } catch (parseError) { /* ignore if can't re-parse */ }
    
    console.error(`Error in /api/spotify/artist-alternatives for "${requestArtistName}":`, error.message || error);
    
    // Handle specific Spotify API errors, like expired token
    if (error.statusCode === 401) {
         return NextResponse.json({ error: 'Spotify token expired or invalid during alternative search.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to process artist alternatives request.' }, { status: 500 });
  }
}