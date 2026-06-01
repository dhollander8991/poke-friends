import type { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import type { Card } from '@texas-holdem/shared';
import { config } from '../config.js';
import { sessionStore } from '../store/SessionStore.js';
import type { AuthRequest } from '../auth/middleware.js';

const SYSTEM_PROMPT = `You are a Texas Hold'em poker odds assistant. Analyze the given situation and return your analysis.
- winProbability: 0–1 float (your estimated equity vs remaining opponents)
- potOdds: "X:1" string (pot size divided by call amount)
- recommendation: fold | call | raise
- reasoning: 1–2 sentence explanation referencing the specific cards and situation
- confidence: low | medium | high (how reliable this estimate is given available info)`;

// Structured-output schema — the model is constrained to this shape, so the
// response is guaranteed-parseable JSON (no markdown-fence stripping, no
// JSON.parse on free-form text). additionalProperties:false is required.
const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    winProbability: { type: 'number' },
    potOdds: { type: 'string' },
    recommendation: { type: 'string', enum: ['fold', 'call', 'raise'] },
    reasoning: { type: 'string' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
  },
  required: ['winProbability', 'potOdds', 'recommendation', 'reasoning', 'confidence'],
  additionalProperties: false,
} as const;

function cardLabel(c: Card) {
  const suitSym: Record<string, string> = { hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠' };
  return `${c.rank}${suitSym[c.suit]}`;
}

export interface AnalyzeRequest {
  holeCards:      Card[];
  communityCards: Card[];
  activePlayers:  number;
  pot:            number;
  currentBet:     number;
}

export interface AnalyzeResponse {
  winProbability: number;
  potOdds:        string;
  recommendation: 'fold' | 'call' | 'raise';
  reasoning:      string;
  confidence:     'low' | 'medium' | 'high';
  queriesRemaining: number;
}

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
  return _anthropic;
}

export async function handleAiAnalyze(req: Request, res: Response) {
  const { player } = req as AuthRequest;
  const { playerId } = player;

  const gate = sessionStore.canQueryAi(playerId);
  if (!gate.allowed) {
    res.status(429).json({ error: gate.reason });
    return;
  }

  const { holeCards, communityCards, activePlayers, pot, currentBet } =
    req.body as Partial<AnalyzeRequest>;

  if (!holeCards?.length || activePlayers == null || pot == null || currentBet == null) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const holeStr    = holeCards.map(cardLabel).join(' ');
  const boardStr   = communityCards?.length ? communityCards.map(cardLabel).join(' ') : '(none — preflop)';
  const userMsg    = `My hole cards: ${holeStr}\nBoard: ${boardStr}\nActive opponents: ${activePlayers - 1}\nPot: $${pot}\nAmount to call: $${currentBet}`;

  try {
    sessionStore.recordAiQuery(playerId);

    const message = await getAnthropic().messages.parse({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
      output_config: { format: jsonSchemaOutputFormat(ANALYSIS_SCHEMA) },
    });

    const parsed = message.parsed_output;
    if (!parsed) throw new Error('Model returned no parseable analysis');

    res.json({ ...parsed, queriesRemaining: sessionStore.aiQueriesRemaining(playerId) } satisfies AnalyzeResponse);
  } catch (err) {
    // Surface the real cause server-side; keep the client message generic.
    const detail = err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : String(err);
    console.error('[ai] Analysis failed:', detail);
    res.status(500).json({ error: 'AI analysis failed' });
  }
}
