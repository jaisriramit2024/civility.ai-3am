/* ====================================================
   CIVILITY.AI — FULL MODERATION ENGINE (Self-Contained)
   SPA: Home · Text · Image · Video · Reels · Courtroom
   ==================================================== */

// ─── GLOBAL STATE ──────────────────────────────────────────
const STATE = {
  imageMode: 'morph',
  videoScenario: 'civility_hate',
  currentUser: '@demo_user',
  violations: { morph: 0, abuse: 0, deep: 0, audio: 0, safe: 0 },
  users: {},
  cases: [],
  reelsVideoUrl: null,
  comments: [],
};

// ─── TEXT EXAMPLES ──────────────────────────────────────
const TXT_EXAMPLES = {
  abuse: "f**k you! Nobody cares about your useless !d!ot work. k1ll yourself already!!",
  sarcasm: "Bro I swear I'm going to kill the game tonight! Nobody stops me 🔥🔥",
  threat: "I will kill you if you post that photo again. You have been warned. Not joking.",
  awareness: "Every woman deserves safety on streets. This video shows what women face daily. Please share for awareness. #WomenSafety #EndHarassment",
  safe: "I respectfully disagree with your approach here. I think there are better solutions worth exploring."
};

// ─── BYPASS PATTERNS ───────────────────────────────────
const BYPASS_PATTERNS = [
  { p: /f[\*\@\#\$u][c\*][k\*]/gi, w: "fuck" },
  { p: /[!1i][d][!1i][o0][t]/gi, w: "idiot" },
  { p: /[s][t][u0][p][i!1][d]/gi, w: "stupid" },
  { p: /k[i1!]ll/gi, w: "kill" },
  { p: /[h][a@4][t][e3]/gi, w: "hate" },
  { p: /[a][\$s][\$s]/gi, w: "ass" },
  { p: /b[!1i][t\+][c\*][h]/gi, w: "bitch" },
  { p: /sh[!1i][t\+]/gi, w: "shit" },
];

// ─── CONTEXT NLP ENGINE — Supporting Data ───────────────

// Tanglish markers (words that indicate Tamil+English mixed text)
const TANGLISH_MARKERS = [
  'da', 'di', 'pa', 'bro', 'yaar', 'machan', 'dei', 'enna', 'illa',
  'nee', 'un', 'avan', 'aval', 'oru', 'sollu', 'adei', 'epdi', 'inga',
  'ponga', 'kanna', 'thambi', 'akka', 'anna', 'macha', 'yov', 'ayyo',
];

// Tanglish bad words (transliterated Tamil insults)
const TANGLISH_BAD_WORDS = [
  'loosu', 'thevdiya', 'poda', 'pundi', 'otha', 'koothi', 'naaye', 'sootha',
  'mokkai', 'kaluthai', 'paandi', 'pundek', 'mayiru', 'baadu', 'sunni',
  'lavadakku', 'thevidiya', 'kazhudai', 'pottai', 'thayoli',
];

// Tanglish threat phrases
const TANGLISH_THREATS = [
  'uthachu poduven', 'pathukuven', 'vida maaten', 'thookku poduven',
  'adichuduven', 'mudichuduven', 'kaiyai murichuduven',
];

// Tanglish sarcasm markers
const TANGLISH_SARCASM = ['adei', 'aiyo', 'ayyo', 'lol', 'haha', 'dei', 'da'];

// English bad word list
const TOXIC_KW = [
  "useless", "idiot", "trash", "garbage", "hate", "kill", "stupid", "moron",
  "dumb", "worthless", "loser", "worst", "ugly", "pathetic", "disgrace",
  "scum", "die", "crap", "jerk", "fool", "idiot", "imbecile", "dimwit",
  "retard", "asshole", "bastard", "bitch", "shit", "fuck",
];

// Reporting/quoting verbs (signal reported speech)
const REPORTING_VERBS = [
  'called', 'said', 'told', 'named', 'shouted', 'calling', 'saying',
  'labelled', 'described', 'referred', 'accused', 'branded', 'deemed',
  'treated', 'consider', 'calling us', 'call us', 'called us', 'calls',
];

// 2nd person pronouns (signal direct attack)
const SECOND_PERSON = ['you', 'ur', 'u ', 'your', 'yourself', 'nee', 'un ', 'unna'];

// 1st person pronouns (signal self-reference)
const FIRST_PERSON = ['i am', "i'm", 'im ', 'i was', 'i feel', 'myself', 'i\'m such'];

// Awareness keywords
const AWARENESS_KW = [
  "women safety", "women deserve", "harassment", "spread awareness",
  "domestic violence", "safety awareness", "social awareness", "mental health",
  "stop violence", "stand together", "speak up", "break the silence",
  "awareness", "gender violence", "shouldn't call", "should not call",
  "don't call", "we shouldn't", "bullying", "it's hurtful", "is hurtful",
  "wrong to", "it is wrong", "that was wrong", "that's wrong",
];

// Negation words (weaken bad word impact) — use whole-word patterns to avoid false matches
const NEGATION_PATTERNS = [
  /\bdon'?t\b/i, /\bdo not\b/i, /\bshouldn'?t\b/i, /\bshould not\b/i,
  /\bnever\b/i, /\b(?<!\w)not\b(?!\w)/i, /\bno one should\b/i,
  /\bnobody should\b/i, /\bstop\b/i, /\bavoid\b/i, /\bagainst\b/i,
  /\bwrong\b/i,
];

// Threat phrases
const THREAT_PHRASES = [
  "i will kill you", "i'll kill you", "kill yourself", "you should die",
  "i will hurt you", "you are dead", "harm you", "going to hurt",
  "coming for you", "i will find you",
];

// Sarcasm / fun idioms
const SARCASM_FUN = [
  "kill the game", "killing it", "kill the set", "murder the stage",
  "slaying", "absolutely slaying", "kill it tonight", "killing the competition",
  "crushed it", "nailed it", "destroyed it",
];

// Rewrite suggestions
const REWRITES = {
  "f**k you": "I strongly disagree with you and find this disrespectful.",
  "fuck you": "I strongly disagree with you and find this disrespectful.",
  "you are useless": "I don't find this approach effective in this context.",
  "kill yourself": "Please take care of yourself — help is always available.",
  "idiot": "someone whose judgment I disagree with",
  "stupid": "misguided",
  "garbage": "not up to the required standard",
  "trash": "needs significant improvement",
  "hate": "find difficult to accept",
  "worthless": "undervalued",
  "dumb": "unconventional",
};

// ─── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  showView('home');
  refreshDashboard();
});

// ─── VIEW NAVIGATION ───────────────────────────────────
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + id);
  if (el) { el.classList.add('active'); el.scrollTop = 0; window.scrollTo(0, 0); }

  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tabMap = { home: 'ntHome', text: 'ntText', image: 'ntImage', video: 'ntVideo' };
  if (tabMap[id]) document.getElementById(tabMap[id])?.classList.add('active');

  if (id === 'courtroom') renderCourtroom();
  if (id === 'home') refreshDashboard();
  if (id === 'reels') startReelsPlayback();
}

function toggleMobileMenu() {
  document.getElementById('navCenter').classList.toggle('mobile-open');
}

// ─── DASHBOARD ─────────────────────────────────────────
function refreshDashboard() {
  document.getElementById('vl-morph').textContent = STATE.violations.morph;
  document.getElementById('vl-abuse').textContent = STATE.violations.abuse;
  document.getElementById('vl-deep').textContent = STATE.violations.deep;
  document.getElementById('vl-audio').textContent = STATE.violations.audio;
  document.getElementById('vl-safe').textContent = STATE.violations.safe;

  const highRisk = Object.entries(STATE.users).filter(([, u]) => u.count >= 5);
  const riskList = document.getElementById('riskUserList');
  document.getElementById('riskCount').textContent = highRisk.length + ' flagged';

  if (highRisk.length === 0) {
    riskList.innerHTML = '<div class="empty-state">No high-risk users yet</div>';
  } else {
    riskList.innerHTML = highRisk.map(([name, u]) => `
      <div class="risk-user-row">
        <div class="rur-avatar">${name.slice(1, 3).toUpperCase()}</div>
        <div class="rur-info">
          <div class="rur-name">${esc(name)}</div>
          <div class="rur-count">${u.count} violations</div>
        </div>
        <span class="rur-badge ${u.count >= 8 ? 'rb-high' : 'rb-med'}">${u.count >= 8 ? 'HIGH' : 'MED'}</span>
      </div>
    `).join('');
  }

  const actList = document.getElementById('activityList');
  const recent = [...STATE.cases].reverse().slice(0, 6);
  if (recent.length === 0) {
    actList.innerHTML = '<div class="empty-state">No activity yet — start analyzing content</div>';
  } else {
    actList.innerHTML = recent.map(c => `
      <div class="activity-item">
        <div class="ai-dot ${c.decision === 'BLOCKED' ? 'red' : c.decision === 'APPROVED' ? 'green' : 'yellow'}"></div>
        <span class="ai-text">${esc(c.summary)}</span>
        <span class="ai-time">${c.time}</span>
      </div>
    `).join('');
  }
}

// ─── RECORD CASE ───────────────────────────────────────
function recordCase(type, user, decision, summary, detail, content = '') {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  STATE.cases.push({ type, user, decision, summary, detail, content, time: timeStr, id: Date.now() });

  if (!STATE.users[user]) STATE.users[user] = { count: 0, cases: [] };
  if (decision !== 'APPROVED') {
    STATE.users[user].count++;
    STATE.users[user].cases.push(summary);
  }

  if (decision === 'APPROVED') STATE.violations.safe++;
  else if (type === 'text') STATE.violations.abuse++;
  else if (type === 'image') STATE.violations.morph++;
  else if (type === 'video') { STATE.violations.deep++; STATE.violations.audio++; }

  refreshDashboard();
}

// ─── LOADING ───────────────────────────────────────────
function showLoading(steps, title, callback, duration = 2800) {
  const ov = document.getElementById('loadingOverlay');
  const stepsEl = document.getElementById('loadSteps');
  const prog = document.getElementById('loadProgress');
  document.getElementById('loadTitle').textContent = title;

  stepsEl.innerHTML = steps.map((s, i) =>
    `<span class="ls${i === 0 ? ' active' : ''}" id="lss${i}">${s}</span>`).join('');
  prog.style.width = '0%';
  ov.classList.remove('hidden');

  let i = 0;
  const iv = setInterval(() => {
    i++;
    document.querySelectorAll('.ls').forEach(el => el.classList.remove('active'));
    if (i < steps.length) document.getElementById(`lss${i}`)?.classList.add('active');
    prog.style.width = (((i + 1) / steps.length) * 100) + '%';
  }, duration / steps.length);

  setTimeout(() => { clearInterval(iv); ov.classList.add('hidden'); callback(); }, duration);
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function esc(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ═══════════════════════════════════════════════════════
//  TEXT ANALYSER
// ═══════════════════════════════════════════════════════
function loadTxt(type) {
  document.getElementById('textInput').value = TXT_EXAMPLES[type] || '';
  updateTxtCount();
}
function updateTxtCount() {
  const v = document.getElementById('textInput').value;
  document.getElementById('txtCharCount').textContent = v.length + ' / 500';
  if (v.length > 500) document.getElementById('textInput').value = v.slice(0, 500);
}

function runTextAnalysis() {
  const text = document.getElementById('textInput').value.trim();
  if (!text) { toast('⚠️ Please enter some text first'); return; }
  const username = document.getElementById('txtUsername').value.trim() || '@demo_user';

  showLoading(
    ['Reading text', 'Language detection', 'Bypass decode', 'Context role analysis', 'Intent scoring', 'Final verdict'],
    '🧠 Analyzing text content...',
    () => {
      const r = analyzeTextLogic(text);
      renderTextResult(text, r, username);
    }
  );
}

// ═══════════════════════════════════════════════════════
//  CONTEXT NLP ENGINE — analyzeTextLogic()
// ═══════════════════════════════════════════════════════
function analyzeTextLogic(text) {
  const lower = text.toLowerCase();

  // ── STAGE 1: Language Detection ────────────────────
  const tanglishHits = TANGLISH_MARKERS.filter(m => {
    // match as whole word or at word boundaries
    return new RegExp('\\b' + m + '\\b', 'i').test(text);
  });
  const hasTanglish = tanglishHits.length >= 1;

  let languageDetected;
  if (hasTanglish) {
    const engWordCount = text.split(/\s+/).filter(w => /^[a-z]+$/i.test(w)).length;
    languageDetected = engWordCount > tanglishHits.length * 2 ? 'Mixed (Tanglish + English)' : 'Tanglish';
  } else {
    languageDetected = 'English';
  }

  // ── STAGE 2: Bypass Decoding ────────────────────────
  let decoded = lower;
  const bypasses = [];
  BYPASS_PATTERNS.forEach(bp => {
    const m = text.match(bp.p);
    if (m) {
      bypasses.push({ orig: m[0], decoded: bp.w });
      decoded = decoded.replace(bp.p, bp.w);
    }
  });

  // ── STAGE 3: Context Role Analysis ─────────────────
  // Detect all flagged words (English + Tanglish)
  const foundEnglish = TOXIC_KW.filter(k => new RegExp('\\b' + k + '\\b', 'i').test(decoded));
  const foundTanglish = TANGLISH_BAD_WORDS.filter(k => new RegExp('\\b' + k + '\\b', 'i').test(lower));
  const allBadWords = [...new Set([...foundEnglish, ...foundTanglish])];

  // Detect threat phrases (English + Tanglish)
  const isThreat = THREAT_PHRASES.some(p => decoded.includes(p))
    || TANGLISH_THREATS.some(p => lower.includes(p));

  // Fun / sarcasm detection
  const isFun = SARCASM_FUN.some(p => decoded.includes(p))
    || /😂|🤣|😄|😆|lol|lmao|haha|😁/.test(lower);

  const hasTanglishSarcasm = TANGLISH_SARCASM.some(m =>
    new RegExp('\\b' + m + '\\b', 'i').test(lower)
  );

  // Awareness detection
  const awareHits = AWARENESS_KW.filter(k => lower.includes(k));
  const hasNegation = NEGATION_PATTERNS.some(p => p.test(lower));

  // Determine sentence role for each bad word
  let sentenceRole = 'Clean';
  let roleDetails = [];

  if (allBadWords.length > 0 || bypasses.length > 0) {
    const has2ndPerson = SECOND_PERSON.some(p => lower.includes(p));
    const has1stPerson = FIRST_PERSON.some(p => lower.includes(p));
    const hasReportingVerb = REPORTING_VERBS.some(v => lower.includes(v));
    const hasAwarenessContext = awareHits.length >= 1 || hasNegation;
    const hasQuotes = /["']/.test(text);

    // Determine dominant role
    if (isThreat) {
      sentenceRole = 'Direct Threat';
    } else if (has1stPerson && !has2ndPerson && !hasReportingVerb) {
      // Self-reference check first — "I'm such an idiot" must not fall to Awareness
      sentenceRole = 'Self-Reference';
      roleDetails.push('1st-person pronoun + bad word');
    } else if (has2ndPerson && !hasReportingVerb && !hasAwarenessContext) {
      sentenceRole = 'Direct Attack';
      roleDetails.push('2nd-person pronoun + bad word = direct attack');
    } else if (hasReportingVerb || lower.includes("that's wrong") || lower.includes("that was wrong")) {
      sentenceRole = 'Reported Speech';
      roleDetails.push('Reporting verb or correction phrase detected');
    } else if (hasAwarenessContext || hasQuotes) {
      sentenceRole = 'Awareness';
      roleDetails.push('Negation/awareness context with bad word');
    } else {
      sentenceRole = 'Generic Reference';
      roleDetails.push('Bad word used as a noun reference, no direct target');
    }

    // If Tanglish bad word + sarcasm marker → adjust to sarcasm
    if (foundTanglish.length > 0 && hasTanglishSarcasm && !isThreat) {
      sentenceRole = 'Sarcasm/Humor';
    }
  }

  // ── STAGE 4: Tanglish-specific checks ──────────────
  const tanglishThreat = TANGLISH_THREATS.some(p => lower.includes(p));
  const tanglishBadFound = foundTanglish.length > 0;

  // ── STAGE 5: Intent Scoring ─────────────────────────
  let score = 0;

  switch (sentenceRole) {
    case 'Direct Attack':
      score += allBadWords.length * 40;
      break;
    case 'Direct Threat':
      score += 50 + allBadWords.length * 20;
      break;
    case 'Self-Reference':
      score += allBadWords.length * 10;
      break;
    case 'Reported Speech':
      score += Math.max(0, allBadWords.length * 14 - 30);
      break;
    case 'Generic Reference':
      score += allBadWords.length * 15;
      break;
    case 'Awareness':
      score += Math.max(0, allBadWords.length * 14 - 40);
      break;
    case 'Sarcasm/Humor':
      score = Math.min(score, 10);
      break;
    default:
      score += allBadWords.length * 14;
  }

  // Tanglish bad words always score as direct attack weight (they are inherently insults)
  score += foundTanglish.length * 40;

  // Bypass bonus
  score += bypasses.length * 25;

  // Tanglish threat bonus
  if (tanglishThreat) score += 50;

  // Fun cap (unless real threat)
  if (isFun && !isThreat) score = Math.min(score, 10);

  // Clamp
  score = Math.min(score, 98);

  // ── STAGE 6: Decision ──────────────────────────────
  // Intent classification
  let intentClass;
  if (isThreat || tanglishThreat) intentClass = 'Threatening';
  else if (sentenceRole === 'Awareness') intentClass = 'Informational';
  else if (sentenceRole === 'Reported Speech') intentClass = 'Informational';
  else if (sentenceRole === 'Sarcasm/Humor' || isFun) intentClass = 'Sarcastic / Humorous';
  else if (allBadWords.length > 0 || bypasses.length > 0) intentClass = 'Abusive';
  else intentClass = 'Neutral';

  // Awareness override: reported speech or awareness with bad words but no threat
  const isAware = (sentenceRole === 'Awareness' || sentenceRole === 'Reported Speech')
    && !isThreat && !tanglishThreat;

  let decision, label, icon, sealClass, severity;

  if (isAware && score < 30) {
    decision = 'AWARENESS'; label = 'Routed to Help Center'; icon = '📢';
    sealClass = 'seal-awareness'; severity = 'AWARENESS';
  } else if (sentenceRole === 'Self-Reference' && isFun) {
    decision = 'FLAGGED'; label = 'Flagged — Self-Reference + Humor'; icon = '⚠️';
    sealClass = 'seal-flagged'; severity = 'SENSITIVE';
  } else if (isFun && !isThreat && allBadWords.length <= 1 && !tanglishBadFound) {
    decision = 'APPROVED'; label = 'Approved with Note'; icon = '✅';
    sealClass = 'seal-approved'; severity = 'SAFE';
  } else if (score >= 65 || isThreat || tanglishThreat) {
    decision = 'BLOCKED'; label = 'Blocked'; icon = '🚫';
    sealClass = 'seal-blocked'; severity = 'CRITICAL';
  } else if (score >= 35) {
    decision = 'BLOCKED'; label = 'Blocked'; icon = '🚫';
    sealClass = 'seal-blocked'; severity = 'HARMFUL';
  } else if (score >= 12) {
    decision = 'FLAGGED'; label = 'Flagged for Review'; icon = '⚠️';
    sealClass = 'seal-flagged'; severity = 'SENSITIVE';
  } else {
    decision = 'APPROVED'; label = 'Approved'; icon = '✅';
    sealClass = 'seal-approved'; severity = 'SAFE';
  }

  const conf = Math.min(Math.max(score + 15 + Math.round(Math.random() * 8), 68), 99);
  const rewrite = buildRewrite(text, foundEnglish, bypasses);

  // ── Badges ─────────────────────────────────────────
  const badges = [];
  if (isThreat || tanglishThreat) badges.push({ label: 'Threatening Language', cls: 'vbadge-red' });
  if (sentenceRole === 'Direct Attack') badges.push({ label: 'Direct Attack', cls: 'vbadge-red' });
  if (sentenceRole === 'Reported Speech') badges.push({ label: 'Reported Speech', cls: 'vbadge-cyan' });
  if (sentenceRole === 'Awareness') badges.push({ label: 'Awareness Content', cls: 'vbadge-cyan' });
  if (sentenceRole === 'Self-Reference') badges.push({ label: 'Self-Reference', cls: 'vbadge-yellow' });
  if (sentenceRole === 'Generic Reference') badges.push({ label: 'Generic Reference', cls: 'vbadge-yellow' });
  if (sentenceRole === 'Sarcasm/Humor' || isFun) badges.push({ label: 'Sarcasm / Fun Context', cls: 'vbadge-green' });
  if (bypasses.length > 0) badges.push({ label: 'Bypass Attempt Decoded', cls: 'vbadge-yellow' });
  if (tanglishBadFound) badges.push({ label: 'Tanglish Insult Detected', cls: 'vbadge-lav' });
  if (languageDetected.includes('Tanglish')) badges.push({ label: 'Tanglish Language', cls: 'vbadge-lav' });
  if (decision === 'APPROVED' && badges.length === 0) badges.push({ label: 'Clean Content', cls: 'vbadge-green' });

  // ── Analysis Report ─────────────────────────────────
  const wordsInContext = allBadWords.length > 0
    ? allBadWords.map(w => `"${w}" → ${sentenceRole}`).join(', ')
    : 'None';

  const report = [
    { e: '📊', key: 'Input Length', val: `${text.length} characters` },
    { e: '🌐', key: 'Language Detected', val: languageDetected },
    { e: '🔍', key: 'Bypass Patterns', val: bypasses.length > 0 ? bypasses.map(b => `"${b.orig}" → "${b.decoded}"`).join(', ') : 'None detected', cls: bypasses.length > 0 ? 'ar-block' : 'ar-pass' },
    { e: '🚨', key: 'Abusive Keywords', val: foundEnglish.length > 0 ? foundEnglish.slice(0, 5).join(', ') : 'None found', cls: foundEnglish.length > 0 ? 'ar-block' : 'ar-pass' },
    { e: '🗣️', key: 'Tanglish Bad Words', val: tanglishBadFound ? foundTanglish.join(', ') : 'None found', cls: tanglishBadFound ? 'ar-block' : 'ar-pass' },
    { e: '🎭', key: 'Sentence Role', val: sentenceRole + (roleDetails.length > 0 ? ` — ${roleDetails[0]}` : '') },
    { e: '🧩', key: 'Words in Context', val: wordsInContext, cls: sentenceRole === 'Direct Attack' || sentenceRole === 'Direct Threat' ? 'ar-block' : 'ar-val' },
    { e: '🧠', key: 'Intent Classification', val: intentClass, cls: intentClass === 'Threatening' || intentClass === 'Abusive' ? 'ar-block' : intentClass === 'Informational' || intentClass === 'Neutral' ? 'ar-pass' : 'ar-warn' },
    { e: '⚔️', key: 'Direct Threat', val: (isThreat || tanglishThreat) ? 'YES — Threatening phrase detected' : 'No', cls: (isThreat || tanglishThreat) ? 'ar-block' : 'ar-pass' },
    { e: '😄', key: 'Sarcasm / Humor', val: isFun ? 'Detected (fun context)' : 'Not detected', cls: isFun ? 'ar-pass' : '' },
    { e: '📈', key: 'Toxicity Score', val: `${score} / 100` },
    { e: '🎯', key: 'Confidence', val: conf + '%' },
    { e: '⚡', key: 'Decision', val: label, cls: decision === 'BLOCKED' ? 'ar-block' : decision === 'APPROVED' ? 'ar-pass' : 'ar-warn' },
  ];

  if (isFun && !isThreat) {
    report.push({ e: '💡', key: 'Note', val: '"Kill the game" and similar phrases are classified as fun/sarcastic expressions — not genuine threats.' });
  }
  if (isAware) {
    report.push({ e: '🏥', key: 'Auto-Disclaimer', val: '"⚠️ This content contains sensitive language used for awareness purposes only."' });
  }
  if (sentenceRole === 'Self-Reference' && isFun) {
    report.push({ e: '💡', key: 'Note', val: 'Self-directed humor detected — flagged for mild review, not blocked.' });
  }

  return {
    decision, label, icon, sealClass, severity, conf, badges, report, rewrite,
    found: foundEnglish, bypasses, languageDetected, sentenceRole, intentClass,
  };
}

function buildRewrite(text, found, bypasses) {
  const lower = text.toLowerCase();
  for (const [k, v] of Object.entries(REWRITES)) {
    if (lower.includes(k.toLowerCase())) return v;
  }
  if (found.length > 0 || bypasses.length > 0) {
    const replacements = {
      "useless": "not currently effective", "idiot": "someone I respectfully disagree with",
      "stupid": "a bit misguided", "garbage": "needs significant improvement",
      "trash": "not up to standard", "moron": "someone with a different perspective",
      "hate": "find difficult to accept", "loser": "someone who hasn't succeeded yet",
      "worthless": "undervalued", "dumb": "unconventional", "worst": "not ideal",
      "pathetic": "disappointing", "kill": "stop", "die": "take a break",
      "scum": "someone I disagree with", "disgrace": "a disappointment",
      "fool": "someone I disagree with", "jerk": "someone acting unkindly",
      "crap": "not good enough", "ugly": "not appealing to me",
    };
    let rw = text;
    found.forEach(k => {
      if (replacements[k]) rw = rw.replace(new RegExp(`\\b${k}\\b`, 'gi'), replacements[k]);
    });
    return rw !== text ? rw : null;
  }
  return null;
}

function renderTextResult(text, r, username) {
  document.getElementById('txtPlaceholder').classList.add('hidden');
  document.getElementById('txtResults').classList.remove('hidden');

  const seal = document.getElementById('txtSeal');
  seal.className = 'status-seal ' + r.sealClass;
  document.getElementById('txtSealIcon').textContent = r.icon;
  document.getElementById('txtSealLabel').textContent = r.label;
  document.getElementById('txtSealSev').textContent = 'Severity: ' + r.severity;
  document.getElementById('txtSealConf').textContent = 'Confidence: ' + r.conf + '%';
  document.getElementById('txtBadges').innerHTML = r.badges.map(b =>
    `<span class="vbadge ${b.cls}">${esc(b.label)}</span>`).join('');

  document.getElementById('txtReport').innerHTML = r.report.map(line => `
    <div class="ar-line">
      <span class="ar-emoji">${line.e}</span>
      <span class="ar-text">
        <span class="ar-key">${esc(line.key)}: </span>
        <span class="${line.cls || 'ar-val'}">${esc(line.val)}</span>
      </span>
    </div>
  `).join('');

  const rwBox = document.getElementById('txtRewrite');
  if (r.rewrite && r.decision !== 'APPROVED') {
    rwBox.innerHTML = `
      <div><div class="rw-label">❌ Original</div><div class="rw-original">${esc(text.slice(0, 200))}</div></div>
      <div style="text-align:center;font-size:1.2rem;color:var(--lav-main)">↓</div>
      <div><div class="rw-label">✅ Suggested Civil Rewrite</div><div class="rw-suggested">${esc(r.rewrite)}</div></div>
      <button class="copy-rw-btn" onclick="copyRw('${r.rewrite.replace(/'/g, "\\'")}')">📋 Copy Rewrite</button>
    `;
  } else if (r.decision === 'APPROVED') {
    rwBox.innerHTML = `<div class="rw-empty">✅ No rewrite needed — content looks civil and respectful.</div>`;
  } else {
    rwBox.innerHTML = `<div class="rw-empty">No specific rewrite available — please rephrase the message entirely.</div>`;
  }

  recordCase('text', username, r.decision,
    `Text ${r.decision}: "${text.slice(0, 50)}..."`,
    r.report.map(x => x.key + ': ' + x.val).join(' | '), text);

  toast(`${r.icon} ${r.label}`);
}

function copyRw(text) {
  navigator.clipboard?.writeText(text).then(() => toast('📋 Copied to clipboard!'));
}

// ═══════════════════════════════════════════════════════
//  IMAGE ANALYSER — Full Module
// ═══════════════════════════════════════════════════════
const IA_API = 'http://localhost:8000';
let iaFile = null;

function iaFormatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function iaHandleDrop(ev) {
  ev.preventDefault();
  document.getElementById('iaUploadZone').classList.remove('ia-drag-active');
  const f = ev.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) iaSetFile(f);
}

function iaHandleFile(ev) {
  const f = ev.target.files[0]; if (!f) return;
  iaSetFile(f);
}

function iaSetFile(f) {
  iaFile = f;
  STATE.imageFile = f;
  // Show preview
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('iaPreviewImg').src = e.target.result;
    document.getElementById('iaFileName').textContent = f.name;
    document.getElementById('iaFileSize').textContent = iaFormatSize(f.size);
    document.getElementById('iaPreview').classList.remove('hidden');
    document.getElementById('iaAnalyzeWrap').classList.remove('hidden');
    document.getElementById('iaResults').classList.add('hidden');
    document.getElementById('iaError').classList.add('hidden');
    // Update upload zone text
    document.getElementById('iaUploadTitle').textContent = 'Image ready for analysis';
    document.getElementById('iaUploadSubtitle').textContent = 'Click or drag a new image to replace';
  };
  reader.readAsDataURL(f);
}

function iaClearImage() {
  iaFile = null;
  STATE.imageFile = null;
  document.getElementById('iaPreview').classList.add('hidden');
  document.getElementById('iaAnalyzeWrap').classList.add('hidden');
  document.getElementById('iaResults').classList.add('hidden');
  document.getElementById('iaError').classList.add('hidden');
  document.getElementById('iaFileInput').value = '';
  document.getElementById('iaUploadTitle').textContent = 'Drag & drop an image to analyze';
  document.getElementById('iaUploadSubtitle').innerHTML = 'or <span class="ia-browse-link">browse files</span> from your device';
}

async function iaRunAnalysis() {
  if (!iaFile) return;

  // Show loading state
  const btn = document.getElementById('iaAnalyzeBtn');
  btn.classList.add('ia-loading');
  btn.disabled = true;
  document.getElementById('iaAnalyzeBtnText').innerHTML = '<span class="ia-spinner"></span> Analyzing...';
  document.getElementById('iaError').classList.add('hidden');
  document.getElementById('iaResults').classList.add('hidden');

  try {
    // Check backend
    let backendAlive = false;
    try {
      const hRes = await fetch(IA_API + '/api/health', { signal: AbortSignal.timeout(2000) });
      backendAlive = hRes.ok;
    } catch {}

    if (!backendAlive) {
      iaShowError('Backend server offline. Please start it with: python -m uvicorn main:app --port 8000');
      iaResetBtn();
      return;
    }

    // Send to backend
    const formData = new FormData();
    formData.append('file', iaFile);

    const res = await fetch(IA_API + '/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    iaResetBtn();
    iaRenderResults(data);

  } catch (err) {
    iaResetBtn();
    iaShowError(err.message || 'Analysis failed');
  }
}

function iaResetBtn() {
  const btn = document.getElementById('iaAnalyzeBtn');
  btn.classList.remove('ia-loading');
  btn.disabled = false;
  document.getElementById('iaAnalyzeBtnText').innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg> Analyze Image`;
}

function iaShowError(msg) {
  document.getElementById('iaErrorText').textContent = msg;
  document.getElementById('iaError').classList.remove('hidden');
}

function iaGetScoreLevel(s) {
  if (s >= 0.6) return 'high';
  if (s >= 0.35) return 'medium';
  return 'low';
}

function iaRenderResults(data) {
  const v = data.verdict || {};
  const m = data.modules || {};
  const classification = v.classification || 'Unknown';
  const confidence = v.confidence ? (v.confidence * 100).toFixed(1) : '0';
  const riskLevel = v.risk_level || 'Unknown';
  const scores = v.individual_scores || {};

  // Show results
  document.getElementById('iaResults').classList.remove('hidden');

  // ── Verdict Card ──────────────────────────────
  const verdictEl = document.getElementById('iaVerdict');
  const verdictMap = {
    'Real': { emoji: '✅', cls: 'ia-real' },
    'AI Generated': { emoji: '🤖', cls: 'ia-ai' },
    'Possibly AI Generated': { emoji: '🤔', cls: 'ia-ai' },
    'Manipulated': { emoji: '⚠️', cls: 'ia-manipulated' },
    'Possibly Manipulated': { emoji: '🔍', cls: 'ia-manipulated' },
    '⚠️ UNSAFE CONTENT DETECTED': { emoji: '🚨', cls: 'ia-unsafe' },
  };
  const vData = verdictMap[classification] || { emoji: '❓', cls: 'ia-real' };
  verdictEl.className = 'ia-verdict ' + vData.cls;
  document.getElementById('iaVerdictIcon').textContent = vData.emoji;
  document.getElementById('iaVerdictLabel').textContent = classification;
  document.getElementById('iaConfVal').textContent = confidence + '%';

  // Risk badge
  const riskBadge = document.getElementById('iaRiskBadge');
  riskBadge.className = 'ia-risk-badge ia-risk-' + riskLevel.toLowerCase();
  document.getElementById('iaRiskText').textContent = riskLevel + ' Risk';

  // Analysis time
  document.getElementById('iaAnalysisTime').textContent =
    `Analyzed in ${data.analysis_time_seconds}s · Combined Score: ${(v.combined_score * 100).toFixed(1)}%`;

  // ── Score Grid ────────────────────────────────
  const scoreCards = [
    { title: 'AI Detection', score: scores.ai_detection || 0, icon: '🧠', desc: 'Likelihood of AI generation' },
    { title: 'Tampering', score: scores.tampering_detection || 0, icon: '🔬', desc: 'Signs of image manipulation' },
    { title: 'Metadata', score: scores.metadata_analysis || 0, icon: '📋', desc: 'Metadata suspicion level' },
    { title: 'Hash Analysis', score: scores.hash_matching || 0, icon: '#️⃣', desc: 'Hash pattern analysis' },
    { title: 'Content Safety', score: scores.content_moderation || 0, icon: '🛡️', desc: 'Nudity, violence, gore detection' },
  ];

  document.getElementById('iaScoreGrid').innerHTML = scoreCards.map(c => {
    const level = iaGetScoreLevel(c.score);
    const pct = (c.score * 100).toFixed(1);
    return `
      <div class="ia-score-card ia-score-${level}">
        <div class="ia-score-hdr">
          <span class="ia-score-title">${c.icon} ${c.title}</span>
          <span class="ia-score-pct">${pct}%</span>
        </div>
        <div class="ia-score-desc">${c.desc}</div>
        <div class="ia-sbar-bg"><div class="ia-sbar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');

  // ── Detail Panels ─────────────────────────────
  let panelsHTML = '';

  // AI Detection Details
  if (m.ai_detection?.details) {
    panelsHTML += iaDetailPanel('AI Detection Analysis', '🧠', true,
      Object.entries(m.ai_detection.details).map(([k, d]) =>
        `<div class="ia-drow"><span class="ia-dlabel">${d.description || k}</span><span class="ia-dval">${(d.score * 100).toFixed(1)}% (w: ${(d.weight * 100).toFixed(0)}%)</span></div>`
      ).join('')
    );
  }

  // Tampering Details
  if (m.tampering_detection?.details) {
    panelsHTML += iaDetailPanel('Tampering Detection', '🔬', false,
      Object.entries(m.tampering_detection.details).map(([k, d]) =>
        `<div class="ia-drow"><span class="ia-dlabel">${d.description || k}</span><span class="ia-dval">${(d.score * 100).toFixed(1)}% (w: ${(d.weight * 100).toFixed(0)}%)</span></div>`
      ).join('')
    );
  }

  // Metadata Panel
  if (m.metadata_analysis) {
    const meta = m.metadata_analysis;
    let metaBody = `
      <div class="ia-drow"><span class="ia-dlabel">EXIF Data Present</span><span class="ia-dval">${meta.exif_present ? 'Yes' : 'No'}</span></div>`;
    if (meta.details) {
      metaBody += `
        <div class="ia-drow"><span class="ia-dlabel">Camera Info</span><span class="ia-dval">${meta.details.has_camera_info ? '✅ Found' : '❌ Missing'}</span></div>
        <div class="ia-drow"><span class="ia-dlabel">GPS Data</span><span class="ia-dval">${meta.details.has_gps ? '✅ Found' : '❌ Missing'}</span></div>
        <div class="ia-drow"><span class="ia-dlabel">Software</span><span class="ia-dval">${meta.details.software_detected || 'None'}</span></div>
        <div class="ia-drow"><span class="ia-dlabel">AI Signature</span><span class="ia-dval">${meta.details.ai_signature_found ? '🚨 Detected!' : '✅ None'}</span></div>`;
    }
    if (meta.flags?.length > 0) {
      metaBody += `<ul class="ia-flags">${meta.flags.map(f => `<li>🚩 ${f}</li>`).join('')}</ul>`;
    }
    panelsHTML += iaDetailPanel('Metadata Analysis', '📋', true, metaBody);
  }

  // Hash Matching Panel
  if (m.hash_matching) {
    let hashBody = '';
    if (m.hash_matching.hashes) {
      hashBody += `<div class="ia-hash-grid">${Object.entries(m.hash_matching.hashes).map(([k, v]) =>
        `<div class="ia-hash-item"><div class="ia-hash-label">${k}</div><div class="ia-hash-val">${v}</div></div>`
      ).join('')}</div>`;
    }
    if (m.hash_matching.analysis) {
      const a = m.hash_matching.analysis;
      hashBody += `
        <div class="ia-drow" style="margin-top:0.75rem"><span class="ia-dlabel">pHash Bit Ratio</span><span class="ia-dval">${a.phash_bit_ratio}</span></div>
        <div class="ia-drow"><span class="ia-dlabel">dHash Bit Ratio</span><span class="ia-dval">${a.dhash_bit_ratio}</span></div>
        <div class="ia-drow"><span class="ia-dlabel">Bit Balance</span><span class="ia-dval">${a.bit_balance}</span></div>`;
    }
    panelsHTML += iaDetailPanel('Perceptual Hash Analysis', '#️⃣', false, hashBody);
  }

  // Content Moderation Panel
  if (m.content_moderation) {
    const cm = m.content_moderation;
    let cmBody = `
      <div class="ia-drow"><span class="ia-dlabel">Safety Status</span><span class="ia-dval">${cm.is_safe ? '✅ Safe' : '⚠️ Potentially Unsafe'}</span></div>
      <div class="ia-drow"><span class="ia-dlabel">Content Classification</span><span class="ia-dval">${cm.classification || 'Unknown'}</span></div>`;
    if (cm.details) {
      cmBody += Object.entries(cm.details).map(([k, d]) =>
        `<div class="ia-drow"><span class="ia-dlabel">${d.description || k}</span><span class="ia-dval">${(d.score * 100).toFixed(1)}% (w: ${(d.weight * 100).toFixed(0)}%)</span></div>`
      ).join('');
    }
    if (cm.is_safe === false) {
      cmBody += `<div class="ia-unsafe-banner"><div class="ia-unsafe-title">⚠️ UNSAFE CONTENT DETECTED</div><div class="ia-unsafe-desc">This image may contain nudity, violence, gore, or other abusive content.${cm.classification ? ` Classification: ${cm.classification}` : ''}</div></div>`;
    }
    panelsHTML += iaDetailPanel('Content Safety Detection', '🛡️', true, cmBody);
  }

  document.getElementById('iaDetailPanels').innerHTML = panelsHTML;

  // ── ELA Heatmap ───────────────────────────────
  const heatmap = m.tampering_detection?.ela_heatmap;
  const hmEl = document.getElementById('iaHeatmap');
  if (heatmap) {
    document.getElementById('iaHeatmapImg').src = 'data:image/png;base64,' + heatmap;
    hmEl.classList.remove('hidden');
  } else {
    hmEl.classList.add('hidden');
  }

  // Record in courtroom
  const decision = classification.includes('Real') ? 'APPROVED' : 'FLAGGED';
  recordCase('image', STATE.currentUser, decision,
    `Image ${decision}: ${classification} (${confidence}%)`,
    `AI: ${((scores.ai_detection||0)*100).toFixed(0)}%, Tampering: ${((scores.tampering_detection||0)*100).toFixed(0)}%, Meta: ${((scores.metadata_analysis||0)*100).toFixed(0)}%`);

  // Toast
  toast(`${vData.emoji} ${classification} — ${confidence}% confidence (${data.analysis_time_seconds}s)`);

  // Scroll to results
  document.getElementById('iaResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function iaDetailPanel(title, icon, defaultOpen, bodyHTML) {
  const id = title.toLowerCase().replace(/\s+/g, '-');
  return `
    <div class="ia-detail-panel" id="ia-panel-${id}">
      <div class="ia-detail-hdr" onclick="iaTogglePanel('ia-panel-${id}')">
        <h3>${icon} ${title}</h3>
        <span class="ia-toggle ${defaultOpen ? 'ia-open' : ''}">▼</span>
      </div>
      <div class="ia-detail-body" style="${defaultOpen ? '' : 'display:none'}">${bodyHTML}</div>
    </div>`;
}

function iaTogglePanel(id) {
  const panel = document.getElementById(id);
  const body = panel.querySelector('.ia-detail-body');
  const toggle = panel.querySelector('.ia-toggle');
  if (body.style.display === 'none') {
    body.style.display = '';
    toggle.classList.add('ia-open');
  } else {
    body.style.display = 'none';
    toggle.classList.remove('ia-open');
  }
}

// ═══════════════════════════════════════════════════════
//  VIDEO ANALYSER
// ═══════════════════════════════════════════════════════
function setScenario(s, btn) {
  STATE.videoScenario = s;
  document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function handleVidDrop(ev) {
  ev.preventDefault();
  document.getElementById('vidUploadZone').classList.remove('drag-over');
  const f = ev.dataTransfer.files[0];
  if (f && f.type.startsWith('video/')) processVidFile(f);
}

function handleVidFile(ev) {
  const f = ev.target.files[0]; if (!f) return;
  processVidFile(f);
}

function processVidFile(f) {
  const url = URL.createObjectURL(f);
  const player = document.getElementById('vidPreviewPlayer');
  player.src = url;
  document.getElementById('vidPreviewInfo').textContent = `${f.name} • ${(f.size / 1024 / 1024).toFixed(2)} MB`;
  document.getElementById('vidUploadZone').classList.add('hidden');
  document.getElementById('vidPreview').classList.remove('hidden');
  document.getElementById('vidAnalyzeBtn').classList.remove('hidden');
  STATE.reelsVideoUrl = url;
}

function runVideoAnalysis() {
  document.getElementById('vidPlaceholder').classList.add('hidden');
  document.getElementById('vidResults').classList.add('hidden');
  document.getElementById('escalationBanner').classList.add('hidden');
  document.getElementById('goReelsBtn').classList.add('hidden');

  const loadSteps = {
    civility_hate: ['Loading video', 'Frame scan', 'Audio extraction', 'NLP hate-speech model', 'Civility classification', 'Final scoring'],
    abuse_violence: ['Loading video', 'Frame extraction', 'Violence detection', 'Weapon identification', 'Injury scoring', 'Classification'],
    nudity_sexual: ['Loading video', 'Frame sampling', 'Nudity detection', 'Context analysis', 'Age estimation', 'Final scoring'],
    deepfake_clone: ['Loading video', 'Frame extraction', 'Deepfake analysis', 'Voice clone detection', 'Fusion scoring', 'Escalation check'],
    safe_clean: ['Loading video', 'Frame scan', 'Audio check', 'Content classification', 'Safety verification', 'Approval'],
  };

  const steps = loadSteps[STATE.videoScenario] || loadSteps.safe_clean;
  showLoading(steps, '🧠 Analyzing video content...', () => {
    const result = buildVideoResult(STATE.videoScenario);
    renderVideoResult(result);
  }, 3600);
}

const VIDEO_SCENARIOS = {
  civility_hate: {
    icon: '🚫', sealClass: 'seal-blocked', severity: 'CRITICAL', conf: 91,
    label: 'Blocked — Hate Speech Detected',
    decision: 'BLOCKED',
    badges: [{ label: 'Hate Speech', cls: 'vbadge-red' }, { label: 'Racial Slurs', cls: 'vbadge-red' }, { label: 'Incitement', cls: 'vbadge-yellow' }],
    escalate: false,
    visualLines: [
      { e: '🎬', key: 'Frame Analysis', val: '480 keyframes extracted by FFmpeg — scanned by XceptionNet' },
      { e: '👤', key: 'Face Authenticity', val: 'Live authentic speaker — no deepfake artifacts', cls: 'ar-pass' },
      { e: '✊', key: 'Gesture Analysis', val: 'Aggressive pointing gestures at 1:02 (borderline threatening)', cls: 'ar-block' },
      { e: '🏷️', key: 'Text Overlays', val: 'No embedded hate imagery detected', cls: 'ar-pass' },
      { e: '📊', key: 'Risk Score', val: '84 / 100 — audio-primary violation' },
    ],
    audioLines: [
      { e: '🎙️', key: 'Whisper Transcript', val: 'Transcript complete — 23 flagged segments' },
      { e: '🚨', key: 'Hate Speech', val: 'Racial slurs at 0:08, 0:34, 1:02 — targeting ethnic identity', cls: 'ar-block' },
      { e: '💬', key: 'Coded Language', val: '"Replacement" conspiracy tropes detected at 1:47, 2:15', cls: 'ar-block' },
      { e: '🎭', key: 'Tone Analysis', val: 'Aggressive / Inciting — elevated decibel spikes' },
      { e: '❌', key: 'Audio Verdict', val: 'BLOCKED — Hate speech in audio track', cls: 'ar-block' },
    ]
  },
  abuse_violence: {
    icon: '🚫', sealClass: 'seal-blocked', severity: 'CRITICAL', conf: 88,
    label: 'Blocked — Physical Violence Detected',
    decision: 'BLOCKED',
    badges: [{ label: 'Physical Violence [REAL]', cls: 'vbadge-red' }, { label: 'Weapon Detected', cls: 'vbadge-red' }],
    escalate: false,
    visualLines: [
      { e: '🎬', key: 'Frame Analysis', val: '312 keyframes — violence spans frames 89–247' },
      { e: '⚔️', key: 'Violence Detection', val: 'Physical assault confirmed at 4 timestamps: 0:12, 0:45, 1:18, 1:55', cls: 'ar-block' },
      { e: '🔫', key: 'Weapon Detected', val: 'Blunt object (pipe-like) visible at 0:45 — [WEAPON_DETECTED]', cls: 'ar-block' },
      { e: '🩸', key: 'Injury Indicators', val: 'Visible victim injury — probable real harm', cls: 'ar-block' },
      { e: '🎬', key: 'Cinematic Check', val: 'No production markers — assessed as [REAL]', cls: 'ar-block' },
    ],
    audioLines: [
      { e: '🎙️', key: 'Whisper Transcript', val: 'Shouting, impact sounds, victim vocalisations' },
      { e: '🔊', key: 'Sound Events', val: 'Impact sounds at 0:45, 1:18, 1:55 — consistent with physical strikes', cls: 'ar-block' },
      { e: '😱', key: 'Distress Audio', val: 'Victim distress vocalisation — non-acted pattern confirmed', cls: 'ar-block' },
      { e: '❌', key: 'Audio Verdict', val: 'BLOCKED — Violence audio confirmed', cls: 'ar-block' },
    ]
  },
  nudity_sexual: {
    icon: '⚠️', sealClass: 'seal-flagged', severity: 'RESTRICTED', conf: 83,
    label: 'Flagged — Adult Content Restricted',
    decision: 'FLAGGED',
    badges: [{ label: 'Adult Content', cls: 'vbadge-yellow' }, { label: 'Age Gate Required', cls: 'vbadge-yellow' }, { label: 'Human Review', cls: 'vbadge-lav' }],
    escalate: false,
    visualLines: [
      { e: '🎬', key: 'Frame Analysis', val: '290 keyframes — nudity flagged in 4 segments' },
      { e: '🔞', key: 'Nudity Detection', val: 'Partial nudity (sexual context) at 0:22, 0:58, 1:34, 2:10', cls: 'ar-block' },
      { e: '👤', key: 'Age Estimation', val: 'All subjects estimated 22–35 yrs — adults confirmed', cls: 'ar-pass' },
      { e: '🎭', key: 'Context', val: 'Adult entertainment context — no CSAM indicators', cls: 'ar-pass' },
      { e: '⚠️', key: 'Visual Verdict', val: 'RESTRICTED — Requires human review and age gate', cls: 'ar-warn' },
    ],
    audioLines: [
      { e: '🎙️', key: 'Whisper Transcript', val: 'Minimal speech — background music dominant' },
      { e: '🎵', key: 'Audio Content', val: 'No hate speech, threats, or profanity detected', cls: 'ar-pass' },
      { e: '✅', key: 'Audio Verdict', val: 'Audio clear — no violations', cls: 'ar-pass' },
    ]
  },
  deepfake_clone: {
    icon: '🚨', sealClass: 'seal-blocked', severity: 'ESCALATED', conf: 97,
    label: 'Escalated — Deepfake + Voice Clone',
    decision: 'BLOCKED',
    badges: [{ label: 'Deepfake Video', cls: 'vbadge-lav' }, { label: 'Voice Clone', cls: 'vbadge-red' }, { label: 'ESCALATED', cls: 'vbadge-red' }],
    escalate: true,
    escalateMsg: 'Credible deepfake impersonating named public figure — potential defamation and synthetic threat content. Auto-reported to Trust & Safety team.',
    visualLines: [
      { e: '🎬', key: 'Frame Analysis', val: '560 frames — deepfake artefacts in 89% of face region' },
      { e: '👄', key: 'Micro-expressions', val: 'Temporal inconsistencies at eye, temple, jawline boundaries', cls: 'ar-block' },
      { e: '✂️', key: 'Blending Artefacts', val: 'Hairline and ear boundary artefacts at 6 sample points', cls: 'ar-block' },
      { e: '🧠', key: 'Model Match', val: 'DeepFaceLab v3.0 + EfficientNet B4 signature confirmed', cls: 'ar-block' },
      { e: '🆔', key: 'Identity Match', val: 'Public figure face: 97.2% similarity — impersonation', cls: 'ar-block' },
    ],
    audioLines: [
      { e: '🤖', key: 'Voice Clone Detection', val: 'GAN-synthesized speech — Tacotron-2 signature matched', cls: 'ar-block' },
      { e: '🎙️', key: 'Speaker Matching', val: '94% speaker similarity to public figure — impersonation confirmed', cls: 'ar-block' },
      { e: '⚠️', key: 'Threat Content', val: 'Synthesized voice delivers threatening statements at 1:22, 2:45', cls: 'ar-block' },
      { e: '❌', key: 'Audio Verdict', val: 'ESCALATED — Synthetic voice + threat content', cls: 'ar-block' },
    ]
  },
  safe_clean: {
    icon: '✅', sealClass: 'seal-approved', severity: 'SAFE', conf: 99,
    label: 'Approved — Safe to Publish',
    decision: 'APPROVED',
    badges: [{ label: 'Clean Content', cls: 'vbadge-green' }, { label: 'Approved', cls: 'vbadge-green' }],
    escalate: false,
    visualLines: [
      { e: '🎬', key: 'Frame Analysis', val: '312 keyframes — all clear' },
      { e: '👤', key: 'Face Authenticity', val: 'Authentic — no manipulation artefacts', cls: 'ar-pass' },
      { e: '🔬', key: 'Deepfake Score', val: '2 / 100 — well within safe threshold', cls: 'ar-pass' },
      { e: '🎭', key: 'Content Type', val: 'General entertainment / lifestyle content' },
      { e: '✅', key: 'Visual Verdict', val: 'Video is authentic and safe to publish', cls: 'ar-pass' },
    ],
    audioLines: [
      { e: '🎙️', key: 'Whisper Transcript', val: 'No profanity or threatening language detected', cls: 'ar-pass' },
      { e: '🎵', key: 'Tone', val: 'Positive / Entertaining', cls: 'ar-pass' },
      { e: '🤖', key: 'Voice Synthesis', val: 'Natural human speech — not synthesized', cls: 'ar-pass' },
      { e: '✅', key: 'Audio Verdict', val: 'Audio fully passes all safety checks', cls: 'ar-pass' },
    ]
  }
};

function buildVideoResult(scenario) { return VIDEO_SCENARIOS[scenario] || VIDEO_SCENARIOS.safe_clean; }

function renderVideoResult(r) {
  document.getElementById('vidResults').classList.remove('hidden');

  const seal = document.getElementById('vidSeal');
  seal.className = 'status-seal ' + r.sealClass;
  document.getElementById('vidSealIcon').textContent = r.icon;
  document.getElementById('vidSealLabel').textContent = r.label;
  document.getElementById('vidSealSev').textContent = 'Severity: ' + r.severity;
  document.getElementById('vidSealConf').textContent = 'Confidence: ' + r.conf + '%';
  document.getElementById('vidBadges').innerHTML = r.badges.map(b =>
    `<span class="vbadge ${b.cls}">${esc(b.label)}</span>`).join('');

  document.getElementById('vidReport').innerHTML = r.visualLines.map(line => `
    <div class="ar-line">
      <span class="ar-emoji">${line.e}</span>
      <span class="ar-text">
        <span class="ar-key">${esc(line.key)}: </span>
        <span class="${line.cls || 'ar-val'}">${esc(line.val)}</span>
      </span>
    </div>
  `).join('');

  document.getElementById('audioReport').innerHTML = r.audioLines.map(line => `
    <div class="ar-line">
      <span class="ar-emoji">${line.e}</span>
      <span class="ar-text">
        <span class="ar-key">${esc(line.key)}: </span>
        <span class="${line.cls || 'ar-val'}">${esc(line.val)}</span>
      </span>
    </div>
  `).join('');

  if (r.escalate) {
    document.getElementById('escalationBanner').classList.remove('hidden');
    document.getElementById('escalationMsg').textContent = r.escalateMsg;
  }

  if (r.decision === 'APPROVED') {
    document.getElementById('goReelsBtn').classList.remove('hidden');
  }

  recordCase('video', STATE.currentUser, r.decision,
    `Video ${r.decision}: ${r.label}`,
    [...r.visualLines, ...r.audioLines].map(x => x.key + ': ' + x.val).join(' | '));
  toast(`${r.icon} ${r.label}`);
}

function goToReels() {
  showView('reels');
}

function startReelsPlayback() {
  const vid = document.getElementById('reelsVideo');
  if (STATE.reelsVideoUrl) {
    vid.src = STATE.reelsVideoUrl;
    vid.play();
    document.getElementById('reelsUsernameDisplay').textContent = STATE.currentUser;
    const initials = STATE.currentUser.slice(1, 3).toUpperCase();
    document.getElementById('reelsAvatarText').textContent = initials;
    document.getElementById('commentAvatarChip').textContent = initials;
    document.getElementById('commentUserChip').textContent = STATE.currentUser;

    if (STATE.videoScenario === 'safe_clean') {
      const disc = document.getElementById('reelsDisclaimer');
      disc.textContent = '⚠️ This video contains sensitive topics discussed for awareness purposes only.';
      disc.classList.remove('hidden');
    }
  } else {
    const disc = document.getElementById('reelsDisclaimer');
    disc.textContent = 'ℹ️ Upload and approve a video first to preview it here';
    disc.classList.remove('hidden');
  }
  renderComments();
}

// ─── REELS INTERACTIONS ─────────────────────────────────
function toggleReelLike(btn) {
  const span = btn.querySelector('span:first-child');
  const countEl = document.getElementById('likeCount');
  if (span.textContent === '🤍') {
    span.textContent = '❤️';
    countEl.textContent = '1.2k+1';
    btn.style.transform = 'scale(1.2)';
    setTimeout(() => btn.style.transform = '', 300);
  } else {
    span.textContent = '🤍';
    countEl.textContent = '1.2k';
  }
}

function openComments() {
  document.getElementById('commentsPanel').classList.toggle('open');
}

function shareReel() { toast('↗️ Share link copied to clipboard!'); }
function saveReel() {
  const icon = document.getElementById('saveIcon');
  icon.textContent = icon.textContent === '🔖' ? '🏷️' : '🔖';
  toast(icon.textContent === '🏷️' ? '🔖 Saved to collection!' : '🔖 Removed from saved');
}

// ─── COMMENTS ───────────────────────────────────────────
const DEMO_COMMENTS = [
  { user: '@sarah_k', text: 'This is amazing! Great content 🙌', blocked: false },
  { user: '@mike_p', text: 'Loved watching this. Very inspiring!', blocked: false },
];

function renderComments() {
  const list = document.getElementById('commentsList');
  const allComments = [...DEMO_COMMENTS, ...STATE.comments];
  document.getElementById('commCount').textContent = allComments.filter(c => !c.blocked).length;
  document.getElementById('commCountBig').textContent = allComments.filter(c => !c.blocked).length;

  if (allComments.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-soft);font-size:0.82rem">No comments yet. Be the first!</div>';
    return;
  }

  list.innerHTML = allComments.map(c => `
    <div class="comment-bubble">
      <div class="cb-avatar">${c.user.slice(1, 3).toUpperCase()}</div>
      <div class="cb-body">
        <div class="cb-user">${esc(c.user)}</div>
        ${c.blocked
      ? `<div class="cb-blocked">🚫 This comment was blocked by Civility.AI — violates community guidelines</div>`
      : `<div class="cb-text">${esc(c.text)}</div>`
    }
      </div>
    </div>
  `).join('');
}

function previewCommentAnalysis(text) {
  const hint = document.getElementById('commentAnalysisHint');
  if (!text.trim()) { hint.textContent = ''; return; }
  // Use context engine for comment preview too
  const r = analyzeTextLogic(text);
  if (r.decision === 'BLOCKED') {
    hint.innerHTML = '<span style="color:var(--red)">⚠️ Civility.AI: This comment may be blocked before posting.</span>';
  } else {
    hint.innerHTML = '<span style="color:var(--green)">✅ Civility.AI: Comment looks good to post.</span>';
  }
}

function postComment() {
  const input = document.getElementById('commentInput');
  const text = input.value.trim(); if (!text) return;
  // Use context engine for comment moderation too
  const r = analyzeTextLogic(text);
  const blocked = r.decision === 'BLOCKED';

  STATE.comments.push({ user: STATE.currentUser, text, blocked });
  input.value = '';
  document.getElementById('commentAnalysisHint').textContent = '';
  renderComments();

  if (blocked) {
    toast('🚫 Comment blocked by Civility.AI');
    recordCase('text', STATE.currentUser, 'BLOCKED', `Comment blocked: "${text.slice(0, 40)}..."`, 'Toxic/threatening content in comment');
  } else {
    toast('✅ Comment posted successfully!');
  }
}

// ═══════════════════════════════════════════════════════
//  COURTROOM
// ═══════════════════════════════════════════════════════
let _courtFilter = 'all';

function filterCourt(filter, btn) {
  _courtFilter = filter;
  document.querySelectorAll('.court-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderCourtroom();
}

function renderCourtroom() {
  const cases = STATE.cases;
  const blocked = cases.filter(c => c.decision === 'BLOCKED').length;
  const flagged = cases.filter(c => c.decision === 'FLAGGED' || c.decision === 'AWARENESS').length;
  const approved = cases.filter(c => c.decision === 'APPROVED').length;

  document.getElementById('cs-total').textContent = cases.length;
  document.getElementById('cs-blocked').textContent = blocked;
  document.getElementById('cs-flagged').textContent = flagged;
  document.getElementById('cs-approved').textContent = approved;

  let filtered = cases;
  if (_courtFilter !== 'all') {
    if (_courtFilter === 'FLAGGED') {
      filtered = cases.filter(c => c.decision === 'FLAGGED' || c.decision === 'AWARENESS');
    } else {
      filtered = cases.filter(c => c.decision === _courtFilter);
    }
  }

  const container = document.getElementById('courtCases');
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-court">
        <div class="ec-icon">⚖️</div>
        <p>${cases.length === 0 ? 'No cases yet. Start analyzing content to see the courtroom record.' : 'No cases match this filter.'}</p>
      </div>`;
    return;
  }

  container.innerHTML = [...filtered].reverse().map(c => {
    const badgeCls = c.decision === 'BLOCKED' ? 'cc-blocked' : c.decision === 'APPROVED' ? 'cc-approved' : 'cc-flagged';
    const typeIcon = c.type === 'text' ? '📝' : c.type === 'image' ? '🖼️' : '🎥';
    return `
      <div class="court-case-card">
        <div class="cc-top">
          <span class="cc-badge ${badgeCls}">${c.decision}</span>
          <span class="cc-type">${typeIcon} ${c.type.toUpperCase()} ANALYSIS</span>
          <span class="cc-user">${esc(c.user)}</span>
          <span class="cc-time">${c.time}</span>
        </div>
        <div class="cc-summary">${esc(c.summary)}</div>
        <div class="cc-detail" id="det-${c.id}" style="display:none">${esc(c.detail)}</div>
        <button class="cc-expand" onclick="toggleDetail(${c.id}, this)">+ Show Full Analysis</button>
      </div>
    `;
  }).join('');
}

function toggleDetail(id, btn) {
  const det = document.getElementById('det-' + id);
  const showing = det.style.display !== 'none';
  det.style.display = showing ? 'none' : 'block';
  btn.textContent = showing ? '+ Show Full Analysis' : '− Hide Analysis';
}