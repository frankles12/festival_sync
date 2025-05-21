"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
// Remove Tesseract import
// import Tesseract from 'tesseract.js';

// Define type for artist state
interface ArtistEntry {
  id: string; // Unique identifier for React key and state updates
  name: string;
  selected: boolean;
  isEditing: boolean; // True if the entry is currently being edited
  originalOcrText: string; // The originally parsed text, useful for reference or reset
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

interface AutocompleteArtistSuggestion {
  id: string;
  name: string;
  uri: string;
}

export default function Home() {
  const { data: session, status } = useSession();

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [parsedArtists, setParsedArtists] = useState<ArtistEntry[]>([]);
  // State to hold the current input value for artists being edited
  const [editingArtistValues, setEditingArtistValues] = useState<Record<string, string>>({});
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

  // State for autocomplete
  const [activeEditIdForAutocomplete, setActiveEditIdForAutocomplete] = useState<string | null>(null);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteArtistSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

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
    const noiseKeywords = [
      'VANS', 'NOV', 'BEATBOX', 'EARGASM', 
      'PRESENTS', 'PRESENTED BY', 'SPONSORED BY', 'STAGE',
      '\d{2}'
    ];
    const noiseRegex = new RegExp(`^(${noiseKeywords.join('|')})$|\d{2}`, 'i'); 

    const lines = rawText.split('\n');
    const candidates = new Set<string>();

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 3) continue;
      if (noiseRegex.test(trimmedLine)) continue;
      
      const splitRegex = /[•*,-]|\s{2,}/;
      const potentialNames = trimmedLine.split(splitRegex);

      for (const name of potentialNames) {
        let cleanedName = name.trim().replace(/^[•*,\-\s]+|[•*,\-\s]+$/g, '');
        if (cleanedName.length >= 3 && !noiseRegex.test(cleanedName)) {
          candidates.add(cleanedName);
        }
      }
    }

    const artistEntries = Array.from(candidates).map(name => ({
      id: crypto.randomUUID(), // Generate a unique ID
      name: name,
      selected: true, // Initially select all candidates
      isEditing: false, // Not editing by default
      originalOcrText: name, // Store the original parsed text
    }));

    console.log('Parsing complete. Candidates:', artistEntries);
    return artistEntries;
  };

  // Handler for toggling artist selection
  const handleToggleArtistSelection = (id: string) => {
    setParsedArtists(prevArtists =>
      prevArtists.map(artist =>
        artist.id === id ? { ...artist, selected: !artist.selected } : artist
      )
    );
  };

  // Debounce function for fetching autocomplete suggestions
  const debouncedFetchSuggestions = useCallback(
    async (query: string, artistId: string) => {
      if (query.trim().length < 2) {
        setAutocompleteSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setIsFetchingSuggestions(true);
      try {
        const response = await fetch(`/api/spotify/autocomplete-artists?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        const data = await response.json();
        if (activeEditIdForAutocomplete === artistId) { // Ensure suggestions are for the current input
          setAutocompleteSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        setAutocompleteSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsFetchingSuggestions(false);
      }
    },
    [activeEditIdForAutocomplete] // Recreate if activeEditIdForAutocomplete changes
  );

  // Effect to trigger debounced search when the editing value for the active artist changes
  useEffect(() => {
    if (activeEditIdForAutocomplete && editingArtistValues[activeEditIdForAutocomplete] !== undefined) {
      const query = editingArtistValues[activeEditIdForAutocomplete];
      const handler = setTimeout(() => {
        debouncedFetchSuggestions(query, activeEditIdForAutocomplete);
      }, 500); // 500ms debounce delay

      return () => {
        clearTimeout(handler);
      };
    } else {
      setAutocompleteSuggestions([]); // Clear suggestions if no active input or value
      setShowSuggestions(false);
    }
  }, [editingArtistValues, activeEditIdForAutocomplete, debouncedFetchSuggestions]);

  // Handler to toggle edit mode for an artist
  const handleToggleEditMode = (id: string) => {
    setParsedArtists(prevArtists =>
      prevArtists.map(artist => {
        if (artist.id === id) {
          if (!artist.isEditing) {
            setEditingArtistValues(prev => ({ ...prev, [id]: artist.name }));
            setActiveEditIdForAutocomplete(id); // Set this as the active input for autocomplete
            setShowSuggestions(false); // Hide suggestions initially
            setAutocompleteSuggestions([]); // Clear old suggestions
          } else {
            // Exiting edit mode
            setActiveEditIdForAutocomplete(null);
            setShowSuggestions(false);
          }
          return { ...artist, isEditing: !artist.isEditing };
        }
        // If another artist was being edited, ensure it's closed (single edit mode)
        // return artist.isEditing ? { ...artist, isEditing: false } : artist;
        return artist;
      })
    );
  };
  
  const handleEditingArtistNameChange = (id: string, value: string) => {
    setEditingArtistValues(prev => ({ ...prev, [id]: value }));
    // Debounced fetch will be triggered by useEffect watching editingArtistValues[activeEditIdForAutocomplete]
    if (id === activeEditIdForAutocomplete && value.trim().length >= 2) {
        setShowSuggestions(true);
    } else if (id === activeEditIdForAutocomplete) {
        setShowSuggestions(false);
        setAutocompleteSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestionName: string, artistId: string) => {
    setEditingArtistValues(prev => ({ ...prev, [artistId]: suggestionName }));
    setAutocompleteSuggestions([]);
    setShowSuggestions(false);
    // Optionally, you could immediately save or wait for user to press Enter/Save button
    // For now, just fills the input. The user can then Save.
    // Focus the input again after click
    const inputElement = document.getElementById(`edit-artist-${artistId}`);
    inputElement?.focus();
  };

  // Handler to save the edited artist name (and potentially split)
  const handleSaveArtistName = (id: string) => {
    const newName = editingArtistValues[id]?.trim();
    if (typeof newName !== 'string') return; // Should not happen if editing

    setParsedArtists(prevArtists => {
      const artistIndex = prevArtists.findIndex(artist => artist.id === id);
      if (artistIndex === -1) return prevArtists;

      const originalArtist = prevArtists[artistIndex];
      const artistsToInsert: ArtistEntry[] = [];

      if (newName.includes(',')) {
        const splitNames = newName.split(',').map(namePart => namePart.trim()).filter(namePart => namePart.length > 0);
        splitNames.forEach(namePart => {
          artistsToInsert.push({
            id: crypto.randomUUID(),
            name: namePart,
            selected: originalArtist.selected, 
            isEditing: false,
            originalOcrText: originalArtist.originalOcrText, 
          });
        });
      } else if (newName.length > 0) { 
        artistsToInsert.push({
          ...originalArtist,
          name: newName,
          isEditing: false,
        });
      } else { 
         return prevArtists.map(a => a.id === id ? {...a, isEditing: false} : a);
      }
      
      if (artistsToInsert.length === 0 && !newName.includes(',')) { 
          return prevArtists.map(a => a.id === id ? { ...a, isEditing: false } : a);
      }

      const updatedArtists = [...prevArtists];
      if (artistsToInsert.length > 0) {
        updatedArtists.splice(artistIndex, 1, ...artistsToInsert);
      } else {
        updatedArtists.splice(artistIndex, 1);
      }
      
      setEditingArtistValues(prev => {
        const newValues = { ...prev };
        delete newValues[id];
        return newValues;
      });
      setActiveEditIdForAutocomplete(null); // Clear active autocomplete ID
      setShowSuggestions(false); // Hide suggestions
      setAutocompleteSuggestions([]); // Clear suggestions
      return updatedArtists;
    });
  };

  // Handler to cancel editing
  const handleCancelEdit = (id: string) => {
    setParsedArtists(prevArtists =>
      prevArtists.map(artist =>
        artist.id === id ? { ...artist, isEditing: false } : artist
      )
    );
    setEditingArtistValues(prev => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
    setActiveEditIdForAutocomplete(null); // Clear active autocomplete ID
    setShowSuggestions(false); // Hide suggestions
    setAutocompleteSuggestions([]); // Clear suggestions
  };

  // Handler to delete an artist entry
  const handleDeleteArtist = (id: string) => {
    setParsedArtists(prevArtists => prevArtists.filter(artist => artist.id !== id));
    // Clean up the editing value if it was being edited
    setEditingArtistValues(prev => {
      const newValues = { ...prev };
      delete newValues[id];
      return newValues;
    });
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
            <div className="mt-8 p-4 border border-blue-300 rounded-md w-full max-w-xl">
              <h2 className="text-xl font-semibold mb-2">Review Artist Candidates:</h2>
              <p className="text-sm mb-2">
                Select artists, edit names (use commas to split, e.g., "Artist A, Artist B"), or delete entries.
              </p>
              <ul className="space-y-2">
                {parsedArtists.map((artist) => (
                  <li key={artist.id} className="flex items-center p-2 rounded-md hover:bg-gray-100 transition-colors group relative">
                    <input 
                      type="checkbox" 
                      checked={artist.selected}
                      onChange={() => handleToggleArtistSelection(artist.id)}
                      className="mr-3 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      id={`artist-select-${artist.id}`}
                    />
                    {artist.isEditing ? (
                      <div className="flex-grow flex items-center gap-2">
                        <div className="flex-grow relative">
                          <input
                            id={`edit-artist-${artist.id}`} // ID for focusing
                            type="text"
                            value={editingArtistValues[artist.id] || ''}
                            onChange={(e) => handleEditingArtistNameChange(artist.id, e.target.value)}
                            onFocus={() => { // When input is focused, ensure it's the active one
                              setActiveEditIdForAutocomplete(artist.id);
                              // Show suggestions if there's already text that meets criteria
                              if ((editingArtistValues[artist.id]?.trim()?.length || 0) >=2) {
                                  setShowSuggestions(true);
                              }
                            }}
                            onBlur={() => {
                                // Delay hiding suggestions to allow click on suggestion item
                                setTimeout(() => {
                                    if (!document.activeElement?.closest(`#suggestions-${artist.id}`)) {
                                        setShowSuggestions(false);
                                    }
                                }, 100);
                            }}
                            className="w-full px-2 py-1 border border-blue-500 rounded-md text-sm text-black"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault(); // Prevent form submission if any
                                handleSaveArtistName(artist.id);
                              }
                              if (e.key === 'Escape') handleCancelEdit(artist.id);
                            }}
                            aria-autocomplete="list"
                            aria-controls={`suggestions-${artist.id}`}
                          />
                          {/* Autocomplete Suggestions Dropdown */}
                          {activeEditIdForAutocomplete === artist.id && showSuggestions && autocompleteSuggestions.length > 0 && (
                            <ul 
                                id={`suggestions-${artist.id}`}
                                className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg"
                                role="listbox"
                            >
                              {isFetchingSuggestions && <li className="px-3 py-2 text-sm text-gray-500">Loading...</li>}
                              {!isFetchingSuggestions && autocompleteSuggestions.map((suggestion, index) => (
                                <li
                                  key={suggestion.id + '-' + index}
                                  onClick={() => handleSuggestionClick(suggestion.name, artist.id)}
                                  className="px-3 py-2 text-sm text-black hover:bg-blue-100 cursor-pointer"
                                  role="option"
                                  aria-selected={false} // Can be enhanced with keyboard navigation
                                >
                                  {suggestion.name}
                                </li>
                              ))}
                            </ul>
                          )}
                           {activeEditIdForAutocomplete === artist.id && showSuggestions && !isFetchingSuggestions && autocompleteSuggestions.length === 0 && (editingArtistValues[artist.id]?.trim()?.length || 0) >=2 && (
                                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 px-3 py-2 text-sm text-gray-500 shadow-lg">
                                    No suggestions found.
                                </div>
                            )}
                        </div>
                        <button 
                          onClick={() => handleSaveArtistName(artist.id)}
                          className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-md hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => handleCancelEdit(artist.id)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 text-xs font-semibold rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <label htmlFor={`artist-select-${artist.id}`} className="flex-grow text-sm select-none cursor-pointer group-hover:text-black">
                        {artist.name}
                      </label>
                    )}
                    {!artist.isEditing && (
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => handleToggleEditMode(artist.id)}
                          className="px-2 py-1 text-blue-600 hover:text-blue-800 text-xs font-medium rounded-md hover:bg-blue-100"
                          title="Edit artist name"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteArtist(artist.id)}
                          className="px-2 py-1 text-red-500 hover:text-red-700 text-xs font-medium rounded-md hover:bg-red-100"
                          title="Delete artist"
                        >
                          Delete
                        </button>
                      </div>
                    )}
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
