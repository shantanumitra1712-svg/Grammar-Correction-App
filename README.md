# GrammarLens - AI-Powered Grammar & Sentence Correction Engine

GrammarLens is a full-stack MERN application that identifies grammar, spelling, and sentence-structure errors in user text, explains the linguistic rationale, and applies instant fixes with interactive inline highlighting and visual diffs.

---

## Architecture Diagram

```mermaid
flowchart TD
    User([User]) <--> Client[React + Vite Frontend<br/>(Editor, HighlightedText, Popover, DiffView, Dashboard)]
    
    subgraph Express Backend
        API[Express Router: /api/check, /api/history, /api/stats]
        Limiter[Rate Limiter: express-rate-limit]
        Service[Checker Service: Text Chunker, Code Masker]
        ZodVal[Zod Validation & Auto-Retry]
        OffsetEngine[Exact Offset & Substring Engine]
    end

    subgraph Data & AI
        LLM[LLM Engine: Gemini 2.5 / OpenAI Provider]
        Mongo[(MongoDB / In-Memory Store)]
    end

    Client -->|POST /api/check| Limiter
    Limiter --> API
    API --> Service
    Service -->|Chunk & Prompt| LLM
    LLM -->|Structured JSON| ZodVal
    ZodVal -->|Verified Snippets| OffsetEngine
    OffsetEngine -->|Calculated Ranges| API
    API -->|Save Check Record| Mongo
    API -->|Response with Issues & Diff| Client
```

---

## API Contract

### 1. `POST /api/check`
Analyzes text for grammar, spelling, structure, and style issues.

**Request Body:**
```json
{
  "text": "Their are several reason why we should of delayed.",
  "tone": "general",      // "general" | "formal" | "casual" | "academic"
  "devMode": false,       // true: skips markdown code blocks and backticks
  "sessionId": "anon_xyz" // Optional anonymous session identifier
}
```

**Response (`200 OK`):**
```json
{
  "id": "674a9f...",
  "sessionId": "anon_xyz",
  "originalText": "Their are several reason why we should of delayed.",
  "tone": "general",
  "devMode": false,
  "issues": [
    {
      "id": "iss_a1b2c3d4",
      "type": "grammar",
      "original": "Their",
      "suggestion": "There",
      "explanation": "Use 'there' to indicate existence or introduce a clause, not possessive 'their'.",
      "startIndex": 0,
      "endIndex": 5
    },
    {
      "id": "iss_e5f6g7h8",
      "type": "grammar",
      "original": "reason",
      "suggestion": "reasons",
      "explanation": "Plural quantifier 'several' requires the plural noun 'reasons'.",
      "startIndex": 18,
      "endIndex": 24
    },
    {
      "id": "iss_i9j0k1l2",
      "type": "grammar",
      "original": "should of",
      "suggestion": "should have",
      "explanation": "The modal auxiliary verb is 'should have' (or 'should've'), never 'should of'.",
      "startIndex": 32,
      "endIndex": 41
    }
  ],
  "issuesCount": 3,
  "correctedText": "There are several reasons why we should have delayed.",
  "stats": {
    "wordCount": 9,
    "charCount": 51
  },
  "timestamp": "2026-10-01T07:30:00.000Z"
}
```

### 2. `POST /api/correct`
Recomputes the corrected text for any specific subset of accepted issues.

**Request Body:**
```json
{
  "originalText": "Their are several reason...",
  "issues": [ ... ]
}
```

### 3. `GET /api/history`
Returns past checks for the current session.
`GET /api/history?sessionId=anon_xyz&limit=20`

### 4. `GET /api/stats`
Returns aggregated mistake analytics (breakdown by type, total checks, top repetitive errors).
`GET /api/stats?sessionId=anon_xyz`

---

## Core Features (MVP)
1. **Interactive Text Editor**: Word/character counters, quick-start sample presets, keyboard shortcut (`Cmd/Ctrl + Enter`) to check.
2. **Robust Offset Engine**: The LLM outputs the exact original snippet; the server computes `startIndex` and `endIndex` via substring searches, discarding any hallucinatory offsets or unfound snippets.
3. **Color-Coded Inline Highlighting**:
   - 🔴 **Grammar**: Subject-verb agreement, verb tenses, prepositions.
   - 🟡 **Spelling**: Typos, incorrect capitalization.
   - 🟣 **Sentence Structure**: Run-ons, fragments, dangling clauses.
   - 🔵 **Style**: Redundancies, passive voice, wordiness.
4. **Accessible Popover**: Click any highlight to view the diff, reason, and one-key Accept (`Enter`) / Ignore (`Esc`).
5. **Accept All & Visual Diff View**:
   - Visual word-level diff (green additions, red deletions).
   - Clean preview with 1-click clipboard copy.
6. **MongoDB Persistence with In-Memory Fallback**:
   - Connects to MongoDB when `MONGO_URI` is provided.
   - Automatically falls back to high-performance session store when running offline or without database configuration.

## Stretch Features
- **Tone Selector**: Switch between Standard, Formal, Casual, and Academic tone constraints.
- **Developer Mode**: Skips fenced code blocks (` ```...``` `) and inline backticks (` `...` `) so programming variables and functions in READMEs and commit messages are never falsely flagged.
- **"My Mistakes" Dashboard**: Visual analytics showing your historical distribution of errors and most frequent mistake patterns over time.

---

## Setup & Running Locally

### 1. Prerequisites
- Node.js >= 18
- (Optional) MongoDB instance or Atlas connection string

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
GEMINI_API_KEY="your-gemini-api-key"
MONGO_URI="mongodb://localhost:27017/grammarlens"
PORT=3000
```

### 3. Install & Start
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## Testing with cURL

```bash
# Test Grammar Check
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Their are several reason why we should of delayed the release.",
    "tone": "general",
    "devMode": false,
    "sessionId": "test_session_1"
  }'

# Test Stats Endpoint
curl -X GET "http://localhost:3000/api/stats?sessionId=test_session_1"
```

---

## Demo

![GrammarLens Demo Placeholder](https://placehold.co/800x450/4f46e5/ffffff?text=GrammarLens+Live+Interactive+Demo)
