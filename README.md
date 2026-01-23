# Global Threat & Event Intelligence Map

A real-time global situational awareness platform that plots security events, geopolitical developments, and threat indicators on an interactive map. Think of it as an OSINT (Open Source Intelligence) command center.

![](https://4ealzrotsszllxtz.public.blob.vercel-storage.com/bang!)

![](https://4ealzrotsszllxtz.public.blob.vercel-storage.com/firstphotoshoot)

## Features

### Core Features

- **Real-Time Event Mapping** - Plot breaking news events (conflicts, protests, natural disasters) on a world map with color-coded threat levels
- **Interactive Mapbox Map** - Dark-themed map with clustering, heatmap visualization, and smooth navigation
- **Event Feed** - Real-time filterable feed of global events with category and threat level filters
- **Intel Dossiers** - Build intelligence dossiers on any actor with deep research reports, CSV data exports, and PowerPoint briefings
- **Alert System** - Configure keyword and region-based alerts with real-time notifications

### Country Intelligence

Click on any country to view detailed conflict intelligence:

- **Historical Conflicts** - Wars, military engagements, and conflicts throughout history with dates, opposing parties, and outcomes
- **Current Conflicts** - Ongoing wars, military tensions, border disputes, civil unrest, terrorism threats, and geopolitical tensions
- **Tabbed Interface** - Current conflicts (red-themed) and Historical conflicts (blue-themed) displayed in separate tabs
- **Country Highlighting** - Selected country fills with red color and blinks while loading data
- **AI-Powered Analysis** - Conflict data synthesized using Valyu Answer API with cited sources

### Military Bases Layer

Visualize global military presence:

- **US Military Bases** - Displayed as green markers (30+ bases worldwide)
- **NATO Installations** - Displayed as blue markers
- **Base Details** - Click any base to see its name, type, and host country
- **Automatic Loading** - Military base data loads when the map initializes
- **Coverage** - Includes bases in Europe, Asia-Pacific, Middle East, Africa, and the Americas

### Map Visualization

- **Auto-Pan Mode** - Play/pause button to automatically pan across the globe
- **Event Clustering** - Group nearby events for cleaner visualization at lower zoom levels
- **Heatmap View** - Toggle heatmap to visualize event density
- **Entity Locations** - When researching entities, their known locations appear as purple markers on the map

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Map**: Mapbox GL JS + react-map-gl
- **UI**: Tailwind CSS v4 + custom components
- **Intelligence API**: valyu-js (search, answer, deep research)
- **Schema Validation**: zod
- **State Management**: Zustand
- **Markdown**: react-markdown + remark-gfm

## Getting Started

### Prerequisites

- Node.js 18+
- Mapbox account and API token
- Valyu API key

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
VALYU_API_KEY=your_valyu_api_key_here
NEXT_PUBLIC_APP_MODE=self-hosted

# Optional: Enable AI-powered location extraction for better accuracy
OPENAI_API_KEY=your_openai_api_key_here
```

3. Get your API keys:
   - **Mapbox**: [Get a token](https://account.mapbox.com/access-tokens/)
   - **Valyu**: [Get an API key](https://valyu.ai)
   - **OpenAI** (optional): [Get an API key](https://platform.openai.com/api-keys) - enables AI-powered location extraction

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
globalthreatmap/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main dashboard
│   ├── globals.css             # Global styles
│   └── api/                    # API routes
│       ├── events/             # Event fetching via Valyu
│       ├── entities/           # Entity research
│       ├── reports/            # Deep research reports
│       ├── countries/
│       │   └── conflicts/      # Country conflict intelligence
│       └── military-bases/     # Military base data
├── components/
│   ├── map/                    # Map components
│   │   ├── threat-map.tsx      # Main map component
│   │   ├── timeline-scrubber.tsx # Auto-pan controls
│   │   └── country-conflicts-modal.tsx # Conflict details modal
│   ├── feed/                   # Event feed components
│   ├── search/                 # Entity search components
│   ├── alerts/                 # Alert management
│   └── ui/                     # Base UI components
│       └── markdown.tsx        # Markdown renderer
├── lib/
│   ├── valyu.ts                # Valyu client & API functions
│   ├── geocoding.ts            # Location extraction
│   └── event-classifier.ts     # Event classification
├── stores/
│   └── map-store.ts            # Map state (viewport, layers, bases)
├── types/                      # TypeScript types
└── hooks/                      # React hooks
```

## Usage

### Interactive Map

- **Click on a Country** - Opens the Country Conflicts Modal showing historical and current conflicts
- **Click on an Event Marker** - Shows event details popup
- **Click on a Military Base** - Shows base name, type (US/NATO), and country
- **Zoom/Pan** - Navigate the map or use auto-pan mode

### Event Feed

The event feed displays real-time global events. You can:
- Filter by threat level (Critical, High, Medium, Low, Info)
- Filter by category (Conflict, Protest, Disaster, Diplomatic, etc.)
- Search events by keyword
- Click on events to fly to their location on the map

### Auto-Pan Mode

The play/pause button in the bottom-left corner toggles automatic map panning:
- **Play** - Map continuously pans eastward across the globe
- **Pause** - Stops the auto-pan animation

### Intel Dossiers (Deep Research)

Build comprehensive intelligence dossiers on any actor using Valyu's Deep Research API. Enter any entity - nations, militias, PMCs, cartels, political figures - and receive:

- **~50 Page Intelligence Report** - Extensively sourced analysis covering background, organizational structure, key figures, geographic presence, recent activities, threat assessment, and timeline of events
- **CSV Data Export** - Structured data with locations, coordinates, key figures, related organizations, significant events with dates, and source URLs - ready for further analysis
- **PowerPoint Briefing** - 8-slide executive intelligence briefing for presentations
- **PDF Report** - Downloadable full report

Reports take 5-10 minutes to generate but are extremely detailed and comprehensive, pulling from hundreds of sources across the web, academic papers, and proprietary databases. Perfect for OSINT analysts, researchers, and intelligence professionals who need exportable deliverables for briefings and further analysis.

### Country Conflicts

Click any country on the map to view:
- **Current Tab** (Red) - Active conflicts, military tensions, and ongoing security threats
- **Historical Tab** (Blue) - Past wars and military engagements with dates and outcomes
- **Sources** - Cited references for all conflict information (Wikipedia excluded)

### Alerts

Create alert rules based on:
- Keywords (e.g., "nuclear", "sanctions")
- Threat levels
- Geographic regions (coming soon)

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/events` | GET | Fetch global events from Valyu |
| `/api/events` | POST | Fetch events with custom queries |
| `/api/entities` | GET/POST | Research entities and get locations |
| `/api/deepresearch` | POST | Create async deep research task with deliverables |
| `/api/deepresearch/[taskId]` | GET | Poll deep research task status and results |
| `/api/reports` | POST | Generate deep research reports |
| `/api/countries/conflicts` | GET | Get historical and current conflicts for a country |
| `/api/military-bases` | GET | Get US and NATO military base locations (1hr cache) |

## Valyu Integration

This app uses [Valyu](https://valyu.ai) for intelligence data:

- **Search API** - Finding global events and news
- **Answer API** - Synthesizing conflict intelligence and military base data
- **Deep Research** - Comprehensive entity analysis

Wikipedia is excluded from search results.

## Authentication

Global Threat Map supports two app modes controlled by the `NEXT_PUBLIC_APP_MODE` environment variable.

### App Modes

| Mode | Description |
|------|-------------|
| `self-hosted` | Default mode. No authentication required. All features are freely accessible. |
| `valyu` | OAuth mode. Users sign in with Valyu to access additional features. |

### Self-Hosted Mode (Default)

In self-hosted mode, the app runs entirely with your own Valyu API key:

```env
NEXT_PUBLIC_APP_MODE=self-hosted
VALYU_API_KEY=your_valyu_api_key_here
```

- No sign-in panel is displayed
- All features are available to all users
- API usage is billed to your Valyu account

### Valyu OAuth Mode

In valyu mode, users authenticate with their Valyu accounts:

```env
NEXT_PUBLIC_APP_MODE=valyu

# OAuth Configuration (contact contact@valyu.ai for credentials)
NEXT_PUBLIC_VALYU_AUTH_URL=https://auth.valyu.ai
NEXT_PUBLIC_VALYU_CLIENT_ID=your-client-id
VALYU_CLIENT_SECRET=your-client-secret
VALYU_APP_URL=https://platform.valyu.ai
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/valyu/callback
```

### Feature Gating (Valyu Mode)

When running in valyu mode, certain features require authentication:

| Feature | Unauthenticated | Authenticated |
|---------|-----------------|---------------|
| View map & events | ✅ Free | ✅ Free |
| Event feed | ✅ Free | ✅ Free |
| Country conflicts | ✅ 2 free lookups | ✅ Unlimited |
| Entity search | ❌ Blocked | ✅ Unlimited |
| Military bases | ✅ Free | ✅ Free |

After users exhaust their free usage, a sign-in modal prompts them to authenticate.

### OAuth Flow

The authentication uses OAuth 2.0 with PKCE (Proof Key for Code Exchange):

1. User clicks "Sign in with Valyu"
2. App generates PKCE code verifier and challenge
3. User is redirected to Valyu's authorization page
4. After authentication, Valyu redirects back to `/auth/valyu/callback`
5. App exchanges authorization code for access token
6. User info is stored in localStorage

### Project Structure (Auth)

```
globalthreatmap/
├── app/
│   ├── api/oauth/token/       # Token exchange endpoint
│   └── auth/valyu/callback/   # OAuth callback page
├── components/auth/
│   ├── sign-in-panel.tsx      # Floating auth panel
│   └── sign-in-modal.tsx      # Sign-in dialog
├── stores/
│   └── auth-store.ts          # Auth state management
└── lib/
    └── oauth.ts               # PKCE utilities
```

## License

MIT
