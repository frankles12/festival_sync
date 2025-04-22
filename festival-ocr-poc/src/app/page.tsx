"use client";

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
// Remove Tesseract import
// import Tesseract from 'tesseract.js';

// Define type for artist state
interface ArtistEntry {
  name: string;
  selected: boolean;
}

// Define type for Spotify search results
interface FoundArtist {
  searchQuery: string;
  id: string;
  name: string;
  uri: string;
}

// Define type for final matched artists
interface MatchedArtist extends FoundArtist { }

// Define type for simplified playlist data
interface UserPlaylist {
  id: string;
  name: string;
  owner: string;
  trackCount: number;
}

export default function Home() {
  const { data: session, status } = useSession();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parsedArtists, setParsedArtists] = useState<ArtistEntry[]>([]);
  const [isSearchingSpotify, setIsSearchingSpotify] = useState<boolean>(false);
  const [spotifyResults, setSpotifyResults] = useState<FoundArtist[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null); // State for errors
  // Rename state for fetching playlists
  const [isFetchingPlaylists, setIsFetchingPlaylists] = useState<boolean>(false);
  const [userPlaylists, setUserPlaylists] = useState<UserPlaylist[]>([]);
  const [fetchPlaylistsError, setFetchPlaylistsError] = useState<string | null>(null);
  // State for selected playlist IDs
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  // State for final comparison (will be used later)
  const [isComparingSelected, setIsComparingSelected] = useState<boolean>(false);
  const [finalMatchedArtists, setFinalMatchedArtists] = useState<MatchedArtist[]>([]);
  const [finalCompareError, setFinalCompareError] = useState<string | null>(null);
  // State for playlist creation
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState<boolean>(false);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState<string | null>(null);
  const [createPlaylistError, setCreatePlaylistError] = useState<string | null>(null);

  // Log session whenever it changes (for debugging)
  useEffect(() => {
    if (session) {
      console.log("Session Data:", session);
      // Access token is potentially available via session.accessToken
      // Check for errors from token refresh
      if (session.error === "RefreshAccessTokenError") {
        console.error("Error refreshing Spotify token, signing out.");
        signOut(); // Force sign out if token refresh fails
      }
    }
  }, [session]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      setOcrResult('');
      setParsedArtists([]);
      setSpotifyResults([]);
      setSearchError(null);
      setUserPlaylists([]); // Clear playlists
      setFetchPlaylistsError(null); // Clear playlist errors
      setSelectedPlaylistIds(new Set()); // Clear selected playlists
      setFinalMatchedArtists([]); // Clear final matches
      setFinalCompareError(null); // Clear final errors
      setNewPlaylistUrl(null); // Clear playlist URL
      setCreatePlaylistError(null); // Clear playlist errors
    }
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Function to parse raw OCR text into a candidate list of artists
  const parseOcrResult = (rawText: string): ArtistEntry[] => {
    console.log('Starting parsing...');
    // Keywords/patterns to filter out (case-insensitive)
    const noiseKeywords = [
      'VANS', 'NOV', 'BEATBOX', 'EARGASM', 
        'PRESENTS', 'PRESENTED BY', 'SPONSORED BY', 'STAGE',
      '\d{2}' // 2-digit numbers (adjusted from 4)
      // Add more generic keywords if needed
    ];
    // Note: Adjusted noiseRegex slightly based on keywords
    const noiseRegex = new RegExp(`^(${noiseKeywords.join('|')})$|\d{2}`, 'i'); 

    const lines = rawText.split('\n');
    const candidates = new Set<string>(); // Use Set for automatic deduplication

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Basic filters
      if (trimmedLine.length < 3) continue; // Skip very short lines
      if (noiseRegex.test(trimmedLine)) continue; // Skip lines matching noise keywords/patterns
      
      // Define regex to split by delimiters: • OR * OR , OR - OR two or more whitespace chars
      const splitRegex = /[•*,-]|\s{2,}/;
      const potentialNames = trimmedLine.split(splitRegex);

      for (const name of potentialNames) {
        // Clean name: trim whitespace and remove any leading/trailing delimiters/spaces left over
        let cleanedName = name.trim().replace(/^[•*,\-\s]+|[•*,\-\s]+$/g, '');

        // Simplified logic: Add the cleaned name directly after the main split
        if (cleanedName.length >= 3 && !noiseRegex.test(cleanedName)) {
          candidates.add(cleanedName);
        }
      }
    }

    const artistEntries = Array.from(candidates).map(name => ({
      name: name,
      selected: true // Initially select all candidates
    }));

    console.log('Parsing complete. Candidates:', artistEntries);
    return artistEntries; // Return array of objects
  };

  // Handler for checkbox changes
  const handleArtistSelectionChange = (index: number) => {
    setParsedArtists(prevArtists => 
      prevArtists.map((artist, i) => 
        i === index ? { ...artist, selected: !artist.selected } : artist
      )
    );
  };
  
  // Update function to call the new API route
  const handleConfirmArtists = async () => {
    const selectedNames = parsedArtists
      .filter(artist => artist.selected)
      .map(artist => artist.name);
      
    if (selectedNames.length === 0) {
        alert("Please select at least one artist.");
        return;
    }

    console.log("Confirmed Artists Names:", selectedNames);
    setIsSearchingSpotify(true);
    setSpotifyResults([]); // Clear previous results
    setSearchError(null); // Clear previous errors

    try {
        const response = await fetch('/api/spotify/find-artists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ artists: selectedNames }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Spotify Search API Error:', data.error || response.statusText);
            throw new Error(data.error || `API request failed with status ${response.status}`);
        }
        
        console.log("Spotify Search Results:", data.foundArtists);
        setSpotifyResults(data.foundArtists || []);
        
    } catch (error) {
        console.error('Error calling find-artists API:', error);
        const message = error instanceof Error ? error.message : "An unknown error occurred during Spotify search.";
        setSearchError(message);
    } finally {
        setIsSearchingSpotify(false);
    }
  };

  // Renamed handler for fetching playlists
  const handleFetchPlaylists = async () => {
      if (spotifyResults.length === 0) {
          alert("No Spotify artists found to fetch playlists for."); // Should ideally not happen if button is shown
          return;
      }
      
      console.log("Fetching user playlists...");
      setIsFetchingPlaylists(true);
      setUserPlaylists([]); // Clear previous results
      setFetchPlaylistsError(null); // Clear previous errors
      setSelectedPlaylistIds(new Set()); // Reset selection
      setFinalMatchedArtists([]); // Clear previous final results
      setFinalCompareError(null);

      try {
          // Call the API route that now ONLY fetches playlists
          const response = await fetch('/api/spotify/compare-artists', { 
              method: 'POST',
              // No body needed anymore for just fetching playlists
          });

          const data = await response.json();

          if (!response.ok) {
              console.error('Fetch Playlists API Error:', data.error || response.statusText);
              throw new Error(data.error || `API request failed with status ${response.status}`);
          }
          
          console.log("User Playlists:", data.playlists);
          setUserPlaylists(data.playlists || []);
          
      } catch (error) {
          console.error('Error calling fetch playlists API:', error);
          const message = error instanceof Error ? error.message : "An unknown error occurred while fetching playlists.";
          setFetchPlaylistsError(message);
      } finally {
          setIsFetchingPlaylists(false);
      }
  };

  // Handler for playlist selection checkboxes
  const handlePlaylistSelectionChange = (playlistId: string) => {
      setSelectedPlaylistIds(prevSelected => {
          const newSelected = new Set(prevSelected);
          if (newSelected.has(playlistId)) {
              newSelected.delete(playlistId);
          } else {
              newSelected.add(playlistId);
          }
          return newSelected;
      });
  };
  
  // Updated handler to call the new comparison API route
  const handleCompareSelectedPlaylists = async () => {
      if (selectedPlaylistIds.size === 0) {
          alert("Please select at least one playlist to compare.");
          return;
      }
      if (spotifyResults.length === 0) {
          alert("Cannot compare without initial Spotify artist search results.");
          return;
      }
      
      const selectedIdsArray = Array.from(selectedPlaylistIds); // Convert Set to Array for JSON
      console.log("Comparing with selected playlists:", selectedIdsArray);
      console.log("Festival artists to compare:", spotifyResults);
      
      setIsComparingSelected(true); 
      setFinalMatchedArtists([]);
      setFinalCompareError(null);
      
      try {
          const response = await fetch('/api/spotify/compare-selected-playlists', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                  festivalArtists: spotifyResults, // Send the found spotify artist data
                  selectedPlaylistIds: selectedIdsArray // Send the array of selected playlist IDs
              }), 
          });

          const data = await response.json();

          if (!response.ok) {
              console.error('Compare Selected API Error:', data.error || response.statusText);
              throw new Error(data.error || `API request failed with status ${response.status}`);
          }
          
          console.log("Final Comparison Results:", data.matchedArtists);
          setFinalMatchedArtists(data.matchedArtists || []);
          
      } catch (error) {
          console.error('Error calling compare-selected-playlists API:', error);
          const message = error instanceof Error ? error.message : "An unknown error occurred during final comparison.";
          setFinalCompareError(message);
      } finally {
           setIsComparingSelected(false); 
      }
  };

  // Handler for creating the playlist
  const handleCreatePlaylist = async () => {
    if (finalMatchedArtists.length === 0) {
      alert("No matched artists to add to a playlist.");
      return;
    }

    console.log("Creating playlist with matched artists...");
    setIsCreatingPlaylist(true);
    setNewPlaylistUrl(null);
    setCreatePlaylistError(null);

    try {
      // Maybe allow user to input name later
      // const playlistName = prompt("Enter playlist name:", `Festival Sync Matches`);
      // if (!playlistName) return;

      const response = await fetch('/api/spotify/create-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          artists: finalMatchedArtists, // Send the list of matched artists
          // playlistName: playlistName // Optional: send custom name
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Create Playlist API Error:', data.error || response.statusText);
        throw new Error(data.error || `API request failed with status ${response.status}`);
      }

      console.log("Playlist Creation Result:", data);
      setNewPlaylistUrl(data.playlistUrl || null);
      if (!data.playlistUrl) {
          setCreatePlaylistError("Playlist created, but URL not returned.");
      }

    } catch (error) {
      console.error('Error calling create-playlist API:', error);
      const message = error instanceof Error ? error.message : "An unknown error occurred during playlist creation.";
      setCreatePlaylistError(message);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  const handleOcr = async () => {
    if (!selectedImage) {
      alert('Please select an image first.');
      return;
    }

    setIsLoading(true);
    setOcrResult('');

    try {
      console.log('Converting image to base64...');
      const imageBase64 = await fileToBase64(selectedImage);
      console.log('Conversion complete. Sending to API...');

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBase64 }),
      });

      console.log('Received response from API.');
      const data = await response.json();

      if (!response.ok) {
        // Log the error from the API response if possible
        console.error('API Error:', data.error || response.statusText);
        throw new Error(data.error || `API request failed with status ${response.status}`);
      }

      const rawText = data.text || '';
      setOcrResult(rawText); 
      
      if (rawText) {
        const artists = parseOcrResult(rawText);
        setParsedArtists(artists);
      } else {
        setOcrResult('No text found.');
        setParsedArtists([]);
      }

    } catch (error) {
      console.error('OCR Request Error:', error);
      // Display a more user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setOcrResult(`Error: ${errorMessage}. Check console for details.`);
      setParsedArtists([]); // Clear artists on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      {/* Header Section */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-12">
          <h1 className="text-4xl font-bold">Festival Sync</h1>
          <div>
            {status === "loading" && (
              <p className="text-gray-500">Loading...</p>
            )}
            {status === "authenticated" && session?.user && (
              <div className="flex items-center gap-4">
                <span className="text-sm">Signed in as {session.user.name || session.user.email}</span>
                <button 
                  onClick={() => signOut()} 
                  className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition duration-300"
                >
                    Sign Out
                </button>
              </div>
            )}
            {status === "unauthenticated" && (
              <button 
                onClick={() => signIn('spotify')} 
                className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
              >
                Login with Spotify
              </button>
            )}
          </div>
      </div>
      
      {/* Rest of the content only shown if authenticated */}
      {status === "authenticated" && (
        <div className="flex flex-col items-center w-full">
          <div className="flex flex-col items-center gap-4 mb-8">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
            />
            <button
              onClick={handleOcr}
              disabled={!selectedImage || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Extract Text'}
            </button>
        </div>

          {/* OCR Loading Indicator */} 
          {isLoading && <p>Loading OCR results...</p>}

          {/* Display Parsed Artists List with Checkboxes */}
          {parsedArtists.length > 0 && !isSearchingSpotify && spotifyResults.length === 0 && userPlaylists.length === 0 && (
            <div className="mt-8 p-4 border border-blue-300 rounded-md  w-full max-w-xl">
              <h2 className="text-xl font-semibold mb-2">Review Artist Candidates:</h2>
              <p className="text-sm mb-2">Uncheck any items that are not artists.</p>
              <ul className="space-y-1">
                {parsedArtists.map((artist, index) => (
                  <li key={index} className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={artist.selected}
                      onChange={() => handleArtistSelectionChange(index)}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      id={`artist-${index}`}
                    />
                    <label htmlFor={`artist-${index}`} className="text-sm select-none">
                      {artist.name}
                    </label>
                  </li>
                ))}
              </ul>
              <button 
                 onClick={handleConfirmArtists}
                 disabled={isSearchingSpotify} // Disable while searching
                 className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearchingSpotify ? 'Searching Spotify...' : 'Find Artists on Spotify'} 
              </button>
            </div>
          )}
          
          {/* Spotify Search Loading/Error Indicator */}
          {isSearchingSpotify && <p className="mt-4">Searching Spotify for artists...</p>}
          {searchError && <p className="mt-4 text-red-600">Error: {searchError}</p>}

          {/* Display Spotify Search Results (Artist Found List) */} 
          {/* Only show if results exist and we haven't fetched playlists yet */}
          {spotifyResults.length > 0 && userPlaylists.length === 0 && !isFetchingPlaylists && (
             <div className="mt-8 p-4 border border-green-300 rounded-md bg-green-50 w-full max-w-xl">
                <h2 className="text-xl font-semibold mb-2">Spotify Search Results:</h2>
                <p className="text-sm mb-2">Found {spotifyResults.length} artists on Spotify.</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                   {spotifyResults.map((artist) => (
                     <li key={artist.id}>
                        {`${artist.searchQuery} -> `}
                        <a href={artist.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                           {artist.name}
                        </a>
                        {` (ID: ${artist.id})`}
                     </li>
                   ))}
                </ul>
                 {/* Renamed button to fetch playlists */}
                 <button 
                    onClick={handleFetchPlaylists} 
                    disabled={isFetchingPlaylists}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isFetchingPlaylists ? 'Fetching Playlists...' : 'Fetch My Playlists'}
                 </button>
             </div>
          )}
          
          {/* Playlist Fetch Loading/Error Indicator */}
          {isFetchingPlaylists && <p className="mt-4">Fetching your playlists...</p>}
          {fetchPlaylistsError && <p className="mt-4 text-red-600">Error: {fetchPlaylistsError}</p>}

          {/* Display User Playlists for Selection */} 
          {userPlaylists.length > 0 && !isComparingSelected && (
             <div className="mt-8 p-4 border border-indigo-300 rounded-md  w-full max-w-xl">
                <h2 className="text-xl font-semibold mb-2">Select Playlists to Compare:</h2>
                <p className="text-sm mb-2 text-gray-600">Choose which of your playlists to check for matches.</p>
                <div className="max-h-60 overflow-y-auto border rounded p-2 mb-4">
                  <ul className="space-y-1">
                    {userPlaylists.map((playlist, index) => (
                      <li key={`${playlist.id}-${index}`} className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedPlaylistIds.has(playlist.id)}
                          onChange={() => handlePlaylistSelectionChange(playlist.id)}
                          className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          id={`playlist-${playlist.id}`}
                        />
                        <label htmlFor={`playlist-${playlist.id}`} className="text-sm select-none">
                          {playlist.name} ({playlist.trackCount} tracks) - By {playlist.owner}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <button 
                   onClick={handleCompareSelectedPlaylists}
                   disabled={selectedPlaylistIds.size === 0 || isComparingSelected}
                   className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {isComparingSelected ? 'Comparing...' : `Compare Selected (${selectedPlaylistIds.size}) Playlists`}
                </button>
             </div>
          )}
          
          {/* Final Comparison Loading/Error Indicator */}
          {isComparingSelected && <p className="mt-4">Checking selected playlists for matches...</p>}
          {finalCompareError && <p className="mt-4 text-red-600">Error: {finalCompareError}</p>}

          {/* Display Final Matched Artists */} 
          {finalMatchedArtists.length > 0 && (
             <div className="mt-8 p-4 border border-yellow-300 rounded-md w-full max-w-xl">
                <h2 className="text-xl font-semibold mb-2">Artists You Listen To:</h2>
                <p className="text-sm mb-2 text-gray-600">Found {finalMatchedArtists.length} artists from the lineup in your selected playlists!</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                   {finalMatchedArtists.map((artist) => (
                     <li key={artist.id}>
                         <a href={artist.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{artist.name}</a>
                     </li>
                   ))}
                </ul>
                {/* Add Create Playlist Button */}
                 <button 
                    onClick={handleCreatePlaylist}
                    disabled={isCreatingPlaylist}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isCreatingPlaylist ? 'Creating Playlist...' : 'Create Playlist From Matches'}
                 </button>
                 {/* Display Playlist Creation Status */}
                 {isCreatingPlaylist && <p className="text-sm mt-2">Creating playlist...</p>}
                 {createPlaylistError && <p className="text-sm mt-2 text-red-600">Error: {createPlaylistError}</p>}
                 {newPlaylistUrl && (
                    <p className="text-sm mt-2 text-green-700">
                        Playlist created! 
                        <a href={newPlaylistUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-green-800"> View it on Spotify</a>
                    </p>
                 )}
             </div>
          )}
          {/* Also show message if comparison done but no matches found */}
          {!isComparingSelected && !finalCompareError && userPlaylists.length > 0 && selectedPlaylistIds.size > 0 && finalMatchedArtists.length === 0 && (
              <p className="mt-4 text-gray-700">No matches found in the selected playlists for the festival artists.</p>
          )}

          {/* Keep raw text display for comparison (optional) */}
          {ocrResult && !isSearchingSpotify && spotifyResults.length === 0 && (
            <div className="mt-8 p-4 border border-gray-300 rounded-md bg-gray-50 w-full max-w-xl">
               <h2 className="text-xl font-semibold mb-2">Raw Extracted Text:</h2>
               <pre className="whitespace-pre-wrap text-sm">{ocrResult}</pre>
            </div>
          )}
    </div>
      )}
      
      {/* Show message if not authenticated */} 
      {status === "unauthenticated" && (
         <p className="text-gray-600 mt-10">Please log in with Spotify to use the app.</p>
      )}

    </main>
  );
}
