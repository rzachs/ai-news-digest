# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Running the digest

```
node digest.js
```

Requires a `.env` file in the project root with:
```
ANTHROPIC_API_KEY=your-key-here
```

## Architecture

The entire pipeline is a single script (`digest.js`) with three stages:

1. **Fetch** — `fetchArticles()` pulls the top 3 items from each RSS feed in `FEEDS` (8-second timeout per feed; failures are skipped, not fatal).
2. **Summarize** — `summarizeWithClaude()` sends all articles to `claude-sonnet-4-6` using the system prompt at `prompts/system.md`.
3. **Output** — `saveAsHTML()` converts the markdown response to HTML via `marked` and writes a dated file to `briefs/digest-YYYY-MM-DD.html`.

The system prompt in `prompts/system.md` defines the full briefing format and rating logic (HIGH/MEDIUM/LOW). Changing how articles are prioritized, structured, or described means editing that file, not `digest.js`.

## Output

Generated HTML digests are saved to `briefs/`. The file is self-contained (inline CSS, no external assets).

## Dependencies

- `@anthropic-ai/sdk` — Claude API client
- `rss-parser` — RSS/Atom feed fetching and parsing
- `marked` — Markdown-to-HTML conversion
- `dotenv` — loads `ANTHROPIC_API_KEY` from `.env`

## Modifying the prompt

The system prompt lives in `prompts/system.md`. This is the only file to edit when changing:
- How articles are rated (HIGH/MEDIUM/LOW criteria)
- The output format and sections
- The reader profile and personality
- What "Try This" triggers on

Never hardcode prompt text in `digest.js`.
