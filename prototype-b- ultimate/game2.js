// Game Constants
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MAX_SPEED = 10;
const MIN_SPEED = 2;
const BASE_SPEED = 3;
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
const soundModel = 'tm-my-audio-model/model.json';
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
    velocityX: 0,
    velocityY: 0,
    isJumping: false,
    isFloating: false,
    speed: BASE_SPEED,
    onMovingPlatform: null
};

let platforms = [];
let obstacles = [];
let portal = null;

// Sky and Clouds
let clouds = [];
let skyColorTop;
let skyColorBottom;

// Level Design - Added Level 4 & 5 with Moving Platforms
const levels = [
    // Level 1: Introduction (Easier, Wider Platforms, No Obstacles)
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 250 },
            { x: 400, y: SCREEN_HEIGHT - 70, width: 200 },
            { x: 650, y: SCREEN_HEIGHT - 90, width: 180 },
            { x: 880, y: SCREEN_HEIGHT - 110, width: 150 },
            { x: 1080, y: SCREEN_HEIGHT - 100, width: 200 },
            { x: 1330, y: SCREEN_HEIGHT - 120, width: 150 },
            { x: 1530, y: SCREEN_HEIGHT - 140, width: 200 },
        ],
        obstacles: [],
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
            { x: 550, y: SCREEN_HEIGHT - 140, width: 120 },
            { x: 750, y: SCREEN_HEIGHT - 100, width: 100 },
            { x: 900, y: SCREEN_HEIGHT - 150, width: 130 },
            { x: 1100, y: SCREEN_HEIGHT - 180, width: 150 },
            { x: 1300, y: SCREEN_HEIGHT - 160, width: 180 },
        ],
        obstacles: [
            { x: 500, y: SCREEN_HEIGHT - 80, width: 30, height: 30 },
            { x: 850, y: SCREEN_HEIGHT - 130, width: 30, height: 30 },
            { x: 1200, y: SCREEN_HEIGHT - 210, width: 30, height: 30 }
        ],
        portal: { x: 1500, y: SCREEN_HEIGHT - 210 }
    },
    // Level 3: Advanced Platforming & Floating
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 180 },
            { x: 330, y: SCREEN_HEIGHT - 100, width: 100 },
            { x: 500, y: SCREEN_HEIGHT - 180, width: 80 },
            { x: 700, y: SCREEN_HEIGHT - 150, width: 120 },
            { x: 900, y: SCREEN_HEIGHT - 220, width: 100 },
            { x: 1150, y: SCREEN_HEIGHT - 190, width: 130 },
            { x: 1350, y: SCREEN_HEIGHT - 250, width: 100 },
        ],
        obstacles: [
            { x: 450, y: SCREEN_HEIGHT - 130, width: 30, height: 30 },
            { x: 650, y: SCREEN_HEIGHT - 210, width: 30, height: 30 },
            { x: 850, y: SCREEN_HEIGHT - 180, width: 30, height: 30 },
            { x: 1100, y: SCREEN_HEIGHT - 250, width: 30, height: 30 },
            { x: 1300, y: SCREEN_HEIGHT - 220, width: 30, height: 30 }
        ],
        portal: { x: 1550, y: SCREEN_HEIGHT - 300 }
    },
    // Level 4: Horizontal Moving Platforms
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 150 },
            { x: 300, y: SCREEN_HEIGHT - 100, width: 100 },
            // Moving Platform 1
            { x: 500, y: SCREEN_HEIGHT - 150, width: 120,
              moveType: 'horizontal', moveMin: 450, moveMax: 650, moveSpeed: 1.5, moveDirection: 1 },
            { x: 800, y: SCREEN_HEIGHT - 180, width: 100 },
             // Moving Platform 2 - Faster
            { x: 1000, y: SCREEN_HEIGHT - 220, width: 100,
              moveType: 'horizontal', moveMin: 950, moveMax: 1150, moveSpeed: -2, moveDirection: -1 },
            { x: 1300, y: SCREEN_HEIGHT - 200, width: 150 },
        ],
        obstacles: [
            { x: 400, y: SCREEN_HEIGHT - 130, width: 30, height: 30 }, // Before moving platform
            { x: 950, y: SCREEN_HEIGHT - 210, width: 30, height: 30 }, // Near moving platform
            { x: 1250, y: SCREEN_HEIGHT - 230, width: 30, height: 30 }
        ],
        portal: { x: 1500, y: SCREEN_HEIGHT - 250 }
    },
    // Level 5: Vertical & Mixed Moving Platforms
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 150 },
            // Vertical Moving Platform 1
            { x: 300, y: SCREEN_HEIGHT - 100, width: 100,
              moveType: 'vertical', moveMin: SCREEN_HEIGHT - 150, moveMax: SCREEN_HEIGHT - 80, moveSpeed: 1, moveDirection: 1 },
            { x: 500, y: SCREEN_HEIGHT - 180, width: 100 },
            // Horizontal Moving Platform
            { x: 700, y: SCREEN_HEIGHT - 220, width: 120,
              moveType: 'horizontal', moveMin: 650, moveMax: 850, moveSpeed: -1.5, moveDirection: -1 },
            // Vertical Moving Platform 2 - Faster
             { x: 1000, y: SCREEN_HEIGHT - 250, width: 80,
              moveType: 'vertical', moveMin: SCREEN_HEIGHT - 300, moveMax: SCREEN_HEIGHT - 200, moveSpeed: 2, moveDirection: 1 },
             { x: 1250, y: SCREEN_HEIGHT - 280, width: 150 }, // Final static platform
        ],
        obstacles: [
             { x: 450, y: SCREEN_HEIGHT - 200, width: 30, height: 30 }, // Near vertical platform path
             { x: 650, y: SCREEN_HEIGHT - 250, width: 30, height: 30 }, // Near horizontal platform path
             { x: 950, y: SCREEN_HEIGHT - 280, width: 30, height: 30 }, // Near second vertical platform
             { x: 1150, y: SCREEN_HEIGHT - 310, width: 30, height: 30 }
        ],
        portal: { x: 1450, y: SCREEN_HEIGHT - 330 } // Higher portal
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
        updatePlatforms(); // Updates platform positions (including movement)
        updatePlayer();    // Updates player physics, collisions, and scrolls obstacles/portal
        updateClouds(); // Update cloud positions
        
        // checkLevelComplete(); // REMOVED - Called within updatePlayer during portal collision
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
        let platformMovedX = 0;
        let platformMovedY = 0;

        // Handle platform's own movement logic
        if (platform.moveType) {
            let speed = platform.moveSpeed * platform.moveDirection;
            if (platform.moveType === 'horizontal') {
                platform.x += speed;
                platformMovedX = speed;
                if ((platform.moveDirection === 1 && platform.x >= platform.moveMax) ||
                    (platform.moveDirection === -1 && platform.x <= platform.moveMin)) {
                    platform.moveDirection *= -1;
                    platform.x = constrain(platform.x, platform.moveMin, platform.moveMax); // Clamp position
                }
            } else if (platform.moveType === 'vertical') {
                platform.y += speed;
                platformMovedY = speed;
                 if ((platform.moveDirection === 1 && platform.y >= platform.moveMax) ||
                    (platform.moveDirection === -1 && platform.y <= platform.moveMin)) {
                    platform.moveDirection *= -1;
                     platform.y = constrain(platform.y, platform.moveMin, platform.moveMax); // Clamp position
                }
            }
        }
        // Store the platform's movement delta for this frame (used for player sticking)
        platform.dx = platformMovedX;
        platform.dy = platformMovedY;

        // Update platform's apparent screen position based *only* on player's world scroll speed
        // platform.x -= player.speed; // This is handled implicitly now by drawing relative to player
                                     // We'll adjust drawing instead, or keep track of a camera/offset.
                                     // Let's keep it simple for now: draw everything relative to world coords,
                                     // but update obstacles/portal relative to player scroll in updatePlayer.
                                     // Platforms themselves don't need the -= player.speed here anymore
                                     // if their coordinates are absolute world coordinates.
    }

    // Remove platforms that are way off-screen (based on absolute world coords potentially)
    // This filter might need adjustment depending on how view/scrolling is ultimately handled.
    // Let's keep the previous filter logic for now, assuming platform.x is adjusted somewhere for drawing.
    // platforms = platforms.filter(p => p.x + p.width > -SCREEN_WIDTH); 
    // Re-thinking: updatePlatforms should just update the *world state*. Drawing handles the view.
}

function drawPlatforms() {
    fill(255);
    noStroke();
    for (let platform of platforms) {
        // Draw platform at its current world coordinate (scrolling handled by camera/view offset conceptually)
        // For now, let's assume drawing directly uses world coords and the view scrolls implicitly.
        // Let's re-introduce the scroll here for drawing temporarily, simpler than a full camera.
        let screenX = platform.x - (player.x - SCREEN_WIDTH / 2); // Calculate screen pos based on player center
        rect(screenX, platform.y, platform.width, PLATFORM_HEIGHT, 5);
    }
}

function drawObstacles() {
    fill(150, 0, 0);
    for (let obstacle of obstacles) {
        let screenX = obstacle.x - (player.x - SCREEN_WIDTH / 2);
        rect(screenX, obstacle.y, obstacle.width, obstacle.height);
    }
}

function drawPortal() {
    if (portal) {
        let screenX = portal.x - (player.x - SCREEN_WIDTH / 2);
        fill(0, 200, 255, 200); // Slightly transparent
        ellipse(screenX, portal.y, PORTAL_SIZE, PORTAL_SIZE);
         // Add a simple pulsating effect
         let pulse = sin(frameCount * 0.05) * 5;
         fill(255, 255, 255, 100);
         ellipse(screenX, portal.y, PORTAL_SIZE * 0.6 + pulse, PORTAL_SIZE * 0.6 + pulse);
    }
}

function updatePlayer() {
    // 1. Apply inherent player speed (world scrolling) - Player stays centered
    // Instead of moving the player right, we effectively move the world left.
    // We'll apply this scroll to obstacles and the portal later.
    // Player's *intended* horizontal movement speed is player.speed.
    let worldScrollAmount = player.speed;

    // 2. Apply movement from platform sticking (if any)
    let platformDX = 0;
    let platformDY = 0;
    if (player.onMovingPlatform) {
        platformDX = player.onMovingPlatform.dx; // Horizontal movement from platform
        platformDY = player.onMovingPlatform.dy; // Vertical movement from platform
        player.x += platformDX;
        player.y += platformDY; // Apply vertical movement directly
        // console.log(`Sticking: dX=${platformDX}, dY=${platformDY}`);
    }

    // 3. Update player speed based on voice commands (affects world scroll)
    updateSpeed(); // Updates player.speed for the *next* frame's scroll

    // 4. Apply gravity
    // If sticking to a platform moving upwards, reduce gravity's effect? Maybe not needed.
    player.velocityY += GRAVITY;
    if (player.isFloating) {
        player.velocityY *= 0.7; // Apply drag/slower gravity when floating
    }

    // 5. Apply vertical velocity
    player.y += player.velocityY;

    // 6. Collision Detection and Resolution
    let onPlatform = false;
    let landedOnPlatform = null; // Track the specific platform landed on this frame
    player.onMovingPlatform = null; // Reset before checking collisions

    for (let platform of platforms) {
        // Update platform screen position for collision checks relative to player
        // (alternative to scrolling everything in draw)
        // platform.x -= worldScrollAmount; // Apply scroll here if coords are world coords
        
        const isColliding = player.x + NOTE_SIZE/2 > platform.x &&
                           player.x - NOTE_SIZE/2 < platform.x + platform.width &&
                           player.y + NOTE_SIZE/2 > platform.y - PLATFORM_TOLERANCE && // Check slightly below platform top
                           player.y + NOTE_SIZE/2 < platform.y + platform.height; // Check within platform height

        if (isColliding) {
             const prevBottom = player.y - player.velocityY + NOTE_SIZE/2; // Estimate previous bottom position
             const wasAbove = prevBottom <= platform.y + PLATFORM_TOLERANCE; // Check if previous bottom was above current platform top

            if (wasAbove && player.velocityY >= 0) { // Landed: Was above and moving down/still
                player.y = platform.y - NOTE_SIZE/2; // Correct position to be on top
                player.velocityY = 0;
                player.isJumping = false;
                player.isFloating = false; // Stop floating on landing
                onPlatform = true;
                landedOnPlatform = platform; // Store the platform landed on
                break; // Stop checking after landing on one platform
            } else if (!wasAbove && player.velocityY < 0) { // Hit head from below
                 player.y = platform.y + PLATFORM_HEIGHT + NOTE_SIZE/2;
                 player.velocityY *= -0.3; // Bounce back down slightly
            } else if (player.x + NOTE_SIZE/2 > platform.x && player.x - NOTE_SIZE/2 < platform.x + platform.width) {
                // Sideways collision (can push player out if needed, complex)
                // Simple approach: ignore for now, focus on vertical.
            }
        }
    }

    // Set the sticky platform for the *next* frame if we landed on one
    if (landedOnPlatform && landedOnPlatform.moveType) {
        player.onMovingPlatform = landedOnPlatform;
        // console.log("Landed on moving platform ID (e.g., first x coord):", landedOnPlatform.x);
    }

    // 7. Update and Check Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obstacle = obstacles[i];
        obstacle.x -= worldScrollAmount; // Apply world scroll

        if (player.x + NOTE_SIZE/2 > obstacle.x &&
            player.x - NOTE_SIZE/2 < obstacle.x + obstacle.width &&
            player.y + NOTE_SIZE/2 > obstacle.y &&
            player.y - NOTE_SIZE/2 < obstacle.y + obstacle.height) {
            respawnPlayer();
            return; // Stop further updates after respawn
        }
        // Remove obstacles way off-screen left
        if (obstacle.x + obstacle.width < -SCREEN_WIDTH) {
            obstacles.splice(i, 1);
        }
    }

    // 8. Update and Check Portal
     if (portal) {
        portal.x -= worldScrollAmount; // Apply world scroll

        if (dist(player.x, player.y, portal.x, portal.y) < PORTAL_SIZE / 2 + NOTE_SIZE / 2) {
             checkLevelComplete(); // Call the level completion logic
             return; // Stop further updates
        }
        // Remove portal if way off-screen (optional)
        // if (portal.x + PORTAL_SIZE < -SCREEN_WIDTH) { portal = null; }
    }

    // 9. Boundary check (Fall off screen)
    if (player.y > SCREEN_HEIGHT + NOTE_SIZE * 2) { // Allow falling further
        respawnPlayer();
    }

    // Player's X position in the world changes due to platform sticking.
    // The VIEW scrolls based on player.speed.
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
    // Use levels.length to correctly check against the number of defined levels (now 5)
    if (levelNum < 1 || levelNum > levels.length) {
        console.log(`Level ${levelNum} does not exist or game completed. Resetting to Level 1.`);
        // Handle game completion logic maybe? For now, reset.
         gameState.isGameOver = true; // Trigger game over if trying to load non-existent level > max
         gameState.isPaused = true;
         if (levelNum > 0) { // Calculate time only if it was a valid completion attempt
            gameState.totalTime = (millis() - gameState.startTime) / 1000;
         }
         // Don't actually load level 1 automatically, just show game over.
        return; // Stop loading process
    }

    gameState.currentLevel = levelNum;

    // Deep copy level design elements using JSON parse/stringify
    const currentLevelData = JSON.parse(JSON.stringify(levels[levelNum - 1]));
    platforms = currentLevelData.platforms; // Moving platform states are reset here
    obstacles = currentLevelData.obstacles;
    portal = currentLevelData.portal;

    // Reset player position and state
    player.x = 100; // Reset player world position
    player.y = SCREEN_HEIGHT - 100;
    // gameState.respawnPoint = { x: 100, y: SCREEN_HEIGHT - 100 }; // Respawn point might need adjustment relative to level start?
    player.velocityX = 0;
    player.velocityY = 0;
    player.speed = BASE_SPEED;
    player.isJumping = false;
    player.isFloating = false;
    player.onMovingPlatform = null; // Crucial reset
    gameState.isAccelerating = false;
    gameState.isDecelerating = false;
    gameState.isTutorial = levelNum === 1; 
    gameState.isPaused = true;  
    gameState.isGameOver = false; 
    setupClouds(); 
}

function checkLevelComplete() {
     // Logic remains the same: load next level or trigger game over
    if (gameState.currentLevel < levels.length) { 
        loadLevel(gameState.currentLevel + 1);
    } else {
        gameState.totalTime = (millis() - gameState.startTime) / 1000;
        gameState.isGameOver = true;
        gameState.isPaused = true;
    }
}

function updateSpeed() {
    // Logic remains the same - affects player.speed for next frame's scroll
    if (gameState.isAccelerating) {
        player.speed = min(player.speed + ACCELERATION, MAX_SPEED);
    } else if (gameState.isDecelerating) {
        player.speed = max(player.speed - DECELERATION, MIN_SPEED);
    } else {
        // Gradually return to base speed, smoother
        if (player.speed > BASE_SPEED) {
            player.speed -= ACCELERATION / 2; // Slightly faster return to base
            if (player.speed < BASE_SPEED) player.speed = BASE_SPEED;
        } else if (player.speed < BASE_SPEED) {
            player.speed += ACCELERATION / 2; // Slightly faster return to base
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
        
        // 只处理游戏未暂停状态下的声音控制
        if (!gameState.isPaused && soundConfidence > 0.7) {
            switch(soundLabel) {
                case "blow": // 吹气 - 加速
                    console.log('Triggering speedup');
                    gameState.isAccelerating = true;
                    gameState.isDecelerating = false;
                    break;
                case "hiss": // 嘶声 - 减速
                    console.log('Triggering slowdown');
                    gameState.isDecelerating = true;
                    gameState.isAccelerating = false;
                    break;
                case "pop": // 啪声 - 跳跃
                    if (!player.isJumping) {
                        console.log('Triggering jump');
                        player.velocityY = JUMP_FORCE;
                        player.isJumping = true;
                    }
                    break;
                case "hat": // 帽声 - 浮空（缓慢下落）
                    console.log('Triggering floating');
                    player.isFloating = true;
                    break;
                default:
                    // 对于其他声音或背景噪音，重置加速、减速和浮空状态
                    gameState.isAccelerating = false;
                    gameState.isDecelerating = false;
                    player.isFloating = false;
                    break;
            }
        }
    }
}