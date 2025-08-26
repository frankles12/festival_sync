# PRD: Festival Sync UI/UX Overhaul

**Owner:** Product/Design
**Version:** 1.0
**Status:** Draft
**Scope:** Full application UI/UX (auth, OCR, Spotify flows, modals, global styles)

## 1. Introduction / Overview

Transform the current proof-of-concept UI into a professional, production-quality application aligned with AirBnB HIG principles. The redesign will establish a cohesive design system (tokens, components, layouts), reduce cognitive load, and guide users through an intuitive, non-linear but progressive flow from lineup image upload to Spotify playlist creation.

References:
- Design intent and style: `Resources/design.md`
- Color system to use: `Resources/newStyles.css`
- Current technical architecture: `docs/MASTER-TECHNICAL-DOCUMENTATION.md`

## 2. Goals

- Establish a consistent visual language (hierarchical depth, glassmorphism, minimalism) aligned with AirBnB HIG.
- Introduce a guided, step-based flow that minimizes backtracking/scrolling and clearly communicates progress.
- Support drag-and-drop single image upload for OCR (multi-image not required).
- Provide frictionless artist review and correction with inline autocomplete and an optional, unobtrusive confidence/correction step.
- Enable efficient playlist selection with search/sort/filter and infinite scroll.
- Allow naming the created playlist; privacy/cover art out of scope for now.
- Instrument key UX metrics via Vercel Analytics.
- Maintain code testability (dev will add tests later).

## 3. User Stories

1. As a user, I can sign in with Spotify and understand the scopes requested before connecting my account.
2. As a user, I can drag-and-drop a lineup image to start OCR, with clear state for loading and errors.
3. As a user, I can review parsed artist names in a clean list, edit inline with autocomplete, and remove entries.
4. As a user, I can optionally open a light-touch “Not correct?” dialog to pick an alternative match without blocking my progress.
5. As a user, I can see which step I’m on and what’s next, without needing to scroll back.
6. As a user, I can fetch and browse my playlists with search, sort, filter, and infinite scrolling.
7. As a user, I can select playlists to compare, see matched artists, and quickly create a new playlist from matches.
8. As a user, I can name the playlist at creation time.
9. As a user, I can accept cookie usage and explicitly consent to connecting Spotify.
10. As a user, if something fails (OCR/Spotify), I see clear guidance and can retry.

## 4. Functional Requirements

1. App Shell and Navigation
   1.1. Provide a global header with product title, session status, and user menu (login/logout).
   1.2. Provide a stepper/progress indicator across the main flow: Upload → Review → Compare → Results → Create.
   1.3. Each step should be accessible via dedicated routes with preserved state: `/upload`, `/review`, `/compare`, `/results`, `/create` (exact URLs can be `/`-rooted where appropriate). Deep links should restore state from session or prompt to re-run prior steps.
   1.4. Mobile-first, responsive layout with clear spacing and minimal ornamentation.

   Acceptance criteria:
   - Header persists across steps.
   - Stepper reflects current step and completed steps.
   - Navigating forward/back never loses user inputs.

2. Authentication and Consent
   2.1. Present a concise consent screen before Spotify auth that explains required scopes and includes an explicit “Connect Spotify” action.
   2.2. Add cookie consent banner with Accept/Dismiss, unobtrusively placed.
   2.3. Gate Spotify API actions (search, playlists, creation) behind auth; OCR can be used pre-auth for try-before-connect.

   Acceptance criteria:
   - Users cannot access Spotify endpoints unless authenticated.
   - Cookie consent persists and can be revoked via settings/menu.

3. OCR Upload & Parsing
   3.1. Support drag-and-drop single image upload and file picker.
   3.2. Show progress indicators and friendly error states.
   3.3. Automatically parse OCR text into artist candidates on success.

   Acceptance criteria:
   - Drag-and-drop area is keyboard accessible.
   - Successful OCR populates the review list without page reload.

4. Artist Review & Correction
   4.1. Display artist candidates in an editable list with inline text fields.
   4.2. Provide autocomplete suggestions after 2+ characters using `/api/spotify/autocomplete-artists`.
   4.3. Provide a subtle “Not correct?” button per mapped artist to open a modal with alternatives.
   4.4. Keep the confidence/correction step optional and easily skippable.

   Acceptance criteria:
   - Editing an entry updates state without losing other edits.
   - Autocomplete dropdown is accessible (ARIA roles, keyboard navigation).
   - Modal selections update the mapped artist and close the dialog.

5. Spotify Artist Mapping
   5.1. On confirm, call `/api/spotify/find-artists` with all reviewed names and display results.
   5.2. Preserve original OCR term alongside matched artist for transparency.

   Acceptance criteria:
   - Results list shows matched name, original term, and allows corrections.

6. Playlist Discovery & Selection
   6.1. Fetch user playlists via `/api/spotify/compare-artists` (playlist fetch only).
   6.2. Display playlists with infinite scroll/pagination.
   6.3. Provide client-side search (by name), sort (name, track count), and filter (owner, min tracks).
   6.4. Allow multi-select of playlists and show selection count.

   Acceptance criteria:
   - Scrolling loads additional pages without blocking interactions.
   - Search/sort/filter update the list with no full refresh.

7. Compare & Results
   7.1. Send `{ festivalArtists, selectedPlaylistIds }` to `/api/spotify/compare-selected-playlists`.
   7.2. Show matched artists with links to Spotify.
   7.3. If no matches, show a clear, encouraging empty state.

   Acceptance criteria:
   - Results render within 2 states: loading, done (with error state if needed).
   - Users can proceed to create a playlist only when there are matches.

8. Create Playlist
   8.1. Provide a required text field for playlist name (default: “Festival Sync Matches”).
   8.2. On create, call `/api/spotify/create-playlist` and show success with link.

   Acceptance criteria:
   - Success shows playlist URL; error shows retry option.

9. Global Styles, Tokens, and Theming
   9.1. Adopt the color system from `Resources/newStyles.css` (OKLCH variables). These variables constitute the design tokens for color.
   9.2. Use Geist (already configured) for typography; define a type scale (e.g., 12/14/16/20/24/32/40) and weights (400/600/700).
   9.3. Establish spacing scale (4/8/12/16/24/32/48), radii (6/10/16), and shadows appropriate for glassmorphism.
   9.4. Provide elevation tokens (e.g., `--elevation-1..3`) and translucency backgrounds for surfaces (cards, modals).

   Acceptance criteria:
   - A style layer or CSS module exposes tokens and is imported globally.
   - Components consume tokens consistently; no hard-coded colors in components.

10. Components (Systemized)
   10.1. Buttons: primary, secondary, destructive, subtle; sizes sm/md/lg; focus states.
   10.2. Inputs: text, file drop zone, checkbox, select; error/help text.
   10.3. Cards and Surfaces: glassy background, blur, elevation.
   10.4. Modal/Dialog with accessible focus trapping.
   10.5. Stepper with current/completed states.
   10.6. Toast/Inline alerts for success/error.
   10.7. Virtualized list for playlists (or paginated list) with skeletons.

   Acceptance criteria:
   - Components meet basic keyboard and screen reader accessibility.

11. Analytics and Metrics (Vercel Analytics)
   11.1. Track step transitions, time-in-step, errors, retries, and completion.
   11.2. Primary product metric: completion time without backtracking or long reverse scrolling.
   11.3. Secondary: step-level drop-off rates, error incidence.

   Acceptance criteria:
   - Events are emitted on step mount/unmount and error boundaries.

12. Resilience
   12.1. Implement client-side retry/backoff for Spotify and OCR calls with user feedback.
   12.2. Preserve intermediate state (in memory) between steps; rehydrate when possible after soft errors.

   Acceptance criteria:
   - Users can retry failed actions without losing prior inputs.

13. Accessibility (Baseline)
   13.1. English only; no specific WCAG target, but ensure keyboard navigation and ARIA for critical widgets (dialogs, lists, steppers, toasts, autocomplete).

   Acceptance criteria:
   - Keyboard tab order is logical; modals trap focus; autocomplete is operable via keyboard.

## 5. Non-Goals (Out of Scope)

- Dark mode at launch.
- Multi-image upload.
- Playlist privacy toggles and cover art selection.
- Offline support.
- Formal test suite at this phase (code should remain testable).
- Advanced rate limiting/caching beyond simple retries.

## 6. Design Considerations

- Follow AirBnB HIG-inspired minimalism with clear hierarchy and whitespace.
- Glassmorphism: translucent surfaces, subtle blur, elevated cards.
- Motion: fast-ease transitions for hover/focus; small spring on critical interactions (<300ms perceived).
- Use `Resources/newStyles.css` as the authoritative color tokens (OKLCH variables) and reference them throughout components.
- Typography: Geist variable font already configured; prefer 400/600/700 weights; avoid overly tight letter-spacing.
- Layout: Centered max-width containers on desktop; single-column on mobile; visible stepper.

## 7. Technical Considerations

- Framework: Next.js App Router (v15), React 19, TypeScript.
- Auth: NextAuth (Spotify), JWT session; retain existing token refresh flow.
- APIs: Keep current route handlers; UX changes only alter request timings and payloads as per existing endpoints.
- State: Client-side state in page-level components; consider splitting steps into route segments with shared provider for state.
- Styling: Import `Resources/newStyles.css` into the global stylesheet and ensure tokens are available app-wide. Avoid inline hard-coded colors.
- Accessibility: Use ARIA roles for autocomplete (`role=listbox`/`option`), dialogs, and steppers.
- Analytics: Add Vercel Analytics events at step boundaries and error handlers.

## 8. Success Metrics

- Primary: Median time to complete the full flow without backtracking decreases compared to baseline POC.
- Secondary: Reduced error/retry incidence; high completion rate; low drop-off between steps.
- UX Quality: Heuristic review passes for clarity, consistency, and minimal cognitive load.

## 9. Open Questions

1. Should we persist step state to sessionStorage to better support refresh/deeplinks?
2. Any soft file size/type guidance we should communicate on the upload step (not enforced yet)?
3. Do we need a “Settings” surface for revoking cookie consent and showing connected account details?
4. Any branding assets (logo/wordmark) to incorporate later?

## 10. Design Tokens (Initial)

Source: `Resources/newStyles.css`. Use these as color tokens and expand with spacing/typography/elevation tokens.

- Colors (examples; full set in CSS):
  - `--primary`, `--secondary`, `--accent`, `--muted`, `--destructive`, `--border`, `--card`
  - Foregrounds: `--foreground`, `--primary-foreground`, etc.
- Typography:
  - Family: Geist (sans) and Geist Mono where needed.
  - Scale: 12, 14, 16, 20, 24, 32, 40.
- Spacing: 4, 8, 12, 16, 24, 32, 48.
- Radii: 6, 10, 16.
- Elevation: `--elevation-1`, `--elevation-2`, `--elevation-3` (implementation detail TBD; shadow + blur).

## 11. Deliverables

- Ship redesigned UI across all steps and auth screens, including systemized components listed in section 10.
- Integrate analytics events for funnel measurement.
- Integrate cookie consent and pre-auth Spotify consent screen.
- Update global styling to consume `Resources/newStyles.css` tokens.


