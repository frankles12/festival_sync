## Tasks

- [x] 1.0 App shell, routing, and stepper across Upload → Review → Compare → Results → Create
  - [x] 1.1 Create routes `/upload`, `/review`, `/compare`, `/results`, `/create` using App Router
  - [x] 1.2 Implement persistent header with product title, session status, and user menu
  - [x] 1.3 Add stepper component showing current and completed steps
  - [x] 1.4 Provide shared state via `FlowStateProvider` to preserve inputs between steps
  - [x] 1.5 Navigate forward/back without losing state; guard invalid forward transitions
  - [x] 1.6 Handle deep links: if missing prior state, prompt to re-run earlier steps
  - [x] 1.7 Mobile-first responsive layouts with centered max-width on desktop
  - [x] 1.8 Emit analytics events on step mount/unmount and on navigation
  - [x] 1.9 Add step-level error boundary with friendly fallback and retry action

- [ ] 2.0 Authentication and consent surfaces (pre-Spotify consent, cookie banner, gating)
  - [x] 2.1 Build pre-auth consent screen listing Spotify scopes and “Connect Spotify” CTA
  - [x] 2.2 Wire CTA to NextAuth `signIn('spotify')`; show spinner and error states
  - [x] 2.3 Add cookie consent banner (Accept/Dismiss) with persistence and ability to revoke
  - [x] 2.4 Gate Spotify actions client-side; show connect prompt when unauthenticated
  - [x] 2.5 Header user menu: show login/logout, account name, link to revoke cookie consent
  - [x] 2.6 Prevent access to playlist/compare/create steps unless authenticated (upload allowed)
  - [ ] 2.7 Track consent and auth events in analytics

- [ ] 3.0 OCR upload and artist review pipeline with autocomplete and artist mapping
  - [ ] 3.1 Implement accessible drag-and-drop/file picker drop zone (keyboard operable)
  - [ ] 3.2 POST image to `/api/ocr`; show progress and human-friendly errors
  - [ ] 3.3 Parse OCR text into candidate artist names (trim, dedupe, normalize)
  - [ ] 3.4 Render editable list of candidates with inline text inputs
  - [ ] 3.5 Add autocomplete (≥2 chars) via `/api/spotify/autocomplete-artists` with ARIA listbox
  - [ ] 3.6 Add “Not correct?” button to open modal with alternatives (artist-alternatives)
  - [ ] 3.7 Confirm to run `/api/spotify/find-artists` for reviewed names; map results
  - [ ] 3.8 Preserve and display original OCR term alongside matched Spotify artist
  - [ ] 3.9 Ensure edits don’t reset other entries; stable keys and controlled inputs
  - [ ] 3.10 Accessibility: focus management, roles, keyboard navigation for inputs and modal

- [ ] 4.0 Playlist discovery, selection, comparison, results, and playlist creation
  - [ ] 4.1 Fetch user playlists via `/api/spotify/compare-artists` (pagination supported)
  - [ ] 4.2 Implement infinite scroll or paginated list with skeletons/empty states
  - [ ] 4.3 Add client-side search (name), sort (name, track count), and filters (owner, min tracks)
  - [ ] 4.4 Enable multi-select of playlists; show selection count and clear all
  - [ ] 4.5 Compare via `/api/spotify/compare-selected-playlists` with `{ festivalArtists, selectedPlaylistIds }`
  - [ ] 4.6 Results view: list matched artists with links to Spotify; encouraging empty state
  - [ ] 4.7 Create step: required playlist name (default “Festival Sync Matches”)
  - [ ] 4.8 Call `/api/spotify/create-playlist`; show success with link and retry on error
  - [ ] 4.9 Disable create when no matches; validate inputs and display inline errors
  - [ ] 4.10 Add client-side retry/backoff wrapper with user feedback for Spotify calls

- [ ] 5.0 Global design tokens and component systemization (buttons, inputs, cards, modal, list, stepper)
  - [ ] 5.1 Import `Resources/newStyles.css` tokens into `globals.css` and expose CSS variables
  - [ ] 5.2 Define type scale (12/14/16/20/24/32/40) and apply via utility classes
  - [ ] 5.3 Establish spacing (4/8/12/16/24/32/48), radii (6/10/16), and elevation tokens
  - [ ] 5.4 Create glassmorphism surfaces (cards/modals) with translucency, blur, and shadows
  - [ ] 5.5 Build Button variants (primary/secondary/destructive/subtle) with sm/md/lg sizes
  - [ ] 5.6 Build Input components (text, drop zone wrapper, checkbox, select) with help/error
  - [ ] 5.7 Build Modal/Dialog with focus trap and ARIA labelling
  - [ ] 5.8 Build Stepper component with current/completed states
  - [ ] 5.9 Build Toast/Inline Alert components for success/error
  - [ ] 5.10 Provide Virtualized/Paginated List for playlists with skeleton placeholders
  - [ ] 5.11 Accessibility pass across components (keyboard order, roles, contrast)
  - [ ] 5.12 Add analytics helper to emit standardized events (step transitions, errors)

## Relevant Files

- `src/app/layout.tsx`: App shell with header, stepper, providers
- `src/app/components/Header.tsx`: Persistent header with session status and user menu
- `src/app/components/Stepper.tsx`: Stepper UI for current/completed states
- `src/app/components/DeepLinkGuard.tsx`: Guards deep links and guides users to the required prior step
- `src/app/components/Modal.tsx`: Accessible modal/dialog with focus trapping
- `src/app/components/Autocomplete.tsx`: Artist autocomplete listbox/option interactions
- `src/app/components/Dropzone.tsx`: Accessible drag-and-drop file input wrapper
- `src/app/components/Toast.tsx`: Toast/inline alert components
- `src/app/components/Button.tsx`: Systemized button variants and sizes
- `src/app/components/Input.tsx`: Text input with help/error states
- `src/app/components/Card.tsx`: Glassmorphism surface
- `src/app/components/PlaylistList.tsx`: Virtualized/paginated playlists list
- `src/app/(flow)/upload/page.tsx`: Upload step UI and OCR submission
- `src/app/(flow)/review/page.tsx`: Artist review with inline edits and autocomplete
- `src/app/(flow)/compare/page.tsx`: Playlist discovery, search/sort/filter, multi-select
- `src/app/(flow)/results/page.tsx`: Matched artists results with Spotify links
- `src/app/(flow)/create/page.tsx`: Playlist naming and creation success
- `src/app/page.tsx`: Landing/pre-auth consent screen and primary CTA
- `src/app/components/CookieBanner.tsx`: Cookie consent banner and persistence
- `src/app/components/SessionProviderWrapper.tsx`: NextAuth provider wrapper
- `src/app/globals.css`: Global styles importing `Resources/newStyles.css` tokens
- `src/app/lib/state/FlowStateProvider.tsx`: Shared state across steps
- `src/app/lib/analytics.ts`: Vercel Analytics event helper
- `src/app/lib/fetchWithRetry.ts`: Client-side retry/backoff for Spotify/OCR calls
- `src/types/next-auth.d.ts`: NextAuth types; session fields used in header
- `src/app/api/ocr/route.ts`: OCR route (existing)
- `src/app/api/spotify/*/route.ts`: Spotify routes (existing)


