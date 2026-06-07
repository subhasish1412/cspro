/* ═══════════════════════════════════════════
   CS EVALUATOR — app.js
   AI-powered Customer Success assessment
════════════════════════════════════════════ */

// ─── API KEY MANAGEMENT ─────────────────────
let ANTHROPIC_API_KEY = '';

function saveApiKey() {
  const input = document.getElementById('api-key-input').value.trim();
  const errEl = document.getElementById('api-error');
  const errMsg = document.getElementById('api-error-msg');

  if (!input.startsWith('sk-ant-')) {
    errEl.style.display = 'flex';
    errMsg.textContent = 'Please enter a valid Anthropic API key (starts with sk-ant-)';
    return;
  }

  ANTHROPIC_API_KEY = input;
  sessionStorage.setItem('cs_eval_key', input);
  document.getElementById('api-modal').classList.add('hidden');
}

// Auto-restore key from session
window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('cs_eval_key');
  if (saved) {
    ANTHROPIC_API_KEY = saved;
    document.getElementById('api-modal').classList.add('hidden');
  }

  // Allow Enter key in API input
  document.getElementById('api-key-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveApiKey();
  });
});

// ─── QUESTIONS DATA ────────────────────────
const SECTION_COLORS = {
  'Account health & churn risk':  '#4a8cff',
  'Escalation handling':          '#e05252',
  'Data analysis & reporting':    '#4caf82',
  'Renewal & upsell strategy':    '#e8a83e',
  'Stakeholder communication':    '#b06dff',
  'CS metrics knowledge':         '#3ed6c4',
  'Process design':               '#ff7b9c',
};

const QUESTIONS = [
  {
    section: 'Account health & churn risk',
    type: 'mcq',
    scenario: 'A key enterprise client ($250k ARR) has had login activity drop 60% over 3 months. The primary champion just left the company and you\'ve had no response to your last two emails.',
    q: 'What is your first priority action?',
    options: [
      'Send another follow-up email to the champion\'s old address',
      'Immediately escalate to your VP to flag potential churn',
      'Map new stakeholders via LinkedIn & internal contacts, then schedule an executive business review',
      'Offer a 20% discount on renewal to re-engage the account',
    ],
    correct: 2,
    explanation: 'Champion departure + falling usage + no response = high churn signal. The first step is stakeholder mapping — get eyes on who now owns the relationship, then arrange an EBR to re-establish value. Escalating or discounting before you have a new contact is premature.',
  },
  {
    section: 'Account health & churn risk',
    type: 'open',
    scenario: 'You manage a portfolio of 40 accounts with limited bandwidth.',
    q: 'How would you build a tiered health scoring system to prioritize your attention? What data signals would you use?',
    rubric: 'Strong answers include: product adoption (DAU/WAU, feature usage depth), support ticket frequency and severity, NPS/CSAT scores, contract value and renewal proximity, engagement signals (QBR attendance, email response rate), stakeholder changes/champion risk. They should describe a weighted scoring model, red/amber/green tiering, and a review cadence.',
  },
  {
    section: 'Escalation handling',
    type: 'mcq',
    scenario: 'A mid-market client calls you angry — their team cannot use a core feature for 6 hours due to a bug. They\'re threatening to cancel.',
    q: 'Which response sequence is most effective?',
    options: [
      'Apologize and promise the engineering team will fix it soon',
      'Acknowledge the impact immediately, set a 1-hour update SLA, loop in engineering & your manager, and send a written incident summary with timeline to the client',
      'Tell them to submit a support ticket and it will be triaged',
      'Offer a credit on their next invoice to calm them down first',
    ],
    correct: 1,
    explanation: 'Effective escalation requires: owning the problem, setting a clear SLA, coordinating cross-functionally, and providing written accountability. Offering a credit before resolving the issue signals you\'re trying to buy silence rather than solve the problem.',
  },
  {
    section: 'Escalation handling',
    type: 'open',
    q: 'Describe a framework you would use to manage a critical escalation — from first contact to resolution and post-incident review.',
    rubric: 'Look for: triage and severity classification, internal stakeholder alignment, client-facing communication cadence with set SLAs, resolution tracking, post-mortem with root cause analysis, and relationship repair steps. Strong answers use structured written updates, show ownership language, and include proactive follow-up even after resolution.',
  },
  {
    section: 'Data analysis & reporting',
    type: 'mcq',
    q: 'Your monthly business review shows NPS dropped from +42 to +18 in one quarter. Usage is stable but support tickets increased 35%. What is the most likely root cause hypothesis?',
    options: [
      'Customers are unhappy with pricing',
      'A product change or new release created friction that support is absorbing while NPS is reflecting the sentiment',
      'Your CS team\'s response time has slowed down',
      'The NPS survey methodology changed',
    ],
    correct: 1,
    explanation: 'Stable usage + rising support volume + falling NPS point to a product friction event (new release, UI change, deprecation). Customers are still using the product but encountering problems — classic friction/confusion signal after a product change.',
  },
  {
    section: 'Data analysis & reporting',
    type: 'open',
    scenario: 'You\'re presenting a monthly performance review to your VP of Customer Success.',
    q: 'Design a monthly CS dashboard. What metrics would you include, how would you structure it, and what story would it tell?',
    rubric: 'Strong answers include: GRR/NRR, churn rate, expansion revenue, time-to-value for new accounts, health score distribution, NPS/CSAT trend, QBR completion rate, support CSAT and volume. They should organize into sections (retention health, growth, team performance) and describe a coherent narrative — not just a data dump. Bonus: leading vs lagging indicators distinction.',
  },
  {
    section: 'Renewal & upsell strategy',
    type: 'mcq',
    scenario: 'A customer\'s contract renews in 90 days. Their usage has grown 40% YoY and they\'ve onboarded two new teams onto the platform.',
    q: 'When and how do you initiate the renewal/upsell conversation?',
    options: [
      'Wait until 30 days before renewal to avoid putting pressure on the relationship',
      'Start now — 90 days gives time for a value review, expansion pitch, and negotiation buffer. Lead with usage data and ROI evidence.',
      'Let the Account Executive handle it — CS shouldn\'t own commercial conversations',
      'Send an automated renewal reminder at 60 days and wait for their response',
    ],
    correct: 1,
    explanation: '90-day runway is the right window. Strong usage data and team expansion are clear upsell signals. CS should lead with value evidence, partner with AE on commercial terms, and use the runway to build multi-stakeholder consensus before renewal pressure builds.',
  },
  {
    section: 'Renewal & upsell strategy',
    type: 'open',
    q: 'How do you differentiate between an account ready for an upsell conversation versus one that needs health stabilization first? What signals guide your decision?',
    rubric: 'Look for: health score thresholds before upsell (never expand an unhealthy account), positive signals (NPS 8+, consistent usage, champion advocacy, realized ROI), risk of upselling unhealthy accounts (accelerates churn, damages trust), and a framework for sequencing — stabilize → prove value → expand. Strong answers describe specific metrics and a decision tree or threshold model.',
  },
  {
    section: 'Stakeholder communication',
    type: 'mcq',
    scenario: 'An executive sponsor at a key account tells you they\'re "not seeing the value" of your product, despite strong adoption metrics across their team.',
    q: 'How do you respond?',
    options: [
      'Send them a detailed product features one-pager to remind them what the product does',
      'Ask them to define what value means to them specifically, then map your metrics to their business outcomes in a follow-up EBR',
      'Escalate internally — this is an immediate red flag requiring discount approval',
      'Tell them the adoption data proves strong value and ask what additional proof they need',
    ],
    correct: 1,
    explanation: 'Executive sponsors think in business outcomes, not product metrics. The right move is to reframe — understand their specific definition of value (cost savings, revenue impact, risk reduction, efficiency), then translate your metrics into that language. Citing data without aligning to their frame usually backfires and creates more friction.',
  },
  {
    section: 'Stakeholder communication',
    type: 'open',
    q: 'You need to communicate a significant product change (removal of a widely-used feature) across your portfolio. How do you structure and sequence this communication?',
    rubric: 'Strong answers include: impact segmentation (who is most affected?), advance notice timeline with enough runway, messaging tailored to technical vs. executive audiences, clear alternative solutions or migration path, proactive outreach (not just email blast), a feedback loop, and internal team preparation (FAQs, objection handling). They should lead with empathy and business impact, not just the technical change.',
  },
  {
    section: 'CS metrics knowledge',
    type: 'mcq',
    q: 'A SaaS company has GRR of 88% and NRR of 107%. What does this tell you about the business?',
    options: [
      'The business is losing some revenue from churn but expansion from remaining customers more than compensates — growth is masking a retention problem',
      'The business has strong retention and strong growth — both metrics are healthy',
      'The business has a severe churn problem and expansion is not solving it',
      'NRR of 107% means 7% of customers churned and were replaced',
    ],
    correct: 0,
    explanation: 'GRR of 88% means 12% of contracted revenue is lost through churn/contraction — a meaningful problem. NRR of 107% means expansion from retained accounts more than offsets those losses. The business is growing, but expansion is masking an underlying retention issue. Long-term, improving GRR is the priority or the expansion engine will hit its ceiling.',
  },
  {
    section: 'CS metrics knowledge',
    type: 'open',
    q: 'Define Time-to-Value (TTV) and explain how you would measure and systematically reduce it for enterprise customers.',
    rubric: 'Strong answers define TTV clearly (time from contract signing to customer achieving their first meaningful, agreed-upon outcome), distinguish between immediate value milestones and long-term value, and describe concrete reduction tactics: structured onboarding playbooks, dedicated implementation specialists, pre-built templates, executive kick-off for alignment, milestone-based check-ins, and measuring TTV per customer segment to identify where the bottlenecks occur.',
  },
  {
    section: 'Process design',
    type: 'open',
    scenario: 'You\'re joining a CS team with no standardized processes — no playbooks, no health scoring, no QBR cadence, and no consistent onboarding.',
    q: 'Walk through how you would build a structured CS operating model from scratch in your first 90 days. What would you prioritize and why?',
    rubric: 'Exceptional answers structure by phase: Days 1-30 (listen and audit — talk to customers, AEs, support reps, review churn data to understand current state), Days 31-60 (define health scoring model, segment the portfolio by risk and tier, build playbooks for high-risk and expansion motion), Days 61-90 (establish QBR cadence, build metrics dashboard, enable the team on new processes). They justify prioritization by business impact and quick wins. Bonus: identifying which fixes prevent the most revenue loss first.',
  },
  {
    section: 'Process design',
    type: 'mcq',
    q: 'Which of the following is the strongest indicator that a CS playbook is actually working?',
    options: [
      'The entire team is following all the steps consistently',
      'Customers who go through the playbook show measurably better health scores, renewal rates, and NPS than those who don\'t',
      'The playbook has been reviewed and formally approved by senior leadership',
      'The playbook covers every possible customer scenario in detail',
    ],
    correct: 1,
    explanation: 'Process compliance is a leading indicator, but outcome improvement is the only real proof. If customers following the playbook don\'t show measurably better retention, health, and satisfaction than those outside it, the playbook needs to change — regardless of how consistently it\'s being followed.',
  },
];

// ─── STATE ──────────────────────────────────
let currentQ = 0;
let mode = 'hire';
let answers = [];      // user's raw answers
let feedbacks = [];    // { score, summary, strengths, gaps, answer, correct? }
let state = 'answering'; // 'answering' | 'evaluated'
let navStatus = [];    // 'current' | 'answered' | 'skipped' | ''

// ─── NAVIGATION ─────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

function goLanding() {
  showScreen('landing');
  currentQ = 0; answers = []; feedbacks = []; navStatus = []; state = 'answering';
}

function startQuiz(m) {
  mode = m;
  currentQ = 0;
  answers = new Array(QUESTIONS.length).fill(null);
  feedbacks = new Array(QUESTIONS.length).fill(null);
  navStatus = new Array(QUESTIONS.length).fill('');
  navStatus[0] = 'current';
  showScreen('quiz');
  buildSidebarNav();
  buildSectionLegend();
  renderQuestion();
}

// ─── SIDEBAR NAV ───────────────────────────
function buildSidebarNav() {
  const grid = document.getElementById('q-nav-grid');
  grid.innerHTML = '';
  QUESTIONS.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'q-nav-dot';
    dot.textContent = i + 1;
    dot.id = `nav-dot-${i}`;
    dot.onclick = () => jumpTo(i);
    grid.appendChild(dot);
  });
  refreshNav();
}

function refreshNav() {
  QUESTIONS.forEach((_, i) => {
    const dot = document.getElementById(`nav-dot-${i}`);
    if (!dot) return;
    dot.className = 'q-nav-dot ' + (navStatus[i] || '');
  });
}

function jumpTo(i) {
  if (state === 'evaluated') {
    navStatus[currentQ] = feedbacks[currentQ] ? 'answered' : 'skipped';
  }
  currentQ = i;
  navStatus[i] = 'current';
  refreshNav();
  state = 'answering';
  renderQuestion();
}

function buildSectionLegend() {
  const el = document.getElementById('section-legend');
  el.innerHTML = '';
  Object.entries(SECTION_COLORS).forEach(([sec, color]) => {
    el.innerHTML += `<div class="legend-item"><div class="legend-dot" style="background:${color}"></div><span>${sec}</span></div>`;
  });
}

// ─── RENDER QUESTION ─────────────────────────
function renderQuestion() {
  const q = QUESTIONS[currentQ];
  const total = QUESTIONS.length;
  state = 'answering';

  // Topbar
  document.getElementById('q-counter').textContent = `${currentQ + 1} / ${total}`;
  document.getElementById('progress-fill').style.width = `${((currentQ + 1) / total) * 100}%`;
  const modeNames = { hire: 'Hiring Screening', know: 'Knowledge Test', prep: 'Interview Prep' };
  document.getElementById('topbar-mode').textContent = modeNames[mode];

  // Section + type badges
  const color = SECTION_COLORS[q.section] || '#d4a853';
  document.getElementById('q-section-badge').textContent = q.section;
  document.getElementById('q-section-badge').style.borderColor = color + '44';
  document.getElementById('q-section-badge').style.background = color + '18';
  document.getElementById('q-section-badge').style.color = color;

  const typeBadge = document.getElementById('q-type-badge');
  typeBadge.textContent = q.type === 'mcq' ? 'Multiple Choice' : 'Open-Ended';
  typeBadge.className = 'q-type-badge ' + q.type;

  // Scenario
  const scenarioBlock = document.getElementById('scenario-block');
  if (q.scenario) {
    scenarioBlock.style.display = 'block';
    document.getElementById('scenario-text').textContent = q.scenario;
  } else {
    scenarioBlock.style.display = 'none';
  }

  // Question text
  document.getElementById('q-text').textContent = q.q;

  // Clear feedback
  document.getElementById('ai-feedback-panel').style.display = 'none';

  // MCQ vs open
  const optWrap = document.getElementById('options-wrap');
  const openWrap = document.getElementById('open-wrap');
  const openAns = document.getElementById('open-ans');

  if (q.type === 'mcq') {
    optWrap.style.display = 'flex';
    openWrap.style.display = 'none';
    optWrap.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'option';
      div.id = `opt-${i}`;
      div.innerHTML = `<div class="opt-letter">${letters[i]}</div><div class="opt-text">${opt}</div>`;
      div.addEventListener('click', () => selectOption(i));
      optWrap.appendChild(div);
    });
    // Restore previous selection
    if (answers[currentQ] !== null && typeof answers[currentQ] === 'number') {
      document.getElementById(`opt-${answers[currentQ]}`)?.classList.add('selected');
    }
  } else {
    optWrap.style.display = 'none';
    openWrap.style.display = 'block';
    openAns.value = typeof answers[currentQ] === 'string' ? answers[currentQ] : '';
    openAns.disabled = false;
    openAns.addEventListener('input', () => {
      document.getElementById('char-count').textContent = openAns.value.length;
    });
    document.getElementById('char-count').textContent = openAns.value.length;
  }

  updateBtn();
  document.getElementById('btn-skip').style.display = 'inline-flex';
  navStatus[currentQ] = 'current';
  refreshNav();
}

// ─── OPTION SELECTION ───────────────────────
function selectOption(i) {
  if (state !== 'answering') return;
  document.querySelectorAll('.option').forEach(el => el.classList.remove('selected'));
  document.getElementById(`opt-${i}`)?.classList.add('selected');
  answers[currentQ] = i;
  updateBtn();
}

// ─── BUTTON STATE ───────────────────────────
function updateBtn() {
  const q = QUESTIONS[currentQ];
  const btn = document.getElementById('btn-action');
  const label = document.getElementById('btn-label');
  const icon = document.getElementById('btn-icon');

  if (state === 'answering') {
    label.textContent = q.type === 'open' ? 'Get AI Feedback' : 'Submit Answer';
    icon.className = 'fa-solid fa-arrow-right';
    btn.disabled = false;
  } else {
    const isLast = currentQ === QUESTIONS.length - 1;
    label.textContent = isLast ? 'See Results' : 'Next Question';
    icon.className = isLast ? 'fa-solid fa-chart-bar' : 'fa-solid fa-arrow-right';
    btn.disabled = false;
  }
}

// ─── MAIN ACTION HANDLER ────────────────────
async function handleAction() {
  if (state === 'answering') {
    await submitAnswer();
  } else {
    nextOrFinish();
  }
}

async function submitAnswer() {
  const q = QUESTIONS[currentQ];
  const btn = document.getElementById('btn-action');

  if (q.type === 'mcq') {
    if (answers[currentQ] === null || answers[currentQ] === undefined) return;
    revealMCQ();
  } else {
    const ans = document.getElementById('open-ans').value.trim();
    if (!ans || ans.length < 10) {
      document.getElementById('open-ans').style.borderColor = '#e05252';
      setTimeout(() => document.getElementById('open-ans').style.borderColor = '', 1200);
      return;
    }
    answers[currentQ] = ans;
    await evaluateOpenAnswer(ans, q);
  }
}

// ─── MCQ REVEAL ─────────────────────────────
function revealMCQ() {
  const q = QUESTIONS[currentQ];
  const userAns = answers[currentQ];
  const isCorrect = userAns === q.correct;

  document.querySelectorAll('.option').forEach((el, i) => {
    el.onclick = null;
    if (i === q.correct) el.classList.add('correct');
    else if (i === userAns && !isCorrect) el.classList.add('wrong');
  });

  const fb = {
    score: isCorrect ? 10 : 3,
    summary: q.explanation,
    answer: q.options[userAns],
    isCorrect,
    type: 'mcq',
  };
  feedbacks[currentQ] = fb;

  const panel = document.getElementById('ai-feedback-panel');
  panel.style.display = 'block';
  const scoreDisplay = document.getElementById('ai-score-display');
  const body = document.getElementById('ai-fb-body');

  if (isCorrect) {
    scoreDisplay.textContent = '✓ Correct';
    scoreDisplay.style.color = '#4caf82';
  } else {
    scoreDisplay.textContent = '✗ Incorrect';
    scoreDisplay.style.color = '#e05252';
  }
  body.innerHTML = `<strong>Explanation</strong>${q.explanation}`;

  state = 'evaluated';
  navStatus[currentQ] = 'answered';
  refreshNav();
  updateBtn();
  document.getElementById('btn-skip').style.display = 'none';
}

// ─── OPEN-ENDED AI SCORING ──────────────────
async function evaluateOpenAnswer(ans, q) {
  const btn = document.getElementById('btn-action');
  const label = document.getElementById('btn-label');
  const icon = document.getElementById('btn-icon');
  const openAns = document.getElementById('open-ans');

  openAns.disabled = true;
  label.innerHTML = `Evaluating <div class="dots"><span></span><span></span><span></span></div>`;
  icon.className = '';
  btn.disabled = true;
  document.getElementById('btn-skip').style.display = 'none';

  const systemPrompt = `You are an expert Customer Success hiring evaluator with 15+ years of CS leadership experience. Evaluate open-ended answers from CS professionals or candidates.

Return ONLY valid JSON — no markdown, no preamble, no backticks. Format:
{
  "score": <integer 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": "<specific strengths in their answer>",
  "gaps": "<specific gaps or areas they missed — be concrete>",
  "verdict": "<one of: Exceptional | Strong | Moderate | Developing | Weak>"
}

Scoring guide:
9-10: Comprehensive, structured, shows deep CS expertise with specific frameworks or metrics
7-8: Solid answer with good structure, covers main points, minor gaps
5-6: Covers the basics but lacks depth, specificity, or a structured approach
3-4: Surface level, misses key concepts, no framework or structure
1-2: Off-topic, very incomplete, or demonstrates misunderstanding`;

  const userPrompt = `Question: ${q.q}${q.scenario ? '\nContext: ' + q.scenario : ''}

Evaluation rubric (what a great answer includes):
${q.rubric}

Candidate's answer:
"${ans}"

Evaluate strictly against the rubric. Score 1-10.`;

  try {
    if (!ANTHROPIC_API_KEY) throw new Error('No API key');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const text = data.content.map(c => c.text || '').join('').trim();
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);

    feedbacks[currentQ] = {
      score: parseInt(parsed.score),
      summary: parsed.summary,
      strengths: parsed.strengths,
      gaps: parsed.gaps,
      verdict: parsed.verdict,
      answer: ans,
      type: 'open',
    };

    showOpenFeedback(feedbacks[currentQ]);

  } catch (err) {
    console.error('AI scoring error:', err);
    feedbacks[currentQ] = {
      score: 5,
      summary: 'Your answer has been recorded. AI scoring encountered an issue: ' + err.message,
      strengths: 'Answer submitted successfully.',
      gaps: 'Could not auto-evaluate. Check your API key and network connection.',
      verdict: 'Moderate',
      answer: ans,
      type: 'open',
    };
    showOpenFeedback(feedbacks[currentQ]);
  }

  state = 'evaluated';
  navStatus[currentQ] = 'answered';
  refreshNav();
  updateBtn();
}

function showOpenFeedback(fb) {
  const panel = document.getElementById('ai-feedback-panel');
  panel.style.display = 'block';

  const scoreDisplay = document.getElementById('ai-score-display');
  const body = document.getElementById('ai-fb-body');

  const score = fb.score;
  let scoreColor = '#e05252';
  if (score >= 8) scoreColor = '#4caf82';
  else if (score >= 6) scoreColor = '#e8a83e';
  else if (score >= 4) scoreColor = '#ff9944';

  const verdictColors = {
    Exceptional: '#4caf82', Strong: '#4a8cff',
    Moderate: '#e8a83e', Developing: '#ff9944', Weak: '#e05252',
  };
  const vColor = verdictColors[fb.verdict] || '#9a9a94';

  scoreDisplay.innerHTML = `<span style="color:${scoreColor};font-size:1.2rem;font-weight:600">${score}/10</span>&nbsp;&nbsp;<span style="background:${vColor}22;color:${vColor};border-radius:20px;padding:2px 10px;font-size:0.75rem;font-weight:500">${fb.verdict || ''}</span>`;

  body.innerHTML = `
    <div style="margin-bottom:10px"><strong>Overall</strong>${fb.summary}</div>
    <div class="ai-fb-section">
      <div class="ai-fb-section-label" style="color:#4caf82"><i class="fa-solid fa-check" style="margin-right:4px"></i>Strengths</div>
      <div>${fb.strengths}</div>
    </div>
    <div class="ai-fb-section" style="margin-top:10px">
      <div class="ai-fb-section-label" style="color:#e8a83e"><i class="fa-solid fa-arrow-up-right-dots" style="margin-right:4px"></i>Areas to develop</div>
      <div>${fb.gaps}</div>
    </div>
  `;
}

// ─── SKIP & NEXT ────────────────────────────
function skipQuestion() {
  answers[currentQ] = null;
  feedbacks[currentQ] = { score: 0, summary: 'Skipped.', answer: 'Skipped', type: 'skipped' };
  navStatus[currentQ] = 'skipped';
  nextOrFinish();
}

function nextOrFinish() {
  if (state !== 'evaluated') {
    navStatus[currentQ] = feedbacks[currentQ] ? 'answered' : 'skipped';
  }
  if (currentQ < QUESTIONS.length - 1) {
    currentQ++;
    navStatus[currentQ] = 'current';
    state = 'answering';
    refreshNav();
    renderQuestion();
  } else {
    buildResults();
    showScreen('results');
  }
}

// ─── RESULTS ────────────────────────────────
function buildResults() {
  const modeNames = { hire: 'Hiring Candidate Screening', know: 'Knowledge Assessment', prep: 'Interview Preparation Practice' };
  document.getElementById('results-subtitle').textContent = modeNames[mode];

  // Compute overall score
  const scored = feedbacks.filter(f => f && f.score > 0);
  const totalScore = scored.length
    ? Math.round(scored.reduce((s, f) => s + f.score, 0) / scored.length * 10)
    : 0;

  // Animate ring
  const circumference = 314;
  const offset = circumference - (totalScore / 100) * circumference;
  setTimeout(() => {
    const ring = document.getElementById('ring-fill');
    ring.style.strokeDashoffset = offset;
    // Color the ring based on score
    if (totalScore >= 75) ring.style.stroke = '#4caf82';
    else if (totalScore >= 55) ring.style.stroke = '#e8a83e';
    else ring.style.stroke = '#e05252';
  }, 200);
  document.getElementById('ring-pct').textContent = totalScore + '%';

  // Verdict
  const verdict = document.getElementById('verdict-badge');
  if (totalScore >= 80) {
    verdict.textContent = '⭐ Strong candidate — recommend proceeding';
    verdict.style.cssText = 'background:rgba(76,175,130,0.12);color:#4caf82;display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:6px 16px;font-size:0.875rem;font-weight:500;margin-bottom:1rem;';
  } else if (totalScore >= 60) {
    verdict.textContent = '⚡ Moderate — development areas identified';
    verdict.style.cssText = 'background:rgba(232,168,62,0.12);color:#e8a83e;display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:6px 16px;font-size:0.875rem;font-weight:500;margin-bottom:1rem;';
  } else {
    verdict.textContent = '↻ Needs significant development in core CS areas';
    verdict.style.cssText = 'background:rgba(224,82,82,0.12);color:#e05252;display:inline-flex;align-items:center;gap:6px;border-radius:20px;padding:6px 16px;font-size:0.875rem;font-weight:500;margin-bottom:1rem;';
  }

  // Meta stats
  const answeredCount = feedbacks.filter(f => f && f.score > 0).length;
  const skippedCount = feedbacks.filter(f => f && f.type === 'skipped').length;
  const correctMCQ = feedbacks.filter(f => f && f.type === 'mcq' && f.score >= 8).length;
  const totalMCQ = QUESTIONS.filter(q => q.type === 'mcq').length;

  document.getElementById('results-meta').innerHTML = `
    <div class="meta-item"><div class="mn">${answeredCount}/${QUESTIONS.length}</div><div class="ml">Answered</div></div>
    <div class="meta-item"><div class="mn">${correctMCQ}/${totalMCQ}</div><div class="ml">MCQ Correct</div></div>
    <div class="meta-item"><div class="mn">${skippedCount}</div><div class="ml">Skipped</div></div>
  `;

  // Section bars
  const sections = Object.keys(SECTION_COLORS);
  const barsEl = document.getElementById('section-bars');
  barsEl.innerHTML = '';
  sections.forEach(sec => {
    const indices = QUESTIONS.map((q, i) => q.section === sec ? i : -1).filter(i => i >= 0);
    const secFeedbacks = indices.map(i => feedbacks[i]).filter(f => f && f.score > 0);
    const avg = secFeedbacks.length
      ? Math.round(secFeedbacks.reduce((s, f) => s + f.score, 0) / secFeedbacks.length * 10)
      : 0;
    const color = SECTION_COLORS[sec];
    barsEl.innerHTML += `
      <div class="bar-row">
        <div class="bar-row-top">
          <span class="bar-section-name">${sec}</span>
          <span class="bar-pct" style="color:${color}">${avg}%</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill-anim" id="bar-${sec.replace(/\s+/g,'-')}" style="width:0%;background:${color}"></div>
        </div>
      </div>`;
  });
  // Animate bars
  setTimeout(() => {
    sections.forEach(sec => {
      const indices = QUESTIONS.map((q, i) => q.section === sec ? i : -1).filter(i => i >= 0);
      const secFeedbacks = indices.map(i => feedbacks[i]).filter(f => f && f.score > 0);
      const avg = secFeedbacks.length
        ? Math.round(secFeedbacks.reduce((s, f) => s + f.score, 0) / secFeedbacks.length * 10)
        : 0;
      const el = document.getElementById('bar-' + sec.replace(/\s+/g, '-'));
      if (el) el.style.width = avg + '%';
    });
  }, 300);

  // Review list
  const reviewEl = document.getElementById('review-list');
  reviewEl.innerHTML = '';
  QUESTIONS.forEach((q, i) => {
    const fb = feedbacks[i];
    if (!fb) return;
    const scoreColor = fb.score >= 7 ? '#4caf82' : fb.score >= 5 ? '#e8a83e' : '#e05252';
    const scoreLabel = q.type === 'mcq'
      ? (fb.score >= 7 ? '✓ Correct' : '✗ Incorrect')
      : `${fb.score}/10`;
    const ansDisplay = typeof fb.answer === 'string' ? fb.answer : (q.options && q.options[fb.answer]) || 'Not answered';
    const shortAns = ansDisplay.length > 120 ? ansDisplay.slice(0, 120) + '…' : ansDisplay;

    reviewEl.innerHTML += `
      <div class="review-item">
        <div class="review-item-top">
          <span class="review-section">${q.section}</span>
          <span class="review-score" style="color:${scoreColor}">${scoreLabel}</span>
        </div>
        <div class="review-q">${q.q}</div>
        <div class="review-ans">${shortAns}</div>
        <div class="review-feedback">${fb.summary}</div>
      </div>`;
  });
}
