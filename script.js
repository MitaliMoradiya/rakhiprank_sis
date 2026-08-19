(() => {
  "use strict";

  /* ============================================================
     UTIL
     ============================================================ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));

  const stage = $("#stage");
  const scenes = {};
  $$(".scene").forEach((el) => (scenes[el.dataset.scene] = el));

  let current = "1";

  function goTo(sceneId) {
    const from = scenes[current];
    const to = scenes[sceneId];
    if (!to || from === to) return;

    from.classList.add("leaving");
    from.classList.remove("active");

    requestAnimationFrame(() => {
      to.classList.add("active");
      setTimeout(() => from.classList.remove("leaving"), 600);
    });

    stage.classList.toggle("phase-warm", sceneId === "8");
    current = sceneId;
  }

  /* ============================================================
     SOUND (subtle UI blips via WebAudio, muted by default)
     ============================================================ */
  let audioCtx = null;
  let soundOn = false;
  const soundBtn = $("#soundToggle");

  function beep(freq = 440, dur = 0.06, type = "sine", gain = 0.05) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(audioCtx.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio not available, silently skip */ }
  }

  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.classList.toggle("on", soundOn);
    soundBtn.querySelector(".sound-icon").textContent = soundOn ? "🔊" : "🔇";
    if (soundOn) beep(600, 0.05, "sine", 0.04);
  });

  /* ============================================================
     FAKE CLOCK
     ============================================================ */
  function updateClock() {
    const el = $("#fakeClock");
    if (!el) return;
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    el.textContent = `${h}:${m}`;
  }
  updateClock();
  setInterval(updateClock, 15000);

  /* ============================================================
     SCENE 1 — CLEANUP SEQUENCE
     ============================================================ */
  const RING_CIRCUMFERENCE = 326.7;
  const ringFill = $("#ringFill");
  const ringPercent = $("#ringPercent");
  const statusLine = $("#statusLine");
  const activityList = $("#activityList");

  const statusMessages = [
    "Scanning storage…",
    "Preparing cleanup…",
    "Processing photos…",
    "Processing videos…",
    "Removing duplicate files…",
    "Cleaning memory cache…",
  ];

  const activityItems = [
    { icon: "📸", label: "Photos" },
    { icon: "🎥", label: "Videos" },
    { icon: "🎞️", label: "Screenshots" },
    { icon: "📁", label: "Files" },
    { icon: "💬", label: "Saved memories" },
  ];

  function setRing(pct) {
    const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
    ringFill.style.strokeDashoffset = offset;
    ringPercent.textContent = `${Math.round(pct)}%`;
  }

  async function runCleanupSequence() {
    setRing(0);
    let msgIndex = 0;
    statusLine.textContent = statusMessages[0];

    const msgTimer = setInterval(() => {
      msgIndex = (msgIndex + 1) % statusMessages.length;
      statusLine.textContent = statusMessages[msgIndex];
    }, 900);

    // animate progress ring 0 -> 100 over ~6.5s while items populate
    const totalDuration = 6500;
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / totalDuration) * 100);
      setRing(pct);
      if (pct < 100) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    // reveal activity items sequentially
    for (let i = 0; i < activityItems.length; i++) {
      await wait(i === 0 ? 500 : 1100);
      const item = activityItems[i];
      const row = document.createElement("div");
      row.className = "activity-item";
      row.innerHTML = `<span>${item.icon} ${item.label}</span><span class="a-status">deleting…</span>`;
      activityList.appendChild(row);
      beep(300 + i * 40, 0.04, "square", 0.03);

      // mark previous items done
      $$(".activity-item", activityList).slice(0, -1).forEach((el) => {
        el.classList.add("done");
        el.querySelector(".a-status").textContent = "done";
      });
    }

    await wait(900);
    $$(".activity-item", activityList).forEach((el) => {
      el.classList.add("done");
      el.querySelector(".a-status").textContent = "done";
    });

    clearInterval(msgTimer);
    setRing(100);
    statusLine.textContent = "Memory cleanup completed.";
    beep(220, 0.15, "sine", 0.05);

    await wait(1100);
    goTo("2");
    runResultSequence();
  }

  /* ============================================================
     SCENE 2 — RESULT + STOP QUESTION
     ============================================================ */
  const waitBlock = $("#waitBlock");
  const dodgeMsg = $("#dodgeMsg");
  const btnYes = $("#btnYes");
  const btnNo = $("#btnNo");
  const stopButtons = $("#stopButtons");

  async function runResultSequence() {
    await wait(1400);
    waitBlock.classList.remove("hidden");
    beep(500, 0.08, "triangle", 0.04);
  }

  const dodgeLines = [
    "Nice try 😂",
    "Nope.",
    "Too slow 😏",
    "You really thought? 😂",
    "Absolutely not.",
    "Try again 😭",
    "NO button unavailable.",
  ];
  let dodgeIndex = 0;

  function dodgeNoButton() {
    const bounds = stopButtons.getBoundingClientRect();
    const btnW = btnNo.offsetWidth || 140;
    const btnH = btnNo.offsetHeight || 46;
    const maxX = Math.max(bounds.width - btnW, 0);
    const maxY = Math.max(bounds.height - btnH, 0);
    const newX = Math.random() * maxX;
    const newY = Math.random() * maxY;
    btnNo.style.left = `${newX}px`;
    btnNo.style.top = `${newY}px`;
    dodgeMsg.textContent = dodgeLines[dodgeIndex % dodgeLines.length];
    dodgeIndex++;
    beep(180, 0.05, "square", 0.03);
  }

  // move the button before any tap/click/hover can land on it
  ["pointerenter", "pointerdown", "touchstart", "mouseover"].forEach((evt) => {
    btnNo.addEventListener(evt, (e) => {
      e.preventDefault();
      dodgeNoButton();
    }, { passive: false });
  });
  btnNo.addEventListener("click", (e) => {
    e.preventDefault();
    dodgeNoButton();
  });

  btnYes.addEventListener("click", () => {
    beep(700, 0.1, "sine", 0.05);
    goTo("4");
    runRevealSequence();
  });

  /* ============================================================
     SCENE 4 — BROTHER REVEAL
     ============================================================ */
  const revealLines = $$(".reveal-line");
  const startQuizBtn = $("#startQuizBtn");

  async function runRevealSequence() {
    revealLines.forEach((l) => l.classList.remove("shown"));
    startQuizBtn.classList.remove("shown");
    for (const line of revealLines) {
      await wait(550);
      line.classList.add("shown");
    }
    await wait(400);
    startQuizBtn.classList.add("shown");
  }

  startQuizBtn.addEventListener("click", () => {
    goTo("5");
    initQuiz();
  });

  /* ============================================================
     SCENE 5 — QUIZ
     ============================================================ */
  const questions = [
    {
      q: "Who is the smarter one between us?",
      options: [
        { key: "brother", label: "Brother 🧠" },
        { key: "sister", label: "Sister 😌" },
      ],
      correct: "brother",
      wrong: "HAHAHA 😂 Nice joke. We both know the answer.",
    },
    {
      q: "Who starts the fight most of the time?",
      options: [
        { key: "brother", label: "Brother 😇" },
        { key: "sister", label: "Sister 🥊" },
      ],
      correct: "sister",
      wrong: "Don't lie now. 😭 We both know who started it.",
    },
    {
      q: "Who is more dramatic?",
      options: [
        { key: "brother", label: "Brother 🎭" },
        { key: "sister", label: "Sister 🎭" },
      ],
      correct: "sister",
      wrong: "Oscar-worthy answer 😂 But we're not accepting lies today.",
    },
    {
      q: "Who annoys the other person for absolutely no reason?",
      options: [
        { key: "brother", label: "Brother 😏" },
        { key: "sister", label: "Sister 😈" },
      ],
      correct: "sister",
      wrong: "Interesting… 🤨 You really came here to rewrite history.",
    },
    {
      q: "Who is obviously the better sibling?",
      options: [
        { key: "brother", label: "Brother 👑" },
        { key: "sister", label: "Sister 👸" },
      ],
      correct: "brother",
      wrong: "Okay, that's enough comedy. 😂 Pick the correct answer.",
    },
  ];

  let qIndex = 0;
  const quizCount = $("#quizCount");
  const quizProgressFill = $("#quizProgressFill");
  const quizQuestion = $("#quizQuestion");
  const quizOptionsWrap = $("#quizOptions");
  const quizOptBtns = $$(".quiz-opt", quizOptionsWrap);
  const quizFeedback = $("#quizFeedback");
  let quizLocked = false;

  function initQuiz() {
    qIndex = 0;
    renderQuestion();
  }

  function renderQuestion() {
    quizLocked = false;
    const item = questions[qIndex];
    quizCount.textContent = `QUESTION ${qIndex + 1} / ${questions.length}`;
    quizProgressFill.style.width = `${((qIndex + 1) / questions.length) * 100}%`;
    quizQuestion.textContent = item.q;
    quizFeedback.textContent = "\u00A0";
    quizFeedback.classList.remove("good");

    quizOptBtns.forEach((btn, i) => {
      const opt = item.options[i];
      btn.textContent = opt.label;
      btn.dataset.answer = opt.key;
      btn.classList.remove("correct", "wrong");
      btn.disabled = false;
    });
  }

  quizOptBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (quizLocked) return;
      const chosen = btn.dataset.answer;
      const item = questions[qIndex];

      if (chosen === item.correct) {
        quizLocked = true;
        btn.classList.add("correct");
        quizFeedback.textContent = "Correct. Finally, some honesty. 😌";
        quizFeedback.classList.add("good");
        beep(700, 0.08, "sine", 0.05);

        setTimeout(() => {
          qIndex++;
          if (qIndex < questions.length) {
            renderQuestion();
          } else {
            goTo("6");
            runTruthSequence();
          }
        }, 700);
      } else {
        btn.classList.add("wrong");
        quizFeedback.textContent = item.wrong;
        quizFeedback.classList.remove("good");
        beep(150, 0.08, "square", 0.04);
        setTimeout(() => btn.classList.remove("wrong"), 400);
      }
    });
  });

  /* ============================================================
     SCENE 6 — TRUTH ACCEPTED
     ============================================================ */
  const truthLines = $$(".truth-line, .truth-item");
  const giftBtn = $("#giftBtn");

  async function runTruthSequence() {
    truthLines.forEach((l) => l.classList.remove("shown"));
    giftBtn.classList.add("hidden");
    giftBtn.classList.remove("shown");

    const ordered = [
      $("#truthIntro"),
      ...$$(".truth-item"),
      $("#truthSo"),
      $("#truthOk"),
      $("#truthGiftLine"),
    ];

    for (const el of ordered) {
      await wait(el.classList.contains("truth-item") ? 500 : 700);
      el.classList.add("shown");
    }

    await wait(500);
    giftBtn.classList.remove("hidden");
    requestAnimationFrame(() => giftBtn.classList.add("shown"));
  }

  giftBtn.addEventListener("click", () => {
    beep(700, 0.1, "sine", 0.05);
    goTo("7");
  });

  /* ============================================================
     SCENE 7 — GIFT
     ============================================================ */
  $("#thatsItBtn").addEventListener("click", () => {
    goTo("8");
    runEmotionalSequence();
  });

  /* ============================================================
     SCENE 8 — EMOTIONAL FINALE
     ============================================================ */
  const emoParticlesWrap = $("#emoParticles");
  let particleTimer = null;

  function spawnPetal() {
    const p = document.createElement("div");
    p.className = "petal";
    const size = 8 + Math.random() * 10;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = Math.random() > 0.5 ? "var(--rose)" : "var(--gold)";
    const duration = 6 + Math.random() * 5;
    p.style.animationDuration = `${duration}s`;
    emoParticlesWrap.appendChild(p);
    setTimeout(() => p.remove(), duration * 1000 + 200);
  }

  function startPetals() {
    stopPetals();
    particleTimer = setInterval(spawnPetal, 450);
  }
  function stopPetals() {
    if (particleTimer) clearInterval(particleTimer);
    particleTimer = null;
    emoParticlesWrap.innerHTML = "";
  }

  let emotionalRunning = false;

  async function runEmotionalSequence() {
    if (emotionalRunning) return;
    emotionalRunning = true;

    // reset state
    $("#emoEyebrow").classList.remove("shown");
    $("#polaroid").classList.remove("shown");
    $$(".emo-message p").forEach((p) => p.classList.remove("shown"));
    $("#emoSign1").classList.remove("shown");
    $("#emoSign2").classList.remove("shown");
    $("#emoFinal").classList.remove("shown");
    $("#emoFinalSub").classList.remove("shown");
    $("#replayBtn").classList.remove("shown");

    startPetals();

    await wait(300);
    $("#emoEyebrow").classList.add("shown");

    await wait(700);
    $("#polaroid").classList.add("shown");

    await wait(1000);
    for (const p of $$(".emo-message p")) {
      await wait(650);
      p.classList.add("shown");
    }

    await wait(500);
    $("#emoSign1").classList.add("shown");
    await wait(400);
    $("#emoSign2").classList.add("shown");

    await wait(700);
    $("#emoFinal").classList.add("shown");
    await wait(350);
    $("#emoFinalSub").classList.add("shown");

    await wait(600);
    $("#replayBtn").classList.add("shown");

    emotionalRunning = false;
  }

  $("#replayBtn").addEventListener("click", () => {
    stopPetals();
    resetEverything();
  });

  /* ============================================================
     RESET / REPLAY
     ============================================================ */
  function resetEverything() {
    activityList.innerHTML = "";
    setRing(0);
    statusLine.textContent = statusMessages[0];
    waitBlock.classList.add("hidden");
    dodgeMsg.textContent = "\u00A0";
    btnNo.style.left = "";
    btnNo.style.top = "";
    dodgeIndex = 0;

    revealLines.forEach((l) => l.classList.remove("shown"));
    startQuizBtn.classList.remove("shown");

    truthLines.forEach((l) => l.classList.remove("shown"));
    giftBtn.classList.add("hidden");
    giftBtn.classList.remove("shown");

    goTo("1");
    runCleanupSequence();
  }

  /* ============================================================
     BOOT
     ============================================================ */
  runCleanupSequence();
})();
