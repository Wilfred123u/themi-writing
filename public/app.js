/**
 * THEMI Writing - Classic Editorial Translation & Assistant Application
 */

(function () {
  'use strict';

  // Application State
  const state = {
    inputText: '',
    englishText: '',
    hindiText: '',
    selectedTargetLang: localStorage.getItem('themi_target_lang') || 'en',
    preservationMode: 'english_italics',
    history: JSON.parse(localStorage.getItem('themi_history') || '[]'),
    isTranslating: false,
    isListeningVoice: false,
    theme: localStorage.getItem('themi_theme') || 'light'
  };

  // Sample texts
  const SAMPLES = {
    poetic_verse: "ಕಾನನದ ಮಡಿಲಲಿ ಹರಿಯುವ ಕಾವೇರಿ, ತಂಪಾದ ಗಾಳಿಯಲಿ ತೇಲುವ ಮೈಸೂರಿನ ಸುವಾಸನೆ. ಸುರೇಶ್ ಮತ್ತು ಆನಂದ್ ಪ್ರಕೃತಿಯ ಸೌಂದರ್ಯವನ್ನು ಕಣ್ತುಂಬಿಕೊಂಡರು.",
    names_dialogue: "ಸುರೇಶ್ ಮತ್ತು ಆನಂದ್ ಶಾಲೆಗೆ ಹೋದರು. ಅಲ್ಲಿ ಮಂಜುನಾಥ ಅವರನ್ನು ಭೇಟಿಯಾಗಿ ಪುಸ್ತಕಗಳನ್ನು ನೀಡಿದರು.",
    bengaluru_mysuru: "ನಾವು ಮೈಸೂರಿನಿಂದ ಬೆಂಗಳೂರಿಗೆ ಪ್ರಯಾಣಿಸುತ್ತಿದ್ದೇವೆ. ಕಾವೇರಿ ಕರ್ನಾಟಕದ ಪವಿತ್ರ ನದಿ.",
    honorific_formal: "ಶ್ರೀಮಾನ್ ಸಿದ್ಧರಾಮಯ್ಯ ಮತ್ತು ಡಾಕ್ಟರ್ ರಮೇಶ್ ಗೌಡ ಸಭೆಯಲ್ಲಿ ಉಪಸ್ಥಿತರಿದ್ದು ಭಾಷಣ ಮಾಡಿದರು.",
    kannada_story: "ಚಾಮುಂಡಿ ಬೆಟ್ಟದ ಮೇಲೆ ಸುಂದರವಾದ ದೇವಾಲಯವಿದೆ. ಲಕ್ಷ್ಮಿ ಮತ್ತು ರಾಧಾ ನಿನ್ನೆ ಅಲ್ಲಿಗೆ ಭೇಟಿ ನೀಡಿದ್ದರು.",
    nudi_sample: "¸ÀÄgÉÃ±ï ªÀÄvÀÄÛ D£ÀAzï ±Á¯ÉUÉ ºÉÆÃzÀgÀÄ. C°è ªÀÄAdÄ£ÁxÀ CªÀgÀ£ÀÄß ¨sÉÃnAiÀiÁV ¥ÀÅ¸ÀÛPÀUÀ¼À£ÀÄß ¤ÃrzÀgÀÄ."
  };

  // DOM Elements
  const el = {
    // Input
    kannadaInput: document.getElementById('kannadaInput'),
    inputCharCount: document.getElementById('inputCharCount'),
    btnTranslate: document.getElementById('btnTranslate'),
    btnClearInput: document.getElementById('btnClearInput'),
    sampleSelect: document.getElementById('sampleSelect'),
    btnVoiceInput: document.getElementById('btnVoiceInput'),
    docFileInput: document.getElementById('docFileInput'),
    fileUploadBanner: document.getElementById('fileUploadBanner'),
    fileNameLabel: document.getElementById('fileNameLabel'),
    btnRemoveFile: document.getElementById('btnRemoveFile'),
    nudiBadge: document.getElementById('nudiBadge'),
    nudiToastNotice: document.getElementById('nudiToastNotice'),
    btnCloseNudiNotice: document.getElementById('btnCloseNudiNotice'),
    // Language Tabs
    tabLangEnglish: document.getElementById('tabLangEnglish'),
    tabLangHindi: document.getElementById('tabLangHindi'),
    tabLangDual: document.getElementById('tabLangDual'),
    translationGrid: document.getElementById('translationGrid'),
    outputContainer: document.getElementById('outputContainer'),
    // English Card
    englishCard: document.getElementById('englishCard'),
    englishOutput: document.getElementById('englishOutput'),
    englishLoading: document.getElementById('englishLoading'),
    enWordCount: document.getElementById('enWordCount'),
    btnListenEnglish: document.getElementById('btnListenEnglish'),
    btnCopyEnglish: document.getElementById('btnCopyEnglish'),
    btnDownloadEnglish: document.getElementById('btnDownloadEnglish'),
    // Hindi Card
    hindiCard: document.getElementById('hindiCard'),
    hindiOutput: document.getElementById('hindiOutput'),
    hindiLoading: document.getElementById('hindiLoading'),
    hiWordCount: document.getElementById('hiWordCount'),
    btnListenHindi: document.getElementById('btnListenHindi'),
    btnCopyHindi: document.getElementById('btnCopyHindi'),
    btnDownloadHindi: document.getElementById('btnDownloadHindi'),
    // Assistant
    aiChatBox: document.getElementById('aiChatBox'),
    aiPromptForm: document.getElementById('aiPromptForm'),
    aiInputText: document.getElementById('aiInputText'),
    btnSendAI: document.getElementById('btnSendAI'),
    // Header & Archive
    btnToggleTheme: document.getElementById('btnToggleTheme'),
    btnToggleHistory: document.getElementById('btnToggleHistory'),
    historyDrawer: document.getElementById('historyDrawer'),
    btnCloseHistory: document.getElementById('btnCloseHistory'),
    btnClearHistory: document.getElementById('btnClearHistory'),
    historyList: document.getElementById('historyList')
  };

  /**
   * Boot
   */
  function init() {
    setupRichEditor(el.englishOutput);
    setupRichEditor(el.hindiOutput);
    applyTheme(state.theme);
    setTargetLanguage(state.selectedTargetLang);
    renderHistory();
    attachEventListeners();

    // Default sample if empty
    if (!el.kannadaInput.value) {
      el.kannadaInput.value = SAMPLES.names_dialogue;
      updateCounts();
    }
  }

  /**
   * ContentEditable Rich Output Adapter
   * Renders names in visual italics without literal asterisks
   */
  function setupRichEditor(elem) {
    if (!elem) return;
    Object.defineProperty(elem, 'value', {
      get() {
        return this.innerText || this.textContent || '';
      },
      set(val) {
        if (!val) {
          this.innerHTML = '';
          return;
        }
        // Transform markdown asterisks *Word* into visual italics <em class="name-italic">Word</em>
        let clean = val.replace(/\*([^*\n\r]+)\*/g, '<em class="name-italic">$1</em>');
        clean = clean.replace(/<em(?![^>]*class="name-italic")([^>]*)>([^<]+)<\/em>/gi, '<em class="name-italic"$1>$2</em>');
        clean = clean.replace(/<i([^>]*)>([^<]+)<\/i>/gi, '<em class="name-italic"$1>$2</em>');
        this.innerHTML = clean;
      },
      configurable: true
    });

    elem.addEventListener('input', () => {
      updateCounts();
    });
  }

  /**
   * Target Language Selection Tabs
   */
  function setTargetLanguage(lang) {
    state.selectedTargetLang = lang;
    localStorage.setItem('themi_target_lang', lang);

    // Reset tab active classes
    [el.tabLangEnglish, el.tabLangHindi, el.tabLangDual].forEach(btn => {
      if (btn) btn.classList.remove('active', 'bg-white', 'dark:bg-[#292524]', 'text-[#1c1917]', 'dark:text-white', 'border', 'border-[#c29b38]/30', 'shadow-xs');
      if (btn) btn.classList.add('text-[#78716c]', 'dark:text-[#a8a29e]');
    });

    if (lang === 'en') {
      activateTabButton(el.tabLangEnglish);
      el.englishCard.classList.remove('hidden');
      el.hindiCard.classList.add('hidden');
      el.translationGrid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch';
    } else if (lang === 'hi') {
      activateTabButton(el.tabLangHindi);
      el.englishCard.classList.add('hidden');
      el.hindiCard.classList.remove('hidden');
      el.translationGrid.className = 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch';
    } else if (lang === 'dual') {
      activateTabButton(el.tabLangDual);
      el.englishCard.classList.remove('hidden');
      el.hindiCard.classList.remove('hidden');
      el.translationGrid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch';
    }

    refreshIcons();

    // If text is entered and user switches to a language that hasn't been translated yet, translate it!
    const hasInput = el.kannadaInput.value.trim().length > 0;
    if (hasInput) {
      if (lang === 'en' && !el.englishOutput.value.trim()) {
        translateScript();
      } else if (lang === 'hi' && !el.hindiOutput.value.trim()) {
        translateScript();
      }
    }
  }

  function activateTabButton(btn) {
    if (!btn) return;
    btn.classList.add('active', 'bg-white', 'dark:bg-[#292524]', 'text-[#1c1917]', 'dark:text-white', 'border', 'border-[#c29b38]/30', 'shadow-xs');
    btn.classList.remove('text-[#78716c]', 'dark:text-[#a8a29e]');
  }

  /**
   * Theme
   */
  function applyTheme(theme) {
    state.theme = theme;
    localStorage.setItem('themi_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  /**
   * Nudi 01 k Font Notice
   */
  function showNudiNotice(show = true) {
    if (el.nudiBadge) {
      if (show) el.nudiBadge.classList.remove('hidden');
      else el.nudiBadge.classList.add('hidden');
    }
    if (el.nudiToastNotice) {
      if (show) {
        el.nudiToastNotice.classList.remove('hidden');
        refreshIcons();
      } else {
        el.nudiToastNotice.classList.add('hidden');
      }
    }
  }

  /**
   * Document Upload Handling (PDF, DOCX, TXT)
   */
  async function handleFileUpload(file) {
    if (!file) return;

    const fileName = file.name;
    const ext = fileName.split('.').pop().toLowerCase();

    el.fileNameLabel.textContent = `${fileName} (${formatBytes(file.size)})`;
    el.fileUploadBanner.classList.remove('hidden');

    try {
      let extractedText = '';

      if (ext === 'pdf') {
        extractedText = await extractTextFromPdf(file);
      } else if (ext === 'docx') {
        extractedText = await extractTextFromDocx(file);
      } else {
        // Plain text, markdown, etc.
        extractedText = await file.text();
      }

      if (!extractedText || !extractedText.trim()) {
        alert('Could not extract readable text from this file. Please ensure it is a text-based document.');
        return;
      }

      // Automatically detect and convert legacy Nudi 01 k / Baraha ASCII text to standard Kannada Unicode
      let wasNudi = false;
      if (window.isNudiText && window.isNudiText(extractedText)) {
        extractedText = window.convertNudiToUnicode(extractedText);
        wasNudi = true;
      }

      el.kannadaInput.value = extractedText;
      updateCounts();
      showNudiNotice(wasNudi);

      // Automatically translate
      translateScript();

    } catch (err) {
      console.error('File parsing error:', err);
      alert('Error reading file: ' + err.message);
    }
  }

  async function extractTextFromPdf(file) {
    if (!window.pdfjsLib) {
      throw new Error('PDF reader library not loaded. Please ensure you are connected to the internet.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    return fullText.trim();
  }

  async function extractTextFromDocx(file) {
    if (!window.mammoth) {
      throw new Error('Word document reader library not loaded.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Event Listeners
   */
  function attachEventListeners() {
    // Theme
    el.btnToggleTheme.addEventListener('click', () => {
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      refreshIcons();
    });

    // Language Selection Tabs
    el.tabLangEnglish.addEventListener('click', () => setTargetLanguage('en'));
    el.tabLangHindi.addEventListener('click', () => setTargetLanguage('hi'));
    if (el.tabLangDual) {
      el.tabLangDual.addEventListener('click', () => setTargetLanguage('dual'));
    }

    // Input events
    el.kannadaInput.addEventListener('input', updateCounts);

    // Auto-detect and convert Nudi 01 k font text on paste
    el.kannadaInput.addEventListener('paste', () => {
      setTimeout(() => {
        const val = el.kannadaInput.value;
        if (window.isNudiText && window.isNudiText(val)) {
          el.kannadaInput.value = window.convertNudiToUnicode(val);
          updateCounts();
          showNudiNotice(true);
        }
      }, 40);
    });

    // Close Nudi notification button
    if (el.btnCloseNudiNotice) {
      el.btnCloseNudiNotice.addEventListener('click', () => {
        showNudiNotice(false);
      });
    }

    // Keyboard shortcut (Ctrl + Enter)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        translateScript();
      }
    });

    // Translate Button
    el.btnTranslate.addEventListener('click', translateScript);

    // Clear Button
    el.btnClearInput.addEventListener('click', () => {
      el.kannadaInput.value = '';
      el.fileUploadBanner.classList.add('hidden');
      showNudiNotice(false);
      updateCounts();
      el.kannadaInput.focus();
    });

    // Sample Selector
    el.sampleSelect.addEventListener('change', (e) => {
      const key = e.target.value;
      if (key && SAMPLES[key]) {
        let sampleText = SAMPLES[key];
        let isNudi = false;
        if (window.isNudiText && window.isNudiText(sampleText)) {
          sampleText = window.convertNudiToUnicode(sampleText);
          isNudi = true;
        }
        el.kannadaInput.value = sampleText;
        el.fileUploadBanner.classList.add('hidden');
        showNudiNotice(isNudi);
        updateCounts();
        translateScript();
      }
      e.target.value = '';
    });

    // File Upload Input
    el.docFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleFileUpload(file);
      e.target.value = '';
    });

    // Remove File Banner
    el.btnRemoveFile.addEventListener('click', () => {
      el.fileUploadBanner.classList.add('hidden');
      showNudiNotice(false);
    });

    // Drag and Drop over Kannada card
    const dropZone = el.kannadaInput.parentElement;
    ['dragenter', 'dragover'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(name => {
      dropZone.addEventListener(name, (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
      });
    });
    dropZone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    });

    // Voice Dictation
    el.btnVoiceInput.addEventListener('click', toggleVoiceDictation);

    // Audio Playback
    el.btnListenEnglish.addEventListener('click', () => speak(el.englishOutput.value, 'en-US'));
    el.btnListenHindi.addEventListener('click', () => speak(el.hindiOutput.value, 'hi-IN'));

    // Copy to Clipboard
    el.btnCopyEnglish.addEventListener('click', () => copyText(el.englishOutput.value, el.btnCopyEnglish, el.englishOutput.innerHTML));
    el.btnCopyHindi.addEventListener('click', () => copyText(el.hindiOutput.value, el.btnCopyHindi, el.hindiOutput.innerHTML));

    // Download Text
    el.btnDownloadEnglish.addEventListener('click', () => downloadFile('themi_translation_english.txt', el.englishOutput.value));
    el.btnDownloadHindi.addEventListener('click', () => downloadFile('themi_translation_hindi.txt', el.hindiOutput.value));

    // History Archive
    el.btnToggleHistory.addEventListener('click', () => el.historyDrawer.classList.toggle('hidden'));
    el.btnCloseHistory.addEventListener('click', () => el.historyDrawer.classList.add('hidden'));
    el.btnClearHistory.addEventListener('click', () => {
      if (confirm('Clear translation archive?')) {
        state.history = [];
        localStorage.removeItem('themi_history');
        renderHistory();
      }
    });

    // AI Chatbot Form & Action Chips
    el.aiPromptForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = el.aiInputText.value.trim();
      if (query) {
        handleAICall(query, 'chat');
        el.aiInputText.value = '';
      }
    });

    document.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const action = chip.getAttribute('data-action');
        handleAICall(null, action);
      });
    });
  }

  function updateCounts() {
    const chars = el.kannadaInput.value.length;
    el.inputCharCount.textContent = `${chars} characters`;

    const enWords = el.englishOutput.value.trim() ? el.englishOutput.value.trim().split(/\s+/).length : 0;
    el.enWordCount.textContent = `${enWords} words`;

    const hiWords = el.hindiOutput.value.trim() ? el.hindiOutput.value.trim().split(/\s+/).length : 0;
    el.hiWordCount.textContent = `${hiWords} words`;
  }

  /**
   * Primary Translation Call
   */
  async function translateScript() {
    const text = el.kannadaInput.value.trim();
    if (!text) {
      alert('Please enter Kannada text or upload a document to translate.');
      el.kannadaInput.focus();
      return;
    }

    state.isTranslating = true;
    if (state.selectedTargetLang === 'en' || state.selectedTargetLang === 'dual') {
      el.englishLoading.classList.remove('hidden');
    }
    if (state.selectedTargetLang === 'hi' || state.selectedTargetLang === 'dual') {
      el.hindiLoading.classList.remove('hidden');
    }
    el.btnTranslate.disabled = true;

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          targetLang: state.selectedTargetLang,
          preservationMode: 'english_italics'
        })
      });

      if (!response.ok) {
        throw new Error(`Server status: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.english) el.englishOutput.value = data.english;
      if (data.hindi) el.hindiOutput.value = data.hindi;
      updateCounts();

      // Save to history
      saveToHistory({
        kannada: text,
        english: data.english || el.englishOutput.value,
        hindi: data.hindi || el.hindiOutput.value,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

    } catch (err) {
      console.error('Translation error:', err);
      // Client-side fallback
      performClientFallback(text);
    } finally {
      state.isTranslating = false;
      el.englishLoading.classList.add('hidden');
      el.hindiLoading.classList.add('hidden');
      el.btnTranslate.disabled = false;
      refreshIcons();
    }
  }

  function performClientFallback(text) {
    console.error('Translation network error for text of length:', text.length);
    if (el.englishOutput && (!el.englishOutput.value || !el.englishOutput.value.trim())) {
      el.englishOutput.innerHTML = '<span class="text-[#c29b38] italic font-editorial text-sm">Translation server is processing large document or encountered a temporary connection delay. Please click "Translate" to retry.</span>';
    }
  }

  /**
   * Interactive AI Chatbot Handler
   */
  async function handleAICall(query, actionType) {
    const originalKannada = el.kannadaInput.value;
    const currentEnglish = el.englishOutput.value;
    const currentHindi = el.hindiOutput.value;

    const userDisplayText = query || getActionLabel(actionType);
    appendChatMessage('user', userDisplayText);

    const typingId = appendTypingIndicator();

    try {
      const response = await fetch('/api/ai/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          actionType,
          originalKannada,
          currentEnglish,
          currentHindi
        })
      });

      removeTypingIndicator(typingId);

      if (!response.ok) {
        throw new Error('AI Assistant request failed');
      }

      const data = await response.json();
      renderAIResponse(data);

    } catch (err) {
      removeTypingIndicator(typingId);
      console.error('AI error:', err);
      appendChatMessage('assistant', `⚠️ Unable to process request: ${err.message}. Please try again.`);
    }
  }

  function getActionLabel(action) {
    switch (action) {
      case 'tone_formal': return 'Make translation formal & professional';
      case 'tone_casual': return 'Make translation conversational & natural';
      case 'tone_literary': return 'Stylize with poetic & literary depth';
      case 'alternatives': return 'Provide alternative phrasings';
      case 'explain': return 'Explain Kannada meaning and grammar';
      default: return action;
    }
  }

  function renderAIResponse(data) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'ai-msg received flex flex-col gap-2.5';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between text-xs text-[#c29b38] font-serif font-semibold';
    header.innerHTML = `
      <span class="flex items-center gap-1.5"><i data-lucide="feather" class="w-3.5 h-3.5"></i> Editorial Assistant</span>
      <span class="text-[10px] text-[#a8a29e] font-sans font-normal">Just now</span>
    `;
    msgDiv.appendChild(header);

    // Message Body
    const body = document.createElement('div');
    body.className = 'text-xs text-[#1c1917] dark:text-[#f7f4ed] leading-relaxed space-y-1.5 font-editorial text-sm';
    body.innerHTML = parseSimpleMarkdown(data.reply);
    msgDiv.appendChild(body);

    // If revisions proposed, provide clean "Apply" button
    const hasNewEnglish = data.revisedEnglish && data.revisedEnglish !== el.englishOutput.value;
    const hasNewHindi = data.revisedHindi && data.revisedHindi !== el.hindiOutput.value;

    if (hasNewEnglish || hasNewHindi) {
      const actionsBar = document.createElement('div');
      actionsBar.className = 'pt-2 mt-1 border-t border-[#e7e3da] dark:border-[#2a2624] flex flex-wrap gap-2 items-center';

      if (hasNewEnglish && (state.selectedTargetLang === 'en' || state.selectedTargetLang === 'dual')) {
        const btnEn = document.createElement('button');
        btnEn.className = 'px-3 py-1 rounded-lg bg-[#1c1917] dark:bg-[#c29b38] text-white dark:text-[#1c1917] font-serif font-semibold text-xs tracking-wider shadow-xs hover:opacity-90 flex items-center gap-1';
        btnEn.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Apply to English`;
        btnEn.onclick = () => {
          el.englishOutput.value = data.revisedEnglish;
          flashElement(el.englishOutput);
          updateCounts();
          btnEn.disabled = true;
          btnEn.textContent = '✓ Applied';
        };
        actionsBar.appendChild(btnEn);
      }

      if (hasNewHindi && (state.selectedTargetLang === 'hi' || state.selectedTargetLang === 'dual')) {
        const btnHi = document.createElement('button');
        btnHi.className = 'px-3 py-1 rounded-lg bg-[#1c1917] dark:bg-[#c29b38] text-white dark:text-[#1c1917] font-serif font-semibold text-xs tracking-wider shadow-xs hover:opacity-90 flex items-center gap-1';
        btnHi.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i> Apply to Hindi`;
        btnHi.onclick = () => {
          el.hindiOutput.value = data.revisedHindi;
          flashElement(el.hindiOutput);
          updateCounts();
          btnHi.disabled = true;
          btnHi.textContent = '✓ Applied';
        };
        actionsBar.appendChild(btnHi);
      }

      msgDiv.appendChild(actionsBar);
    }

    el.aiChatBox.appendChild(msgDiv);
    el.aiChatBox.scrollTop = el.aiChatBox.scrollHeight;
    refreshIcons();
  }

  function appendChatMessage(sender, text) {
    const msg = document.createElement('div');
    if (sender === 'user') {
      msg.className = 'ai-msg sent font-serif text-xs';
      msg.innerHTML = `<p class="leading-relaxed font-medium">${escapeHtml(text)}</p>`;
    } else {
      msg.className = 'ai-msg received font-editorial text-sm';
      msg.innerHTML = `<p class="leading-relaxed">${escapeHtml(text)}</p>`;
    }
    el.aiChatBox.appendChild(msg);
    el.aiChatBox.scrollTop = el.aiChatBox.scrollHeight;
  }

  function appendTypingIndicator() {
    const id = 'typing_' + Date.now();
    const ind = document.createElement('div');
    ind.id = id;
    ind.className = 'ai-msg received flex items-center space-x-2 text-xs text-[#a8a29e] font-editorial italic';
    ind.innerHTML = `
      <i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin text-[#c29b38]"></i>
      <span>Editorial assistant is formulating revisions...</span>
    `;
    el.aiChatBox.appendChild(ind);
    el.aiChatBox.scrollTop = el.aiChatBox.scrollHeight;
    refreshIcons();
    return id;
  }

  function removeTypingIndicator(id) {
    const elem = document.getElementById(id);
    if (elem) elem.remove();
  }

  function parseSimpleMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^### (.*$)/gim, '<h4 class="font-serif font-bold text-[#1c1917] dark:text-[#f7f4ed] mt-1 text-sm">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="font-serif font-bold text-[#1c1917] dark:text-[#f7f4ed] mt-1 text-sm">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[#1c1917] dark:text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="name-italic">$1</em>')
      .replace(/^\s*-\s+(.*$)/gim, '<div class="flex items-start gap-1.5 ml-1">• <span>$1</span></div>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Text-to-Speech
   */
  function speak(text, lang) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\*([^*\n\r]+)\*/g, '$1');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Voice Dictation
   */
  function toggleVoiceDictation() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (state.isListeningVoice) {
      if (state.recognition) state.recognition.stop();
      state.isListeningVoice = false;
      el.btnVoiceInput.classList.remove('text-rose-500', 'animate-pulse');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'kn-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      state.isListeningVoice = true;
      el.btnVoiceInput.classList.add('text-rose-500', 'animate-pulse');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      el.kannadaInput.value += (el.kannadaInput.value ? ' ' : '') + transcript;
      updateCounts();
    };

    recognition.onerror = () => {
      state.isListeningVoice = false;
      el.btnVoiceInput.classList.remove('text-rose-500', 'animate-pulse');
    };

    recognition.onend = () => {
      state.isListeningVoice = false;
      el.btnVoiceInput.classList.remove('text-rose-500', 'animate-pulse');
    };

    state.recognition = recognition;
    recognition.start();
  }

  /**
   * Clipboard & Download (Clean text, no asterisks)
   */
  function copyText(text, btn, htmlContent) {
    if (!text && !htmlContent) return;
    const cleanText = (text || '').replace(/\*([^*\n\r]+)\*/g, '$1');

    if (navigator.clipboard && window.ClipboardItem && htmlContent) {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([cleanText], { type: 'text/plain' });
      navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })
      ]).catch(() => {
        navigator.clipboard.writeText(cleanText);
      });
    } else {
      navigator.clipboard.writeText(cleanText);
    }

    const origHtml = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="check" class="w-4 h-4 text-emerald-600"></i>';
    refreshIcons();
    setTimeout(() => {
      btn.innerHTML = origHtml;
      refreshIcons();
    }, 1500);
  }

  function downloadFile(filename, content) {
    if (!content) return;
    const cleanText = content.replace(/\*([^*\n\r]+)\*/g, '$1');
    const blob = new Blob([cleanText], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /**
   * History
   */
  function saveToHistory(entry) {
    state.history.unshift(entry);
    if (state.history.length > 20) state.history.pop();
    localStorage.setItem('themi_history', JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    const list = el.historyList;
    list.innerHTML = '';

    if (state.history.length === 0) {
      list.innerHTML = '<div class="text-xs text-[#a8a29e] text-center py-8 font-editorial italic">No recent translations recorded.</div>';
      return;
    }

    state.history.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-xl bg-[#f7f4ed] dark:bg-[#1f1c1a] border border-[#e7e3da] dark:border-[#2a2624] flex flex-col gap-1 cursor-pointer hover:border-[#c29b38] transition';
      card.innerHTML = `
        <div class="text-[10px] text-[#a8a29e]">${item.timestamp}</div>
        <p class="font-kannada text-xs font-semibold text-[#1c1917] dark:text-[#f7f4ed] line-clamp-1">${escapeHtml(item.kannada)}</p>
        <p class="text-[11px] text-[#78716c] dark:text-[#a8a29e] line-clamp-1 font-editorial italic">${escapeHtml(item.english || item.hindi)}</p>
      `;
      card.onclick = () => {
        el.kannadaInput.value = item.kannada;
        if (item.english) el.englishOutput.value = item.english;
        if (item.hindi) el.hindiOutput.value = item.hindi;
        updateCounts();
        el.historyDrawer.classList.add('hidden');
      };
      list.appendChild(card);
    });
  }

  function flashElement(el) {
    el.classList.remove('highlight-update');
    void el.offsetWidth;
    el.classList.add('highlight-update');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Run
  document.addEventListener('DOMContentLoaded', init);

})();
