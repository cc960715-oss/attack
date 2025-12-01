// --- 全域變數 ---
let sheet1;             // 1020004-removebg-preview.png (飛行)
let sheet2;             // 1020005-removebg-preview.png (單幀待機)
let sheet3;             // 1110006-removebg-preview.png (跳躍)
let sheet4;             // 11120009-removebg-preview.png (行走/待機輔助)
let sheet5;             // 23051-removebg-preview.png (左攻擊) 
let sheet6;             // 230X51-removebg-preview.png (右攻擊) 
let bulletImgR;         // 16-removebg-preview.png (右攻擊子彈圖)
let bulletImgL;         // 24-removebg-preview.png (左攻擊子彈圖)

// 每幀尺寸：
let frameSize1 = { w: 55, h: 60 };  // sheet1 (飛行)
let frameSize2 = { w: 50, h: 60 };  // sheet2 (主待機)
let frameSize3 = { w: 47.2, h: 60 }; // sheet3 (跳躍)
let frameSize4 = { w: 47, h: 60 };  // sheet4 (行走)
let frameSize5 = { w: 45, h: 51 };  // sheet5 (左攻擊) 
let frameSize6 = { w: 45, h: 51 };  // sheet6 (右攻擊) 
let bulletSize = { w: 24, h: 10 };  // 統一子彈尺寸

// 使用最大的高度來計算地面 Y 座標
let maxHeight = Math.max(frameSize1.h, frameSize2.h, frameSize3.h, frameSize4.h, frameSize5.h, frameSize6.h); 
let charSize = { w: frameSize1.w, h: frameSize1.h }; 

let imgScale = 3;       
let xPos;
let yPos;
let moveSpeed = 4;
let frameRateFactor = 5; 

// 物理變數
let gravity = 0.5;      
let jumpForce = -10;    
let jumpVelocity = 0;   
let groundY;            
let groundRatio = 0.25; 
let isJumping = false;  
let upwardThrust = -0.3; 

// 角色狀態管理
let state = 'idle';     
let currentFrame = 0;
let facingDirection = 1; 
let prevState = '';     
let attackLocked = false; 
let isAttacking = false; // 新增：用於追蹤滑鼠按下的攻擊狀態

// 飛行狀態追蹤
let isFlying = false; 

// 子彈系統追蹤
let bullets = [];        
let bulletSpeed = 15;   

// 動畫幀序列
let idleFrames = []; 
let walkFrames = [];   
let jumpFrames = [];    
let flyFrames = [];     
let attackFramesR = []; 
let attackFramesL = []; 

// --- 雲朵相關變數 ---
let clouds = [];        
let numClouds = 5;      
let cloudSpeed = 0.5;   

/**
 * 預載入圖片
 */
function preload() {
  sheet1 = loadImage('1020004-removebg-preview.png');
  sheet2 = loadImage('1020005-removebg-preview.png');
  sheet3 = loadImage('1110006-removebg-preview.png'); 
  sheet4 = loadImage('11120009-removebg-preview.png'); 
  sheet5 = loadImage('23051-removebg-preview.png');   
  sheet6 = loadImage('230X51-removebg-preview.png'); 
  bulletImgR = loadImage('16-removebg-preview.png');   
  bulletImgL = loadImage('24-removebg-preview.png');   
}

/**
 * 初始化畫布與動畫幀
 */
function setup() {
  createCanvas(windowWidth, windowHeight); 
  
  let groundHeight = height * groundRatio;
  let groundLineY = height - groundHeight;
  let halfHeight = maxHeight * imgScale / 2;
  groundY = groundLineY - halfHeight; 
  
  yPos = groundY; 
  xPos = width / 2;
  imageMode(CENTER);
  frameRate(60); 

  // --- 組合動畫幀序列 ---
  idleFrames.push({ img: sheet2, x: 0, y: 0, w: frameSize2.w, h: frameSize2.h }); 
  walkFrames.push({ img: sheet4, x: 0 * frameSize4.w, y: 0, w: frameSize4.w, h: frameSize4.h });
  walkFrames.push({ img: sheet4, x: 1 * frameSize4.w, y: 0, w: frameSize4.w, h: frameSize4.h });
  jumpFrames.push({ img: sheet3, x: 2 * frameSize3.w, y: 0, w: frameSize3.w, h: frameSize3.h }); 
  jumpFrames.push({ img: sheet3, x: 3 * frameSize3.w, y: 0, w: frameSize3.w, h: frameSize3.h }); 
  flyFrames.push({ img: sheet1, x: 0 * frameSize1.w, y: 0, w: frameSize1.w, h: frameSize1.h }); 
  flyFrames.push({ img: sheet1, x: 2 * frameSize1.w, y: 0, w: frameSize1.w, h: frameSize1.h }); 
  
  // 右攻擊動畫：只取 sheet6 的第四幀 (索引 3)
  attackFramesR.push({ img: sheet6, x: 3 * frameSize6.w, y: 0, w: frameSize6.w, h: frameSize6.h }); 
  
  // 左攻擊動畫：只取 sheet5 的第二幀 (索引 1)
  attackFramesL.push({ img: sheet5, x: 1 * frameSize5.w, y: 0, w: frameSize5.w, h: frameSize5.h }); 

  // --- 初始化雲朵 ---
  for (let i = 0; i < numClouds; i++) {
    clouds.push(createCloud());
  }
}

/**
 * 調整視窗大小時，同步調整畫布大小和地面位置
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  
  let groundHeight = height * groundRatio;
  let groundLineY = height - groundHeight;
  let charHalfHeight = maxHeight * imgScale / 2;
  
  groundY = groundLineY - charHalfHeight;
  
  yPos = constrain(yPos, charHalfHeight, groundY);
  xPos = constrain(xPos, charHalfHeight, width - charHalfHeight);
  
  // 重新佈局雲朵
  for (let i = 0; i < numClouds; i++) {
    clouds[i] = createCloud(random(width)); 
  }
}


/**
 * 繪製迴圈
 */
function draw() {
  // *** 1. 繪製天空與地板 ***
  let groundHeight = height * groundRatio;
  let groundLineY = height - groundHeight;
  
  // 天空 (淺藍色)
  background(135, 206, 250); 

  // --- 繪製雲朵 ---
  for (let i = 0; i < clouds.length; i++) {
    drawCloud(clouds[i]);
    moveCloud(clouds[i]);
  }
  
  // 地板 (綠色)
  noStroke();
  fill(34, 139, 34); // Forest Green
  rect(0, groundLineY, width, groundHeight);
  
  // 2. 處理狀態和物理
  state = 'idle'; 
  isFlying = false; 

  // --- 處理滑鼠攻擊狀態 (新增/修改) ---
  if (mouseIsPressed && mouseButton === LEFT) {
    // 滑鼠按下，進入攻擊狀態
    if (state !== 'attack') {
      state = 'attack';
      currentFrame = 0; 
      attackLocked = false; // 準備發射子彈
    }
    isAttacking = true;
  } else if (isAttacking) {
    // 滑鼠釋放，退出攻擊狀態
    attackLocked = false;
    state = (yPos < groundY) ? 'jump' : 'idle';
    isAttacking = false;
  }
  
  handleKeyboardInput();
  applyPhysics();
  animateSprite();
  
  // 3. 繪製角色
  drawSprite();

  // 4. 處理子彈
  moveBullets();  
  drawBullets();  
  
  // 5. 顯示文字提示 
  fill(0);
  textSize(16);
  textAlign(CENTER);
  text(`狀態: ${state.toUpperCase()} | 空白鍵跳躍 | Shift鍵持續推進 (飛行) | A/D 或方向鍵移動 | 滑鼠左鍵攻擊`, width / 2, groundLineY - 10);
}

// --- 核心函式定義 ---

function applyPhysics() {
  if (isJumping || isFlying || yPos < groundY) {
    jumpVelocity += gravity;
    
    if (isFlying) {
      jumpVelocity += upwardThrust; 
      jumpVelocity = constrain(jumpVelocity, jumpForce * 0.5, jumpVelocity);
    }

    yPos += jumpVelocity;
    
    if (yPos >= groundY) {
      yPos = groundY;          
      jumpVelocity = 0;        
      isJumping = false;       
      isFlying = false;        
    }
    
    yPos = constrain(yPos, maxHeight * imgScale / 2, yPos);
  }
}

function handleKeyboardInput() {
  let isMoving = false;
  
  if (keyIsDown(16)) { // Shift 鍵
    isFlying = true;
    state = 'fly';
  }
  
  // 如果正在攻擊 (滑鼠按下)，允許移動，但不切換狀態
  if (state === 'attack') {
    let attackMoveSpeed = moveSpeed * 0.5;
    
    // 使用 A/D 或方向鍵移動
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // 左 (Left Arrow 或 A)
      xPos -= attackMoveSpeed; 
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // 右 (Right Arrow 或 D)
      xPos += attackMoveSpeed;
    }
    
    if (isFlying) {
      state = 'fly'; 
    }
    return; 
  }
  
  // *** 移動輸入 (修改為 A/D 和方向鍵) ***
  let currentMoveSpeed = isFlying ? moveSpeed * 1.5 : (isJumping ? moveSpeed * 0.7 : moveSpeed); 
    
  // 左移動
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // 65 是 A
    xPos -= currentMoveSpeed;
    facingDirection = -1; 
    isMoving = true;
  }
    
  // 右移動
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // 68 是 D
    xPos += currentMoveSpeed;
    facingDirection = 1; 
    isMoving = true;
  }
  // *** 移動輸入結束 ***
  
  if (keyIsDown(32) && !isJumping && !isFlying && yPos >= groundY) { // 空白鍵
    isJumping = true;         
    jumpVelocity = jumpForce; 
  }
  
  if (isFlying) {
    state = 'fly';
  } else if (isJumping || yPos < groundY) {
    state = 'jump';
  } else if (isMoving) {
    state = 'walk';
  }
  
  let scaledW = frameSize2.w * imgScale / 2;
  xPos = constrain(xPos, scaledW, width - scaledW);
}

function animateSprite() {
  // 狀態切換時重置幀計數
  if (state !== prevState) {
    currentFrame = 0;
    prevState = state;
  }

  // --- 攻擊動畫 ---
  if (state === 'attack') {
    currentFrame = 0; // 鎖定在單一幀 (索引 0)

    // 在攻擊的瞬間發射子彈 (只有在第一次進入 'attack' 狀態時發射)
    if (!attackLocked) { 
      createBullet(xPos, yPos, facingDirection);
      attackLocked = true; // 鎖定，直到滑鼠釋放
    }
    return; 
  }
  // --- 攻擊動畫結束 ---

  // 飛行動畫
  if (state === 'fly') {
    currentFrame = (facingDirection === 1) ? 1 : 0;
    return;
  }

  // 跳躍動畫
  if (state === 'jump') {
    currentFrame = (jumpVelocity < 0) ? 0 : 1; 
    return;
  }
  
  // 待機狀態
  if (state === 'idle') {
    currentFrame = 0;
    return;
  }

  // 行走狀態
  if (state === 'walk') {
      let framesArray = walkFrames;
      if (frameCount % frameRateFactor === 0) {
          currentFrame = (currentFrame + 1) % framesArray.length;
      }
  }
}

function drawSprite() {
  let frameData = null;
  let framesArray = null;

  if (state === 'idle') {
    frameData = idleFrames[currentFrame];
  } else if (state === 'walk') {
    frameData = walkFrames[currentFrame];
  } else if (state === 'jump') {
    frameData = jumpFrames[currentFrame];
  } else if (state === 'fly') {
    frameData = flyFrames[currentFrame]; 
  } else if (state === 'attack') { 
    // 根據方向選擇攻擊幀
    if (facingDirection === 1) { 
      framesArray = attackFramesR;
    } else {                  
      framesArray = attackFramesL;
    }
    frameData = framesArray[currentFrame]; 
  }

  if (!frameData || !frameData.img) return; 

  push();
    translate(xPos, yPos);

    // 只有在 'walk', 'idle', 'jump' 狀態下才使用 scale 進行翻轉
    if (state !== 'fly' && state !== 'attack') {
      scale(facingDirection, 1);
    }

    image(
      frameData.img,
      0, 0,
      frameData.w * imgScale, 
      frameData.h * imgScale,
      frameData.x, frameData.y,
      frameData.w, frameData.h
    );
  pop();
}

// 移除 keyPressed 函式中的 90 (Z 鍵) 避免衝突

function keyPressed() {
    // 避免瀏覽器預設行為
    if (keyCode === 32 || keyCode === 16 || keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW || keyCode === 65 || keyCode === 68) {
        return false;
    }
}

// --- 子彈相關函式 ---

/**
 * 創建一個新的子彈物件並添加到陣列中
 */
function createBullet(startX, startY, direction) {
  let bulletImgToUse;
  let offsetX; // 槍口偏移量

  if (direction === 1) { // 向右攻擊
    bulletImgToUse = bulletImgR;
    offsetX = frameSize6.w * imgScale * 0.4; 
  } else { // 向左攻擊
    bulletImgToUse = bulletImgL;
    offsetX = -frameSize5.w * imgScale * 0.4; 
  }
  
  let offsetY = -frameSize6.h * imgScale * 0.1; 
  
  let newBullet = {
    x: startX + offsetX,
    y: startY + offsetY,
    dir: direction,
    w: bulletSize.w * imgScale,
    h: bulletSize.h * imgScale,
    img: bulletImgToUse, 
  };
  bullets.push(newBullet);
}

/**
 * 移動和管理所有子彈
 */
function moveBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    b.x += b.dir * bulletSpeed;
    
    // 檢查子彈是否超出畫面，若是則移除
    if (b.x < -b.w || b.x > width + b.w) {
      bullets.splice(i, 1); 
    }
  }
}

/**
 * 繪製所有子彈
 */
function drawBullets() {
  push();
  for (let b of bullets) {
    push();
    translate(b.x, b.y);
    image(b.img, 0, 0, b.w, b.h);
    pop();
  }
  pop();
}


// --- 雲朵相關函式 (保持不變) ---

/**
 * 建立一個新的雲朵物件
 */
function createCloud(initialX = null) {
  let w = random(100, 200); 
  let h = w * random(0.5, 0.8); 
  
  return {
    x: initialX === null ? random(width) : initialX, 
    y: random(height * 0.1, height * 0.5), 
    w: w,
    h: h,
    speed: cloudSpeed * random(0.5, 1.5) 
  };
}

/**
 * 繪製一個雲朵
 */
function drawCloud(cloud) {
  noStroke();
  fill(255, 255, 255, 200); 
  
  push();
    translate(cloud.x, cloud.y);
    
    // 繪製多個橢圓來模擬雲朵形狀
    ellipse(0, 0, cloud.w, cloud.h);
    ellipse(cloud.w * 0.3, cloud.h * 0.1, cloud.w * 0.7, cloud.h * 0.8);
    ellipse(cloud.w * -0.2, cloud.h * 0.2, cloud.w * 0.6, cloud.h * 0.9);
    ellipse(cloud.w * 0.1, cloud.h * -0.2, cloud.w * 0.5, cloud.h * 0.7);
    
  pop();
}

/**
 * 更新雲朵位置
 */
function moveCloud(cloud) {
  cloud.x -= cloud.speed;
  
  // 移出左側後重置到右側
  if (cloud.x < -cloud.w * 0.7) {
    cloud.x = width + cloud.w * 0.7;
    cloud.y = random(height * 0.1, height * 0.5); 
    cloud.w = random(100, 200);
    cloud.h = cloud.w * random(0.5, 0.8);
    cloud.speed = cloudSpeed * random(0.5, 1.5);
  }
}