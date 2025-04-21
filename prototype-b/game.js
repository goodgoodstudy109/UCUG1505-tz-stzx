// Game Constants
const GRAVITY = 0.3;  // Reduced gravity for better jump feel
const JUMP_FORCE = -20;  // Increased jump force
const MAX_SPEED = 10;
const MIN_SPEED = 2;
const BASE_SPEED = 3;
const ACCELERATION = 0.2;
const DECELERATION = 0.2;
const DASH_SPEED = 15;  // Speed for horizontal dash
const DASH_DURATION = 15;  // Frames for dash duration
const MAX_FALL_SPEED = 8;  // Maximum normal falling speed
const SLOW_FALL_SPEED = 3;  // Maximum speed when slow falling
const PLATFORM_HEIGHT = 20;
const NOTE_SIZE = 30;
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const PORTAL_SIZE = 50;
const PLATFORM_TOLERANCE = 5;
const TIME_FACTOR = 0.4;  // Global time scaling factor

// Audio Classification
let classifier;
let soundLabel = 'listening...';
let soundConfidence = 0;
const soundModel = '/tm-my-audio-model/model.json';
let mic;

// Game State
let gameState = {
    currentLevel: 1,
    startTime: 0,
    totalTime: 0,
    isGameOver: false,
    isTutorial: true,
    respawnPoint: { x: 100, y: SCREEN_HEIGHT - 100 },
    isPaused: true,
    isAccelerating: false, 
    isDecelerating: false, 
    micPermissionGranted: false
};

// Player Object
let player = {
    x: 100,
    y: SCREEN_HEIGHT - 100,
    velocityY: 0,
    isJumping: false,
    isFloating: false,
    speed: BASE_SPEED,
    isDashing: false,
    dashFrames: 0,
    isSlowingFall: false,
    isStopped: false
};

let platforms = [];
let obstacles = [];
let portal = null;

// Sky and Clouds
let clouds = [];
let skyColorTop;
let skyColorBottom;

// Level Design - Redesigned for Voice Control
const levels = [
    // Level 1: Introduction (Easier, Wider Platforms, No Obstacles)
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 250 }, // Very wide start
            { x: 400, y: SCREEN_HEIGHT - 70, width: 200 }, // Small height difference, wide
            { x: 650, y: SCREEN_HEIGHT - 90, width: 180 },
            { x: 880, y: SCREEN_HEIGHT - 110, width: 150 },
            { x: 1080, y: SCREEN_HEIGHT - 100, width: 200 }, // Wider platform
            { x: 1330, y: SCREEN_HEIGHT - 120, width: 150 },
            { x: 1530, y: SCREEN_HEIGHT - 140, width: 200 }, // Wide end platform
        ],
        obstacles: [], // No obstacles in level 1
        portal: { x: 1780, y: SCREEN_HEIGHT - 190 },
        tutorialText: [
            "Level 1: Get Started!",
            "Controls:",
            "  \"blow\" -> Speed Up",
            "  \"hiss\" -> Slow Down",
            "  \"pop\"  -> Jump",
            "  \"hat\"  -> Float (Slow Fall)",
            "Reach the blue portal!"
        ]
    },
    // Level 2: Obstacles & Moderate Jumps
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 200 },
            { x: 350, y: SCREEN_HEIGHT - 90, width: 150 },
            { x: 550, y: SCREEN_HEIGHT - 140, width: 120 }, // Bigger jump
            { x: 750, y: SCREEN_HEIGHT - 100, width: 100 }, // Smaller platform
            { x: 900, y: SCREEN_HEIGHT - 150, width: 130 },
            { x: 1100, y: SCREEN_HEIGHT - 180, width: 150 },
            { x: 1300, y: SCREEN_HEIGHT - 160, width: 180 }, // Wider landing before portal
        ],
        obstacles: [
            { x: 500, y: SCREEN_HEIGHT - 80, width: 30, height: 30 },  // First obstacle on ground
            { x: 850, y: SCREEN_HEIGHT - 130, width: 30, height: 30 }, // Obstacle on a lower platform path
            { x: 1200, y: SCREEN_HEIGHT - 210, width: 30, height: 30 } // Obstacle near a higher platform
        ],
        portal: { x: 1500, y: SCREEN_HEIGHT - 210 }
    },
    // Level 3: Advanced Platforming & Floating
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 180 },
            { x: 330, y: SCREEN_HEIGHT - 100, width: 100 }, // Narrower platform
            { x: 500, y: SCREEN_HEIGHT - 180, width: 80 },  // Requires more precise jump/float
            { x: 700, y: SCREEN_HEIGHT - 150, width: 120 }, // Jump back down slightly
            { x: 900, y: SCREEN_HEIGHT - 220, width: 100 }, // Higher jump, float might be useful
            { x: 1150, y: SCREEN_HEIGHT - 190, width: 130 },
            { x: 1350, y: SCREEN_HEIGHT - 250, width: 100 }, // Highest platform before portal
        ],
        obstacles: [
            { x: 450, y: SCREEN_HEIGHT - 130, width: 30, height: 30 }, // Obstacle requiring jump over
            { x: 650, y: SCREEN_HEIGHT - 210, width: 30, height: 30 }, // Obstacle near a high platform landing
            { x: 850, y: SCREEN_HEIGHT - 180, width: 30, height: 30 }, // Obstacle on platform path
            { x: 1100, y: SCREEN_HEIGHT - 250, width: 30, height: 30 }, // Obstacle near another high platform
            { x: 1300, y: SCREEN_HEIGHT - 220, width: 30, height: 30 }  // Obstacle before final jump
        ],
        portal: { x: 1550, y: SCREEN_HEIGHT - 300 } // Portal is higher up
    }
];

function preload() {
    console.log('Preloading sound classification model...');
    try {
        // Get the current URL and construct absolute paths
        const baseUrl = window.location.origin;
        const modelUrl = `${baseUrl}/tm-my-audio-model/model.json`;
        console.log('Loading model from:', modelUrl);
        
        // Create a new classifier with explicit error handling
        classifier = ml5.soundClassifier(modelUrl, {
            probabilityThreshold: 0.7,
            modelUrl: modelUrl,
            metadataUrl: `${baseUrl}/tm-my-audio-model/metadata.json`,
            overlapFactor: 0.5
        }, modelReady);
    } catch (error) {
        console.error('Error in preload:', error);
        soundLabel = 'Error initializing model';
    }
}

function modelReady() {
    console.log('Sound classification model loaded successfully!');
    console.log('Model details:', classifier);
    // Initialize microphone after model is ready
    initMicrophone();
}

function initMicrophone() {
    console.log('Initializing microphone...');
    try {
        // Initialize p5.sound
        getAudioContext().resume();
        
        // Create and initialize audio input
        mic = new p5.AudioIn();
        
        // Request microphone access
        mic.start(function() {
            console.log('Microphone access granted!');
            gameState.micPermissionGranted = true;
            // Start classification with the microphone input
            classifier.classify(gotSoundResult);
        }, function(err) {
            console.error('Error accessing microphone:', err);
            soundLabel = 'Microphone access denied';
        });
    } catch (error) {
        console.error('Error initializing audio:', error);
        soundLabel = 'Audio initialization failed';
    }
}

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    gameState.startTime = millis();
    loadLevel(1);
    // Initialize sky colors
    skyColorTop = color(135, 206, 250); // Light Sky Blue
    skyColorBottom = color(173, 216, 230); // Lighter Blue
    setupClouds();
    console.log('Setup complete, waiting for user interaction...');
}

function draw() {
    // Draw sky gradient background
    drawSkyGradient();

    // Draw clouds
    drawClouds();

    // Draw staff background (optional, maybe remove for sky theme?)
    // drawStaff();
    
    // Draw platforms
    drawPlatforms();
    
    // Draw obstacles
    drawObstacles();
    
    // Draw portal
    drawPortal();
    
    // Draw player
    drawPlayer();
    
    // If game is not paused, update game state
    if (!gameState.isPaused) {
        updatePlatforms();
        updateObstacles();
        updatePortal();
        updatePlayer();
        updateClouds(); // Update cloud positions
        
        // Check level completion
        checkLevelComplete();
    } else {
        // Show "tap space to start" prompt
        drawStartPrompt();
    }
    
    // Draw UI
    drawUI();
}

function drawSkyGradient() {
    // Create a vertical gradient from top to bottom
    for (let y = 0; y < height; y++) {
        let inter = map(y, 0, height, 0, 1);
        let c = lerpColor(skyColorTop, skyColorBottom, inter);
        stroke(c);
        line(0, y, width, y);
    }
    noStroke(); // Reset stroke
}

function setupClouds() {
    clouds = []; // Clear existing clouds
    for (let i = 0; i < 10; i++) { // Add 10 clouds
        clouds.push({
            x: random(-width * 0.5, width * 1.5), // Start clouds off-screen too
            y: random(50, height * 0.6),      // Position in the upper 60% of the sky
            size: random(50, 150),
            speed: random(0.1, 0.5) * (player.speed / BASE_SPEED + 0.5) // Cloud speed based on player speed but slower
        });
    }
}

function drawClouds() {
    fill(255, 255, 255, 200); // Semi-transparent white clouds
    noStroke();
    for (let cloud of clouds) {
        // Simple cloud shape using ellipses
        ellipse(cloud.x, cloud.y, cloud.size * 1.2, cloud.size * 0.8);
        ellipse(cloud.x + cloud.size * 0.3, cloud.y + cloud.size * 0.2, cloud.size * 0.8, cloud.size * 0.6);
        ellipse(cloud.x - cloud.size * 0.4, cloud.y + cloud.size * 0.1, cloud.size * 0.9, cloud.size * 0.7);
    }
}

function updateClouds() {
    for (let cloud of clouds) {
        // Move clouds based on their speed (influenced slightly by player speed)
        cloud.x -= cloud.speed * (player.speed / BASE_SPEED * 0.5 + 0.2);
        
        // Reset clouds that move off-screen to the right
        if (cloud.x + cloud.size < -width * 0.5) { // Check against a larger boundary
            cloud.x = width * 1.5 + random(100); // Reset far off-screen right
            cloud.y = random(50, height * 0.6); // Randomize y position slightly
            cloud.size = random(50, 150);
            cloud.speed = random(0.1, 0.5);
        }
        // Update individual cloud speed slightly based on player speed
        cloud.speed = random(0.1, 0.5) * (player.speed / BASE_SPEED * 0.5 + 0.2);
    }
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
        platform.x -= player.speed * TIME_FACTOR;
    }
    // Remove platforms that are off-screen
    platforms = platforms.filter(p => p.x + p.width > 0);
}

function drawPlatforms() {
    fill(255);
    noStroke();
    for (let platform of platforms) {
        rect(platform.x, platform.y, platform.width, PLATFORM_HEIGHT, 5);
    }
}

function updateObstacles() {
    for (let obstacle of obstacles) {
        obstacle.x -= player.speed * TIME_FACTOR;
    }
    // Remove obstacles that are off-screen
    obstacles = obstacles.filter(o => o.x + o.width > 0);
}

function drawObstacles() {
    fill(150, 0, 0);
    for (let obstacle of obstacles) {
        rect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
}

function updatePortal() {
    if (portal) {
        portal.x -= player.speed * TIME_FACTOR;
    }
}

function drawPortal() {
    if (portal) {
        fill(0, 200, 255);
        ellipse(portal.x, portal.y, PORTAL_SIZE, PORTAL_SIZE);
    }
}

function updatePlayer() {
    // Update speed
    updateSpeed();
    
    // Record previous position for improved collision detection
    const prevY = player.y;
    
    // Apply gravity
    player.velocityY += GRAVITY * TIME_FACTOR;
    
    // Apply slow fall speed cap if active
    if (player.isSlowingFall && player.velocityY > 0) {
        player.velocityY = min(player.velocityY, SLOW_FALL_SPEED * TIME_FACTOR);
    } else if (!player.isSlowingFall && player.velocityY > 0) {
        // Cap normal falling speed
        player.velocityY = min(player.velocityY, MAX_FALL_SPEED * TIME_FACTOR);
    }
    
    // Check platform collisions and update position
    let onPlatform = false;
    for (let platform of platforms) {
        const isAbovePlatform = prevY + NOTE_SIZE/2 <= platform.y + PLATFORM_TOLERANCE;
        const isOnPlatform = player.x + NOTE_SIZE/2 > platform.x && 
                           player.x - NOTE_SIZE/2 < platform.x + platform.width &&
                           player.y + NOTE_SIZE/2 > platform.y - PLATFORM_TOLERANCE && 
                           player.y - NOTE_SIZE/2 < platform.y + PLATFORM_HEIGHT;
        
        if (isOnPlatform) {
            if (isAbovePlatform && player.velocityY >= 0) {
                // Landing on platform
                onPlatform = true;
                player.y = platform.y - NOTE_SIZE/2;
                player.velocityY = 0;
                break;
            } else if (!isAbovePlatform) {
                // Hit platform from below
                player.velocityY = 0;
                player.y = platform.y + PLATFORM_HEIGHT + NOTE_SIZE/2;
            }
        }
    }
    
    if (!onPlatform) {
        player.y += player.velocityY * TIME_FACTOR;
    }
    
    // Handle dashing
    if (player.isDashing) {
        player.dashFrames++;
        if (player.dashFrames >= DASH_DURATION) {
            player.isDashing = false;
            player.dashFrames = 0;
            player.speed = BASE_SPEED;
        }
    }
    
    // Check obstacle collisions
    for (let obstacle of obstacles) {
        if (player.x + NOTE_SIZE > obstacle.x && 
            player.x < obstacle.x + obstacle.width &&
            player.y + NOTE_SIZE > obstacle.y && 
            player.y < obstacle.y + obstacle.height) {
            respawnPlayer();
        }
    }
    
    // Check portal collision (level completion)
    if (portal && 
        dist(player.x, player.y, portal.x, portal.y) < PORTAL_SIZE / 2 + NOTE_SIZE / 2) {
        // Level complete
        if (gameState.currentLevel < levels.length) {
            loadLevel(gameState.currentLevel + 1);
        } else {
            gameState.totalTime = (millis() - gameState.startTime) / 1000;
            gameState.isGameOver = true;
            gameState.isPaused = true;
        }
    }
    
    // Boundary check
    if (player.y > SCREEN_HEIGHT) {
        respawnPlayer();
    }
}

function respawnPlayer() {
    // Reset current level completely
    loadLevel(gameState.currentLevel);
    // Keep game running, don't show "tap space to start"
    gameState.isPaused = false;
}

function drawPlayer() {
    // Design quarter note
    fill(255, 255, 0);
    noStroke();
    ellipse(player.x, player.y, NOTE_SIZE * 0.9, NOTE_SIZE * 0.7);
    rect(player.x + NOTE_SIZE * 0.3, player.y - NOTE_SIZE * 0.35 - NOTE_SIZE * 1.2, 3, NOTE_SIZE * 1.5);
}

function drawUI() {
    fill(255);
    textSize(20);
    text(`Level: ${gameState.currentLevel}`, 20, 30);
    
    // Draw sound classification debug info
    textSize(16);
    if (!gameState.micPermissionGranted) {
        text('Press SPACE to start game and enable sound controls', 20, 60);
    } else {
        text(`Sound: ${soundLabel}`, 20, 60);
        text(`Confidence: ${(soundConfidence * 100).toFixed(1)}%`, 20, 80);
        text(`Player Speed: ${player.speed.toFixed(2)}`, 20, 100);
        text(`Player Y Velocity: ${player.velocityY.toFixed(2)}`, 20, 120);
        text(`Player Y Position: ${player.y.toFixed(2)}`, 20, 140);
    }
    
    if (gameState.isTutorial && gameState.currentLevel === 1) {
        let tutorialText = levels[0].tutorialText;
        for (let i = 0; i < tutorialText.length; i++) {
            text(tutorialText[i], 20, 120 + i * 30);
        }
    }
    
    // Show game over screen
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
        
        textSize(25);
        text("Press SPACE to play again", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 120);
        
        textAlign(LEFT, BASELINE);
    }
}

function drawStartPrompt() {
    fill(255);
    textSize(30);
    textAlign(CENTER, CENTER);
    text("TAP SPACE TO START", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    textAlign(LEFT, BASELINE);
}

function keyPressed() {
    // 保留空格键功能用于开始游戏和重新开始
    if (key === ' ') {
        if (gameState.isPaused) {
            // If game over state, press space to restart
            if (gameState.isGameOver) {
                gameState.isGameOver = false;
                gameState.currentLevel = 1;
                gameState.startTime = millis();
                loadLevel(1);
                return;
            }
            
            // Initialize audio on first space press
            if (!gameState.micPermissionGranted) {
                console.log('Initializing audio on user interaction...');
                initMicrophone();
            }
            
            gameState.isPaused = false;
            // If game just starting, set start time
            if (gameState.startTime === 0) {
                gameState.startTime = millis();
            }
        }
    }
    
    // 移除其他键盘控制，切换为声音控制
}

function keyReleased() {
    // 移除键盘释放事件的处理
}

function loadLevel(levelNum) {
    // Check if the requested level exists
    if (levelNum < 1 || levelNum > levels.length) {
        console.log(`Level ${levelNum} does not exist. Resetting to Level 1.`);
        levelNum = 1;
        // Optionally handle game completion here if levelNum > levels.length
        // For now, just loop back to level 1
    }
    
    gameState.currentLevel = levelNum;
    
    // Copy level design elements
    platforms = JSON.parse(JSON.stringify(levels[levelNum - 1].platforms));
    obstacles = JSON.parse(JSON.stringify(levels[levelNum - 1].obstacles));
    portal = JSON.parse(JSON.stringify(levels[levelNum - 1].portal));
    
    // Reset player position and state
    player.x = 100;
    player.y = SCREEN_HEIGHT - 100;
    gameState.respawnPoint = { x: 100, y: SCREEN_HEIGHT - 100 };
    player.velocityY = 0;
    player.speed = BASE_SPEED;
    player.isJumping = false;
    player.isFloating = false;
    gameState.isAccelerating = false;
    gameState.isDecelerating = false;
    gameState.isTutorial = levelNum === 1; // Only show tutorial text on level 1
    gameState.isPaused = true;  // Pause game when loading new level
    setupClouds(); // Reset clouds when loading a new level
}

function checkLevelComplete() {
    if (portal && 
        dist(player.x, player.y, portal.x, portal.y) < PORTAL_SIZE / 2 + NOTE_SIZE / 2) {
        // Level complete
        if (gameState.currentLevel < levels.length) {
            loadLevel(gameState.currentLevel + 1);
        } else {
            // Completed the last level
            gameState.totalTime = (millis() - gameState.startTime) / 1000;
            gameState.isGameOver = true;
            gameState.isPaused = true;
        }
    }
}

function updateSpeed() {
    // Only reset speed if not stopped by hiss
    if (!player.isDashing && player.speed !== 0) {
        player.speed = BASE_SPEED;
    }
}

// Sound classification callback
function gotSoundResult(error, results) {
    if (error) {
        console.error('Error in sound classification:', error);
        return;
    }
    
    if (results && results.length > 0) {
        soundLabel = results[0].label;
        soundConfidence = results[0].confidence;
        
        if (soundConfidence > 0.7) {
            console.log('=== Command Execution ===');
            console.log('Sound:', soundLabel, 'Confidence:', soundConfidence);
            console.log('Current State - Y:', player.y.toFixed(2), 'VelocityY:', player.velocityY.toFixed(2), 'Speed:', player.speed.toFixed(2));
            
            switch(soundLabel) {
                case "pop": // Jump
                    console.log('Executing JUMP command');
                    // Check if on platform
                    let onPlatform = false;
                    for (let platform of platforms) {
                        if (player.x + NOTE_SIZE/2 > platform.x && 
                            player.x - NOTE_SIZE/2 < platform.x + platform.width &&
                            Math.abs(player.y + NOTE_SIZE/2 - platform.y) <= PLATFORM_TOLERANCE) {
                            onPlatform = true;
                            break;
                        }
                    }
                    
                    if (onPlatform || Math.abs(player.velocityY) < 0.1) {
                        player.velocityY = JUMP_FORCE * TIME_FACTOR;
                        player.isSlowingFall = false; // Reset slow fall when jumping
                        console.log('New State - VelocityY:', player.velocityY.toFixed(2));
                    } else {
                        console.log('Cannot jump - Not on platform');
                    }
                    break;
                    
                case "blow": // Slow falling speed
                    console.log('Executing SLOW FALL command');
                    if (player.velocityY > 0) { // Only slow fall when actually falling
                        player.isSlowingFall = true;
                        // Immediately cap the speed if already falling
                        player.velocityY = min(player.velocityY, SLOW_FALL_SPEED * TIME_FACTOR);
                    }
                    break;
                    
                case "hiss": // Complete stop
                    console.log('Executing STOP command');
                    player.speed = 0;
                    player.isDashing = false;
                    player.dashFrames = 0;
                    player.isStopped = true;
                    break;
                    
                default:
                    // Reset states for other sounds
                    player.isSlowingFall = false;
                    if (!player.isDashing) {
                        player.speed = BASE_SPEED;
                        player.isStopped = false;
                    }
                    break;
            }
            console.log('=== End Command ===\n');
        }
    }
}