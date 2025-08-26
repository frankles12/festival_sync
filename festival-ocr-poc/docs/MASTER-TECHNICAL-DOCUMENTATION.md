# Festival Sync Master Technical Documentation

**Version:** 0.1.0  
**Last Updated:** 2025-08-25  
**Architecture Type:** Monolith (Next.js App Router)

## Executive Summary
- **Purpose:** Extract artist names from festival lineup images and sync with a Spotify user’s library by finding overlaps and creating a curated playlist.
- **Key Decisions:**
  - Next.js 15 App Router monolith with serverless route handlers
  - NextAuth (Spotify OAuth) with JWT session strategy
  - Google Cloud Vision for OCR; Spotify Web API for music data
  - Client-driven workflow using fetch to internal API routes
- **Tech Stack:** Next.js 15, React 19, TypeScript 5, NextAuth 4, spotify-web-api-node 5, @google-cloud/vision 5, Tailwind/PostCSS 4.
- **Notable Changes:** Playlist fetching split from comparison; separate endpoints for autocomplete, artist alternatives, compare-selected, and playlist creation with top tracks.

## Table of Contents
[Auto-generated with deep linking]

## System Architecture

### High-Level Overview
- User authenticates with Spotify (NextAuth).
- User uploads lineup image; server performs OCR via Google Cloud Vision.
- Client parses candidate artist names; server searches Spotify to map to canonical artist IDs.
- Client fetches user playlists, selects targets, compares overlaps, then creates a playlist of top tracks from matched artists.

```mermaid
graph TD
  UI[Next.js Client (page.tsx)] -->|POST /api/ocr| OCR[OCR Route Handler]
  OCR --> GCV[Google Cloud Vision API]
  UI -->|POST /api/spotify/find-artists| FindArtists
  UI -->|GET /api/spotify/autocomplete-artists| Autocomplete
  UI -->|POST /api/spotify/compare-artists| FetchPlaylists
  UI -->|POST /api/spotify/compare-selected-playlists| CompareSelected
  UI -->|POST /api/spotify/create-playlist| CreatePlaylist
  FindArtists --> Spotify[Spotify Web API]
  Autocomplete --> Spotify
  FetchPlaylists --> Spotify
  CompareSelected --> Spotify
  CreatePlaylist --> Spotify
  Auth[NextAuth Spotify OAuth] --- UI
  Auth --- FindArtists
  Auth --- Autocomplete
  Auth --- FetchPlaylists
  Auth --- CompareSelected
  Auth --- CreatePlaylist
```

### Core Components
- **UI (`src/app/page.tsx`)**: Client UI workflow, state management, OCR submission, Spotify actions, and playlist creation UX.
- **Auth (`src/app/api/auth/[...nextauth]/route.ts`, `src/app/components/SessionProviderWrapper.tsx`, `src/types/next-auth.d.ts`)**: Spotify OAuth via NextAuth with JWT tokens and refresh handling.
- **OCR (`src/app/api/ocr/route.ts`)**: Uses `@google-cloud/vision` to extract text from uploaded images.
- **Spotify Integration (API Routes)**:
  - `find-artists`, `autocomplete-artists`, `artist-alternatives`
  - `compare-artists` (fetch playlists), `compare-selected-playlists` (matches), `create-playlist`

## API Documentation

### Authentication / Session
- **Path:** `/api/auth/[...nextauth]`  
  - Methods: GET, POST (NextAuth handlers)  
  - Provider: Spotify  
  - Scopes: `user-read-private`, `user-read-email`, `playlist-read-private`, `playlist-read-collaborative`, `playlist-modify-public`  
  - Session: JWT with automatic token refresh

### REST Endpoints (Internal)
- **POST `/api/ocr`**
  - Auth: Not required
  - Body: `{ image: string /* base64 data URL or raw base64 */ }`
  - Success: `{ text: string }`
  - Errors: `400` (no image), `500` (Vision error; explicit message for missing credentials)

- **GET `/api/spotify/autocomplete-artists?query=...`**
  - Auth: Required (JWT via NextAuth)
  - Query: `query: string` (≥ 2 chars)
  - Success: `{ suggestions: { id: string, name: string, uri: string }[] }`
  - Errors: `401` (unauthorized), `500` (search failure)

- **POST `/api/spotify/find-artists`**
  - Auth: Required
  - Body: `{ artists: string[] }`
  - Success: `{ foundArtists: { searchQuery: string, id: string, name: string, uri: string }[] }`
  - Notes: Sequential search to moderate rate limits
  - Errors: `400`, `401`, `500`

- **POST `/api/spotify/compare-artists`**
  - Auth: Required
  - Body: none
  - Success: `{ playlists: { id: string, name: string, owner: string, trackCount: number }[] }`
  - Notes: Paginates user playlists; handles `429` Retry-After
  - Errors: `401`, `500`

- **POST `/api/spotify/compare-selected-playlists`**
  - Auth: Required
  - Body: `{ festivalArtists: { id: string, name: string, uri: string }[], selectedPlaylistIds: string[] }`
  - Success: `{ matchedArtists: { id: string, name: string, uri: string }[] }`
  - Notes: Paginates playlist tracks; intersection by artist IDs
  - Errors: `400`, `401`, `500`

- **POST `/api/spotify/create-playlist`**
  - Auth: Required
  - Body: `{ artists: { id: string, name: string, uri: string }[], playlistName?: string }`
  - Success: `{ message: string, playlistUrl?: string, playlistId: string }`
  - Notes: Creates playlist, fetches top tracks per artist (market from `getMe()`), adds up to 100 tracks
  - Errors: `401`, `403` (missing scopes), `500`

## Technical Implementation Details

### Design Patterns
- Route Handlers (Next.js App Router) for server-side functions
- JWT session strategy with token refresh callback
- Pagination helper with retry/backoff for Spotify `429` handling

### Data Architecture
- No first-party database; transient state only
- External Systems: Google Cloud Vision, Spotify Web API

### State Management
- Client: React state in `page.tsx`
- Server: JWT via NextAuth `getToken()` inside route handlers

## Code Organization

### Repository Structure (relevant)
```
festival-ocr-poc/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ auth/[...nextauth]/route.ts
│  │  │  ├─ ocr/route.ts
│  │  │  └─ spotify/
│  │  │     ├─ autocomplete-artists/route.ts
│  │  │     ├─ artist-alternatives/route.ts
│  │  │     ├─ compare-artists/route.ts
│  │  │     ├─ compare-selected-playlists/route.ts
│  │  │     ├─ create-playlist/route.ts
│  │  │     └─ find-artists/route.ts
│  │  ├─ components/SessionProviderWrapper.tsx
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  └─ types/next-auth.d.ts
├─ package.json
├─ next.config.ts
├─ tsconfig.json
└─ rules/ (documentation rules)
```

### Naming Conventions
- Route directories reflect endpoint paths
- Types and interfaces are explicit and descriptive

### Shared Code Strategy
- Lightweight; no shared libs directory. Consider extracting a reusable Spotify client helper.

## Infrastructure & DevOps

### Deployment
- Suitable for Vercel/Node environments; no container/IaC committed

### Configuration Management
- Environment variables (expected):
  - `NEXTAUTH_SECRET`
  - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
  - Google Cloud auth via ADC (`GOOGLE_APPLICATION_CREDENTIALS`) or equivalent setup
- `doc-config.yaml` present as template; rename to `.doc-config.yaml` to activate rule-driven docs automation.

### Monitoring & Observability
- Console logging in routes; no centralized logging/metrics/tracing yet

## Security Architecture

### Authentication & Authorization
- NextAuth with Spotify OAuth; JWT sessions
- Route-level token checks via `getToken()`

### API Security
- No explicit rate limiting at edge; Spotify pagination helper retries on `429`
- Input validation present but basic

## Testing Strategy
- No tests committed. Recommend unit tests for parsing and endpoint handlers; integration tests for end-to-end flow.

## Development Guidelines

### Getting Started
1. `npm run dev`
2. Set env vars for NextAuth and Spotify; ensure Google Vision credentials are available to the server.

### Coding Standards
- ESLint config: `next/core-web-vitals` + TypeScript; strict TS enabled

## Areas To Expand Next (Surface-Level)
- **Observability:** Structured logging, error reporting, request tracing
- **Security:** Harden input validation, secret management, scope minimization
- **Resilience:** Client-side retries/backoff, server queueing for large OCR or searches
- **Rate Limiting:** Internal throttling for batch Spotify calls; caching
- **DX:** Extract Spotify client/util module; centralize types; add API schemas
- **Testing:** Unit/integration/E2E coverage; mock Spotify and GCV
- **Docs:** Activate `.doc-config.yaml`; per-endpoint examples and schema files

## Machine-Readable Summary (JSON)
```json
{
  "projectName": "festival-ocr-poc",
  "architectureType": "monolith",
  "techStack": [
    "next@15",
    "react@19",
    "typescript@5",
    "next-auth@4",
    "spotify-web-api-node@5",
    "@google-cloud/vision@5"
  ],
  "auth": {
    "provider": "spotify",
    "session": "jwt",
    "scopes": [
      "user-read-private",
      "user-read-email",
      "playlist-read-private",
      "playlist-read-collaborative",
      "playlist-modify-public"
    ]
  },
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/ocr",
      "authRequired": false,
      "request": { "image": "base64-string" },
      "response": { "text": "string" }
    },
    {
      "method": "GET",
      "path": "/api/spotify/autocomplete-artists",
      "query": { "query": "string>=2" },
      "authRequired": true,
      "response": { "suggestions": [{ "id": "string", "name": "string", "uri": "string" }] }
    },
    {
      "method": "POST",
      "path": "/api/spotify/find-artists",
      "authRequired": true,
      "request": { "artists": ["string"] },
      "response": { "foundArtists": [{ "searchQuery": "string", "id": "string", "name": "string", "uri": "string" }] }
    },
    {
      "method": "POST",
      "path": "/api/spotify/compare-artists",
      "authRequired": true,
      "request": {},
      "response": { "playlists": [{ "id": "string", "name": "string", "owner": "string", "trackCount": "number" }] }
    },
    {
      "method": "POST",
      "path": "/api/spotify/compare-selected-playlists",
      "authRequired": true,
      "request": { "festivalArtists": [{ "id": "string" }], "selectedPlaylistIds": ["string"] },
      "response": { "matchedArtists": [{ "id": "string", "name": "string", "uri": "string" }] }
    },
    {
      "method": "POST",
      "path": "/api/spotify/create-playlist",
      "authRequired": true,
      "request": { "artists": [{ "id": "string", "name": "string", "uri": "string" }], "playlistName": "string?" },
      "response": { "message": "string", "playlistUrl": "string?", "playlistId": "string" }
    }
  ],
  "flows": [
    { "name": "ocr_to_playlist",
      "steps": [
        { "POST": "/api/ocr" },
        { "POST": "/api/spotify/find-artists" },
        { "POST": "/api/spotify/compare-artists" },
        { "POST": "/api/spotify/compare-selected-playlists" },
        { "POST": "/api/spotify/create-playlist" }
      ]
    }
  ]
}
```

## Appendices

### A. External Dependencies
- Spotify Web API (oauth, playlists, tracks, artists)
- Google Cloud Vision API (text detection)

### B. Technology Decisions Record (TDR)
- Use NextAuth JWT sessions for simplicity and serverless compatibility (Accepted)
- Use Google Cloud Vision over client-side Tesseract for accuracy/perf (Accepted)
- Split playlist fetching and comparison to reduce payloads and latency (Accepted)

### C. Individual Documentation Index
- Rule templates: `rules/architect.mdc`, `rules/generate-documentation-master.mdc`


