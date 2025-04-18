import { NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';

const scopes = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  // Add other scopes as needed, e.g.:
  // 'user-library-read', 
  // 'user-top-read'
];

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

export async function GET() {
  // Log the redirect URI being used by the API client instance
  console.log('Spotify API Client configured with Redirect URI:', spotifyApi.getRedirectURI());
  
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_REDIRECT_URI) {
    console.error('Spotify credentials missing in environment variables.');
    return NextResponse.json({ error: 'Server configuration error.'}, { status: 500 });
  }
  
  // Generate a random state string for security (CSRF protection)
  const state = Math.random().toString(36).substring(2, 15); 
  // TODO: Store state temporarily (e.g., in a cookie or session) to verify in callback

  const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);
  console.log('Redirecting to Spotify authorize URL:', authorizeURL);

  // Redirect the user to the Spotify authorization page
  return NextResponse.redirect(authorizeURL);
} 