"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type StepKey = "upload" | "review" | "compare" | "results" | "create";

export interface SpotifyArtist {
  id: string;
  name: string;
  uri?: string;
  url?: string;
}

export interface FlowState {
  ocr: {
    imageDataUrl: string | null;
    text: string;
    candidateNames: string[];
  };
  review: {
    // Map original OCR term to selected Spotify artist (or null if cleared)
    artistMappings: Record<string, SpotifyArtist | null>;
  };
  compare: {
    selectedPlaylistIds: string[];
  };
  results: {
    matchedArtists: SpotifyArtist[];
  };
  create: {
    playlistName: string;
    createdPlaylistId: string | null;
    createdPlaylistUrl: string | null;
  };
}

const initialState: FlowState = {
  ocr: {
    imageDataUrl: null,
    text: "",
    candidateNames: [],
  },
  review: {
    artistMappings: {},
  },
  compare: {
    selectedPlaylistIds: [],
  },
  results: {
    matchedArtists: [],
  },
  create: {
    playlistName: "Festival Sync Matches",
    createdPlaylistId: null,
    createdPlaylistUrl: null,
  },
};

type Action =
  | { type: "SET_OCR_IMAGE_DATA_URL"; payload: string | null }
  | { type: "SET_OCR_TEXT"; payload: string }
  | { type: "SET_CANDIDATE_NAMES"; payload: string[] }
  | { type: "UPDATE_CANDIDATE_NAME"; payload: { index: number; value: string } }
  | {
      type: "SET_ARTIST_MAPPING";
      payload: { originalName: string; artist: SpotifyArtist | null };
    }
  | { type: "CLEAR_ARTIST_MAPPINGS" }
  | { type: "SET_SELECTED_PLAYLIST_IDS"; payload: string[] }
  | { type: "ADD_SELECTED_PLAYLIST_ID"; payload: string }
  | { type: "REMOVE_SELECTED_PLAYLIST_ID"; payload: string }
  | { type: "SET_MATCHED_ARTISTS"; payload: SpotifyArtist[] }
  | { type: "SET_PLAYLIST_NAME"; payload: string }
  | { type: "SET_CREATED_PLAYLIST"; payload: { id: string; url?: string } }
  | { type: "RESET" };

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case "SET_OCR_IMAGE_DATA_URL":
      return { ...state, ocr: { ...state.ocr, imageDataUrl: action.payload } };
    case "SET_OCR_TEXT":
      return { ...state, ocr: { ...state.ocr, text: action.payload } };
    case "SET_CANDIDATE_NAMES":
      return { ...state, ocr: { ...state.ocr, candidateNames: [...action.payload] } };
    case "UPDATE_CANDIDATE_NAME": {
      const updated = [...state.ocr.candidateNames];
      updated[action.payload.index] = action.payload.value;
      return { ...state, ocr: { ...state.ocr, candidateNames: updated } };
    }
    case "SET_ARTIST_MAPPING": {
      const { originalName, artist } = action.payload;
      return {
        ...state,
        review: {
          ...state.review,
          artistMappings: { ...state.review.artistMappings, [originalName]: artist },
        },
      };
    }
    case "CLEAR_ARTIST_MAPPINGS":
      return { ...state, review: { ...state.review, artistMappings: {} } };
    case "SET_SELECTED_PLAYLIST_IDS":
      return {
        ...state,
        compare: { ...state.compare, selectedPlaylistIds: [...action.payload] },
      };
    case "ADD_SELECTED_PLAYLIST_ID":
      return {
        ...state,
        compare: {
          ...state.compare,
          selectedPlaylistIds: Array.from(
            new Set([...state.compare.selectedPlaylistIds, action.payload])
          ),
        },
      };
    case "REMOVE_SELECTED_PLAYLIST_ID":
      return {
        ...state,
        compare: {
          ...state.compare,
          selectedPlaylistIds: state.compare.selectedPlaylistIds.filter(
            (id) => id !== action.payload
          ),
        },
      };
    case "SET_MATCHED_ARTISTS":
      return { ...state, results: { ...state.results, matchedArtists: [...action.payload] } };
    case "SET_PLAYLIST_NAME":
      return { ...state, create: { ...state.create, playlistName: action.payload } };
    case "SET_CREATED_PLAYLIST":
      return {
        ...state,
        create: {
          ...state.create,
          createdPlaylistId: action.payload.id,
          createdPlaylistUrl: action.payload.url ?? null,
        },
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

interface FlowContextValue {
  state: FlowState;
  setOcrImageDataUrl: (url: string | null) => void;
  setOcrText: (text: string) => void;
  setCandidateNames: (names: string[]) => void;
  updateCandidateName: (index: number, value: string) => void;
  setArtistMapping: (originalName: string, artist: SpotifyArtist | null) => void;
  clearArtistMappings: () => void;
  setSelectedPlaylistIds: (ids: string[]) => void;
  addSelectedPlaylistId: (id: string) => void;
  removeSelectedPlaylistId: (id: string) => void;
  setMatchedArtists: (artists: SpotifyArtist[]) => void;
  setPlaylistName: (name: string) => void;
  setCreatedPlaylist: (id: string, url?: string) => void;
  reset: () => void;
}

const FlowStateContext = createContext<FlowContextValue | undefined>(undefined);

export default function FlowStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: FlowContextValue = useMemo(
    () => ({
      state,
      setOcrImageDataUrl: (url) => dispatch({ type: "SET_OCR_IMAGE_DATA_URL", payload: url }),
      setOcrText: (text) => dispatch({ type: "SET_OCR_TEXT", payload: text }),
      setCandidateNames: (names) => dispatch({ type: "SET_CANDIDATE_NAMES", payload: names }),
      updateCandidateName: (index, value) =>
        dispatch({ type: "UPDATE_CANDIDATE_NAME", payload: { index, value } }),
      setArtistMapping: (originalName, artist) =>
        dispatch({ type: "SET_ARTIST_MAPPING", payload: { originalName, artist } }),
      clearArtistMappings: () => dispatch({ type: "CLEAR_ARTIST_MAPPINGS" }),
      setSelectedPlaylistIds: (ids) =>
        dispatch({ type: "SET_SELECTED_PLAYLIST_IDS", payload: ids }),
      addSelectedPlaylistId: (id) =>
        dispatch({ type: "ADD_SELECTED_PLAYLIST_ID", payload: id }),
      removeSelectedPlaylistId: (id) =>
        dispatch({ type: "REMOVE_SELECTED_PLAYLIST_ID", payload: id }),
      setMatchedArtists: (artists) =>
        dispatch({ type: "SET_MATCHED_ARTISTS", payload: artists }),
      setPlaylistName: (name) => dispatch({ type: "SET_PLAYLIST_NAME", payload: name }),
      setCreatedPlaylist: (id, url) =>
        dispatch({ type: "SET_CREATED_PLAYLIST", payload: { id, url } }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    [state]
  );

  return (
    <FlowStateContext.Provider value={value}>{children}</FlowStateContext.Provider>
  );
}

export function useFlowState(): FlowContextValue {
  const ctx = useContext(FlowStateContext);
  if (!ctx) {
    throw new Error("useFlowState must be used within a FlowStateProvider");
  }
  return ctx;
}

export type { FlowContextValue };


