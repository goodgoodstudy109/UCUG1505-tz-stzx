// Game Constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MAX_SPEED = 10;
const MIN_SPEED = 2;
const BASE_SPEED = 4;
const ACCELERATION = 0.2;
const DECELERATION = 0.2;
const PLATFORM_HEIGHT = 20;
const NOTE_SIZE = 30;
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const PORTAL_SIZE = 50;
const PLATFORM_TOLERANCE = 5;

// Audio Classification
let classifier;
let soundLabel = 'listening...';
let soundConfidence = 0;
const soundModel = 'ml5_input_classifier_2025_04_08_13_10_28/model.json';
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
    speed: BASE_SPEED
};

let platforms = [];
let obstacles = [];
let portal = null;

// Level Design
const levels = [
    // Level 1: Tutorial - Only jumping
    {
        platforms: [
            { x: 0, y: SCREEN_HEIGHT - 50, width: 150 },
            { x: 200, y: SCREEN_HEIGHT - 100, width: 120 },
            { x: 370, y: SCREEN_HEIGHT - 150, width: 100 },
            { x: 520, y: SCREEN_HEIGHT - 150, width: 100 },
            { x: 670, y: SCREEN_HEIGHT - 120, width: 120 },
            { x: 840, y: SCREEN_HEIGHT - 160, width: 100 },
            { x: 990, y: SCREEN_HEIGHT - 180, width: 100 },
            { x: 1140, y: SCREEN_HEIGHT - 200, width: 120 },
        ],
        obstacles: [],
        portal: { x: 1200, y: SCREEN_HEIGHT - 250 },
        tutorialText: [
            "Welcome to Simple Platformer!",
            "Press E to jump",
            "Reach the PORTAL to complete level!"
        ]
    },
    // Level 2: Jumping and Stopping
    {
        platforms: [
            { x: 0, y: SCREEN_HEIGHT - 50, width: 150 },
            { x: 180, y: SCREEN_HEIGHT - 100, width: 120 },
            { x: 340, y: SCREEN_HEIGHT - 150, width: 100 },
            { x: 480, y: SCREEN_HEIGHT - 200, width: 120 },
            { x: 640, y: SCREEN_HEIGHT - 150, width: 150 },
            { x: 830, y: SCREEN_HEIGHT - 180, width: 120 },
            { x: 990, y: SCREEN_HEIGHT - 150, width: 150 }
        ],
        obstacles: [
            { x: 300, y: SCREEN_HEIGHT - 80, width: 30, height: 30 },
            { x: 600, y: SCREEN_HEIGHT - 180, width: 30, height: 30 }
        ],
        portal: { x: 1150, y: SCREEN_HEIGHT - 200 }
    }
];

function preload() {
    console.log('Preloading sound classification model...');
    classifier = ml5.soundClassifier(soundModel, {
        probabilityThreshold: 0.7
    }, modelReady);
}

function modelReady() {
    console.log('Sound classification model loaded successfully!');
    console.log('Model details:', classifier);
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
    console.log('Setup complete, waiting for user interaction...');
}

function draw() {
    background(26, 26, 26);
    
    // Draw staff background
    drawStaff();
    
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
        
        // Check level completion
        checkLevelComplete();
    } else {
        // Show "tap space to start" prompt
        drawStartPrompt();
    }
    
    // Draw UI
    drawUI();
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
    // Remove platforms that are off-screen
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
        portal.x -= player.speed;
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
    player.velocityY += GRAVITY;
    player.y += player.velocityY;
    
    // Improved platform collision detection
    let onPlatform = false;
    
    // Check static platform collisions
    for (let platform of platforms) {
        // Calculate collision direction
        const wasAbove = prevY + NOTE_SIZE/2 <= platform.y + PLATFORM_TOLERANCE;
        const isColliding = player.x + NOTE_SIZE/2 > platform.x && 
                           player.x - NOTE_SIZE/2 < platform.x + platform.width &&
                           player.y + NOTE_SIZE/2 > platform.y - PLATFORM_TOLERANCE && 
                           player.y - NOTE_SIZE/2 < platform.y + PLATFORM_HEIGHT;
        
        if (isColliding) {
            if (wasAbove) {
                // Collision from above - player stands on platform
                player.y = platform.y - NOTE_SIZE/2;
                player.velocityY = 0;
                player.isJumping = false;
                onPlatform = true;
                break;
            } else {
                // Collision from below - player hits platform bottom
                player.y = platform.y + PLATFORM_HEIGHT + NOTE_SIZE/2;
                player.velocityY = Math.abs(player.velocityY) * 0.5; // Small bounce
            }
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
        if (gameState.currentLevel < 2) {
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
    // Only respond to space key when game is paused
    if (gameState.isPaused) {
        if (key === ' ') {
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
        return;
    }
    
    if (key === 'q') {
        gameState.isAccelerating = true;
    } else if (key === 'w') {
        gameState.isDecelerating = true;
    } else if (key === 'e' && !player.isJumping) {
        player.velocityY = JUMP_FORCE;
        player.isJumping = true;
    }
}

function keyReleased() {
    if (key === 'q') {
        gameState.isAccelerating = false;
    } else if (key === 'w') {
        gameState.isDecelerating = false;
    }
}

function loadLevel(levelNum) {
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
    gameState.isAccelerating = false;
    gameState.isDecelerating = false;
    gameState.isTutorial = levelNum === 1;
    gameState.isPaused = true;  // Pause game when loading new level
}

function checkLevelComplete() {
    if (portal && 
        dist(player.x, player.y, portal.x, portal.y) < PORTAL_SIZE / 2 + NOTE_SIZE / 2) {
        // Level complete
        if (gameState.currentLevel < 2) {
            loadLevel(gameState.currentLevel + 1);
        } else {
            gameState.totalTime = (millis() - gameState.startTime) / 1000;
            gameState.isGameOver = true;
            gameState.isPaused = true;
        }
    }
}

function updateSpeed() {
    const prevSpeed = player.speed; // Record previous frame's speed
    
    if (gameState.isAccelerating) {
        player.speed = min(player.speed + ACCELERATION, MAX_SPEED);
    } else if (gameState.isDecelerating) {
        player.speed = max(player.speed - DECELERATION, MIN_SPEED);
    } else {
        // Gradually return to base speed, smoother
        if (player.speed > BASE_SPEED) {
            player.speed -= ACCELERATION / 5;
            if (player.speed < BASE_SPEED) player.speed = BASE_SPEED;
        } else if (player.speed < BASE_SPEED) {
            player.speed += ACCELERATION / 5;
            if (player.speed > BASE_SPEED) player.speed = BASE_SPEED;
        }
    }
}

// Sound classification callback
function gotSoundResult(error, results) {
    if (error) {
        console.error('Error in sound classification:', error);
        return;
    }
    
    // Log raw results for debugging
    console.log('Sound classification results:', results);
    
    if (results && results.length > 0) {
        // Update sound label and confidence
        soundLabel = results[0].label;
        soundConfidence = results[0].confidence;
        
        // Log detected sound and confidence
        console.log(`Detected sound: ${soundLabel} (confidence: ${(soundConfidence * 100).toFixed(1)}%)`);
        
        // Map sounds to game controls
        if (soundConfidence > 0.7) { // Only trigger if confidence is high enough
            console.log('Sound confidence threshold met, triggering action');
            if (soundLabel === 'pop' && !player.isJumping) {
                console.log('Triggering jump');
                player.velocityY = JUMP_FORCE;
                player.isJumping = true;
            } else if (soundLabel === 'hiss') {
                console.log('Triggering slowdown');
                gameState.isDecelerating = true;
            } else if (soundLabel === 'blow') {
                console.log('Triggering speedup');
                gameState.isAccelerating = true;
            }
        }
    }
}