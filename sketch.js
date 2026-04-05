let gridSize = 38; // 約 1cm (根據標準 96 DPI 計算)
let targetCol, targetRow;
let targetColor;
let gameState = 'START'; // 遊戲狀態：START 或 PLAYING
let startButton;
let lives = 3; // 生命值
let particles = []; // 用於存放特效粒子
let gridColors = []; // 用於存放每個方框的隨機顏色
let bombGrid = []; // 用於存放炸彈位置 (0: 無, 1: 有炸彈, 2: 爆炸中, 3: 已消失)
let bombExplosionTimes = []; // 記錄炸彈爆炸開始的時間
const palette = ['#edede9', '#d6ccc2', '#f5ebe0', '#e3d5ca', '#d5bdaf'];
let lastStateChangeFrame = -1; // 記錄最後一次狀態切換的格數
let gameStartTime; // 遊戲開始的時間戳
const gameDuration = 30; // 總時間 30 秒
const MARGIN = 38; // 1cm 邊距
const TOP_MARGIN = 114; // 3cm 上邊距
let screenShake = 0; // 畫面震動強度

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 建立開始遊戲按鈕
  startButton = createButton('開始遊戲');
  styleButton();
  startButton.mousePressed(startGame);
  
  initGame();
  positionButton();
}

function initGame() {
  // 計算扣除邊距後可容納的行列數
  let cols = floor((width - MARGIN * 2) / gridSize);
  let rows = floor((height - TOP_MARGIN - MARGIN) / gridSize);
  
  targetCol = floor(random(cols));
  targetRow = floor(random(rows));
  targetColor = color(0, 255, 100);
  particles = [];
  lives = 3;
  bombGrid = [];
  bombExplosionTimes = [];
  
  // 初始化方框顏色
  for (let i = 0; i < cols; i++) {
    gridColors[i] = [];
    bombGrid[i] = [];
    bombExplosionTimes[i] = [];
    for (let j = 0; j < rows; j++) {
      // 建立一個可用顏色的複本
      let availableColors = [...palette];
      
      // 檢查左邊的方塊顏色並排除
      if (i > 0) {
        let leftColor = gridColors[i - 1][j];
        availableColors = availableColors.filter(c => c !== leftColor);
      }
      
      // 檢查上方的方塊顏色並排除
      if (j > 0) {
        let topColor = gridColors[i][j - 1];
        availableColors = availableColors.filter(c => c !== topColor);
      }
      
      // 從剩餘的可用顏色中隨機挑選
      gridColors[i][j] = random(availableColors);
      bombGrid[i][j] = 0; // 預設無炸彈
      bombExplosionTimes[i][j] = 0;
    }
  }

  // 將炸彈數量設定為 30 個
  let numBombs = 50; 
  let bombsPlaced = 0;
  while (bombsPlaced < numBombs) {
    let rx = floor(random(cols));
    let ry = floor(random(rows));
    // 確保炸彈不放在目標物上，也不重複放置
    if ((rx !== targetCol || ry !== targetRow) && bombGrid[rx][ry] === 0) {
      bombGrid[rx][ry] = 1;
      bombsPlaced++;
    }
  }
}

function styleButton() {
  startButton.style('padding', '15px 40px');
  startButton.style('font-size', '28px');
  startButton.style('cursor', 'pointer');
  startButton.style('background-color', '#4CAF50');
  startButton.style('color', 'white');
  startButton.style('border', 'none');
  startButton.style('border-radius', '5px');
}

function positionButton() {
  // 置中按鈕位置
  let btnWidth = startButton.elt.offsetWidth; // 取得按鈕實際寬度以精確置中
  startButton.position(width / 2 - btnWidth / 2, height / 2 + 80);
}

function startGame() {
  gameState = 'PLAYING';
  gameStartTime = millis(); // 記錄開始毫秒數
  lastStateChangeFrame = frameCount; // 記錄切換為 PLAYING 的當下
  startButton.hide(); // 開始遊戲後隱藏按鈕
}

function draw() {
  // 不論什麼狀態都畫出底層背景與格線，增加視覺連續感
  background('#fefae0'); // 改用背景色，讓邊界感更統一

  // 處理畫面震動效果
  if (screenShake > 0) {
    push();
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake *= 0.85; // 震動衰減
    if (screenShake < 0.5) screenShake = 0;
  }

  let cols = gridColors.length;
  let rows = cols > 0 ? gridColors[0].length : 0;

  // 繪製遊戲區域內的方框
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let x = MARGIN + i * gridSize;
      let y = TOP_MARGIN + j * gridSize;

      if (gridColors[i] && gridColors[i][j]) {
        // 建立線性漸層：從左上到右下
        let c1 = color(gridColors[i][j]);
        let c2 = lerpColor(c1, color(0), 0.15); // 混合 15% 的黑色產生深色端
        
        let grad = drawingContext.createLinearGradient(x, y, x + gridSize, y + gridSize);
        grad.addColorStop(0, c1.toString());
        grad.addColorStop(1, c2.toString());
        
        drawingContext.fillStyle = grad;
        stroke(255, 50); // 稍微透明的白色邊框
        rect(x, y, gridSize, gridSize);
      }

      // 如果炸彈正在爆炸中（狀態 2），檢查是否超過 3 秒
      if (bombGrid[i] && bombGrid[i][j] === 2) {
        if (millis() - bombExplosionTimes[i][j] < 3000) {
          // 繪製精緻炸彈圖案
          push();
          translate(x + gridSize / 2, y + gridSize / 2 + 2); // 位移至格子中心
          
          // 1. 炸彈主體 (深色球體)
          noStroke();
          fill(40);
          ellipse(0, 0, gridSize * 0.65);
          
          // 2. 反光高光 (增加立體感)
          fill(120, 120, 120, 180);
          ellipse(-gridSize * 0.15, -gridSize * 0.15, gridSize * 0.15);
          
          // 3. 炸彈頂部接頭
          fill(60);
          rect(-gridSize * 0.1, -gridSize * 0.4, gridSize * 0.2, gridSize * 0.1);
          
          // 4. 彎曲的引信 (導火線)
          stroke(100, 70, 40); // 棕色
          strokeWeight(1.5);
          noFill();
          bezier(0, -gridSize * 0.4, 5, -gridSize * 0.55, 10, -gridSize * 0.35, 12, -gridSize * 0.5);
          
          // 5. 引信火花
          noStroke();
          fill(255, 200, 0); // 黃色火花
          ellipse(12, -gridSize * 0.5, 5, 5);
          fill(255, 50, 0); // 橘色中心
          ellipse(12, -gridSize * 0.5, 2, 2);
          pop();
        } else {
          // 超過 3 秒，設為狀態 3 (消失)
          bombGrid[i][j] = 3;
        }
      }
    }
  }

  if (gameState === 'PLAYING') {
    // 處理計時邏輯
    let elapsedTime = (millis() - gameStartTime) / 1000;
    let timeLeft = max(0, gameDuration - floor(elapsedTime));
    
    if (timeLeft <= 0) {
      gameState = 'TIME_UP';
    }

    // 繪製上方計時器文字
    textAlign(CENTER, TOP);
    fill(0);
    textSize(24);
    textStyle(BOLD);
    text("剩餘時間: " + timeLeft + "s", width / 2, 40);

    // 取得滑鼠目前所在的格子索引
    let mouseCol = floor((mouseX - MARGIN) / gridSize);
    let mouseRow = floor((mouseY - TOP_MARGIN) / gridSize);

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        let x = MARGIN + i * gridSize;
        let y = TOP_MARGIN + j * gridSize;

        if (i === mouseCol && j === mouseRow) {
          let d = dist(i, j, targetCol, targetRow);
          let circleSize = map(d, 0, 30, gridSize, 4);
          circleSize = constrain(circleSize, 4, gridSize);
          // 更改探測顏色：從紅改為白色漸層，並加入透明度
          let circleColor = lerpColor(color(255, 255, 255), targetColor, constrain(d / 15, 0, 1));
          circleColor.setAlpha(150); // 設定透明度 (0-255)
          noStroke();
          fill(circleColor);
          ellipse(x + gridSize / 2, y + gridSize / 2, circleSize);
        }
      }
    }
    drawDiamonds(); // 遊戲進行中顯示鑽石

    // 更新與繪製爆炸特效粒子 (確保炸彈爆炸時在遊戲畫面能看見)
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].show();
      if (particles[i].finished()) {
        particles.splice(i, 1);
      }
    }
  } else if (gameState === 'START') {
    drawOverlay();
  } else if (gameState === 'WON') {
    drawWinScreen();
  } else if (gameState === 'GAME_OVER') {
    drawGameOver();
  } else if (gameState === 'TIME_UP') {
    drawTimeUp();
  }
}

function mousePressed() {
  // 確保點擊不是在切換狀態的同一幀發生，防止「開始遊戲」按鈕的點擊誤傷生命值
  if (gameState === 'PLAYING' && frameCount > lastStateChangeFrame) {
    let mouseCol = floor((mouseX - MARGIN) / gridSize);
    let mouseRow = floor((mouseY - TOP_MARGIN) / gridSize);

    // 只有點擊在方框區域內才判斷
    let isInsideGrid = (mouseX >= MARGIN && mouseX < MARGIN + gridColors.length * gridSize &&
                        mouseY >= TOP_MARGIN && mouseY < TOP_MARGIN + (gridColors[0] ? gridColors[0].length : 0) * gridSize);

    if (!isInsideGrid) return;

    // 檢查是否點擊到目標方塊
    if (mouseCol === targetCol && mouseRow === targetRow) {
      gameState = 'WON';
      lastStateChangeFrame = frameCount;
      // 產生浮誇彩帶：從畫面上方隨機位置落下
      for (let i = 0; i < 300; i++) {
        particles.push(new Particle(random(width), random(-height, 0), 'WIN'));
      }
    } else if (bombGrid[mouseCol] && bombGrid[mouseCol][mouseRow] === 1) {
      // 點到炸彈：標記爆炸中、記錄時間、扣除生命並產生火花粒子
      bombGrid[mouseCol][mouseRow] = 2; 
      bombExplosionTimes[mouseCol][mouseRow] = millis();
      lives--;
      screenShake = 15; // 觸發強烈震動
      // 產生誇張爆炸粒子
      for (let i = 0; i < 80; i++) {
        particles.push(new Particle(mouseX, mouseY, 'BOMB'));
      }
      if (lives <= 0) gameState = 'GAME_OVER';
    } else if (bombGrid[mouseCol] && (bombGrid[mouseCol][mouseRow] === 2 || bombGrid[mouseCol][mouseRow] === 3)) {
      // 已經炸過或正在爆炸的格子，不重複扣血
      return;
    } else {
      // 確保點擊在畫布範圍內才扣血
      lives--;
      if (lives <= 0) gameState = 'GAME_OVER';
    }

    // 如果是在震動狀態，在結尾結束 translate
    if (screenShake > 0) {
      pop();
    }
  } else if (gameState === 'WON' || gameState === 'GAME_OVER' || gameState === 'TIME_UP') {
    // 在勝利畫面點擊滑鼠可重回開始畫面
    gameState = 'START';
    initGame();
    startButton.show();
  }
}

function drawOverlay() {
  // 繪製全螢幕背景
  fill('#fefae0');
  noStroke();
  rect(0, 0, width, height);

  // 繪製裝飾圖案 - 左上角放大鏡
  push();
  translate(width * 0.15, height * 0.25);
  rotate(-QUARTER_PI);
  // 手把
  stroke('#5e503f');
  strokeWeight(8);
  line(0, 20, 0, 50);
  // 框
  noStroke();
  fill('#d6ccc2');
  ellipse(0, 0, 50);
  // 鏡面
  fill(255, 255, 255, 150);
  ellipse(0, 0, 35);
  pop();

  // 繪製裝飾圖案 - 右下角寶藏箱
  push();
  translate(width * 0.85, height * 0.75);
  // 箱體
  fill('#8d6e63');
  rectMode(CENTER);
  rect(0, 10, 70, 45, 5);
  // 蓋子
  fill('#5d4037');
  arc(0, -10, 70, 50, PI, TWO_PI);
  // 鎖頭 (金黃色)
  fill('#ffd700');
  rect(0, 0, 12, 15, 2);
  // 一些閃爍的金幣效果
  if (frameCount % 60 < 30) {
    fill('#ffeb3b');
    noStroke();
    ellipse(-20, -15, 8);
    ellipse(25, -10, 8);
  }
  pop();

  // 繪製裝飾圖案 - 動態腳印 (從左下往中間延展)
  for (let i = 0; i < 6; i++) {
    // 利用 sin 函數讓腳印依序閃爍出現，模擬走路的動態感
    let stepAlpha = map(sin(frameCount * 0.05 - i * 0.8), 0, 1, 0, 120);
    if (stepAlpha > 0) {
      push();
      let stepX = 40 + i * 35; // 靠近左側邊緣
      let stepY = height - 60 - i * 20; // 靠近底部邊緣
      translate(stepX, stepY);
      rotate(i % 2 === 0 ? -0.3 : 0.3); // 左右腳交替角度
      noStroke();
      fill(94, 80, 63, stepAlpha); // 使用小標題的顏色並帶入動態透明度
      // 腳掌
      ellipse(0, 0, 12, 20);
      // 五個腳趾
      ellipse(-5, -12, 4, 6);
      ellipse(-1, -14, 4, 6);
      ellipse(3, -13, 3, 5);
      ellipse(6, -11, 2, 4);
      ellipse(8, -8, 2, 3);
      pop();
    }
  }

  // 標題與小標題
  textAlign(CENTER, CENTER);

  // 設定標題顏色並增加閃爍特效 (透過 sin 函數控制透明度)
  let tCol = color('#6c584c');
  let blinkAlpha = map(sin(frameCount * 0.1), -1, 1, 100, 255);
  tCol.setAlpha(blinkAlpha);
  fill(tCol);

  textSize(48);
  textStyle(BOLD);
  text("色塊尋寶", width / 2, height / 2 - 80);
  
  textSize(24);
  textStyle(NORMAL);
  fill('#5e503f');
  text("提示: 30秒內找到隱藏的方塊", width / 2, height / 2 + 10);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initGame(); // 重新計算方框顏色以符合新視窗大小
  if (gameState === 'START') {
    positionButton();
  }
}

function drawWinScreen() {
  // 繪製全螢幕背景，覆蓋掉底層的格線
  fill('#fefae0');
  noStroke();
  rect(0, 0, width, height);

  // 更新與繪製粒子特效 (噴發彩帶)
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    // 當粒子完全透明時從陣列移除，節省效能
    if (particles[i].finished()) {
      particles.splice(i, 1);
    }
  }

  // 顯示任務完成文字
  textAlign(CENTER, CENTER);
  fill(0);
  textSize(48);
  textStyle(BOLD);
  text("任務完成！", width / 2, height / 2 - 20);

  textSize(18);
  textStyle(NORMAL);
  fill('#5e503f');
  text("點擊畫面重新開始", width / 2, height / 2 + 40);
}

function drawGameOver() {
  // 繪製全螢幕背景
  fill('#fefae0');
  noStroke();
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill(0);
  textSize(48);
  textStyle(BOLD);
  text("遊戲結束", width / 2, height / 2 - 20);

  textSize(18);
  textStyle(NORMAL);
  fill('#5e503f');
  text("生命值耗盡，點擊畫面重新開始", width / 2, height / 2 + 40);
}

function drawTimeUp() {
  // 繪製全螢幕背景
  fill('#fefae0');
  noStroke();
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  fill('#bc6c25'); // 使用深土黃色強調失敗
  textSize(48);
  textStyle(BOLD);
  text("挑戰失敗", width / 2, height / 2 - 20);

  textSize(18);
  textStyle(NORMAL);
  fill('#5e503f');
  text("時間到！點擊畫面重新開始", width / 2, height / 2 + 40);
}

function drawDiamonds() {
  for (let i = 0; i < 3; i++) {
    // 由右向左排列
    let x = width - 50 - i * 50;
    let y = 50;
    let size = 30;

    noStroke();
    // 判斷是否還有剩餘生命，顯示不同顏色
    if (i < lives) {
      fill(100, 210, 255); // 水藍色的鑽石
    } else {
      fill(180, 180, 180, 80); // 灰色的空位
    }

    push();
    translate(x, y);
    // 繪製寶石主體
    beginShape();
    vertex(-size / 2, -size / 8); // 左緣
    vertex(-size / 4, -size / 2); // 左上
    vertex(size / 4, -size / 2);  // 右上
    vertex(size / 2, -size / 8);  // 右緣
    vertex(0, size / 2);          // 下尖端
    endShape(CLOSE);

    // 加入簡單的切面反光線條
    if (i < lives) {
      stroke(255, 150); // 半透明白色
      strokeWeight(1);
      line(-size / 2, -size / 8, size / 2, -size / 8);
      line(0, size / 2, -size / 4, -size / 2);
      line(0, size / 2, size / 4, -size / 2);
    }
    pop();
  }
}

// 定義粒子類別，用於製作勝利時的特效
class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type; // 'WIN' 或 'BOMB'
    this.alpha = 255;

    if (this.type === 'BOMB') {
      // 爆炸粒子：放射狀運動
      let angle = random(TWO_PI);
      let speed = random(5, 15);
      this.vx = cos(angle) * speed;
      this.vy = sin(angle) * speed;
      this.size = random(10, 25); // 初始較大
      this.decay = random(5, 10); // 消失速度快
    } else {
      // 勝利彩帶：從上往下飄落，帶有搖擺感
      this.vx = random(-2, 2);
      this.vy = random(2, 6);
      this.w = random(5, 12);   // 彩帶寬度
      this.h = random(10, 20);  // 彩帶長度
      this.angle = random(TWO_PI);
      this.angVel = random(-0.1, 0.1);
      this.decay = random(1, 3);
      this.color = color(random(255), random(255), random(255));
    }
  }

  finished() { return this.alpha < 0; }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    if (this.type === 'BOMB') {
      this.vx *= 0.92; // 空氣阻力
      this.vy *= 0.92;
      this.size *= 0.9; // 快速縮小
    } else {
      this.x += sin(frameCount * 0.1) * 0.5; // 額外的左右搖擺感
      this.angle += this.angVel;
    }
    this.alpha -= this.decay;
  }

  show() {
    noStroke();
    if (this.type === 'BOMB') {
      // 根據剩餘壽命改變顏色：白 -> 黃 -> 紅 -> 灰
      if (this.alpha > 200) fill(255, 255, 200, this.alpha);
      else if (this.alpha > 150) fill(255, 200, 50, this.alpha);
      else if (this.alpha > 80) fill(200, 50, 0, this.alpha);
      else fill(100, 100, 100, this.alpha);
      
      ellipse(this.x, this.y, this.size);
    } else {
      push();
      translate(this.x, this.y);
      rotate(this.angle);
      fill(red(this.color), green(this.color), blue(this.color), this.alpha);
      rectMode(CENTER);
      rect(0, 0, this.w, this.h);
      pop();
    }
  }
}
