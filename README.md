# THEMI Writing (ಥೇಮಿ ರೈಟಿಂಗ್)
### Intelligent Kannada to English & Hindi Translator with Name Shield & AI Assistant

**THEMI Writing** is a translation workspace specifically engineered for Kannada script preservation, high-fidelity dual translation into English and Hindi, and an interactive AI revision assistant.

---

## ✨ Key Features

1. **Dual Translation (Kannada &rarr; English & Hindi)**:
   - Simultaneous translation into both English and Hindi.
   - Clean, side-by-side or stacked multi-card layout with word count, copy, download, and speech playback.

2. **Smart Name Shield (ಹೆಸರು ರಕ್ಷಣೆ)**:
   - **User's Core Requirement**: *"The names in the kannada script should remain the same."*
   - Built-in Named Entity Recognition (NER) identifies proper nouns, personal names, geographic entities, and honorifics (ಶ್ರೀ, ಶ್ರೀಮತಿ, ಡಾಕ್ಟರ್, ಗೌಡ, ಶೆಟ್ಟಿ, ಭಟ್, ರಾವ್, etc.).
   - Three selectable preservation modes:
     - 🛡️ **Keep in Kannada Script (Default)**: Preserves the exact original Kannada characters (e.g. `ಸುರೇಶ್`, `ಬೆಂಗಳೂರು`, `ಆನಂದ್`, `ಕಾವೇರಿ`) directly inside the English and Hindi sentences.
     - 🔤 **Transliterate (Phonetic)**: Transliterates names phonetically (e.g., `Suresh`, `सुरेश`) without semantic translation (preventing "ಸೂರ್ಯ" from turning into "Sun" or "ಶಾಂತಿ" into "Peace").
     - 📑 **Dual Mode**: Shows both the phonetic transliteration and original Kannada script in parentheses.
   - **Custom Name Shield Manager**: Add any custom names, company brands, or book titles to shield them with a single click.

3. **Interactive AI Studio ("THEMI AI")**:
   - Built-in conversational AI assistant docked directly beside your translation.
   - **One-Click Tone Adjustments**:
     - 👔 **Formal Tone**: Polishes sentence structure with respectful syntax and professional vocabulary.
     - 💬 **Casual Style**: Conversational, friendly phrasing.
     - 📜 **Literary & Poetic**: Rich imagery capturing the lyrical beauty of Kannada literature.
     - 🛡️ **Audit & Verify Names**: Checks detected names and confirms zero mistranslation.
     - 🔀 **3 Alternative Phrasings**: Generates 3 diverse stylistic variants.
     - 📖 **Explain Grammar**: Explains Kannada SOV grammar, case markers (*vibhakti*), and English/Hindi structural mapping.
   - **Natural Language Interaction**: Type requests like *"Make line 2 more polite"*, *"Change went to arrived in English"*, or *"Ensure 'ದೇವಿಕಾ' is treated as a name"*.
   - **Interactive Apply**: Click **"Apply to English"**, **"Apply to Hindi"**, or **"Apply Both"** to instantly update your translation with a single click!

4. **Speech & Audio**:
   - Text-to-Speech (TTS) for Kannada, English, and Hindi.
   - Voice Input (Speech Recognition) for Kannada dictation.

5. **Kannada Virtual Keypad**:
   - Quick virtual keypad for vowels, consonants, and *matras* for easy typing on any standard keyboard.

6. **History & Offline Resilience**:
   - Automatic local translation history with 1-click restore.
   - Built-in offline fallback lexicon and translation rules.

---

## 🚀 How to Run

### Option 1: Quick Launch
Double-click `start.bat` or run in terminal:
```bash
node server.js
```
Then open your browser to:
[http://localhost:3000](http://localhost:3000)

### Option 2: Direct Offline HTML
You can also open `public/index.html` directly in any web browser!

---

## 📁 Project Structure

```
Themi writings/
├── kannada_engine.js      # Core Kannada NER, phonetic transliteration, and Name Shield
├── server.js              # High-performance zero-dependency Node.js HTTP server & API
├── package.json           # Project metadata and run scripts
├── start.bat              # 1-click Windows launcher
├── README.md              # Documentation
└── public/
    ├── index.html         # Modern responsive Web UI
    ├── app.js             # Client state, Web Speech API, and interactive AI chat
    └── styles.css         # Custom animations, keypad, and name badge styles
```
