/**
 * THEMI Writing - Kannada Script & Name Shield Engine
 * Features:
 *  - Kannada to English (Latin) Phonetic Transliteration
 *  - Kannada to Hindi (Devanagari) Transliteration
 *  - Smart Named Entity Recognition (NER) for Kannada Names & Places
 *  - Name Shield Protection (Tokenization, Isolation, Script Retention, and Transliteration)
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    root.KannadaEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Unicode Kannada Mapping
  const KANNADA_VOWELS = {
    'ಅ': { en: 'a', hi: 'अ' },
    'ಆ': { en: 'aa', hi: 'आ' },
    'ಇ': { en: 'i', hi: 'इ' },
    'ಈ': { en: 'ee', hi: 'ई' },
    'ಉ': { en: 'u', hi: 'उ' },
    'ಊ': { en: 'oo', hi: 'ऊ' },
    'ಋ': { en: 'ru', hi: 'ऋ' },
    'ೠ': { en: 'roo', hi: 'ॠ' },
    'ಎ': { en: 'e', hi: 'ए' },
    'ಏ': { en: 'ee', hi: 'ए' },
    'ಐ': { en: 'ai', hi: 'ऐ' },
    'ಒ': { en: 'o', hi: 'ओ' },
    'ಓ': { en: 'oo', hi: 'ओ' },
    'ಔ': { en: 'au', hi: 'औ' }
  };

  const KANNADA_MATRAS = {
    'ಾ': { en: 'aa', hi: 'ा' },
    'ಿ': { en: 'i', hi: 'ि' },
    'ೀ': { en: 'ee', hi: 'ी' },
    'ು': { en: 'u', hi: 'ु' },
    'ೂ': { en: 'oo', hi: 'ू' },
    'ೃ': { en: 'ru', hi: 'ृ' },
    'ೄ': { en: 'roo', hi: 'ॄ' },
    'ೆ': { en: 'e', hi: 'े' },
    'ೇ': { en: 'ee', hi: 'े' },
    'ೈ': { en: 'ai', hi: 'ै' },
    'ೊ': { en: 'o', hi: 'ो' },
    'ೋ': { en: 'oo', hi: 'ो' },
    'ೌ': { en: 'au', hi: 'ौ' }
  };

  const KANNADA_CONSONANTS = {
    'ಕ': { en: 'k', hi: 'क' },
    'ಖ': { en: 'kh', hi: 'ख' },
    'ಗ': { en: 'g', hi: 'ग' },
    'ಘ': { en: 'gh', hi: 'घ' },
    'ಙ': { en: 'ng', hi: 'ङ' },
    'ಚ': { en: 'ch', hi: 'च' },
    'ಛ': { en: 'chh', hi: 'छ' },
    'ಜ': { en: 'j', hi: 'ज' },
    'ಝ': { en: 'jh', hi: 'झ' },
    'ಞ': { en: 'ny', hi: 'ञ' },
    'ಟ': { en: 't', hi: 'ट' },
    'ಠ': { en: 'th', hi: 'ठ' },
    'ಡ': { en: 'd', hi: 'ड' },
    'ಢ': { en: 'dh', hi: 'ढ' },
    'ಣ': { en: 'n', hi: 'ण' },
    'ತ': { en: 'th', hi: 'त' },
    'ಥ': { en: 'thh', hi: 'थ' },
    'ದ': { en: 'd', hi: 'द' },
    'ಧ': { en: 'dh', hi: 'ध' },
    'ನ': { en: 'n', hi: 'न' },
    'ಪ': { en: 'p', hi: 'प' },
    'ಫ': { en: 'ph', hi: 'फ' },
    'ಬ': { en: 'b', hi: 'ब' },
    'ಭ': { en: 'bh', hi: 'भ' },
    'ಮ': { en: 'm', hi: 'म' },
    'ಯ': { en: 'y', hi: 'य' },
    'ರ': { en: 'r', hi: 'र' },
    'ಱ': { en: 'r', hi: 'ऱ' },
    'ಲ': { en: 'l', hi: 'ल' },
    'ವ': { en: 'v', hi: 'व' },
    'ಶ': { en: 'sh', hi: 'श' },
    'ಷ': { en: 'sh', hi: 'ष' },
    'ಸ': { en: 's', hi: 'स' },
    'ಹ': { en: 'h', hi: 'ह' },
    'ಳ': { en: 'l', hi: 'ळ' },
    'ೞ': { en: 'zh', hi: 'ळ' }
  };

  const VIRAMA = '್'; // U+0CCD
  const ANUSVARA = 'ಂ'; // U+0C82
  const VISARGA = 'ಃ'; // U+0C83

  // Honorific prefixes in Kannada
  const HONORIFICS = [
    'ಶ್ರೀಮಾನ್', 'ಶ್ರೀಮತಿ', 'ಶ್ರೀ', 'ಕುಮಾರಿ', 'ಡಾ||', 'ಡಾಕ್ಟರ್', 'ಡಾ.', 'ಪ್ರೊಫೆಸರ್', 
    'ಪಂಡಿತ್', 'ಸ್ವಾಮೀಜಿ', 'ಗುರೂಜಿ', 'ಆಚಾರ್ಯ', 'ಮಹಾತ್ಮ', 'ಸನ್ಮಾನ್ಯ'
  ];

  // Common Kannada Surnames / Titles
  const SURNAME_MARKERS = [
    'ಗೌಡ', 'ಗೌಡರು', 'ಶೆಟ್ಟಿ', 'ಭಟ್', 'ರಾವ್', 'ರೆಡ್ಡಿ', 'ಹೆಗ್ಡೆ', 'ನಾಯಕ್', 
    'ಕುಮಾರ್', 'ಕುಮಾರಿ', 'ಪ್ರಸಾದ್', 'ಶಾಸ್ತ್ರಿ', 'ವರ್ಮ', 'ಅಯ್ಯಂಗಾರ್', 'ಆಚಾರ್', 
    'ನಾಯ್ಕರ್', 'ಕಟ್ಟಿಮನಿ', 'ದೇಶಪಾಂಡೆ', 'ಕುಲಕರ್ಣಿ', 'ಪಾಟೀಲ್', 'ಹಳಕಟ್ಟಿ', 'ಜೋಶಿ',
    'ಮೈಲಾರ', 'ನಾಡಗೌಡ', 'ದೇವಿ', 'ಮೂರ್ತಿ'
  ];

  // Common Kannada Proper Names (Persons, Places, Entities)
  const KNOWN_PROPER_NAMES = [
    // Persons
    'ಆನಂದ್', 'ಆನಂದ', 'ಸುರೇಶ್', 'ರಮೇಶ್', 'ಗಣೇಶ್', 'ವೆಂಕಟೇಶ್', 'ಮಂಜುನಾಥ', 'ಶಿವರಾಜ್',
    'ಪುನೀತ್', 'ದರ್ಶನ್', 'ಸುದೀಪ್', 'ರಾಧಾ', 'ಪಾರ್ವತಿ', 'ಲಕ್ಷ್ಮಿ', 'ಸರಸ್ವತಿ', 'ಅನನ್ಯ',
    'ಸ್ನೇಹಾ', 'ಕಾವ್ಯಾ', 'ದಿವ್ಯ', 'ಪೂಜಾ', 'ಕೃಷ್ಣ', 'ರಾಮ', 'ರಾಮು', 'ಸೀತಾ', 'ಹನುಮಂತ',
    'ಬಸವರಾಜ್', 'ಸಿದ್ಧರಾಮಯ್ಯ', 'ಯಡಿಯೂರಪ್ಪ', 'ದೇವೇಗೌಡ', 'ರಾಜಕುಮಾರ್', 'ವಿಷ್ಣುವರ್ಧನ್',
    'ಶಂಕರ್', 'ಉಪೇಂದ್ರ', 'ಕಿಶೋರ್', 'ಅರ್ಜುನ್', 'ವಿಜಯ್', 'ವಿಜಯ', 'ಪ್ರವೀಣ್', 'ಸಚಿನ್',
    'ರೋಹಿತ್', 'ವಿರಾಟ್', 'ಸೂರ್ಯ', 'ಚಂದ್ರ', 'ಶಾಂತಿ', 'ಪ್ರೇಮಾ', 'ಪ್ರಕಾಶ್', 'ಸುನೀಲ್',
    'ಭಾರತಿ', 'ಗೀತಾ', 'ವಿದ್ಯಾ', 'ಮೀನಾ', 'ಸುಜಾತಾ', 'ಅನಿತಾ', 'ಕಲ್ಪನಾ', 'ಭವಾನಿ',
    'ಜಯಲಕ್ಷ್ಮಿ', 'ನಾರಾಯಣ', 'ಶ್ರೀನಿವಾಸ್', 'ಮೋಹನ್', 'ಕಿರಣ್', 'ಅರುಣ್', 'ವಿನಯ್', 'ತೇಜಸ್',
    // Places & Geographical Entities
    'ಬೆಂಗಳೂರು', 'ಮೈಸೂರು', 'ಹುಬ್ಬಳ್ಳಿ', 'ಮಂಗಳೂರು', 'ಬೆಳಗಾವಿ', 'ಧಾರವಾಡ', 'ಶಿವಮೊಗ್ಗ',
    'ಉಡುಪಿ', 'ಹಂಪಿ', 'ಕರ್ನಾಟಕ', 'ಕಾವೇರಿ', 'ತುಂಗಭದ್ರಾ', 'ಕೃಷ್ಣಾ', 'ಚಾಮುಂಡಿ', 'ದಾಂಡೇಲಿ',
    'ಮಡಿಕೇರಿ', 'ಚಿಕ್ಕಮಗಳೂರು', 'ಹಾಸನ', 'ತುಮಕೂರು', 'ದಾವಣಗೆರೆ', 'ಬಳ್ಳಾರಿ', 'ಕಲಬುರಗಿ',
    'ಬೀದರ್', 'ರಾಯಚೂರು', 'ಕೊಡಗು', 'ಗೋಕರ್ಣ', 'ಜೋಗ', 'ಶೃಂಗೇರಿ', 'ಧರ್ಮಸ್ಥಳ', 'ಕುಕ್ಕೆ',
    'ಮಂಡ್ಯ', 'ಚಿತ್ರದುರ್ಗ', 'ಕೋಲಾರ', 'ಬಾಗಲಕೋಟೆ', 'ಗದಗ', 'ಹಾವೇರಿ', 'ಕೊಪ್ಪಳ', 'ಯಾದಗಿರಿ',
    'ರಾಮನಗರ', 'ವಿಜಯನಗರ', 'ಬಾದಾಮಿ', 'ಪಟ್ಟದಕಲ್ಲು', 'ಐಹೊಳೆ', 'ಮೇಲುಕೋಟೆ', 'ಬೇಲೂರು',
    'ಹಳೇಬೀಡು', 'ಶ್ರವಣಬೆಳಗೊಳ', 'ನಂದಿ ಬೆಟ್ಟ', 'ಬನ್ನೇರುಘಟ್ಟ', 'ಕಬಿನಿ', 'ನಾಗರಹೊಳೆ',
    'ಬಂಡೀಪುರ', 'ಕುದುರೆಮುಖ', 'ಕಾರವಾರ', 'ಶಿರಸಿ', 'ಭಟ್ಕಳ', 'ಕುಂದಾಪುರ', 'ಕಾರ್ಕಳ',
    'ಮೂಡುಬಿದಿರೆ', 'ಸುಬ್ರಹ್ಮಣ್ಯ', 'ಮುರುಡೇಶ್ವರ', 'ಸಾಗರ', 'ತೀರ್ಥಹಳ್ಳಿ', 'ಆಗುಂಬೆ',
    'ತಲಕಾವೇರಿ', 'ಭಾಗಮಂಡಲ', 'ಹೊಸಪೇಟೆ',
    // Themi Brand Name
    'ಥೇಮಿ', 'ಥೇಮಿ ರೈಟಿಂಗ್', 'ಥೇಮಿ ರೈಟಿಂಗ್ಸ್', 'ಥೇಮೀ'
  ];

  // Common Place Suffix Markers in Kannada
  const PLACE_SUFFIX_MARKERS = [
    'ನಗರ', 'ಪುರ', 'ಪುರಂ', 'ಹಳ್ಳಿ', 'ಕೆರೆ', 'ಬೆಟ್ಟ', 'ಘಟ್ಟ', 'ಕೋಟೆ', 'ವಾಡ', 'ಪಾಳ್ಯ', 'ಗ್ರಾಮ', 'ಕಟ್ಟೆ'
  ];

  /**
   * Transliterate a Kannada word to English phonetic representation
   */
  function transliterateToEnglish(knWord) {
    if (!knWord) return '';
    
    // Check known overrides for pristine proper noun spelling
    const overrides = {
      'ಬೆಂಗಳೂರು': 'Bengaluru',
      'ಮೈಸೂರು': 'Mysuru',
      'ಕರ್ನಾಟಕ': 'Karnataka',
      'ಹುಬ್ಬಳ್ಳಿ': 'Hubballi',
      'ಮಂಗಳೂರು': 'Mangaluru',
      'ಬೆಳಗಾವಿ': 'Belagavi',
      'ಧಾರವಾಡ': 'Dharwad',
      'ಶಿವಮೊಗ್ಗ': 'Shivamogga',
      'ಉಡುಪಿ': 'Udupi',
      'ಹಂಪಿ': 'Hampi',
      'ಕಾವೇರಿ': 'Kaveri',
      'ತುಂಗಭದ್ರಾ': 'Tungabhadra',
      'ಚಾಮುಂಡಿ': 'Chamundi',
      'ದಾಂಡೇಲಿ': 'Dandeli',
      'ಮಡಿಕೇರಿ': 'Madikeri',
      'ಚಿಕ್ಕಮಗಳೂರು': 'Chikkamagaluru',
      'ಹಾಸನ': 'Hassan',
      'ತುಮಕೂರು': 'Tumakuru',
      'ದಾವಣಗೆರೆ': 'Davanagere',
      'ಬಳ್ಳಾರಿ': 'Ballari',
      'ಕಲಬುರಗಿ': 'Kalaburagi',
      'ಬೀದರ್': 'Bidar',
      'ರಾಯಚೂರು': 'Raichur',
      'ಕೊಡಗು': 'Kodagu',
      'ಗೋಕರ್ಣ': 'Gokarna',
      'ಜೋಗ': 'Jog',
      'ಶೃಂಗೇರಿ': 'Sringeri',
      'ಧರ್ಮಸ್ಥಳ': 'Dharmasthala',
      'ಕುಕ್ಕೆ': 'Kukke',
      'ಮಂಡ್ಯ': 'Mandya',
      'ಚಿತ್ರದುರ್ಗ': 'Chitradurga',
      'ಕೋಲಾರ': 'Kolar',
      'ಬಾಗಲಕೋಟೆ': 'Bagalkote',
      'ಗದಗ': 'Gadag',
      'ಹಾವೇರಿ': 'Haveri',
      'ಕೊಪ್ಪಳ': 'Koppal',
      'ಯಾದಗಿರಿ': 'Yadgiri',
      'ರಾಮನಗರ': 'Ramanagara',
      'ವಿಜಯನಗರ': 'Vijayanagara',
      'ಬಾದಾಮಿ': 'Badami',
      'ಪಟ್ಟದಕಲ್ಲು': 'Pattadakallu',
      'ಐಹೊಳೆ': 'Aihole',
      'ಮೇಲುಕೋಟೆ': 'Melukote',
      'ಬೇಲೂರು': 'Beluru',
      'ಹಳೇಬೀಡು': 'Halebeedu',
      'ಶ್ರವಣಬೆಳಗೊಳ': 'Shravanabelagola',
      'ಕಾರವಾರ': 'Karwar',
      'ಶಿರಸಿ': 'Sirsi',
      'ಕುಂದಾಪುರ': 'Kundapura',
      'ಹೊಸಪೇಟೆ': 'Hosapete',
      'ಥೇಮಿ': 'THEMI',
      'ರಾಜಕುಮಾರ್': 'Rajkumar',
      'ಪುನೀತ್': 'Puneeth',
      'ಸುದೀಪ್': 'Sudeep',
      'ದರ್ಶನ್': 'Darshan',
      'ಸುರೇಶ್': 'Suresh',
      'ರಮೇಶ್': 'Ramesh',
      'ಆನಂದ್': 'Anand',
      'ಗಣೇಶ್': 'Ganesh',
      'ಮಂಜುನಾಥ': 'Manjunatha',
      'ಶಿವರಾಜ್': 'Shivaraj',
      'ಕೃಷ್ಣ': 'Krishna',
      'ರಾಮ': 'Rama',
      'ಸೂರ್ಯ': 'Surya',
      'ಶಾಂತಿ': 'Shanthi',
      'ವಿಜಯ': 'Vijaya',
      'ವಿಜಯ್': 'Vijay'
    };
    if (overrides[knWord]) return overrides[knWord];

    let result = '';
    const chars = Array.from(knWord);
    const len = chars.length;

    for (let i = 0; i < len; i++) {
      const ch = chars[i];
      const nextCh = i + 1 < len ? chars[i + 1] : null;

      if (KANNADA_VOWELS[ch]) {
        result += KANNADA_VOWELS[ch].en;
      } else if (KANNADA_CONSONANTS[ch]) {
        const consEn = KANNADA_CONSONANTS[ch].en;
        if (nextCh === VIRAMA) {
          result += consEn;
          i++; // skip virama
        } else if (nextCh && KANNADA_MATRAS[nextCh]) {
          result += consEn + KANNADA_MATRAS[nextCh].en;
          i++; // skip matra
        } else if (i === len - 1) {
          // Word-final consonant usually ends with short 'a' or muted
          result += consEn + 'a';
        } else {
          // Inherent 'a'
          result += consEn + 'a';
        }
      } else if (ch === ANUSVARA) {
        result += 'm';
      } else if (ch === VISARGA) {
        result += 'h';
      } else {
        result += ch;
      }
    }

    // Capitalize first letter for proper nouns
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    return result;
  }

  /**
   * Transliterate a Kannada word to Hindi (Devanagari) script
   */
  function transliterateToHindi(knWord) {
    if (!knWord) return '';

    const overrides = {
      'ಬೆಂಗಳೂರು': 'बेंगलुरु',
      'ಮೈಸೂರು': 'मैसूर',
      'ಕರ್ನಾಟಕ': 'कर्नाटक',
      'ಕಾವೇರಿ': 'कावेरी',
      'ಥೇಮಿ': 'थेमी',
      'ಸುರೇಶ್': 'सुरेश',
      'ರಮೇಶ್': 'रमेश',
      'ಆನಂದ್': 'आनंद',
      'ಕೃಷ್ಣ': 'कृष्ण',
      'ಸೂರ್ಯ': 'सूर्य',
      'ಶಾಂತಿ': 'शांति',
      'ವಿಜಯ': 'विजय'
    };
    if (overrides[knWord]) return overrides[knWord];

    let result = '';
    const chars = Array.from(knWord);
    const len = chars.length;

    for (let i = 0; i < len; i++) {
      const ch = chars[i];
      const nextCh = i + 1 < len ? chars[i + 1] : null;

      if (KANNADA_VOWELS[ch]) {
        result += KANNADA_VOWELS[ch].hi;
      } else if (KANNADA_CONSONANTS[ch]) {
        const consHi = KANNADA_CONSONANTS[ch].hi;
        if (nextCh === VIRAMA) {
          result += consHi + '्';
          i++;
        } else if (nextCh && KANNADA_MATRAS[nextCh]) {
          result += consHi + KANNADA_MATRAS[nextCh].hi;
          i++;
        } else {
          result += consHi;
        }
      } else if (ch === ANUSVARA) {
        result += 'ं';
      } else if (ch === VISARGA) {
        result += 'ः';
      } else {
        result += ch;
      }
    }
    return result;
  }

  /**
   * Check if a string contains Kannada script characters
   */
  function isKannada(text) {
    return /[\u0C80-\u0CFF]/.test(text);
  }

  /**
   * Smart Detection of Named Entities in Kannada text
   * Returns an array of detected entities { raw, clean, type, index, english, hindi }
   */
  function detectNames(text, customUserNames = []) {
    if (!text || !isKannada(text)) return [];

    const detected = [];
    const seen = new Set();

    // 1. Check Custom User-Specified Names first (highest priority)
    for (const name of customUserNames) {
      if (!name || !name.trim()) continue;
      const clean = name.trim();
      const regex = new RegExp(escapeRegex(clean), 'g');
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (!seen.has(clean)) {
          seen.add(clean);
          detected.push({
            raw: clean,
            clean: clean,
            type: 'custom',
            english: transliterateToEnglish(clean),
            hindi: transliterateToHindi(clean)
          });
        }
      }
    }

    // 2. Check Honorific Patterns: e.g. "ಶ್ರೀ ಸುರೇಶ್", "ಡಾಕ್ಟರ್ ಆನಂದ್", "ಶ್ರೀಮತಿ ಶಾರದಾ"
    for (const hon of HONORIFICS) {
      const honRegex = new RegExp(`(${escapeRegex(hon)})\\s+([\\u0C80-\\u0CFF]+)`, 'g');
      let match;
      while ((match = honRegex.exec(text)) !== null) {
        const fullEntity = match[0];
        const personName = match[2];
        if (!seen.has(personName) && personName.length > 2) {
          seen.add(personName);
          detected.push({
            raw: fullEntity,
            clean: personName,
            type: 'person_honorific',
            english: transliterateToEnglish(personName),
            hindi: transliterateToHindi(personName)
          });
        }
      }
    }

    // 3. Check Known Proper Names & Geographic Entities (including inflected case forms)
    const suffixPattern = '(?:ಿ?ನಿಂದ|ಿ?ಂದ|ಿಗೆ|ಗೆ|ಕ್ಕೆ|ಿನ|ದ|ಅನ್ನು|ವನ್ನು|ರಲ್ಲಿ|ನಲ್ಲಿ|ಯಲ್ಲಿ|ಯಿಂದ|ನು|ಳು|ರು)?';
    for (const name of KNOWN_PROPER_NAMES) {
      const stem = name.replace(/[\u0CBE-\u0CCC]$/, '');
      const regex = new RegExp(`(?<=[\\s.,!?;:()[\\]"']|^)(${escapeRegex(name)}|${escapeRegex(stem)}[\\u0CBE-\\u0CCC]*)${suffixPattern}(?=[\\s.,!?;:()[\\]"']|$)`, 'g');
      let match;
      if ((match = regex.exec(text)) !== null) {
        if (!seen.has(name)) {
          seen.add(name);
          detected.push({
            raw: match[0],
            clean: name,
            stem: stem,
            type: 'known_name_or_place',
            english: transliterateToEnglish(name),
            hindi: transliterateToHindi(name)
          });
        }
      }
    }

    // 4. Check Words ending with Surname Markers (e.g., ರಾಮಯ್ಯನವರು, ಸುರೇಶರು, ಕುಮಾರ್, ಗೌಡ)
    for (const marker of SURNAME_MARKERS) {
      const markerRegex = new RegExp(`([\\u0C80-\\u0CFF]+${escapeRegex(marker)})`, 'g');
      let match;
      while ((match = markerRegex.exec(text)) !== null) {
        const word = match[1];
        if (!seen.has(word) && word.length > 3) {
          seen.add(word);
          detected.push({
            raw: word,
            clean: word,
            type: 'surname_or_title',
            english: transliterateToEnglish(word),
            hindi: transliterateToHindi(word)
          });
        }
      }
    }

    // 5. Check Words ending with Place Suffix Markers (e.g., ರಾಜಾಜಿನಗರ, ರಾಮಪುರ, ಕೋರಮಂಗಲ, ಬನಶಂಕರಿ)
    for (const marker of PLACE_SUFFIX_MARKERS) {
      const placeRegex = new RegExp(`([\\u0C80-\\u0CFF]{2,}${escapeRegex(marker)})`, 'g');
      let match;
      while ((match = placeRegex.exec(text)) !== null) {
        const placeWord = match[1];
        if (!seen.has(placeWord) && placeWord.length > 3) {
          seen.add(placeWord);
          detected.push({
            raw: placeWord,
            clean: placeWord,
            type: 'place_name',
            english: transliterateToEnglish(placeWord),
            hindi: transliterateToHindi(placeWord)
          });
        }
      }
    }

    // Sort detected names by length descending so longer phrases match first
    detected.sort((a, b) => b.clean.length - a.clean.length);

    return detected;
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Pre-processes Kannada text by shielding detected names with placeholder tokens
   * e.g., "ಸುರೇಶ್ ಬೆಂಗಳೂರಿಗೆ ಹೋದನು" -> "__THEMI_NAME_0__ __THEMI_NAME_1__ಗೆ ಹೋದನು"
   */
  function shieldNames(text, detectedNames) {
    if (!text || !detectedNames || detectedNames.length === 0) {
      return { shieldedText: text, nameMap: [] };
    }

    let shieldedText = text;
    const nameMap = [];
    let tokenIndex = 0;

    detectedNames.forEach((item) => {
      const stem = item.stem || item.clean.replace(/[\u0CBE-\u0CCC]$/, '');
      const regex = new RegExp(`(${escapeRegex(item.clean)}|${escapeRegex(stem)}[\\u0CBE-\\u0CCC]*)`, 'g');
      if (regex.test(shieldedText)) {
        const token = `__THEMI_NAME_${tokenIndex}__`;
        shieldedText = shieldedText.replace(regex, token);
        nameMap.push({
          token,
          originalKannada: item.clean,
          english: item.english || transliterateToEnglish(item.clean),
          hindi: item.hindi || transliterateToHindi(item.clean)
        });
        tokenIndex++;
      }
    });

    return { shieldedText, nameMap };
  }

  /**
   * Restores shielded name tokens in the translated text according to the preservation mode.
   * Modes:
   *  - 'english_italics': (Default) Names of people & places in English script with *italics*
   *  - 'kannada_script': Names remain in original Kannada script
   *  - 'transliterated': Names phonetically transliterated in normal font
   *  - 'both': Shows both phonetic name and original Kannada script in parentheses
   */
  function restoreShieldedNames(translatedText, nameMap, targetLang, mode = 'english_italics') {
    if (!translatedText || !nameMap || nameMap.length === 0) {
      return translatedText;
    }

    let restored = translatedText;

    nameMap.forEach(item => {
      const tokenPattern = new RegExp(`__\\s*THEMI_NAME_${item.token.match(/\d+/)[0]}\\s*__`, 'gi');
      
      let replacement = '';
      if (mode === 'english_italics') {
        // Names of and places rendered in visual italics without literal asterisks
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

      restored = restored.replace(tokenPattern, replacement);
    });

    return restored;
  }

  return {
    isKannada,
    transliterateToEnglish,
    transliterateToHindi,
    detectNames,
    shieldNames,
    restoreShieldedNames,
    HONORIFICS,
    SURNAME_MARKERS,
    PLACE_SUFFIX_MARKERS,
    KNOWN_PROPER_NAMES
  };
}));
