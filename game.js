// 游戏常量
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const FLOAT_FORCE = -2; 
const MAX_SPEED = 10;
const MIN_SPEED = 2;
const BASE_SPEED = 4;
const ACCELERATION = 0.2; 
const DECELERATION = 0.2; 
const PLATFORM_HEIGHT = 20;
const NOTE_SIZE = 30;
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const EXPLOSION_DURATION = 30; 
const PORTAL_SIZE = 50; 
const PLATFORM_TOLERANCE = 5; 
const PORTAL_TRANSITION_DURATION = 60; // 传送门过渡效果持续帧数

// 游戏状态
let gameState = {
    currentLevel: 1,
    startTime: 0,
    totalTime: 0,
    isGameOver: false,
    isTutorial: true,
    respawnPoint: { x: 100, y: SCREEN_HEIGHT - 100 },
    isPaused: true,
    isFloating: false, 
    isAccelerating: false, 
    isDecelerating: false, 
    portalAnimation: 0, 
    frameCount: 0, 
    inPortalTransition: false, 
    portalTransitionCounter: 0, 
    nextLevel: 1 
};

// 玩家对象
let player = {
    x: 100,
    y: SCREEN_HEIGHT - 100,
    velocityY: 0,
    isJumping: false,
    isFloating: false,
    speed: BASE_SPEED
};

let platforms = [];
let obstacles = [];
let bombs = [];
let movingPlatforms = []; // 移动平台
let movingBombs = []; // 移动炸弹
let explosions = []; // 爆炸效果数组
let portal = null; // 传送门

// 关卡设计
const levels = [
    // 第一关：教程 - 引导玩家使用所有四种操作
    {
        platforms: [
            { x: 0, y: SCREEN_HEIGHT - 50, width: 200 }, 
            { x: 300, y: SCREEN_HEIGHT - 100, width: 150 }, 
            { x: 550, y: SCREEN_HEIGHT - 150, width: 100 }, 
            
     
            { x: 750, y: SCREEN_HEIGHT - 150, width: 80 },
            { x: 950, y: SCREEN_HEIGHT - 150, width: 80 }, 
            
            
            { x: 1150, y: SCREEN_HEIGHT - 120, width: 150 },
            
            // 浮空区域 - 间隙大但落差小
            { x: 1400, y: SCREEN_HEIGHT - 160, width: 80 },
            { x: 1600, y: SCREEN_HEIGHT - 180, width: 80 }, 
            { x: 1800, y: SCREEN_HEIGHT - 200, width: 150 }, // 最终平台，有传送门
        ],
        obstacles: [], // 障碍物是红色方块（不爆炸）
        bombs: [
            { x: 1200, y: SCREEN_HEIGHT - 170, width: 30, height: 30 } // 关卡1的炸弹
        ],
        movingPlatforms: [],
        movingBombs: [],
        portal: { x: 1900, y: SCREEN_HEIGHT - 250 },
        tutorialText: [
            "Welcome to Blow Your Platformer!",
            "HOLD Q to speed up",
            "HOLD W to slow down",
            "Press E to jump high",
            "HOLD R to float (for long gaps)",
            "Reach the PORTAL to complete level!",
            "RED SQUARES with FUSE are BOMBS!"
        ],
        hints: [
            { x: 200, y: SCREEN_HEIGHT - 150, text: "Press E to JUMP" },
            { x: 450, y: SCREEN_HEIGHT - 200, text: "JUMP HIGHER!" },
            { x: 750, y: SCREEN_HEIGHT - 200, text: "HOLD Q to SPEED UP" },
            { x: 1150, y: SCREEN_HEIGHT - 170, text: "HOLD W to SLOW DOWN" },
            { x: 1500, y: SCREEN_HEIGHT - 230, text: "HOLD R to FLOAT" }
        ]
    },
    // 第二关：组合操作
    {
        platforms: [
            { x: 0, y: SCREEN_HEIGHT - 50, width: 200 },
            { x: 300, y: SCREEN_HEIGHT - 150, width: 100 },
            { x: 680, y: SCREEN_HEIGHT - 170, width: 80 },
            { x: 900, y: SCREEN_HEIGHT - 250, width: 100 },
            { x: 1650, y: SCREEN_HEIGHT - 150, width: 150 }
        ],
        obstacles: [
            { x: 400, y: SCREEN_HEIGHT - 100, width: 30, height: 30 },
            { x: 1000, y: SCREEN_HEIGHT - 200, width: 30, height: 30 },
            { x: 1400, y: SCREEN_HEIGHT - 130, width: 30, height: 30 }
        ],
        bombs: [
            { x: 550, y: SCREEN_HEIGHT - 100, width: 30, height: 30 },
            { x: 1200, y: SCREEN_HEIGHT - 100, width: 30, height: 30 }
        ],
        movingPlatforms: [
            { x: 500, y: SCREEN_HEIGHT - 170, width: 100, height: PLATFORM_HEIGHT, 
              minX: 420, maxX: 580, minY: 0, maxY: 0, 
              speedX: 0.5, speedY: 0, direction: 1 },
            { x: 1100, y: SCREEN_HEIGHT - 200, width: 120, height: PLATFORM_HEIGHT, 
              minX: 0, maxX: 0, minY: SCREEN_HEIGHT - 300, maxY: SCREEN_HEIGHT - 100, 
              speedX: 0, speedY: 2, direction: 1 },
            { x: 1350, y: SCREEN_HEIGHT - 230, width: 100, height: PLATFORM_HEIGHT, 
              minX: 1300, maxX: 1500, minY: SCREEN_HEIGHT - 280, maxY: SCREEN_HEIGHT - 180, 
              speedX: 0.8, speedY: 0.8, direction: 1 }
        ],
        movingBombs: [
            { x: 1000, y: SCREEN_HEIGHT - 250, width: 30, height: 30, 
              minX: 950, maxX: 1050, minY: 0, maxY: 0, 
              speedX: 1.5, speedY: 0, direction: 1 }
        ],
        portal: { x: 1750, y: SCREEN_HEIGHT - 200 }
    },
    // 第三关：挑战
    {
        platforms: [
            { x: 0, y: SCREEN_HEIGHT - 50, width: 300 },  // 加长第一个平台
            { x: 350, y: SCREEN_HEIGHT - 150, width: 200 },  // 加长第二个平台
            { x: 450, y: SCREEN_HEIGHT - 180, width: 80 },
            { x: 620, y: SCREEN_HEIGHT - 210, width: 70 },
            { x: 1800, y: SCREEN_HEIGHT - 180, width: 150 }
        ],
        obstacles: [
            { x: 250, y: SCREEN_HEIGHT - 80, width: 30, height: 30 },  // 移动到第一个平台上
            { x: 450, y: SCREEN_HEIGHT - 180, width: 30, height: 30 },  // 移动到第二个平台上
            { x: 1100, y: SCREEN_HEIGHT - 300, width: 30, height: 30 },
            { x: 1400, y: SCREEN_HEIGHT - 130, width: 30, height: 30 },
            { x: 1700, y: SCREEN_HEIGHT - 130, width: 30, height: 30 }
        ],
        bombs: [
            { x: 400, y: SCREEN_HEIGHT - 100, width: 30, height: 30 },
            { x: 1200, y: SCREEN_HEIGHT - 250, width: 30, height: 30 },
            { x: 1600, y: SCREEN_HEIGHT - 100, width: 30, height: 30 }
        ],
        movingPlatforms: [
            // 垂直移动平台
            { x: 750, y: SCREEN_HEIGHT - 210, width: 80, height: PLATFORM_HEIGHT, 
              minX: 0, maxX: 0, minY: SCREEN_HEIGHT - 280, maxY: SCREEN_HEIGHT - 140, 
              speedX: 0, speedY: 2, direction: 1 },
            
            // 水平移动平台
            { x: 950, y: SCREEN_HEIGHT - 230, width: 100, height: PLATFORM_HEIGHT, 
              minX: 850, maxX: 1050, minY: 0, maxY: 0, 
              speedX: 2, speedY: 0, direction: 1 },
              
            // 环形轨迹平台
            { x: 1150, y: SCREEN_HEIGHT - 180, width: 120, height: PLATFORM_HEIGHT, 
              center: { x: 1250, y: SCREEN_HEIGHT - 230 },
              radius: 120, angle: 0, speed: 0.02, type: "circular" },
            
            // 多段垂直平台
            { x: 1400, y: SCREEN_HEIGHT - 250, width: 100, height: PLATFORM_HEIGHT, 
              points: [
                { x: 1400, y: SCREEN_HEIGHT - 250 },
                { x: 1400, y: SCREEN_HEIGHT - 180 },
                { x: 1500, y: SCREEN_HEIGHT - 180 },
                { x: 1600, y: SCREEN_HEIGHT - 200 },
                { x: 1650, y: SCREEN_HEIGHT - 220 }
              ],
              currentPoint: 0, nextPoint: 1, speed: 1.5, type: "path" }
        ],
        movingBombs: [
            // 水平移动的炸弹
            { x: 700, y: SCREEN_HEIGHT - 130, width: 30, height: 30, 
              minX: 600, maxX: 800, minY: 0, maxY: 0, 
              speedX: 1.5, speedY: 0, direction: 1 },
            
            // 跟随平台的炸弹，调整位置
            { x: 950, y: SCREEN_HEIGHT - 280, width: 30, height: 30, 
              minX: 850, maxX: 1050, minY: 0, maxY: 0, 
              speedX: 2, speedY: 0, direction: 1 },
            
            // 从右向左移动的炸弹
            { x: 1800, y: SCREEN_HEIGHT - 150, width: 30, height: 30, 
              minX: 1400, maxX: 1800, minY: 0, maxY: 0, 
              speedX: 2, speedY: 0, direction: -1 }  // 方向改为-1，使其向左移动
        ],
        portal: { x: 1900, y: SCREEN_HEIGHT - 230 }
    }
];

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    gameState.startTime = millis();
    loadLevel(1);
}

function draw() {
    background(26, 26, 26);
    
    // 更新帧计数器
    if (!gameState.isPaused) {
        gameState.frameCount++;
    }
    
    // 绘制五线谱背景
    drawStaff();
    
    // 更新和绘制平台
    drawPlatforms();
    
    // 更新和绘制移动平台
    drawMovingPlatforms();
    
    // 更新和绘制障碍物
    drawObstacles();
    
    // 更新和绘制炸弹
    drawBombs();
    
    // 更新和绘制移动炸弹
    drawMovingBombs();
    
    // 更新和绘制爆炸效果
    updateAndDrawExplosions();
    
    // 更新和绘制传送门
    drawPortal();
    
    // 更新和绘制玩家
    drawPlayer();
    
    // 如果游戏未暂停，更新游戏状态
    if (!gameState.isPaused) {
        updatePlatforms();
        updateMovingPlatforms();
        updateObstacles();
        updateBombs();
        updateMovingBombs();
        updatePortal();
        updatePlayer();
        
        // 更新漂浮状态
        updateFloating();
        
        // 仅在不处于传送门过渡状态时检查关卡完成
        if (!gameState.inPortalTransition) {
            checkLevelComplete();
        }
    } else {
        // 显示"tap space to start"提示
        drawStartPrompt();
    }
    
    // 绘制传送门过渡效果
    if (gameState.inPortalTransition) {
        drawPortalTransitionEffect();
    }
    
    // 绘制UI和提示
    drawUI();
    
    // 关卡一特殊提示
    if (gameState.currentLevel === 1 && !gameState.isPaused) {
        drawLevelHints();
    }
    
    // 更新传送门动画
    gameState.portalAnimation += 0.05;
    if (gameState.portalAnimation > TWO_PI) {
        gameState.portalAnimation = 0;
    }
}

function drawLevelHints() {
    fill(255, 255, 0);
    textSize(16);
    for (let hint of levels[0].hints) {
        const hintScreenX = hint.x - (gameState.frameCount * player.speed);
        text(hint.text, hintScreenX, hint.y);
    }
}

function drawStartPrompt() {
    fill(255);
    textSize(30);
    textAlign(CENTER, CENTER);
    text("TAP SPACE TO START", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    textAlign(LEFT, BASELINE);
}

function drawStaff() {
    stroke(255, 255, 255, 50);
    for (let i = 0; i < 5; i++) {
        let y = SCREEN_HEIGHT - 100 + i * 20;
        line(0, y, SCREEN_WIDTH, y);
    }
}

function updatePlatforms() {
    for (let platform of platforms) {
        platform.x -= player.speed;
    }
    // 移除离开屏幕的平台
    platforms = platforms.filter(p => p.x + p.width > 0);
}

function drawPlatforms() {
    fill(100, 100, 100);
    for (let platform of platforms) {
        rect(platform.x, platform.y, platform.width, PLATFORM_HEIGHT);
    }
}

function updateObstacles() {
    for (let obstacle of obstacles) {
        obstacle.x -= player.speed;
    }
    // 移除离开屏幕的障碍物
    obstacles = obstacles.filter(o => o.x + o.width > 0);
}

function drawObstacles() {
    fill(150, 0, 0); // 障碍物使用不同的红色，没有引信
    for (let obstacle of obstacles) {
        rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
}

function updateBombs() {
    for (let bomb of bombs) {
        bomb.x -= player.speed;
    }
    // 移除离开屏幕的炸弹
    bombs = bombs.filter(b => b.x + b.width > 0);
}

function drawBombs() {
    fill(255, 0, 0); // 炸弹是鲜红色
    for (let bomb of bombs) {
        // 绘制炸弹
        rect(bomb.x, bomb.y, bomb.width, bomb.height);
        // 绘制引信
        fill(255, 165, 0);
        rect(bomb.x + bomb.width/2 - 2, bomb.y - 10, 4, 10);
        // 绘制小闪光效果，让炸弹更醒目
        if (frameCount % 30 < 15) {
            fill(255, 255, 0, 200);
            ellipse(bomb.x + bomb.width/2, bomb.y + bomb.height/2, 5, 5);
        }
    }
}

function updatePortal() {
    if (portal) {
        portal.x -= player.speed;
    }
}

function drawPortal() {
    if (portal) {
        // 绘制旋转的传送门
        push();
        translate(portal.x, portal.y);
        rotate(gameState.portalAnimation);
        
        // 外圈
        noFill();
        stroke(0, 200, 255, 200);
        strokeWeight(3);
        ellipse(0, 0, PORTAL_SIZE, PORTAL_SIZE);
        
        // 内圈
        stroke(0, 255, 200, 150);
        strokeWeight(2);
        ellipse(0, 0, PORTAL_SIZE * 0.7, PORTAL_SIZE * 0.7);
        
        // 中心
        fill(255, 255, 255, 100 + 50 * sin(gameState.portalAnimation * 2));
        noStroke();
        ellipse(0, 0, PORTAL_SIZE * 0.3, PORTAL_SIZE * 0.3);
        
        pop();
    }
}

function updateAndDrawExplosions() {
    // 更新爆炸效果
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].frameCount++;
        
        // 如果爆炸动画结束，移除爆炸效果
        if (explosions[i].frameCount >= EXPLOSION_DURATION) {
            explosions.splice(i, 1);
            continue;
        }
        
        // 绘制爆炸效果
        const explosion = explosions[i];
        const progress = explosion.frameCount / EXPLOSION_DURATION;
        const size = explosion.size * (1 + progress);
        const alpha = 255 * (1 - progress);
        
        noStroke();
        // 外圈（黄色到橙色）
        fill(255, 165 * (1 - progress), 0, alpha);
        ellipse(explosion.x, explosion.y, size, size);
        
        // 内圈（白色到黄色）
        fill(255, 255 * (1 - progress), 0, alpha);
        ellipse(explosion.x, explosion.y, size * 0.7, size * 0.7);
    }
}

function createExplosion(x, y, size) {
    explosions.push({
        x: x,
        y: y,
        size: size,
        frameCount: 0
    });
}

function updateFloating() {
    if (gameState.isFloating) {
        // 漂浮是一种轻微的向上力，能保持比较长时间的低空滑行
        // 通过持续给予小的向上力来减缓下落或保持低飞
        player.velocityY += FLOAT_FORCE * 0.2; 
        
        // 限制最大上升/下降速度，营造"缓慢飘浮"的感觉
        if (player.velocityY < -2) {
            player.velocityY = -2; // 限制上升速度
        } else if (player.velocityY > 2) {
            player.velocityY = 2; // 限制下降速度
        }
    }
}

function updateSpeed() {
    const prevSpeed = player.speed; // 记录前一帧的速度
    
    if (gameState.isAccelerating) {
        player.speed = min(player.speed + ACCELERATION, MAX_SPEED);
    } else if (gameState.isDecelerating) {
        player.speed = max(player.speed - DECELERATION, MIN_SPEED);
    } else {
        // 逐渐恢复到初始速度，更平滑
        if (player.speed > BASE_SPEED) {
            player.speed -= ACCELERATION / 5;
            if (player.speed < BASE_SPEED) player.speed = BASE_SPEED;
        } else if (player.speed < BASE_SPEED) {
            player.speed += ACCELERATION / 5;
            if (player.speed > BASE_SPEED) player.speed = BASE_SPEED;
        }
    }
    if (prevSpeed !== player.speed) {
        const speedDiff = player.speed - prevSpeed;
        // 调整frameCount，使背景移动连续
        gameState.frameCount = gameState.frameCount * (prevSpeed / player.speed);
    }
}

function updatePlayer() {
    // 如果在传送门过渡中，跳过玩家更新
    if (gameState.inPortalTransition) {
        updatePortalTransition();
        return;
    }
    
    // 更新速度
    updateSpeed();
    
    // 记录先前位置，用于改进碰撞检测
    const prevY = player.y;
    
    // 重力
    player.velocityY += GRAVITY;
    player.y += player.velocityY;
    
    // 改进的平台碰撞检测
    let onPlatform = false;
    
    // 检查静态平台碰撞
    for (let platform of platforms) {
        // 计算角色与平台的碰撞方向
        const wasAbove = prevY + NOTE_SIZE/2 <= platform.y + PLATFORM_TOLERANCE; // 增加容差
        const isColliding = player.x + NOTE_SIZE/2 > platform.x && 
                           player.x - NOTE_SIZE/2 < platform.x + platform.width &&
                           player.y + NOTE_SIZE/2 > platform.y - PLATFORM_TOLERANCE && 
                           player.y - NOTE_SIZE/2 < platform.y + PLATFORM_HEIGHT;
        
        if (isColliding) {
            if (wasAbove) {
                // 从上方碰撞 - 玩家站在平台上
                player.y = platform.y - NOTE_SIZE/2;
                player.velocityY = 0;
                player.isJumping = false;
                player.isFloating = false;
                onPlatform = true;
                break; 
            } else {
                // 从下方碰撞 - 玩家撞到平台底部
                player.y = platform.y + PLATFORM_HEIGHT + NOTE_SIZE/2;
                player.velocityY = Math.abs(player.velocityY) * 0.5; // 反弹一点点
            }
        }
    }
    
    // 如果没有在静态平台上，检查移动平台
    if (!onPlatform) {
        for (let platform of movingPlatforms) {
            // 计算角色与平台的碰撞方向
            const wasAbove = prevY + NOTE_SIZE/2 <= platform.y + PLATFORM_TOLERANCE; // 增加容差
            const isColliding = player.x + NOTE_SIZE/2 > platform.x && 
                               player.x - NOTE_SIZE/2 < platform.x + platform.width &&
                               player.y + NOTE_SIZE/2 > platform.y - PLATFORM_TOLERANCE && 
                               player.y - NOTE_SIZE/2 < platform.y + PLATFORM_HEIGHT;
            
            if (isColliding) {
                if (wasAbove) {
                    // 从上方碰撞 - 玩家站在平台上
                    player.y = platform.y - NOTE_SIZE/2;
                    player.velocityY = 0;
                    player.isJumping = false;
                    player.isFloating = false;
                    onPlatform = true;
                    break; // 一旦找到有效平台就退出循环
                } else {
                    // 从下方碰撞 - 玩家撞到平台底部
                    player.y = platform.y + platform.height + NOTE_SIZE/2;
                    player.velocityY = Math.abs(player.velocityY) * 0.5;
                }
            }
        }
    }
    
    // 检查障碍物碰撞
    for (let obstacle of obstacles) {
        if (player.x + NOTE_SIZE > obstacle.x && 
            player.x < obstacle.x + obstacle.width &&
            player.y + NOTE_SIZE > obstacle.y && 
            player.y < obstacle.y + obstacle.height) {
            respawnPlayer();
        }
    }
    
    // 检查炸弹碰撞
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        if (player.x + NOTE_SIZE > bomb.x && 
            player.x < bomb.x + bomb.width &&
            player.y + NOTE_SIZE > bomb.y && 
            player.y < bomb.y + bomb.height) {
            // 创建爆炸效果
            createExplosion(bomb.x + bomb.width/2, bomb.y + bomb.height/2, bomb.width * 3);
            // 移除炸弹
            bombs.splice(i, 1);
            
            // 添加短暂延迟，让玩家看到爆炸效果后再重置
            setTimeout(() => {
                respawnPlayer();
            }, 500);
            
            // 临时冻结玩家，防止多次碰撞
            player.speed = 0;
            player.velocityY = 0;
            gameState.isPaused = true;
            
            return; // 退出更新函数，防止其他逻辑继续执行
        }
    }
    
    // 检查移动炸弹碰撞
    for (let i = movingBombs.length - 1; i >= 0; i--) {
        const bomb = movingBombs[i];
        if (player.x + NOTE_SIZE > bomb.x && 
            player.x < bomb.x + bomb.width &&
            player.y + NOTE_SIZE > bomb.y && 
            player.y < bomb.y + bomb.height) {
            // 创建爆炸效果
            createExplosion(bomb.x + bomb.width/2, bomb.y + bomb.height/2, bomb.width * 3);
            
            // 添加短暂延迟，让玩家看到爆炸效果后再重置
            setTimeout(() => {
                respawnPlayer();
            }, 500);
            
            // 临时冻结玩家，防止多次碰撞
            player.speed = 0;
            player.velocityY = 0;
            gameState.isPaused = true;
            
            return; 
        }
    }
    
    // 检查传送门碰撞（通关点）
    if (portal && 
        dist(player.x, player.y, portal.x, portal.y) < PORTAL_SIZE / 2 + NOTE_SIZE / 2) {
        // 开始传送门过渡动画
        startPortalTransition();
        return; 
    }
    
    // 边界检查
    if (player.y > SCREEN_HEIGHT) {
        respawnPlayer();
    }
}

function respawnPlayer() {
    // 完全重置当前关卡
    loadLevel(gameState.currentLevel);
    // 保持游戏继续运行，不显示"tap space to start"
    gameState.isPaused = false;
}

function drawPlayer() {
    // 设计四分音符
    fill(255, 255, 0);
    noStroke();
    ellipse(player.x, player.y, NOTE_SIZE * 0.9, NOTE_SIZE * 0.7);
    rect(player.x + NOTE_SIZE * 0.3, player.y - NOTE_SIZE * 0.35 - NOTE_SIZE * 1.2, 3, NOTE_SIZE * 1.5);
}

function drawUI() {
    fill(255);
    textSize(20);
    text(`Level: ${gameState.currentLevel}`, 20, 30);
    
    if (gameState.isTutorial && gameState.currentLevel === 1) {
        let tutorialText = levels[0].tutorialText;
        for (let i = 0; i < tutorialText.length; i++) {
            text(tutorialText[i], 20, 60 + i * 30);
        }
    }
    
    // 显示游戏结束画面
    if (gameState.isGameOver) {
        fill(0, 0, 0, 200);
        rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        
        fill(255);
        textSize(60);
        textAlign(CENTER, CENTER);
        text("CONGRATULATIONS!", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 80);
        
        textSize(40);
        text("You Have Completed All Levels!", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        
        textSize(30);
        text(`Total Time: ${gameState.totalTime.toFixed(2)} seconds`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60);
        
        // 添加闪烁的按键提示
        if (frameCount % 60 < 30) {
            textSize(25);
            text("Press SPACE to play again", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 120);
        }
        
        textAlign(LEFT, BASELINE);
    }
}

function keyPressed() {
    // 游戏暂停时，只响应空格键
    if (gameState.isPaused) {
        if (key === ' ') {
            // 如果是游戏结束状态，按空格重新开始游戏
            if (gameState.isGameOver) {
                gameState.isGameOver = false;
                gameState.currentLevel = 1;
                gameState.startTime = millis();
                loadLevel(1);
                return;
            }
            
            gameState.isPaused = false;
            // 如果是游戏刚开始，设置开始时间
            if (gameState.startTime === 0) {
                gameState.startTime = millis();
            }
        }
        return;
    }
    
    if (key === 'q') {
        gameState.isAccelerating = true;
    } else if (key === 'w') {
        gameState.isDecelerating = true;
    } else if (key === 'e' && !player.isJumping && !player.isFloating) {
        player.velocityY = JUMP_FORCE;
        player.isJumping = true;
    } else if (key === 'r') {
        gameState.isFloating = true;
    }
}

function keyReleased() {
    if (key === 'r') {
        gameState.isFloating = false;
    } else if (key === 'q') {
        gameState.isAccelerating = false;
    } else if (key === 'w') {
        gameState.isDecelerating = false;
    }
}

function loadLevel(levelNum) {
    gameState.currentLevel = levelNum;
    gameState.frameCount = 0; // 重置帧计数器
    
    // 复制关卡设计中的所有元素
    platforms = JSON.parse(JSON.stringify(levels[levelNum - 1].platforms));
    obstacles = JSON.parse(JSON.stringify(levels[levelNum - 1].obstacles));
    bombs = JSON.parse(JSON.stringify(levels[levelNum - 1].bombs));
    portal = JSON.parse(JSON.stringify(levels[levelNum - 1].portal));
    
    // 加载移动平台和移动炸弹
    movingPlatforms = JSON.parse(JSON.stringify(levels[levelNum - 1].movingPlatforms || []));
    movingBombs = JSON.parse(JSON.stringify(levels[levelNum - 1].movingBombs || []));
    
    // 清除任何世界坐标初始化
    for (let platform of movingPlatforms) {
        delete platform.worldX;
        delete platform.worldY;
        delete platform.worldMinX;
        delete platform.worldMaxX;
        delete platform.worldMinY;
        delete platform.worldMaxY;
    }
    
    for (let bomb of movingBombs) {
        delete bomb.worldX;
        delete bomb.worldY;
        delete bomb.worldMinX;
        delete bomb.worldMaxX;
        delete bomb.worldMinY;
        delete bomb.worldMaxY;
    }
    
    explosions = []; // 清空爆炸效果
    player.x = 100;
    player.y = SCREEN_HEIGHT - 100;
    gameState.respawnPoint = { x: 100, y: SCREEN_HEIGHT - 100 };
    player.velocityY = 0;
    player.speed = BASE_SPEED;
    player.isJumping = false;
    player.isFloating = false;
    gameState.isFloating = false;
    gameState.isAccelerating = false;
    gameState.isDecelerating = false;
    gameState.isTutorial = levelNum === 1;
    gameState.isPaused = true;  // 加载新关卡时暂停游戏
    
    // 重置传送门过渡状态
    gameState.inPortalTransition = false;
    gameState.portalTransitionCounter = 0;
}

function checkLevelComplete() {
    // 关卡完成的检查已移至碰撞检测中的传送门部分
}

function gameOver() {
    gameState.isGameOver = true;
    gameState.totalTime = (millis() - gameState.startTime) / 1000;
}

function updateMovingPlatforms() {
    for (let platform of movingPlatforms) {
        // 根据平台类型更新位置
        if (platform.type === "circular") {
            // 初始化世界坐标和角度
            if (platform.worldX === undefined) {
                platform.worldX = platform.x + (gameState.frameCount * player.speed);
                platform.worldY = platform.y;
                platform.angle = platform.angle || 0; 
            }
            
            // 更新角度
            platform.angle += platform.speed;
            if (platform.angle >= TWO_PI) {
                platform.angle -= TWO_PI; // 保持角度在0-2π范围内
            }
            
            // 根据角度计算位置（相对于中心）
            const offsetX = Math.cos(platform.angle) * platform.radius;
            const offsetY = Math.sin(platform.angle) * platform.radius;
            
            // 更新世界坐标
            platform.worldX = platform.center.x + offsetX - platform.width/2;
            platform.worldY = platform.center.y + offsetY - platform.height/2;
            
            // 转换为屏幕坐标
            platform.x = platform.worldX - (gameState.frameCount * player.speed);
            platform.y = platform.worldY;
        } else if (platform.type === "path") {
            // 路径移动
            const currentPoint = platform.points[platform.currentPoint];
            const nextPoint = platform.points[platform.nextPoint];
            
            // 如果是首次更新，初始化世界坐标
            if (platform.worldX === undefined) {
                platform.worldX = platform.x + (gameState.frameCount * player.speed);
                platform.worldY = platform.y;
                
                // 初始化路径点的世界坐标
                platform.worldPoints = [];
                for (let point of platform.points) {
                    platform.worldPoints.push({
                        x: point.x + (gameState.frameCount * player.speed),
                        y: point.y
                    });
                }
            }
            
            // 计算方向向量（在世界坐标中）
            const currentWorldPoint = platform.worldPoints[platform.currentPoint];
            const nextWorldPoint = platform.worldPoints[platform.nextPoint];
            
            const dx = nextWorldPoint.x - platform.worldX;
            const dy = nextWorldPoint.y - platform.worldY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < platform.speed) {
                // 到达目标点，前往下一个点
                platform.currentPoint = platform.nextPoint;
                platform.nextPoint = (platform.nextPoint + 1) % platform.points.length;
            } else {
                // 朝目标点移动（在世界坐标系中）
                platform.worldX += (dx / dist) * platform.speed;
                platform.worldY += (dy / dist) * platform.speed;
            }
            
            // 转换为屏幕坐标
            platform.x = platform.worldX - (gameState.frameCount * player.speed);
            platform.y = platform.worldY;
        } else {
            // 线性移动平台 - 固定在游戏世界中的位置，不随玩家移动而改变路径
            // 如果是首次更新或没有世界坐标，初始化世界坐标
            if (platform.worldX === undefined) {
                // 初始化世界坐标
                platform.initialWorldX = platform.x + (gameState.frameCount * player.speed);
                platform.initialWorldY = platform.y;
                platform.worldX = platform.initialWorldX;
                platform.worldY = platform.initialWorldY;
                
                // 设置固定的移动范围（相对于初始位置）
                if (platform.minX !== 0) {
                    platform.worldMinX = platform.initialWorldX - (platform.initialWorldX - platform.minX);
                    platform.worldMaxX = platform.initialWorldX + (platform.maxX - platform.initialWorldX);
                } else {
                    // 如果minX为0，说明平台不做水平移动
                    platform.worldMinX = platform.initialWorldX;
                    platform.worldMaxX = platform.initialWorldX;
                }
                
                if (platform.minY !== 0) {
                    platform.worldMinY = platform.initialWorldY - (platform.initialWorldY - platform.minY);
                    platform.worldMaxY = platform.initialWorldY + (platform.maxY - platform.initialWorldY);
                } else {
                    // 如果minY为0，说明平台不做垂直移动
                    platform.worldMinY = platform.initialWorldY;
                    platform.worldMaxY = platform.initialWorldY;
                }
            }
            
            // 更新世界X位置 - 在固定范围内移动
            if (platform.speedX !== 0) {
                platform.worldX += platform.speedX * platform.direction;
                
                // 确保在固定范围内移动
                if (platform.worldX <= platform.worldMinX || platform.worldX >= platform.worldMaxX) {
                    platform.direction *= -1;
                    // 如果碰到边界，立即调整位置避免卡住
                    if (platform.worldX < platform.worldMinX) platform.worldX = platform.worldMinX;
                    if (platform.worldX > platform.worldMaxX) platform.worldX = platform.worldMaxX;
                }
            }
            
            // 更新世界Y位置
            if (platform.speedY !== 0) {
                platform.worldY += platform.speedY * platform.direction;
                
                // 确保在固定范围内移动
                if (platform.worldY <= platform.worldMinY || platform.worldY >= platform.worldMaxY) {
                    platform.direction *= -1;
                    // 如果碰到边界，立即调整位置避免卡住
                    if (platform.worldY < platform.worldMinY) platform.worldY = platform.worldMinY;
                    if (platform.worldY > platform.worldMaxY) platform.worldY = platform.worldMaxY;
                }
            }
            
            // 转换为屏幕坐标
            platform.x = platform.worldX - (gameState.frameCount * player.speed);
            platform.y = platform.worldY;
        }
    }
    
    // 处理玩家与平台的碰撞和跟随平台移动
    handlePlayerPlatformInteraction();
}

function handlePlayerPlatformInteraction() {
    // 检查玩家是否站在任何移动平台上
    for (let platform of movingPlatforms) {
        // 使用更宽松的判定条件，让玩家更容易站在平台上
        if (player.y + NOTE_SIZE/2 <= platform.y + PLATFORM_TOLERANCE && 
            player.y + NOTE_SIZE/2 >= platform.y - PLATFORM_TOLERANCE &&
            player.x + NOTE_SIZE/2 > platform.x && 
            player.x - NOTE_SIZE/2 < platform.x + platform.width) {
            
            // 如果平台垂直移动，调整玩家高度
            if (platform.type === "circular" || platform.type === "path" || platform.speedY !== 0) {
                const platformDeltaY = platform.y - (platform.prevY || platform.y);
                player.y += platformDeltaY;
                player.velocityY = 0; // 防止玩家下滑
            }
            
            // 确保玩家可以从移动平台上跳跃
            player.isJumping = false;
            player.isFloating = false;
            
            // 保存当前平台位置，用于下一帧计算移动量
            platform.prevX = platform.x;
            platform.prevY = platform.y;
        }
    }
}

function drawMovingPlatforms() {
    fill(150, 150, 250); // 移动平台使用不同颜色
    for (let platform of movingPlatforms) {
        rect(platform.x, platform.y, platform.width, platform.height);
        
        // 为移动平台添加简单的指示器
        stroke(200, 200, 250, 100);
        noFill();
        
        if (platform.type === "circular") {
            // 环形轨迹指示器
            const centerScreenX = platform.center.x - (gameState.frameCount * player.speed);
            ellipse(centerScreenX, platform.center.y, platform.radius * 2, platform.radius * 2);
        } else if (platform.type === "path") {
            // 路径点指示器
            beginShape();
            for (let i = 0; i < platform.points.length; i++) {
                const point = platform.points[i];
                const pointScreenX = point.x - (gameState.frameCount * player.speed);
                vertex(pointScreenX, point.y);
            }
            // 闭合路径
            if (platform.points.length > 2) {
                endShape(CLOSE);
            } else {
                endShape();
            }
            
            // 显示当前移动方向
            const currentPointIndex = platform.currentPoint;
            const nextPointIndex = platform.nextPoint;
            const currentPoint = platform.points[currentPointIndex];
            const nextPoint = platform.points[nextPointIndex];
            
            const currentScreenX = currentPoint.x - (gameState.frameCount * player.speed);
            const nextScreenX = nextPoint.x - (gameState.frameCount * player.speed);
            
            stroke(255, 255, 0);
            line(currentScreenX, currentPoint.y, nextScreenX, nextPoint.y);
        } else {
            // 线性移动平台指示器
            if (platform.speedX !== 0) {
                // 水平移动轨迹
                const minScreenX = platform.minX - (gameState.frameCount * player.speed);
                const maxScreenX = platform.maxX - (gameState.frameCount * player.speed);
                line(minScreenX, platform.y + platform.height / 2, 
                     maxScreenX, platform.y + platform.height / 2);
            } else if (platform.speedY !== 0) {
                // 垂直移动轨迹
                line(platform.x + platform.width / 2, platform.minY, 
                     platform.x + platform.width / 2, platform.maxY);
            }
        }
        
        noStroke();
        fill(150, 150, 250);
    }
}

function updateMovingBombs() {
    for (let bomb of movingBombs) {
        // 初始化世界坐标
        if (bomb.worldX === undefined) {
            bomb.worldX = bomb.x + (gameState.frameCount * player.speed);
            bomb.worldY = bomb.y;
            bomb.worldMinX = bomb.minX + (gameState.frameCount * player.speed);
            bomb.worldMaxX = bomb.maxX + (gameState.frameCount * player.speed);
            bomb.worldMinY = bomb.minY;
            bomb.worldMaxY = bomb.maxY;
        }
        
        // 更新世界X位置
        if (bomb.speedX !== 0) {
            bomb.worldX += bomb.speedX * bomb.direction;
            if (bomb.worldX <= bomb.worldMinX || bomb.worldX >= bomb.worldMaxX) {
                bomb.direction *= -1;
            }
        }
        
        // 更新世界Y位置
        if (bomb.speedY !== 0) {
            bomb.worldY += bomb.speedY * bomb.direction;
            if (bomb.worldY <= bomb.worldMinY || bomb.worldY >= bomb.worldMaxY) {
                bomb.direction *= -1;
            }
        }
        
        // 转换为屏幕坐标
        bomb.x = bomb.worldX - (gameState.frameCount * player.speed);
        bomb.y = bomb.worldY;
    }
}

function drawMovingBombs() {
    for (let bomb of movingBombs) {
        // 绘制炸弹
        fill(255, 0, 0);
        rect(bomb.x, bomb.y, bomb.width, bomb.height);
        
        // 绘制引信
        fill(255, 165, 0);
        rect(bomb.x + bomb.width/2 - 2, bomb.y - 10, 4, 10);
        
        // 绘制移动轨迹
        stroke(255, 0, 0, 50);
        if (bomb.speedX !== 0) {
            // 转换为屏幕坐标
            const minScreenX = bomb.worldMinX - (gameState.frameCount * player.speed);
            const maxScreenX = bomb.worldMaxX - (gameState.frameCount * player.speed);
            line(minScreenX, bomb.y + bomb.height / 2, 
                 maxScreenX, bomb.y + bomb.height / 2);
        } else if (bomb.speedY !== 0) {
            line(bomb.x + bomb.width / 2, bomb.worldMinY, 
                 bomb.x + bomb.width / 2, bomb.worldMaxY);
        }
        noStroke();
    }
}

// 处理传送门过渡效果
function startPortalTransition() {
    gameState.inPortalTransition = true;
    gameState.portalTransitionCounter = 0;
    
    // 确定下一个关卡
    if (gameState.currentLevel < 3) {
        gameState.nextLevel = gameState.currentLevel + 1;
    } else {
        // 如果是最后一关，准备显示结束界面
        gameState.nextLevel = -1;
    }
    
    // 临时冻结玩家
    player.velocityY = 0;
    player.speed = 0;
}

function updatePortalTransition() {
    gameState.portalTransitionCounter++;
    
    // 在传送门位置创建粒子效果
    if (gameState.portalTransitionCounter % 4 === 0 && portal) {
        createExplosion(
            portal.x + random(-10, 10),
            portal.y + random(-10, 10),
            random(10, 30)
        );
    }
    
    // 当过渡动画结束
    if (gameState.portalTransitionCounter >= PORTAL_TRANSITION_DURATION) {
        gameState.inPortalTransition = false;
        
        if (gameState.nextLevel > 0) {
            // 加载下一关
            loadLevel(gameState.nextLevel);
        } else {
            // 游戏结束
            gameState.totalTime = (millis() - gameState.startTime) / 1000;
            gameState.isGameOver = true;
            gameState.isPaused = true;
        }
    }
}

// 绘制传送门过渡效果
function drawPortalTransitionEffect() {
    // 随着过渡的进行，增加半透明覆盖层
    const alpha = map(gameState.portalTransitionCounter, 0, PORTAL_TRANSITION_DURATION, 0, 200);
    fill(0, 200, 255, alpha);
    rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    // 添加闪烁的粒子效果
    if (portal) {
        // 从传送门扩散的光芒
        push();
        translate(portal.x, portal.y);
        
        // 闪烁效果
        const portalSize = map(
            gameState.portalTransitionCounter, 
            0, 
            PORTAL_TRANSITION_DURATION, 
            PORTAL_SIZE, 
            SCREEN_WIDTH * 1.5
        );
        
        noFill();
        const numRings = 5;
        for (let i = 0; i < numRings; i++) {
            const ringSize = portalSize * (i + 1) / numRings;
            const ringAlpha = alpha * (1 - i / numRings);
            stroke(0, 255, 255, ringAlpha);
            strokeWeight(2);
            ellipse(0, 0, ringSize, ringSize);
        }
        
        pop();
    }
} 