# AI Usage Log — Investment Research Agent

This document captures the AI-assisted development sessions using Antigravity (powered by Google Gemini 1.5 Flash) to build this project.

---

## How I Used AI in This Project

I used Antigravity as my primary coding assistant throughout the entire build. My workflow:
1. I described what I needed at an architectural level
2. Antigravity generated the implementation
3. I reviewed, tested, and requested targeted fixes
4. I made design decisions and Antigravity executed them

---

## Session Log

### Session 1 — Project Scaffold & Dependency Setup
**My Prompt:** Set up a React + Node.js project for an AI investment research agent using LangChain.js and LangGraph.js. Use Gemini 1.5 Flash as the LLM via the OpenAI-compatible endpoint.
**What Antigravity Built:** Project scaffold, package.json files, .env template, directory structure
**My Decision:** Accepted the structure. Changed the backend port from 3001 to 3002 to avoid conflict with secondary project.

### Session 2 — LangChain Tools Implementation
**My Prompt:** Build 4 research tools — web_search (Tavily), get_financial_summary (Alpha Vantage + Finnhub), get_news_sentiment, and analyze_competitors. Export as array.
**What Antigravity Built:** Full tools.js with Zod schemas and LangChain tool() wrappers
**My Decision:** Added timeout handling after observing free-tier APIs occasionally hanging.

### Session 3 — LangGraph ReAct Agent
**My Prompt:** Create a LangGraph ReAct agent using createReactAgent. Stream each step over SSE. Parse final JSON output.
**What Antigravity Built:** graph.js with streaming loop and message parsing
**My Decision:** Added extractJSON() helper after discovering Gemini wraps output in markdown code fences.

### Session 4 — Express API + SSE Endpoint
**My Prompt:** Build Express server with a POST /api/research endpoint that streams agent steps via SSE.
**What Antigravity Built:** Full index.js with CORS, SSE headers, and error handling
**My Decision:** Fixed the --watch flag infinite restart loop by switching to plain node index.js.

### Session 5 — React Frontend
**My Prompt:** Build React frontend with SearchBar, ResearchProgress (live SSE steps), and InvestmentVerdict (verdict card with all sections).
**What Antigravity Built:** Full component tree with TailwindCSS styling
**My Decision:** Enhanced verdict card with confidence meter, bull/bear split layout, and responsive grid.

### Session 6 — Gemini Migration & Debugging
**My Prompt:** Migrate from Anthropic Claude to Google Gemini via OpenAI-compatible endpoint. Fix JSON parsing for Gemini's chattier output style.
**What Antigravity Built:** Updated .env config, model initialization, extractJSON() function
**My Decision:** Added auto-detection of AIzaSy prefix for Gemini keys to prevent misconfiguration.

---

## Key Architectural Decisions I Made (Not AI)

- Chose ReAct over fixed pipeline for the primary project to handle diverse company types
- Decided to keep both architectural approaches in the workspace to demonstrate trade-off awareness
- Selected Tavily over raw search scraping for structured web data
- Chose SSE over WebSockets because agent communication is one-directional

---

## What I Learned

Using Antigravity significantly accelerated development — approximately 80% of boilerplate and integration code was AI-generated. However, debugging Gemini's non-deterministic output format, fixing tool timeout handling, and making UI/UX decisions required human judgment at every step. The AI is a force multiplier, not a replacement for understanding the system.
