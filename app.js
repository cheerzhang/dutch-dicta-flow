const STORAGE_KEY = 'dutchDictaArticles';
const WORD_BOOK_KEY = 'dutchDictaWordBook';
const WORD_REVIEW_SESSIONS_KEY = 'dutchDictaWordReviewSessions';
const A2_VOCAB_PROGRESS_KEY = 'dutchDictaA2VocabProgress';
const DB_NAME = 'dutchDictaAudioDB';
const DB_STORE = 'audioFiles';
const BACKUP_VERSION = 8;
const REPORT_SCHEMA_VERSION = 6;
const A2_VOCAB_SCHEMA_VERSION = 1;

const A2_VOCABULARY = [
  ['bakken', 'bake, fry'], ['bederven', 'spoil'], ['beginnen', 'begin, start'], ['begrijpen', 'understand'], ['bewegen', 'move'],
  ['bidden', 'pray'], ['bieden', 'offer'], ['bijten', 'bite'], ['binden', 'tie'], ['blazen', 'blow'],
  ['blijken', 'appear'], ['blijven', 'stay, remain'], ['braden', 'roast'], ['breken', 'break'], ['brengen', 'bring'],
  ['buigen', 'bend'], ['denken', 'think'], ['doen', 'do'], ['dragen', 'carry, wear'], ['drijven', 'float'],
  ['drinken', 'drink'], ['druipen', 'drip'], ['eten', 'eat'], ['fluiten', 'whistle'], ['gaan', 'go'],
  ['gelden', 'apply, be valid'], ['geven', 'give'], ['gieten', 'pour'], ['glijden', 'slip, slide'], ['graven', 'dig'],
  ['grijpen', 'grab'], ['hangen', 'hang'], ['hebben', 'have'], ['helpen', 'help'], ['heten', 'be called'],
  ['houden', 'hold'], ['jagen', 'hunt'], ['kiezen', 'choose'], ['kijken', 'look'], ['klimmen', 'climb'],
  ['klinken', 'sound'], ['komen', 'come'], ['kopen', 'buy'], ['krijgen', 'get, receive'], ['krimpen', 'shrink'],
  ['kruipen', 'crawl'], ['kunnen', 'be able'], ['lachen', 'laugh'], ['laten', 'let'], ['lezen', 'read'],
  ['liegen', 'lie'], ['liggen', 'lie'], ['lijken', 'appear, seem'], ['lopen', 'walk'], ['moeten', 'must, should'],
  ['mogen', 'be allowed to'], ['nemen', 'take'], ['plegen', 'be in the habit of'], ['rijden', 'ride, drive'], ['rijzen', 'rise'],
  ['roepen', 'call'], ['ruiken', 'smell'], ['scheiden', 'separate'], ['schenken', 'pour, give'], ['scheppen', 'create'],
  ['scheren', 'shave'], ['schieten', 'shoot'], ['schijnen', 'shine, seem'], ['schrijven', 'write'], ['schrikken', 'be shocked'],
  ['schuiven', 'push, shove'], ['slaan', 'hit'], ['slapen', 'sleep'], ['sluiten', 'close'], ['snijden', 'cut'],
  ['spreken', 'speak'], ['springen', 'jump'], ['staan', 'stand'], ['steken', 'stab, sting'], ['stelen', 'steal'],
  ['sterven', 'die'], ['stijgen', 'climb'], ['treden', 'step'], ['treffen', 'hit'], ['trekken', 'pull'],
  ['vallen', 'fall'], ['vangen', 'catch'], ['varen', 'sail'], ['vechten', 'fight'], ['verbieden', 'forbid'],
  ['verdwijnen', 'disappear'], ['vergeten', 'forget'], ['verliezen', 'lose'], ['vermijden', 'avoid'], ['vinden', 'find'],
  ['vliegen', 'fly'], ['vouwen', 'fold'], ['vragen', 'ask'], ['vriezen', 'freeze'], ['waaien', 'blow'],
  ['wassen', 'wash'], ['wegen', 'weigh'], ['werpen', 'throw'], ['weten', 'know'], ['wijzen', 'show, point'],
  ['willen', 'want'], ['winnen', 'win'], ['worden', 'become'], ['wrijven', 'rub'], ['zeggen', 'say'],
  ['zenden', 'send'], ['zien', 'see'], ['zijn', 'be'], ['zitten', 'sit'], ['zingen', 'sing'],
  ['zinken', 'sink'], ['zoeken', 'search, look'], ['zullen', 'will, would'], ['zwemmen', 'swim'], ['zweren', 'swear'],
  ['zwijgen', 'be silent']
].map(([word, translation], index) => ({
  id: `a2-verb-${index + 1}`,
  word,
  translation,
  difficulty: 'A2',
  source: 'Bijlage 3 Onregelmatige werkwoorden',
  tags: ['A2', '动词'],
  wordType: 'verb',
}));

let articles = [];
let wordBook = [];
let wordReviewSessions = [];
let a2VocabProgress = {};
let selectedArticleId = null;
let selectedWordBookId = null;
let selectedWordEditDeck = 'wordbook';
let currentReview = null;
let reviewAudio = new Audio();
let reviewTimer = null;
let recitationTimer = null;
let audioBlobCache = new Map();
let wordReadingState = {
  active: false,
  stopRequested: false,
  currentAudio: null,
};
let masteredArchiveOpen = false;
let wordbookCalendarYear = new Date().getFullYear();

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
  backupExportZip: document.getElementById('backup-export-zip'),
  backupImport: document.getElementById('backup-import'),
  backupImportZip: document.getElementById('backup-import-zip'),
  backupDropZone: document.getElementById('backup-drop-zone'),
  backupZipDropZone: document.getElementById('backup-zip-drop-zone'),
  backupStatus: document.getElementById('backup-status'),
  pageNavButtons: document.querySelectorAll('.page-nav .nav-btn'),
  startReview: document.getElementById('start-review'),
  reviewPanel: document.getElementById('review-panel'),
  recitePanel: document.getElementById('recite-panel'),
  reciteListView: document.getElementById('recite-list-view'),
  reciteWorkspace: document.getElementById('recite-workspace'),
  reciteEligibleCount: document.getElementById('recite-eligible-count'),
  reciteAverageScore: document.getElementById('recite-average-score'),
  reciteArticles: document.getElementById('recite-articles'),
  reciteEmpty: document.getElementById('recite-empty'),
  reciteTitle: document.getElementById('recite-title'),
  reciteMeta: document.getElementById('recite-meta'),
  reciteBack: document.getElementById('recite-back'),
  reciteEnd: document.getElementById('recite-end'),
  reciteSubmitAll: document.getElementById('recite-submit-all'),
  reciteElapsed: document.getElementById('recite-elapsed'),
  recitePrompts: document.getElementById('recite-prompts'),
  reciteInputs: document.getElementById('recite-inputs'),
  reciteOverallResult: document.getElementById('recite-overall-result'),
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
  wordbookReviewUnmastered: document.getElementById('wordbook-review-unmastered'),
  wordbookReadUnmastered: document.getElementById('wordbook-read-unmastered'),
  wordbookCalendar: document.getElementById('wordbook-calendar'),
  wordbookCalendarYear: document.getElementById('wordbook-calendar-year'),
  wordbookCalendarPrev: document.getElementById('wordbook-calendar-prev'),
  wordbookCalendarNext: document.getElementById('wordbook-calendar-next'),
  wordbookReadingPanel: document.getElementById('wordbook-reading-panel'),
  wordbookReadingList: document.getElementById('wordbook-reading-list'),
  wordbookStopReading: document.getElementById('wordbook-stop-reading'),
  wordbookEditPanel: document.getElementById('wordbook-edit-panel'),
  wordbookEditForm: document.getElementById('wordbook-edit-form'),
  wordbookEditTitle: document.getElementById('wordbook-edit-title'),
  a2VocabPanel: document.getElementById('a2-vocab-panel'),
  a2VocabTotalWords: document.getElementById('a2-vocab-total-words'),
  a2VocabReviewedWords: document.getElementById('a2-vocab-reviewed-words'),
  a2VocabOverallMastery: document.getElementById('a2-vocab-overall-mastery'),
  a2VocabPendingReview: document.getElementById('a2-vocab-pending-review'),
  a2VocabReviewAll: document.getElementById('a2-vocab-review-all'),
  a2VocabReviewUnmastered: document.getElementById('a2-vocab-review-unmastered'),
  a2VocabReviewRandom: document.getElementById('a2-vocab-review-random'),
  a2VocabReviewCount: document.getElementById('a2-vocab-review-count'),
  a2VocabReadUnmastered: document.getElementById('a2-vocab-read-unmastered'),
  a2VocabStopReading: document.getElementById('a2-vocab-stop-reading'),
  a2VocabReadingPanel: document.getElementById('a2-vocab-reading-panel'),
  a2VocabReadingList: document.getElementById('a2-vocab-reading-list'),
  a2VocabList: document.getElementById('a2-vocab-list'),
  startIncorrectReview: document.getElementById('start-incorrect-review'),
  startWeakestReview: document.getElementById('start-weakest-review'),
  startUnmasteredReview: document.getElementById('start-unmastered-review'),
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
  reviewElapsed: document.getElementById('review-elapsed'),
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
  loadWordReviewSessions();
  loadA2VocabProgress();
  updateBackupEnvironmentControls();
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

function isLocalRuntime() {
  const { protocol, hostname } = window.location;
  return protocol === 'file:' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function updateBackupEnvironmentControls() {
  if (!elements.backupExportZip) return;
  const allowed = isLocalRuntime();
  elements.backupExportZip.disabled = !allowed;
  elements.backupExportZip.title = allowed
    ? '本地环境可导出完整 ZIP。'
    : '完整导出只在本地运行时开放；线上可导入完整 ZIP。';
  elements.backupExportZip.textContent = allowed ? '完整导出 ZIP' : '完整导出 ZIP（仅本地）';
}

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
  if (elements.wordbookReviewUnmastered) {
    elements.wordbookReviewUnmastered.addEventListener('click', () => startWordReview(null, { onlyUnmastered: true }));
  }
  if (elements.wordbookReadUnmastered) {
    elements.wordbookReadUnmastered.addEventListener('click', startWordListReading);
  }
  if (elements.wordbookCalendarPrev) {
    elements.wordbookCalendarPrev.addEventListener('click', () => {
      wordbookCalendarYear -= 1;
      renderWordBookCalendar();
    });
  }
  if (elements.wordbookCalendarNext) {
    elements.wordbookCalendarNext.addEventListener('click', () => {
      wordbookCalendarYear += 1;
      renderWordBookCalendar();
    });
  }
  if (elements.wordbookStopReading) {
    elements.wordbookStopReading.addEventListener('click', stopWordListReading);
  }
  if (elements.a2VocabReviewAll) {
    elements.a2VocabReviewAll.addEventListener('click', () => startA2VocabReview());
  }
  if (elements.a2VocabReviewUnmastered) {
    elements.a2VocabReviewUnmastered.addEventListener('click', () => startA2VocabReview(null, { onlyUnmastered: true, limit: getA2ReviewCount() }));
  }
  if (elements.a2VocabReviewRandom) {
    elements.a2VocabReviewRandom.addEventListener('click', () => startA2VocabReview(null, { onlyUnmastered: true, random: true, limit: getA2ReviewCount() }));
  }
  if (elements.a2VocabReadUnmastered) {
    elements.a2VocabReadUnmastered.addEventListener('click', () => startA2VocabReading());
  }
  if (elements.a2VocabStopReading) {
    elements.a2VocabStopReading.addEventListener('click', stopWordListReading);
  }
  if (elements.a2VocabList) {
    elements.a2VocabList.addEventListener('click', handleA2VocabListClick);
  }
  if (elements.wordbookEditForm) {
    elements.wordbookEditForm.addEventListener('submit', handleWordBookEditSubmit);
  }
  if (elements.wordbookEditCancel) {
    elements.wordbookEditCancel.addEventListener('click', closeWordBookEditPanel);
  }
  if (elements.wordbookEditPanel) {
    elements.wordbookEditPanel.addEventListener('click', event => {
      if (event.target === elements.wordbookEditPanel || event.target.closest('.wordbook-edit-close-btn')) {
        closeWordBookEditPanel();
      }
    });
  }
  if (elements.wordbookList) {
    elements.wordbookList.addEventListener('click', handleWordbookListClick);
  }
  if (elements.startIncorrectReview) {
    elements.startIncorrectReview.addEventListener('click', () => startReview(selectedArticleId, null, true));
  }
  if (elements.startWeakestReview) {
    elements.startWeakestReview.addEventListener('click', () => startReview(selectedArticleId, null, { mode: 'weakest' }));
  }
  if (elements.startUnmasteredReview) {
    elements.startUnmasteredReview.addEventListener('click', () => startReview(selectedArticleId, null, { mode: 'unmastered' }));
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
  if (elements.dictationInput) {
    elements.dictationInput.addEventListener('keydown', handleDictationInputKeydown);
  }
  if (elements.reciteArticles) {
    elements.reciteArticles.addEventListener('click', handleReciteArticleClick);
  }
  if (elements.recitePrompts) {
    elements.recitePrompts.addEventListener('click', handleRecitePromptClick);
  }
  if (elements.reciteInputs) {
    elements.reciteInputs.addEventListener('click', handleReciteInputsClick);
    elements.reciteInputs.addEventListener('input', handleReciteInputChange);
  }
  if (elements.reciteBack) {
    elements.reciteBack.addEventListener('click', handleReciteBack);
  }
  if (elements.reciteEnd) {
    elements.reciteEnd.addEventListener('click', endRecitationSession);
  }
  if (elements.reciteSubmitAll) {
    elements.reciteSubmitAll.addEventListener('click', submitFullRecitation);
  }
  if (elements.backupExport && typeof exportBackup === 'function') {
    elements.backupExport.addEventListener('click', exportBackup);
  }
  if (elements.backupExportZip && typeof exportBackupZip === 'function') {
    elements.backupExportZip.addEventListener('click', exportBackupZip);
  }
  if (elements.backupImport) {
    elements.backupImport.addEventListener('change', handleBackupImport);
    elements.backupImport.addEventListener('click', event => event.stopPropagation());
  }
  if (elements.backupImportZip) {
    elements.backupImportZip.addEventListener('change', handleBackupZipImport);
    elements.backupImportZip.addEventListener('click', event => event.stopPropagation());
  }
  if (elements.backupDropZone) {
    elements.backupDropZone.addEventListener('click', () => elements.backupImport?.click());
    elements.backupDropZone.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        elements.backupImport?.click();
      }
    });
    ['dragenter', 'dragover'].forEach(type => {
      elements.backupDropZone.addEventListener(type, handleBackupDrag);
    });
    ['dragleave', 'drop'].forEach(type => {
      elements.backupDropZone.addEventListener(type, handleBackupDrag);
    });
    elements.backupDropZone.addEventListener('drop', handleBackupDrop);
  }
  if (elements.backupZipDropZone) {
    elements.backupZipDropZone.addEventListener('click', () => elements.backupImportZip?.click());
    elements.backupZipDropZone.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        elements.backupImportZip?.click();
      }
    });
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(type => {
      elements.backupZipDropZone.addEventListener(type, handleBackupZipDrag);
    });
    elements.backupZipDropZone.addEventListener('drop', handleBackupZipDrop);
  }
  const navButtons = document.querySelectorAll('.page-nav .nav-btn');
  if (navButtons && navButtons.forEach) {
    navButtons.forEach(btn => btn.addEventListener('click', handlePageNav));
  }
  document.addEventListener('keydown', handleGlobalKeydown);
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
  if (currentReview && currentReview.type === 'word') {
    elements.nextSentence.textContent = current >= total ? '查看总结' : '下一词';
    return;
  }
  elements.nextSentence.textContent = current >= total ? '完成复习' : '下一句';
}

function startReviewTimer() {
  stopReviewTimer();
  updateReviewTimerDisplay();
  reviewTimer = setInterval(updateReviewTimerDisplay, 1000);
}

function stopReviewTimer() {
  if (reviewTimer) {
    clearInterval(reviewTimer);
    reviewTimer = null;
  }
}

function updateReviewTimerDisplay() {
  if (!elements.reviewElapsed || !currentReview || !currentReview.startTime) return;
  elements.reviewElapsed.textContent = formatDuration(Date.now() - currentReview.startTime);
}

function updateDictationInputLabel(text) {
  const label = elements.dictationInput?.closest('.field-row')?.querySelector('label');
  if (label) label.textContent = text;
}

function startRecitationTimer() {
  stopRecitationTimer();
  updateRecitationTimerDisplay();
  recitationTimer = setInterval(updateRecitationTimerDisplay, 1000);
}

function stopRecitationTimer() {
  if (recitationTimer) {
    clearInterval(recitationTimer);
    recitationTimer = null;
  }
}

function updateRecitationTimerDisplay() {
  if (!elements.reciteElapsed || !currentRecitation || !currentRecitation.startTime) return;
  elements.reciteElapsed.textContent = formatDuration(Date.now() - currentRecitation.startTime);
}

function showSection(mode) {
  elements.articleCreator.classList.toggle('hidden', mode !== 'create');
  elements.articleDetail.classList.toggle('hidden', mode !== 'edit');
  elements.reviewPanel.classList.toggle('hidden', mode !== 'review');
  elements.recitePanel.classList.toggle('hidden', mode !== 'recite');
  elements.wordbookPanel.classList.toggle('hidden', mode !== 'wordbook');
  if (elements.a2VocabPanel) elements.a2VocabPanel.classList.toggle('hidden', mode !== 'a2vocab');
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
  if (mode === 'a2vocab') {
    renderA2VocabPage();
  }
  if (mode === 'recite') {
    showReciteList();
  }
  if (mode === 'report') showReport();
}

function handleEndReview() {
  if (currentReview && currentReview.completed) {
    const returnPage = currentReview.returnPage || 'list';
    stopReviewTimer();
    currentReview = null;
    showSection(returnPage);
    return;
  }
  if (currentReview) {
    if (currentReview.autoAdvanceTimer) {
      clearTimeout(currentReview.autoAdvanceTimer);
      currentReview.autoAdvanceTimer = null;
    }
    if (currentReview.type === 'word') {
      if (currentReview.doneIds && currentReview.doneIds.size > 0) {
        completeReview({ manual: true });
        return;
      }
      const returnLabel = currentReview.returnPage === 'a2vocab' ? 'A2词汇' : '错题本';
      if (!confirm(`当前词汇复习还没有提交任何内容，确定要结束并回到${returnLabel}吗？`)) {
        return;
      }
      const returnPage = currentReview.returnPage || 'wordbook';
      stopReviewTimer();
      currentReview = null;
      showSection(returnPage);
      return;
    }
    if (currentReview.doneIds && currentReview.doneIds.size > 0) {
      completeReview({ manual: true });
      return;
    }
    const returnLabel = currentReview.returnPage === 'wordbook' ? '错题本' : '文章列表';
    if (!confirm(`当前复习还没有提交任何内容，确定要结束并回到${returnLabel}吗？`)) {
      return;
    }
    const returnPage = currentReview.returnPage || 'list';
    stopReviewTimer();
    currentReview = null;
    showSection(returnPage);
    return;
  }
  showSection('list');
}

function handleDictationInputKeydown(event) {
  if (!currentReview || currentReview.completed || currentReview.type !== 'word') return;
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!elements.submitAnswer.disabled) {
    handleSubmitAnswer();
  } else if (!elements.nextSentence.disabled) {
    showNextSentence();
  }
}

function handleGlobalKeydown(event) {
  if (event.key === 'Escape' && elements.wordbookEditPanel && !elements.wordbookEditPanel.classList.contains('hidden')) {
    closeWordBookEditPanel();
    return;
  }

  const key = String(event.key || '').toLowerCase();
  if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && (key === ' ' || key === 'spacebar')) {
    if (!currentReview || currentReview.completed) return;
    if (elements.reviewPanel?.classList.contains('hidden')) return;
    if (elements.wordbookEditPanel && !elements.wordbookEditPanel.classList.contains('hidden')) return;
    if (elements.playSentence?.disabled) return;

    event.preventDefault();
    playCurrentSentenceAudio().catch(error => {
      console.warn('快捷键播放音频失败：', error && error.message);
    });
  }
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
  } else if (page === 'a2vocab') {
    showSection('a2vocab');
  } else if (page === 'recite') {
    showSection('recite');
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

function loadWordReviewSessions() {
  const raw = localStorage.getItem(WORD_REVIEW_SESSIONS_KEY);
  try {
    wordReviewSessions = raw ? JSON.parse(raw) : [];
  } catch (e) {
    wordReviewSessions = [];
  }
  wordReviewSessions = normalizeWordReviewSessions(wordReviewSessions);
}

function saveWordReviewSessions() {
  localStorage.setItem(WORD_REVIEW_SESSIONS_KEY, JSON.stringify(normalizeWordReviewSessions(wordReviewSessions).slice(-120)));
}

function loadA2VocabProgress() {
  const raw = localStorage.getItem(A2_VOCAB_PROGRESS_KEY);
  try {
    a2VocabProgress = raw ? JSON.parse(raw) : {};
  } catch (e) {
    a2VocabProgress = {};
  }
  if (!a2VocabProgress || typeof a2VocabProgress !== 'object' || Array.isArray(a2VocabProgress)) {
    a2VocabProgress = {};
  }
}

function saveA2VocabProgress() {
  localStorage.setItem(A2_VOCAB_PROGRESS_KEY, JSON.stringify(a2VocabProgress));
}

function getA2VocabEntries() {
  return A2_VOCABULARY.map(item => ({
    ...item,
    translation: safeString(a2VocabProgress[item.id]?.translation) || item.translation,
    count: toNumber(a2VocabProgress[item.id]?.count, 0),
    masteryScore: toNumber(a2VocabProgress[item.id]?.masteryScore, 0),
    reviewCount: toNumber(a2VocabProgress[item.id]?.reviewCount, 0),
    lastReviewed: safeString(a2VocabProgress[item.id]?.lastReviewed),
    lastSeen: safeString(a2VocabProgress[item.id]?.lastSeen),
    audioId: safeString(a2VocabProgress[item.id]?.audioId) || null,
    audioName: safeString(a2VocabProgress[item.id]?.audioName),
    history: Array.isArray(a2VocabProgress[item.id]?.history) ? a2VocabProgress[item.id].history : [],
    fixed: true,
    deck: 'a2vocab',
  }));
}

function getA2VocabEntry(id) {
  return getA2VocabEntries().find(item => String(item.id) === String(id));
}

function saveA2VocabEntryProgress(entry) {
  if (!entry || !entry.id) return;
  a2VocabProgress[entry.id] = {
    translation: safeString(entry.translation),
    count: toNumber(entry.count, 0),
    masteryScore: toNumber(entry.masteryScore, 0),
    reviewCount: toNumber(entry.reviewCount, 0),
    lastReviewed: safeString(entry.lastReviewed),
    lastSeen: safeString(entry.lastSeen),
    audioId: safeString(entry.audioId) || null,
    audioName: safeString(entry.audioName),
    history: Array.isArray(entry.history) ? entry.history.slice(0, 30) : [],
  };
  saveA2VocabProgress();
}

function getWordDeckEntries(deck = 'wordbook') {
  return deck === 'a2vocab' ? getA2VocabEntries() : wordBook;
}

function getWordDeckEntry(id, deck = 'wordbook') {
  return getWordDeckEntries(deck).find(item => String(item.id) === String(id));
}

function saveWordDeckEntry(entry, deck = 'wordbook') {
  if (deck === 'a2vocab') {
    saveA2VocabEntryProgress(entry);
    return;
  }
  saveWordBook();
}

function normalizeWordReviewSessions(sessions) {
  if (!Array.isArray(sessions)) return [];
  const seen = new Set();
  return sessions
    .map(session => ({
      sessionId: session?.sessionId || '',
      timestamp: session?.timestamp || '',
      duration: toNumber(session?.duration, 0),
      averageScore: toNumber(session?.averageScore, 0),
      reviewedCount: toNumber(session?.reviewedCount, 0),
      mode: safeString(session?.mode || 'review'),
      deck: safeString(session?.deck || 'wordbook'),
    }))
    .filter(session => session.duration > 0 && !Number.isNaN(new Date(session.timestamp).getTime()))
    .filter(session => {
      const key = session.sessionId || `${session.timestamp}-${session.duration}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
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

function normalizeWordToken(word) {
  return String(word)
    .toLowerCase()
    .replace(/['’‘`´]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function tokenizeWordObjects(text) {
  const matches = String(text).match(/[\p{L}\p{N}]+(?:['’‘`´][\p{L}\p{N}]+)*/gu) || [];
  return matches
    .map(raw => ({ raw, normalized: normalizeWordToken(raw) }))
    .filter(item => item.normalized);
}

function tokenizeWords(text) {
  return tokenizeWordObjects(text).map(item => item.normalized);
}

function alignMistypedWordPairs(target, answer) {
  const targetWords = tokenizeWordObjects(target);
  const answerWords = tokenizeWordObjects(answer);
  const rows = targetWords.length;
  const cols = answerWords.length;
  const dp = Array.from({ length: rows + 1 }, () => Array(cols + 1).fill(0));

  for (let i = 0; i <= rows; i += 1) dp[i][0] = i;
  for (let j = 0; j <= cols; j += 1) dp[0][j] = j;

  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      const same = targetWords[i - 1].normalized === answerWords[j - 1].normalized;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (same ? 0 : 1)
      );
    }
  }

  const pairs = [];
  let i = rows;
  let j = cols;
  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + (targetWords[i - 1].normalized === answerWords[j - 1].normalized ? 0 : 1)
    ) {
      if (targetWords[i - 1].normalized !== answerWords[j - 1].normalized) {
        pairs.unshift({ expected: targetWords[i - 1].raw, actual: answerWords[j - 1].raw });
      }
      i -= 1;
      j -= 1;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      pairs.unshift({ expected: targetWords[i - 1].raw, actual: '（缺失）' });
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return pairs;
}

function getMistypedWords(target, answer) {
  return Array.from(new Set(alignMistypedWordPairs(target, answer).map(pair => pair.expected)));
}

function getMistypedWordPairs(target, answer) {
  return alignMistypedWordPairs(target, answer);
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
    if (toNumber(entry.masteryScore, 0) >= 100) {
      entry.masteryScore = 80;
    }
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
    if (toNumber(entry.masteryScore, 0) >= 100) {
      entry.masteryScore = 80;
    }
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

  function normalizeReviewSessions(sessions, articleId = '') {
    if (!Array.isArray(sessions)) return [];
    const seen = new Set();
    return sessions
      .map(session => ({
        sessionId: safeString(session?.sessionId),
        timestamp: safeString(session?.timestamp),
        duration: toNumber(session?.duration, 0),
        averageScore: toNumber(session?.averageScore, 0),
        reviewedCount: toNumber(session?.reviewedCount, 0),
        articleId: safeString(session?.articleId || articleId),
      }))
      .filter(session => session.duration > 0 && !Number.isNaN(new Date(session.timestamp).getTime()))
      .filter(session => {
        const key = session.sessionId || `${session.timestamp}-${session.duration}-${session.articleId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizeRecitationSessions(sessions) {
    if (!Array.isArray(sessions)) return [];
    const seen = new Set();
    return sessions
      .map(session => ({
        sessionId: safeString(session?.sessionId),
        timestamp: safeString(session?.timestamp),
        averageScore: toNumber(session?.averageScore, 0),
        partial: !!session?.partial,
        completedCount: toNumber(session?.completedCount, 0),
        total: toNumber(session?.total, 0),
        duration: toNumber(session?.duration, 0),
        results: Array.isArray(session?.results)
          ? session.results.map(item => ({
              sentenceId: safeString(item?.sentenceId),
              answer: safeString(item?.answer),
              correctText: safeString(item?.correctText),
              score: toNumber(item?.score, 0),
            }))
          : [],
      }))
      .filter(session => !Number.isNaN(new Date(session.timestamp).getTime()))
      .filter(session => {
        const key = session.sessionId || `${session.timestamp}-${session.averageScore}-${session.completedCount}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
      sentences: dedupeSentencesForBackup(rawSentences.map(normalizeSentenceForBackup).filter(sentence => sentence.text)),
      reviewCount: toNumber(source.reviewCount, 0),
      reviewTimes: Array.isArray(source.reviewTimes) ? source.reviewTimes.filter(time => typeof time === 'number' && Number.isFinite(time)) : [],
      reviewSessions: normalizeReviewSessions(source.reviewSessions, safeString(source.id)),
      recitationSessions: normalizeRecitationSessions(source.recitationSessions),
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

  function getSentenceImportKey(sentence) {
    return safeString(sentence && sentence.text).trim().toLowerCase();
  }

  function mergeSentenceEntries(primary, duplicate) {
    primary.translation = primary.translation || duplicate.translation || '';
    primary.difficulty = primary.difficulty || duplicate.difficulty || '';
    primary.tags = mergeUniqueStrings(primary.tags, duplicate.tags);
    primary.audioId = primary.audioId || duplicate.audioId || null;
    primary.audioName = primary.audioName || duplicate.audioName || '';
    primary.masteryScore = Math.max(toNumber(primary.masteryScore, 0), toNumber(duplicate.masteryScore, 0));
    primary.reviewCount = Math.max(toNumber(primary.reviewCount, 0), toNumber(duplicate.reviewCount, 0));
    primary.history = [...(Array.isArray(primary.history) ? primary.history : []), ...(Array.isArray(duplicate.history) ? duplicate.history : [])];
    primary.lastReviewed = safeString(primary.lastReviewed) > safeString(duplicate.lastReviewed) ? primary.lastReviewed : duplicate.lastReviewed;
    primary.updatedAt = safeString(primary.updatedAt) > safeString(duplicate.updatedAt) ? primary.updatedAt : duplicate.updatedAt;
    return primary;
  }

  function dedupeSentencesForBackup(sentences) {
    const byText = new Map();
    sentences.forEach(sentence => {
      const key = getSentenceImportKey(sentence);
      if (!key) return;
      if (byText.has(key)) {
        mergeSentenceEntries(byText.get(key), sentence);
      } else {
        byText.set(key, sentence);
      }
    });
    return Array.from(byText.values());
  }

  function getWordImportKey(entry) {
    return safeString(entry && entry.word).trim().toLowerCase();
  }

  function mergeUniqueStrings(a = [], b = [], limit = Infinity) {
    const merged = [];
    [...a, ...b].forEach(item => {
      const value = safeString(item).trim();
      if (value && !merged.includes(value)) merged.push(value);
    });
    return merged.slice(0, limit);
  }

  function mergeWordBookEntries(primary, duplicate) {
    primary.count = Math.max(toNumber(primary.count, 0), toNumber(duplicate.count, 0));
    primary.reviewCount = Math.max(toNumber(primary.reviewCount, 0), toNumber(duplicate.reviewCount, 0));
    primary.masteryScore = Math.max(toNumber(primary.masteryScore, 0), toNumber(duplicate.masteryScore, 0));
    primary.lastSeen = safeString(primary.lastSeen) > safeString(duplicate.lastSeen) ? primary.lastSeen : duplicate.lastSeen;
    primary.examples = mergeUniqueStrings(primary.examples, duplicate.examples, 3);
    primary.tags = mergeUniqueStrings(primary.tags, duplicate.tags);
    primary.history = Array.isArray(primary.history) ? primary.history : [];
    if (Array.isArray(duplicate.history)) {
      primary.history = [...primary.history, ...duplicate.history];
    }
    primary.translation = primary.translation || duplicate.translation || '';
    primary.difficulty = primary.difficulty || duplicate.difficulty || '';
    primary.source = primary.source || duplicate.source || '';
    primary.audioId = primary.audioId || duplicate.audioId || null;
    primary.audioName = primary.audioName || duplicate.audioName || '';
    return primary;
  }

  function mergeReviewSessions(a = [], b = [], articleId = '') {
    return normalizeReviewSessions([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])], articleId);
  }

  function mergeReviewTimes(a = [], b = []) {
    const merged = [];
    [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])].forEach(time => {
      if (typeof time === 'number' && Number.isFinite(time) && !merged.includes(time)) {
        merged.push(time);
      }
    });
    return merged;
  }

  function mergeRecitationSessions(a = [], b = []) {
    return normalizeRecitationSessions([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
  }

  function getPortableRecitationSessions(normalizedArticles) {
    return normalizedArticles.flatMap(article => {
      return normalizeRecitationSessions(article.recitationSessions).map(session => ({
        ...session,
        articleId: article.id,
        articleTitle: article.title,
        articleSource: article.source,
      }));
    });
  }

  function normalizePortableRecitationSessions(sessions) {
    if (!Array.isArray(sessions)) return [];
    return sessions
      .map(session => {
        const normalized = normalizeRecitationSessions([session])[0];
        if (!normalized) return null;
        return {
          ...normalized,
          articleId: safeString(session?.articleId),
          articleTitle: safeString(session?.articleTitle || session?.title),
          articleSource: safeString(session?.articleSource || session?.source),
        };
      })
      .filter(session => session && (session.articleId || session.articleTitle));
  }

  function getReportDataSnapshot(normalizedArticles, normalizedWordBook, normalizedWordReviewSessions, portableRecitationSessions) {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const dateKey = date => getLocalDateKey(date);
    const isSameDay = (a, b) => (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
    const articleReviewSessions = [];
    const recitationSessions = [];
    const allSentences = normalizedArticles.flatMap(article => article.sentences || []);
    const sentenceHistory = [];

    normalizedArticles.forEach(article => {
      articleReviewSessions.push(...normalizeReviewSessions(article.reviewSessions, article.id).map(session => ({
        ...session,
        type: 'dictation',
        title: article.title,
        articleId: article.id,
      })));
      recitationSessions.push(...normalizeRecitationSessions(article.recitationSessions).map(session => ({
        ...session,
        type: 'recitation',
        title: article.title,
        articleId: article.id,
      })));
      (article.sentences || []).forEach(sentence => {
        (Array.isArray(sentence.history) ? sentence.history : []).forEach(entry => {
          sentenceHistory.push(Object.assign({ articleId: article.id }, entry));
        });
      });
    });

    const wordSessions = normalizedWordReviewSessions.map(session => ({
      ...session,
      type: 'word',
      title: '单词复习',
    }));
    const timedStudySessions = [...articleReviewSessions, ...recitationSessions, ...wordSessions];
    const totalDuration = timedStudySessions.reduce((sum, session) => sum + toNumber(session.duration, 0), 0);
    const sessionsLast7 = timedStudySessions.filter(session => {
      const date = new Date(session.timestamp);
      return !Number.isNaN(date.getTime()) && (now - date) <= 7 * oneDayMs;
    });
    const sessionsLast30 = timedStudySessions.filter(session => {
      const date = new Date(session.timestamp);
      return !Number.isNaN(date.getTime()) && (now - date) <= 30 * oneDayMs;
    });
    const studyTodayMs = timedStudySessions
      .filter(session => isSameDay(new Date(session.timestamp), now))
      .reduce((sum, session) => sum + toNumber(session.duration, 0), 0);
    const study7Ms = sessionsLast7.reduce((sum, session) => sum + toNumber(session.duration, 0), 0);
    const study30Ms = sessionsLast30.reduce((sum, session) => sum + toNumber(session.duration, 0), 0);
    const qualitySessionsLast7 = sessionsLast7.filter(session => toNumber(session.averageScore, 0) > 0);
    const qualityLast7 = qualitySessionsLast7.length
      ? Math.round(qualitySessionsLast7.reduce((sum, session) => sum + toNumber(session.averageScore, 0), 0) / qualitySessionsLast7.length)
      : 0;
    const activeDays30 = new Set(sessionsLast30.map(session => dateKey(new Date(session.timestamp)))).size;
    const activeDays7 = new Set(sessionsLast7.map(session => dateKey(new Date(session.timestamp)))).size;
    const allDaysSet = new Set(timedStudySessions.map(session => dateKey(new Date(session.timestamp))));
    let currentStreak = 0;
    for (let i = 0; ; i += 1) {
      const date = new Date(now.getTime() - i * oneDayMs);
      if (allDaysSet.has(dateKey(date))) currentStreak += 1; else break;
    }

    const totalSentences = allSentences.length;
    const totalScore = allSentences.reduce((sum, sentence) => sum + toNumber(sentence.masteryScore, 0), 0);
    const overallMastery = totalSentences ? Math.round(totalScore / totalSentences) : 0;
    const masteredSentences = allSentences.filter(sentence => toNumber(sentence.masteryScore, 0) >= 90).length;
    const learningSentences = allSentences.filter(sentence => {
      const score = toNumber(sentence.masteryScore, 0);
      return score > 0 && score < 90;
    }).length;
    const untouchedSentences = allSentences.filter(sentence => {
      const hasHistory = Array.isArray(sentence.history) && sentence.history.length > 0;
      return !hasHistory && toNumber(sentence.reviewCount, 0) === 0 && toNumber(sentence.masteryScore, 0) <= 0;
    }).length;
    const pendingSentences = Math.max(0, totalSentences - masteredSentences);
    const reviewedSentenceCount = Math.max(0, totalSentences - untouchedSentences);
    const reviewCoverage = totalSentences ? Math.round((reviewedSentenceCount / totalSentences) * 100) : 0;
    const masteryRate = totalSentences ? Math.round((masteredSentences / totalSentences) * 100) : 0;

    const articleMastery = normalizedArticles
      .filter(article => (article.sentences || []).length)
      .map(article => ({
        articleId: article.id,
        title: article.title,
        reviewCount: toNumber(article.reviewCount, 0),
        sentenceCount: (article.sentences || []).length,
        mastery: Math.round(toNumber(article.masteryScore, 0)),
      }))
      .sort((a, b) => a.mastery - b.mastery || b.reviewCount - a.reviewCount);
    const masteredArticles = articleMastery.filter(item => item.mastery >= 90).length;
    const pendingArticles = Math.max(0, articleMastery.length - masteredArticles);

    const recitationArticleStats = normalizedArticles
      .map(article => {
        const sessions = normalizeRecitationSessions(article.recitationSessions)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (!sessions.length) return null;
        const scores = sessions.map(session => Math.round(toNumber(session.averageScore, 0)));
        return {
          articleId: article.id,
          title: article.title,
          count: sessions.length,
          averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
          latestScore: scores[0] || 0,
          bestScore: Math.max(...scores),
          partialCount: sessions.filter(session => session.partial).length,
          totalDuration: sessions.reduce((sum, session) => sum + toNumber(session.duration, 0), 0),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.averageScore - b.averageScore || b.count - a.count);
    const masteredRecitationArticles = recitationArticleStats.filter(item => item.averageScore >= 90).length;
    const avgRecitationScore = recitationSessions.length
      ? Math.round(recitationSessions.reduce((sum, session) => sum + toNumber(session.averageScore, 0), 0) / recitationSessions.length)
      : 0;
    const recitationPartialCount = recitationSessions.filter(session => session.partial).length;

    const totalMistakeWords = normalizedWordBook.length;
    const masteredMistakeWords = normalizedWordBook.filter(item => toNumber(item.masteryScore, 0) >= 90).length;
    const activeMistakeWords = normalizedWordBook.filter(item => toNumber(item.masteryScore, 0) < 90).length;
    const avgMistakeWordMastery = totalMistakeWords
      ? Math.round(normalizedWordBook.reduce((sum, item) => sum + toNumber(item.masteryScore, 0), 0) / totalMistakeWords)
      : 0;
    const mostReviewedUnmasteredWords = normalizedWordBook
      .filter(item => toNumber(item.masteryScore, 0) < 100)
      .sort((a, b) => toNumber(b.reviewCount, 0) - toNumber(a.reviewCount, 0) || toNumber(a.masteryScore, 0) - toNumber(b.masteryScore, 0))
      .slice(0, 10)
      .map(item => ({
        word: item.word,
        reviewCount: toNumber(item.reviewCount, 0),
        mistakeCount: toNumber(item.count, 0),
        masteryScore: Math.round(toNumber(item.masteryScore, 0)),
      }));

    const dailyStudyLast30 = [];
    for (let i = 29; i >= 0; i -= 1) {
      const date = new Date(now.getTime() - i * oneDayMs);
      const key = dateKey(date);
      const daySessions = timedStudySessions.filter(session => dateKey(new Date(session.timestamp)) === key);
      dailyStudyLast30.push({
        date: key,
        duration: daySessions.reduce((sum, session) => sum + toNumber(session.duration, 0), 0),
        sessionCount: daySessions.length,
      });
    }
    const dailyQualityLast14 = dailyStudyLast30.slice(-14).map(day => {
      const daySessions = timedStudySessions.filter(session => {
        return dateKey(new Date(session.timestamp)) === day.date && toNumber(session.averageScore, 0) > 0;
      });
      return {
        date: day.date,
        score: daySessions.length
          ? Math.round(daySessions.reduce((sum, session) => sum + toNumber(session.averageScore, 0), 0) / daySessions.length)
          : 0,
        scoredSessionCount: daySessions.length,
      };
    });
    const calendarYear = now.getFullYear();
    const getStudyCalendarLevel = duration => {
      if (!duration) return 0;
      if (duration <= 5 * 60 * 1000) return 1;
      if (duration <= 15 * 60 * 1000) return 2;
      if (duration <= 30 * 60 * 1000) return 3;
      return 4;
    };
    const getWordCalendarLevel = count => {
      if (!count) return 0;
      if (count <= 2) return 1;
      if (count <= 5) return 2;
      if (count <= 9) return 3;
      return 4;
    };
    const serializeStudyCalendar = year => {
      const days = [];
      const firstDay = new Date(year, 0, 1);
      const daysInYear = Math.round((new Date(year + 1, 0, 1) - firstDay) / oneDayMs);
      for (let i = 0; i < daysInYear; i += 1) {
        const date = new Date(year, 0, 1 + i);
        const key = dateKey(date);
        const daySessions = timedStudySessions.filter(session => dateKey(new Date(session.timestamp)) === key);
        const duration = daySessions.reduce((sum, session) => sum + toNumber(session.duration, 0), 0);
        const scoredSessions = daySessions.filter(session => toNumber(session.averageScore, 0) > 0);
        const averageScore = scoredSessions.length
          ? Math.round(scoredSessions.reduce((sum, session) => sum + toNumber(session.averageScore, 0), 0) / scoredSessions.length)
          : 0;
        days.push({
          date: key,
          week: Math.floor((i + firstDay.getDay()) / 7) + 1,
          weekday: date.getDay(),
          duration,
          sessionCount: daySessions.length,
          averageScore,
          level: getStudyCalendarLevel(duration),
        });
      }
      return {
        year,
        weekCount: Math.ceil((daysInYear + firstDay.getDay()) / 7),
        activeDays: days.filter(day => day.duration > 0).length,
        totalDuration: days.reduce((sum, day) => sum + day.duration, 0),
        maxDayDuration: days.reduce((max, day) => Math.max(max, day.duration), 0),
        levelBasis: [
          { level: 0, label: '0' },
          { level: 1, label: '<=5min' },
          { level: 2, label: '<=15min' },
          { level: 3, label: '<=30min' },
          { level: 4, label: '>30min' },
        ],
        days,
      };
    };
    const serializeWordBookCalendar = year => {
      const activity = new Map();
      const ensureDay = key => {
        if (!activity.has(key)) {
          activity.set(key, {
            reviewedCount: 0,
            sessionCount: 0,
            duration: 0,
            scoreTotal: 0,
            scoredCount: 0,
          });
        }
        return activity.get(key);
      };
      const sessionDates = new Set();
      normalizedWordReviewSessions.forEach(session => {
        const date = new Date(session.timestamp);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
        const key = dateKey(date);
        const day = ensureDay(key);
        day.reviewedCount += Math.max(1, toNumber(session.reviewedCount, 0));
        day.sessionCount += 1;
        day.duration += toNumber(session.duration, 0);
        if (toNumber(session.averageScore, 0) > 0) {
          day.scoreTotal += toNumber(session.averageScore, 0);
          day.scoredCount += 1;
        }
        sessionDates.add(key);
      });
      normalizedWordBook.forEach(word => {
        (Array.isArray(word.history) ? word.history : []).forEach(entry => {
          const date = new Date(entry.timestamp);
          if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
          const key = dateKey(date);
          if (sessionDates.has(key)) return;
          const day = ensureDay(key);
          day.reviewedCount += 1;
          if (toNumber(entry.score, 0) > 0) {
            day.scoreTotal += toNumber(entry.score, 0);
            day.scoredCount += 1;
          }
        });
      });

      const days = [];
      const firstDay = new Date(year, 0, 1);
      const daysInYear = Math.round((new Date(year + 1, 0, 1) - firstDay) / oneDayMs);
      for (let i = 0; i < daysInYear; i += 1) {
        const date = new Date(year, 0, 1 + i);
        const key = dateKey(date);
        const day = activity.get(key);
        const reviewedCount = day?.reviewedCount || 0;
        days.push({
          date: key,
          week: Math.floor((i + firstDay.getDay()) / 7) + 1,
          weekday: date.getDay(),
          reviewedCount,
          sessionCount: day?.sessionCount || 0,
          duration: day?.duration || 0,
          averageScore: day?.scoredCount ? Math.round(day.scoreTotal / day.scoredCount) : 0,
          level: getWordCalendarLevel(reviewedCount),
        });
      }
      return {
        year,
        weekCount: Math.ceil((daysInYear + firstDay.getDay()) / 7),
        activeDays: days.filter(day => day.reviewedCount > 0).length,
        totalReviewed: days.reduce((sum, day) => sum + day.reviewedCount, 0),
        maxDayReviewed: days.reduce((max, day) => Math.max(max, day.reviewedCount), 0),
        levelBasis: [
          { level: 0, label: '0' },
          { level: 1, label: '1-2' },
          { level: 2, label: '3-5' },
          { level: 3, label: '6-9' },
          { level: 4, label: '10+' },
        ],
        days,
      };
    };
    const studyCalendarYears = Array.from(new Set(timedStudySessions
      .map(session => new Date(session.timestamp))
      .filter(date => !Number.isNaN(date.getTime()))
      .map(date => date.getFullYear())
      .concat(calendarYear)))
      .sort((a, b) => a - b);
    const wordBookCalendarYears = Array.from(new Set([
      ...normalizedWordReviewSessions
        .map(session => new Date(session.timestamp))
        .filter(date => !Number.isNaN(date.getTime()))
        .map(date => date.getFullYear()),
      ...normalizedWordBook.flatMap(word => (Array.isArray(word.history) ? word.history : [])
        .map(entry => new Date(entry.timestamp))
        .filter(date => !Number.isNaN(date.getTime()))
        .map(date => date.getFullYear())),
      calendarYear,
    ])).sort((a, b) => a - b);

    const reviewedUnits = Math.max(1, sentenceHistory.length + normalizedWordReviewSessions.reduce((sum, session) => sum + toNumber(session.reviewedCount, 0), 0));
    const avgMsPerUnit = Math.min(180000, Math.max(20000, Math.round(totalDuration / reviewedUnits) || 60000));
    const avgDailyMs7 = Math.round(study7Ms / 7);
    const avgActiveDayMs7 = activeDays7 ? Math.round(study7Ms / activeDays7) : 0;
    const recitationNeedsPractice = recitationArticleStats.filter(item => item.averageScore < 90).length;
    const remainingUnits = pendingSentences + activeMistakeWords + recitationNeedsPractice;
    const estimatedRemainingMs = remainingUnits * avgMsPerUnit * 2;
    const estimateBasisMs = avgDailyMs7 || (totalDuration ? Math.round(totalDuration / Math.max(activeDays30, 1)) : 0);
    const estimatedDays = remainingUnits === 0 ? 0 : estimateBasisMs ? Math.max(1, Math.ceil(estimatedRemainingMs / estimateBasisMs)) : null;
    const estimatedWeeks = estimatedDays === 0 ? 0 : estimatedDays ? Math.max(1, Math.ceil(estimatedDays / 7)) : null;

    return {
      schemaVersion: REPORT_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      basis: {
        masteryThreshold: 90,
        strongQualityThreshold: 85,
        lowQualityThreshold: 65,
        planningMultiplier: 2,
        qualityAverage: 'unweighted-session-average',
      },
      sources: [
        'articles.reviewSessions',
        'articles.recitationSessions',
        'wordReviewSessions',
      ],
      inventory: {
        articles: normalizedArticles.length,
        sentences: totalSentences,
        mistakeWords: totalMistakeWords,
        recitedArticles: recitationArticleStats.length,
      },
      mastery: {
        overall: overallMastery,
        sentenceMasteryRate: masteryRate,
        reviewCoverage,
        masteredSentences,
        learningSentences,
        untouchedSentences,
        pendingSentences,
        masteredArticles,
        pendingArticles,
      },
      activity: {
        todayDuration: studyTodayMs,
        last7Duration: study7Ms,
        last30Duration: study30Ms,
        totalDuration,
        last7Quality: qualityLast7,
        activeDaysLast30: activeDays30,
        currentStreak,
        averageDailyDurationLast7: avgDailyMs7,
        averageActiveDayDurationLast7: avgActiveDayMs7,
      },
      planning: {
        remainingUnits,
        pendingSentences,
        activeMistakeWords,
        recitationNeedsPractice,
        estimatedRemainingDuration: estimatedRemainingMs,
        estimateBasisDurationPerDay: estimateBasisMs,
        estimatedDays,
        estimatedWeeks,
      },
      recitation: {
        sessionCount: recitationSessions.length,
        articleCount: recitationArticleStats.length,
        averageScore: avgRecitationScore,
        masteredArticleCount: masteredRecitationArticles,
        stableRate: recitationArticleStats.length ? Math.round((masteredRecitationArticles / recitationArticleStats.length) * 100) : 0,
        partialCount: recitationPartialCount,
      },
      mistakes: {
        totalWords: totalMistakeWords,
        masteredWords: masteredMistakeWords,
        activeWords: activeMistakeWords,
        averageMastery: avgMistakeWordMastery,
      },
      charts: {
        dailyStudyLast30,
        dailyQualityLast14,
        articleMasteryScatter: articleMastery.map(item => ({
          articleId: item.articleId,
          title: item.title,
          xReviewCount: item.reviewCount,
          yMastery: item.mastery,
          sentenceCount: item.sentenceCount,
        })),
      },
      calendars: {
        currentYear: calendarYear,
        availableYears: {
          study: studyCalendarYears,
          wordBook: wordBookCalendarYears,
        },
        study: serializeStudyCalendar(calendarYear),
        wordBook: serializeWordBookCalendar(calendarYear),
      },
      lists: {
        priorityArticles: articleMastery
          .filter(item => item.mastery < 90)
          .slice(0, 10),
        recitationByArticle: recitationArticleStats,
        mostReviewedUnmasteredWords,
      },
      counts: {
        articles: normalizedArticles.length,
        sentences: totalSentences,
        articleReviewSessions: articleReviewSessions.length,
        recitationSessions: portableRecitationSessions.length,
        wordReviewSessions: normalizedWordReviewSessions.length,
      },
    };
  }

  function buildBackupPayload(options = {}) {
    const normalizedArticles = articles.map(normalizeArticleForBackup).filter(article => article.title);
    const normalizedWordBook = wordBook.map(normalizeWordBookEntryForBackup).filter(entry => entry.word);
    const normalizedWordReviewSessions = normalizeWordReviewSessions(wordReviewSessions);
    const normalizedA2VocabProgress = Object.fromEntries(Object.entries(a2VocabProgress || {}).filter(([id]) => {
      return A2_VOCABULARY.some(item => item.id === id);
    }));
    const a2Vocabulary = {
      schemaVersion: A2_VOCAB_SCHEMA_VERSION,
      source: 'Bijlage 3 Onregelmatige werkwoorden',
      level: 'A2',
      wordType: 'verb',
      total: A2_VOCABULARY.length,
      entries: A2_VOCABULARY.map(item => ({
        id: item.id,
        word: item.word,
        translation: item.translation,
        difficulty: item.difficulty,
        source: item.source,
        tags: item.tags,
        wordType: item.wordType,
      })),
    };
    const portableRecitationSessions = getPortableRecitationSessions(normalizedArticles);
    return Object.assign({
      version: BACKUP_VERSION,
      reportSchema: REPORT_SCHEMA_VERSION,
      dataKinds: [
        'articles',
        'articleReviewSessions',
        'recitationSessions',
        'wordBook',
        'wordBookMasteryStats',
        'wordReviewSessions',
        'a2Vocabulary',
        'a2VocabProgress',
        'reportData',
        'calendarSnapshots',
        'audioFiles',
      ],
      articles: normalizedArticles,
      wordBook: normalizedWordBook,
      wordBookMasteryStats: getWordBookMasteryStats(normalizedWordBook),
      wordReviewSessions: normalizedWordReviewSessions,
      a2Vocabulary,
      a2VocabProgress: normalizedA2VocabProgress,
      recitationSessions: portableRecitationSessions,
      reportData: getReportDataSnapshot(normalizedArticles, normalizedWordBook, normalizedWordReviewSessions, portableRecitationSessions),
      audioFiles: Array.isArray(options.audioFiles) ? options.audioFiles : [],
      exportedAt: new Date().toISOString(),
    }, options.packageType ? { packageType: options.packageType } : {});
  }

  function dedupeWordBookEntries(entries) {
    const byWord = new Map();
    entries.forEach(rawEntry => {
      const entry = normalizeWordBookEntryForBackup(rawEntry);
      const key = getWordImportKey(entry);
      if (!key) return;
      if (byWord.has(key)) {
        mergeWordBookEntries(byWord.get(key), entry);
      } else {
        byWord.set(key, entry);
      }
    });
    return Array.from(byWord.values());
  }

  async function exportBackup() {
    try {
      const audioEntries = await getAllAudioEntries();
      const audioFiles = await Promise.all(audioEntries.map(async entry => {
        const data = await blobToBase64(entry.file);
        return { id: entry.id, type: entry.file.type, data };
      }));
      const payload = buildBackupPayload({
        audioFiles,
      });
      downloadJson(payload, `dutch-dicta-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);
      elements.backupStatus.textContent = `备份已生成：包含 ${payload.articles.length} 篇文章、${payload.recitationSessions.length} 条全文默写记录、${payload.wordReviewSessions.length} 条单词复习记录、${payload.a2Vocabulary.total} 个A2动词与A2进度。`;
    } catch (error) {
      elements.backupStatus.textContent = `备份失败：${error.message}`;
    }
  }

  async function exportBackupZip() {
    if (!isLocalRuntime()) {
      elements.backupStatus.textContent = '完整导出 ZIP 只在本地运行时开放；线上环境可以使用完整导入 ZIP。';
      return;
    }
    try {
      elements.backupStatus.textContent = '正在生成完整 ZIP 备份...';
      const audioEntries = await getAllAudioEntries();
      const audioFiles = audioEntries.map(entry => {
        const type = entry.file.type || 'audio/mpeg';
        const path = `audio/${sanitizeZipPath(entry.id)}${getAudioExtension(type)}`;
        return { id: entry.id, type, path, size: entry.file.size || 0 };
      });
      const payload = buildBackupPayload({
        packageType: 'zip',
        audioFiles,
      });
      const files = [
        {
          name: 'backup.json',
          data: new TextEncoder().encode(JSON.stringify(payload, null, 2)),
        },
      ];
      for (let i = 0; i < audioEntries.length; i += 1) {
        const bytes = new Uint8Array(await audioEntries[i].file.arrayBuffer());
        files.push({ name: audioFiles[i].path, data: bytes });
      }
      const zipBlob = createZipBlob(files);
      downloadBlob(zipBlob, `dutch-dicta-complete-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.zip`);
      elements.backupStatus.textContent = `完整备份 ZIP 已生成：包含 ${payload.articles.length} 篇文章、${payload.recitationSessions.length} 条全文默写记录、${audioFiles.length} 个音频文件。`;
    } catch (error) {
      elements.backupStatus.textContent = `完整备份失败：${error.message}`;
    }
  }

  function handleBackupDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!elements.backupDropZone) return;
    const isActive = event.type === 'dragenter' || event.type === 'dragover';
    elements.backupDropZone.classList.toggle('drag-active', isActive);
  }

  async function handleBackupDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (elements.backupDropZone) {
      elements.backupDropZone.classList.remove('drag-active');
    }
    const file = event.dataTransfer?.files?.[0];
    await importBackupFile(file);
  }

  function handleBackupZipDrag(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!elements.backupZipDropZone) return;
    const isActive = event.type === 'dragenter' || event.type === 'dragover';
    elements.backupZipDropZone.classList.toggle('drag-active', isActive);
  }

  async function handleBackupZipDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (elements.backupZipDropZone) {
      elements.backupZipDropZone.classList.remove('drag-active');
    }
    const file = event.dataTransfer?.files?.[0];
    await importBackupZipFile(file);
  }

  async function handleBackupImport(event) {
    const file = event.target.files[0];
    await importBackupFile(file);
    elements.backupImport.value = '';
  }

  async function handleBackupZipImport(event) {
    const file = event.target.files[0];
    await importBackupZipFile(file);
    elements.backupImportZip.value = '';
  }

  async function importBackupFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      elements.backupStatus.textContent = '导入失败：请选择 JSON 备份文件。';
      return;
    }
    try {
      elements.backupStatus.textContent = `正在导入：${file.name}`;
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importBackup(data);
      elements.backupStatus.textContent = `备份已导入：新增 ${result.importedCount} 篇文章，覆盖 ${result.overwrittenCount} 篇文章；新增 ${result.wordImportedCount} 个错词，覆盖 ${result.wordOverwrittenCount} 个错词；恢复 ${result.recitationSessionImportedCount} 条全文默写记录，${result.wordSessionImportedCount} 条单词复习记录，${result.a2ProgressImportedCount} 个A2动词进度。`;
      renderArticleList();
      renderWordBookPage();
      renderA2VocabPage();
      showReport();
      showSection('list');
    } catch (error) {
      elements.backupStatus.textContent = `导入失败：${error.message}`;
    }
  }

  async function importBackupZipFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip') && file.type !== 'application/zip') {
      elements.backupStatus.textContent = '完整导入失败：请选择 ZIP 备份文件。';
      return;
    }
    try {
      elements.backupStatus.textContent = `正在导入完整备份：${file.name}`;
      const entries = parseZipEntries(new Uint8Array(await file.arrayBuffer()));
      const backupEntry = entries.get('backup.json');
      if (!backupEntry) {
        throw new Error('ZIP 中找不到 backup.json。');
      }
      const data = JSON.parse(new TextDecoder().decode(backupEntry));
      const audioFiles = Array.isArray(data.audioFiles) ? data.audioFiles : [];
      let restoredAudioCount = 0;
      for (const audio of audioFiles) {
        if (!audio || !audio.id || !audio.path) continue;
        const bytes = entries.get(audio.path);
        if (!bytes) continue;
        await saveAudioBlob(audio.id, new Blob([bytes], { type: audio.type || 'audio/mpeg' }));
        restoredAudioCount += 1;
      }
      const result = await importBackup(Object.assign({}, data, { audioFiles: [] }));
      elements.backupStatus.textContent = `完整备份已导入：新增 ${result.importedCount} 篇文章，覆盖 ${result.overwrittenCount} 篇文章；新增 ${result.wordImportedCount} 个错词，覆盖 ${result.wordOverwrittenCount} 个错词；恢复 ${restoredAudioCount} 个音频；恢复 ${result.recitationSessionImportedCount} 条全文默写记录，${result.wordSessionImportedCount} 条单词复习记录，${result.a2ProgressImportedCount} 个A2动词进度。`;
      renderArticleList();
      renderWordBookPage();
      renderA2VocabPage();
      showReport();
      showSection('list');
    } catch (error) {
      elements.backupStatus.textContent = `完整导入失败：${error.message}`;
    }
  }

  async function importBackup(data) {
    if (!data || !Array.isArray(data.articles)) {
        throw new Error('无效的备份文件：找不到 articles 数组。');
      }
      const recitationSessionCountBefore = articles.reduce((sum, article) => {
        return sum + normalizeRecitationSessions(article.recitationSessions).length;
      }, 0);
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
        const mergedReviewSessions = mergeReviewSessions(targetArticle.reviewSessions, article.reviewSessions, existingId);
        const mergedReviewTimes = mergeReviewTimes(targetArticle.reviewTimes, article.reviewTimes);
        const mergedRecitationSessions = mergeRecitationSessions(targetArticle.recitationSessions, article.recitationSessions);
        Object.assign(targetArticle, article);
        targetArticle.id = existingId;
        targetArticle.reviewSessions = mergedReviewSessions;
        targetArticle.reviewTimes = mergedReviewTimes;
        targetArticle.recitationSessions = mergedRecitationSessions;
        existingById.set(targetArticle.id, targetArticle);
        existingByKey.set(getArticleImportKey(targetArticle), targetArticle);
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

    const portableRecitationSessions = normalizePortableRecitationSessions([
      ...(Array.isArray(data.recitationSessions) ? data.recitationSessions : []),
      ...(Array.isArray(data.reportData?.recitationSessions) ? data.reportData.recitationSessions : []),
    ]);
    portableRecitationSessions.forEach(session => {
      const articleKey = `${safeString(session.articleTitle).trim().toLowerCase()}|${safeString(session.articleSource).trim().toLowerCase()}`;
      let targetArticle = existingById.get(session.articleId) || existingByKey.get(articleKey);
      if (!targetArticle && session.articleTitle) {
        const titleKey = safeString(session.articleTitle).trim().toLowerCase();
        targetArticle = articles.find(article => safeString(article.title).trim().toLowerCase() === titleKey);
      }
      if (!targetArticle) return;
      targetArticle.recitationSessions = mergeRecitationSessions(targetArticle.recitationSessions, [session]);
    });

    wordBook = dedupeWordBookEntries(wordBook);
    const existingWordsByKey = new Map(wordBook.map(item => [getWordImportKey(item), item]));
    const importedWords = dedupeWordBookEntries(Array.isArray(data.wordBook) ? data.wordBook : []);
    let wordImportedCount = 0;
    let wordOverwrittenCount = 0;

    for (const entry of importedWords) {
      const key = getWordImportKey(entry);
      if (!key) continue;
      const existing = existingWordsByKey.get(key);
      if (existing) {
        const oldAudioId = existing.audioId;
        const existingId = existing.id;
        Object.assign(existing, entry);
        existing.id = existingId || entry.id || generateId();
        if (oldAudioId && oldAudioId !== existing.audioId) {
          await deleteAudio(oldAudioId);
        }
        wordOverwrittenCount += 1;
      } else {
        wordBook.push(entry);
        existingWordsByKey.set(key, entry);
        wordImportedCount += 1;
      }
    }
    wordBook.sort((a, b) => b.count - a.count || new Date(b.lastSeen) - new Date(a.lastSeen));
    const wordSessionCountBefore = normalizeWordReviewSessions(wordReviewSessions).length;
    wordReviewSessions = normalizeWordReviewSessions([
      ...wordReviewSessions,
      ...(Array.isArray(data.wordReviewSessions) ? data.wordReviewSessions : []),
    ]);
    const wordSessionImportedCount = Math.max(0, wordReviewSessions.length - wordSessionCountBefore);
    let a2ProgressImportedCount = 0;
    const importedA2Progress = data.a2VocabProgress && typeof data.a2VocabProgress === 'object' && !Array.isArray(data.a2VocabProgress)
      ? data.a2VocabProgress
      : {};
    Object.entries(importedA2Progress).forEach(([id, progress]) => {
      if (!A2_VOCABULARY.some(item => item.id === id)) return;
      const existing = a2VocabProgress[id] || {};
      const mergedHistory = [
        ...(Array.isArray(existing.history) ? existing.history : []),
        ...(Array.isArray(progress?.history) ? progress.history : []),
      ].slice(0, 30);
      a2VocabProgress[id] = {
        translation: safeString(progress?.translation) || safeString(existing.translation),
        count: Math.max(toNumber(existing.count, 0), toNumber(progress?.count, 0)),
        masteryScore: Math.max(toNumber(existing.masteryScore, 0), toNumber(progress?.masteryScore, 0)),
        reviewCount: Math.max(toNumber(existing.reviewCount, 0), toNumber(progress?.reviewCount, 0)),
        lastReviewed: safeString(existing.lastReviewed) > safeString(progress?.lastReviewed) ? safeString(existing.lastReviewed) : safeString(progress?.lastReviewed),
        lastSeen: safeString(existing.lastSeen) > safeString(progress?.lastSeen) ? safeString(existing.lastSeen) : safeString(progress?.lastSeen),
        audioId: safeString(progress?.audioId) || safeString(existing.audioId) || null,
        audioName: safeString(progress?.audioName) || safeString(existing.audioName),
        history: mergedHistory,
      };
      a2ProgressImportedCount += 1;
    });
    const recitationSessionCountAfter = articles.reduce((sum, article) => {
      return sum + normalizeRecitationSessions(article.recitationSessions).length;
    }, 0);
    const recitationSessionImportedCount = Math.max(0, recitationSessionCountAfter - recitationSessionCountBefore);
    saveWordReviewSessions();
    saveWordBook();
    saveA2VocabProgress();
    saveArticles();
    return { importedCount, overwrittenCount, wordImportedCount, wordOverwrittenCount, wordSessionImportedCount, recitationSessionImportedCount, a2ProgressImportedCount };
  }

  function sanitizeZipPath(value) {
    return safeString(value).replace(/[^a-zA-Z0-9._-]/g, '_') || `audio-${Date.now()}`;
  }

  function getAudioExtension(type) {
    const value = safeString(type).toLowerCase();
    if (value.includes('wav')) return '.wav';
    if (value.includes('ogg')) return '.ogg';
    if (value.includes('webm')) return '.webm';
    if (value.includes('mp4') || value.includes('m4a')) return '.m4a';
    return '.mp3';
  }

  function downloadJson(value, filename) {
    downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), filename);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) {
      crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function writeUint16(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
  }

  function writeUint32(target, offset, value) {
    target[offset] = value & 0xff;
    target[offset + 1] = (value >>> 8) & 0xff;
    target[offset + 2] = (value >>> 16) & 0xff;
    target[offset + 3] = (value >>> 24) & 0xff;
  }

  function readUint16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function readUint32(bytes, offset) {
    return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
  }

  function getZipDateTime(date = new Date()) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
    const zipDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, date: zipDate };
  }

  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    parts.forEach(part => {
      out.set(part, offset);
      offset += part.length;
    });
    return out;
  }

  function createZipBlob(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];
    const now = getZipDateTime();
    let offset = 0;

    files.forEach(file => {
      const nameBytes = encoder.encode(file.name);
      const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
      const crc = crc32(data);
      const localHeader = new Uint8Array(30 + nameBytes.length);
      writeUint32(localHeader, 0, 0x04034b50);
      writeUint16(localHeader, 4, 20);
      writeUint16(localHeader, 6, 0x0800);
      writeUint16(localHeader, 8, 0);
      writeUint16(localHeader, 10, now.time);
      writeUint16(localHeader, 12, now.date);
      writeUint32(localHeader, 14, crc);
      writeUint32(localHeader, 18, data.length);
      writeUint32(localHeader, 22, data.length);
      writeUint16(localHeader, 26, nameBytes.length);
      writeUint16(localHeader, 28, 0);
      localHeader.set(nameBytes, 30);
      localParts.push(localHeader, data);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      writeUint32(centralHeader, 0, 0x02014b50);
      writeUint16(centralHeader, 4, 20);
      writeUint16(centralHeader, 6, 20);
      writeUint16(centralHeader, 8, 0x0800);
      writeUint16(centralHeader, 10, 0);
      writeUint16(centralHeader, 12, now.time);
      writeUint16(centralHeader, 14, now.date);
      writeUint32(centralHeader, 16, crc);
      writeUint32(centralHeader, 20, data.length);
      writeUint32(centralHeader, 24, data.length);
      writeUint16(centralHeader, 28, nameBytes.length);
      writeUint16(centralHeader, 30, 0);
      writeUint16(centralHeader, 32, 0);
      writeUint16(centralHeader, 34, 0);
      writeUint16(centralHeader, 36, 0);
      writeUint32(centralHeader, 38, 0);
      writeUint32(centralHeader, 42, offset);
      centralHeader.set(nameBytes, 46);
      centralParts.push(centralHeader);

      offset += localHeader.length + data.length;
    });

    const centralDirectory = concatBytes(centralParts);
    const endRecord = new Uint8Array(22);
    writeUint32(endRecord, 0, 0x06054b50);
    writeUint16(endRecord, 8, files.length);
    writeUint16(endRecord, 10, files.length);
    writeUint32(endRecord, 12, centralDirectory.length);
    writeUint32(endRecord, 16, offset);
    writeUint16(endRecord, 20, 0);

    return new Blob([concatBytes([...localParts, centralDirectory, endRecord])], { type: 'application/zip' });
  }

  function parseZipEntries(bytes) {
    const decoder = new TextDecoder();
    const entries = new Map();
    let offset = 0;
    while (offset + 30 <= bytes.length) {
      const signature = readUint32(bytes, offset);
      if (signature !== 0x04034b50) break;
      const flags = readUint16(bytes, offset + 6);
      const method = readUint16(bytes, offset + 8);
      if (method !== 0) {
        throw new Error('当前只支持应用生成的未压缩 ZIP 备份。');
      }
      if (flags & 0x0008) {
        throw new Error('当前 ZIP 使用了数据描述符，无法导入。请使用应用导出的完整备份。');
      }
      const compressedSize = readUint32(bytes, offset + 18);
      const fileNameLength = readUint16(bytes, offset + 26);
      const extraLength = readUint16(bytes, offset + 28);
      const nameStart = offset + 30;
      const dataStart = nameStart + fileNameLength + extraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > bytes.length) {
        throw new Error('ZIP 文件不完整。');
      }
      const name = decoder.decode(bytes.slice(nameStart, nameStart + fileNameLength));
      entries.set(name, bytes.slice(dataStart, dataEnd));
      offset = dataEnd;
    }
    return entries;
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

function getWeakestSentenceIds(article) {
  return (article.sentences || [])
    .filter(sentence => toNumber(sentence.masteryScore, 0) < 100)
    .sort((a, b) => {
      const masteryDiff = toNumber(a.masteryScore, 0) - toNumber(b.masteryScore, 0);
      if (masteryDiff !== 0) return masteryDiff;
      return toNumber(a.reviewCount, 0) - toNumber(b.reviewCount, 0);
    })
    .slice(0, 5)
    .map(sentence => sentence.id);
}

function getUnmasteredSentenceIds(article) {
  return (article.sentences || [])
    .filter(sentence => toNumber(sentence.masteryScore, 0) < 100)
    .map(sentence => sentence.id);
}

function getReviewModeTitle(mode) {
  if (mode === 'incorrect') return '错句集复习';
  if (mode === 'weakest') return '最弱 5 句复习';
  if (mode === 'unmastered') return '未满分句子复习';
  return '听写';
}

function startReview(articleId, focusSentenceId = null, options = {}) {
  const article = findArticle(articleId);
  const sentences = article?.sentences || [];
  if (!article || sentences.length === 0) {
    alert('请先为文章添加至少一个句子。');
    return;
  }

  const reviewOptions = typeof options === 'boolean'
    ? { mode: options ? 'incorrect' : 'all' }
    : (options || {});
  const mode = reviewOptions.mode || 'all';
  let sentenceIds = sentences.map(s => s.id);
  if (mode === 'incorrect') sentenceIds = getIncorrectSentenceIds(article);
  if (mode === 'weakest') sentenceIds = getWeakestSentenceIds(article);
  if (mode === 'unmastered') sentenceIds = getUnmasteredSentenceIds(article);

  if (!sentenceIds.length) {
    const emptyMessage = mode === 'incorrect'
      ? '当前文章没有需要复习的错误句子。'
      : mode === 'unmastered'
        ? '当前文章所有句子都已经是 100% 熟练度。'
        : mode === 'weakest'
          ? '当前文章所有句子都已经是 100% 熟练度。'
          : '当前文章没有可复习的句子。';
    alert(emptyMessage);
    return;
  }

  selectedArticleId = articleId;
  const now = Date.now();
  currentReview = {
    sessionId: generateId(),
    articleId,
    sentenceIds,
    index: 0,
    doneIds: new Set(),
    sessionScores: [],
    startTime: now,
    mode,
    onlyIncorrect: mode === 'incorrect',
    onlyUnmastered: mode === 'unmastered',
    waitingForManualSummary: false,
    returnPage: 'list',
  };

  if (focusSentenceId) {
    const idx = currentReview.sentenceIds.indexOf(focusSentenceId);
    if (idx >= 0) currentReview.index = idx;
  }

  clearReviewSummary();
  if (elements.endReview) elements.endReview.textContent = '结束复习';
  startReviewTimer();
  renderReviewItem();
  showSection('review');
}

async function renderReviewItem() {
  if (!currentReview) return;
  if (currentReview.autoAdvanceTimer) {
    clearTimeout(currentReview.autoAdvanceTimer);
    currentReview.autoAdvanceTimer = null;
  }
  if (currentReview.type === 'word') {
    const word = getWordDeckEntry(currentReview.wordIds[currentReview.index], currentReview.deck);
    if (!word) return;
    if (elements.reviewPanel) elements.reviewPanel.classList.add('word-review-mode');
    const isA2Deck = currentReview.deck === 'a2vocab';
    elements.reviewTitle.textContent = isA2Deck ? 'A2动词复习' : '错词复习';
    elements.reviewSubtitle.textContent = currentReview.modeLabel || (isA2Deck
      ? (currentReview.onlyUnmastered ? '只复习未掌握 A2 动词' : `内置 ${A2_VOCABULARY.length} 个 A2 不规则动词原形`)
      : (currentReview.onlyMastered ? '随机抽查已掌握归档' : (currentReview.onlyUnmastered ? '只复习未掌握错词' : '批量复习错题本')));
    elements.quizIndex.textContent = currentReview.index + 1;
    elements.quizTotal.textContent = currentReview.wordIds.length;
    updateReviewProgress(currentReview.index + 1, currentReview.wordIds.length);
    updateReviewNavigationLabel(currentReview.index + 1, currentReview.wordIds.length);
    elements.quizMastery.textContent = `${Math.round(word.masteryScore || 0)}%`;
    elements.sentenceNumber.textContent = `词语 ${currentReview.index + 1}`;
    elements.reviewSentenceDifficultyLabel.textContent = word.difficulty ? `难度：${word.difficulty}` : '难度：未设置';
    elements.reviewSentenceTagsLabel.textContent = word.translation ? `中文：${word.translation}` : (word.examples?.length ? `例句：${word.examples[0]}` : '暂无中文说明');
    elements.dictationInput.value = '';
    elements.dictationInput.placeholder = '输入这个错词的荷兰语拼写，按 Enter 提交';
    updateDictationInputLabel('输入错词拼写');
    elements.submitAnswer.textContent = '提交答案';
    elements.submitAnswer.disabled = false;
    elements.nextSentence.classList.add('hidden');
    elements.nextSentence.disabled = true;
    elements.showAnswer.classList.toggle('hidden', !word.translation && !(word.examples && word.examples.length));
    showFeedback('', '');
    clearReviewSummary();
    if (elements.nextSentence) elements.nextSentence.classList.add('hidden');
    if (elements.dictationInput) elements.dictationInput.focus();
    if (word.audioId) {
      const audioUrl = await getAudioUrl(word.audioId);
      reviewAudio.src = audioUrl;
    } else {
      reviewAudio.removeAttribute('src');
    }
    reviewAudio.pause();
    return;
  }

  if (elements.reviewPanel) elements.reviewPanel.classList.remove('word-review-mode');
  if (elements.nextSentence) elements.nextSentence.classList.remove('hidden');
  if (elements.showAnswer) elements.showAnswer.classList.remove('hidden');
  if (elements.submitAnswer) elements.submitAnswer.textContent = '提交答案';
  updateDictationInputLabel('输入你的听写结果');
  const article = findArticle(currentReview.articleId);
  const sentence = article.sentences.find(s => s.id === currentReview.sentenceIds[currentReview.index]);
  if (!sentence) return;

  const titlePrefix = getReviewModeTitle(currentReview.mode);
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
    const word = getWordDeckEntry(currentReview.wordIds[currentReview.index], currentReview.deck);
    if (!word) return;
    if (word.audioId) {
      const audioUrl = await getAudioUrl(word.audioId);
      reviewAudio.src = audioUrl;
      reviewAudio.play();
      return;
    }
    wordReadingState.stopRequested = false;
    await speakWordText(word.word);
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
    const word = getWordDeckEntry(currentReview.wordIds[currentReview.index], currentReview.deck);
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
    const word = getWordDeckEntry(currentReview.wordIds[currentReview.index], currentReview.deck);
    if (!word) return;
    if (currentReview.doneIds.has(word.id)) return;
    const normalizedTarget = normalizeText(word.word);
    const normalizedAnswer = normalizeText(answer);
    const score = calculateScore(normalizedTarget, normalizedAnswer);
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewed = new Date().toISOString();
    if (score < 100) {
      word.count = (word.count || 0) + 1;
      word.lastSeen = new Date().toISOString();
    }
    const previousMastery = toNumber(word.masteryScore, 0);
    if (currentReview.deck === 'wordbook' && currentReview.onlyMastered && score < 100) {
      word.masteryScore = Math.max(0, Math.min(85, score));
    } else {
      word.masteryScore = Math.min(100, Math.max(0, previousMastery + score * 0.25));
    }
    word.history = word.history || [];
    word.history.unshift({
      timestamp: new Date().toISOString(),
      answer,
      score,
      correctText: word.word,
    });
    saveWordDeckEntry(word, currentReview.deck);

    currentReview.doneIds.add(word.id);
    currentReview.sessionScores.push({
      sentence: word.word,
      score,
      answer,
      correctText: word.word,
      translation: word.translation || '',
    });

    const demoted = currentReview.deck === 'wordbook' && currentReview.onlyMastered && score < 100;
    showFeedback(
      demoted ? `得分：${score}% 。这个归档词已回到待掌握区。` : `得分：${score}% 。已累计复习 ${word.reviewCount} 次。`,
      score >= 90 && !demoted ? 'success' : 'warning'
    );
    elements.quizMastery.textContent = `${Math.round(word.masteryScore || 0)}%`;
    renderWordReviewResult(word, score, answer);
    elements.submitAnswer.disabled = true;
    elements.nextSentence.classList.remove('hidden');
    elements.nextSentence.disabled = false;
    if (currentReview.doneIds.size >= currentReview.wordIds.length) {
      currentReview.waitingForManualSummary = true;
      updateReviewNavigationLabel(currentReview.wordIds.length, currentReview.wordIds.length);
      elements.nextSentence.textContent = '查看总结';
    } else {
      elements.nextSentence.textContent = '下一词';
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
    translation: sentence.translation || '',
  });

  showFeedback(`得分：${score}% 。已累计复习 ${sentence.reviewCount} 次。`, score >= 90 ? 'success' : 'warning');
  elements.quizMastery.textContent = `${Math.round(article?.masteryScore || 0)}%`;
  renderSentenceMistakeSummary(sentence, article, currentReview.lastWrongPairs || [], answer);
  elements.submitAnswer.disabled = true;

  if (currentReview.doneIds.size >= currentReview.sentenceIds.length) {
    currentReview.waitingForManualSummary = true;
    updateReviewNavigationLabel(currentReview.sentenceIds.length, currentReview.sentenceIds.length);
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

let currentRecitation = null;

function isArticleRecitationReady(article) {
  const sentences = article?.sentences || [];
  return sentences.length > 0 && (
    Math.round(toNumber(article.masteryScore, 0)) >= 100 ||
    sentences.every(sentence => toNumber(sentence.masteryScore, 0) >= 100)
  );
}

function getRecitationStats(article) {
  const sessions = normalizeRecitationSessions(article.recitationSessions);
  const latest = sessions
    .slice()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
  const best = sessions.reduce((max, session) => Math.max(max, toNumber(session.averageScore, 0)), 0);
  return {
    count: sessions.length,
    latestScore: latest ? Math.round(latest.averageScore || 0) : 0,
    bestScore: Math.round(best),
    latestAt: latest?.timestamp || '',
  };
}

function getRecitationEligibleArticles() {
  return articles.filter(isArticleRecitationReady);
}

function showReciteList() {
  stopRecitationTimer();
  currentRecitation = null;
  if (elements.reciteListView) elements.reciteListView.classList.remove('hidden');
  if (elements.reciteWorkspace) elements.reciteWorkspace.classList.add('hidden');
  renderReciteArticleList();
}

function handleReciteBack() {
  if (currentRecitation && !currentRecitation.completed) {
    if (!confirm('返回前要结束并记录本次默写吗？')) {
      return;
    }
    saveRecitationSession({ requireAnswer: false, partial: true });
    return;
  }
  showReciteList();
}

function renderReciteArticleList() {
  if (!elements.reciteArticles) return;
  const eligible = getRecitationEligibleArticles();
  const allScores = eligible.flatMap(article => normalizeRecitationSessions(article.recitationSessions).map(session => toNumber(session.averageScore, 0)));
  const avgScore = allScores.length
    ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
    : 0;

  if (elements.reciteEligibleCount) elements.reciteEligibleCount.textContent = eligible.length;
  if (elements.reciteAverageScore) elements.reciteAverageScore.textContent = `${avgScore}%`;
  elements.reciteArticles.innerHTML = '';
  if (!eligible.length) {
    if (elements.reciteEmpty) elements.reciteEmpty.classList.remove('hidden');
    return;
  }
  if (elements.reciteEmpty) elements.reciteEmpty.classList.add('hidden');

  eligible.forEach(article => {
    const stats = getRecitationStats(article);
    const card = document.createElement('div');
    card.className = 'recite-article-card';
    card.dataset.articleId = article.id;
    card.innerHTML = `
      <div class="recite-article-main">
        <div class="article-card-eyebrow">${escapeHtml(article.source || '来源未知')}</div>
        <h3>${escapeHtml(article.title)}</h3>
        <div class="article-card-meta">${(article.sentences || []).length} 个句子 · 默写 ${stats.count} 次 · 最佳 ${stats.bestScore}%</div>
      </div>
      <div class="recite-article-score">
        <strong>${stats.latestScore}%</strong>
        <span>最近默写</span>
      </div>
      <button type="button" class="btn btn-primary recite-start-btn">开始默写</button>
    `;
    elements.reciteArticles.appendChild(card);
  });
}

function handleReciteArticleClick(event) {
  const button = event.target.closest('.recite-start-btn');
  if (!button) return;
  const card = event.target.closest('.recite-article-card');
  if (!card) return;
  startArticleRecitation(card.dataset.articleId);
}

function startArticleRecitation(articleId) {
  const article = findArticle(articleId);
  if (!isArticleRecitationReady(article)) {
    alert('这篇文章还没有达到 100% 熟练度，暂时不能全文默写。');
    return;
  }
  currentRecitation = {
    sessionId: generateId(),
    articleId,
    startTime: Date.now(),
    submitted: new Set(),
    results: new Map(),
  };
  startRecitationTimer();
  if (elements.reciteListView) elements.reciteListView.classList.add('hidden');
  if (elements.reciteWorkspace) elements.reciteWorkspace.classList.remove('hidden');
  renderRecitationWorkspace(article);
}

function renderRecitationWorkspace(article) {
  if (!article || !elements.recitePrompts || !elements.reciteInputs) return;
  const sentences = article.sentences || [];
  const stats = getRecitationStats(article);
  elements.reciteTitle.textContent = `全文默写：${article.title}`;
  elements.reciteMeta.textContent = `${sentences.length} 句 · 历史默写 ${stats.count} 次 · 最佳 ${stats.bestScore}%`;
  if (elements.reciteSubmitAll) elements.reciteSubmitAll.disabled = false;
  if (elements.reciteEnd) elements.reciteEnd.disabled = false;
  elements.reciteOverallResult.classList.add('hidden');
  elements.reciteOverallResult.innerHTML = '';

  elements.recitePrompts.innerHTML = sentences.map((sentence, index) => `
    <span class="recite-prompt-chip">
      <strong>${index + 1}</strong>
      <button type="button" class="recite-audio-btn" data-sentence-id="${escapeHtml(sentence.id)}" aria-label="播放第 ${index + 1} 句荷兰语音频" title="播放荷兰语音频">▶</button>
      ${escapeHtml(sentence.translation || '（无中文提示）')}
    </span>
  `).join('');

  elements.reciteInputs.innerHTML = sentences.map((sentence, index) => `
    <div class="recite-line" data-sentence-id="${escapeHtml(sentence.id)}">
      <div class="recite-line-number">${index + 1}</div>
      <textarea rows="1" placeholder="默写第 ${index + 1} 句荷兰语"></textarea>
      <button type="button" class="btn btn-small btn-secondary recite-line-submit">提交本句</button>
      <div class="recite-line-result hidden"></div>
    </div>
  `).join('');
}

function handleReciteInputChange(event) {
  const textarea = event.target.closest('.recite-line textarea');
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.max(44, textarea.scrollHeight)}px`;
  const line = textarea.closest('.recite-line');
  const sentenceId = line?.dataset.sentenceId;
  if (sentenceId && currentRecitation?.results.has(sentenceId)) {
    currentRecitation.results.delete(sentenceId);
    currentRecitation.submitted.delete(sentenceId);
    const resultEl = line.querySelector('.recite-line-result');
    if (resultEl) {
      resultEl.className = 'recite-line-result hidden';
      resultEl.innerHTML = '';
    }
  }
}

function handleRecitePromptClick(event) {
  const audioButton = event.target.closest('.recite-audio-btn');
  if (audioButton) {
    playReciteSentenceAudio(audioButton.dataset.sentenceId);
  }
}

function handleReciteInputsClick(event) {
  const submitButton = event.target.closest('.recite-line-submit');
  if (submitButton) {
    const line = submitButton.closest('.recite-line');
    if (line) submitRecitationSentence(line.dataset.sentenceId);
  }
}

async function playReciteSentenceAudio(sentenceId) {
  if (!currentRecitation) return;
  const article = findArticle(currentRecitation.articleId);
  const sentence = (article?.sentences || []).find(item => item.id === sentenceId);
  if (!sentence) return;
  if (sentence.audioId) {
    const audioUrl = await getAudioUrl(sentence.audioId);
    reviewAudio.src = audioUrl;
    reviewAudio.play();
    return;
  }
  await speakText(sentence.text);
}

function scoreRecitationSentence(sentence, answer) {
  const normalizedTarget = normalizeText(sentence.text);
  const normalizedAnswer = normalizeText(answer);
  const score = calculateScore(normalizedTarget, normalizedAnswer);
  const wrongPairs = getMistypedWordPairs(sentence.text, answer);
  return { score, wrongPairs };
}

function findRecitationLine(sentenceId) {
  if (!elements.reciteInputs) return null;
  return Array.from(elements.reciteInputs.querySelectorAll('.recite-line'))
    .find(line => line.dataset.sentenceId === sentenceId) || null;
}

function submitRecitationSentence(sentenceId) {
  if (!currentRecitation) return null;
  const article = findArticle(currentRecitation.articleId);
  const sentence = (article?.sentences || []).find(item => item.id === sentenceId);
  const line = findRecitationLine(sentenceId);
  const textarea = line?.querySelector('textarea');
  if (!sentence || !line || !textarea) return null;
  const answer = textarea.value.trim();
  if (!answer) {
    line.querySelector('.recite-line-result').className = 'recite-line-result warning';
    line.querySelector('.recite-line-result').textContent = '请先默写这一句。';
    return null;
  }
  const { score, wrongPairs } = scoreRecitationSentence(sentence, answer);
  const result = {
    sentenceId,
    answer,
    correctText: sentence.text,
    score,
    wrongPairs,
  };
  currentRecitation.submitted.add(sentenceId);
  currentRecitation.results.set(sentenceId, result);
  renderRecitationLineResult(line, result);
  return result;
}

function renderRecitationLineResult(line, result) {
  const resultEl = line.querySelector('.recite-line-result');
  const differences = highlightSentenceDifferences(result.correctText, result.answer, result.wrongPairs || []);
  resultEl.className = `recite-line-result ${result.score >= 90 ? 'success' : 'warning'}`;
  resultEl.innerHTML = `
    <div class="recite-score-pill">${result.score}%</div>
    <div class="recite-result-compare">
      <div><span>正确</span>${differences.highlightedOriginal}</div>
      <div><span>默写</span>${differences.highlightedAnswer || escapeHtml(result.answer)}</div>
    </div>
  `;
}

function submitFullRecitation() {
  saveRecitationSession({ requireAnswer: true, partial: false });
}

function endRecitationSession() {
  saveRecitationSession({ requireAnswer: false, partial: true });
}

function saveRecitationSession(options = {}) {
  if (!currentRecitation) return;
  if (currentRecitation.completed) {
    showReciteList();
    return;
  }
  const article = findArticle(currentRecitation.articleId);
  if (!article) return;
  const results = [];
  let hasAnyAnswer = false;
  let answeredCount = 0;
  (article.sentences || []).forEach(sentence => {
    const line = findRecitationLine(sentence.id);
    const textarea = line?.querySelector('textarea');
    const answer = textarea ? textarea.value.trim() : '';
    if (answer) {
      hasAnyAnswer = true;
      answeredCount += 1;
    }
    const existing = currentRecitation.results.get(sentence.id);
    if (existing && existing.answer === answer) {
      results.push(existing);
      return;
    }
    const { score, wrongPairs } = scoreRecitationSentence(sentence, answer);
    const result = {
      sentenceId: sentence.id,
      answer,
      correctText: sentence.text,
      score,
      wrongPairs,
    };
    currentRecitation.results.set(sentence.id, result);
    if (line) renderRecitationLineResult(line, result);
    results.push(result);
  });

  if (options.requireAnswer && !hasAnyAnswer) {
    elements.reciteOverallResult.className = 'review-summary';
    elements.reciteOverallResult.innerHTML = '<div class="review-summary-note">请至少默写一句后再提交全文。</div>';
    return;
  }

  const average = Math.round(results.reduce((sum, item) => sum + item.score, 0) / results.length);
  const session = {
    sessionId: currentRecitation.sessionId,
    timestamp: new Date().toISOString(),
    duration: Date.now() - currentRecitation.startTime,
    averageScore: average,
    partial: !!options.partial,
    completedCount: answeredCount,
    total: (article.sentences || []).length,
    results: results.map(item => ({
      sentenceId: item.sentenceId,
      answer: item.answer,
      correctText: item.correctText,
      score: item.score,
    })),
  };
  article.recitationSessions = normalizeRecitationSessions([...(article.recitationSessions || []), session]);
  article.updatedAt = new Date().toISOString();
  saveArticles();
  currentRecitation.completed = true;
  stopRecitationTimer();
  if (elements.reciteSubmitAll) elements.reciteSubmitAll.disabled = true;
  if (elements.reciteEnd) elements.reciteEnd.disabled = true;

  elements.reciteOverallResult.className = 'review-summary';
  elements.reciteOverallResult.innerHTML = `
    <div class="review-summary-header">
      <h3>${options.partial ? '默写已结束' : '全文默写完成'}</h3>
      <div class="review-summary-score">全文正确率：${average}%</div>
    </div>
    <div class="review-summary-body">
      <div class="review-summary-note">本次已默写 ${answeredCount} / ${(article.sentences || []).length} 句，用时 ${formatDuration(session.duration)}。未填写句子按 0 分计入全文正确率，成绩已记录到全文默写列表。</div>
    </div>
  `;
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
        completeReview({ manual: true });
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
      completeReview({ manual: true });
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

function getLatestArticleActivityTimestamp(article) {
  const timestamps = [];
  if (Array.isArray(article.reviewSessions)) {
    article.reviewSessions.forEach(session => {
      if (session && session.timestamp) timestamps.push(session.timestamp);
    });
  }
  (article.sentences || []).forEach(sentence => {
    if (sentence.lastReviewed) timestamps.push(sentence.lastReviewed);
    (sentence.history || []).forEach(entry => {
      if (entry.timestamp) timestamps.push(entry.timestamp);
    });
  });
  if (article.updatedAt) timestamps.push(article.updatedAt);

  return timestamps
    .map(timestamp => new Date(timestamp))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => b - a)[0]?.toISOString() || '';
}

function getArticleReviewSessions(article) {
  const savedSessions = normalizeReviewSessions(article.reviewSessions, article.id);
  const reviewTimes = (article.reviewTimes || []).filter(time => typeof time === 'number' && Number.isFinite(time) && time > 0);

  if (!savedSessions.length && reviewTimes.length) {
    const fallbackTimestamp = getLatestArticleActivityTimestamp(article);
    if (fallbackTimestamp) {
      return normalizeReviewSessions(reviewTimes.map(duration => ({
        timestamp: fallbackTimestamp,
        duration,
        articleId: article.id,
      })), article.id);
    }
  }

  return savedSessions;
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
    const timedReviewSessions = [];
    const timedRecitationSessions = [];
    const legacyReviewDurations = [];
    articles.forEach(article => {
      const sessions = getArticleReviewSessions(article);
      if (sessions.length) {
        timedReviewSessions.push(...sessions.map(session => ({
          ...session,
          type: 'dictation',
          title: article.title,
        })));
      } else {
        legacyReviewDurations.push(...(article.reviewTimes || []).filter(time => typeof time === 'number' && Number.isFinite(time)));
      }
      timedRecitationSessions.push(...normalizeRecitationSessions(article.recitationSessions).map(session => ({
        ...session,
        type: 'recitation',
        title: article.title,
        articleId: article.id,
      })));
    });
    const timedWordSessions = normalizeWordReviewSessions(wordReviewSessions).map(session => ({
      ...session,
      type: 'word',
      title: '单词复习',
    }));
    const timedStudySessions = [...timedReviewSessions, ...timedRecitationSessions, ...timedWordSessions];
    const timedDurationsMs = timedReviewSessions.reduce((sum, session) => sum + session.duration, 0);
    const recitationDurationsMs = timedRecitationSessions.reduce((sum, session) => sum + session.duration, 0);
    const wordDurationsMs = timedWordSessions.reduce((sum, session) => sum + session.duration, 0);
    const legacyDurationsMs = legacyReviewDurations.reduce((sum, duration) => sum + duration, 0);
    const totalDurationsMs = timedDurationsMs + recitationDurationsMs + wordDurationsMs + legacyDurationsMs;
    const totalSessions = timedStudySessions.length + legacyReviewDurations.length;
    const totalRecitationSessions = timedRecitationSessions.length;
    const avgRecitationScore = totalRecitationSessions
      ? Math.round(timedRecitationSessions.reduce((sum, session) => sum + toNumber(session.averageScore, 0), 0) / totalRecitationSessions)
      : 0;
    // Gather all sentence-level history entries (with timestamps)
    const allHistoryEntries = articles.reduce((out, article) => {
      (article.sentences || []).forEach(s => {
        (s.history || []).forEach(h => out.push(Object.assign({ articleId: article.id }, h)));
      });
      return out;
    }, []);
    const totalReviewEvents = allHistoryEntries.length;

    // time window helpers
    const now = new Date();
    function isSameDay(d1, d2) {
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }
    function dateKey(d) {
      return getLocalDateKey(d);
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    const sessionsToday = timedStudySessions.filter(session => isSameDay(new Date(session.timestamp), now));
    const sessionsLast7 = timedStudySessions.filter(session => { const t = new Date(session.timestamp); return (now - t) <= 7 * oneDayMs; });
    const sessionsLast30 = timedStudySessions.filter(session => { const t = new Date(session.timestamp); return (now - t) <= 30 * oneDayMs; });
    const studyTodayMs = sessionsToday.reduce((sum, session) => sum + session.duration, 0);
    const study7Ms = sessionsLast7.reduce((sum, session) => sum + session.duration, 0);
    const study30Ms = sessionsLast30.reduce((sum, session) => sum + session.duration, 0);
    const firstStudyDate = timedStudySessions.length
      ? timedStudySessions
          .map(session => new Date(session.timestamp))
          .filter(date => !Number.isNaN(date.getTime()))
          .sort((a, b) => a - b)[0]
      : null;
    const studyDaySpan = firstStudyDate
      ? Math.max(1, Math.floor((new Date(dateKey(now)) - new Date(dateKey(firstStudyDate))) / oneDayMs) + 1)
      : 1;
    const avgPerDayMs = totalDurationsMs ? Math.round(totalDurationsMs / studyDaySpan) : 0;

    const activeDaysSet = new Set(sessionsLast30.map(session => dateKey(new Date(session.timestamp))));
    const activeDays = activeDaysSet.size;

    // streaks calculation
    const allDaysSet = new Set(timedStudySessions.map(session => dateKey(new Date(session.timestamp))));
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

    // build last-30-days per-day durations (ms)
    const dailyDurations = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * oneDayMs);
      const key = dateKey(d);
      const ms = timedStudySessions
        .filter(session => dateKey(new Date(session.timestamp)) === key)
        .reduce((sum, session) => sum + session.duration, 0);
      dailyDurations.push({ date: key, ms });
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
    const articleMasteryStats = articles
      .filter(article => (article.sentences || []).length)
      .map(article => ({
        id: article.id,
        title: article.title,
        reviews: article.reviewCount || 0,
        mastery: Math.round(article.masteryScore || 0),
        sentenceCount: (article.sentences || []).length,
      }))
      .sort((a, b) => a.mastery - b.mastery || b.reviews - a.reviews);
    const weakestSentences = wrongSentences
      .slice()
      .sort((a, b) => a.score - b.score || b.wrongAttempts - a.wrongAttempts)
      .slice(0, 6);
    const todayArticleDurations = articles
      .map(article => ({
        title: article.title,
        ms: getArticleReviewSessions(article)
          .filter(session => isSameDay(new Date(session.timestamp), now))
          .reduce((sum, session) => sum + session.duration, 0),
      }))
      .filter(item => item.ms > 0)
      .sort((a, b) => b.ms - a.ms);
    const todayRecitationDurations = articles
      .map(article => ({
        title: `默写：${article.title}`,
        ms: normalizeRecitationSessions(article.recitationSessions)
          .filter(session => isSameDay(new Date(session.timestamp), now))
          .reduce((sum, session) => sum + session.duration, 0),
        recite: true,
      }))
      .filter(item => item.ms > 0)
      .sort((a, b) => b.ms - a.ms);
    const wordReviewSessionsToday = normalizeWordReviewSessions(wordReviewSessions)
      .filter(session => isSameDay(new Date(session.timestamp), now));
    const wordTodayMs = wordReviewSessionsToday.reduce((sum, session) => sum + session.duration, 0);
    const todayReviewDistribution = [
      ...todayArticleDurations,
      ...todayRecitationDurations,
      ...(wordTodayMs > 0 ? [{ title: '单词复习', ms: wordTodayMs, word: true }] : []),
    ].sort((a, b) => b.ms - a.ms);
    const maxTodayDistributionMs = Math.max(...todayReviewDistribution.map(item => item.ms), 1);
    const chartGridLines = [0, 25, 50, 75, 100];
    const chartWidth2d = 720;
    const chartHeight2d = 260;
    const chartPadding = { top: 30, right: 24, bottom: 58, left: 48 };
    const plotWidth = chartWidth2d - chartPadding.left - chartPadding.right;
    const plotHeight = chartHeight2d - chartPadding.top - chartPadding.bottom;
    const truncateChartLabel = (value, limit = 8) => {
      const text = safeString(value);
      return text.length > limit ? `${text.slice(0, limit)}...` : text;
    };
    const renderGridLines = (maxValue, formatter = value => value) => chartGridLines.map(percent => {
      const y = chartPadding.top + plotHeight - (percent / 100) * plotHeight;
      const value = Math.round((percent / 100) * maxValue);
      return `
        <line x1="${chartPadding.left}" y1="${y}" x2="${chartPadding.left + plotWidth}" y2="${y}" class="report-2d-grid"></line>
        <text x="${chartPadding.left - 10}" y="${y + 4}" class="report-2d-axis-label" text-anchor="end">${escapeHtml(formatter(value))}</text>
      `;
    }).join('');
    const renderBarChartSvg = (items, options) => {
      const maxValue = Math.max(options.maxValue || 0, ...items.map(item => item.value), 1);
      const band = plotWidth / Math.max(items.length, 1);
      const barWidth = Math.min(48, Math.max(18, band * 0.58));
      const bars = items.map((item, index) => {
        const h = Math.max(2, (item.value / maxValue) * plotHeight);
        const x = chartPadding.left + index * band + (band - barWidth) / 2;
        const y = chartPadding.top + plotHeight - h;
        const labelX = chartPadding.left + index * band + band / 2;
        return `
          <g class="report-2d-bar-group">
            <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="7" class="report-2d-bar ${item.className || ''}"></rect>
            <text x="${labelX}" y="${y - 8}" class="report-2d-value" text-anchor="middle">${escapeHtml(item.valueLabel)}</text>
            <text x="${labelX}" y="${chartPadding.top + plotHeight + 24}" class="report-2d-x-label" text-anchor="middle">${escapeHtml(truncateChartLabel(item.label, options.labelLimit || 8))}</text>
          </g>
        `;
      }).join('');
      return `
        <svg class="report-2d-chart-svg" viewBox="0 0 ${chartWidth2d} ${chartHeight2d}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(options.title)}">
          <rect x="0" y="0" width="${chartWidth2d}" height="${chartHeight2d}" rx="16" class="report-2d-bg"></rect>
          ${renderGridLines(maxValue, options.axisFormatter)}
          <line x1="${chartPadding.left}" y1="${chartPadding.top + plotHeight}" x2="${chartPadding.left + plotWidth}" y2="${chartPadding.top + plotHeight}" class="report-2d-axis"></line>
          <line x1="${chartPadding.left}" y1="${chartPadding.top}" x2="${chartPadding.left}" y2="${chartPadding.top + plotHeight}" class="report-2d-axis"></line>
          ${bars}
        </svg>
      `;
    };
    const renderScatterChartSvg = (items, options) => {
      const maxX = Math.max(options.maxX || 0, ...items.map(item => item.x), 1);
      const xTicks = Array.from(new Set([0, Math.ceil(maxX / 2), maxX]));
      const xGrid = xTicks.map(value => {
        const x = chartPadding.left + (value / maxX) * plotWidth;
        return `
          <line x1="${x}" y1="${chartPadding.top}" x2="${x}" y2="${chartPadding.top + plotHeight}" class="report-2d-grid subtle"></line>
          <text x="${x}" y="${chartPadding.top + plotHeight + 42}" class="report-2d-axis-label" text-anchor="middle">${value}</text>
        `;
      }).join('');
      const points = items.map((item, index) => {
        const x = chartPadding.left + (item.x / maxX) * plotWidth;
        const y = chartPadding.top + plotHeight - (Math.max(0, Math.min(100, item.y)) / 100) * plotHeight;
        const labelAnchor = x > chartPadding.left + plotWidth - 90 ? 'end' : 'start';
        const labelX = labelAnchor === 'end' ? x - 12 : x + 12;
        const labelY = y + (index % 2 === 0 ? -10 : 16);
        const pointClass = item.y < 60 ? 'low' : item.y >= 85 ? 'strong' : '';
        return `
          <g class="report-2d-point-group">
            <circle cx="${x}" cy="${y}" r="8" class="report-2d-point ${pointClass}"></circle>
            <text x="${labelX}" y="${labelY}" class="report-2d-point-label" text-anchor="${labelAnchor}">${escapeHtml(truncateChartLabel(item.label, 9))}</text>
            <title>${escapeHtml(item.label)}：复习 ${item.x} 次，熟练度 ${item.y}%</title>
          </g>
        `;
      }).join('');
      return `
        <svg class="report-2d-chart-svg report-scatter-svg" viewBox="0 0 ${chartWidth2d} ${chartHeight2d}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHtml(options.title)}">
          <rect x="0" y="0" width="${chartWidth2d}" height="${chartHeight2d}" rx="16" class="report-2d-bg"></rect>
          ${renderGridLines(100, value => `${value}%`)}
          ${xGrid}
          <line x1="${chartPadding.left}" y1="${chartPadding.top + plotHeight}" x2="${chartPadding.left + plotWidth}" y2="${chartPadding.top + plotHeight}" class="report-2d-axis"></line>
          <line x1="${chartPadding.left}" y1="${chartPadding.top}" x2="${chartPadding.left}" y2="${chartPadding.top + plotHeight}" class="report-2d-axis"></line>
          <text x="${chartPadding.left + plotWidth / 2}" y="${chartHeight2d - 8}" class="report-2d-axis-title" text-anchor="middle">复习次数</text>
          <text x="16" y="${chartPadding.top + plotHeight / 2}" class="report-2d-axis-title vertical" text-anchor="middle" transform="rotate(-90 16 ${chartPadding.top + plotHeight / 2})">熟练度</text>
          ${points}
        </svg>
      `;
    };
    const articleMasteryChartSvg = articleMasteryStats.length
      ? renderScatterChartSvg(articleMasteryStats.map(item => ({
          label: item.title,
          x: item.reviews,
          y: item.mastery,
        })), {
          title: '文章熟练度',
          maxX: Math.max(...articleMasteryStats.map(item => item.reviews), 1),
        })
      : '';
    const todayDistributionChartSvg = todayReviewDistribution.length
      ? renderBarChartSvg(todayReviewDistribution.slice(0, 8).map(item => ({
          label: item.title,
          value: Math.max(1, Math.round(item.ms / 1000)),
          valueLabel: formatDuration(item.ms),
          className: item.word ? 'word-bar' : item.recite ? 'recite-bar' : '',
        })), {
          title: '今天复习时间分布',
          maxValue: Math.max(1, Math.round(maxTodayDistributionMs / 1000)),
          axisFormatter: value => formatDuration(value * 1000),
        })
      : '';
    const recitationArticleStats = articles
      .map(article => {
        const sessions = normalizeRecitationSessions(article.recitationSessions)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (!sessions.length) return null;

        const scores = sessions.map(session => Math.round(toNumber(session.averageScore, 0)));
        const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
        const bestScore = Math.max(...scores);
        const latestScore = scores[0] || 0;
        const totalDuration = sessions.reduce((sum, session) => sum + toNumber(session.duration, 0), 0);

        return {
          id: article.id,
          title: article.title,
          count: sessions.length,
          averageScore,
          bestScore,
          latestScore,
          totalDuration,
          partialCount: sessions.filter(session => session.partial).length,
          lastReviewed: sessions[0]?.timestamp || '',
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.averageScore - b.averageScore || b.count - a.count || a.title.localeCompare(b.title));
    const recitationArticleCount = recitationArticleStats.length;
    const recitationPartialCount = timedRecitationSessions.filter(session => session.partial).length;
    const masteredRecitationArticles = recitationArticleStats.filter(item => item.averageScore >= 90).length;
    const recitationBestScore = recitationArticleStats.length
      ? Math.max(...recitationArticleStats.map(item => item.bestScore))
      : 0;
    const recitationScoreClass = score => (score < 70 ? 'warning' : score >= 90 ? 'success' : '');
    const totalMistakeWords = wordBook.length;
    const masteredMistakeWords = wordBook.filter(item => (item.masteryScore || 0) >= 90).length;
    const activeMistakeWords = wordBook.filter(item => (item.masteryScore || 0) < 90).length;
    const avgMistakeWordMastery = totalMistakeWords
      ? Math.round(wordBook.reduce((sum, item) => sum + (item.masteryScore || 0), 0) / totalMistakeWords)
      : 0;
    const weakestWords = wordBook
      .slice()
      .sort((a, b) => (a.masteryScore || 0) - (b.masteryScore || 0) || (b.count || 0) - (a.count || 0))
      .slice(0, 6);
    const mostReviewedUnmasteredWords = wordBook
      .filter(item => (item.masteryScore || 0) < 100)
      .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || (a.masteryScore || 0) - (b.masteryScore || 0) || (b.count || 0) - (a.count || 0))
      .slice(0, 6);
    const masteredSentences = allSentences.filter(sentence => toNumber(sentence.masteryScore, 0) >= 90).length;
    const learningSentences = allSentences.filter(sentence => {
      const score = toNumber(sentence.masteryScore, 0);
      return score > 0 && score < 90;
    }).length;
    const untouchedSentences = allSentences.filter(sentence => {
      const hasHistory = Array.isArray(sentence.history) && sentence.history.length > 0;
      return !hasHistory && toNumber(sentence.reviewCount, 0) === 0 && toNumber(sentence.masteryScore, 0) <= 0;
    }).length;
    const pendingSentences = Math.max(0, totalSentenceCount - masteredSentences);
    const masteredArticles = articleMasteryStats.filter(item => item.mastery >= 90).length;
    const pendingArticles = Math.max(0, articleMasteryStats.length - masteredArticles);
    const reviewedSentenceCount = Math.max(0, totalSentenceCount - untouchedSentences);
    const reviewCoverage = totalSentenceCount ? Math.round((reviewedSentenceCount / totalSentenceCount) * 100) : 0;
    const masteryRate = totalSentenceCount ? Math.round((masteredSentences / totalSentenceCount) * 100) : 0;
    const recitationStableRate = recitationArticleCount ? Math.round((masteredRecitationArticles / recitationArticleCount) * 100) : 0;
    const sessionsWithScoreLast7 = sessionsLast7.filter(session => toNumber(session.averageScore, 0) > 0);
    const qualityLast7 = sessionsWithScoreLast7.length
      ? Math.round(sessionsWithScoreLast7.reduce((sum, session) => sum + toNumber(session.averageScore, 0), 0) / sessionsWithScoreLast7.length)
      : 0;
    const activeDays7 = new Set(sessionsLast7.map(session => dateKey(new Date(session.timestamp)))).size;
    const avgDailyMs7 = Math.round(study7Ms / 7);
    const avgActiveDayMs7 = activeDays7 ? Math.round(study7Ms / activeDays7) : 0;
    const reviewedUnits = Math.max(1, reviewedCount + wordReviewSessions.reduce((sum, session) => sum + toNumber(session.reviewedCount, 0), 0));
    const avgMsPerUnit = Math.min(180000, Math.max(20000, Math.round(totalDurationsMs / reviewedUnits) || 60000));
    const recitationNeedsPractice = recitationArticleStats.filter(item => item.averageScore < 90).length;
    const remainingUnits = pendingSentences + activeMistakeWords + recitationNeedsPractice;
    const estimatedRemainingMs = remainingUnits * avgMsPerUnit * 2;
    const estimateBasisMs = avgDailyMs7 || avgPerDayMs;
    const estimatedDays = remainingUnits === 0
      ? 0
      : estimateBasisMs
        ? Math.max(1, Math.ceil(estimatedRemainingMs / estimateBasisMs))
        : null;
    const estimatedWeeks = estimatedDays === 0 ? 0 : estimatedDays ? Math.max(1, Math.ceil(estimatedDays / 7)) : null;
    const dailyQuality = dailyDurations.slice(-14).map(day => {
      const daySessions = timedStudySessions.filter(session => {
        return dateKey(new Date(session.timestamp)) === day.date && toNumber(session.averageScore, 0) > 0;
      });
      const score = daySessions.length
        ? Math.round(daySessions.reduce((sum, session) => sum + toNumber(session.averageScore, 0), 0) / daySessions.length)
        : 0;
      return { date: day.date, score };
    });
    const dailyQualityChartSvg = dailyQuality.some(day => day.score > 0)
      ? renderBarChartSvg(dailyQuality.map(day => ({
          label: `${day.date.split('-')[1]}/${day.date.split('-')[2]}`,
          value: day.score,
          valueLabel: day.score ? `${day.score}%` : '',
          className: day.score >= 85 ? 'quality-strong-bar' : day.score > 0 && day.score < 65 ? 'quality-low-bar' : 'quality-bar',
        })), {
          title: '近 14 天复习质量',
          maxValue: 100,
          axisFormatter: value => `${value}%`,
          labelLimit: 5,
        })
      : '';
    const getStudyCalendarLevel = ms => {
      if (!ms) return 0;
      if (ms <= 5 * 60 * 1000) return 1;
      if (ms <= 15 * 60 * 1000) return 2;
      if (ms <= 30 * 60 * 1000) return 3;
      return 4;
    };
    const renderStudyActivityCalendar = year => {
      const activity = new Map();
      timedStudySessions.forEach(session => {
        const date = new Date(session.timestamp);
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
        const key = dateKey(date);
        if (!activity.has(key)) {
          activity.set(key, {
            duration: 0,
            sessionCount: 0,
            scoreTotal: 0,
            scoredCount: 0,
          });
        }
        const day = activity.get(key);
        day.duration += toNumber(session.duration, 0);
        day.sessionCount += 1;
        if (toNumber(session.averageScore, 0) > 0) {
          day.scoreTotal += toNumber(session.averageScore, 0);
          day.scoredCount += 1;
        }
      });

      const firstDay = new Date(year, 0, 1);
      const daysInYear = Math.round((new Date(year + 1, 0, 1) - firstDay) / oneDayMs);
      const firstWeekday = firstDay.getDay();
      const weekCount = Math.ceil((daysInYear + firstWeekday) / 7);
      const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const activeYearDays = Array.from(activity.values()).filter(day => day.duration > 0).length;
      const totalYearMs = Array.from(activity.values()).reduce((sum, day) => sum + day.duration, 0);
      const bestDay = Array.from(activity.entries()).sort((a, b) => b[1].duration - a[1].duration)[0];
      const weekLabels = Array.from({ length: weekCount }, (_, index) => `
        <span class="wordbook-calendar-week-label" title="第 ${index + 1} 周">${index + 1}</span>
      `).join('');
      const rows = dayLabels.map((label, rowIndex) => {
        const cells = Array.from({ length: weekCount }, (_, columnIndex) => {
          const dayOffset = columnIndex * 7 + rowIndex - firstWeekday;
          if (dayOffset < 0 || dayOffset >= daysInYear) {
            return '<span class="wordbook-calendar-cell empty" aria-hidden="true"></span>';
          }
          const date = new Date(year, 0, 1 + dayOffset);
          const key = dateKey(date);
          const day = activity.get(key);
          const duration = day?.duration || 0;
          const avgScore = day?.scoredCount ? Math.round(day.scoreTotal / day.scoredCount) : 0;
          const title = `${key} · 第 ${columnIndex + 1} 周 · 学习 ${formatDuration(duration)} · ${day?.sessionCount || 0} 轮${avgScore ? ` · 平均 ${avgScore}%` : ''}`;
          return `<span class="wordbook-calendar-cell level-${getStudyCalendarLevel(duration)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></span>`;
        }).join('');
        return `
          <div class="wordbook-calendar-row">
            <span class="wordbook-calendar-day-label">${label}</span>
            ${cells}
          </div>
        `;
      }).join('');

      return `
        <div class="wordbook-calendar-panel report-calendar-panel">
          <div class="wordbook-calendar-header">
            <div>
              <h3>${year} 年学习日历</h3>
              <p>每一列是一周，颜色越深代表当天学习时间越长。</p>
            </div>
          </div>
          <div class="wordbook-calendar">
            <div class="wordbook-calendar-summary">
              <span><strong>${formatDuration(totalYearMs)}</strong> 年度学习</span>
              <span><strong>${activeYearDays}</strong> 活跃天</span>
              <span><strong>${bestDay ? formatDuration(bestDay[1].duration) : '0秒'}</strong> 单日最多</span>
            </div>
            <div class="wordbook-calendar-scroll">
              <div class="wordbook-calendar-grid" style="--calendar-weeks:${weekCount}">
                <div class="wordbook-calendar-week-row">
                  <span></span>
                  ${weekLabels}
                </div>
                ${rows}
              </div>
            </div>
            <div class="wordbook-calendar-legend">
              <span>少</span>
              <i class="level-0"></i>
              <i class="level-1"></i>
              <i class="level-2"></i>
              <i class="level-3"></i>
              <i class="level-4"></i>
              <span>多</span>
            </div>
          </div>
        </div>
      `;
    };
    const studyActivityCalendarHtml = renderStudyActivityCalendar(now.getFullYear());
    const topPriorityArticles = articleMasteryStats
      .filter(item => item.mastery < 90)
      .slice(0, 5);
    const progressSummaryText = estimatedDays === 0
      ? '当前待掌握量已经清空。'
      : estimatedDays
        ? `按近 7 天节奏估算，当前待掌握量约还需要 ${estimatedDays} 天。`
        : '还没有足够的复习时间数据，先连续复习几天后这里会开始估算。';
    const strongestSignal = overall >= 85
      ? '状态很稳，继续保持节奏'
      : overall >= 60
        ? '正在进入稳定区，再推一把'
        : '先把基础复习节奏跑起来';
    const nextFocus = weakestSentences[0]
      ? `下一步优先复习：“${escapeHtml(weakestSentences[0].articleTitle)}”里的低熟练度内容。`
      : activeMistakeWords > 0
        ? '下一步优先清理仍需复习的错词。'
        : '当前薄弱项不多，可以开始挑战新文章。';
    const masteryArc = Math.max(0, Math.min(100, overall));
    const summaryHtml = `
      <div class="report-dashboard">
        <section class="report-hero report-new-hero">
          <div class="report-hero-main">
            <div class="report-hero-kicker">学习仪表盘</div>
            <h3>${strongestSignal}</h3>
            <p>${progressSummaryText} ${nextFocus}</p>
            <div class="report-hero-actions">
              <span>库里 ${articles.length} 篇文章</span>
              <span>已掌握 ${masteredSentences} / ${totalSentenceCount} 句</span>
              <span>近 7 天 ${formatDuration(study7Ms)}</span>
            </div>
          </div>
          <div class="report-mastery-orb" style="--mastery:${masteryArc}%">
            <div>
              <strong>${overall}%</strong>
              <span>整体熟练度</span>
            </div>
          </div>
        </section>

        <section class="report-section-band">
          <div class="report-section-heading">
            <h3>我的资料库</h3>
            <p>先看家底：多少文章、句子、错词和可默写内容。</p>
          </div>
          <div class="report-inventory-grid">
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
              <div class="report-kpi-icon">词</div>
              <div class="report-kpi-value">${totalMistakeWords}</div>
              <div class="report-kpi-label">错题本单词</div>
            </div>
            <div class="report-kpi-card">
              <div class="report-kpi-icon">默</div>
              <div class="report-kpi-value">${recitationArticleCount}</div>
              <div class="report-kpi-label">已默写文章</div>
            </div>
          </div>
        </section>

        <section class="report-section-band">
          <div class="report-section-heading">
            <h3>掌握程度</h3>
            <p>看已经拿下多少，也看还卡在哪里。</p>
          </div>
          <div class="report-mastery-layout">
            <div class="report-summary-block report-progress-panel">
              <div class="report-progress-head">
                <span>句子掌握进度</span>
                <strong>${masteryRate}%</strong>
              </div>
              <div class="report-stacked-bar" aria-hidden="true">
                <span class="mastered" style="width:${masteryRate}%"></span>
                <span class="learning" style="width:${totalSentenceCount ? Math.round((learningSentences / totalSentenceCount) * 100) : 0}%"></span>
              </div>
              <div class="report-progress-legend">
                <span><i class="mastered"></i>已掌握 ${masteredSentences}</span>
                <span><i class="learning"></i>学习中 ${learningSentences}</span>
                <span><i class="untouched"></i>未开始 ${untouchedSentences}</span>
              </div>
              <div class="report-plan-grid">
                <div>
                  <strong>${masteredArticles}</strong>
                  <span>已掌握文章</span>
                </div>
                <div>
                  <strong>${pendingArticles}</strong>
                  <span>待掌握文章</span>
                </div>
                <div>
                  <strong>${reviewCoverage}%</strong>
                  <span>复习覆盖率</span>
                </div>
                <div>
                  <strong>${avgMistakeWordMastery}%</strong>
                  <span>错词熟练度</span>
                </div>
              </div>
            </div>
            <div class="report-summary-block report-2d-card">
              <div class="report-2d-header">
                <h4>文章熟练度</h4>
                <span>横轴复习次数，纵轴熟练度</span>
              </div>
              ${articleMasteryChartSvg || '<div class="empty-state">暂无文章熟练度数据。</div>'}
            </div>
          </div>
        </section>

        <section class="report-section-band">
          <div class="report-section-heading">
            <h3>每天复习的量和质量</h3>
            <p>投入时间看节奏，正确率看质量。</p>
          </div>
          <div class="report-summary-grid report-time-grid">
            <div class="progress-card highlight">
              <div class="progress-card-title">今天</div>
              <div class="progress-card-value">${formatDuration(studyTodayMs)}</div>
            </div>
            <div class="progress-card">
              <div class="progress-card-title">近 7 天</div>
              <div class="progress-card-value">${formatDuration(study7Ms)}</div>
            </div>
            <div class="progress-card">
              <div class="progress-card-title">近 7 天质量</div>
              <div class="progress-card-value">${qualityLast7}%</div>
            </div>
            <div class="progress-card">
              <div class="progress-card-title">当前连续</div>
              <div class="progress-card-value">${currentStreak}天</div>
            </div>
          </div>
          ${studyActivityCalendarHtml}
          <div class="report-focus-grid">
            <div class="study-chart-card">
              <div class="study-chart-title">最近 30 天学习时间</div>
              <div class="study-chart-subtitle">包含听写、全文默写和单词复习。</div>
              ${studyChartSvg}
            </div>
            <div class="report-summary-block report-2d-card">
              <div class="report-2d-header">
                <h4>近 14 天复习质量</h4>
                <span>按每天有分数的复习记录计算</span>
              </div>
              ${dailyQualityChartSvg || '<div class="empty-state">还没有足够的正确率记录。</div>'}
            </div>
          </div>
        </section>

        <section class="report-section-band">
          <div class="report-section-heading">
            <h3>剩余规划</h3>
            <p>把待掌握内容换算成可执行的复习量。</p>
          </div>
          <div class="report-planning-layout">
            <div class="report-summary-block report-plan-card">
              <div class="report-plan-main">
                <span>预计还需要</span>
                <strong>${estimatedDays === 0 ? '已完成' : estimatedDays ? `${estimatedDays}天` : '待估算'}</strong>
                <p>${estimatedDays === 0 ? '当前没有待掌握内容，可以安心推进新文章。' : estimatedDays ? `约 ${estimatedWeeks} 周。按近 7 天日均 ${formatDuration(estimateBasisMs)} 估算。` : '开始积累复习时间后会自动估算。'}</p>
              </div>
              <div class="report-plan-grid">
                <div>
                  <strong>${pendingSentences}</strong>
                  <span>待掌握句子</span>
                </div>
                <div>
                  <strong>${activeMistakeWords}</strong>
                  <span>待掌握错词</span>
                </div>
                <div>
                  <strong>${recitationNeedsPractice}</strong>
                  <span>默写待稳定</span>
                </div>
                <div>
                  <strong>${formatDuration(avgActiveDayMs7 || avgDailyMs7)}</strong>
                  <span>近期日均</span>
                </div>
              </div>
            </div>
            <div class="report-summary-block">
              <div class="report-2d-header">
                <h4>优先处理</h4>
                <span>先补最低熟练度</span>
              </div>
              ${topPriorityArticles.length ? topPriorityArticles.map(item => `
                <div class="report-weak-row">
                  <div>
                    <div class="report-row-title">${escapeHtml(item.title)}</div>
                    <div class="report-row-value">${item.sentenceCount} 句 · 复习 ${item.reviews} 次</div>
                  </div>
                  <span class="report-score-pill ${item.mastery < 70 ? 'warning' : ''}">${item.mastery}%</span>
                </div>
              `).join('') : '<div class="empty-state">文章熟练度都很稳，可以推进新内容。</div>'}
            </div>
          </div>
        </section>

        <section class="report-section-band">
          <div class="report-section-heading">
            <h3>专项状态</h3>
            <p>错题本和全文默写作为辅助视角。</p>
          </div>
          <div class="report-special-grid">
            <div class="report-summary-block">
              <div class="report-2d-header">
                <h4>全文默写</h4>
                <span>${avgRecitationScore}% 平均正确率</span>
              </div>
              <div class="report-plan-grid compact">
                <div><strong>${totalRecitationSessions}</strong><span>默写次数</span></div>
                <div><strong>${masteredRecitationArticles}</strong><span>稳定掌握</span></div>
                <div><strong>${recitationStableRate}%</strong><span>稳定率</span></div>
                <div><strong>${recitationPartialCount}</strong><span>未完成</span></div>
              </div>
              ${recitationArticleStats.length ? recitationArticleStats.slice(0, 4).map(item => `
                <div class="recitation-mastery-row">
                  <div class="recitation-mastery-main">
                    <div class="report-row-title">${escapeHtml(item.title)}</div>
                    <div class="report-row-value">最近 ${item.latestScore}% · 最佳 ${item.bestScore}% · ${item.count} 次</div>
                    <div class="recitation-mastery-track" aria-hidden="true">
                      <span style="width:${Math.max(2, Math.min(100, item.averageScore))}%"></span>
                    </div>
                  </div>
                  <span class="report-score-pill ${recitationScoreClass(item.averageScore)}">${item.averageScore}%</span>
                </div>
              `).join('') : '<div class="empty-state">还没有全文默写记录。</div>'}
            </div>
            <div class="report-summary-block">
              <div class="report-2d-header">
                <h4>错题本</h4>
                <span>${activeMistakeWords} 个仍需复习</span>
              </div>
              ${mostReviewedUnmasteredWords.length ? mostReviewedUnmasteredWords.slice(0, 5).map(item => `
                <div class="report-weak-row">
                  <div>
                    <div class="report-row-title">${escapeHtml(item.word)}</div>
                    <div class="report-row-value">错题 ${item.count || 0} 次 · 复习 ${item.reviewCount || 0} 次</div>
                  </div>
                  <span class="report-score-pill ${(item.masteryScore || 0) < 70 ? 'warning' : ''}">${Math.round(item.masteryScore || 0)}%</span>
                </div>
              `).join('') : '<div class="empty-state">暂无反复复习后仍未掌握的单词。</div>'}
            </div>
          </div>
        </section>
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

function openWordBookEditPanel(id, deck = 'wordbook') {
  const entry = getWordDeckEntry(id, deck);
  if (!entry || !elements.wordbookEditPanel) return;
  if (elements.wordbookEditPanel.parentElement !== document.body) {
    document.body.appendChild(elements.wordbookEditPanel);
  }
  selectedWordBookId = String(entry.id);
  selectedWordEditDeck = deck;
  const isA2Deck = deck === 'a2vocab';
  if (elements.wordbookEditTitle) elements.wordbookEditTitle.textContent = isA2Deck ? '编辑A2动词' : '编辑错词';
  elements.wordbookEditWord.value = entry.word;
  elements.wordbookEditTranslation.value = entry.translation || '';
  elements.wordbookEditDifficulty.value = entry.difficulty || '';
  elements.wordbookEditSource.value = entry.source || '';
  elements.wordbookEditDifficulty.disabled = isA2Deck;
  elements.wordbookEditSource.disabled = isA2Deck;
  if (elements.wordbookEditTags) {
    elements.wordbookEditTags.value = Array.isArray(entry.tags) ? entry.tags.join(', ') : '';
    elements.wordbookEditTags.disabled = isA2Deck;
  }
  elements.wordbookEditAudioInfo.textContent = entry.audioName ? `当前音频：${entry.audioName}` : '当前无音频。';
  const submitButton = elements.wordbookEditForm?.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = isA2Deck ? '保存A2动词' : '保存错词';
  elements.wordbookEditPanel.classList.remove('hidden');
  document.body.classList.add('modal-open');
  elements.wordbookEditTranslation?.focus();
}

function closeWordBookEditPanel() {
  if (!elements.wordbookEditPanel) return;
  selectedWordBookId = null;
  selectedWordEditDeck = 'wordbook';
  elements.wordbookEditPanel.classList.add('hidden');
  document.body.classList.remove('modal-open');
  if (elements.wordbookEditForm) elements.wordbookEditForm.reset();
  if (elements.wordbookEditTitle) elements.wordbookEditTitle.textContent = '编辑错词';
  if (elements.wordbookEditDifficulty) elements.wordbookEditDifficulty.disabled = false;
  if (elements.wordbookEditSource) elements.wordbookEditSource.disabled = false;
  if (elements.wordbookEditTags) elements.wordbookEditTags.disabled = false;
  if (elements.wordbookEditAudioInfo) elements.wordbookEditAudioInfo.textContent = '如果不修改音频则保持当前音频。';
  const submitButton = elements.wordbookEditForm?.querySelector('button[type="submit"]');
  if (submitButton) submitButton.textContent = '保存错词';
}

async function handleWordBookEditSubmit(event) {
  event.preventDefault();
  if (!selectedWordBookId) return;
  const deck = selectedWordEditDeck || 'wordbook';
  const entry = getWordDeckEntry(selectedWordBookId, deck);
  if (!entry) return;
  entry.translation = elements.wordbookEditTranslation.value.trim();
  if (deck !== 'a2vocab') {
    entry.difficulty = elements.wordbookEditDifficulty.value.trim();
    entry.source = elements.wordbookEditSource.value.trim();
  }
  if (elements.wordbookEditTags && deck !== 'a2vocab') {
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
  saveWordDeckEntry(entry, deck);
  if (deck === 'a2vocab') {
    renderA2VocabPage();
  } else {
    renderWordBookPage();
  }
  closeWordBookEditPanel();
  showFeedback(deck === 'a2vocab' ? 'A2动词已更新。' : '错词已更新。', 'success');
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
  const pending = wordBook.filter(item => toNumber(item.masteryScore, 0) < 100).length;

  if (elements.wordbookTotalWords) elements.wordbookTotalWords.textContent = totalWords;
  if (elements.wordbookTotalSentences) elements.wordbookTotalSentences.textContent = wrongSentences.length;
  if (elements.wordbookOverallMastery) elements.wordbookOverallMastery.textContent = `${overallMastery}%`;
  if (elements.wordbookPendingReview) elements.wordbookPendingReview.textContent = pending;
  if (elements.wordbookReviewAll) elements.wordbookReviewAll.disabled = totalWords === 0;
  if (elements.wordbookReviewUnmastered) elements.wordbookReviewUnmastered.disabled = pending === 0;
  if (elements.wordbookReadUnmastered) elements.wordbookReadUnmastered.disabled = pending === 0;
  if (elements.wordbookStopReading && !wordReadingState.active) elements.wordbookStopReading.disabled = true;
  renderWordBookCalendar();

  if (!elements.wordbookList) return;
  if (!wordBook.length) {
    resetWordReadingPanel();
    elements.wordbookList.innerHTML = '<div class="empty-state">当前错题本为空。</div>';
    return;
  }

  const sortedWords = wordBook.slice().sort((a, b) => b.count - a.count || toNumber(a.masteryScore, 0) - toNumber(b.masteryScore, 0));
  const activeWords = sortedWords.filter(item => toNumber(item.masteryScore, 0) < 100);
  const masteredWords = sortedWords.filter(item => toNumber(item.masteryScore, 0) >= 100);
  const archivedWithAudio = masteredWords.filter(item => item.audioId).length;
  const archivedRecent = masteredWords.filter(item => {
    const timestamp = item.lastSeen ? new Date(item.lastSeen).getTime() : 0;
    return timestamp && Date.now() - timestamp <= 1000 * 60 * 60 * 24 * 30;
  }).length;
  const renderGroup = (title, count, items, type) => `
    <section class="wordbook-group wordbook-group-${type}">
      <div class="wordbook-group-header">
        <h4>${title}</h4>
        <span>${count} 个</span>
      </div>
      ${items.length
        ? `<div class="wordbook-group-grid">${items.map(item => renderWordBookCard(item, type === 'mastered')).join('')}</div>`
        : `<div class="empty-state">${type === 'mastered' ? '还没有 100% 熟练度的单词。' : '当前没有待掌握的错词。'}</div>`}
    </section>
  `;

  const renderMasteredArchive = () => `
    <section class="wordbook-group wordbook-group-mastered wordbook-archive ${masteredArchiveOpen ? 'open' : ''}">
      <div class="wordbook-archive-summary">
        <div>
          <div class="wordbook-archive-kicker">Archived Mastery</div>
          <h4>已掌握归档</h4>
          <p>这些单词默认收起，不占用复习视线；如果以后再次拼错，会自动回到待掌握区。</p>
        </div>
        <div class="wordbook-archive-stats">
          <span><strong>${masteredWords.length}</strong> 已归档</span>
          <span><strong>${archivedWithAudio}</strong> 有音频</span>
          <span><strong>${archivedRecent}</strong> 近 30 天错过</span>
        </div>
        <div class="wordbook-archive-actions">
          <label class="wordbook-review-count-control">
            <span>抽查数量</span>
            <input class="wordbook-mastered-quiz-count" type="number" min="1" max="${Math.max(1, masteredWords.length)}" value="10" inputmode="numeric" ${masteredWords.length ? '' : 'disabled'} />
          </label>
          <button type="button" class="btn btn-small btn-primary wordbook-quiz-mastered-btn" ${masteredWords.length ? '' : 'disabled'}>随机抽查</button>
          <button type="button" class="btn btn-small btn-secondary wordbook-read-mastered-btn" ${masteredWords.length ? '' : 'disabled'}>列表播放</button>
          <button type="button" class="btn btn-small btn-secondary wordbook-archive-toggle-btn" ${masteredWords.length ? '' : 'disabled'}>${masteredArchiveOpen ? '收起归档' : '打开归档'}</button>
        </div>
      </div>
      ${masteredArchiveOpen && masteredWords.length
        ? `<div class="wordbook-group-grid">${masteredWords.map(item => renderWordBookCard(item, true)).join('')}</div>`
        : ''}
    </section>
  `;

  elements.wordbookList.innerHTML = `
    ${renderGroup('待掌握单词', activeWords.length, activeWords, 'active')}
    ${renderMasteredArchive()}
    ${renderWordBookStabilityChart(sortedWords)}
  `;

}

function calculateWordStability(item) {
  const mastery = Math.max(0, Math.min(100, toNumber(item.masteryScore, 0)));
  const history = Array.isArray(item.history) ? item.history.slice(0, 12) : [];
  const accuracy = history.length
    ? Math.round(history.reduce((sum, entry) => sum + toNumber(entry.score, 0), 0) / history.length)
    : mastery;
  const reviewBonus = Math.min(100, toNumber(item.reviewCount, 0) * 12);
  return Math.round((mastery * 0.58) + (accuracy * 0.3) + (reviewBonus * 0.12));
}

function getWordBookMasteryStats(words = wordBook) {
  const buckets = [
    { key: 'solid', label: '完全掌握', hint: '牢固度 88%+', count: 0 },
    { key: 'steady', label: '基本掌握', hint: '68-87%', count: 0 },
    { key: 'review', label: '需要复习', hint: '1-67%', count: 0 },
    { key: 'new', label: '未开始', hint: '无复习记录', count: 0 },
  ];
  words.forEach(item => {
    if (!toNumber(item.reviewCount, 0) && !(Array.isArray(item.history) && item.history.length)) {
      buckets[3].count += 1;
      return;
    }
    const score = calculateWordStability(item);
    if (score >= 88) buckets[0].count += 1;
    else if (score >= 68) buckets[1].count += 1;
    else buckets[2].count += 1;
  });
  const total = words.length;
  const masteredCount = buckets[0].count;
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    totalWords: total,
    masteredCount,
    masteredRate: total ? Math.round((masteredCount / total) * 100) : 0,
    buckets,
  };
}

function renderWordBookStabilityChart(words) {
  if (!words.length) return '';
  const stats = getWordBookMasteryStats(words);
  const buckets = stats.buckets;
  const maxCount = Math.max(1, ...buckets.map(bucket => bucket.count));
  return `
    <section class="wordbook-stability-panel">
      <div class="wordbook-group-header">
        <h4>掌握统计</h4>
        <span>${stats.masteredCount} 个完全掌握</span>
      </div>
      <div class="wordbook-stability-bars">
        ${buckets.map(bucket => `
          <div class="wordbook-stability-bar ${bucket.key}">
            <div class="wordbook-stability-bar-head">
              <strong>${bucket.count}</strong>
              <span>${bucket.label}</span>
            </div>
            <div class="wordbook-stability-bar-track" aria-label="${escapeHtml(bucket.label)} ${bucket.count} 个">
              <span style="width:${Math.max(bucket.count ? 8 : 0, (bucket.count / maxCount) * 100)}%"></span>
            </div>
            <em>${bucket.hint}</em>
          </div>
        `).join('')}
      </div>
      <div class="wordbook-stability-summary">
        <div>
          <strong>${words.length}</strong>
          <span>错词总数</span>
        </div>
        <div>
          <strong>${stats.masteredRate}%</strong>
          <span>完全掌握率</span>
        </div>
      </div>
    </section>
  `;
}

function getWordBookDailyActivity(year) {
  const activity = new Map();
  const ensureDay = key => {
    if (!activity.has(key)) {
      activity.set(key, {
        reviewedCount: 0,
        sessionCount: 0,
        duration: 0,
        scoreTotal: 0,
        scoredCount: 0,
        historyCount: 0,
      });
    }
    return activity.get(key);
  };
  const sessionDates = new Set();

  normalizeWordReviewSessions(wordReviewSessions).forEach(session => {
    const date = new Date(session.timestamp);
    if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
    const key = getLocalDateKey(date);
    const day = ensureDay(key);
    day.reviewedCount += Math.max(1, toNumber(session.reviewedCount, 0));
    day.sessionCount += 1;
    day.duration += toNumber(session.duration, 0);
    if (toNumber(session.averageScore, 0) > 0) {
      day.scoreTotal += toNumber(session.averageScore, 0);
      day.scoredCount += 1;
    }
    sessionDates.add(key);
  });

  wordBook.forEach(word => {
    (Array.isArray(word.history) ? word.history : []).forEach(entry => {
      const date = new Date(entry.timestamp);
      if (Number.isNaN(date.getTime()) || date.getFullYear() !== year) return;
      const key = getLocalDateKey(date);
      if (sessionDates.has(key)) return;
      const day = ensureDay(key);
      day.reviewedCount += 1;
      day.historyCount += 1;
      if (toNumber(entry.score, 0) > 0) {
        day.scoreTotal += toNumber(entry.score, 0);
        day.scoredCount += 1;
      }
    });
  });

  return activity;
}

function getWordBookCalendarLevel(count) {
  if (!count) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function renderWordBookCalendar() {
  if (!elements.wordbookCalendar) return;
  const year = wordbookCalendarYear;
  if (elements.wordbookCalendarYear) elements.wordbookCalendarYear.textContent = year;

  const activity = getWordBookDailyActivity(year);
  const firstDay = new Date(year, 0, 1);
  const daysInYear = Math.round((new Date(year + 1, 0, 1) - firstDay) / (24 * 60 * 60 * 1000));
  const firstWeekday = firstDay.getDay();
  const weekCount = Math.ceil((daysInYear + firstWeekday) / 7);
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const totalReviewed = Array.from(activity.values()).reduce((sum, day) => sum + day.reviewedCount, 0);
  const activeDays = Array.from(activity.values()).filter(day => day.reviewedCount > 0).length;
  const bestDay = Array.from(activity.entries()).sort((a, b) => b[1].reviewedCount - a[1].reviewedCount)[0];
  const weekLabels = Array.from({ length: weekCount }, (_, index) => `
    <span class="wordbook-calendar-week-label" title="第 ${index + 1} 周">${index + 1}</span>
  `).join('');
  const rows = dayLabels.map((label, rowIndex) => {
    const cells = Array.from({ length: weekCount }, (_, columnIndex) => {
      const dayOffset = columnIndex * 7 + rowIndex - firstWeekday;
      if (dayOffset < 0 || dayOffset >= daysInYear) {
        return '<span class="wordbook-calendar-cell empty" aria-hidden="true"></span>';
      }
      const date = new Date(year, 0, 1 + dayOffset);
      const key = getLocalDateKey(date);
      const day = activity.get(key);
      const count = day?.reviewedCount || 0;
      const avgScore = day?.scoredCount ? Math.round(day.scoreTotal / day.scoredCount) : 0;
      const title = `${key} · 第 ${columnIndex + 1} 周 · 复习 ${count} 个错词${avgScore ? ` · 平均 ${avgScore}%` : ''}${day?.duration ? ` · 用时 ${formatDuration(day.duration)}` : ''}`;
      return `<span class="wordbook-calendar-cell level-${getWordBookCalendarLevel(count)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></span>`;
    }).join('');
    return `
      <div class="wordbook-calendar-row">
        <span class="wordbook-calendar-day-label">${label}</span>
        ${cells}
      </div>
    `;
  }).join('');

  elements.wordbookCalendar.innerHTML = `
    <div class="wordbook-calendar-summary">
      <span><strong>${totalReviewed}</strong> 年度复习错词</span>
      <span><strong>${activeDays}</strong> 活跃天</span>
      <span><strong>${bestDay ? bestDay[1].reviewedCount : 0}</strong> 单日最多</span>
    </div>
    <div class="wordbook-calendar-scroll">
      <div class="wordbook-calendar-grid" style="--calendar-weeks:${weekCount}">
        <div class="wordbook-calendar-week-row">
          <span></span>
          ${weekLabels}
        </div>
        ${rows}
      </div>
    </div>
    <div class="wordbook-calendar-legend">
      <span>少</span>
      <i class="level-0"></i>
      <i class="level-1"></i>
      <i class="level-2"></i>
      <i class="level-3"></i>
      <i class="level-4"></i>
      <span>多</span>
    </div>
  `;
}

function renderWordBookCard(item, isMastered = false) {
  const mastery = Math.round(toNumber(item.masteryScore, 0));
  if (isMastered) {
    return `
      <div class="wordbook-card mastered compact" data-word-id="${item.id}">
        <div class="wordbook-card-header">
          <div class="wordbook-word">${escapeHtml(item.word)}</div>
          <div class="wordbook-mastery">${mastery}%</div>
        </div>
        <div class="wordbook-mastered-meta">${escapeHtml(item.translation || item.source || '已掌握')}</div>
        <div class="wordbook-actions">
          <button type="button" class="btn btn-small btn-secondary play-word-audio-btn icon-btn" aria-label="播放 ${escapeHtml(item.word)}" title="播放单词">▶</button>
          <button type="button" class="btn btn-small btn-danger wordbook-delete-btn">删除</button>
        </div>
      </div>
    `;
  }
  return `
    <div class="wordbook-card active" data-word-id="${item.id}">
      <div class="wordbook-card-header">
        <div class="wordbook-word">${escapeHtml(item.word)}</div>
        <div class="wordbook-mastery">${mastery}%</div>
      </div>
      <div class="wordbook-progress">
        <div class="wordbook-progress-fill" style="width:${Math.min(100, mastery)}%"></div>
      </div>
      <div class="wordbook-meta">难度：${escapeHtml(item.difficulty || '未设置')} · 错题次数：${item.count} · 来源：${escapeHtml(item.source || '未知')}</div>
      ${item.tags && item.tags.length ? `<div class="wordbook-tags">标签：${escapeHtml(item.tags.join(', '))}</div>` : ''}
      <div class="wordbook-translation">${escapeHtml(item.translation || '暂无说明')}</div>
      <div class="wordbook-actions">
        <button type="button" class="btn btn-small btn-secondary play-word-audio-btn icon-btn" aria-label="播放 ${escapeHtml(item.word)}" title="播放单词">▶</button>
        <button type="button" class="btn btn-small btn-secondary wordbook-edit-btn">编辑</button>
        <button type="button" class="btn btn-small btn-danger wordbook-delete-btn">删除</button>
      </div>
    </div>
  `;
}

function renderA2VocabPage() {
  const entries = getA2VocabEntries();
  const reviewed = entries.filter(item => toNumber(item.reviewCount, 0) > 0).length;
  const pending = entries.filter(item => toNumber(item.masteryScore, 0) < 100).length;
  const overallMastery = entries.length
    ? Math.round(entries.reduce((sum, item) => sum + toNumber(item.masteryScore, 0), 0) / entries.length)
    : 0;

  if (elements.a2VocabTotalWords) elements.a2VocabTotalWords.textContent = entries.length;
  if (elements.a2VocabReviewedWords) elements.a2VocabReviewedWords.textContent = reviewed;
  if (elements.a2VocabOverallMastery) elements.a2VocabOverallMastery.textContent = `${overallMastery}%`;
  if (elements.a2VocabPendingReview) elements.a2VocabPendingReview.textContent = pending;
  if (elements.a2VocabReviewAll) elements.a2VocabReviewAll.disabled = entries.length === 0;
  if (elements.a2VocabReviewUnmastered) elements.a2VocabReviewUnmastered.disabled = pending === 0;
  if (elements.a2VocabReadUnmastered) elements.a2VocabReadUnmastered.disabled = pending === 0;
  if (elements.a2VocabStopReading && !wordReadingState.active) elements.a2VocabStopReading.disabled = true;

  if (!elements.a2VocabList) return;
  const activeWords = entries
    .filter(item => toNumber(item.masteryScore, 0) < 100)
    .sort((a, b) => toNumber(a.masteryScore, 0) - toNumber(b.masteryScore, 0) || a.word.localeCompare(b.word, 'nl'));
  const masteredWords = entries
    .filter(item => toNumber(item.masteryScore, 0) >= 100)
    .sort((a, b) => a.word.localeCompare(b.word, 'nl'));

  elements.a2VocabList.innerHTML = `
    <section class="wordbook-group wordbook-group-active">
      <div class="wordbook-group-header">
        <h4>待掌握 A2 词汇</h4>
        <span>${activeWords.length} 个</span>
      </div>
      <div class="wordbook-group-grid">${activeWords.map(renderA2VocabCard).join('')}</div>
    </section>
    <section class="wordbook-group wordbook-group-mastered">
      <div class="wordbook-group-header">
        <h4>已掌握 A2 词汇</h4>
        <span>${masteredWords.length} 个</span>
      </div>
      ${masteredWords.length
        ? `<div class="wordbook-group-grid">${masteredWords.map(renderA2VocabCard).join('')}</div>`
        : '<div class="empty-state">还没有 100% 熟练度的 A2 单词。</div>'}
    </section>
  `;
}

function renderA2VocabCard(item) {
  const mastery = Math.round(toNumber(item.masteryScore, 0));
  const mastered = mastery >= 100;
  return `
    <div class="wordbook-card ${mastered ? 'mastered compact' : 'active'}" data-word-id="${item.id}">
      <div class="wordbook-card-header">
        <div class="wordbook-word">${escapeHtml(item.word)}</div>
        <div class="wordbook-mastery">${mastery}%</div>
      </div>
      ${mastered ? '' : `
        <div class="wordbook-progress">
          <div class="wordbook-progress-fill" style="width:${Math.min(100, mastery)}%"></div>
        </div>
      `}
      <div class="wordbook-meta">标签：A2, 动词 · 复习：${toNumber(item.reviewCount, 0)} 次 · 错误：${toNumber(item.count, 0)} 次</div>
      <div class="wordbook-translation">${escapeHtml(item.translation || '暂无说明')}</div>
      <div class="wordbook-actions">
        <button type="button" class="btn btn-small btn-secondary play-a2-word-btn icon-btn" aria-label="播放 ${escapeHtml(item.word)}" title="播放单词">▶</button>
        <button type="button" class="btn btn-small btn-secondary edit-a2-word-btn">编辑</button>
        <button type="button" class="btn btn-small btn-primary review-a2-word-btn">复习</button>
      </div>
    </div>
  `;
}

function handleA2VocabListClick(event) {
  const card = event.target.closest('.wordbook-card');
  if (!card) return;
  const id = card.dataset.wordId;
  if (!id) return;
  const entry = getA2VocabEntry(id);
  if (!entry) return;

  if (event.target.closest('.play-a2-word-btn')) {
    playSingleWordEntry(entry);
    return;
  }
  if (event.target.closest('.edit-a2-word-btn')) {
    openWordBookEditPanel(id, 'a2vocab');
    return;
  }
  if (event.target.closest('.review-a2-word-btn') || event.target.closest('.wordbook-card')) {
    startA2VocabReview(id);
  }
}

function handleWordbookListClick(event) {
  if (event.target.closest('.wordbook-archive-toggle-btn')) {
    masteredArchiveOpen = !masteredArchiveOpen;
    renderWordBookPage();
    return;
  }

  if (event.target.closest('.wordbook-read-mastered-btn')) {
    startWordListReading({ mode: 'mastered' });
    return;
  }

  if (event.target.closest('.wordbook-quiz-mastered-btn')) {
    startMasteredWordBookQuiz();
    return;
  }

  const card = event.target.closest('.wordbook-card');
  if (!card) return;
  const id = card.dataset.wordId;
  if (!id) return;

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
    if (!entry) return;
    playSingleWordEntry(entry);
    return;
  }

  if (card.classList.contains('mastered')) {
    return;
  }

  if (event.target.closest('.wordbook-card')) {
    openWordBookEditPanel(id);
    return;
  }
}

function getMasteredWordBookQuizCount() {
  const input = elements.wordbookList?.querySelector('.wordbook-mastered-quiz-count');
  const masteredCount = wordBook.filter(item => toNumber(item.masteryScore, 0) >= 100).length;
  const count = Math.max(1, Math.min(Math.max(1, masteredCount), Math.round(Number(input?.value) || 10)));
  if (input) input.value = count;
  return count;
}

function startMasteredWordBookQuiz() {
  const masteredWords = wordBook.filter(item => toNumber(item.masteryScore, 0) >= 100);
  if (!masteredWords.length) {
    alert('当前还没有已掌握归档单词可抽查。');
    return;
  }
  startWordReview(null, {
    deck: 'wordbook',
    onlyMastered: true,
    random: true,
    limit: getMasteredWordBookQuizCount(),
    modeLabel: '随机抽查已掌握单词',
  });
}

function getWordsForReading(mode = 'unmastered', deck = 'wordbook') {
  const mastered = mode === 'mastered';
  return getWordDeckEntries(deck)
    .filter(item => mastered ? toNumber(item.masteryScore, 0) >= 100 : toNumber(item.masteryScore, 0) < 100)
    .sort((a, b) => b.count - a.count || toNumber(a.masteryScore, 0) - toNumber(b.masteryScore, 0));
}

function getUnmasteredWordsForReading() {
  return getWordsForReading('unmastered');
}

function resetWordReadingPanel() {
  if (elements.wordbookReadingPanel) elements.wordbookReadingPanel.classList.add('hidden');
  if (elements.wordbookReadingList) elements.wordbookReadingList.innerHTML = '';
}

function getReadingElements(deck = 'wordbook') {
  if (deck === 'a2vocab') {
    return {
      panel: elements.a2VocabReadingPanel,
      list: elements.a2VocabReadingList,
    };
  }
  return {
    panel: elements.wordbookReadingPanel,
    list: elements.wordbookReadingList,
  };
}

function renderWordReadingList(words, mode = 'unmastered', deck = 'wordbook') {
  const reading = getReadingElements(deck);
  if (!reading.panel || !reading.list) return;
  const isA2Deck = deck === 'a2vocab';
  const title = mode === 'mastered' ? '已掌握归档朗读' : (isA2Deck ? 'A2 未掌握词朗读' : '未掌握单词朗读');
  const note = mode === 'mastered'
    ? '归档单词会自动朗读 2 遍，当前朗读的单词会高亮。'
    : '每个单词自动朗读 2 遍，当前朗读的单词会高亮。';
  const titleEl = reading.panel.querySelector('.wordbook-reading-header h3');
  const noteEl = reading.panel.querySelector('.wordbook-reading-header p');
  if (titleEl) titleEl.textContent = title;
  if (noteEl) noteEl.textContent = note;
  reading.list.innerHTML = words.map(item => `
    <div class="wordbook-reading-item" data-read-word-id="${item.id}">
      <div>
        <strong>${escapeHtml(item.word)}</strong>
        <span>${escapeHtml(item.translation || item.source || '暂无说明')}</span>
      </div>
      <em>${Math.round(toNumber(item.masteryScore, 0))}%</em>
    </div>
  `).join('');
  reading.panel.classList.remove('hidden');
}

function setActiveReadingWord(id) {
  if (!elements.wordbookReadingList) return;
  elements.wordbookReadingList.querySelectorAll('.wordbook-reading-item').forEach(item => {
    const active = String(item.dataset.readWordId) === String(id);
    item.classList.toggle('reading', active);
    if (active) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
  document.querySelectorAll('.wordbook-card').forEach(card => {
    card.classList.toggle('reading', String(card.dataset.wordId) === String(id));
  });
}

async function startWordListReading(options = {}) {
  const mode = options.mode || 'unmastered';
  const deck = options.deck || 'wordbook';
  const words = getWordsForReading(mode, deck);
  if (!words.length) {
    alert(mode === 'mastered' ? '当前没有已掌握的归档单词可播放。' : '当前没有未掌握的单词可播放。');
    return;
  }
  stopWordListReading({ keepPanel: true });
  renderWordReadingList(words, mode, deck);
  wordReadingState.active = true;
  wordReadingState.stopRequested = false;
  wordReadingState.deck = deck;
  if (elements.wordbookReadUnmastered) elements.wordbookReadUnmastered.disabled = true;
  if (elements.a2VocabReadUnmastered) elements.a2VocabReadUnmastered.disabled = true;
  if (elements.wordbookStopReading) elements.wordbookStopReading.disabled = false;
  if (elements.a2VocabStopReading) elements.a2VocabStopReading.disabled = false;

  for (const word of words) {
    if (wordReadingState.stopRequested) break;
    setActiveReadingWord(word.id);
    await playWordEntryTwice(word);
    await delay(250);
  }

  if (!wordReadingState.stopRequested) {
    showFeedback(mode === 'mastered' ? '已掌握归档列表播放完成。' : '未掌握单词列表播放完成。', 'success');
  }
  finishWordListReading();
}

function startA2VocabReading() {
  startWordListReading({ deck: 'a2vocab' });
}

function stopWordListReading(options = {}) {
  wordReadingState.stopRequested = true;
  if (wordReadingState.currentAudio) {
    try { wordReadingState.currentAudio.pause(); } catch (e) {}
    wordReadingState.currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    try { speechSynthesis.cancel(); } catch (e) {}
  }
  finishWordListReading(options);
}

function finishWordListReading(options = {}) {
  wordReadingState.active = false;
  wordReadingState.currentAudio = null;
  setActiveReadingWord(null);
  if (!options.keepPanel && wordReadingState.stopRequested) {
    showFeedback('已结束未掌握单词阅读。', 'info');
  }
  if (elements.wordbookReadUnmastered) {
    elements.wordbookReadUnmastered.disabled = getUnmasteredWordsForReading().length === 0;
  }
  if (elements.a2VocabReadUnmastered) {
    elements.a2VocabReadUnmastered.disabled = getWordsForReading('unmastered', 'a2vocab').length === 0;
  }
  if (elements.wordbookStopReading) elements.wordbookStopReading.disabled = true;
  if (elements.a2VocabStopReading) elements.a2VocabStopReading.disabled = true;
}

async function playWordEntryTwice(entry) {
  await playWordEntryOnce(entry);
  if (wordReadingState.stopRequested) return;
  await delay(180);
  await playWordEntryOnce(entry);
}

async function playSingleWordEntry(entry) {
  stopWordListReading({ keepPanel: true, silent: true });
  wordReadingState.stopRequested = false;
  setActiveReadingWord(entry.id);
  await playWordEntryOnce(entry);
  setActiveReadingWord(null);
}

async function playWordEntryOnce(entry) {
  if (!entry) return;
  if (entry.audioId) {
    try {
      const url = await getAudioUrl(entry.audioId);
      await playReadingAudioUrl(url);
      return;
    } catch (err) {
      console.warn('单词音频播放失败，改用语音朗读：', err && err.message);
    }
  }
  await speakWordText(entry.word);
}

function playReadingAudioUrl(url) {
  return new Promise(resolve => {
    if (wordReadingState.stopRequested) {
      resolve();
      return;
    }
    try {
      const audio = new Audio(url);
      wordReadingState.currentAudio = audio;
      audio.onended = () => {
        wordReadingState.currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        wordReadingState.currentAudio = null;
        resolve();
      };
      audio.play().catch(() => {
        wordReadingState.currentAudio = null;
        resolve();
      });
    } catch (err) {
      resolve();
    }
  });
}

function speakWordText(text) {
  return new Promise(resolve => {
    if (!text || wordReadingState.stopRequested || !('speechSynthesis' in window)) {
      resolve();
      return;
    }
    try {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = 0.86;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      speechSynthesis.speak(utterance);
    } catch (err) {
      resolve();
    }
  });
}

function startWordReview(wordId = null, options = {}) {
  stopWordListReading({ keepPanel: true, silent: true });
  const deck = options.deck || 'wordbook';
  const deckEntries = getWordDeckEntries(deck);
  const sortedDeckEntries = deckEntries
    .filter(item => {
      if (options.onlyMastered) return toNumber(item.masteryScore, 0) >= 100;
      if (options.onlyUnmastered) return toNumber(item.masteryScore, 0) < 100;
      return true;
    })
    .sort((a, b) => (b.count || 0) - (a.count || 0) || toNumber(a.masteryScore, 0) - toNumber(b.masteryScore, 0));
  const selectedEntries = options.random ? shuffleArray(sortedDeckEntries) : sortedDeckEntries;
  const limitedEntries = options.limit ? selectedEntries.slice(0, Math.max(1, toNumber(options.limit, 20))) : selectedEntries;
  const ids = wordId
    ? [wordId]
    : limitedEntries.map(item => item.id);
  if (!ids.length) {
    const emptyLabel = deck === 'a2vocab' ? 'A2词库' : '错题本';
    alert(options.onlyUnmastered ? `当前没有未掌握的${emptyLabel}单词可复习。` : `${emptyLabel}当前没有单词可复习。`);
    return;
  }
  currentReview = {
    sessionId: generateId(),
    type: 'word',
    deck,
    wordIds: ids,
    index: 0,
    doneIds: new Set(),
    sessionScores: [],
    startTime: Date.now(),
    onlyUnmastered: !!options.onlyUnmastered,
    onlyMastered: !!options.onlyMastered,
    modeLabel: options.modeLabel || '',
    waitingForManualSummary: false,
    autoAdvanceTimer: null,
    returnPage: deck === 'a2vocab' ? 'a2vocab' : 'wordbook',
  };
  if (elements.endReview) elements.endReview.textContent = '结束复习';
  startReviewTimer();
  showSection('review');
  renderReviewItem();
}

function startA2VocabReview(wordId = null, options = {}) {
  startWordReview(wordId, { ...options, deck: 'a2vocab' });
}

function getA2ReviewCount() {
  const value = toNumber(Number(elements.a2VocabReviewCount?.value), 20);
  const max = A2_VOCABULARY.length;
  const count = Math.max(1, Math.min(max, Math.round(value || 20)));
  if (elements.a2VocabReviewCount) elements.a2VocabReviewCount.value = count;
  return count;
}

function shuffleArray(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

function completeReview(options = {}) {
  if (!currentReview || currentReview.completed) return;
  if (currentReview.autoAdvanceTimer) {
    clearTimeout(currentReview.autoAdvanceTimer);
    currentReview.autoAdvanceTimer = null;
  }
  if (currentReview.waitingForManualSummary && !options.manual) {
    showFeedback('最后一项已提交。请点击“完成复习”或“结束复习”查看本次总结。', 'info');
    return;
  }
  currentReview.completed = true;
  stopReviewTimer();
  const summary = {
    type: currentReview.type || 'sentence',
    deck: currentReview.deck || '',
    total: currentReview.type === 'word' ? currentReview.wordIds.length : currentReview.sentenceIds.length,
    completedCount: currentReview.doneIds ? currentReview.doneIds.size : currentReview.sessionScores.length,
    isPartial: currentReview.doneIds ? currentReview.doneIds.size < (currentReview.type === 'word' ? currentReview.wordIds.length : currentReview.sentenceIds.length) : false,
    scores: currentReview.sessionScores.map(item => ({
      sentence: item.sentence,
      score: item.score,
      answer: item.answer || '',
      correctText: item.correctText || item.sentence,
      translation: item.translation || '',
    })),
    average: currentReview.sessionScores.length
      ? Math.round(currentReview.sessionScores.reduce((sum, item) => sum + item.score, 0) / currentReview.sessionScores.length)
      : 0,
    wrongWords: currentReview.deck === 'a2vocab' ? [] : wordBook.slice(0, 10),
  };
  if (currentReview.startTime) {
    summary.duration = Date.now() - currentReview.startTime;
  }

  if (currentReview.type === 'word' && currentReview.deck !== 'a2vocab' && currentReview.startTime && !currentReview.sessionRecorded) {
    currentReview.sessionRecorded = true;
    const sessionId = currentReview.sessionId || `word-${currentReview.startTime}`;
    const alreadyRecorded = wordReviewSessions.some(session => session && session.sessionId === sessionId);
    if (!alreadyRecorded) {
      wordReviewSessions.push({
        sessionId,
        timestamp: new Date().toISOString(),
        duration: summary.duration,
        averageScore: summary.average,
        reviewedCount: currentReview.doneIds.size,
        mode: currentReview.onlyMastered ? 'masteredQuiz' : (currentReview.onlyUnmastered ? 'unmasteredReview' : 'review'),
        deck: currentReview.deck || 'wordbook',
      });
      wordReviewSessions = normalizeWordReviewSessions(wordReviewSessions).slice(-120);
      saveWordReviewSessions();
    }
  }

  // Record review time (sentence review only, not word review)
  if (!currentReview.type && currentReview.startTime && !currentReview.sessionRecorded) {
    currentReview.sessionRecorded = true;
    const article = findArticle(currentReview.articleId);
    if (article) {
      const duration = summary.duration;
      article.reviewSessions = article.reviewSessions || [];
      const sessionId = currentReview.sessionId || `${currentReview.articleId}-${currentReview.startTime}`;
      const alreadyRecorded = article.reviewSessions.some(session => session && session.sessionId === sessionId);
      if (!alreadyRecorded) {
        article.reviewSessions.push({
          sessionId,
          timestamp: new Date().toISOString(),
          duration,
          averageScore: summary.average,
          reviewedCount: currentReview.doneIds.size,
        });
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
  const returnLabel = currentReview.returnPage === 'a2vocab' ? 'A2词汇' : (currentReview.returnPage === 'wordbook' ? '错题本' : '首页');
  showFeedback(`本次复习已完成，查看下方总结或点击“关闭”回到${returnLabel}。`, 'success');
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
  const incorrectItems = summary.scores.filter(item => item.score < 90);
  const isWordReview = summary.type === 'word';
  const isA2Review = summary.deck === 'a2vocab';
  const lines = summary.scores.map(item => `
    <div>
      <strong>【${item.score}%】</strong> ${escapeHtml(item.sentence)}
    </div>
  `).join('');
  const mistakeHtml = incorrectItems.length
    ? `<div class="review-summary-block">
        <h4>${isWordReview ? '本次错词结果' : '本次错误总结'}</h4>
        ${incorrectItems.map(item => `
          <div class="review-sentence-compare">
            <div class="review-sentence-row review-sentence-original">
              <div class="review-sentence-label">正确文本</div>
              <div class="review-sentence-text">${escapeHtml(item.correctText)}</div>
            </div>
            <div class="review-sentence-row review-sentence-user">
              <div class="review-sentence-label">你的输入</div>
              <div class="review-sentence-text">${escapeHtml(item.answer || '（未填写）')}</div>
            </div>
            ${item.translation ? `
              <div class="review-sentence-row review-sentence-translation">
                <div class="review-sentence-label">中文翻译</div>
                <div class="review-sentence-text">${escapeHtml(item.translation)}</div>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>`
    : '<div class="review-summary-note">本次没有低于 90 分的句子或词语。</div>';
  const wordBookHtml = isA2Review
    ? ''
    : summary.wrongWords.length
    ? `<div class="review-word-book"><h4>近期错词</h4>${summary.wrongWords.slice(0, 5).map(item => `<div>${escapeHtml(item.word)} (${item.count})</div>`).join('')}</div>`
    : '<div class="empty-state">暂无错词。</div>';

  const durationText = summary.duration ? `本次用时：${formatDuration(summary.duration)}` : '';
  elements.reviewSummary.innerHTML = `
    <div class="review-summary-header">
      <h3>${summary.isPartial ? '本轮复习总结' : (isA2Review ? 'A2动词复习完成' : (isWordReview ? '错词复习完成' : '复习完成'))}</h3>
      <div class="review-summary-score">平均得分：${summary.average}%</div>
    </div>
    <div class="review-summary-body">
      ${durationText ? `<div class="review-summary-duration">${durationText}</div>` : ''}
      <div class="review-summary-note">本次已复习 ${summary.completedCount} / ${summary.total} 项，低分项 ${incorrectItems.length} 项。</div>
      <div class="review-summary-list">${lines}</div>
      ${mistakeHtml}
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
        ${sentence.translation ? `
          <div class="review-sentence-row review-sentence-translation">
            <div class="review-sentence-label">中文翻译</div>
            <div class="review-sentence-text">${escapeHtml(sentence.translation)}</div>
          </div>
        ` : ''}
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
  return tokenizeWords(text).join(' ');
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
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (hours > 0) {
    const minutesAfterHour = Math.floor((seconds % 3600) / 60);
    return minutesAfterHour > 0 ? `${hours}小时${minutesAfterHour}分` : `${hours}小时`;
  }
  if (minutes > 0) {
    return remainder > 0 ? `${minutes}分${remainder}秒` : `${minutes}分`;
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
  const reviewSessions = getArticleReviewSessions(article);
  const todayKey = getLocalDateKey(new Date());
  const todayMs = reviewSessions
    .filter(session => getLocalDateKey(new Date(session.timestamp)) === todayKey)
    .reduce((sum, session) => sum + toNumber(session.duration, 0), 0);
  const attempts = sentences.reduce((sum, sentence) => sum + ((sentence.history || []).length), 0);
  const correctAttempts = sentences.reduce((sum, sentence) => {
    return sum + (sentence.history || []).filter(item => toNumber(item.score, 0) >= 90).length;
  }, 0);
  const accuracy = attempts ? Math.round((correctAttempts / attempts) * 100) : 0;
  const sessionDurations = reviewSessions.map(session => toNumber(session.duration, 0)).filter(duration => duration > 0);
  const avgTimeMs = sessionDurations.length
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
    : reviewTimes.length
      ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length)
      : 0;

  return {
    sentenceCount: sentences.length,
    sessionCount: Math.max(reviewTimes.length, reviewSessions.length),
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

  const listStats = articles.map(article => ({ article, stats: getArticleListStats(article) }));
  const totalSentences = listStats.reduce((sum, item) => sum + item.stats.sentenceCount, 0);
  const totalTodayMs = listStats.reduce((sum, item) => sum + item.stats.todayMs, 0);
  const avgMastery = listStats.length
    ? Math.round(listStats.reduce((sum, item) => sum + item.stats.mastery, 0) / listStats.length)
    : 0;

  const summary = document.createElement('div');
  summary.className = 'article-list-hero';
  summary.innerHTML = `
    <div>
      <div class="article-list-kicker">Blue Study Library</div>
      <h3>今日文章库</h3>
      <p>把听写文章、熟练度和复习节奏集中在一个更清爽的蓝色工作台里。</p>
    </div>
    <div class="article-list-metrics">
      <div><strong>${articles.length}</strong><span>文章</span></div>
      <div><strong>${totalSentences}</strong><span>句子</span></div>
      <div><strong>${avgMastery}%</strong><span>平均熟练度</span></div>
      <div><strong>${formatDuration(totalTodayMs)}</strong><span>今日用时</span></div>
    </div>
  `;
  elements.articles.appendChild(summary);

  listStats.forEach(({ article, stats }, index) => {
    const card = document.createElement('div');
    card.className = 'article-card';
    card.style.setProperty('--mastery', `${Math.max(0, Math.min(100, stats.mastery))}%`);
    card.style.setProperty('--card-delay', `${Math.min(index * 40, 280)}ms`);

    const titleWrap = document.createElement('div');
    titleWrap.className = 'article-card-main';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'article-card-eyebrow';
    eyebrow.textContent = article.source || '来源未知';

    const title = document.createElement('h3');
    title.textContent = article.title;

    const meta = document.createElement('div');
    meta.className = 'article-card-meta';
    meta.textContent = `${stats.sentenceCount} 个句子 · ${stats.sessionCount} 轮复习 · 最近平均 ${formatDuration(stats.avgTimeMs)}`;

    const tags = document.createElement('div');
    tags.className = 'article-card-tags';
    const tagList = article.tags && article.tags.length ? article.tags : ['未标记'];
    tagList.slice(0, 4).forEach(tag => {
      const chip = document.createElement('span');
      chip.textContent = tag;
      tags.appendChild(chip);
    });

    const statLine = document.createElement('div');
    statLine.className = 'article-card-stats';
    [
      ['今天', formatDuration(stats.todayMs)],
      ['正确率', `${stats.accuracy}%`],
      ['熟练度', `${stats.mastery}%`],
    ].forEach(([label, value]) => {
      const item = document.createElement('span');
      item.innerHTML = `<small>${label}</small><strong>${value}</strong>`;
      statLine.appendChild(item);
    });

    titleWrap.appendChild(eyebrow);
    titleWrap.appendChild(title);
    titleWrap.appendChild(meta);
    titleWrap.appendChild(tags);
    titleWrap.appendChild(statLine);

    const mastery = document.createElement('div');
    mastery.className = 'article-card-mastery';
    mastery.innerHTML = `<strong>${stats.mastery}%</strong><span>Mastery</span>`;

    const actions = document.createElement('div');
    actions.className = 'article-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-small';
    editBtn.textContent = '编辑';
    editBtn.addEventListener('click', () => openArticleDetail(article.id));

    const reviewBtn = document.createElement('button');
    reviewBtn.className = 'btn btn-primary article-review-button';
    reviewBtn.textContent = '复习';
    reviewBtn.addEventListener('click', () => startReview(article.id));

    const weakestBtn = document.createElement('button');
    weakestBtn.className = 'btn btn-secondary btn-small article-smart-review-button';
    weakestBtn.textContent = '最弱 5 句';
    weakestBtn.title = '复习当前文章里熟练度最低的最多 5 个未满分句子';
    weakestBtn.addEventListener('click', () => startReview(article.id, null, { mode: 'weakest' }));

    const unmasteredBtn = document.createElement('button');
    unmasteredBtn.className = 'btn btn-secondary btn-small article-smart-review-button';
    unmasteredBtn.textContent = '跳过满分';
    unmasteredBtn.title = '复习未达到 100% 熟练度的句子';
    unmasteredBtn.addEventListener('click', () => startReview(article.id, null, { mode: 'unmastered' }));

    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn-secondary btn-small article-play-button';
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
    loopBtn.className = 'btn btn-secondary btn-small article-loop-button';
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
    delBtn.className = 'btn btn-danger btn-small';
    delBtn.textContent = '删除';
    delBtn.addEventListener('click', async () => {
      if (!confirm(`确定删除文章 “${article.title}” 吗？此操作不能撤销。`)) return;
      await deleteArticle(article.id);
      renderArticleList();
    });

    actions.appendChild(reviewBtn);
    actions.appendChild(weakestBtn);
    actions.appendChild(unmasteredBtn);
    actions.appendChild(editBtn);
    actions.appendChild(playBtn);
    actions.appendChild(loopBtn);
    actions.appendChild(delBtn);

    card.appendChild(titleWrap);
    card.appendChild(mastery);
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
  (article.sentences || []).forEach((s, index) => {
    const node = tmpl.content ? tmpl.content.cloneNode(true) : tmpl.cloneNode(true);
    const row = node.querySelector ? node.querySelector('.sentence-row') : node.querySelector('.sentence-row');
    row.dataset.index = String(index + 1).padStart(2, '0');
    row.style.setProperty('--sentence-mastery', `${Math.max(0, Math.min(100, Math.round(s.masteryScore || 0)))}%`);
    row.querySelector('.sentence-text').textContent = s.text || '';
    row.querySelector('.sentence-translation').textContent = s.translation || '';
    const metaLine = row.querySelector('.sentence-meta-line');
    metaLine.innerHTML = `
      <span>难度 ${escapeHtml(s.difficulty || '未设置')}</span>
      <span>复习 ${s.reviewCount || 0} 次</span>
      <span>熟练度 ${Math.round(s.masteryScore || 0)}%</span>
      <span>${s.audioId ? '有音频' : '无音频'}</span>
    `;

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
