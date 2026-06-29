import express from 'express';
import { runResearchAgent } from '../agent/graph.js';

const router = express.Router();

/**
 * POST /api/research
 * Body: { company: string }
 * Response: Server-Sent Events stream
 *
 * Event format:
 *   data: { type: "step", message: "..." }
 *   data: { type: "complete", result: { ... } }
 *   data: { type: "error", message: "..." }
 */
router.post('/research', async (req, res) => {
  const { company } = req.body;

  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'Company name or ticker is required.' });
  }

  const companyName = company.trim();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  [API] Research request: "${companyName}"`);
  console.log(`${'═'.repeat(60)}\n`);

  // ── Set SSE Headers ──────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Helper to write SSE events
  const sendEvent = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      // Flush if the method exists (some environments)
      if (typeof res.flush === 'function') res.flush();
    } catch (err) {
      console.error('[SSE] Write error:', err.message);
    }
  };

  // Keep-alive ping every 15 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (_) {}
  }, 15000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    console.log(`[SSE] Client disconnected for "${companyName}"`);
  });

  try {
    // Run the agent with SSE step callback
    const result = await runResearchAgent(companyName, (step) => {
      sendEvent(step);
    });

    // Send the final complete result
    sendEvent({ type: 'complete', result });
    console.log(`\n[API] Success: ${result.verdict} (${result.confidence}/10) for "${result.company}"\n`);
  } catch (err) {
    console.error('🔴 RESEARCH ROUTE ERROR:', err.message);
    sendEvent({
      type: 'error',
      message: `Research failed: ${err.message}. Check server logs for details.`
    });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
});

export default router;
