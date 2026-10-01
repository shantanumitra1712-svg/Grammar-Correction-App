import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import crypto from 'crypto';

// Zod schema for validation
export const IssueSchema = z.object({
  type: z.enum(['grammar', 'spelling', 'structure', 'style']),
  original: z.string().min(1, 'Original snippet cannot be empty'),
  suggestion: z.string(),
  explanation: z.string().min(1, 'Explanation cannot be empty')
});

export const IssuesListSchema = z.object({
  issues: z.array(IssueSchema)
});

// Helper to count words
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Developer mode: find ranges of code blocks and inline code to skip
export function extractCodeRanges(text) {
  const ranges = [];
  // Fenced code blocks ```...```
  const fencedRegex = /```[\s\S]*?```/g;
  let match;
  while ((match = fencedRegex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }

  // Inline code `...`
  const inlineRegex = /`[^`\n]+`/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    // Only add if not already within a fenced code block
    const isInsideFenced = ranges.some(r => match.index >= r.start && match.index + match[0].length <= r.end);
    if (!isInsideFenced) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  return ranges;
}

// Check if a range [start, end] overlaps with any code ranges
function overlapsWithCodeRanges(start, end, codeRanges) {
  for (const range of codeRanges) {
    if (Math.max(start, range.start) < Math.min(end, range.end)) {
      return true;
    }
  }
  return false;
}

// Split text into chunks of ~500 words at sentence boundaries
export function chunkText(text, targetWordLimit = 500) {
  const words = text.split(/\s+/);
  if (words.length <= targetWordLimit) {
    return [{ text, startOffset: 0 }];
  }

  // Split by sentence boundaries while tracking offsets
  const sentenceRegex = /[^.!?\n]+(?:[.!?]+|\n+|$)/g;
  const chunks = [];
  let currentChunk = '';
  let currentStart = 0;
  let chunkStartOffset = 0;
  let currentWordCount = 0;

  let match;
  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentence = match[0];
    const sentenceWordCount = countWords(sentence);

    if (currentWordCount + sentenceWordCount > targetWordLimit && currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk,
        startOffset: chunkStartOffset
      });
      currentChunk = sentence;
      chunkStartOffset = match.index;
      currentWordCount = sentenceWordCount;
    } else {
      if (!currentChunk) {
        chunkStartOffset = match.index;
      }
      currentChunk += sentence;
      currentWordCount += sentenceWordCount;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk,
      startOffset: chunkStartOffset
    });
  }

  return chunks.length > 0 ? chunks : [{ text, startOffset: 0 }];
}

// Build system prompt based on tone and developer mode
function buildPrompt(textChunk, tone = 'general', devMode = false) {
  let toneInstruction = '';
  switch (tone) {
    case 'formal':
      toneInstruction = 'Optimize for formal, professional, and grammatically impeccable English suitable for workplace, official correspondence, and business.';
      break;
    case 'academic':
      toneInstruction = 'Optimize for academic prose: clear argumentation, passive/objective balance, formal scholarly vocabulary, and syntax precision.';
      break;
    case 'casual':
      toneInstruction = 'Keep friendly, approachable, and natural phrasing. Do not eliminate colloquial flow unless there is a true grammar or spelling defect.';
      break;
    default:
      toneInstruction = 'Balance natural clarity with correct grammar, spelling, punctuation, and flow.';
      break;
  }

  const devInstruction = devMode
    ? 'IMPORTANT (DEVELOPER MODE): The text is technical documentation, markdown, or a git commit message. DO NOT flag programming identifiers, function names, flags, code syntax, technical acronyms, or markdown syntax. Only flag genuine prose errors.'
    : '';

  return `You are a world-class professional grammar, spelling, and sentence-structure proofreading engine.
Analyze the following user text and detect:
- "grammar": Subject-verb agreement, tense inconsistencies, dangling modifiers, incorrect prepositions, punctuation errors.
- "spelling": Typos, misspelled words, incorrectly merged/split words.
- "structure": Run-on sentences, awkward phrasing, misplaced clauses, fragment sentences.
- "style": Wordiness, redundancies, unclear passive voice, or tone adjustments.

Target Tone: ${tone.toUpperCase()} - ${toneInstruction}
${devInstruction}

CRITICAL RULES:
1. "original" MUST BE THE EXACT, UNMODIFIED SUBSTRING directly present in the text snippet. Do not change punctuation or case in the "original" field.
2. Keep the "original" snippet as concise as possible (the specific word or phrase in error, not entire multi-line paragraphs unless the whole structure is broken).
3. "suggestion" must be the direct replacement for that specific "original" substring.
4. "explanation" must be concise (1-2 sentences) and educational.
5. If no errors are found, return an empty array for issues.

Return ONLY valid JSON with this exact schema:
{
  "issues": [
    {
      "type": "grammar" | "spelling" | "structure" | "style",
      "original": "exact text from input",
      "suggestion": "corrected text",
      "explanation": "concise explanation why"
    }
  ]
}

TEXT TO CHECK:
"""${textChunk}"""`;
}

// Call LLM with provider fallback and structured JSON output
async function callLLM(prompt) {
  const rawProvider = (process.env.LLM_PROVIDER || 'gemini').toLowerCase().trim();
  const isOpenAI = rawProvider === 'openai';

  const apiKey = isOpenAI
    ? (process.env.OPENAI_API_KEY || process.env.LLM_API_KEY)
    : (process.env.GEMINI_API_KEY || process.env.LLM_API_KEY);

  if (!apiKey) {
    throw new Error('No LLM API Key found. Please ensure GEMINI_API_KEY or LLM_API_KEY is configured.');
  }

  if (isOpenAI) {
    return await callOpenAI(prompt, apiKey);
  }

  // Default: Gemini via @google/genai
  return await callGemini(prompt, apiKey);
}

async function callGemini(prompt, apiKey) {
  const ai = new GoogleGenAI(apiKey ? { apiKey } : {});
  // Robust model cascade: Try primary model first, immediately fall back if high demand (503) occurs
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });
      return response.text;
    } catch (err) {
      lastError = err;
      console.warn(`[Checker] Model ${model} failed (${err.message}). Trying fallback model...`);
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond.');
}

async function callOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Parse JSON safely and validate with Zod; with 1 retry on malformed JSON
async function fetchAndValidateWithRetry(prompt) {
  let rawText = '';
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      rawText = await callLLM(prompt);
      // Clean possible markdown code fence wrapper if present
      let cleaned = rawText.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      const validated = IssuesListSchema.parse(parsed);
      return validated.issues;
    } catch (err) {
      lastError = err;
      console.warn(`[Checker] Attempt ${attempt} failed: ${err.message}.`);
      if (attempt === 2) {
        console.error('[Checker] Failed twice. Raw response:', rawText);
        throw new Error(`Grammar engine failed to analyze text: ${err.message}`);
      }
      // Small delay before retry
      await new Promise(res => setTimeout(res, 400));
    }
  }
  throw lastError || new Error('Grammar engine failed to produce valid results.');
}

// Compute accurate server-side offsets and discard issues that don't match exactly
export function locateAndFilterIssues(rawIssues, text, chunkOffset = 0, codeRanges = []) {
  const verifiedIssues = [];
  let searchCursor = 0;

  for (const raw of rawIssues) {
    if (!raw.original || typeof raw.original !== 'string') continue;
    const target = raw.original;

    // Search starting from current cursor or from start if not found ahead
    let foundIndex = text.indexOf(target, searchCursor);
    if (foundIndex === -1) {
      foundIndex = text.indexOf(target, 0);
    }

    if (foundIndex === -1) {
      // Discard issue whose exact snippet can't be found
      console.info(`[Checker] Discarding issue: snippet "${target}" not found in text.`);
      continue;
    }

    const actualStartIndex = chunkOffset + foundIndex;
    const actualEndIndex = actualStartIndex + target.length;

    // If developer mode code range overlap, drop it
    if (codeRanges.length > 0 && overlapsWithCodeRanges(actualStartIndex, actualEndIndex, codeRanges)) {
      console.info(`[Checker] Skipping issue inside code block: "${target}"`);
      continue;
    }

    // Check for overlap with already verified issues to prevent clashing spans
    const overlaps = verifiedIssues.some(existing => 
      Math.max(actualStartIndex, existing.startIndex) < Math.min(actualEndIndex, existing.endIndex)
    );

    if (overlaps) {
      continue;
    }

    searchCursor = foundIndex + target.length;

    verifiedIssues.push({
      id: 'iss_' + crypto.randomUUID().slice(0, 8),
      type: raw.type,
      original: target,
      suggestion: raw.suggestion,
      explanation: raw.explanation,
      startIndex: actualStartIndex,
      endIndex: actualEndIndex
    });
  }

  return verifiedIssues;
}

// Apply suggestions to text to produce corrected preview
export function applyCorrections(originalText, issues) {
  if (!issues || issues.length === 0) return originalText;

  // Sort descending by startIndex to replace without altering prior offsets
  const sorted = [...issues].sort((a, b) => b.startIndex - a.startIndex);
  let result = originalText;

  for (const issue of sorted) {
    if (issue.startIndex >= 0 && issue.endIndex <= result.length) {
      const before = result.slice(0, issue.startIndex);
      const after = result.slice(issue.endIndex);
      result = before + issue.suggestion + after;
    }
  }

  return result;
}

// Main check function
export async function checkGrammar(text, options = {}) {
  const { tone = 'general', devMode = false } = options;

  const wordCount = countWords(text);
  if (wordCount > 3000) {
    throw new Error('Input text exceeds the 3,000 word limit. Please shorten your text.');
  }

  if (!text || text.trim().length === 0) {
    return {
      issues: [],
      correctedText: '',
      wordCount: 0,
      charCount: 0
    };
  }

  const codeRanges = devMode ? extractCodeRanges(text) : [];
  const chunks = chunkText(text, 500);

  let allIssues = [];

  for (const chunk of chunks) {
    const prompt = buildPrompt(chunk.text, tone, devMode);
    const rawChunkIssues = await fetchAndValidateWithRetry(prompt);
    const validatedIssues = locateAndFilterIssues(rawChunkIssues, chunk.text, chunk.startOffset, codeRanges);
    allIssues.push(...validatedIssues);
  }

  // Sort all issues by startIndex ascending
  allIssues.sort((a, b) => a.startIndex - b.startIndex);

  // Generate full corrected preview text
  const correctedText = applyCorrections(text, allIssues);

  return {
    issues: allIssues,
    correctedText,
    wordCount,
    charCount: text.length
  };
}
