const STORAGE_KEY = 'dutchDictaArticles';
const WORD_BOOK_KEY = 'dutchDictaWordBook';
const DB_NAME = 'dutchDictaAudioDB';
const DB_STORE = 'audioFiles';

let articles = [];
let wordBook = [];
let selectedArticleId = null;
let selectedWordBookId = null;
let currentReview = null;
let reviewAudio = new Audio();
let reviewTimer = null;
let audioBlobCache = new Map();

const elements = {
  articleForm: document.getElementById('article-form'),
  articleCreator: document.getElementById('article-creator'),
  title: document.getElementById('article-title'),
  source: document.getElementById('article-source'),
  tags: document.getElementById('article-tags'),
  articles: document.getElementById('articles'),
  emptyList: document.getElementById('empty-list'),
  articleDetail: document.getElementById('article-detail'),
  detailTitle: document.getElementById('detail-title'),
  detailMeta: document.getElementById('detail-meta'),
  detailMastery: document.getElementById('detail-mastery'),
  detailReviewCount: document.getElementById('detail-review-count'),
  backToList: document.getElementById('back-to-list'),
  articlePlayAll: document.getElementById('article-play-all'),
  sentenceForm: document.getElementById('sentence-form'),
  sentenceText: document.getElementById('sentence-text'),
  sentenceTranslation: document.getElementById('sentence-translation'),
  sentenceAudio: document.getElementById('sentence-audio'),
  sentenceDifficulty: document.getElementById('sentence-difficulty'),
  sentenceTags: document.getElementById('sentence-tags'),
  sentenceAudioInfo: document.getElementById('sentence-audio-info'),
  sentenceReset: document.getElementById('sentence-reset'),
  sentences: document.getElementById('sentences'),
  reviewSentenceDifficultyLabel: document.getElementById('review-sentence-difficulty'),
  reviewSentenceTagsLabel: document.getElementById('review-sentence-tags'),
  backupPanel: document.getElementById('backup-panel'),
  backupExport: document.getElementById('backup-export'),
  backupImport: document.getElementById('backup-import'),
  backupStatus: document.getElementById('backup-status'),
  pageNavButtons: document.querySelectorAll('.page-nav .nav-btn'),
  startReview: document.getElementById('start-review'),
  reviewPanel: document.getElementById('review-panel'),
  reportPanel: document.getElementById('report-panel'),
  reportTotalArticles: document.getElementById('report-total-articles'),
  reportTotalSentences: document.getElementById('report-total-sentences'),
  reportOverallMastery: document.getElementById('report-overall-mastery'),
  reportTotalWrongWords: document.getElementById('report-total-wrong-words'),
  reportTotalWrongSentences: document.getElementById('report-total-wrong-sentences'),
  reportSummary: document.getElementById('report-summary'),
  reportWordBook: document.getElementById('report-word-book'),
  wordbookPanel: document.getElementById('wordbook-panel'),
  wordbookTotalWords: document.getElementById('wordbook-total-words'),
  wordbookTotalSentences: document.getElementById('wordbook-total-sentences'),
  wordbookOverallMastery: document.getElementById('wordbook-overall-mastery'),
  wordbookPendingReview: document.getElementById('wordbook-pending-review'),
  wordbookList: document.getElementById('wordbook-list'),
  wordbookReviewAll: document.getElementById('wordbook-review-all'),
  wordbookEditPanel: document.getElementById('wordbook-edit-panel'),
  wordbookEditForm: document.getElementById('wordbook-edit-form'),
  startIncorrectReview: document.getElementById('start-incorrect-review'),
  wordbookEditWord: document.getElementById('wordbook-edit-word'),
  wordbookEditTranslation: document.getElementById('wordbook-edit-translation'),
  wordbookEditDifficulty: document.getElementById('wordbook-edit-difficulty'),
  wordbookEditSource: document.getElementById('wordbook-edit-source'),
  wordbookEditTags: document.getElementById('wordbook-edit-tags'),
  wordbookEditAudio: document.getElementById('wordbook-edit-audio'),
  wordbookEditAudioInfo: document.getElementById('wordbook-edit-audio-info'),
  wordbookEditCancel: document.getElementById('wordbook-edit-cancel'),
  reportRecent: document.getElementById('report-recent'),
  reviewTitle: document.getElementById('review-title'),
  reviewSubtitle: document.getElementById('review-subtitle'),
  quizIndex: document.getElementById('quiz-index'),
  quizTotal: document.getElementById('quiz-total'),
  quizMastery: document.getElementById('quiz-mastery'),
  sentenceNumber: document.getElementById('sentence-number'),
  playSentence: document.getElementById('play-sentence'),
  showAnswer: document.getElementById('show-answer'),
  dictationInput: document.getElementById('dictation-input'),
  submitAnswer: document.getElementById('submit-answer'),
  nextSentence: document.getElementById('next-sentence'),
  feedback: document.getElementById('feedback'),
  reviewSummary: document.getElementById('review-summary'),
  endReview: document.getElementById('end-review'),
  sentenceTemplate: document.getElementById('sentence-row-template'),
};

let db = null;

window.addEventListener('DOMContentLoaded', async () => {
  await initDatabase();
  loadArticles();
  loadWordBook();
  try {
    if (typeof showSection === 'function') showSection('list');
  } catch (err) {
    console.error('showSection error', err);
  }
  try {
    bindEvents();
  } catch (err) {
    console.error('bindEvents error', err);
  }
});

function bindEvents() {
  if (elements.articleForm && typeof handleArticleSubmit === 'function') {
    elements.articleForm.addEventListener('submit', handleArticleSubmit);
  }
  if (elements.backToList) {
    elements.backToList.addEventListener('click', () => showSection('list'));
  }
  if (elements.articlePlayAll) {
    elements.articlePlayAll.addEventListener('click', () => togglePlayAll(selectedArticleId));
  }
  if (elements.sentenceForm && typeof handleSentenceSubmit === 'function') {
    elements.sentenceForm.addEventListener('submit', handleSentenceSubmit);
  }
  if (elements.sentenceReset && typeof resetSentenceForm === 'function') {
    elements.sentenceReset.addEventListener('click', resetSentenceForm);
  }
  if (elements.startReview) {
    elements.startReview.addEventListener('click', () => startReview(selectedArticleId));
  }
  if (elements.wordbookReviewAll) {
    elements.wordbookReviewAll.addEventListener('click', () => startWordReview());
  }
  if (elements.wordbookEditForm) {
    elements.wordbookEditForm.addEventListener('submit', handleWordBookEditSubmit);
  }
  if (elements.wordbookEditCancel) {
    elements.wordbookEditCancel.addEventListener('click', closeWordBookEditPanel);
  }
  if (elements.wordbookList) {
    elements.wordbookList.addEventListener('click', handleWordbookListClick);
  }
  if (elements.startIncorrectReview) {
    elements.startIncorrectReview.addEventListener('click', () => startReview(selectedArticleId, null, true));
  }
  if (elements.playSentence) {
    elements.playSentence.addEventListener('click', playCurrentSentenceAudio);
  }
  if (elements.showAnswer) {
    elements.showAnswer.addEventListener('click', revealSentenceAnswer);
  }
  if (elements.reviewSummary) {
    elements.reviewSummary.addEventListener('click', handleReviewSummaryClick);
  }
  if (elements.submitAnswer) {
    elements.submitAnswer.addEventListener('click', handleSubmitAnswer);
  }
  if (elements.nextSentence) {
    elements.nextSentence.addEventListener('click', showNextSentence);
  }
  if (elements.endReview) {
    elements.endReview.addEventListener('click', handleEndReview);
  }
  if (elements.backupExport && typeof exportBackup === 'function') {
    elements.backupExport.addEventListener('click', exportBackup);
  }
  if (elements.backupImport) {
    elements.backupImport.addEventListener('change', handleBackupImport);
  }
  const navButtons = document.querySelectorAll('.page-nav .nav-btn');
  if (navButtons && navButtons.forEach) {
    navButtons.forEach(btn => btn.addEventListener('click', handlePageNav));
  }
}

let playAllState = {
  playing: false,
  stopRequested: false,
  currentAudio: null,
};

// loop control
playAllState.loop = false;
playAllState.loopArticleId = null;

function togglePlayAll(articleId) {
  if (!articleId) {
    alert('请先在文章列表选择一篇文章以使用连读功能。');
    return;
  }
  if (playAllState.playing) {
    playAllState.stopRequested = true;
    stopPlayAll();
  } else {
    playAllSentences(articleId);
  }
}

async function playAllSentences(articleId) {
  const article = findArticle(articleId);
  if (!article) {
    alert('找不到文章，无法连读。');
    return;
  }
  playAllState.playing = true;
  playAllState.stopRequested = false;
  updateArticlePlayButton(true);

  for (const sentence of (article.sentences || [])) {
    if (playAllState.stopRequested) break;
    try {
      if (sentence.audioId) {
        const url = await getAudioUrl(sentence.audioId);
        await playUrlSequentially(url);
      } else if ('speechSynthesis' in window) {
        await speakText(sentence.text);
      } else {
        // no audio and no TTS available: small pause
        await delay(500);
      }
      // small gap between sentences
      await delay(250);
    } catch (err) {
      console.warn('播放句子出错，跳过：', err && err.message);
      if (playAllState.stopRequested) break;
    }
  }

  playAllState.playing = false;
  playAllState.stopRequested = false;
  updateArticlePlayButton(false);
}

function stopPlayAll() {
  if (playAllState.currentAudio) {
    try { playAllState.currentAudio.pause(); } catch (e) {}
    playAllState.currentAudio = null;
  }
  playAllState.playing = false;
  playAllState.stopRequested = false;
  updateArticlePlayButton(false);
}

function updateArticlePlayButton(isPlaying) {
  if (!elements.articlePlayAll) return;
  elements.articlePlayAll.textContent = isPlaying ? '停止连读' : '连读';
  elements.articlePlayAll.classList.toggle('playing', isPlaying);
}

function updateArticleListButtons(articleId, isPlaying, isLooping) {
  // toggle play button for article list entries
  const playBtn = document.querySelector(`button.article-play-button[data-article-id="${articleId}"]`);
  const loopBtn = document.querySelector(`button.article-loop-button[data-article-id="${articleId}"]`);
  if (playBtn) playBtn.classList.toggle('playing', !!isPlaying);
  if (loopBtn) loopBtn.classList.toggle('looping', !!isLooping);
}

async function startLoopPlay(articleId) {
  if (!articleId) return;
  playAllState.loop = true;
  playAllState.loopArticleId = articleId;
  updateArticleListButtons(articleId, true, true);
  while (playAllState.loop && !playAllState.stopRequested) {
    await playAllSentences(articleId);
    if (playAllState.stopRequested) break;
    // small gap between loops
    await delay(500);
  }
  playAllState.loop = false;
  playAllState.loopArticleId = null;
  playAllState.playing = false;
  updateArticleListButtons(articleId, false, false);
}

function stopLoopPlay(articleId) {
  playAllState.loop = false;
  playAllState.stopRequested = true;
  if (playAllState.currentAudio) {
    try { playAllState.currentAudio.pause(); } catch (e) {}
    playAllState.currentAudio = null;
  }
  updateArticleListButtons(articleId, false, false);
}

function playUrlSequentially(url) {
  return new Promise((resolve, reject) => {
    try {
      const audio = new Audio(url);
      playAllState.currentAudio = audio;
      audio.onended = () => { playAllState.currentAudio = null; resolve(); };
      audio.onerror = (e) => { playAllState.currentAudio = null; resolve(); };
      audio.play().catch(err => { playAllState.currentAudio = null; resolve(); });
    } catch (err) { resolve(); }
  });
}

function speakText(text) {
  return new Promise((resolve) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'nl-NL';
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      speechSynthesis.speak(utter);
    } catch (e) { resolve(); }
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateReviewProgress(current, total) {
  if (!elements.reviewPanel || !total) return;
  const progress = Math.max(0, Math.min(100, (current / total) * 100));
  elements.reviewPanel.style.setProperty('--review-progress', `${progress}%`);
}

function updateReviewNavigationLabel(current, total) {
  if (!elements.nextSentence) return;
  elements.nextSentence.textContent = current >= total ? '完成复习' : '下一句';
}

function showSection(mode) {
  elements.articleCreator.classList.toggle('hidden', mode !== 'create');
  elements.articleDetail.classList.toggle('hidden', mode !== 'edit');
  elements.reviewPanel.classList.toggle('hidden', mode !== 'review');
  elements.wordbookPanel.classList.toggle('hidden', mode !== 'wordbook');
  elements.backupPanel.classList.toggle('hidden', mode !== 'backup');
  elements.reportPanel.classList.toggle('hidden', mode !== 'report');
  document.getElementById('article-list').classList.toggle('hidden', mode !== 'list');
  setActiveNav(mode);
  if (mode === 'list') {
    selectedArticleId = null;
    renderArticleList();
  }
  if (mode === 'wordbook') {
    renderWordBookPage();
  }
  if (mode === 'report') showReport();
}

function handleEndReview() {
  if (currentReview && currentReview.completed) {
    currentReview = null;
  }
  showSection('list');
}

function setActiveNav(mode) {
  elements.pageNavButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.page === mode);
  });
}

function handlePageNav(event) {
  const page = event.currentTarget.dataset.page;
  if (page === 'list') {
    showSection('list');
  } else if (page === 'create') {
    showSection('create');
  } else if (page === 'backup') {
    showSection('backup');
  } else if (page === 'edit') {
    if (!selectedArticleId) {
      alert('请先在文章列表选择一篇文章以进入编辑页面。');
      showSection('list');
      return;
    }
    openArticleDetail(selectedArticleId);
  } else if (page === 'review') {
    if (!selectedArticleId) {
      alert('请先在文章列表选择一篇文章以进入复习页面。');
      showSection('list');
      return;
    }
    startReview(selectedArticleId);
  } else if (page === 'wordbook') {
    showSection('wordbook');
  } else if (page === 'report') {
    showSection('report');
  }
}

async function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = event => {
      db = event.target.result;
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function loadArticles() {
  const raw = localStorage.getItem(STORAGE_KEY);
  try {
    articles = raw ? JSON.parse(raw) : [];
  } catch (e) {
    articles = [];
  }
}

function saveArticles() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
}

function loadWordBook() {
  const raw = localStorage.getItem(WORD_BOOK_KEY);
  try {
    wordBook = raw ? JSON.parse(raw) : [];
  } catch (e) {
    wordBook = [];
  }
}

function saveWordBook() {
  localStorage.setItem(WORD_BOOK_KEY, JSON.stringify(wordBook));
}

function handleArticleSubmit(event) {
  event.preventDefault();

  const title = elements.title.value.trim();
  const source = elements.source.value.trim();
  const tags = splitTags(elements.tags.value);

  if (!title) {
    elements.title.focus();
    return;
  }

  const now = new Date().toISOString();
  const article = {
    id: generateId(),
    title,
    source,
    tags,
    sentences: [],
    reviewCount: 0,
    reviewTimes: [],
    masteryScore: 0,
    createdAt: now,
    updatedAt: now,
  };

  articles.push(article);
  saveArticles();
  elements.articleForm.reset();
  openArticleDetail(article.id);
}

function tokenizeWords(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function getMistypedWords(target, answer) {
  const targetWords = tokenizeWords(target);
  const answerWords = tokenizeWords(answer);
  const wrong = [];
  const length = Math.max(targetWords.length, answerWords.length);
  for (let i = 0; i < length; i += 1) {
    const expected = targetWords[i] || '';
    const actual = answerWords[i] || '';
    if (expected && expected !== actual) {
      wrong.push(expected);
    }
  }
  return Array.from(new Set(wrong));
}

function getMistypedWordPairs(target, answer) {
  const targetWords = tokenizeWords(target);
  const answerWords = tokenizeWords(answer);
  const pairs = [];
  const answerUsed = new Set();

  for (let i = 0; i < targetWords.length; i++) {
    const targetWord = targetWords[i];
    if (!targetWord) continue;

    let matchIdx = -1;
    let exactMatch = false;

    // 第一步：在周围范围内找完全相同的单词（避免级联错位）
    for (let j = Math.max(0, i - 1); j < Math.min(answerWords.length, i + 3); j++) {
      if (!answerUsed.has(j) && answerWords[j] === targetWord) {
        matchIdx = j;
        exactMatch = true;
        break;
      }
    }

    // 第二步：如果没找到完全相同的，找最相近的单词
    if (matchIdx === -1) {
      let bestScore = -1;
      for (let j = 0; j < answerWords.length; j++) {
        if (answerUsed.has(j)) continue;
        const dist = levenshteinDistance(targetWord, answerWords[j]);
        const posDist = Math.abs(i - j);
        // 综合考虑编辑距离和位置距离
        const score = 100 - dist * 10 - posDist * 5;
        if (score > bestScore && score > 50) {
          bestScore = score;
          matchIdx = j;
        }
      }
    }

    // 标记已使用
    if (matchIdx >= 0) {
      answerUsed.add(matchIdx);
      const answerWord = answerWords[matchIdx];
      if (!exactMatch && targetWord !== answerWord) {
        pairs.push({ expected: targetWord, actual: answerWord });
      }
    } else {
      // 未找到匹配，表示漏写
      pairs.push({ expected: targetWord, actual: '（缺失）' });
    }
  }

  return pairs;
}

function recordWrongWordEntry(word, sentence, article) {
  const key = String(word).toLowerCase();
  const timestamp = new Date().toISOString();
  let entry = wordBook.find(item => String(item.word).toLowerCase() === key);
  if (!entry) {
    entry = {
      id: generateId(),
      word,
      count: 1,
      lastSeen: timestamp,
      examples: [`${article.title}：${sentence.text}`],
      translation: '',
      difficulty: sentence.difficulty || '',
      source: article.title || article.source || '',
      tags: sentence.tags || [],
      masteryScore: 0,
      reviewCount: 0,
      audioId: null,
      audioName: '',
      history: [],
    };
    wordBook.push(entry);
  } else {
    entry.count += 1;
    entry.lastSeen = timestamp;
    if (!entry.source) {
      entry.source = article.title || article.source || entry.source || '';
    }
    const example = `${article.title}：${sentence.text}`;
    if (!entry.examples.includes(example)) {
      entry.examples.unshift(example);
      if (entry.examples.length > 3) entry.examples.length = 3;
    }
  }
  saveWordBook();
  return entry;
}

function registerWordMistakes(sentence, answer, article) {
  const wrongWords = getMistypedWords(sentence.text, answer);
  if (!wrongWords.length) return;
  const timestamp = new Date().toISOString();

  wrongWords.forEach(word => {
    const key = word.toLowerCase();
    let entry = wordBook.find(item => item.word.toLowerCase() === key);
    if (!entry) {
      entry = {
        id: generateId(),
        word,
        count: 0,
        lastSeen: timestamp,
        examples: [],
        translation: '',
        difficulty: '',
        source: article.title || article.source || '',
        tags: [],
        masteryScore: 0,
        reviewCount: 0,
        audioId: null,
        audioName: '',
        history: [],
      };
      wordBook.push(entry);
    }
    entry.count += 1;
    entry.lastSeen = timestamp;
    if (!entry.source) {
      entry.source = article.title || article.source || entry.source || '';
    }
    const example = `${article.title}：${sentence.text}`;
    if (!entry.examples.includes(example)) {
      entry.examples.unshift(example);
    }
    if (entry.examples.length > 3) {
      entry.examples.length = 3;
    }
  });

  wordBook.sort((a, b) => b.count - a.count || new Date(b.lastSeen) - new Date(a.lastSeen));
  saveWordBook();
}
function getAudioUrl(audioId) {
  if (!audioId) return Promise.resolve('');
  if (audioBlobCache.has(audioId)) {
    return Promise.resolve(audioBlobCache.get(audioId));
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, 'readonly');
    const store = transaction.objectStore(DB_STORE);
    const request = store.get(audioId);
    request.onsuccess = () => {
      const data = request.result;
      if (!data || !data.file) {
        return resolve('');
      }
      const url = URL.createObjectURL(data.file);
      audioBlobCache.set(audioId, url);
      resolve(url);
    };
    request.onerror = () => reject(request.error);
  });
}

  function getAllAudioEntries() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, 'readonly');
      const store = transaction.objectStore(DB_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveAudioBlob(idOrKey, file) {
    const id = idOrKey || `audio-${Date.now()}`;
    const transaction = db.transaction(DB_STORE, 'readwrite');
    const store = transaction.objectStore(DB_STORE);
    store.put({ id, file });
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(id);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async function deleteAudio(audioId) {
    if (!audioId || !db) return;
    const transaction = db.transaction(DB_STORE, 'readwrite');
    const store = transaction.objectStore(DB_STORE);
    store.delete(audioId);
    if (audioBlobCache.has(audioId)) {
      const url = audioBlobCache.get(audioId);
      try { URL.revokeObjectURL(url); } catch (e) {}
      audioBlobCache.delete(audioId);
    }
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  function safeString(value) {
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : String(value);
  }

  function toNumber(value, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  function normalizeTagsValue(value) {
    if (Array.isArray(value)) {
      return value.map(tag => safeString(tag).trim()).filter(Boolean);
    }
    return value ? splitTags(safeString(value)) : [];
  }

  function normalizeSentenceForBackup(sentence) {
    const source = typeof sentence === 'string' ? { text: sentence } : (sentence || {});
    const now = new Date().toISOString();
    return {
      id: safeString(source.id) || generateId(),
      text: safeString(source.text || source.content),
      translation: safeString(source.translation || source.cn || source.note),
      tags: normalizeTagsValue(source.tags || source.tag),
      difficulty: safeString(source.difficulty || source.level),
      audioId: safeString(source.audioId || source.audio) || null,
      audioName: safeString(source.audioName),
      masteryScore: toNumber(source.masteryScore, toNumber(source.score, 0)),
      reviewCount: toNumber(source.reviewCount, toNumber(source.reviews, 0)),
      history: Array.isArray(source.history) ? source.history : (Array.isArray(source.historyEntries) ? source.historyEntries : []),
      lastReviewed: safeString(source.lastReviewed),
      createdAt: safeString(source.createdAt) || now,
      updatedAt: safeString(source.updatedAt) || now,
    };
  }

  function normalizeArticleForBackup(article) {
    const source = article || {};
    const now = new Date().toISOString();
    let rawSentences = source.sentences;
    if (!Array.isArray(rawSentences)) {
      const candidates = source.content || source.items;
      if (Array.isArray(candidates)) {
        rawSentences = candidates;
      } else if (typeof candidates === 'string') {
        rawSentences = candidates.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      } else {
        rawSentences = [];
      }
    }

    return {
      id: safeString(source.id) || generateId(),
      title: safeString(source.title).trim(),
      source: safeString(source.source),
      tags: normalizeTagsValue(source.tags || source.tag),
      sentences: rawSentences.map(normalizeSentenceForBackup).filter(sentence => sentence.text),
      reviewCount: toNumber(source.reviewCount, 0),
      reviewTimes: Array.isArray(source.reviewTimes) ? source.reviewTimes.filter(time => typeof time === 'number' && Number.isFinite(time)) : [],
      reviewSessions: Array.isArray(source.reviewSessions) ? source.reviewSessions.filter(session => session && typeof session === 'object') : [],
      masteryScore: toNumber(source.masteryScore, 0),
      createdAt: safeString(source.createdAt) || now,
      updatedAt: safeString(source.updatedAt) || now,
    };
  }

  function normalizeWordBookEntryForBackup(entry) {
    const source = entry || {};
    return {
      id: safeString(source.id) || generateId(),
      word: safeString(source.word).trim(),
      translation: safeString(source.translation),
      difficulty: safeString(source.difficulty),
      source: safeString(source.source),
      tags: normalizeTagsValue(source.tags),
      count: toNumber(source.count, 0),
      lastSeen: safeString(source.lastSeen) || new Date().toISOString(),
      examples: Array.isArray(source.examples) ? source.examples.map(safeString).filter(Boolean).slice(0, 3) : [],
      masteryScore: toNumber(source.masteryScore, toNumber(source.score, 0)),
      reviewCount: toNumber(source.reviewCount, 0),
      audioId: safeString(source.audioId) || null,
      audioName: safeString(source.audioName),
      history: Array.isArray(source.history) ? source.history : [],
    };
  }

  function getArticleImportKey(article) {
    return `${safeString(article.title).trim().toLowerCase()}|${safeString(article.source).trim().toLowerCase()}`;
  }

  async function exportBackup() {
    try {
      const audioEntries = await getAllAudioEntries();
      const audioFiles = await Promise.all(audioEntries.map(async entry => {
        const data = await blobToBase64(entry.file);
        return { id: entry.id, type: entry.file.type, data };
      }));
      const payload = {
        version: 2,
        articles: articles.map(normalizeArticleForBackup).filter(article => article.title),
        wordBook: wordBook.map(normalizeWordBookEntryForBackup).filter(entry => entry.word),
        audioFiles,
        exportedAt: new Date().toISOString(),
      };
      downloadJson(payload, `dutch-dicta-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
      elements.backupStatus.textContent = '备份已生成，可保存到本地。';
    } catch (error) {
      elements.backupStatus.textContent = `备份失败：${error.message}`;
    }
  }

  async function handleBackupImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importBackup(data);
      elements.backupStatus.textContent = `备份已导入，新增 ${result.importedCount} 篇，覆盖 ${result.overwrittenCount} 篇。`;
      renderArticleList();
      showSection('list');
    } catch (error) {
      elements.backupStatus.textContent = `导入失败：${error.message}`;
    } finally {
      elements.backupImport.value = '';
    }
  }

  async function importBackup(data) {
    if (!data || !Array.isArray(data.articles)) {
        throw new Error('无效的备份文件：找不到 articles 数组。');
      }
      const audioFilesArray = Array.isArray(data.audioFiles) ? data.audioFiles : [];
      const importPromises = audioFilesArray.map(async entry => {
        try {
          if (!entry || !entry.id || !entry.data) return;
          // entry.data may already be a data URL or base64 string
          const type = entry.type || (entry.data && entry.data.split(';')[0].split(':')[1]) || 'audio/mpeg';
          const blob = dataUrlToBlob(entry.data, type);
          await saveAudioBlob(entry.id, blob);
        } catch (err) {
          console.warn('跳过无法解析的音频条目', entry && entry.id, err && err.message);
        }
      });
    await Promise.all(importPromises);
    const existingById = new Map(articles.map(item => [item.id, item]));
    const existingByKey = new Map(articles.map(item => [getArticleImportKey(item), item]));
    let importedCount = 0;
    let overwrittenCount = 0;

    for (const rawArticle of data.articles) {
      const article = normalizeArticleForBackup(rawArticle);
      if (!article.title) continue;

      const key = getArticleImportKey(article);
      let targetArticle = existingById.get(article.id) || existingByKey.get(key);
      if (targetArticle) {
        const oldAudioIds = new Set((targetArticle.sentences || []).map(s => s.audioId).filter(Boolean));
        const newAudioIds = new Set((article.sentences || []).map(s => s.audioId).filter(Boolean));
        await Promise.all(Array.from(oldAudioIds).filter(id => !newAudioIds.has(id)).map(id => deleteAudio(id)));
        const existingId = targetArticle.id;
        Object.assign(targetArticle, article);
        targetArticle.id = existingId;
        overwrittenCount += 1;
      } else {
        if (existingById.has(article.id)) {
          article.id = generateId();
        }
        articles.push(article);
        existingById.set(article.id, article);
        existingByKey.set(key, article);
        importedCount += 1;
      }
    }

    const importedWords = Array.isArray(data.wordBook) ? data.wordBook : [];
    importedWords.map(normalizeWordBookEntryForBackup).forEach(entry => {
      if (!entry.word) return;
      const key = entry.word.trim().toLowerCase();
      let existing = wordBook.find(item => item.word.trim().toLowerCase() === key);
      if (!existing) {
        existing = {
          id: entry.id || generateId(),
          word: entry.word,
          translation: entry.translation || '',
          difficulty: entry.difficulty || '',
          source: entry.source || '',
          tags: Array.isArray(entry.tags) ? entry.tags : (entry.tags ? [entry.tags] : []),
          count: entry.count || 0,
          lastSeen: entry.lastSeen || new Date().toISOString(),
          examples: Array.isArray(entry.examples) ? entry.examples.slice(0, 3) : [],
          masteryScore: typeof entry.masteryScore === 'number' ? entry.masteryScore : (entry.score || 0),
          reviewCount: typeof entry.reviewCount === 'number' ? entry.reviewCount : 0,
          audioId: entry.audioId || null,
          audioName: entry.audioName || '',
          history: Array.isArray(entry.history) ? entry.history : [],
        };
        wordBook.push(existing);
        return;
      }

      if (entry.id && !existing.id) existing.id = entry.id;
      existing.translation = entry.translation || existing.translation || '';
      existing.difficulty = entry.difficulty || existing.difficulty || '';
      existing.source = entry.source || existing.source || '';
      existing.tags = Array.isArray(entry.tags)
        ? Array.from(new Set([...(existing.tags || []), ...entry.tags]))
        : existing.tags;
      existing.count = Math.max(existing.count || 0, entry.count || 0);
      existing.lastSeen = existing.lastSeen > (entry.lastSeen || existing.lastSeen) ? existing.lastSeen : (entry.lastSeen || existing.lastSeen);
      existing.masteryScore = typeof entry.masteryScore === 'number' ? Math.max(existing.masteryScore || 0, entry.masteryScore) : existing.masteryScore;
      existing.reviewCount = Math.max(existing.reviewCount || 0, entry.reviewCount || 0);
      existing.audioId = entry.audioId || existing.audioId || null;
      existing.audioName = entry.audioName || existing.audioName || '';
      existing.history = Array.isArray(entry.history) ? Array.from(new Set([...(existing.history || []), ...entry.history])) : existing.history;
      (entry.examples || []).forEach(example => {
        if (!existing.examples.includes(example)) {
          existing.examples.unshift(example);
        }
      });
      if ((existing.examples || []).length > 3) existing.examples.length = 3;
    });
    wordBook.sort((a, b) => b.count - a.count || new Date(b.lastSeen) - new Date(a.lastSeen));
    saveWordBook();
    saveArticles();
    return { importedCount, overwrittenCount };
  }

  function downloadJson(value, filename) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToBlob(dataUrl, type) {
    if (!dataUrl) {
      throw new Error('音频数据为空。');
    }
    const value = safeString(dataUrl);
    const base64 = value.includes(',') ? value.split(',').pop() : value;
    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type });
  }

function getIncorrectSentenceIds(article) {
  return (article.sentences || []).filter(sentence => {
    if (!sentence.history || !sentence.history.length) return true;
    const latest = sentence.history[0];
    return typeof latest.score !== 'number' || latest.score < 100;
  }).map(sentence => sentence.id);
}

function startReview(articleId, focusSentenceId = null, onlyIncorrect = false) {
  const article = findArticle(articleId);
  if (!article || article.sentences.length === 0) {
    alert('请先为文章添加至少一个句子。');
    return;
  }

  const sentenceIds = onlyIncorrect ? getIncorrectSentenceIds(article) : article.sentences.map(s => s.id);
  if (!sentenceIds.length) {
    alert('当前文章没有需要复习的错误句子。');
    return;
  }

  selectedArticleId = articleId;
  const now = Date.now();
  currentReview = {
    articleId,
    sentenceIds,
    index: 0,
    doneIds: new Set(),
    sessionScores: [],
    startTime: now,
    onlyIncorrect,
  };

  if (focusSentenceId) {
    const idx = currentReview.sentenceIds.indexOf(focusSentenceId);
    if (idx >= 0) currentReview.index = idx;
  }

  clearReviewSummary();
  if (elements.endReview) elements.endReview.textContent = '结束复习';
  renderReviewItem();
  showSection('review');
}

async function renderReviewItem() {
  if (!currentReview) return;
  if (currentReview.type === 'word') {
    const word = wordBook.find(w => w.id === currentReview.wordIds[currentReview.index]);
    if (!word) return;
    elements.reviewTitle.textContent = `错词复习：${word.word}`;
    elements.reviewSubtitle.textContent = word.source ? `来源：${word.source}` : '';
    elements.quizIndex.textContent = currentReview.index + 1;
    elements.quizTotal.textContent = currentReview.wordIds.length;
    updateReviewProgress(currentReview.index + 1, currentReview.wordIds.length);
    updateReviewNavigationLabel(currentReview.index + 1, currentReview.wordIds.length);
    elements.quizMastery.textContent = `${Math.round(word.masteryScore || 0)}%`;
    elements.sentenceNumber.textContent = `词语 ${currentReview.index + 1}`;
    elements.reviewSentenceDifficultyLabel.textContent = word.difficulty ? `难度：${word.difficulty}` : '难度：未设置';
    elements.reviewSentenceTagsLabel.textContent = word.translation ? `中文：${word.translation}` : (word.examples.length ? `例句：${word.examples[0]}` : '暂无中文说明');
    elements.dictationInput.value = '';
    elements.dictationInput.placeholder = '请拼写这个错词的荷兰语形式';
    showFeedback('', '');
    clearReviewSummary();
    const audioUrl = await getAudioUrl(word.audioId);
    reviewAudio.src = audioUrl;
    reviewAudio.pause();
    return;
  }

  const article = findArticle(currentReview.articleId);
  const sentence = article.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  if (!sentence) return;

  const titlePrefix = currentReview.onlyIncorrect ? '错句集复习' : '听写';
  elements.reviewTitle.textContent = `${titlePrefix}：${article.title}`;
  elements.reviewSubtitle.textContent = article.source ? `来源：${article.source}` : '';
  elements.quizIndex.textContent = currentReview.index + 1;
  elements.quizTotal.textContent = currentReview.sentenceIds.length;
  updateReviewProgress(currentReview.index + 1, currentReview.sentenceIds.length);
  updateReviewNavigationLabel(currentReview.index + 1, currentReview.sentenceIds.length);
  elements.quizMastery.textContent = `${Math.round(article.masteryScore)}%`;
  elements.sentenceNumber.textContent = `句子 ${currentReview.index + 1}`;
  elements.reviewSentenceDifficultyLabel.textContent = sentence.difficulty ? `难度：${sentence.difficulty}` : '难度：未设置';
  elements.reviewSentenceTagsLabel.textContent = sentence.tags.length ? `标签：${sentence.tags.join('，')}` : '标签：无';
  elements.dictationInput.value = '';
  elements.dictationInput.placeholder = '听写后在这里输入荷兰语句子';
  showFeedback('', '');
  clearReviewSummary();
  const audioUrl = await getAudioUrl(sentence.audioId);
  reviewAudio.src = audioUrl;
  reviewAudio.pause();
}

async function playCurrentSentenceAudio() {
  if (!currentReview) return;
  if (currentReview.type === 'word') {
    const word = wordBook.find(w => w.id === currentReview.wordIds[currentReview.index]);
    if (!word || !word.audioId) {
      alert('当前词条尚未上传音频。');
      return;
    }
    const audioUrl = await getAudioUrl(word.audioId);
    reviewAudio.src = audioUrl;
    reviewAudio.play();
    return;
  }

  const article = findArticle(currentReview.articleId);
  const sentence = article.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  if (!sentence || !sentence.audioId) {
    alert('当前句子尚未上传音频。');
    return;
  }
  const audioUrl = await getAudioUrl(sentence.audioId);
  reviewAudio.src = audioUrl;
  reviewAudio.play();
}

function revealSentenceAnswer() {
  if (!currentReview) return;
  if (currentReview.type === 'word') {
    const word = wordBook.find(w => w.id === currentReview.wordIds[currentReview.index]);
    if (!word) return;
    const translationText = word.translation ? `\n中文：${word.translation}` : '';
    showFeedback(`正确文本：${word.word}${translationText}`, 'info');
    return;
  }
  const article = findArticle(currentReview.articleId);
  const sentence = article.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  const translationText = sentence.translation ? `\n翻译：${sentence.translation}` : '';
  showFeedback(`正确文本：${sentence.text}${translationText}`, 'info');
}

function handleSubmitAnswer() {
  if (!currentReview) return;
  const answer = elements.dictationInput.value.trim();
  if (!answer) {
    showFeedback(currentReview.type === 'word' ? '请输入你的拼写内容，然后提交。' : '请输入你的听写内容，然后提交。', 'warning');
    return;
  }

  if (currentReview.type === 'word') {
    const word = wordBook.find(w => w.id === currentReview.wordIds[currentReview.index]);
    if (!word) return;
    const normalizedTarget = normalizeText(word.word);
    const normalizedAnswer = normalizeText(answer);
    const score = calculateScore(normalizedTarget, normalizedAnswer);
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewed = new Date().toISOString();
    if (score < 100) {
      word.count += 1;
      word.lastSeen = new Date().toISOString();
    }
    word.masteryScore = Math.min(100, (word.masteryScore || 0) + score * 0.25);
    word.history = word.history || [];
    word.history.unshift({
      timestamp: new Date().toISOString(),
      answer,
      score,
      correctText: word.word,
    });
    saveWordBook();

    currentReview.doneIds.add(word.id);
    currentReview.sessionScores.push({
      sentence: word.word,
      score,
      answer,
      correctText: word.word,
    });

    showFeedback(`得分：${score}% 。已累计复习 ${word.reviewCount} 次。`, score >= 90 ? 'success' : 'warning');
    elements.quizMastery.textContent = `${Math.round(word.masteryScore || 0)}%`;
    renderWordReviewResult(word, score, answer);
    if (currentReview.doneIds.size >= currentReview.wordIds.length) {
      showFeedback('本轮错词已全部提交，点击“完成复习”查看总结。', 'success');
    }
    return;
  }

  const article = findArticle(currentReview.articleId);
  const sentence = article?.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  if (!sentence) return;

  const normalizedTarget = normalizeText(sentence.text);
  const normalizedAnswer = normalizeText(answer);
  const score = calculateScore(normalizedTarget, normalizedAnswer);
  const lastScore = sentence.masteryScore || 0;
  sentence.reviewCount = (sentence.reviewCount || 0) + 1;
  sentence.lastReviewed = new Date().toISOString();
  sentence.masteryScore = Math.min(100, lastScore + score * 0.25);
  sentence.history = sentence.history || [];
  sentence.history.unshift({
    timestamp: new Date().toISOString(),
    answer,
    score,
    correctText: sentence.text,
  });

  const wrongPairs = getMistypedWordPairs(sentence.text, answer);
  if (article) {
    article.reviewCount = (article.reviewCount || 0) + 1;
    article.masteryScore = calculateArticleMastery(article);
    article.updatedAt = new Date().toISOString();
    saveArticles();
  }

  currentReview.lastWrongPairs = wrongPairs;
  currentReview.doneIds.add(sentence.id);
  currentReview.sessionScores.push({
    sentence: sentence.text,
    score,
    answer,
    correctText: sentence.text,
  });

  showFeedback(`得分：${score}% 。已累计复习 ${sentence.reviewCount} 次。`, score >= 90 ? 'success' : 'warning');
  elements.quizMastery.textContent = `${Math.round(article?.masteryScore || 0)}%`;
  renderSentenceMistakeSummary(sentence, article, currentReview.lastWrongPairs || [], answer);

  if (currentReview.doneIds.size >= currentReview.sentenceIds.length) {
    showFeedback('本篇文章已全部提交，点击“完成复习”查看总结。', 'success');
  }
}

function renderWordReviewResult(word, score, userAnswer) {
  if (!elements.reviewSummary) return;
  
  elements.reviewSummary.innerHTML = `
    <div class="review-summary-header">
      <h3>拼写结果</h3>
      <div class="review-summary-score">得分：${score}%</div>
    </div>
    <div class="review-summary-body">
      <div class="review-sentence-compare">
        <div class="review-sentence-row review-sentence-original">
          <div class="review-sentence-label">正确拼法</div>
          <div class="review-sentence-text">${escapeHtml(word.word)}</div>
        </div>
        <div class="review-sentence-row review-sentence-user">
          <div class="review-sentence-label">你的拼写</div>
          <div class="review-sentence-text">${escapeHtml(userAnswer)}</div>
        </div>
      </div>
      ${word.translation ? `<div class="review-summary-note">中文：${escapeHtml(word.translation)}</div>` : ''}
      <div class="review-summary-note">拼写记录已自动保存。</div>
    </div>
  `;
  elements.reviewSummary.classList.remove('hidden');
}

function showNextSentence() {
  if (!currentReview) return;
  
  if (currentReview.type === 'word') {
    const total = currentReview.wordIds.length;
    let nextIndex = currentReview.index + 1;
    while (nextIndex < total && currentReview.doneIds.has(currentReview.wordIds[nextIndex])) {
      nextIndex += 1;
    }

    if (nextIndex >= total) {
      if (currentReview.doneIds.size >= total) {
        completeReview();
        return;
      }
      showFeedback('请先提交当前内容，再完成复习。', 'warning');
      return;
    }

    if (nextIndex >= 0 && nextIndex < total) {
      currentReview.index = nextIndex;
      renderReviewItem();
    }
    return;
  }
  
  const article = findArticle(currentReview.articleId);
  const total = currentReview.sentenceIds.length;
  let nextIndex = currentReview.index + 1;
  while (nextIndex < total && currentReview.doneIds.has(currentReview.sentenceIds[nextIndex])) {
    nextIndex += 1;
  }

  if (nextIndex >= total) {
    if (currentReview.doneIds.size >= total) {
      completeReview();
      return;
    }
    showFeedback('请先提交当前句子的听写结果，再完成复习。', 'warning');
    return;
  }

  if (nextIndex >= 0 && nextIndex < total) {
    currentReview.index = nextIndex;
    renderReviewItem();
  }
}

function calculateScore(target, answer) {
  if (!target || !answer) return 0;
  if (target === answer) return 100;
  const distance = levenshteinDistance(target, answer);
  const maxLen = Math.max(target.length, answer.length);
  const result = Math.max(0, Math.round((1 - distance / Math.max(maxLen, 1)) * 100));
  return result;
}

function calculateArticleMastery(article) {
  if (!article.sentences.length) return 0;
  const sum = article.sentences.reduce((total, sentence) => total + sentence.masteryScore, 0);
  return sum / article.sentences.length;
}

function getWrongSentenceSummaries() {
  const wrong = [];
  articles.forEach(article => {
    (article.sentences || []).forEach(sentence => {
      const wrongAttempts = (sentence.history || []).filter(h => h.score < 100).length;
      if (wrongAttempts > 0) {
        wrong.push({
          articleTitle: article.title,
          source: article.source || '',
          text: sentence.text,
          score: sentence.masteryScore || 0,
          wrongAttempts,
          lastReviewed: sentence.lastReviewed || '',
        });
      }
    });
  });
  return wrong.sort((a, b) => b.wrongAttempts - a.wrongAttempts || a.score - b.score || new Date(b.lastReviewed) - new Date(a.lastReviewed));
}

function showReport() {
  const totalArticles = articles.length;
  const totalSentences = articles.reduce((sum, a) => sum + (a.sentences?.length || 0), 0);
  let totalScore = 0;
  let scoredCount = 0;
  articles.forEach(article => {
    (article.sentences || []).forEach(sentence => {
      if (typeof sentence.masteryScore === 'number') {
        totalScore += sentence.masteryScore;
        scoredCount += 1;
      }
    });
  });
  const overall = scoredCount ? Math.round(totalScore / scoredCount) : 0;
  const wrongSentences = getWrongSentenceSummaries();

  if (elements.reportTotalArticles) elements.reportTotalArticles.textContent = totalArticles;
  if (elements.reportTotalSentences) elements.reportTotalSentences.textContent = totalSentences;
  if (elements.reportOverallMastery) elements.reportOverallMastery.textContent = `${overall}%`;
  if (elements.reportTotalWrongWords) elements.reportTotalWrongWords.textContent = wordBook.length;
  if (elements.reportTotalWrongSentences) elements.reportTotalWrongSentences.textContent = wrongSentences.length;

  if (elements.reportSummary) {
    const totalWordReviews = wordBook.reduce((sum, item) => sum + (item.reviewCount || 0), 0);
    const totalArticleReviews = articles.reduce((sum, article) => sum + (article.reviewCount || 0), 0);
    const totalSentenceCount = articles.reduce((sum, article) => sum + ((article.sentences || []).length), 0);
    const allReviewDurations = articles.reduce((all, article) => all.concat(article.reviewTimes || []), []);
    const totalDurationsMs = allReviewDurations.reduce((sum, d) => sum + d, 0);
    const totalSessions = allReviewDurations.length;
    // Gather all sentence-level history entries (with timestamps)
    const allHistoryEntries = articles.reduce((out, article) => {
      (article.sentences || []).forEach(s => {
        (s.history || []).forEach(h => out.push(Object.assign({ articleId: article.id }, h)));
      });
      return out;
    }, []);
    const totalReviewEvents = allHistoryEntries.length;
    const avgDurationPerEventMs = totalReviewEvents ? Math.round(totalDurationsMs / totalReviewEvents) : (totalSessions ? Math.round(totalDurationsMs / totalSessions) : 0);

    // time window helpers
    const now = new Date();
    function isSameDay(d1, d2) {
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }
    function dateKey(d) {
      return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    const eventsToday = allHistoryEntries.filter(h => { const t = new Date(h.timestamp); return isSameDay(t, now); }).length;
    const eventsLast7 = allHistoryEntries.filter(h => { const t = new Date(h.timestamp); return (now - t) <= 7 * oneDayMs; }).length;
    const eventsLast30 = allHistoryEntries.filter(h => { const t = new Date(h.timestamp); return (now - t) <= 30 * oneDayMs; }).length;

    const activeDaysSet = new Set(allHistoryEntries.filter(h => { const t = new Date(h.timestamp); return (now - t) <= 30 * oneDayMs; }).map(h => dateKey(new Date(h.timestamp))));
    const activeDays = activeDaysSet.size;

    // streaks calculation
    const allDaysSet = new Set(allHistoryEntries.map(h => dateKey(new Date(h.timestamp))));
    // current streak: count backward from today while date exists in allDaysSet
    let currentStreak = 0;
    for (let i = 0; ; i++) {
      const d = new Date(now.getTime() - i * oneDayMs);
      if (allDaysSet.has(dateKey(d))) currentStreak += 1; else break;
    }
    // longest streak: iterate over sorted unique days
    const dayKeys = Array.from(allDaysSet).map(k => new Date(k)).sort((a,b) => a-b);
    let longestStreak = 0;
    if (dayKeys.length) {
      let streak = 1;
      for (let i = 1; i < dayKeys.length; i++) {
        const prev = dayKeys[i-1];
        const cur = dayKeys[i];
        if ((cur - prev) === oneDayMs) {
          streak += 1;
        } else {
          longestStreak = Math.max(longestStreak, streak);
          streak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, streak);
    }

    // Map durations from event counts
    const studyTodayMs = eventsToday * avgDurationPerEventMs;
    const study7Ms = eventsLast7 * avgDurationPerEventMs;
    const study30Ms = eventsLast30 * avgDurationPerEventMs;
    const avgPerDayMs = Math.round((eventsLast30 * avgDurationPerEventMs) / 30);

    // build last-30-days per-day durations (ms)
    const dailyDurations = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * oneDayMs);
      const key = dateKey(d);
      const count = allHistoryEntries.filter(h => dateKey(new Date(h.timestamp)) === key).length;
      dailyDurations.push({ date: key, ms: count * avgDurationPerEventMs });
    }

    // render simple SVG bar chart for study time
    const chartHeight = 120;
    const chartWidth = 980; // will scale responsively via viewBox
    const barGap = 2;
    const barCount = dailyDurations.length;
    const barWidth = Math.max(2, Math.floor((chartWidth - (barCount - 1) * barGap) / barCount));
    const maxMs = Math.max(...dailyDurations.map(d => d.ms), 1);
    const barsSvg = dailyDurations.map((d, i) => {
      const h = Math.round((d.ms / maxMs) * (chartHeight - 20));
      const x = i * (barWidth + barGap);
      const y = chartHeight - h - 20;
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="#2563eb" rx="2"></rect>`;
    }).join('');
    // show a few x labels spaced
    const labelInterval = 7;
    const labels = dailyDurations.map((d, i) => (i % labelInterval === 0) ? `<text x="${i*(barWidth+barGap)+barWidth/2}" y="${chartHeight}" font-size="10" fill="#475569" text-anchor="middle">${d.date.split('-')[1]+'/'+d.date.split('-')[2]}</text>` : '').join('');
    const studyChartSvg = `
      <svg class="study-chart-svg" viewBox="0 0 ${chartWidth} ${chartHeight + 20}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="最近 30 天学习时间">
        <g transform="translate(8,0)">
          ${barsSvg}
        </g>
        <g transform="translate(8,0)">${labels}</g>
      </svg>`;

    // lower metrics
    const sessionsCount = totalSessions;
    const reviewedCount = totalReviewEvents;
    const avgArticleMastery = articles.length ? Math.round(articles.reduce((s,a) => s + (a.masteryScore || 0), 0) / articles.length) : 0;
    const allSentences = articles.reduce((s,a) => s.concat(a.sentences || []), []);
    const avgSentenceMastery = allSentences.length ? Math.round(allSentences.reduce((s,si) => s + (si.masteryScore || 0), 0) / allSentences.length) : 0;
    const articleReviewChart = articles
      .map(article => ({ title: article.title, count: article.reviewCount || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const articleMasteryChart = articles
      .map(article => ({ title: article.title, mastery: Math.round(article.masteryScore || 0) }))
      .sort((a, b) => b.mastery - a.mastery)
      .slice(0, 6);
    const weakestArticles = articles
      .filter(article => (article.sentences || []).length)
      .map(article => ({
        title: article.title,
        reviews: article.reviewCount || 0,
        mastery: Math.round(article.masteryScore || 0),
      }))
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 4);
    const weakestSentences = wrongSentences
      .slice()
      .sort((a, b) => a.score - b.score || b.wrongAttempts - a.wrongAttempts)
      .slice(0, 6);
    const totalMistakeWords = wordBook.length;
    const masteredMistakeWords = wordBook.filter(item => (item.masteryScore || 0) >= 90).length;
    const activeMistakeWords = wordBook.filter(item => (item.masteryScore || 0) < 90).length;
    const avgMistakeWordMastery = totalMistakeWords
      ? Math.round(wordBook.reduce((sum, item) => sum + (item.masteryScore || 0), 0) / totalMistakeWords)
      : 0;
    const mostImprovedWords = wordBook
      .slice()
      .sort((a, b) => (b.masteryScore || 0) - (a.masteryScore || 0) || (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 6);
    const stillWeakWords = wordBook
      .slice()
      .sort((a, b) => (a.masteryScore || 0) - (b.masteryScore || 0) || (b.count || 0) - (a.count || 0))
      .slice(0, 6);
    const summaryHtml = `
      <div class="report-section-title">学习时间</div>
      <div class="report-summary-grid">
        <div class="progress-card">
          <div class="progress-card-title">今天</div>
          <div class="progress-card-value">${formatDuration(studyTodayMs)}</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">本周</div>
          <div class="progress-card-value">${formatDuration(study7Ms)}</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">本月</div>
          <div class="progress-card-value">${formatDuration(study30Ms)}</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">日均</div>
          <div class="progress-card-value">${formatDuration(avgPerDayMs)}</div>
        </div>
      </div>
      <div class="report-summary-grid report-streak-grid">
        <div class="progress-card">
          <div class="progress-card-title">活跃天数</div>
          <div class="progress-card-value">${activeDays}</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">当前连续</div>
          <div class="progress-card-value">${currentStreak}天</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">最长连续</div>
          <div class="progress-card-value">${longestStreak}天</div>
        </div>
      </div>
      <div class="study-chart-card">
        <div class="study-chart-title">最近 30 天学习时间</div>
        ${studyChartSvg}
      </div>
      <div class="report-kpi-grid">
        <div class="report-kpi-card">
          <div class="report-kpi-icon">文</div>
          <div class="report-kpi-value">${articles.length}</div>
          <div class="report-kpi-label">文章</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-icon">句</div>
          <div class="report-kpi-value">${totalSentenceCount}</div>
          <div class="report-kpi-label">句子</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-icon">次</div>
          <div class="report-kpi-value">${sessionsCount}</div>
          <div class="report-kpi-label">复习轮次</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-icon">练</div>
          <div class="report-kpi-value">${reviewedCount}</div>
          <div class="report-kpi-label">已复习记录</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-icon">%</div>
          <div class="report-kpi-value">${avgArticleMastery}%</div>
          <div class="report-kpi-label">平均文章熟练度</div>
        </div>
        <div class="report-kpi-card">
          <div class="report-kpi-icon">%</div>
          <div class="report-kpi-value">${avgSentenceMastery}%</div>
          <div class="report-kpi-label">平均句子熟练度</div>
        </div>
      </div>
      <div class="report-section-title">错题单词报告</div>
      <div class="report-summary-grid">
        <div class="progress-card">
          <div class="progress-card-title">错词总数</div>
          <div class="progress-card-value">${totalMistakeWords}</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">已掌握</div>
          <div class="progress-card-value success-value">${masteredMistakeWords}</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">仍需复习</div>
          <div class="progress-card-value warning-value">${activeMistakeWords}</div>
        </div>
        <div class="progress-card">
          <div class="progress-card-title">平均熟练度</div>
          <div class="progress-card-value">${avgMistakeWordMastery}%</div>
        </div>
      </div>
      <div class="mistake-report-grid">
        <div class="report-summary-block">
          <h4>进步最好的单词</h4>
          ${mostImprovedWords.length ? mostImprovedWords.map(item => `
            <div class="report-weak-row">
              <div>
                <div class="report-row-title">${escapeHtml(item.word)}</div>
                <div class="report-row-value">错题 ${item.count || 0} 次 · 复习 ${item.reviewCount || 0} 次</div>
              </div>
              <span class="report-score-pill">${Math.round(item.masteryScore || 0)}%</span>
            </div>
          `).join('') : '<div class="empty-state">暂无错词数据。</div>'}
        </div>
        <div class="report-summary-block">
          <h4>仍然薄弱的单词</h4>
          ${stillWeakWords.length ? stillWeakWords.map(item => `
            <div class="report-weak-row">
              <div>
                <div class="report-row-title">${escapeHtml(item.word)}</div>
                <div class="report-row-value">错题 ${item.count || 0} 次 · 复习 ${item.reviewCount || 0} 次</div>
              </div>
              <span class="report-score-pill ${(item.masteryScore || 0) < 70 ? 'warning' : ''}">${Math.round(item.masteryScore || 0)}%</span>
            </div>
          `).join('') : '<div class="empty-state">暂无薄弱错词。</div>'}
        </div>
      </div>
      <div class="report-charts">
        <div class="report-chart-card">
          <div class="report-chart-title">文章复习活跃度</div>
          ${articleReviewChart.length ? articleReviewChart.map(item => `
            <div class="report-chart-row">
              <div class="report-chart-label">${escapeHtml(item.title)}</div>
              <div class="report-bar report-bar-small report-chart-bar">
                <div class="report-bar-fill" style="width:${Math.min(100, item.count * 12)}%"></div>
              </div>
              <div class="report-chart-value">${item.count} 次</div>
            </div>
          `).join('') : '<div class="empty-state">暂无复习数据。</div>'}
        </div>
        <div class="report-chart-card">
          <div class="report-chart-title">文章熟练度分布</div>
          ${articleMasteryChart.length ? articleMasteryChart.map(item => `
            <div class="report-chart-row">
              <div class="report-chart-label">${escapeHtml(item.title)}</div>
              <div class="report-bar report-bar-small report-chart-bar">
                <div class="report-bar-fill" style="width:${item.mastery}%"></div>
              </div>
              <div class="report-chart-value">${item.mastery}%</div>
            </div>
          `).join('') : '<div class="empty-state">暂无文章数据。</div>'}
        </div>
      </div>
      <div class="report-weak-grid">
        <div class="report-summary-block">
          <h4>薄弱文章</h4>
          ${weakestArticles.length ? weakestArticles.map(item => `
            <div class="report-weak-row">
              <div>
                <div class="report-row-title">${escapeHtml(item.title)}</div>
                <div class="report-row-value">复习 ${item.reviews} 次</div>
              </div>
              <span class="report-score-pill ${item.mastery < 70 ? 'warning' : ''}">${item.mastery}%</span>
            </div>
          `).join('') : '<div class="empty-state">暂无文章熟练度数据。</div>'}
        </div>
        <div class="report-summary-block">
          <h4>薄弱句子</h4>
          ${weakestSentences.length ? weakestSentences.map(item => `
            <div class="report-weak-row">
              <div>
                <div class="report-row-title">${escapeHtml(item.text)}</div>
                <div class="report-row-value">${escapeHtml(item.articleTitle)}</div>
              </div>
              <span class="report-score-pill ${item.score < 70 ? 'warning' : ''}">${Math.round(item.score)}%</span>
            </div>
          `).join('') : '<div class="empty-state">暂无薄弱句子。</div>'}
        </div>
      </div>
    `;
    elements.reportSummary.innerHTML = summaryHtml;
  }

  if (elements.reportWordBook) {
    if (!wordBook.length) {
      elements.reportWordBook.innerHTML = '<div class="empty-state">错题本为空。</div>';
    } else {
      const wordStats = wordBook.slice().sort((a, b) => b.count - a.count).slice(0, 12).map(item => {
        const totalAttempts = item.reviewCount || 0;
        const correctAttempts = (item.history || []).filter(h => h.score >= 90).length;
        const accuracy = totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
        return `
          <div class="word-card">
            <div class="word-card-title">${escapeHtml(item.word)}</div>
            <div class="word-card-meta">错题：${item.count} 次 · 复习：${totalAttempts} 次 · 正确率：${accuracy}% · 熟练度：${Math.round(item.masteryScore || 0)}%</div>
            <div class="word-card-examples">${item.examples.map(ex => `<div class="word-example">${escapeHtml(ex)}</div>`).join('')}</div>
          </div>
        `;
      }).join('');
      const articleStats = articles.slice().sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)).slice(0, 10).map(article => {
        const totalSentences = article.sentences?.length || 0;
        const correctSentences = (article.sentences || []).filter(s => (s.masteryScore || 0) >= 90).length;
        const accuracy = totalSentences ? Math.round((correctSentences / totalSentences) * 100) : 0;
        return `
          <div class="article-stat">
            <div class="article-stat-title">${escapeHtml(article.title)}</div>
            <div class="article-stat-meta">句子：${totalSentences} · 复习：${article.reviewCount || 0} 次 · 正确率：${accuracy}% · 熟练度：${Math.round(article.masteryScore || 0)}%</div>
          </div>
        `;
      }).join('');
      elements.reportWordBook.innerHTML = `
        <div class="report-section report-inner-section">
          <h4>错词统计</h4>
          ${wordStats}
        </div>
        <div class="report-section report-inner-section">
          <h4>文章统计</h4>
          ${articleStats || '<div class="empty-state">暂无文章。</div>'}
        </div>
      `;
    }
  }
}

function openWordBookEditPanel(id) {
  const entry = wordBook.find(item => String(item.id) === String(id));
  if (!entry || !elements.wordbookEditPanel) return;
  selectedWordBookId = String(entry.id);
  elements.wordbookEditWord.value = entry.word;
  elements.wordbookEditTranslation.value = entry.translation || '';
  elements.wordbookEditDifficulty.value = entry.difficulty || '';
  elements.wordbookEditSource.value = entry.source || '';
  if (elements.wordbookEditTags) {
    elements.wordbookEditTags.value = Array.isArray(entry.tags) ? entry.tags.join(', ') : '';
  }
  elements.wordbookEditAudioInfo.textContent = entry.audioName ? `当前音频：${entry.audioName}` : '当前无音频。';
  elements.wordbookEditPanel.classList.remove('hidden');
}

function closeWordBookEditPanel() {
  if (!elements.wordbookEditPanel) return;
  selectedWordBookId = null;
  elements.wordbookEditPanel.classList.add('hidden');
  if (elements.wordbookEditForm) elements.wordbookEditForm.reset();
  if (elements.wordbookEditAudioInfo) elements.wordbookEditAudioInfo.textContent = '如果不修改音频则保持当前音频。';
}

async function handleWordBookEditSubmit(event) {
  event.preventDefault();
  if (!selectedWordBookId) return;
  const entry = wordBook.find(item => String(item.id) === String(selectedWordBookId));
  if (!entry) return;
  entry.translation = elements.wordbookEditTranslation.value.trim();
  entry.difficulty = elements.wordbookEditDifficulty.value.trim();
  entry.source = elements.wordbookEditSource.value.trim();
  if (elements.wordbookEditTags) {
    entry.tags = elements.wordbookEditTags.value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  }
  const file = elements.wordbookEditAudio.files[0];
  if (file) {
    try {
      const savedId = await saveAudioBlob(entry.audioId, file);
      entry.audioId = savedId;
      entry.audioName = file.name || entry.audioName || '';
    } catch (err) {
      showFeedback(`音频保存失败：${err.message}`, 'danger');
      return;
    }
  }
  saveWordBook();
  renderWordBookPage();
  closeWordBookEditPanel();
  showFeedback('错词已更新。', 'success');
}

function deleteWordBookEntry(id) {
  if (!confirm('确认要从错题本中删除这个单词吗？')) return;
  const index = wordBook.findIndex(item => String(item.id) === String(id));
  if (index === -1) return;
  wordBook.splice(index, 1);
  saveWordBook();
  renderWordBookPage();
  showFeedback('已删除错词条目。', 'success');
}

function renderWordBookPage() {
  if (!elements.wordbookPanel) return;
  closeWordBookEditPanel();
  const wrongSentences = getWrongSentenceSummaries();
  const totalWords = wordBook.length;
  const overall = articles.reduce((sum, article) => sum + (article.sentences?.reduce((ss, sentence) => ss + (sentence.masteryScore || 0), 0) || 0), 0);
  const countScores = articles.reduce((sum, article) => sum + (article.sentences?.length || 0), 0);
  const overallMastery = countScores ? Math.round(overall / countScores) : 0;
  const pending = wordBook.filter(item => (item.masteryScore || 0) < 90).length;

  if (elements.wordbookTotalWords) elements.wordbookTotalWords.textContent = totalWords;
  if (elements.wordbookTotalSentences) elements.wordbookTotalSentences.textContent = wrongSentences.length;
  if (elements.wordbookOverallMastery) elements.wordbookOverallMastery.textContent = `${overallMastery}%`;
  if (elements.wordbookPendingReview) elements.wordbookPendingReview.textContent = pending;

  if (!elements.wordbookList) return;
  if (!wordBook.length) {
    elements.wordbookList.innerHTML = '<div class="empty-state">当前错题本为空。</div>';
    return;
  }

  elements.wordbookList.innerHTML = wordBook.slice().sort((a, b) => b.count - a.count).map(item => `
    <div class="wordbook-card" data-word-id="${item.id}">
      <div class="wordbook-card-header">
        <div class="wordbook-word">${escapeHtml(item.word)}</div>
        <div class="wordbook-mastery">${Math.round(item.masteryScore || 0)}%</div>
      </div>
      <div class="wordbook-progress">
        <div class="wordbook-progress-fill" style="width:${Math.round(item.masteryScore || 0)}%"></div>
      </div>
      <div class="wordbook-meta">难度：${escapeHtml(item.difficulty || '未设置')} · 错题次数：${item.count} · 来源：${escapeHtml(item.source || '未知')}</div>
      ${item.tags && item.tags.length ? `<div class="wordbook-tags">标签：${escapeHtml(item.tags.join(', '))}</div>` : ''}
      <div class="wordbook-translation">${escapeHtml(item.translation || '暂无说明')}</div>
      <div class="wordbook-actions">
        ${item.audioId ? '<button type="button" class="btn btn-small btn-secondary play-word-audio-btn">播放</button>' : ''}
        <button type="button" class="btn btn-small btn-primary wordbook-review-btn">复习</button>
        <button type="button" class="btn btn-small btn-secondary wordbook-edit-btn">编辑</button>
        <button type="button" class="btn btn-small btn-danger wordbook-delete-btn">删除</button>
      </div>
    </div>
  `).join('');

}

function handleWordbookListClick(event) {
  const card = event.target.closest('.wordbook-card');
  if (!card) return;
  const id = card.dataset.wordId;
  if (!id) return;

  if (event.target.closest('.wordbook-review-btn')) {
    startWordReview(id);
    return;
  }

  if (event.target.closest('.wordbook-edit-btn')) {
    openWordBookEditPanel(id);
    return;
  }

  if (event.target.closest('.wordbook-delete-btn')) {
    deleteWordBookEntry(id);
    return;
  }

  if (event.target.closest('.play-word-audio-btn')) {
    const entry = wordBook.find(item => String(item.id) === String(id));
    if (!entry || !entry.audioId) return;
    getAudioUrl(entry.audioId).then(url => new Audio(url).play()).catch(() => {});
    return;
  }

  if (event.target.closest('.wordbook-card')) {
    openWordBookEditPanel(id);
    return;
  }
}

function startWordReview(wordId = null) {
  const ids = wordId ? [wordId] : wordBook.map(item => item.id);
  if (!ids.length) {
    alert('错题本当前没有错词可复习。');
    return;
  }
  currentReview = {
    type: 'word',
    wordIds: ids,
    index: 0,
    doneIds: new Set(),
    sessionScores: [],
  };
  if (elements.endReview) elements.endReview.textContent = '结束复习';
  showSection('review');
  renderReviewItem();
}

function resetWordBookEditForm() {
  if (!elements.wordbookEditForm) return;
  elements.wordbookEditForm.reset();
  elements.wordbookEditAudioInfo.textContent = '如果不修改音频则保持当前音频。';
}

function showFeedback(message, type = 'info') {
  if (!message) {
    elements.feedback.className = 'feedback hidden';
    elements.feedback.textContent = '';
    return;
  }
  elements.feedback.textContent = message;
  elements.feedback.className = `feedback ${type === 'success' ? 'success' : type === 'warning' ? 'warning' : type === 'danger' ? 'error' : ''}`;
}

function completeReview() {
  if (!currentReview || currentReview.completed) return;
  currentReview.completed = true;
  const summary = {
    total: currentReview.type === 'word' ? currentReview.wordIds.length : currentReview.sentenceIds.length,
    scores: currentReview.sessionScores.map(item => ({ sentence: item.sentence, score: item.score })),
    average: currentReview.sessionScores.length
      ? Math.round(currentReview.sessionScores.reduce((sum, item) => sum + item.score, 0) / currentReview.sessionScores.length)
      : 0,
    wrongWords: wordBook.slice(0, 10),
  };

  // Record review time (sentence review only, not word review)
  if (!currentReview.type && currentReview.startTime) {
    const article = findArticle(currentReview.articleId);
    if (article) {
      const duration = Date.now() - currentReview.startTime;
      summary.duration = duration;
      article.reviewTimes = article.reviewTimes || [];
      article.reviewSessions = article.reviewSessions || [];
      article.reviewTimes.push(duration);
      article.reviewSessions.push({
        timestamp: new Date().toISOString(),
        duration,
        averageScore: summary.average,
        reviewedCount: currentReview.doneIds.size,
      });
      // keep last 20 reviews for average calculation
      if (article.reviewTimes.length > 20) {
        article.reviewTimes.shift();
      }
      if (article.reviewSessions.length > 60) {
        article.reviewSessions = article.reviewSessions.slice(-60);
      }
      saveArticles();
      if (!article.reviewCount) article.reviewCount = 0;
      if (!article.masteryScore) article.masteryScore = calculateArticleMastery(article);
    }
  }

  if (elements.reportPanel && !elements.reportPanel.classList.contains('hidden')) {
    showReport();
  }

  elements.submitAnswer.disabled = true;
  elements.nextSentence.disabled = true;
  elements.playSentence.disabled = true;
  elements.showAnswer.disabled = true;

  renderReviewSummary(summary);
  if (elements.endReview) elements.endReview.textContent = '关闭';
  showFeedback('本次复习已完成，查看下方总结或点击“关闭”回到首页。', 'success');
}

function clearReviewSummary() {
  if (!elements.reviewSummary) return;
  elements.reviewSummary.classList.add('hidden');
  elements.reviewSummary.innerHTML = '';
  elements.submitAnswer.disabled = false;
  elements.nextSentence.disabled = false;
  elements.playSentence.disabled = false;
  elements.showAnswer.disabled = false;
  elements.nextSentence.textContent = '下一句';
  if (elements.endReview) elements.endReview.textContent = '结束复习';
}

function renderReviewSummary(summary) {
  if (!elements.reviewSummary) return;
  const lines = summary.scores.map(item => `【${item.score}%】 ${escapeHtml(item.sentence)}`);
  const wordBookHtml = summary.wrongWords.length
    ? `<div class="review-word-book"><h4>近期错词</h4>${summary.wrongWords.slice(0, 5).map(item => `<div>${escapeHtml(item.word)} (${item.count})</div>`).join('')}</div>`
    : '<div class="empty-state">暂无错词。</div>';

  const durationText = summary.duration ? `本次用时：${formatDuration(summary.duration)}` : '';
  elements.reviewSummary.innerHTML = `
    <div class="review-summary-header">
      <h3>复习完成</h3>
      <div class="review-summary-score">平均得分：${summary.average}%</div>
    </div>
    <div class="review-summary-body">
      ${durationText ? `<div class="review-summary-duration">${durationText}</div>` : ''}
      <div class="review-summary-list">${lines.join('')}</div>
      ${wordBookHtml}
    </div>
  `;
  elements.reviewSummary.classList.remove('hidden');
}

function highlightSentenceDifferences(original, userInput, wrongPairs) {
  const targetWords = tokenizeWords(original);
  const answerWords = tokenizeWords(userInput);
  
  const wrongMap = new Map();
  wrongPairs.forEach(pair => {
    wrongMap.set(pair.expected.toLowerCase(), pair.actual);
  });
  
  const highlightedOriginal = targetWords.map(word => {
    if (wrongMap.has(word.toLowerCase())) {
      return `<span class="highlight-error">${escapeHtml(word)}</span>`;
    }
    return escapeHtml(word);
  }).join(' ');
  
  const answerUsed = new Set();
  const highlightedAnswer = answerWords.map((word, idx) => {
    const found = wrongPairs.find(p => {
      const match = p.actual === word && !answerUsed.has(word);
      if (match) answerUsed.add(word);
      return match;
    });
    if (found || wrongPairs.some(p => p.actual === '（缺失）' && p.expected.toLowerCase() === word.toLowerCase())) {
      return `<span class="highlight-error">${escapeHtml(word)}</span>`;
    }
    return escapeHtml(word);
  }).join(' ');
  
  return { highlightedOriginal, highlightedAnswer };
}

function renderSentenceMistakeSummary(sentence, article, wrongPairs, userAnswer = '') {
  if (!elements.reviewSummary) return;
  const { highlightedOriginal, highlightedAnswer } = highlightSentenceDifferences(sentence.text, userAnswer, wrongPairs);
  const mistakesHtml = wrongPairs.length
    ? wrongPairs.map((pair, index) => `
      <div class="review-mistake-row">
        <div class="review-mistake-text">
          <span class="review-mistake-wrong">${escapeHtml(pair.actual)}</span>
          <span class="review-mistake-arrow">→</span>
          <span class="review-mistake-correct">${escapeHtml(pair.expected)}</span>
        </div>
        <button type="button" class="btn btn-small btn-secondary record-mistake-btn" data-word="${escapeHtml(pair.expected)}" data-sentence-id="${sentence.id}" data-article-id="${article.id}">记录</button>
      </div>
    `).join('')
    : '<div class="review-no-mistakes">本句未识别出错词。</div>';

  elements.reviewSummary.innerHTML = `
    <div class="review-summary-header">
      <h3>本句对比</h3>
      <div class="review-summary-score">得分：${calculateScore(normalizeText(sentence.text), normalizeText(userAnswer))}%</div>
    </div>
    <div class="review-summary-body">
      <div class="review-sentence-compare">
        <div class="review-sentence-row review-sentence-original">
          <div class="review-sentence-label">原句</div>
          <div class="review-sentence-text">${highlightedOriginal}</div>
        </div>
        <div class="review-sentence-row review-sentence-user">
          <div class="review-sentence-label">你的输入</div>
          <div class="review-sentence-text">${highlightedAnswer}</div>
        </div>
      </div>
      ${mistakesHtml}
      <div class="review-summary-note">未点击“记录”的错词将不会入错题本。</div>
    </div>
  `;
  elements.reviewSummary.classList.remove('hidden');
}

function handleReviewSummaryClick(event) {
  const button = event.target.closest('.record-mistake-btn');
  if (!button) return;
  const word = button.dataset.word;
  const sentenceId = button.dataset.sentenceId;
  const articleId = button.dataset.articleId;
  if (!word || !sentenceId || !articleId) return;

  const article = findArticle(articleId);
  if (!article) return;
  const sentence = article.sentences.find(s => s.id === sentenceId);
  if (!sentence) return;

  recordWrongWordEntry(word, sentence, article);
  button.textContent = '已记录';
  button.disabled = true;
  showFeedback(`已记录错词：${word}`, 'success');
}

function splitTags(value) {
  return value
    .split(/[,，;；]/)
    .map(tag => tag.trim())
    .filter(Boolean);
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[，。！？,.!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDuration(ms) {
  if (typeof ms !== 'number' || ms < 0) return '0秒';
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes > 0) {
    return `${minutes}分${remainder}秒`;
  }
  return `${remainder}秒`;
}

function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  matrix[0] = Array.from({ length: a.length + 1 }, (_, j) => j);
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (b[i - 1] === a[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[b.length][a.length];
}

function findArticle(id) {
  return articles.find(a => a.id === id);
}

function getArticleListStats(article) {
  const sentences = article.sentences || [];
  const reviewTimes = (article.reviewTimes || []).filter(time => typeof time === 'number' && Number.isFinite(time));
  const reviewSessions = Array.isArray(article.reviewSessions) ? article.reviewSessions : [];
  const todayKey = getLocalDateKey(new Date());
  const todayMs = reviewSessions
    .filter(session => getLocalDateKey(new Date(session.timestamp)) === todayKey)
    .reduce((sum, session) => sum + toNumber(session.duration, 0), 0);
  const attempts = sentences.reduce((sum, sentence) => sum + ((sentence.history || []).length), 0);
  const correctAttempts = sentences.reduce((sum, sentence) => {
    return sum + (sentence.history || []).filter(item => toNumber(item.score, 0) >= 90).length;
  }, 0);
  const accuracy = attempts ? Math.round((correctAttempts / attempts) * 100) : 0;
  const avgTimeMs = reviewTimes.length ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length) : 0;

  return {
    sentenceCount: sentences.length,
    sessionCount: reviewTimes.length,
    todayMs,
    avgTimeMs,
    accuracy,
    mastery: Math.round(article.masteryScore || 0),
  };
}

function getLocalDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderArticleList() {
  if (!elements.articles) return;
  elements.articles.innerHTML = '';
  if (!articles || articles.length === 0) {
    elements.emptyList.classList.remove('hidden');
    return;
  }
  elements.emptyList.classList.add('hidden');

  articles.forEach(article => {
    const card = document.createElement('div');
    card.className = 'card article-card';
    const title = document.createElement('h3');
    title.textContent = article.title;
    const meta = document.createElement('div');
    meta.className = 'help-text';
    const stats = getArticleListStats(article);
    const tagsText = article.tags && article.tags.length ? ` · 标签：${article.tags.join('，')}` : '';
    meta.textContent = `${article.source || '来源：未知'}${tagsText}`;

    const statLine = document.createElement('div');
    statLine.className = 'article-card-stats';
    statLine.innerHTML = `
      <span>句子 ${stats.sentenceCount}</span>
      <span>完整复习 ${stats.sessionCount} 次</span>
      <span>今天用时 ${formatDuration(stats.todayMs)}</span>
      <span>平均用时 ${formatDuration(stats.avgTimeMs)}</span>
      <span>正确率 ${stats.accuracy}%</span>
      <span>熟练度 ${stats.mastery}%</span>
    `;

    const actions = document.createElement('div');
    actions.style.marginTop = '12px';
    actions.style.display = 'flex';
    actions.style.gap = '8px';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', () => openArticleDetail(article.id));

    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'btn btn-primary';
    reviewBtn.textContent = '复习';
    reviewBtn.addEventListener('click', () => startReview(article.id));

    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn-primary article-play-button';
    playBtn.textContent = '连读';
    playBtn.dataset.articleId = article.id;
    playBtn.addEventListener('click', () => {
      // toggle play for this article
      if (playAllState.playing && !playAllState.loop) {
        // currently playing a single run -> stop
        playAllState.stopRequested = true;
        stopPlayAll();
        updateArticleListButtons(article.id, false, false);
      } else if (playAllState.loop && playAllState.loopArticleId === article.id) {
        // currently looping this article -> stop loop
        stopLoopPlay(article.id);
      } else {
        // start single play
        playAllSentences(article.id);
        updateArticleListButtons(article.id, true, false);
      }
    });

    const loopBtn = document.createElement('button');
    loopBtn.className = 'btn btn-secondary article-loop-button';
    loopBtn.textContent = '循环播放';
    loopBtn.dataset.articleId = article.id;
    loopBtn.addEventListener('click', () => {
      if (playAllState.loop && playAllState.loopArticleId === article.id) {
        stopLoopPlay(article.id);
      } else {
        startLoopPlay(article.id);
      }
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-secondary';
    delBtn.textContent = '删除';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`确定删除文章 “${article.title}” 吗？此操作不能撤销。`)) return;
      await deleteArticle(article.id);
      renderArticleList();
    });

    actions.appendChild(editBtn);
    actions.appendChild(reviewBtn);
    actions.appendChild(playBtn);
    actions.appendChild(loopBtn);
    actions.appendChild(delBtn);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(statLine);
    card.appendChild(actions);
    elements.articles.appendChild(card);
  });
}

async function deleteArticle(articleId) {
  const idx = articles.findIndex(a => a.id === articleId);
  if (idx < 0) return;
  const article = articles[idx];
  // remove associated audio files
  (article.sentences || []).forEach(s => {
    if (s.audioId) {
      try { deleteAudio(s.audioId); } catch (e) { /* ignore */ }
    }
  });
  articles.splice(idx, 1);
  saveArticles();
}

function openArticleDetail(articleId) {
  const article = findArticle(articleId);
  if (!article) return;
  selectedArticleId = articleId;
  elements.detailTitle.textContent = article.title;
  elements.detailMeta.textContent = `来源：${article.source || '未知'} · 标签：${article.tags ? article.tags.join('，') : '无'}`;
  elements.detailMastery.textContent = `${Math.round(article.masteryScore || 0)}%`;
  elements.detailReviewCount.textContent = article.reviewCount || 0;
  resetSentenceForm();
  showSection('edit');
  renderSentences(article);
}

function renderSentences(article) {
  if (!elements.sentences) return;
  elements.sentences.innerHTML = '';
  const container = elements.sentences;
  const tmpl = elements.sentenceTemplate;
  (article.sentences || []).forEach(s => {
    const node = tmpl.content ? tmpl.content.cloneNode(true) : tmpl.cloneNode(true);
    const row = node.querySelector ? node.querySelector('.sentence-row') : node.querySelector('.sentence-row');
    row.querySelector('.sentence-text').textContent = s.text || '';
    row.querySelector('.sentence-translation').textContent = s.translation || '';
    const metaLine = row.querySelector('.sentence-meta-line');
    metaLine.textContent = `难度：${s.difficulty || '未设置'} · 复习：${s.reviewCount || 0}`;

    const playBtn = row.querySelector('.play-sentence-btn');
    if (playBtn) playBtn.addEventListener('click', async () => {
      if (!s.audioId) { alert('该句子没有音频。'); return; }
      const url = await getAudioUrl(s.audioId);
      const a = new Audio(url);
      a.play();
    });

    const reviewBtn = row.querySelector('.review-sentence-btn');
    if (reviewBtn) reviewBtn.addEventListener('click', () => startReview(article.id, s.id));

    const editBtn = row.querySelector('.edit-sentence-btn');
    if (editBtn) editBtn.addEventListener('click', () => {
      // populate sentence form for editing
      selectedArticleId = article.id;
      elements.sentenceText.value = s.text || '';
      elements.sentenceTranslation.value = s.translation || '';
      elements.sentenceDifficulty.value = s.difficulty || '';
      elements.sentenceTags.value = (s.tags || []).join(',');
      elements.sentenceAudioInfo.textContent = s.audioName ? `当前音频：${s.audioName}` : '当前无音频。';
      // store editing id on form dataset
      elements.sentenceForm.dataset.editing = s.id;
      showSection('edit');
    });

    const moveUp = row.querySelector('.move-up-sentence-btn');
    if (moveUp) moveUp.addEventListener('click', () => {
      const idx = article.sentences.findIndex(x => x.id === s.id);
      if (idx > 0) {
        article.sentences.splice(idx, 1);
        article.sentences.splice(idx - 1, 0, s);
        saveArticles();
        renderSentences(article);
      }
    });

    const moveDown = row.querySelector('.move-down-sentence-btn');
    if (moveDown) moveDown.addEventListener('click', () => {
      const idx = article.sentences.findIndex(x => x.id === s.id);
      if (idx >= 0 && idx < article.sentences.length - 1) {
        article.sentences.splice(idx, 1);
        article.sentences.splice(idx + 1, 0, s);
        saveArticles();
        renderSentences(article);
      }
    });

    container.appendChild(node);
  });
}

async function handleSentenceSubmit(event) {
  event.preventDefault();
  if (!selectedArticleId) {
    showFeedback('请先选择一篇文章再保存句子。', 'warning');
    return;
  }

  const article = findArticle(selectedArticleId);
  if (!article) {
    showFeedback('当前文章不存在，请重新选择。', 'warning');
    return;
  }
  article.sentences = Array.isArray(article.sentences) ? article.sentences : [];

  const sentenceId = elements.sentenceForm.dataset.editing;
  const text = elements.sentenceText.value.trim();
  const translation = elements.sentenceTranslation.value.trim();
  const difficulty = elements.sentenceDifficulty.value.trim();
  const tags = splitTags(elements.sentenceTags.value);
  const file = elements.sentenceAudio.files[0];

  if (!text) {
    showFeedback('句子文本不能为空。', 'warning');
    return;
  }

  let sentence = null;
  if (sentenceId) {
    sentence = article.sentences.find(s => s.id === sentenceId);
    if (!sentence) {
      showFeedback('要编辑的句子未找到，请重新选择。', 'warning');
      return;
    }
  }

  if (file) {
    try {
      const savedId = await saveAudioBlob(sentence ? sentence.audioId : null, file);
      if (!sentence) {
        // 新建句子：一次性设置所有字段
        sentence = {
          id: generateId(),
          text,
          translation,
          difficulty,
          tags,
          audioId: savedId,
          audioName: file.name || '',
          reviewCount: 0,
          masteryScore: 0,
          history: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        article.sentences = article.sentences || [];
        article.sentences.push(sentence);
      } else {
        // 编辑句子：更新音频
        sentence.audioId = savedId;
        sentence.audioName = file.name || sentence.audioName || '';
      }
    } catch (err) {
      showFeedback(`音频保存失败：${err.message}`, 'danger');
      return;
    }
  }

  if (!sentence) {
    sentence = {
      id: generateId(),
      text,
      translation,
      difficulty,
      tags,
      audioId: null,
      audioName: '',
      reviewCount: 0,
      masteryScore: 0,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    article.sentences = article.sentences || [];
    article.sentences.push(sentence);
  } else {
    sentence.text = text;
    sentence.translation = translation;
    sentence.difficulty = difficulty;
    sentence.tags = tags;
    sentence.updatedAt = new Date().toISOString();
  }

  article.updatedAt = new Date().toISOString();
  if (!article.reviewCount) article.reviewCount = 0;
  if (!article.masteryScore) article.masteryScore = calculateArticleMastery(article);
  saveArticles();
  openArticleDetail(article.id);
  showFeedback('句子已保存。', 'success');
}

function resetSentenceForm() {
  if (!elements.sentenceForm) return;
  elements.sentenceForm.reset();
  elements.sentenceForm.dataset.editing = '';
  elements.sentenceAudioInfo.textContent = '如果是编辑句子，可通过重新上传音频覆盖当前音频；不想修改则留空。';
}
