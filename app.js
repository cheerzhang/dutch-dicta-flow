const STORAGE_KEY = 'dutchDictaArticles';
const WORD_BOOK_KEY = 'dutchDictaWordBook';
const DB_NAME = 'dutchDictaAudioDB';
const DB_STORE = 'audioFiles';

let articles = [];
let wordBook = [];
let selectedArticleId = null;
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
  sentenceForm: document.getElementById('sentence-form'),
  sentenceText: document.getElementById('sentence-text'),
  sentenceTranslation: document.getElementById('sentence-translation'),
  sentenceAudio: document.getElementById('sentence-audio'),
  sentenceDifficulty: document.getElementById('sentence-difficulty'),
  sentenceTags: document.getElementById('sentence-tags'),
  sentenceAudioInfo: document.getElementById('sentence-audio-info'),
  sentenceReset: document.getElementById('sentence-reset'),
  sentences: document.getElementById('sentences'),
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
  reportWordBook: document.getElementById('report-word-book'),
  reportRecent: document.getElementById('report-recent'),
  reviewTitle: document.getElementById('review-title'),
  reviewSubtitle: document.getElementById('review-subtitle'),
  quizIndex: document.getElementById('quiz-index'),
  quizTotal: document.getElementById('quiz-total'),
  quizMastery: document.getElementById('quiz-mastery'),
  sentenceNumber: document.getElementById('sentence-number'),
  sentenceDifficultyLabel: document.getElementById('sentence-difficulty'),
  sentenceTagsLabel: document.getElementById('sentence-tags'),
  playSentence: document.getElementById('play-sentence'),
  showAnswer: document.getElementById('show-answer'),
  dictationInput: document.getElementById('dictation-input'),
  submitAnswer: document.getElementById('submit-answer'),
  nextSentence: document.getElementById('next-sentence'),
  feedback: document.getElementById('feedback'),
  endReview: document.getElementById('end-review'),
  sentenceTemplate: document.getElementById('sentence-row-template'),
};

let db = null;

window.addEventListener('DOMContentLoaded', async () => {
  await initDatabase();
  loadArticles();
  loadWordBook();
  try {
    if (typeof renderArticleList === 'function') renderArticleList();
  } catch (err) {
    console.error('renderArticleList error', err);
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
  if (elements.sentenceForm && typeof handleSentenceSubmit === 'function') {
    elements.sentenceForm.addEventListener('submit', handleSentenceSubmit);
  }
  if (elements.sentenceReset && typeof resetSentenceForm === 'function') {
    elements.sentenceReset.addEventListener('click', resetSentenceForm);
  }
  if (elements.startReview) {
    elements.startReview.addEventListener('click', () => startReview(selectedArticleId));
  }
  if (elements.playSentence) {
    elements.playSentence.addEventListener('click', playCurrentSentenceAudio);
  }
  if (elements.showAnswer) {
    elements.showAnswer.addEventListener('click', revealSentenceAnswer);
  }
  if (elements.submitAnswer) {
    elements.submitAnswer.addEventListener('click', handleSubmitAnswer);
  }
  if (elements.nextSentence) {
    elements.nextSentence.addEventListener('click', showNextSentence);
  }
  if (elements.endReview) {
    elements.endReview.addEventListener('click', () => showSection('edit'));
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

function showSection(mode) {
  elements.articleCreator.classList.toggle('hidden', mode !== 'create');
  elements.articleDetail.classList.toggle('hidden', mode !== 'edit');
  elements.reviewPanel.classList.toggle('hidden', mode !== 'review');
  elements.backupPanel.classList.toggle('hidden', mode !== 'backup');
  elements.reportPanel.classList.toggle('hidden', mode !== 'report');
  document.getElementById('article-list').classList.toggle('hidden', mode !== 'list');
  setActiveNav(mode);
  if (mode === 'list') {
    selectedArticleId = null;
  }
  if (mode === 'report') showReport();
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

function registerWordMistakes(sentence, answer, article) {
  const wrongWords = getMistypedWords(sentence.text, answer);
  if (!wrongWords.length) return;
  const timestamp = new Date().toISOString();

  wrongWords.forEach(word => {
    const key = word.toLowerCase();
    let entry = wordBook.find(item => item.word.toLowerCase() === key);
    if (!entry) {
      entry = {
        word,
        count: 0,
        lastSeen: timestamp,
        examples: [],
      };
      wordBook.push(entry);
    }
    entry.count += 1;
    entry.lastSeen = timestamp;
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

  async function exportBackup() {
    try {
      const audioEntries = await getAllAudioEntries();
      const audioFiles = await Promise.all(audioEntries.map(async entry => {
        const data = await blobToBase64(entry.file);
        return { id: entry.id, type: entry.file.type, data };
      }));
      const payload = {
        version: 1,
        articles,
        wordBook,
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
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      const result = await importBackup(data);
      elements.backupStatus.textContent = `备份已导入，新增 ${result.importedCount} 篇，覆盖 ${result.overwrittenCount} 篇。`;
      elements.backupImport.value = '';
      renderArticleList();
      showSection('list');
    } catch (error) {
      elements.backupStatus.textContent = `导入失败：${error.message}`;
    }
  }

  async function importBackup(data) {
    if (!data || !Array.isArray(data.articles)) {
        throw new Error('无效的备份文件：找不到 articles 数组。');
      }
      const audioFilesArray = Array.isArray(data.audioFiles) ? data.audioFiles : [];
      const importPromises = audioFilesArray.map(async entry => {
        try {
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
    const existingByKey = new Map(articles.map(item => [`${item.title.trim().toLowerCase()}|${item.source.trim().toLowerCase()}`, item]));
    let importedCount = 0;
    let overwrittenCount = 0;

    data.articles.forEach(article => {
      if (!article || !article.title) return;

      // Normalize legacy article formats so sentences are preserved.
      // Older backups might store sentences in `content` (string or array), `items`,
      // or `sentences` as an array of strings. Convert them to the expected
      // `sentences` array of objects with required fields.
      try {
        if (!Array.isArray(article.sentences)) {
          const candidates = article.content || article.items || null;
          if (Array.isArray(candidates)) {
            article.sentences = candidates.map(s => (typeof s === 'string' ? { id: generateId(), text: s } : s));
          } else if (typeof candidates === 'string') {
            const lines = candidates.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            article.sentences = lines.map(text => ({ id: generateId(), text }));
          } else {
            article.sentences = [];
          }
        } else {
          // If sentences exist but are strings, convert to objects
          if (article.sentences.length && typeof article.sentences[0] === 'string') {
            article.sentences = article.sentences.map(text => ({ id: generateId(), text }));
          }
        }
        // Ensure each sentence has standard fields
        article.sentences = (article.sentences || []).map(s => ({
          id: s.id || generateId(),
          text: s.text || s.content || '',
          translation: s.translation || s.cn || s.note || '',
          tags: Array.isArray(s.tags) ? s.tags : (s.tag ? [s.tag] : []),
          difficulty: s.difficulty || s.level || '',
          audioId: s.audioId || s.audio || null,
          masteryScore: typeof s.masteryScore === 'number' ? s.masteryScore : (s.score || 0),
          reviewCount: typeof s.reviewCount === 'number' ? s.reviewCount : (s.reviews || 0),
          history: Array.isArray(s.history) ? s.history : (s.historyEntries || []),
        }));
      } catch (err) {
        console.warn('文章条目归一化失败，跳过该文章的句子转换', article && article.title, err && err.message);
        article.sentences = Array.isArray(article.sentences) ? article.sentences : [];
      }

      const key = `${article.title.trim().toLowerCase()}|${(article.source || '').trim().toLowerCase()}`;
      let targetArticle = existingById.get(article.id) || existingByKey.get(key);
      if (targetArticle) {
        const oldAudioIds = new Set((targetArticle.sentences || []).map(s => s.audioId).filter(Boolean));
        const newAudioIds = new Set((article.sentences || []).map(s => s.audioId).filter(Boolean));
        oldAudioIds.forEach(id => { if (!newAudioIds.has(id)) deleteAudio(id); });
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
    });

    const importedWords = Array.isArray(data.wordBook) ? data.wordBook : [];
    importedWords.forEach(entry => {
      if (!entry.word) return;
      const key = entry.word.trim().toLowerCase();
      let existing = wordBook.find(item => item.word.trim().toLowerCase() === key);
      if (!existing) {
        existing = { word: entry.word, count: 0, lastSeen: entry.lastSeen || new Date().toISOString(), examples: [] };
        wordBook.push(existing);
      }
      existing.count = Math.max(existing.count, entry.count || 0);
      existing.lastSeen = existing.lastSeen > (entry.lastSeen || existing.lastSeen) ? existing.lastSeen : (entry.lastSeen || existing.lastSeen);
      (entry.examples || []).forEach(example => {
        if (!existing.examples.includes(example)) {
          existing.examples.unshift(example);
        }
      });
      if (existing.examples.length > 3) existing.examples.length = 3;
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
    const arr = dataUrl.split(',');
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type });
  }

function startReview(articleId, focusSentenceId = null) {
  const article = findArticle(articleId);
  if (!article || article.sentences.length === 0) {
    alert('请先为文章添加至少一个句子。');
    return;
  }

  selectedArticleId = articleId;
  currentReview = {
    articleId,
    sentenceIds: article.sentences.map(s => s.id),
    index: 0,
  };

  if (focusSentenceId) {
    const idx = currentReview.sentenceIds.indexOf(focusSentenceId);
    if (idx >= 0) currentReview.index = idx;
  }

  renderReviewItem();
  showSection('review');
}

async function renderReviewItem() {
  if (!currentReview) return;
  const article = findArticle(currentReview.articleId);
  const sentence = article.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  if (!sentence) return;

  elements.reviewTitle.textContent = `听写：${article.title}`;
  elements.reviewSubtitle.textContent = article.source ? `来源：${article.source}` : '';
  elements.quizIndex.textContent = currentReview.index + 1;
  elements.quizTotal.textContent = currentReview.sentenceIds.length;
  elements.quizMastery.textContent = `${Math.round(article.masteryScore)}%`;
  elements.sentenceNumber.textContent = `句子 ${currentReview.index + 1}`;
  elements.sentenceDifficultyLabel.textContent = sentence.difficulty ? `难度：${sentence.difficulty}` : '难度：未设置';
  elements.sentenceTagsLabel.textContent = sentence.tags.length ? `标签：${sentence.tags.join('，')}` : '标签：无';
  elements.dictationInput.value = '';
  showFeedback('', '');
  const audioUrl = await getAudioUrl(sentence.audioId);
  reviewAudio.src = audioUrl;
  reviewAudio.pause();
}

async function playCurrentSentenceAudio() {
  if (!currentReview) return;
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
  const article = findArticle(currentReview.articleId);
  const sentence = article.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  const translationText = sentence.translation ? `
翻译：${sentence.translation}` : '';
  showFeedback(`正确文本：${sentence.text}${translationText}`, 'info');
}

function handleSubmitAnswer() {
  if (!currentReview) return;
  const article = findArticle(currentReview.articleId);
  const sentence = article.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  if (!sentence) return;

  const answer = elements.dictationInput.value.trim();
  if (!answer) {
    showFeedback('请输入你的听写内容，然后提交。', 'warning');
    return;
  }

  const normalizedTarget = normalizeText(sentence.text);
  const normalizedAnswer = normalizeText(answer);
  const score = calculateScore(normalizedTarget, normalizedAnswer);
  const lastScore = sentence.masteryScore || 0;
  sentence.reviewCount += 1;
  sentence.lastReviewed = new Date().toISOString();
  sentence.masteryScore = Math.min(100, lastScore + score * 0.25);
  sentence.history.unshift({
    timestamp: new Date().toISOString(),
    answer,
    score,
    correctText: sentence.text,
  });

  registerWordMistakes(sentence, answer, article);
  article.reviewCount += 1;
  article.masteryScore = calculateArticleMastery(article);
  article.updatedAt = new Date().toISOString();
  saveArticles();

  showFeedback(`得分：${score}% 。已累计复习 ${sentence.reviewCount} 次。`, score >= 90 ? 'success' : 'warning');
  elements.quizMastery.textContent = `${Math.round(article.masteryScore)}%`;
}

function showNextSentence() {
  if (!currentReview) return;
  const article = findArticle(currentReview.articleId);
  currentReview.index = (currentReview.index + 1) % currentReview.sentenceIds.length;
  renderReviewItem();
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

function showReport() {
  const totalArticles = articles.length;
  const totalSentences = articles.reduce((sum, a) => sum + (a.sentences?.length || 0), 0);
  let totalScore = 0;
  let scoredCount = 0;
  const recent = [];
  articles.forEach(article => {
    article.sentences.forEach(sentence => {
      if (typeof sentence.masteryScore === 'number') {
        totalScore += sentence.masteryScore;
        scoredCount += 1;
      }
      (sentence.history || []).forEach(h => {
        recent.push({
          articleTitle: article.title,
          sentence: sentence.text,
          timestamp: h.timestamp,
          score: h.score,
        });
      });
    });
  });
  const overall = scoredCount ? Math.round(totalScore / scoredCount) : 0;
  if (elements.reportTotalArticles) elements.reportTotalArticles.textContent = totalArticles;
  if (elements.reportTotalSentences) elements.reportTotalSentences.textContent = totalSentences;
  if (elements.reportOverallMastery) elements.reportOverallMastery.textContent = `${overall}%`;
  if (elements.reportTotalWrongWords) elements.reportTotalWrongWords.textContent = wordBook.length;

  recent.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentList = recent.slice(0, 10).map(r => `<div class="report-row">${new Date(r.timestamp).toLocaleString()} · <strong>${escapeHtml(r.articleTitle)}</strong> · ${escapeHtml(r.sentence)} · 得分：${r.score}%</div>`).join('');
  if (elements.reportRecent) elements.reportRecent.innerHTML = recentList || '<div class="empty-state">暂无复习记录。</div>';

  if (elements.reportWordBook) {
    if (!wordBook.length) {
      elements.reportWordBook.innerHTML = '<div class="empty-state">错词本为空。</div>';
    } else {
      elements.reportWordBook.innerHTML = wordBook.slice(0, 12).map(item => `
        <div class="word-card">
          <div class="word-card-title">${escapeHtml(item.word)}</div>
          <div class="word-card-meta">错题次数：${item.count} · 最近：${new Date(item.lastSeen).toLocaleString()}</div>
          <div class="word-card-examples">${item.examples.map(ex => `<div class="word-example">${escapeHtml(ex)}</div>`).join('')}</div>
        </div>
      `).join('');
    }
  }
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
    meta.textContent = `${article.source || '来源：未知'} · ${article.tags ? article.tags.join('，') : ''}`;

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
    actions.appendChild(delBtn);

    card.appendChild(title);
    card.appendChild(meta);
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

function resetSentenceForm() {
  if (!elements.sentenceForm) return;
  elements.sentenceForm.reset();
  elements.sentenceForm.dataset.editing = '';
  elements.sentenceAudioInfo.textContent = '如果是编辑句子，可通过重新上传音频覆盖当前音频；不想修改则留空。';
}
