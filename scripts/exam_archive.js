/* Official historical exam practice. Catalogs and banks load only on demand. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = $('examArchivePanel');
  if (!root) return;
  const cache = new Map();
  let manifest, papers = [], filterVersion = 0, startVersion = 0;
  let round = null, timer = null, previousFocus = null, previousOverflow = '';
  let listPage = 0;
  const PAGE_SIZE = 12;
  const progressKey = 'twPoliceHistoricalPracticeV1';
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const subjectKey = text => String(text).split(/[（(]/)[0].replace(/\s/g, '');
  const format = n => Number(n || 0).toLocaleString('zh-TW');
  const status = text => { $('examArchiveStatus').textContent = text; };
  const sourceLink = (text, url, className = 'exam-source-link') => {
    const el = node('a', text, className);
    const target = new URL(url, manifest ? manifest.sourceUrl : 'https://wwwq.moex.gov.tw/exam/');
    if (target.protocol === 'https:' && target.hostname === 'wwwq.moex.gov.tw') el.href = target.href;
    el.target = '_blank'; el.rel = 'noopener noreferrer';
    return el;
  };
  function loadJSON(file) {
    if (!cache.has(file)) {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      let timeout;
      const deadline = new Promise((_, reject) => {
        timeout = setTimeout(() => { controller?.abort(); reject(new Error('題庫載入逾時')); }, 6000);
      });
      const response = fetch('data/exams/' + file, controller ? {signal: controller.signal} : undefined).then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
      const request = Promise.race([response, deadline])
        .catch(err => { cache.delete(file); throw err; }).finally(() => clearTimeout(timeout));
      cache.set(file, request);
    }
    return cache.get(file);
  }
  function fillSelect(el, items, allLabel) {
    const previous = el.value;
    el.replaceChildren(new Option(allLabel, ''));
    for (const item of items) el.add(new Option(item.label || item, item.value || item));
    if ([...el.options].some(x => x.value === previous)) el.value = previous;
  }
  function setBusy(busy) {
    $('examArchiveBody').setAttribute('aria-busy', String(busy));
    $('examMixBtn').disabled = busy;
    $('examWrongBtn').disabled = busy;
  }
  function readProgress() {
    try { return JSON.parse(localStorage.getItem(progressKey) || '{}'); }
    catch (_) { return {}; }
  }
  function saveProgress(item, correct) {
    try {
      const progress = readProgress();
      progress[item.paper.id + ':' + item.row[0]] = {correct, at: Date.now()};
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch (_) { /* Practice remains usable if storage is unavailable. */ }
  }
  async function openArchive() {
    $('examArchiveBody').hidden = false;
    $('examArchiveOpenBtn').textContent = '重新載入題庫';
    $('examArchiveOpenBtn').disabled = true;
    setBusy(true); status('正在載入年份目錄…');
    try {
      manifest = await loadJSON('manifest.json');
      if (!Array.isArray(manifest.years) || !manifest.years.length) throw new Error('缺少年份資料');
      const years = manifest.years.filter(y => y.paperCount > 0);
      const first = !papers.length && !$('examYearFilter').options.length;
      fillSelect($('examYearFilter'), years.map(y => ({value: String(y.year), label: '民國 ' + y.year + ' 年（' + (y.year + 1911) + '）'})), '全部年份混合');
      if (first) $('examYearFilter').value = String(years[0].year);
      $('examArchiveCoverage').textContent = '民國 ' + years[years.length - 1].year + '–' + years[0].year + ' 年 · ' + format(manifest.paperCount) + ' 份原卷 · ' + format(manifest.questionCount) + ' 題可作答';
      $('examArchiveDeclaration').textContent = '資料來源：' + manifest.source + '。' + manifest.declaration;
      await updateYear();
    } catch (err) {
      status('題庫載入失敗，請按「重新載入題庫」重試。');
      $('examMixBtn').disabled = true; $('examWrongBtn').disabled = true;
      $('examArchiveCoverage').textContent = '可先使用考選部官方試卷查詢。';
    } finally { $('examArchiveOpenBtn').disabled = false; }
  }
  async function updateYear() {
    if (!manifest) return;
    const version = ++filterVersion;
    ++startVersion;
    setBusy(true); status('正在載入試卷清單…');
    const selected = $('examYearFilter').value;
    const years = manifest.years.filter(y => y.paperCount > 0 && (!selected || String(y.year) === selected));
    try {
      const chunks = [];
      // Three small year catalogs at a time; question banks are still deferred.
      for (let i = 0; i < years.length; i += 3) {
        const batch = await Promise.all(years.slice(i, i + 3).map(y => loadJSON(y.catalogFile)));
        if (version !== filterVersion) return;
        chunks.push(...batch);
      }
      papers = chunks.flatMap(c => c.papers);
      fillSelect($('examCategoryFilter'), [...new Set(papers.map(p => p.category))].sort(), '全部類科');
      fillSelect($('examSubjectFilter'), [...new Set(papers.map(p => subjectKey(p.subject)))].sort(), '全部科目');
      setBusy(false); renderList();
    } catch (_) {
      if (version !== filterVersion) return;
      status('這個年份載入失敗，請重新選擇年份或重試。');
      $('examArchiveBody').setAttribute('aria-busy', 'false');
    }
  }
  function filteredPapers() {
    const track = $('examTrackFilter').value, grade = $('examGradeFilter').value;
    const category = $('examCategoryFilter').value, subject = $('examSubjectFilter').value;
    return papers.filter(p => (!track || p.track === track) && (!grade || p.grade === grade) && (!category || p.category === category) && (!subject || subjectKey(p.subject) === subject));
  }
  function paperTitle(p) { return p.year + ' 年 · ' + p.category.replace(/_/g, '｜'); }
  function renderList(reset = true) {
    if (reset) listPage = 0;
    const filtered = filteredPapers();
    const playable = filtered.filter(p => p.questionCount > 0);
    $('examMixBtn').disabled = !playable.length;
    const progress = readProgress();
    const wrong = Object.values(progress).filter(p => !p.correct).length;
    $('examWrongBtn').textContent = '錯題複習' + (wrong ? '（' + wrong + '）' : '');
    $('examWrongBtn').disabled = !wrong || !playable.length;
    status(format(filtered.length) + ' 份試卷，其中 ' + format(playable.length) + ' 份含可作答題目。混合練習每輪最多 20 題。');
    $('examPaperList').replaceChildren();
    const visible = filtered.slice(listPage * PAGE_SIZE, (listPage + 1) * PAGE_SIZE);
    for (const paper of visible) {
      const card = node('article', undefined, 'exam-paper-card');
      card.append(node('p', paperTitle(paper), 'exam-paper-meta'), node('h4', paper.subject));
      card.append(node('p', paper.questionCount ? '可作答 ' + paper.questionCount + (paper.officialAnswerCount ? ' / ' + paper.officialAnswerCount : '') + ' 題' + (paper.correctionUrl ? ' · 已核對更正答案' : '') : '原卷查閱（含申論、圖表或無法自動核對的題目）', 'muted'));
      const actions = node('div', undefined, 'exam-paper-actions');
      if (paper.questionCount) {
        const play = node('button', '練這份試卷', 'secondary-btn');
        play.type = 'button'; play.dataset.examPaper = paper.id;
        play.onclick = () => startRound([paper], false, true);
        actions.append(play);
      }
      actions.append(sourceLink('完整試題 PDF ↗', paper.questionUrl));
      if (paper.answerUrl) actions.append(sourceLink('官方答案 ↗', paper.answerUrl));
      if (paper.correctionUrl) actions.append(sourceLink('更正答案 ↗', paper.correctionUrl));
      card.append(actions); $('examPaperList').append(card);
    }
    if (!visible.length) $('examPaperList').append(node('p', '這組條件沒有試卷，試試其他年份或科目。', 'muted'));
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    $('examListPage').textContent = (listPage + 1) + ' / ' + pages;
    $('examListPrev').disabled = listPage === 0;
    $('examListNext').disabled = listPage + 1 >= pages;
  }
  function shuffle(items) {
    const output = [...items];
    for (let i = output.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
  }
  // The game shares the archive cache, but requests a small shuffled round only
  // after the player starts a quiz. No catalogs or banks load at game startup.
  let gameQueue = [], gameYears = [], gameLoading = null;
  async function refillGameQuestions() {
    manifest = await loadJSON('manifest.json');
    if (!gameYears.length) {
      gameYears = shuffle(manifest.years.filter(y => y.questionCount === undefined || y.questionCount > 0));
    }
    if (!gameYears.length) throw new Error('沒有可作答年份');
    const attempts = Math.min(3, gameYears.length);
    for (let attempt = 0; attempt < attempts; attempt++) {
      const year = gameYears.shift();
      try {
        const catalog = await loadJSON(year.catalogFile);
        // Shared exam papers may occur in several categories. Prefer the
        // administrative police citation and count each original question once.
        const relevant = catalog.papers.filter(p => p.questionCount > 0 &&
          !/消防|水上|海巡/.test(p.subject) &&
          /警察|憲法|法學|法律|行政法|刑法|刑事|犯罪|偵查/.test(subjectKey(p.subject)))
          .sort((a, b) => Number(/行政警察/.test(b.category)) - Number(/行政警察/.test(a.category)));
        if (!relevant.length) continue;
        const data = await loadJSON(year.bankFile);
        const seen = new Set(), items = [];
        for (const paper of relevant) {
          for (const row of data.banks[paper.bank] || []) {
            const key = paper.year + ':' + paper.bank + ':' + row[0];
            if (seen.has(key)) continue;
            seen.add(key); items.push({paper, row});
          }
        }
        if (items.length) { gameQueue = shuffle(items).slice(0, 24); return; }
      } catch (err) { throw err; /* The next game request retries with another year. */ }
    }
    throw new Error('歷屆題庫暫時無法載入');
  }
  window.policeHistoricalQuestions = Object.freeze({
    async next() {
      while (!gameQueue.length) {
        if (!gameLoading) gameLoading = refillGameQuestions().finally(() => { gameLoading = null; });
        await gameLoading;
      }
      const item = gameQueue.pop(), {paper, row} = item;
      const title = '民國 ' + paper.year + ' 年｜' + subjectKey(paper.subject) + '｜原題 ' + row[0];
      const note = (row[5] ? '官方更正：' + row[5] + '。' : '') +
        '依當年度官方答案判定；歷屆法規可能修正，原卷未提供詳解。';
      return [row[1], row[2], row[3][0], title, note,
        paper.correctionUrl || paper.answerUrl, '考選部' + (paper.correctionUrl ? '更正答案' : '標準答案'), null,
        {historical: true, accepted: row[3], item, declaration: manifest.declaration}];
    },
    record(question, correct) {
      const item = question[8]?.item;
      if (item) {
        saveProgress(item, correct);
        if (papers.length && $('examArchiveBody').getAttribute('aria-busy') !== 'true') renderList(false);
      }
    }
  });
  async function startRound(selected, wrongOnly = false, wholePaper = false) {
    const version = ++startVersion;
    const filterAtStart = filterVersion;
    let eligible = selected.filter(p => p.questionCount > 0);
    if (!eligible.length) return;
    const progress = readProgress();
    if (wrongOnly) eligible = eligible.filter(p => Object.keys(progress).some(k => k.startsWith(p.id + ':') && !progress[k].correct));
    if (!eligible.length) { status('這組篩選條件下沒有錯題。'); return; }
    // All-year practice samples up to three years per round to limit downloads.
    const candidateYears = shuffle([...new Set(eligible.map(p => p.year))]);
    const selectedYears = wholePaper ? candidateYears : candidateYears.slice(0, 3);
    eligible = eligible.filter(p => selectedYears.includes(p.year));
    setBusy(true); status('正在載入 ' + selectedYears.join('、') + ' 年題目…');
    try {
      const bankFiles = await Promise.all(selectedYears.map(y => {
        const info = manifest.years.find(x => x.year === y);
        return loadJSON(info.bankFile);
      }));
      if (version !== startVersion || filterAtStart !== filterVersion) return;
      const byYear = new Map(bankFiles.map(b => [b.year, b.banks]));
      const pool = [], seen = new Set();
      for (const paper of eligible) {
        const bank = byYear.get(paper.year)[paper.bank] || [];
        for (const row of bank) {
          const key = paper.year + ':' + paper.bank + ':' + row[0];
          if (seen.has(key)) continue;
          if (wrongOnly && !Object.keys(progress).some(k => k === paper.id + ':' + row[0] && !progress[k].correct)) continue;
          seen.add(key); pool.push({paper, row});
        }
      }
      const items = wholePaper ? pool.sort((a, b) => a.row[0] - b.row[0]) : shuffle(pool).slice(0, 20);
      if (!items.length) { status('目前沒有可作答題目，請查閱完整原卷。'); return; }
      closeQuiz();
      round = {items, index: 0, answers: [], complete: false, title: wrongOnly ? '歷屆錯題複習' : wholePaper ? '歷屆原卷練習' : '歷屆混合練習'};
      previousFocus = document.activeElement; previousOverflow = document.body.style.overflow;
      $('examQuizResult').replaceChildren(); $('examQuizResult').className = 'feedback';
      const dialog = $('examQuizDialog');
      if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
      showQuestion();
      status('題目已就緒。本輪年份：' + selectedYears.join('、') + '。');
    } catch (_) {
      if (version === startVersion) status('題目載入失敗，請再按一次練習；原卷連結仍可使用。');
    } finally {
      if (version === startVersion && filterAtStart === filterVersion) { setBusy(false); renderList(false); }
    }
  }
  function clearTimer() { if (timer) clearTimeout(timer); timer = null; }
  function closeQuiz() {
    clearTimer();
    const dialog = $('examQuizDialog');
    if (dialog.open) {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
      document.body.style.overflow = previousOverflow;
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      else $('examArchiveOpenBtn').focus();
    }
    round = null;
  }
  function showQuestion() {
    clearTimer();
    const item = round.items[round.index], [number, question, choices] = item.row;
    $('examQuizTitle').textContent = round.title;
    $('examQuizProgress').textContent = '第 ' + (round.index + 1) + ' / ' + round.items.length + ' 題';
    $('examQuizMeta').textContent = paperTitle(item.paper) + ' · ' + item.paper.subject + ' · 原卷第 ' + number + ' 題';
    $('examQuizQuestion').textContent = question;
    $('examQuizChoices').replaceChildren();
    choices.forEach((text, index) => {
      const button = node('button', String.fromCharCode(65 + index) + '. ' + text, 'exam-answer-btn');
      button.type = 'button'; button.dataset.examAnswer = String(index);
      button.onclick = () => answer(index); $('examQuizChoices').append(button);
    });
    $('examQuizSources').replaceChildren(sourceLink('原卷第 ' + item.row[4] + ' 頁 ↗', item.paper.questionUrl + '#page=' + item.row[4]), sourceLink(item.paper.correctionUrl ? '官方更正答案 ↗' : '官方答案 ↗', item.paper.correctionUrl || item.paper.answerUrl));
    $('examQuizNextBtn').hidden = true;
    $('examQuizStatus').textContent = '選一個答案，查看官方判定。';
    $('examQuizQuestion').focus();
    $('examQuizDialog').querySelector('.topic-quiz-body').scrollTop = 0;
  }
  function answer(index) {
    if (!round || round.complete || round.answers[round.index] !== undefined) return;
    const item = round.items[round.index], choices = item.row[2], accepted = item.row[3];
    const correct = accepted.includes(index);
    round.answers[round.index] = correct;
    for (const button of $('examQuizChoices').querySelectorAll('button')) {
      const i = Number(button.dataset.examAnswer); button.disabled = true;
      if (accepted.includes(i)) button.classList.add('is-correct');
      else if (i === index) button.classList.add('is-wrong');
    }
    const box = $('examQuizResult'); box.replaceChildren();
    box.className = 'feedback show ' + (correct ? 'success' : 'error');
    box.append(node('strong', (correct ? '答對了' : '這題答錯了') + ' · 原卷第 ' + item.row[0] + ' 題'));
    box.append(node('p', '你的答案：' + String.fromCharCode(65 + index) + '. ' + choices[index]));
    box.append(node('p', '官方答案：' + accepted.map(i => String.fromCharCode(65 + i) + '. ' + choices[i]).join('／')));
    if (item.row[5]) box.append(node('p', '更正說明：' + item.row[5]));
    box.append(node('p', '本題依考選部公布的當年度標準答案判定；官方原卷未提供詳解。', 'muted'));
    box.append(sourceLink(item.paper.correctionUrl ? '查核官方更正答案 ↗' : '查核官方答案 ↗', item.paper.correctionUrl || item.paper.answerUrl));
    saveProgress(item, correct);
    // Preserve the existing game's learning counters without advancing time.
    if (typeof s !== 'undefined') {
      s.quizTotal = (s.quizTotal || 0) + 1;
      if (correct) { s.quizCorrect = (s.quizCorrect || 0) + 1; s.knowledge = (s.knowledge || 0) + 3; }
      if ($('quizChip')) $('quizChip').textContent = '測驗 ' + s.quizCorrect + '/' + s.quizTotal;
      if ($('knowledgeChip')) $('knowledgeChip').textContent = '知識 ' + s.knowledge;
    }
    $('examQuizNextBtn').hidden = false;
    $('examQuizNextBtn').textContent = round.index + 1 === round.items.length ? '查看本輪成績' : '下一題';
    $('examQuizStatus').textContent = correct ? '已答對，可繼續下一題。' : '已加入錯題複習。';
    if ($('examAutoNext').checked) scheduleNext();
  }
  function scheduleNext() {
    clearTimer();
    if (round && round.answers[round.index] !== undefined && !round.complete) {
      $('examQuizStatus').textContent += ' 2 秒後自動繼續。';
      timer = setTimeout(next, 2000);
    }
  }
  function next() {
    clearTimer();
    if (!round) return;
    if (round.complete) { closeQuiz(); renderList(false); return; }
    if (round.answers[round.index] === undefined) return;
    if (round.index + 1 < round.items.length) { round.index++; showQuestion(); return; }
    round.complete = true;
    const correct = round.answers.filter(Boolean).length;
    $('examQuizProgress').textContent = '本輪完成';
    $('examQuizQuestion').textContent = '答對 ' + correct + ' / ' + round.items.length + ' 題';
    $('examQuizMeta').textContent = '答錯的題目可從「錯題複習」再練習。';
    $('examQuizChoices').replaceChildren();
    $('examQuizStatus').textContent = '本輪正確率 ' + Math.round(correct / round.items.length * 100) + '%';
    $('examQuizNextBtn').hidden = false; $('examQuizNextBtn').textContent = '完成，回到題庫';
    $('examQuizQuestion').focus();
  }
  $('examArchiveOpenBtn').onclick = openArchive;
  $('examYearFilter').onchange = updateYear;
  for (const id of ['examTrackFilter', 'examGradeFilter', 'examCategoryFilter', 'examSubjectFilter']) $(id).onchange = () => { ++startVersion; setBusy(false); renderList(); };
  $('examMixBtn').onclick = () => startRound(filteredPapers());
  $('examWrongBtn').onclick = () => startRound(filteredPapers(), true);
  $('examListPrev').onclick = () => { listPage--; renderList(false); };
  $('examListNext').onclick = () => { listPage++; renderList(false); };
  $('examQuizCloseBtn').onclick = closeQuiz;
  $('examQuizNextBtn').onclick = next;
  $('examAutoNext').onchange = () => { clearTimer(); if ($('examAutoNext').checked) scheduleNext(); };
  $('examQuizDialog').addEventListener('cancel', e => { e.preventDefault(); closeQuiz(); });
  $('examQuizDialog').addEventListener('click', e => { if (e.target === $('examQuizDialog')) closeQuiz(); });
})();
