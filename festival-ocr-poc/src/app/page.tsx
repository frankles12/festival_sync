"use client";

import { useState } from 'react';
// Remove Tesseract import
// import Tesseract from 'tesseract.js';

// Define type for artist state
interface ArtistEntry {
  name: string;
  selected: boolean;
}

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Update state to use the new type
  const [parsedArtists, setParsedArtists] = useState<ArtistEntry[]>([]); 
  // Remove progress state, as API call doesn't provide fine-grained progress
  // const [progress, setProgress] = useState<number>(0); 

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      setOcrResult(''); // Clear previous result
      setParsedArtists([]); // Clear parsed artists
      // setProgress(0); // Reset progress
    }
  };

  // Remove preprocessImage function
  /*
  const preprocessImage = (file: File): Promise<HTMLCanvasElement> => {
    // ... implementation removed ...
  };
  */

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

    // Remove the isLikelyMultiCap function
    /*
    const isLikelyMultiCap = (str: string): boolean => {
      if (!str.includes(' ')) return false; 
      return /^[A-Z0-9&' ]+$/.test(str); 
    };
    */

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
  
  // Handler for the confirm button
  const handleConfirmArtists = () => {
    const selectedNames = parsedArtists
      .filter(artist => artist.selected)
      .map(artist => artist.name);
      
    console.log("Confirmed Artists:", selectedNames);
    // Next Step: Send selectedNames to Spotify matching logic
    alert(`Confirmed ${selectedNames.length} artists! (Check console for list)`);
  };

  const handleOcr = async () => {
    if (!selectedImage) {
      alert('Please select an image first.');
      return;
    }

    setIsLoading(true);
    setOcrResult('');
    // setProgress(0);

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
      // setProgress(100); // Not needed anymore
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      {/* Update title */}
      <h1 className="text-4xl font-bold mb-8">Festival Sync</h1>
      
      {/* Spotify Login Button */}
      <div className="mb-8">
        <a 
          href="/api/auth/login/spotify" 
          className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition duration-300"
        >
          Login with Spotify
        </a>
      </div>

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

      {/* Remove progress bar */}
      {/* {isLoading && (
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          <p className="text-center text-sm mt-1">{progress}%</p>
        </div>
      )} */}
      
      {/* Show loading indicator */} 
      {isLoading && <p>Loading...</p>}

      {/* Display Parsed Artists List with Checkboxes */}
      {parsedArtists.length > 0 && (
        <div className="mt-8 p-4 border border-blue-300 rounded-md bg-blue-500 w-full max-w-xl">
          <h2 className="text-xl font-semibold mb-2">Review Artist Candidates:</h2>
          <p className="text-sm mb-2 text-gray-600">Uncheck any items that are not artists.</p>
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
             className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Confirm Artist List
          </button>
        </div>
      )}

      {/* Keep raw text display for comparison (optional) */}
      {ocrResult && (
        <div className="mt-8 p-4 border border-gray-300 rounded-md bg-gray-50 w-full max-w-xl">
          <h2 className="text-xl font-semibold mb-2">Raw Extracted Text:</h2>
          <pre className="whitespace-pre-wrap text-sm">{ocrResult}</pre>
        </div>
      )}
    </main>
  );
}
