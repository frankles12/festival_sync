export const spotifyScopesArray: string[] = [
  "user-read-private",
  "user-read-email",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  // Add additional scopes here if needed, e.g. "user-library-read", "user-top-read"
];

export const spotifyScopes: string = spotifyScopesArray.join(",");


