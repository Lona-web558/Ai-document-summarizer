# AI Document Summarizer

A full-stack web app that turns long documents into short, readable summaries. Paste text or upload a file, pick a length and format, and get a summary in seconds.

Built with **HTML5, CSS3, Bootstrap 5, JavaScript, Node.js and Express.js**.

---

## Features

- **Two input modes:** paste text directly, or upload a PDF, TXT or MD file (drag and drop supported, max 10 MB).
- **Adjustable output:** choose Short (3), Medium (6) or Long (10) sentences or bullets, as a paragraph or bullet points.
- **Two summarization engines:**
  - **AI mode:** uses the Anthropic Messages API when an API key is configured.
  - **Extractive mode:** a built-in, offline fallback that scores sentences by keyword frequency. No key or internet access needed.
- **Summary stats:** shows original word count, summary word count and the percentage reduction.
- **Copy to clipboard** in one click.
- **Responsive and accessible:** works on phones, has visible keyboard focus, labelled form fields, and respects reduced-motion settings.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Markup | HTML5 |
| Styling | CSS3 + Bootstrap 5.3 (CDN) |
| Client logic | Vanilla JavaScript (Fetch API, FormData) |
| Server | Node.js 18+ and Express 4 |
| File uploads | Multer (in-memory storage) |
| PDF parsing | pdf-parse |
| Config | dotenv |

---

## Project structure

```
doc-summarizer/
├── server.js          # Express server, file parsing, summarization logic, API route
├── package.json       # Dependencies and npm scripts
├── .env.example       # Environment variable template
├── README.md
└── public/            # Static front end served by Express
    ├── index.html     # Page markup (Bootstrap layout)
    ├── style.css      # Custom styles on top of Bootstrap
    └── app.js         # UI behavior and API calls
```

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) version 18 or newer (the server uses the built-in `fetch`)
- npm (comes with Node.js)

### Installation

```bash
# 1. Go into the project folder
cd doc-summarizer

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env        # Windows: copy .env.example .env

# 4. Start the server
npm start
```

Open **http://localhost:3000** in your browser.

For auto-restart while developing (Node 18.11+):

```bash
npm run dev
```

---

## Configuration

Settings live in a `.env` file in the project root.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | No | none | Enables AI summaries. If empty, the extractive fallback is used. |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-5-5` | Model used for AI summaries. |
| `PORT` | No | `3000` | Port the server listens on. |

Keep your API key private. Never commit `.env` to Git (add it to `.gitignore`) and never put the key in front-end code. This project keeps it on the server only.

---

## How it works

1. **Input:** the browser sends a `multipart/form-data` request to `POST /api/summarize` containing either `text` or a `file`, plus `length` and `style`.
2. **Extraction:** for files, the server reads the content. PDFs go through `pdf-parse`; TXT and MD are read as UTF-8.
3. **Validation:** the text is trimmed, capped at 120,000 characters, and must contain at least 30 words.
4. **Summarization:**
   - If `ANTHROPIC_API_KEY` is set, the text is sent to the Anthropic Messages API with instructions to summarize faithfully and use only the document's content.
   - If the key is missing, or the AI call fails, the server falls back to the extractive summarizer.
5. **Extractive algorithm:** the text is split into sentences, common stop words are ignored, remaining words are counted, and each sentence is scored by the frequency of its words (normalized for length). The top-scoring sentences are returned in their original order.
6. **Response:** the server returns the summary, the engine used, and word counts. The front end renders it as a paragraph or a bullet list.

---

## API reference

### `POST /api/summarize`

**Content type:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Document text. Ignored if `file` is sent. |
| `file` | file | PDF, TXT or MD, up to 10 MB. |
| `length` | string | `short`, `medium` (default) or `long`. |
| `style` | string | `paragraph` (default) or `bullets`. |

**Success response (200):**

```json
{
  "summary": "The report finds that ...",
  "mode": "ai",
  "originalWords": 2140,
  "summaryWords": 118
}
```

`mode` is `"ai"` or `"extractive"`.

**Error response (400):**

```json
{ "error": "Add at least 30 words to summarize." }
```

**Example with curl:**

```bash
curl -X POST http://localhost:3000/api/summarize \
  -F "file=@report.pdf" \
  -F "length=short" \
  -F "style=bullets"
```

---

## Deployment

The app is a standard Node web service, so it runs on any Node host (Render, Railway, Fly.io, a VPS, and so on). Netlify and Neocities host static files only and cannot run the Express server.

General steps:

1. Push the project to a Git repository.
2. Create a new **Web Service** on your host.
3. Set the build command to `npm install` and the start command to `npm start`.
4. Add `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`) as environment variables in the host's dashboard.
5. Deploy. The server reads `PORT` from the environment automatically.

---

## Troubleshooting

| Problem | Likely cause and fix |
|---------|----------------------|
| `fetch is not defined` | Node is older than 18. Upgrade Node. |
| Summary badge says "Extractive" | No API key set, or the AI request failed. Check `.env` and the server console. |
| "Unsupported file type" | Only PDF, TXT and MD are accepted. |
| PDF returns "Add at least 30 words" | The PDF is probably a scanned image with no text layer. OCR is not included. |
| `EADDRINUSE` error | Port 3000 is taken. Set a different `PORT` in `.env`. |
| Upload fails for large files | Files over 10 MB are rejected. Raise the `fileSize` limit in `server.js` if needed. |

---

## Limitations

- Scanned PDFs and images are not supported (no OCR).
- Very long documents are truncated to the first 120,000 characters.
- The extractive fallback selects existing sentences. It does not rewrite, so it is less fluent than the AI mode.
- Word (.docx) files are not supported yet.

---

## Ideas for next steps

- Word (.docx) support using `mammoth`
- URL input that fetches and summarizes a web page
- Chunked summarization for very long documents
- Summary history with local storage or a database
- Rate limiting and basic authentication for public deployments
- Download summary as TXT or PDF

---

## License

MIT. Free to use, modify and distribute.
