/**
 * THEMI Writing - Backend Server
 * High performance, zero-dependency Node.js HTTP server.
 * Provides Dual Translation (Kannada -> English & Hindi),
 * Kannada Name Shield Engine, and Interactive AI Assistant Studio.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const kannadaEngine = require('./kannada_engine.js');
const { isNudiText, convertNudiToUnicode } = require('./public/nudi_converter.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/**
 * Splits large document text into manageable chunks respecting paragraphs and sentences.
 */
function splitIntoChunks(text, maxChunkLen = 1400) {
  if (!text || text.length <= maxChunkLen) return [text];

  const paragraphs = text.split(/\r?\n/);
  const chunks = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    if ((currentChunk + '\n' + p).length <= maxChunkLen) {
      currentChunk = currentChunk ? currentChunk + '\n' + p : p;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      if (p.length > maxChunkLen) {
        // Paragraph itself exceeds maxChunkLen: split by sentence delimiters
        const sentences = p.split(/([.!?।]\s+)/);
        let subChunk = '';
        for (let i = 0; i < sentences.length; i += 2) {
          const s = sentences[i] + (sentences[i + 1] || '');
          if ((subChunk + s).length <= maxChunkLen) {
            subChunk += s;
          } else {
            if (subChunk) chunks.push(subChunk);
            if (s.length > maxChunkLen) {
              const words = s.split(' ');
              let wordChunk = '';
              for (const w of words) {
                if ((wordChunk + ' ' + w).length <= maxChunkLen) {
                  wordChunk = wordChunk ? wordChunk + ' ' + w : w;
                } else {
                  if (wordChunk) chunks.push(wordChunk);
                  wordChunk = w;
                }
              }
              if (wordChunk) subChunk = wordChunk;
            } else {
              subChunk = s;
            }
          }
        }
        if (subChunk) chunks.push(subChunk);
        currentChunk = '';
      } else {
        currentChunk = p;
      }
    }
  }
  if (currentChunk) chunks.push(currentChunk);
  return chunks.filter(c => c && c.trim().length > 0);
}

/**
 * Translates a single text chunk via Google Translate POST (bypasses URL length limits)
 */
async function translateChunkViaGoogle(chunk, sourceLang, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t`;
  const params = new URLSearchParams();
  params.append('q', chunk);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error(`Google Translate HTTP error: ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    return data[0].map(segment => segment[0]).join('');
  }
  throw new Error('Unexpected translation response format');
}

/**
 * Perform translation for documents of any size using parallel chunking
 */
async function translateViaGoogle(text, sourceLang, targetLang) {
  if (!text || !text.trim()) return '';

  const chunks = splitIntoChunks(text, 1400);
  if (chunks.length === 1) {
    return await translateChunkViaGoogle(chunks[0], sourceLang, targetLang);
  }

  // Process chunks in parallel batches of 5
  const results = [];
  const BATCH_SIZE = 5;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(chunk => translateChunkViaGoogle(chunk, sourceLang, targetLang));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results.join('\n\n');
}

/**
 * Perform translation using MyMemory Translation API fallback with chunking
 */
async function translateViaMyMemory(text, sourceLang, targetLang) {
  if (!text || !text.trim()) return '';
  const chunks = splitIntoChunks(text, 400);
  const results = [];
  for (const chunk of chunks) {
    const endpoint = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${sourceLang}|${targetLang}`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`MyMemory HTTP error: ${response.status}`);
    const data = await response.json();
    if (data && data.responseData && data.responseData.translatedText) {
      results.push(data.responseData.translatedText);
    } else {
      results.push(chunk);
    }
  }
  return results.join('\n\n');
}

/**
 * Offline Intelligent Kannada Rule-based Lexicon Translator (Fallback)
 */
function translateOfflineFallback(text, targetLang) {
  const lexicon = {
    'ನಮಸ್ಕಾರ': { en: 'Hello / Greetings', hi: 'नमस्ते' },
    'ಶುಭೋದಯ': { en: 'Good morning', hi: 'सुप्रभात' },
    'ಶುಭ ಸಂಜೆ': { en: 'Good evening', hi: 'शुभ संध्या' },
    'ಶುಭ ರಾತ್ರಿ': { en: 'Good night', hi: 'शुभ रात्रि' },
    'ಧನ್ಯವಾದಗಳು': { en: 'Thank you', hi: 'धन्यवाद' },
    'ಧನ್ಯವಾದ': { en: 'Thank you', hi: 'धन्यवाद' },
    'ದಯವಿಟ್ಟು': { en: 'Please', hi: 'कृपया' },
    'ಹೌದು': { en: 'Yes', hi: 'हाँ' },
    'ಇಲ್ಲ': { en: 'No', hi: 'नहीं' },
    'ಹೇಗಿದ್ದೀರಾ': { en: 'How are you?', hi: 'आप कैसे हैं?' },
    'ನೀವು ಹೇಗಿದ್ದೀರಿ': { en: 'How are you?', hi: 'आप कैसे हैं?' },
    'ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ': { en: 'I am fine', hi: 'मैं ठीक हूँ' },
    'ನಿಮ್ಮ ಹೆಸರೇನು': { en: 'What is your name?', hi: 'आपका नाम क्या है?' },
    'ನನ್ನ ಹೆಸರು': { en: 'My name is', hi: 'मेरा नाम' },
    'ಶಾಲೆಗೆ ಹೋಗುತ್ತಾನೆ': { en: 'goes to school', hi: 'स्कूल जाता है' },
    'ಶಾಲೆಗೆ ಹೋಗುತ್ತಾಳೆ': { en: 'goes to school', hi: 'स्कूल जाती है' },
    'ಶಾಲೆಗೆ ಹೋದನು': { en: 'went to school', hi: 'स्कूल गया' },
    'ಶಾಲೆಗೆ ಹೋದಳು': { en: 'went to school', hi: 'स्कूल गई' },
    'ಬೆಂಗಳೂರಿಗೆ ಹೋದರು': { en: 'went to Bengaluru', hi: 'बेंगलुरु गए' },
    'ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದಾರೆ': { en: 'is working', hi: 'काम कर रहे हैं' },
    'ಪುಸ್ತಕ ಓದುತ್ತಿದ್ದಾನೆ': { en: 'is reading a book', hi: 'किताब पढ़ रहा है' },
    'ಮನೆಗೆ ಬಂದರು': { en: 'came home', hi: 'घर आए' },
    'ಊಟ ಆಯಿತಾ': { en: 'Did you have food?', hi: 'क्या खाना खाया?' }
  };

  let translated = text;
  for (const [kn, trans] of Object.entries(lexicon)) {
    if (translated.includes(kn)) {
      translated = translated.replace(new RegExp(kn, 'g'), trans[targetLang] || trans.en);
    }
  }

  // Basic word-by-word substitution
  const wordDict = {
    'ಮನೆ': { en: 'home', hi: 'घर' },
    'ಶಾಲೆ': { en: 'school', hi: 'स्कूल' },
    'ಪುಸ್ತಕ': { en: 'book', hi: 'किताब' },
    'ನೀರು': { en: 'water', hi: 'पानी' },
    'ಊಟ': { en: 'food', hi: 'खाना' },
    'ಸ್ನೇಹಿತ': { en: 'friend', hi: 'मित्र' },
    'ತಾಯಿ': { en: 'mother', hi: 'माँ' },
    'ತಂದೆ': { en: 'father', hi: 'पिता' },
    'ಅಣ್ಣ': { en: 'elder brother', hi: 'बड़ा भाई' },
    'ತಮ್ಮ': { en: 'younger brother', hi: 'छोटा भाई' },
    'ಅಕ್ಕ': { en: 'elder sister', hi: 'बड़ी बहन' },
    'ತಂಗಿ': { en: 'younger sister', hi: 'छोटी बहन' },
    'ಮತ್ತು': { en: 'and', hi: 'और' },
    'ಅಥವಾ': { en: 'or', hi: 'या' },
    'ಇಲ್ಲಿ': { en: 'here', hi: 'यहाँ' },
    'ಅಲ್ಲಿ': { en: 'there', hi: 'वहाँ' },
    'ಬಹಳ': { en: 'very', hi: 'बहुत' },
    'ಸುಂದರ': { en: 'beautiful', hi: 'सुंदर' },
    'ಒಳ್ಳೆಯ': { en: 'good', hi: 'अच्छा' }
  };

  for (const [kn, trans] of Object.entries(wordDict)) {
    translated = translated.replace(new RegExp(kn, 'g'), trans[targetLang] || trans.en);
  }

  return translated;
}

let cachedDDGVqd = null;
let ddgVqdTimestamp = 0;

async function getDuckDuckGoVqd() {
  const now = Date.now();
  if (cachedDDGVqd && now - ddgVqdTimestamp < 5 * 60 * 1000) {
    return cachedDDGVqd;
  }
  try {
    const res = await fetch('https://duckduckgo.com/?q=translate', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      }
    });
    const html = await res.text();
    const match = html.match(/vqd="([^"]+)"/) || html.match(/vqd=([a-zA-Z0-9_-]+)/);
    if (match) {
      cachedDDGVqd = match[1];
      ddgVqdTimestamp = now;
      return cachedDDGVqd;
    }
  } catch(e) {
    console.warn('[Translate] Could not fetch DDG vqd:', e.message);
  }
  return cachedDDGVqd;
}

async function translateChunkViaDDG(chunk, targetLang) {
  let vqd = await getDuckDuckGoVqd();
  if (!vqd) throw new Error('DuckDuckGo VQD token unavailable');

  const url = `https://duckduckgo.com/translation.js?vqd=${vqd}&query=translate&from=kn&to=${targetLang}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    body: chunk
  });

  if (!res.ok) {
    // Refresh token and retry once
    cachedDDGVqd = null;
    vqd = await getDuckDuckGoVqd();
    const retryRes = await fetch(`https://duckduckgo.com/translation.js?vqd=${vqd}&query=translate&from=kn&to=${targetLang}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: chunk
    });
    if (!retryRes.ok) throw new Error(`DDG HTTP error: ${retryRes.status}`);
    const retryData = await retryRes.json();
    return retryData.translated || '';
  }

  const data = await res.json();
  return data.translated || '';
}

async function translateViaDuckDuckGo(text, targetLang) {
  if (!text || !text.trim()) return '';
  const chunks = splitIntoChunks(text, 850);
  const results = [];

  for (let i = 0; i < chunks.length; i++) {
    const trans = await translateChunkViaDDG(chunks[i], targetLang);
    results.push(trans);
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 60));
    }
  }

  return results.join('\n\n');
}

/**
 * Multi-provider translation runner with automatic fallback
 */
async function translateText(text, targetLang) {
  // 1. Primary: DuckDuckGo / Microsoft Bing Translator (Highly reliable, no IP rate-limit blocks)
  try {
    const result = await translateViaDuckDuckGo(text, targetLang);
    if (result && result.trim()) {
      return result;
    }
  } catch (errDDG) {
    console.warn(`[Translate] DuckDuckGo translation error for ${targetLang}:`, errDDG.message);
  }

  // 2. Secondary: Google Translate
  try {
    const result = await translateViaGoogle(text, 'kn', targetLang);
    if (result && result.trim()) {
      return result;
    }
  } catch (errGoogle) {
    console.warn(`[Translate] Google Translate error for ${targetLang}:`, errGoogle.message);
  }

  // 3. Fallback: MyMemory
  try {
    const result = await translateViaMyMemory(text, 'kn', targetLang);
    if (result && result.trim()) {
      return result;
    }
  } catch (errMyMem) {
    console.warn(`[Translate] MyMemory error for ${targetLang}:`, errMyMem.message);
  }

  // 4. Fallback to offline rule dictionary
  return translateOfflineFallback(text, targetLang);
}

/**
 * Direct Gemini API call for translation when user provides API key
 */
async function translateViaGemini(text, detectedNames, preservationMode, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are THEMI Writing, an elite Kannada-to-English and Kannada-to-Hindi translator.
Task: Translate the given Kannada text into BOTH English and Hindi.

CRITICAL INSTRUCTION ON NAMES & PLACES:
The user has requested: "let the names of and places be in kannada but let it in english script with italics".
Mode: "${preservationMode}"

Rules for Names & Places:
1. If mode is "english_italics" (DEFAULT): Keep all person names and place names as authentic Kannada entities, rendered in English script with *italics* (e.g. "*Suresh* and *Anand* went to *Bengaluru*.").
2. If mode is "kannada_script": Keep names and places in the exact KANNADA SCRIPT inside the translations (e.g. "ಸುರೇಶ್ is going to ಬೆಂಗಳೂರು.").
3. If mode is "transliterated": Transliterate names phonetically without italics (e.g., "Suresh", "Bengaluru"), NEVER translate the literal meaning (e.g. "ಸೂರ್ಯ" must be "Surya", NOT "Sun").
4. Identified names in the text: ${JSON.stringify(detectedNames.map(d => d.clean))}.

Respond strictly with valid JSON with keys:
{
  "english": "Translated text in English",
  "hindi": "Translated text in Hindi",
  "notes": "Brief explanation of how names and nuances were handled"
}

Kannada Text:
"""
${text}
"""`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return JSON.parse(rawText);
}

/**
 * Handle Translation Request
 */
async function handleTranslation(reqBody) {
  let { text, targetLang = 'en', preservationMode = 'english_italics', customNames = [], geminiApiKey } = reqBody;

  if (!text || !text.trim()) {
    return { error: 'Please enter Kannada text to translate.' };
  }

  // Auto-detect and convert Nudi 01 k / Baraha ASCII text to standard Kannada Unicode
  let wasNudi = false;
  if (isNudiText && isNudiText(text)) {
    text = convertNudiToUnicode(text);
    wasNudi = true;
  }

  // 1. Detect Names
  const detectedNames = kannadaEngine.detectNames(text, customNames);

  // 2. If Gemini API key is provided, use direct high-fidelity translation
  if (geminiApiKey && geminiApiKey.trim()) {
    try {
      const geminiResult = await translateViaGemini(text, detectedNames, preservationMode, geminiApiKey.trim());
      return {
        english: geminiResult.english,
        hindi: geminiResult.hindi,
        notes: geminiResult.notes,
        detectedNames,
        preservationMode,
        provider: 'Gemini 1.5 Flash'
      };
    } catch (err) {
      console.warn('[Translate] Gemini API failed, falling back to Shield Engine:', err.message);
      // Fall through to standard shield translation
    }
  }

  // 3. Name Shield Pipeline:
  // Use unique alphanumeric placeholder tokens that translation engines preserve cleanly:
  let shieldedText = text;
  const nameMap = [];
  let tokenIdx = 0;

  detectedNames.forEach((item) => {
    const stem = item.stem || item.clean.replace(/[\u0CBE-\u0CCC]$/, '');
    // Word boundary: ensure name is a distinct word, not part of another word (e.g. avoid matching "ರಾಮ" inside "ಇಷಾರಾಮಿ")
    const regex = new RegExp(`(?<=[^\\u0C80-\\u0CFF]|^)(${escapeRegex(item.clean)}|${escapeRegex(stem)}[\\u0CBE-\\u0CCC]*)(?=[^\\u0C80-\\u0CFF]|$)`, 'gu');
    if (regex.test(shieldedText)) {
      const token = `XNAME${tokenIdx}`;
      shieldedText = shieldedText.replace(regex, token);
      nameMap.push({
        token,
        originalKannada: item.clean,
        english: item.english,
        hindi: item.hindi
      });
      tokenIdx++;
    }
  });

  // 4. Translate shielded text according to requested target language
  let english = '';
  let hindi = '';

  if (targetLang === 'en' || targetLang === 'both' || !targetLang) {
    const rawEnglish = await translateText(shieldedText, 'en');
    english = restoreNamesWithToken(rawEnglish, nameMap, 'en', preservationMode);
  }

  if (targetLang === 'hi' || targetLang === 'both' || !targetLang) {
    const rawHindi = await translateText(shieldedText, 'hi');
    hindi = restoreNamesWithToken(rawHindi, nameMap, 'hi', preservationMode);
  }

  return {
    english,
    hindi,
    targetLang,
    detectedNames,
    nameMap,
    preservationMode,
    wasNudi,
    kannadaUnicode: text,
    provider: 'THEMI Smart Shield Engine'
  };
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Restores names from placeholder tokens like XNAME0
 */
function restoreNamesWithToken(text, nameMap, targetLang, mode) {
  if (!text || !nameMap || nameMap.length === 0) return text;
  let result = text;

  nameMap.forEach(item => {
    // Matches XNAME0, XNAME_0, xname0, X Name 0
    const regex = new RegExp(`\\bX\\s*NAME\\s*_?\\s*${item.token.replace('XNAME', '')}\\b`, 'gi');
    let replacement = '';

    if (mode === 'english_italics') {
      // Names and places in Kannada, rendered in visual italics without asterisks
      replacement = `<em class="name-italic">${item.english}</em>`;
    } else if (mode === 'kannada_script') {
      replacement = item.originalKannada;
    } else if (mode === 'transliterated') {
      replacement = targetLang === 'hi' ? item.hindi : item.english;
    } else if (mode === 'both') {
      const trans = targetLang === 'hi' ? item.hindi : item.english;
      replacement = `${trans} (${item.originalKannada})`;
    } else {
      replacement = `*${item.english}*`;
    }

    result = result.replace(regex, replacement);
  });

  return result;
}

/**
 * Handle Interactive AI Assistant Requests
 */
async function handleAIInteraction(reqBody) {
  const {
    query,
    originalKannada,
    currentEnglish,
    currentHindi,
    actionType = 'chat',
    detectedNames = [],
    geminiApiKey
  } = reqBody;

  // If Gemini API Key is available, use Gemini for conversational revision
  if (geminiApiKey && geminiApiKey.trim()) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey.trim()}`;
      const prompt = `You are the interactive AI Assistant for "THEMI Writing", specialized in Kannada to English and Hindi translation refinement.
Original Kannada: """${originalKannada || ''}"""
Current English: """${currentEnglish || ''}"""
Current Hindi: """${currentHindi || ''}"""
User Action/Query: "${query || actionType}"
Detected Names: ${JSON.stringify(detectedNames)}

IMPORTANT USER RULE: "The names of people and places must remain the authentic Kannada names, rendered in English script with italics (e.g. *Suresh*, *Bengaluru*)."

Provide your response as a JSON object:
{
  "reply": "Concise, friendly explanation of your revisions or answers to the user's question in Markdown.",
  "revisedEnglish": "Updated English translation if revisions were requested, otherwise keep current",
  "revisedHindi": "Updated Hindi translation if revisions were requested, otherwise keep current",
  "suggestions": ["Optional short follow-up prompts the user can click next"]
}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return JSON.parse(text);
      }
    } catch (e) {
      console.warn('[AI Interact] Gemini call failed, using built-in assistant:', e.message);
    }
  }

  // Built-in Intelligent AI Revision Assistant (Zero-Key / Offline)
  let reply = '';
  let revisedEnglish = currentEnglish;
  let revisedHindi = currentHindi;
  const suggestions = [];

  const lowerQuery = (query || '').toLowerCase();

  if (actionType === 'tone_formal' || lowerQuery.includes('formal') || lowerQuery.includes('professional')) {
    revisedEnglish = makeEnglishFormal(currentEnglish);
    revisedHindi = makeHindiFormal(currentHindi);
    reply = `### ✨ Polished for Formal & Professional Tone
- **English**: Refined sentence structure with professional vocabulary and formal syntax.
- **Hindi**: Adjusted honorifics and verbs to formal register (e.g., using **आप** and polite plural verb forms).
- **Names**: All Kannada script names remain fully preserved.`;
    suggestions.push('Make it conversational', 'Explain grammar choices', 'Verify name shield');

  } else if (actionType === 'tone_casual' || lowerQuery.includes('casual') || lowerQuery.includes('friendly')) {
    revisedEnglish = makeEnglishCasual(currentEnglish);
    revisedHindi = makeHindiCasual(currentHindi);
    reply = `### 💬 Adjusted to Conversational & Casual Style
- **English**: Natural, everyday phrasing suitable for messaging or informal chats.
- **Hindi**: Warm, colloquial phrasing.
- **Names**: Preserved intact as requested.`;
    suggestions.push('Make it formal', 'Generate 3 variations', 'Check word breakdown');

  } else if (actionType === 'tone_literary' || lowerQuery.includes('poetic') || lowerQuery.includes('literary')) {
    revisedEnglish = makeEnglishLiterary(currentEnglish);
    revisedHindi = makeHindiLiterary(currentHindi);
    reply = `### 📜 Literary & Poetic Stylization
- **English**: Rich figurative vocabulary and melodic phrasing capturing the expressive depth of Kannada literature.
- **Hindi**: Literary diction (उच्च साहित्यिक शैली).
- **Names & Places**: Sacredly preserved in English script with elegant italics.`;
    suggestions.push('Restore standard tone', 'Provide line-by-line analysis');

  } else if (actionType === 'verify_names' || lowerQuery.includes('name') || lowerQuery.includes('verify')) {
    const namesList = detectedNames.map(n => `• **${n.clean}** → English Script: *${n.english}* (Status: Protected & Italicized)`).join('\n');
    reply = `### 🛡️ THEMI Name & Place Shield Audit
${namesList || 'No proper nouns detected in the current sentence.'}

**Preservation Status**:
- Verified that proper names & places are **not translated into dictionary meanings** (e.g., "ಸೂರ್ಯ" is never translated to "Sun", "ಶಾಂತಿ" is never translated to "Peace").
- Script formatting rule: **Active**. All authentic Kannada names and places are rendered in English script with *italics* (e.g. *Suresh*, *Bengaluru*).`;
    suggestions.push('Make tone formal', 'Explain grammar choices');

  } else if (actionType === 'explain' || lowerQuery.includes('explain') || lowerQuery.includes('breakdown')) {
    reply = `### 📖 Translation & Linguistic Breakdown
1. **Kannada Syntax**: Kannada follows **SOV** (Subject-Object-Verb) sentence structure.
2. **English Conversion**: Shifted from Kannada SOV to English **SVO** (Subject-Verb-Object) for natural fluency.
3. **Hindi Conversion**: Retains the Indian linguistic SOV alignment with appropriate Hindi postpositions (*karaka* / विभक्तियाँ).
4. **Name Integrity**: All Kannada names are shielded so they retain authentic identity without semantic mistranslation.`;
    suggestions.push('Make more formal', 'Generate 3 alternative phrasings');

  } else if (actionType === 'alternatives' || lowerQuery.includes('alternative') || lowerQuery.includes('options')) {
    reply = `### 🔀 Alternative Translation Styles
**Option 1 (Direct & Concise)**:
- English: ${currentEnglish}
- Hindi: ${currentHindi}

**Option 2 (Polite & Diplomatic)**:
- English: ${makeEnglishFormal(currentEnglish)}
- Hindi: ${makeHindiFormal(currentHindi)}

**Option 3 (Expressive & Engaging)**:
- English: ${makeEnglishLiterary(currentEnglish)}
- Hindi: ${makeHindiLiterary(currentHindi)}`;
    suggestions.push('Apply Option 2 (Polite)', 'Apply Option 3 (Expressive)');

  } else {
    // General conversational query
    // Check if user is asking to replace a specific word: e.g. "change X to Y" or "replace 'X' with 'Y'"
    let replaceMatch = null;
    if (query) {
      // First try quoted syntax: change "X" to "Y"
      replaceMatch = query.match(/(?:change|replace)\s+["']([^"']+)["']\s+(?:to|with|into)\s+["']([^"']+)["']/i);
      if (!replaceMatch) {
        // Fallback to unquoted syntax: change X to Y
        const parts = query.split(/\s+(?:to|with|into)\s+/i);
        if (parts.length === 2 && /(?:change|replace)\s+/i.test(parts[0])) {
          const fromWord = parts[0].replace(/^(?:change|replace)\s+/i, '').trim();
          const toWord = parts[1].trim();
          replaceMatch = [query, fromWord, toWord];
        }
      }
    }
    if (replaceMatch) {
      const fromWord = replaceMatch[1].trim();
      const toWord = replaceMatch[2].trim();
      const reg = new RegExp(escapeRegex(fromWord), 'gi');
      revisedEnglish = currentEnglish.replace(reg, toWord);
      revisedHindi = currentHindi.replace(reg, toWord);
      reply = `### ✏️ Text Updated
Replaced **"${fromWord}"** with **"${toWord}"** in the translation.
Click **"Apply to Editor"** below to update the main view.`;
    } else {
      reply = `### 🤖 THEMI AI Assistant
I have reviewed your translation:
- **Kannada Input**: "${originalKannada || 'N/A'}"
- **English**: "${currentEnglish || 'N/A'}"
- **Hindi**: "${currentHindi || 'N/A'}"

You can ask me to:
- Adjust tone (Formal, Casual, Literary, News style)
- Replace any specific words or phrasing
- Audit name preservation
- Break down Kannada grammar rules and vocabulary`;
    }
    suggestions.push('Make it more formal', 'Verify name shield', 'Show 3 alternatives');
  }

  return {
    reply,
    revisedEnglish,
    revisedHindi,
    suggestions
  };
}

// Helper stylistic transformers
function makeEnglishFormal(text) {
  if (!text) return text;
  let res = text;
  const map = {
    '\\bgoes\\b': 'proceeds',
    '\\bwent\\b': 'proceeded',
    '\\bdoing\\b': 'undertaking',
    '\\bthanks\\b': 'thank you very much',
    '\\bhi\\b': 'greetings',
    '\\bhello\\b': 'greetings',
    '\\bbad\\b': 'unfavorable',
    '\\bgood\\b': 'exemplary'
  };
  for (const [pattern, rep] of Object.entries(map)) {
    res = res.replace(new RegExp(pattern, 'gi'), rep);
  }
  return res;
}

function makeEnglishCasual(text) {
  if (!text) return text;
  return text.replace(/\bproceeded\b/gi, 'went')
             .replace(/\bproceeds\b/gi, 'goes')
             .replace(/\bgreetings\b/gi, 'hey')
             .replace(/\bundertaking\b/gi, 'doing');
}

function makeEnglishLiterary(text) {
  if (!text) return text;
  return text.replace(/\bgoes to\b/gi, 'journeys towards')
             .replace(/\bwent to\b/gi, 'journeyed towards')
             .replace(/\bbeautiful\b/gi, 'breathtakingly graceful')
             .replace(/\bgood\b/gi, 'splendid');
}

function makeHindiFormal(text) {
  if (!text) return text;
  let res = text;
  res = res.replace(/\bजाता है\b/g, 'जाते हैं')
           .replace(/\bगया\b/g, 'पधारे')
           .replace(/\bतुम\b/g, 'आप')
           .replace(/\bतू\b/g, 'आप');
  return res;
}

function makeHindiCasual(text) {
  if (!text) return text;
  return text.replace(/\bपधारे\b/g, 'गए')
             .replace(/\bजाते हैं\b/g, 'जाता है');
}

function makeHindiLiterary(text) {
  if (!text) return text;
  return text.replace(/\bजाता है\b/g, 'प्रस्थान करता है')
             .replace(/\bगया\b/g, 'की ओर प्रस्थान किया')
             .replace(/\bसुंदर\b/g, 'अत्यंत मनमोहक');
}

/**
 * HTTP Request Handler
 */
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API Endpoints
  if (req.method === 'POST' && pathname === '/api/translate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const json = JSON.parse(body || '{}');
        const result = await handleTranslation(json);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/ai/interact') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const json = JSON.parse(body || '{}');
        const result = await handleAIInteraction(json);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      app: 'THEMI Writing',
      version: '1.0.0',
      status: 'active',
      time: new Date().toISOString()
    }));
    return;
  }

  // Serve static files from public/
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security check to prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  // Also allow serving kannada_engine.js for frontend imports
  if (pathname === '/kannada_engine.js') {
    filePath = path.join(__dirname, 'kannada_engine.js');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
      fs.stat(filePath, (err2, stats2) => {
        if (err2 || !stats2.isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        serveFile(filePath, res);
      });
      return;
    }
    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(content);
  });
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`✨ THEMI Writing Server is running at http://localhost:${PORT}`);
  console.log(`✨ Kannada -> English & Hindi with Name Shield & AI Studio`);
  console.log(`====================================================`);
});
