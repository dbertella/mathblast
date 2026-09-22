const introPanel = document.querySelector('#intro-panel');
const gamePanel = document.querySelector('#game-panel');
const resultsPanel = document.querySelector('#results-panel');
const startButton = document.querySelector('#start-button');
const replayButton = document.querySelector('#replay-button');
const answerForm = document.querySelector('#answer-form');
const answerInput = document.querySelector('#answer-input');
const questionText = document.querySelector('#question-text');
const feedback = document.querySelector('#feedback');
const timerValue = document.querySelector('#timer-value');
const timerFill = document.querySelector('#timer-fill');
const scoreValue = document.querySelector('#score-value');
const streakValue = document.querySelector('#streak-value');
const questionCard = document.querySelector('#question-card');
const homeLink = document.querySelector('#home-link');
const operationInputs = [...document.querySelectorAll('.operation-option input')];
const operationError = document.querySelector('#operation-error');
const tableInputs = [...document.querySelectorAll('.table-option input')];
const tableError = document.querySelector('#table-error');
const musicToggle = document.querySelector('#music-toggle');
const musicLabel = document.querySelector('#music-label');

let currentQuestion;
let timerId;
let endAt;
let roundSeconds = 60;
let score = 0;
let streak = 0;
let bestStreak = 0;
let answers = [];
let acceptingAnswers = false;
let selectedOperations = ['×', '÷', '+', '-'];
let selectedTables = Array.from({ length: 12 }, (_, index) => index + 1);
let musicContext;
let musicMaster;
let musicTimer;
let musicStep = 0;

const melodyNotes = [659.25, 783.99, 987.77, 783.99, 587.33, 659.25, 783.99, 523.25, 587.33, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25, 493.88];
const bassNotes = [164.81, 196, 220, 196, 146.83, 164.81, 196, 130.81];

function playChiptuneNote(frequency, start, duration, type, volume) {
  const oscillator = musicContext.createOscillator();
  const gain = musicContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(musicMaster);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function startMusic() {
  if (!musicToggle.checked) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!musicContext) {
    musicContext = new AudioContextClass();
    musicMaster = musicContext.createGain();
    musicMaster.gain.value = 0.045;
    musicMaster.connect(musicContext.destination);
  }
  musicContext.resume();
  musicMaster.gain.setTargetAtTime(0.045, musicContext.currentTime, 0.03);
  if (musicTimer) return;
  musicStep = 0;
  const scheduleBeat = () => {
    const start = musicContext.currentTime + 0.03;
    playChiptuneNote(melodyNotes[musicStep % melodyNotes.length], start, 0.14, 'square', 0.18);
    if (musicStep % 2 === 0) playChiptuneNote(bassNotes[(musicStep / 2) % bassNotes.length], start, 0.27, 'triangle', 0.15);
    musicStep += 1;
  };
  scheduleBeat();
  musicTimer = setInterval(scheduleBeat, 220);
}

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (musicMaster && musicContext) musicMaster.gain.setTargetAtTime(0, musicContext.currentTime, 0.03);
}

function goHome(event) {
  event.preventDefault();
  clearInterval(timerId);
  acceptingAnswers = false;
  stopMusic();
  gamePanel.classList.add('hidden');
  resultsPanel.classList.add('hidden');
  introPanel.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function makeQuestion() {
  const operator = selectedOperations[randomInt(0, selectedOperations.length - 1)];
  const table = selectedTables[randomInt(0, selectedTables.length - 1)];
  let left = table;
  let right = randomInt(1, 12);
  let answer;
  if (operator === '×') answer = left * right;
  if (operator === '+') { right = selectedTables[randomInt(0, selectedTables.length - 1)]; answer = left + right; }
  if (operator === '-') { right = selectedTables[randomInt(0, selectedTables.length - 1)]; if (right > left) [left, right] = [right, left]; answer = left - right; }
  if (operator === '÷') { answer = randomInt(1, 12); left = table * answer; right = table; }
  return { left, right, operator, answer, text: `${left} ${operator} ${right}` };
}

function showQuestion() {
  currentQuestion = makeQuestion();
  questionText.innerHTML = `${currentQuestion.text} <span>=</span> ?`;
  answerInput.value = '';
  if (window.matchMedia('(min-width: 601px)').matches) answerInput.focus();
}

function updateStats() {
  scoreValue.textContent = String(score).padStart(4, '0');
  streakValue.innerHTML = `${streak} <i>×</i>`;
}

function startGame() {
  selectedOperations = operationInputs.filter((input) => input.checked).map((input) => input.value);
  selectedTables = tableInputs.filter((input) => input.checked).map((input) => Number(input.value));
  const hasOperations = selectedOperations.length > 0;
  const hasTables = selectedTables.length > 0;
  operationError.textContent = hasOperations ? '' : 'Choose at least one mission type to launch!';
  tableError.textContent = hasTables ? '' : 'Choose at least one table to launch!';
  if (!hasOperations || !hasTables) {
    return;
  }
  clearInterval(timerId);
  introPanel.classList.add('hidden');
  resultsPanel.classList.add('hidden');
  gamePanel.classList.remove('hidden');
  score = 0; streak = 0; bestStreak = 0; answers = []; acceptingAnswers = true;
  updateStats();
  timerValue.textContent = roundSeconds;
  timerFill.style.width = '100%';
  feedback.textContent = '';
  feedback.className = 'feedback';
  showQuestion();
  startMusic();
  endAt = Date.now() + roundSeconds * 1000;
  timerId = setInterval(updateTimer, 100);
}

function updateTimer() {
  const remaining = Math.max(0, endAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  timerValue.textContent = seconds;
  timerFill.style.width = `${(remaining / (roundSeconds * 1000)) * 100}%`;
  if (seconds <= 10) timerFill.style.background = 'var(--red)';
  if (remaining <= 0) finishGame();
}

function submitAnswer(event) {
  event.preventDefault();
  if (!acceptingAnswers || !answerInput.value.trim()) return;
  const value = Number(answerInput.value);
  const correct = value === currentQuestion.answer;
  answers.push({ ...currentQuestion, given: value, correct });
  if (correct) {
    score += 10 + streak * 2;
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    feedback.textContent = streak > 2 ? `NICE! ${streak} IN A ROW!` : 'CORRECT! + POINTS';
    feedback.className = 'feedback good';
  } else {
    streak = 0;
    feedback.textContent = `NOT QUITE — THE ANSWER IS ${currentQuestion.answer}`;
    feedback.className = 'feedback bad';
  }
  updateStats();
  questionCard.classList.remove('flash-good', 'flash-bad');
  void questionCard.offsetWidth;
  questionCard.classList.add(correct ? 'flash-good' : 'flash-bad');
  setTimeout(() => { if (acceptingAnswers) { feedback.textContent = ''; feedback.className = 'feedback'; showQuestion(); } }, 450);
}

function finishGame() {
  if (!acceptingAnswers) return;
  acceptingAnswers = false;
  clearInterval(timerId);
  stopMusic();
  timerValue.textContent = '0';
  timerFill.style.width = '0%';
  const correctCount = answers.filter((answer) => answer.correct).length;
  const wrongCount = answers.length - correctCount;
  const accuracy = answers.length ? Math.round((correctCount / answers.length) * 100) : 0;
  document.querySelector('#result-score').textContent = score;
  document.querySelector('#correct-count').textContent = correctCount;
  document.querySelector('#wrong-count').textContent = wrongCount;
  document.querySelector('#accuracy-value').textContent = `${accuracy}%`;
  document.querySelector('#best-streak').textContent = bestStreak;
  document.querySelector('#review-count').textContent = `${answers.length} MISSIONS`;
  document.querySelector('#result-message').textContent = answers.length === 0 ? 'Every great mission starts with a launch.' : accuracy >= 80 ? 'Your brain was in turbo mode the whole way.' : 'Every answer is a rep — ready for another round?';
  document.querySelector('#review-list').innerHTML = answers.length ? answers.map((item) => `<div class="review-item ${item.correct ? '' : 'bad'}"><div class="review-equation">${item.text} = ${item.answer}<small>${item.correct ? 'You answered ' + item.given : 'You answered ' + item.given + ' · correct was ' + item.answer}</small></div><span class="review-mark">${item.correct ? '✓' : '×'}</span></div>`).join('') : '<div class="review-item" style="grid-column:1/-1">No missions launched yet.</div>';
  gamePanel.classList.add('hidden');
  resultsPanel.classList.remove('hidden');
}

document.querySelectorAll('.keypad button').forEach((button) => button.addEventListener('click', () => {
  const key = button.dataset.key;
  if (key === 'clear') answerInput.value = '';
  else if (key === 'back') answerInput.value = answerInput.value.slice(0, -1);
  else if (answerInput.value.length < 3) answerInput.value += key;
}));

operationInputs.forEach((input) => input.addEventListener('change', () => {
  const hasSelection = operationInputs.some((option) => option.checked);
  operationError.textContent = hasSelection ? '' : 'Choose at least one mission type to launch!';
}));

tableInputs.forEach((input) => input.addEventListener('change', () => {
  const hasSelection = tableInputs.some((option) => option.checked);
  tableError.textContent = hasSelection ? '' : 'Choose at least one table to launch!';
}));

musicToggle.addEventListener('change', () => {
  musicLabel.textContent = musicToggle.checked ? 'MUSIC ON' : 'MUSIC OFF';
  if (musicToggle.checked && acceptingAnswers) startMusic();
  else if (!musicToggle.checked) stopMusic();
});

document.addEventListener('keydown', (event) => {
  if (!acceptingAnswers || document.activeElement === answerInput) return;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    if (answerInput.value.length < 3) answerInput.value += event.key;
  } else if (event.key === 'Backspace') {
    event.preventDefault();
    answerInput.value = answerInput.value.slice(0, -1);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    answerInput.value = '';
  } else if (event.key === 'Enter') {
    event.preventDefault();
    answerForm.requestSubmit();
  }
});

startButton.addEventListener('click', startGame);
replayButton.addEventListener('click', startGame);
answerForm.addEventListener('submit', submitAnswer);
homeLink.addEventListener('click', goHome);
