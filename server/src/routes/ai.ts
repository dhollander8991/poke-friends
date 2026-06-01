import type { Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import type { Card } from '@texas-holdem/shared';
import { config } from '../config.js';
import { sessionStore } from '../store/SessionStore.js';
import type { AuthRequest } from '../auth/middleware.js';

const SYSTEM_PROMPT = `You are a Texas Hold'em poker odds assistant. Analyze the given situation and respond ONLY with a valid JSON object — no markdown fences, no explanation text outside the JSON. Use exactly this shape:
{"winProbability":0.65,"potOdds":"4.5:1","recommendation":"call","reasoning":"Your two pair has strong equity. Pot odds of 4.5:1 justify calling the bet.","confidence":"medium"}

Rules:
- winProbability: 0–1 float (your estimated equity vs remaining opponents)
- potOdds: "X:1" string (pot size divided by call amount)
- recommendation: "fold" | "call" | "raise"
- reasoning: 1–2 sentence explanation referencing the specific cards and situation
- confidence: "low" | "medium" | "high" (how reliable this estimate is given available info)`;

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

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    });

    const block = response.content[0];
    if (block.type !== 'text') throw new Error('Unexpected non-text response');

    const parsed = JSON.parse(block.text.trim()) as AnalyzeResponse;
    parsed.queriesRemaining = sessionStore.aiQueriesRemaining(playerId);

    res.json(parsed);
  } catch (err) {
    console.error('[ai] Analysis failed:', err);
    res.status(500).json({ error: 'AI analysis failed' });
  }
}
