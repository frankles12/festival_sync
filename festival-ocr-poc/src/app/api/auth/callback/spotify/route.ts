import { NextRequest, NextResponse } from 'next/server';
import SpotifyWebApi from 'spotify-web-api-node';

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  // TODO: Verify the state parameter matches the one stored previously

  if (!code) {
    const error = searchParams.get('error');
    console.error('Spotify callback error:', error);
    return NextResponse.json({ error: `Callback error: ${error || 'No code received'}` }, { status: 400 });
  }
  
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET || !process.env.SPOTIFY_REDIRECT_URI) {
       console.error('Spotify credentials missing in environment variables for callback.');
       return NextResponse.json({ error: 'Server configuration error.'}, { status: 500 });
  }

  console.log('Received code:', code);
  console.log('Received state:', state);

  try {
    // Exchange the authorization code for access and refresh tokens
    const data = await spotifyApi.authorizationCodeGrant(code);
    const accessToken = data.body['access_token'];
    const refreshToken = data.body['refresh_token'];
    const expiresIn = data.body['expires_in'];

    console.log('Access Token:', accessToken);
    console.log('Refresh Token:', refreshToken);
    console.log('Token Expires In:', expiresIn, 'seconds');

    // TODO: Securely store the tokens (e.g., database, session)
    // TODO: Set tokens on the spotifyApi instance for subsequent calls
    // spotifyApi.setAccessToken(accessToken);
    // spotifyApi.setRefreshToken(refreshToken);

    // Redirect user back to the main page (or wherever appropriate)
    const redirectUrl = request.nextUrl.clone() // Get base URL
    redirectUrl.pathname = '/' // Set path to root
    redirectUrl.search = '' // Clear any query params from callback
    // Optional: Add a query param to indicate success (insecure way to pass state)
    // redirectUrl.searchParams.set('auth_success', 'true');
    // Optional: Pass token via query param (VERY INSECURE - for quick demo ONLY)
    // redirectUrl.searchParams.set('token', accessToken);
    
    return NextResponse.redirect(redirectUrl);

    /* Previous JSON response:
    return NextResponse.json({ 
        message: 'Successfully authenticated! Tokens logged on server.', 
        // In a real app, DO NOT send tokens to the client like this
        // accessToken: accessToken, // Example - DO NOT DO THIS
    });
    */

  } catch (error: any) {
    console.error('Error getting tokens from Spotify:', error.message || error);
    return NextResponse.json({ error: 'Failed to exchange authorization code for tokens.' }, { status: 500 });
  }
} 