# Garmin Insights Engine

A full-stack web application that analyzes your Garmin health data using AI-powered insights from OpenAI, Anthropic, or Google.

## Features

- **Garmin Connect Integration**: Securely authenticate and fetch your health metrics (sleep, stress, body battery, activities, heart rate)
- **Multi-LLM Support**: Choose between OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, or Google Gemini 1.5 Pro
- **AI-Powered Analysis**: Get personalized insights correlating sleep quality, workout intensity, stress patterns, and recovery
- **Privacy-First**: API keys stored locally in your browser; Garmin credentials never persisted

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Node.js, Express, TypeScript |
| APIs | garmin-connect, OpenAI SDK, Anthropic SDK, Google Generative AI |
| Package Manager | Yarn (with workspaces) |

## Prerequisites

- Node.js 18+
- Yarn 1.22+
- A Garmin Connect account
- API key for at least one LLM provider:
  - [OpenAI API Key](https://platform.openai.com/api-keys)
  - [Anthropic API Key](https://console.anthropic.com/)
  - [Google AI API Key](https://makersuite.google.com/app/apikey)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd PulseLogic

# Install all dependencies (uses yarn workspaces)
yarn
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp server/.env.example server/.env

# Edit if needed (defaults work for development)
```

The `.env` file supports these variables:

```env
PORT=3001                      # Server port
NODE_ENV=development           # Environment mode
RATE_LIMIT_WINDOW_MS=60000     # Rate limit window (ms)
RATE_LIMIT_MAX_REQUESTS=100    # Max requests per window
```

### 3. Run the Application

```bash
# Start both frontend and backend in development mode
yarn dev
```

This starts:
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

### 4. Use the App

1. **Configure**: Enter your Garmin Connect email/password and at least one LLM API key
2. **Fetch Data**: Select the date range (7/14/30 days) and fetch your health metrics
3. **Analyze**: Choose an LLM provider and generate AI-powered insights

## Available Scripts

### Root Level

| Command | Description |
|---------|-------------|
| `yarn dev` | Start both server and client in dev mode |
| `yarn dev:server` | Start only the backend server |
| `yarn dev:client` | Start only the frontend client |
| `yarn build` | Build both server and client for production |
| `yarn build:server` | Build only the server |
| `yarn build:client` | Build only the client |
| `yarn typecheck` | Type-check the server |

### Using Workspaces

You can run scripts in specific workspaces:

```bash
# Run a script in the server workspace
yarn workspace garmin-insights-server <script>

# Run a script in the client workspace
yarn workspace client <script>
```

### Server Scripts

| Command | Description |
|---------|-------------|
| `yarn workspace garmin-insights-server dev` | Start server with hot reload |
| `yarn workspace garmin-insights-server build` | Compile TypeScript |
| `yarn workspace garmin-insights-server start` | Run production server |
| `yarn workspace garmin-insights-server typecheck` | Type-check only |

### Client Scripts

| Command | Description |
|---------|-------------|
| `yarn workspace client dev` | Start Vite dev server |
| `yarn workspace client build` | Build for production |
| `yarn workspace client preview` | Preview production build |

## Project Structure

```
PulseLogic/
├── package.json                 # Monorepo with yarn workspaces
├── yarn.lock                    # Yarn lockfile
├── server/                      # Express Backend
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── routes/
│   │   │   ├── garmin.routes.ts    # Garmin auth & data endpoints
│   │   │   └── analyze.routes.ts   # LLM analysis endpoint
│   │   ├── services/
│   │   │   ├── garmin.service.ts   # Garmin Connect integration
│   │   │   └── llm/
│   │   │       ├── provider.interface.ts  # LLM abstraction layer
│   │   │       ├── openai.provider.ts
│   │   │       ├── anthropic.provider.ts
│   │   │       └── google.provider.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts     # Global error handling
│   │   │   └── validate.ts         # Zod request validation
│   │   └── types/index.ts          # Shared TypeScript types
│   ├── .env.example
│   └── tsconfig.json
│
└── client/                      # React Frontend
    ├── src/
    │   ├── App.tsx             # Main wizard component
    │   ├── pages/
    │   │   ├── ConfigStep.tsx      # Step 1: Credentials
    │   │   ├── DataStep.tsx        # Step 2: Fetch data
    │   │   └── AnalysisStep.tsx    # Step 3: AI analysis
    │   ├── components/         # Reusable UI components
    │   ├── hooks/              # React Query hooks
    │   ├── services/api.ts     # API client
    │   └── utils/storage.ts    # Local storage utilities
    ├── tailwind.config.js
    └── vite.config.ts
```

## API Reference

### Garmin Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/garmin/login` | Authenticate with Garmin | `{ username, password }` |
| POST | `/api/garmin/logout` | Clear session | - |
| GET | `/api/garmin/status` | Check auth status | - |
| POST | `/api/garmin/data` | Fetch health metrics | `{ days: 7 }` |

### Analysis Endpoint

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/api/analyze` | Generate AI analysis | `{ provider, apiKey, healthData, customPrompt? }` |

## Security Considerations

- **Garmin Credentials**: Sent to backend for authentication but never stored; session managed server-side
- **LLM API Keys**: Stored in browser localStorage with XOR obfuscation (not encryption); sent per-request
- **Rate Limiting**: 100 requests per minute per IP by default
- **CORS**: Restricted to localhost in development

For production deployment, consider:
- Using Redis for session storage
- Implementing proper encryption for API keys
- Adding authentication/authorization layer
- Using HTTPS and secure cookie settings

## Troubleshooting

### "Garmin login failed"
- Verify your Garmin Connect credentials are correct
- Ensure you don't have 2FA enabled (not supported by unofficial API)
- Try logging into Garmin Connect website first to unlock your account

### "No data available"
- Some metrics require a Garmin device that tracks them
- Body Battery and Stress require compatible devices (Fenix, Forerunner, Venu, etc.)
- Sleep data requires wearing the device overnight

### Build errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules
yarn
```

## License

MIT
