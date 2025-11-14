let quizTable;
let allQuestions = [];
let selectedQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let quizState = 'loading'; // 'loading', 'error', 'start', 'quiz', 'feedback', 'result'
let canRestart = false; 

// 全域常數
const MAX_QUIZ_QUESTIONS = 3; 
const MAX_SCORE = 100;
const FEEDBACK_DURATION = 90; // 回饋顯示的幀數 (約 1.5 秒 @ 60fps)

// 可愛設計相關變數
let optionButtons = [];
let feedbackMessage = ""; 
let feedbackStartTime = 0; 
let isCorrect = false; 

let bgColor1, bgColor2; 
let primaryTextColor; 
let buttonColor, buttonHoverColor; 
let correctColor, wrongColor; 

let cuteFont; // 預載入字體變數

function preload() {
  try {
    quizTable = loadTable('questions.csv', 'csv', 'header');
    
    // *** 關鍵修改：載入 .otf 檔案 ***
    try {
      cuteFont = loadFont('assets/CuteFont-Regular.otf'); 
    } catch(e) {
      console.warn("字體檔案載入失敗，將使用預設字體。", e);
      cuteFont = null;
    }
    
  } catch (error) {
    console.error("CSV 檔案載入失敗:", error);
    quizTable = null;
  }
}

// ------------------- 設置與錯誤檢查 -------------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 設定顏色
  bgColor1 = color(173, 216, 230); 
  bgColor2 = color(255, 223, 186); 
  primaryTextColor = color(50);   
  buttonColor = color(100, 180, 255); 
  buttonHoverColor = color(70, 150, 220); 
  correctColor = color(60, 180, 70); 
  wrongColor = color(255, 100, 100); 

  textAlign(CENTER, CENTER); 
  
  // 只有在字體物件存在且有效時，才設定字體
  if (cuteFont && cuteFont.textStyle) { 
    textFont(cuteFont); 
  }
  updateTextSize(); 

  // 檢查 CSV 載入狀態 
  if (quizTable && quizTable.getRowCount() >= MAX_QUIZ_QUESTIONS) {
    parseQuestions();
    selectRandomQuestions();
    quizState = 'start'; 
  } else if (quizTable && quizTable.getRowCount() > 0) {
    console.warn(`題庫不足 ${MAX_QUIZ_QUESTIONS} 題，實際選取 ${quizTable.getRowCount()} 題。`);
    parseQuestions();
    selectRandomQuestions();
    quizState = 'start'; 
  } else {
    console.error("【嚴重錯誤】: CSV 檔案不存在或內容為空。請檢查 'questions.csv'。");
    quizState = 'error'; 
  }

  // 建立選項按鈕並應用可愛樣式
  for (let i = 0; i < 3; i++) {
    let button = createButton('');
    button.mousePressed(() => handleAnswer(String.fromCharCode(65 + i)));
    
    // 可愛按鈕樣式
    button.style('background-color', buttonColor.toString());
    button.style('color', 'white');
    button.style('border-radius', '25px'); 
    button.style('box-shadow', '3px 3px 5px rgba(0,0,0,0.2)'); 
    button.style('border', 'none');
    
    button.mouseOver(() => button.style('background-color', buttonHoverColor.toString()));
    button.mouseOut(() => button.style('background-color', buttonColor.toString()));
    
    optionButtons.push(button);
  }

  updateButtons();
  hideButtons();
}

// ------------------- 核心迴圈 -------------------

function draw() {
  drawGradientBackground();

  if (quizState === 'loading') {
    fill(primaryTextColor);
    text('正在努力載入中...', windowWidth / 2, windowHeight / 2);
  } else if (quizState === 'error') {
    displayErrorScreen();
  } else if (quizState === 'start') {
    displayStartScreen();
  } else if (quizState === 'quiz') {
    displayQuestion();
    displayScore(); 
  } else if (quizState === 'feedback') {
    displayFeedback(); 
  } else if (quizState === 'result') {
    displayResultScreen(); 
  }
}

// ------------------- 響應式處理 -------------------

function updateTextSize() {
  let newSize = windowWidth * 0.035;
  if (newSize < 16) newSize = 16; 
  if (newSize > 25) newSize = 25; 
  textSize(newSize);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateTextSize();
  updateButtons();
}

function updateButtons() {
  let buttonW = min(windowWidth * 0.7, 400); 
  let buttonH = 50; 
  const startY = windowHeight * 0.55; 
  const spacing = buttonH + 15; 

  for (let i = 0; i < optionButtons.length; i++) {
    let button = optionButtons[i];
    button.size(buttonW, buttonH);
    
    let buttonFontSize = min(buttonW * 0.045, 18);
    button.style('font-size', `${buttonFontSize}px`);

    button.position(
      windowWidth / 2 - buttonW / 2, 
      startY + i * spacing 
    );
  }
}

// ------------------- 測驗邏輯 -------------------

function handleAnswer(selectedOption) {
  if (quizState !== 'quiz') return;
  hideButtons(); 

  let currentQ = selectedQuestions[currentQuestionIndex];
  
  if (currentQ && selectedOption === currentQ.correct) {
    score++;
    isCorrect = true;
    feedbackMessage = "答對囉!";
  } else {
    isCorrect = false;
    feedbackMessage = "噢不，沒關係!再接再厲";
  }

  feedbackStartTime = frameCount; 
  quizState = 'feedback'; 
}

function mousePressed() {
  if (quizState === 'start') {
    quizState = 'quiz';
    updateButtonsText();
    canRestart = false; 
  } 
  else if (quizState === 'result' && canRestart) { 
    score = 0;
    currentQuestionIndex = 0;
    selectRandomQuestions();
    quizState = 'quiz';
    updateButtonsText();
    canRestart = false; 
  }
}

// ------------------- 輔助函式 -------------------

function parseQuestions() {
  let rowCount = quizTable.getRowCount();
  for (let i = 0; i < rowCount; i++) {
    let row = quizTable.getRow(i);
    allQuestions.push({
      question: row.getString('question'),
      optionA: row.getString('optionA'),
      optionB: row.getString('optionB'),
      optionC: row.getString('optionC'),
      correct: row.getString('correct')
    });
  }
}

function selectRandomQuestions() {
  const numToSelect = min(MAX_QUIZ_QUESTIONS, allQuestions.length); 
  let tempQuestions = [...allQuestions]; 
  selectedQuestions = [];

  for (let i = 0; i < numToSelect; i++) {
    let randomIndex = floor(random(tempQuestions.length));
    selectedQuestions.push(tempQuestions[randomIndex]);
    tempQuestions.splice(randomIndex, 1); 
  }
}

function updateButtonsText() {
  if (quizState !== 'quiz' || currentQuestionIndex >= selectedQuestions.length) return; 

  let currentQ = selectedQuestions[currentQuestionIndex];
  
  optionButtons[0].html(`A: ${currentQ.optionA || '選項A遺失'}`);
  optionButtons[1].html(`B: ${currentQ.optionB || '選項B遺失'}`);
  optionButtons[2].html(`C: ${currentQ.optionC || '選項C遺失'}`);
}

function hideButtons() {
  for (let button of optionButtons) {
    button.hide();
  }
}

function showButtons() {
  for (let button of optionButtons) {
    button.show();
  }
}

// ------------------- 顯示畫面 -------------------

function drawGradientBackground() {
  noStroke();
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(bgColor1, bgColor2, inter);
    fill(c);
    rect(0, y, width, 1);
  }
}

function displayErrorScreen() {
    fill(wrongColor);
    text('測驗載入失敗！', windowWidth / 2, windowHeight / 2 - 50);
    fill(primaryTextColor);
    text('請檢查 "questions.csv" 檔案是否遺失或格式錯誤。', windowWidth / 2, windowHeight / 2);
    hideButtons();
}

function displayStartScreen() {
  fill(primaryTextColor);
  text('歡迎參加測驗！', windowWidth / 2, windowHeight / 2 - windowHeight * 0.1);
  text('點擊畫面任何地方開始', windowWidth / 2, windowHeight / 2);
  hideButtons();
}

function displayScore() {
  textAlign(RIGHT, TOP); 
  fill(primaryTextColor);
  const totalQuestions = selectedQuestions.length > 0 ? selectedQuestions.length : 3;
  const currentTotalScore = floor((score / totalQuestions) * MAX_SCORE); 

  if (quizState === 'quiz') {
      text(`分數：${currentTotalScore} / ${MAX_SCORE}`, windowWidth - 20, 20);
  }
  
  textAlign(CENTER, CENTER);
}

function displayQuestion() {
  let currentQ = selectedQuestions[currentQuestionIndex];
  fill(primaryTextColor);

  text(`第 ${currentQuestionIndex + 1} 題 / 共 ${selectedQuestions.length} 題`, windowWidth / 2, windowHeight * 0.1);
  text(currentQ ? currentQ.question : "載入錯誤：題目遺失", windowWidth / 2, windowHeight * 0.3);

  updateButtonsText();
  showButtons();
}

function displayFeedback() {
  const elapsedFrames = frameCount - feedbackStartTime;

  let scaleFactor = 1 + sin(elapsedFrames * 0.1) * 0.1; 
  let alpha = map(elapsedFrames, 0, FEEDBACK_DURATION, 255, 0); 

  if (isCorrect) {
    fill(red(correctColor), green(correctColor), blue(correctColor), alpha); 
    drawStars(windowWidth / 2, windowHeight / 2, elapsedFrames);
  } else {
    fill(red(wrongColor), green(wrongColor), blue(wrongColor), alpha); 
  }

  textSize(min(windowWidth * 0.06 * scaleFactor, 50));
  text(feedbackMessage, windowWidth / 2, windowHeight / 2);

  updateTextSize();
  fill(primaryTextColor); 

  if (elapsedFrames >= FEEDBACK_DURATION) {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= selectedQuestions.length) {
      quizState = 'result'; 
      canRestart = false; 
      setTimeout(() => {
        canRestart = true;
      }, 500); 
    } else {
      quizState = 'quiz'; 
      updateButtonsText();
    }
  }
}

function drawStars(x, y, elapsedFrames) {
  let numStars = 6;
  let maxRadius = map(elapsedFrames, 0, FEEDBACK_DURATION, 0, 100); 
  let starAlpha = map(elapsedFrames, 0, FEEDBACK_DURATION, 255, 0);

  push(); 
  translate(x, y); 
  noStroke();
  fill(255, 255, 0, starAlpha); 

  for (let i = 0; i < numStars; i++) {
    let angle = map(i, 0, numStars, 0, TWO_PI);
    let starX = cos(angle + elapsedFrames * 0.05) * maxRadius * random(0.5, 1); 
    let starY = sin(angle + elapsedFrames * 0.05) * maxRadius * random(0.5, 1);
    ellipse(starX, starY, 10 * map(elapsedFrames, 0, FEEDBACK_DURATION, 1, 0.5)); 
  }
  pop(); 
}


function displayResultScreen() {
  hideButtons(); 
  
  const totalQuestions = selectedQuestions.length;
  const finalTotalScore = floor((score / totalQuestions) * MAX_SCORE);
  
  fill(primaryTextColor);
  textSize(windowWidth * 0.05 > 35 ? 35 : windowWidth * 0.05);
  text('結束測驗', windowWidth / 2, windowHeight / 2 - windowHeight * 0.1);
  
  updateTextSize(); 
  text(`最終分數： ${finalTotalScore} / ${MAX_SCORE}`, windowWidth / 2, windowHeight / 2);
  
  if (canRestart) {
    text('點擊畫面重新開始', windowWidth / 2, windowHeight / 2 + windowHeight * 0.1);
  } else {
    text('準備結束...', windowWidth / 2, windowHeight / 2 + windowHeight * 0.1);
  }
}