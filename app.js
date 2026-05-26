const STORAGE_KEY = 'dutchDictaArticles';
const DB_NAME = 'dutchDictaAudioDB';
const DB_STORE = 'audioFiles';

let articles = [];
let selectedArticleId = null;
let currentReview = null;
let reviewAudio = new Audio();
let reviewTimer = null;
let audioBlobCache = new Map();

const elements = {
  articleForm: document.getElementById('article-form'),
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
  renderArticleList();
  bindEvents();
});

function bindEvents() {
  elements.articleForm.addEventListener('submit', handleArticleSubmit);
  elements.backToList.addEventListener('click', () => showSection('list'));
  elements.sentenceForm.addEventListener('submit', handleSentenceSubmit);
  elements.sentenceReset.addEventListener('click', resetSentenceForm);
  elements.startReview.addEventListener('click', () => startReview(selectedArticleId));
  elements.playSentence.addEventListener('click', playCurrentSentenceAudio);
  elements.showAnswer.addEventListener('click', revealSentenceAnswer);
  elements.submitAnswer.addEventListener('click', handleSubmitAnswer);
  elements.nextSentence.addEventListener('click', showNextSentence);
  elements.endReview.addEventListener('click', () => showSection('edit'));
  elements.backupExport.addEventListener('click', exportBackup);
  elements.backupImport.addEventListener('change', handleBackupImport);
  elements.pageNavButtons.forEach(btn => btn.addEventListener('click', handlePageNav));
}

function showSection(mode) {
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

function handleArticleSubmit(event) {
  event.preventDefault();
  const title = elements.title.value.trim();
  const source = elements.source.value.trim();
  const tags = splitTags(elements.tags.value);

  if (!title) return;

  const article = {
    id: generateId(),
    title,
    source,
    tags,
    sentences: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reviewCount: 0,
    masteryScore: 0,
  };

  articles.unshift(article);
  saveArticles();
  renderArticleList();
  resetArticleForm();
  openArticleDetail(article.id);
}

function resetArticleForm() {
  elements.title.value = '';
  elements.source.value = '';
  elements.tags.value = '';
}

function renderArticleList() {
  elements.articles.innerHTML = '';
  if (articles.length === 0) {
    elements.emptyList.classList.remove('hidden');
    return;
  }
  elements.emptyList.classList.add('hidden');

  articles.forEach(article => {
    const articleCard = document.createElement('div');
    articleCard.className = 'card';
    articleCard.innerHTML = `
      <div class="detail-header">
        <div>
          <h3>${escapeHtml(article.title)}</h3>
          <div class="sentence-meta-line">来源：${escapeHtml(article.source || '未设置')} · 句子：${article.sentences.length} · 熟练度：${Math.round(article.masteryScore)}%</div>
          <div class="sentence-meta-line">标签：${article.tags.join('，') || '无'}</div>
        </div>
        <div class="sentence-actions">
          <button class="btn btn-primary" data-action="open" data-id="${article.id}">查看</button>
          <button class="btn btn-secondary" data-action="review" data-id="${article.id}">复习</button>
        </div>
      </div>
    `;
    articleCard.querySelector('[data-action="open"]').addEventListener('click', () => openArticleDetail(article.id));
    articleCard.querySelector('[data-action="review"]').addEventListener('click', () => startReview(article.id));
    elements.articles.appendChild(articleCard);
  });
}

async function openArticleDetail(articleId) {
  selectedArticleId = articleId;
  const article = findArticle(articleId);
  if (!article) return;

  elements.detailTitle.textContent = article.title;
  elements.detailMeta.textContent = `来源：${article.source || '未设置'} · 标签：${article.tags.join('，') || '无'}`;
  elements.detailMastery.textContent = `${Math.round(article.masteryScore)}%`;
  elements.detailReviewCount.textContent = article.reviewCount;
  elements.sentenceForm.dataset.articleId = article.id;
  elements.sentenceForm.dataset.editingId = '';
  resetSentenceForm();
  renderSentenceList(article);
  showSection('edit');
}

function renderSentenceList(article) {
  elements.sentences.innerHTML = '';
  if (article.sentences.length === 0) {
    elements.sentences.innerHTML = '<p class="empty-state">请先添加句子，并为每句上传对应音频。</p>';
    return;
  }

  article.sentences.forEach((sentence, index) => {
    const template = elements.sentenceTemplate.content.cloneNode(true);
    const row = template.querySelector('.sentence-row');
    row.querySelector('.sentence-text').textContent = `${index + 1}. ${sentence.text}`;
    row.querySelector('.sentence-translation').textContent = sentence.translation ? `翻译：${sentence.translation}` : '';
    row.querySelector('.sentence-meta-line').textContent = `${sentence.audioId ? '已上传音频' : '无音频'} · 难度：${sentence.difficulty || '无'} · 标签：${sentence.tags.join('，') || '无'} · 复习：${sentence.reviewCount}`;

    row.querySelector('.play-sentence-btn').addEventListener('click', () => playSentence(article.id, sentence.id));
    row.querySelector('.review-sentence-btn').addEventListener('click', () => reviewSingleSentence(article.id, sentence.id));
    row.querySelector('.edit-sentence-btn').addEventListener('click', () => loadSentenceForEdit(article.id, sentence.id));
    row.querySelector('.move-up-sentence-btn').addEventListener('click', () => moveSentence(article.id, sentence.id, -1));
    row.querySelector('.move-down-sentence-btn').addEventListener('click', () => moveSentence(article.id, sentence.id, 1));
    elements.sentences.appendChild(row);
  });
}

async function playSentence(articleId, sentenceId) {
  const article = findArticle(articleId);
  const sentence = article.sentences.find(s => s.id === sentenceId);
  if (!sentence || !sentence.audioId) {
    alert('该句子尚未上传音频。');
    return;
  }
  const url = await getAudioUrl(sentence.audioId);
  reviewAudio.src = url;
  reviewAudio.play();
}

function loadSentenceForEdit(articleId, sentenceId) {
  const article = findArticle(articleId);
  const sentence = article?.sentences.find(s => s.id === sentenceId);
  if (!sentence) return;

  elements.sentenceText.value = sentence.text;
  elements.sentenceTranslation.value = sentence.translation || '';
  elements.sentenceAudio.value = '';
  elements.sentenceDifficulty.value = sentence.difficulty || '';
  elements.sentenceTags.value = sentence.tags.join('，');
  elements.sentenceForm.dataset.editingId = sentence.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function moveSentence(articleId, sentenceId, direction) {
  const article = findArticle(articleId);
  if (!article) return;
  const index = article.sentences.findIndex(s => s.id === sentenceId);
  if (index === -1) return;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= article.sentences.length) return;
  const [item] = article.sentences.splice(index, 1);
  article.sentences.splice(targetIndex, 0, item);
  article.updatedAt = new Date().toISOString();
  saveArticles();
  renderSentenceList(article);
}

function reviewSingleSentence(articleId, sentenceId) {
  startReview(articleId, sentenceId);
}

function handleSentenceSubmit(event) {
  event.preventDefault();
  const article = findArticle(selectedArticleId);
  if (!article) return;

  const editingId = elements.sentenceForm.dataset.editingId;
  const sentenceData = {
    text: elements.sentenceText.value.trim(),
    translation: elements.sentenceTranslation.value.trim(),
    difficulty: elements.sentenceDifficulty.value.trim(),
    tags: splitTags(elements.sentenceTags.value),
  };
  const file = elements.sentenceAudio.files[0] || null;

  if (!sentenceData.text) {
    alert('请填写句子文本。');
    return;
  }

  if (editingId) {
    const sentence = article.sentences.find(s => s.id === editingId);
    if (sentence) {
      Object.assign(sentence, sentenceData);
      if (file) {
        const audioKey = `${editingId}-${Date.now()}`;
        saveAudioBlob(audioKey, file).then(id => {
          sentence.audioId = id;
          sentence.audioName = file.name;
          sentence.updatedAt = new Date().toISOString();
          saveArticles();
          renderSentenceList(article);
        });
      }
      sentence.updatedAt = new Date().toISOString();
    }
  } else {
    const sentence = {
      id: generateId(),
      ...sentenceData,
      audioId: null,
      audioName: null,
      reviewCount: 0,
      masteryScore: 0,
      lastReviewed: null,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    article.sentences.push(sentence);
    if (file) {
      const audioKey = `${sentence.id}-${Date.now()}`;
      saveAudioBlob(audioKey, file).then(id => {
        sentence.audioId = id;
        sentence.audioName = file.name;
        sentence.updatedAt = new Date().toISOString();
        saveArticles();
        renderSentenceList(article);
      });
    }
  }

  article.updatedAt = new Date().toISOString();
  saveArticles();
  renderSentenceList(article);
  resetSentenceForm();
}

function resetSentenceForm() {
  elements.sentenceText.value = '';
  elements.sentenceTranslation.value = '';
  elements.sentenceAudio.value = '';
  elements.sentenceDifficulty.value = '';
  elements.sentenceTags.value = '';
  elements.sentenceForm.dataset.editingId = '';
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
    await importBackup(data);
    elements.backupStatus.textContent = '备份已导入，数据已恢复。';
    elements.backupImport.value = '';
    renderArticleList();
    showSection('list');
  } catch (error) {
    elements.backupStatus.textContent = `导入失败：${error.message}`;
  }
}

async function importBackup(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.articles) || !Array.isArray(data.audioFiles)) {
    throw new Error('无效的备份文件。');
  }
  const importPromises = data.audioFiles.map(async entry => {
    const blob = dataUrlToBlob(entry.data, entry.type);
    await saveAudioBlob(entry.id, blob);
  });
  await Promise.all(importPromises);
  const existingIds = new Set(articles.map(item => item.id));
  data.articles.forEach(article => {
    if (!article.id || !article.title) return;
    if (existingIds.has(article.id)) {
      article.id = generateId();
    }
    articles.push(article);
    existingIds.add(article.id);
  });
  saveArticles();
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

function getAllAudioEntries() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, 'readonly');
    const store = transaction.objectStore(DB_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function findArticle(articleId) {
  return articles.find(item => item.id === articleId);
}

async function saveAudioBlob(articleId, file) {
  const id = `${articleId}-${Date.now()}`;
  const transaction = db.transaction(DB_STORE, 'readwrite');
  const store = transaction.objectStore(DB_STORE);
  store.put({ id, file });
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(id);
    transaction.onerror = () => reject(transaction.error);
  });
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

  recent.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentList = recent.slice(0, 10).map(r => `<div class="report-row">${new Date(r.timestamp).toLocaleString()} · <strong>${escapeHtml(r.articleTitle)}</strong> · ${escapeHtml(r.sentence)} · 得分：${r.score}%</div>`).join('');
  if (elements.reportRecent) elements.reportRecent.innerHTML = recentList || '<div class="empty-state">暂无复习记录。</div>';
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
