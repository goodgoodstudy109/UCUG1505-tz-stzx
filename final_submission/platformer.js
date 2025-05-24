// Vowel-Controlled Platformer using P5.js
let player;
let platforms = [];
let obstacles = [];
let clouds = [];
let portal;
let currentLevel = 1;
let formantAnalyzer;
let f1, f2, confidence;

// Game Constants
const GRAVITY = 0.3;  // Reduced gravity for better jump feel
const MAX_SPEED = 40;  // Increased from 20 to 40
const PLATFORM_HEIGHT = 20;
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const TIME_FACTOR = 0.5;  // Global time scaling factor
const EXPLOSION_DURATION = 30; // Frames for explosion animation
const REFERENCE_LINE_COLOR = [255, 0, 0, 128];  // Semi-transparent red for reference lines

// Camera settings
const CAMERA_OFFSET_X = SCREEN_WIDTH * 0.3;  // Keep player 30% from left edge
const CAMERA_OFFSET_Y = SCREEN_HEIGHT * 0.5;  // Keep player in vertical center

// Formant visualization settings
const FORMANT_VIZ_WIDTH = 200;
const FORMANT_VIZ_HEIGHT = 200;
const FORMANT_VIZ_X = SCREEN_WIDTH - FORMANT_VIZ_WIDTH - 20;
const FORMANT_VIZ_Y = 60;
const MIN_F1 = 200;   // Minimum expected F1 frequency (Hz)
const MAX_F1 = 1000;  // Maximum expected F1 frequency (Hz)
const MIN_F2 = 700;   // Minimum expected F2 frequency (Hz)
const MAX_F2 = 2500;  // Maximum expected F2 frequency (Hz)
const MIN_CONFIDENCE = 0.3;  // Minimum confidence threshold for formant detection
const MIN_AMPLITUDE = 400;   // Minimum amplitude threshold
const MAX_AMPLITUDE = 2000;  // Maximum amplitude for full effect
const MIN_AMPLITUDE_SCALE = 0.3; // Minimum movement scale at low amplitude
const AMPLITUDE_SCALE = 1.5; // How much amplitude affects movement
const FORMANT_SMOOTHING = 0.85;  // Smoothing factor for formant values

// Colors (will be initialized in setup)
let skyColorTop;
let skyColorBottom;

// Game state
const gameState = {
    isPaused: true,
    explosionActive: false,
    explosionPosition: { x: 0, y: 0 },
    explosionTimer: 0,
    countdown: 3,
    isGameOver: false,
    showTitle: true,
    amplitude: 0, // Add amplitude tracking
    pendingGameOver: false,
    showCongratulations: false, // New state for congrats screen
    congratsCountdown: 3, // Countdown before restarting
    explosionTriggeredGameOver: false // Track if bomb should cause game over after explosion
};

// Level Design from prototype-b
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
    },
    // Level 2: Advanced Platforming & Floating
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
    },
    // Level 3: Moving Platforms
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 150 },
            // Add vertical moving platform
            { x: 300, y: SCREEN_HEIGHT - 100, width: 100,
              moveType: 'vertical', moveMin: SCREEN_HEIGHT - 150, moveMax: SCREEN_HEIGHT - 80, moveSpeed: 1, moveDirection: 1 },
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
    }
];

// Moving average settings
const MOVING_AVG_WINDOW = 5;  // Number of samples to average
let f1History = [];
let f2History = [];
let confidenceHistory = [];

// Vowel point class for dragging functionality
class VowelPoint {
    constructor(f1, f2, label) {
        this.f1 = f1;
        this.f2 = f2;
        this.label = label;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.updatePosition();
    }

    updatePosition() {
        // Map formant values to screen coordinates
        this.x = map(this.f2, MIN_F2, MAX_F2, FORMANT_VIZ_X, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH);
        this.y = map(this.f1, MIN_F1, MAX_F1, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y);
    }

    containsPoint(x, y) {
        return dist(x, y, this.x, this.y) < 10;
    }

    startDrag(x, y) {
        this.isDragging = true;
        this.dragOffsetX = this.x - x;
        this.dragOffsetY = this.y - y;
    }

    stopDrag() {
        this.isDragging = false;
        // Update F1 and F2 based on new position
        this.f2 = map(this.x, FORMANT_VIZ_X, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH, MIN_F2, MAX_F2);
        this.f1 = map(this.y, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y, MIN_F1, MAX_F1);
        showConfigButton();
    }

    updateDrag(x, y) {
        if (this.isDragging) {
            this.x = x + this.dragOffsetX;
            this.y = y + this.dragOffsetY;
        }
    }
}

// Load vowel points from config
let vowelPoints = [];
let showConfig = false;
let configText = '';

// Movement settings
let movementConfig = {
    horizontalFactor: 2.0,  // Increased from 1.0 to 2.0
    verticalFactor: 8.0     // Increased from 5.0 to 8.0
};

function loadVowelConfig() {
    console.log('Loading vowel config...');
    fetch('vowel_config.json')
        .then(response => {
            console.log('Response status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('Loaded vowel config:', data);
            vowelPoints = [];
            // Sort the vowel keys to ensure consistent order
            const vowelKeys = Object.keys(data.vowels).sort();
            console.log('Vowel keys:', vowelKeys);
            for (let key of vowelKeys) {
                const vowel = data.vowels[key];
                console.log('Creating vowel point:', key, vowel);
                vowelPoints.push(new VowelPoint(vowel.f1, vowel.f2, vowel.label));
            }
            console.log('Created vowel points:', vowelPoints);
            
            // Load movement config
            if (data.movement) {
                movementConfig = data.movement;
            }
        })
        .catch(error => {
            console.error('Error loading vowel config:', error);
            console.error('Error details:', error.message);
        });
}

function showConfigButton() {
    showConfig = true;
}

function generateConfigText() {
    const config = { vowels: {} };
    vowelPoints.forEach((point, index) => {
        config.vowels[`vowel_${index}`] = {
            f1: point.f1,
            f2: point.f2,
            label: point.label
        };
    });
    return JSON.stringify(config, null, 4);
}

class Player {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = createVector(0, 0);
        this.size = 40;
        this.color = color(255, 255, 0);
    }
}

class Platform {
    constructor(x, y, w, h, moveType, moveMin, moveMax, moveSpeed, moveDirection) {
        this.position = createVector(x, y);
        this.size = createVector(w, h);
        this.moveType = moveType;
        this.moveMin = moveMin;
        this.moveMax = moveMax;
        this.moveSpeed = moveSpeed;
        this.moveDirection = moveDirection;
    }
}

class Obstacle {
    constructor(x, y, w, h) {
        this.position = createVector(x, y);
        this.size = createVector(w, h);
    }
}

class FormantAnalyzer {
    constructor() {
        this.isRunning = false;
        this.audioContext = null;
        this.mediaStream = null;
        this.analyser = null;
        this.scriptProcessor = null;
        this.websocket = null;
        this.lastF1 = null;
        this.lastF2 = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000; // 2 seconds
    }
    
    async start() {
        try {
            await this.connectWebSocket();
            
            // Get microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Set up audio context and analyzer
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            // Connect microphone to analyzer
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);
            
            // Start processing
            this.isRunning = true;
            this.processAudio();
            
        } catch (error) {
            console.error('Error starting formant analyzer:', error);
        }
    }
    
    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            try {
                this.websocket = new WebSocket('ws://localhost:8765');
                
                this.websocket.onopen = () => {
                    console.log('Connected to formant analysis server');
                    this.reconnectAttempts = 0;
                    resolve();
                };
                
                this.websocket.onmessage = (event) => {
                    const result = JSON.parse(event.data);
                    f1 = result.f1;
                    f2 = result.f2;
                    confidence = result.confidence;
                    gameState.amplitude = result.amplitude || 0;
                };
                
                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                this.websocket.onclose = () => {
                    console.log('Disconnected from formant analysis server');
                    if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                        setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
                    }
                };
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                reject(error);
            }
        });
    }
    
    processAudio() {
        if (!this.isRunning) {
            return;
        }
        
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            requestAnimationFrame(() => this.processAudio());
            return;
        }
        
        // Get audio data
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Float32Array(bufferLength);
        this.analyser.getFloatTimeDomainData(dataArray);
        
        // Convert to 16-bit PCM
        const pcmData = new Int16Array(dataArray.length);
        for (let i = 0; i < dataArray.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, Math.round(dataArray[i] * 32767)));
        }
        
        try {
            // Send to Python server
            this.websocket.send(JSON.stringify({
                audio: Array.from(pcmData),
                sampleRate: this.audioContext.sampleRate
            }));
        } catch (error) {
            console.error('Error sending audio data:', error);
        }
        
        // Continue processing
        requestAnimationFrame(() => this.processAudio());
    }
    
    stop() {
        this.isRunning = false;
        if (this.websocket) {
            this.websocket.close();
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
    }
}

let prevLevelButton, nextLevelButton;

// Camera class to handle coordinate transformations
class Camera {
    constructor() {
        this.position = createVector(0, 0);
        this.target = createVector(0, 0);
        this.offsetX = SCREEN_WIDTH * 0.3;
        this.offsetY = SCREEN_HEIGHT * 0.5;
    }

    update() {
        // Smoothly follow target
        this.position.x = lerp(this.position.x, this.target.x - this.offsetX, 0.1);
        this.position.y = lerp(this.position.y, this.target.y - this.offsetY, 0.1);
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.position.x,
            y: worldY - this.position.y
        };
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.position.x,
            y: screenY + this.position.y
        };
    }

    // Apply camera transform for drawing
    begin() {
        push();
        translate(-this.position.x, -this.position.y);
    }

    // End camera transform
    end() {
        pop();
    }
}

// Add camera to game state
let camera;

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    
    // Initialize colors
    skyColorTop = color(135, 206, 250);
    skyColorBottom = color(173, 216, 230);
    
    // Create player and camera
    player = new Player(100, SCREEN_HEIGHT - 100);
    camera = new Camera();
    
    // Load first level
    loadLevel(1);
    
    // Setup clouds
    setupClouds();
    
    // Initialize formant analyzer
    formantAnalyzer = new FormantAnalyzer();
    formantAnalyzer.start();
    
    // Load vowel points and movement config
    loadVowelConfig();

    // Start initial countdown
    startCountdown();

    // Add Previous/Next Level Buttons
    prevLevelButton = createButton('Previous Level');
    nextLevelButton = createButton('Next Level');
    positionLevelButtons();
    prevLevelButton.mousePressed(() => {
        if (currentLevel > 1) {
            currentLevel--;
            loadLevel(currentLevel);
            startCountdown();
        }
    });
    nextLevelButton.mousePressed(() => {
        if (currentLevel < levels.length) {
            currentLevel++;
            loadLevel(currentLevel);
            startCountdown();
        }
    });
}

function positionLevelButtons() {
    // Place buttons at the bottom center of the window
    const spacing = 20;
    const btnWidth = 120;
    const y = windowHeight - 50;
    const totalWidth = btnWidth * 2 + spacing;
    const xStart = (windowWidth - totalWidth) / 2;
    prevLevelButton.position(xStart, y);
    nextLevelButton.position(xStart + btnWidth + spacing, y);
}

function windowResized() {
    resizeCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    positionLevelButtons();
}

function setupClouds() {
    clouds = [];
    for (let i = 0; i < 10; i++) {
        clouds.push({
            x: random(-width * 0.5, width * 1.5),
            y: random(50, height * 0.6),
            size: random(50, 150),
            speed: random(0.1, 0.5)
        });
    }
}

function draw() {
    // Update camera to follow player
    camera.target = player.position;
    camera.update();
    
    // Draw sky gradient background
    drawSkyGradient();
    
    // Begin camera transform
    camera.begin();
    
    // Draw game world
    drawReferenceLines();
    drawClouds();
    drawPlatforms();
    drawObstacles();
    drawPortal();
    drawPlayer();
    
    // End camera transform
    camera.end();
    
    // Draw formant visualization (not affected by camera)
    drawFormantVisualization();
    
    // Draw screens based on game state
    if (gameState.showCongratulations) {
        drawCongratulationsScreen();
    } else if (gameState.isPaused) {
        if (gameState.showTitle) {
            drawTitleScreen();
        }
    } else {
        // Update game state
        updatePlatforms();
        updateObstacles();
        updatePortal();
        updatePlayer();
        updateClouds();
        updateGameState();
        
        // Check level completion
        checkLevelComplete();
    }
    
    // Draw UI
    drawUI();

    // Draw tutorial for Level 1
    if (currentLevel === 1) {
        drawTutorial();
    }
}

function drawSkyGradient() {
    // Create a vertical gradient from top to bottom
    for (let y = 0; y < height; y++) {
        let inter = map(y, 0, height, 0, 1);
        let c = lerpColor(skyColorTop, skyColorBottom, inter);
        stroke(c);
        line(0, y, width, y);
    }
    noStroke();
}

function drawReferenceLines() {
    // Draw reference lines as part of the game world
    stroke(REFERENCE_LINE_COLOR);
    strokeWeight(2);
    
    // Draw ceiling line (very long)
    line(-width * 10, 0, width * 20, 0);
    
    // Draw ground line (very long)
    line(-width * 10, height, width * 20, height);
    
    noStroke();
}

function drawClouds() {
    fill(255, 255, 255, 200);
    noStroke();
    for (let cloud of clouds) {
        ellipse(cloud.x, cloud.y, cloud.size * 1.2, cloud.size * 0.8);
        ellipse(cloud.x + cloud.size * 0.3, cloud.y + cloud.size * 0.2, cloud.size * 0.8, cloud.size * 0.6);
        ellipse(cloud.x - cloud.size * 0.4, cloud.y + cloud.size * 0.1, cloud.size * 0.9, cloud.size * 0.7);
    }
}

function updateClouds() {
    for (let cloud of clouds) {
        cloud.x -= cloud.speed * (player.velocity.x * TIME_FACTOR * 0.5 + 0.2);
        if (cloud.x + cloud.size < -width * 0.5) {
            cloud.x = width * 1.5 + random(100);
            cloud.y = random(50, height * 0.6);
            cloud.size = random(50, 150);
            cloud.speed = random(0.1, 0.5);
        }
    }
}

function drawPlatforms() {
    fill(255);
    noStroke();
    for (let platform of platforms) {
        rect(platform.position.x, platform.position.y, platform.size.x, PLATFORM_HEIGHT, 5);
    }
}

function updatePlatforms() {
    // Update all platforms
    for (let platform of platforms) {
        // Handle moving platforms
        if (platform.moveType) {
            // Update platform position based on movement type
            if (platform.moveType === 'horizontal') {
                // Move horizontally in world space
                platform.position.x += platform.moveSpeed * platform.moveDirection;
                
                // Check boundaries in world space
                if (platform.position.x <= platform.moveMin || platform.position.x >= platform.moveMax) {
                    platform.moveDirection *= -1;
                }
            } else if (platform.moveType === 'vertical') {
                // Move vertically in world space
                platform.position.y += platform.moveSpeed * platform.moveDirection;
                
                // Check boundaries in world space
                if (platform.position.y <= platform.moveMin || platform.position.y >= platform.moveMax) {
                    platform.moveDirection *= -1;
                }
            }
        }
    }

    // Remove platforms that are too far behind the player
    platforms = platforms.filter(p => p.position.x + p.size.x > player.position.x - SCREEN_WIDTH);
}

function drawObstacles() {
    for (let obstacle of obstacles) {
        // Draw bomb
        fill(30, 30, 30);
        ellipse(obstacle.position.x + obstacle.size.x/2, obstacle.position.y + obstacle.size.y/2, obstacle.size.x, obstacle.size.y);
        
        // Bomb fuse
        stroke(150, 75, 0);
        strokeWeight(2);
        line(
            obstacle.position.x + obstacle.size.x/2,
            obstacle.position.y,
            obstacle.position.x + obstacle.size.x/2 + 5,
            obstacle.position.y - 10
        );
        
        // Fuse spark
        noStroke();
        fill(255, 255, 0);
        ellipse(
            obstacle.position.x + obstacle.size.x/2 + 5,
            obstacle.position.y - 10,
            4, 4
        );
    }
    
    // Draw explosion if active
    if (gameState.explosionActive) {
        drawExplosion(gameState.explosionPosition.x, gameState.explosionPosition.y);
    }
}

function drawExplosion(x, y) {
    const progress = gameState.explosionTimer / EXPLOSION_DURATION;
    const explosionSize = progress < 0.5 ?
        map(progress, 0, 0.5, 30, 100) :
        map(progress, 0.5, 1, 100, 50);
    const alpha = map(progress, 0, 1, 255, 0);
    
    noStroke();
    fill(255, 100, 0, alpha * 0.7);
    ellipse(x, y, explosionSize * 1.2, explosionSize * 1.2);
    
    fill(255, 255, 0, alpha);
    ellipse(x, y, explosionSize * 0.7, explosionSize * 0.7);
    
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const angle = map(i, 0, particleCount, 0, TWO_PI);
        const particleDistance = explosionSize * 0.6 * (0.8 + random(0.4));
        const particleX = x + cos(angle) * particleDistance;
        const particleY = y + sin(angle) * particleDistance;
        const particleSize = random(3, 8) * (1 - progress * 0.5);
        
        fill(255, random(150, 255), 0, alpha * random(0.7, 1));
        ellipse(particleX, particleY, particleSize, particleSize);
    }
}

function updateObstacles() {
    // Remove obstacles that are too far behind the player
    obstacles = obstacles.filter(o => o.position.x + o.size.x > player.position.x - SCREEN_WIDTH);
}

function drawPortal() {
    if (portal) {
        // Draw portal ring
        noFill();
        stroke(255, 0, 255);
        strokeWeight(3);
        ellipse(portal.x, portal.y, 50, 50);
        
        // Draw pulsing portal center
        let pulse = sin(frameCount * 0.05) * 5;
        fill(255, 0, 255, 100);
        noStroke();
        ellipse(portal.x, portal.y, 30 + pulse, 30 + pulse);
        
        // Draw portal particles
        for (let i = 0; i < 8; i++) {
            const angle = frameCount * 0.1 + i * PI/4;
            const x = portal.x + cos(angle) * 25;
            const y = portal.y + sin(angle) * 25;
            fill(255, 0, 255, 150);
            ellipse(x, y, 5, 5);
        }
    }
}

function updatePortal() {
    // Portal stays in world space, no need to move it
    // Only remove if too far behind player
    if (portal && portal.x + 50 < player.position.x - SCREEN_WIDTH) {
        portal = null;
    }
}

function drawPlayer() {
    // Draw note head centered at player position
    fill(255, 255, 0);
    noStroke();
    const headW = player.size * 0.9;
    const headH = player.size * 0.7;
    ellipse(player.position.x, player.position.y, headW, headH);
    // Draw stem starting at the right edge of the note head, extending upward (moved slightly left)
    const stemHeight = player.size * 1.5;
    const stemX = player.position.x + headW / 2 - 4;
    const stemY = player.position.y;
    fill(255, 255, 0);
    rect(stemX, stemY - stemHeight, 3, stemHeight);
}

function drawUI() {
    // Only show level info
    fill(200);
    textSize(16);
    text(`Level ${currentLevel}`, width - 100, 30);
}

function drawTitleScreen() {
    // Semi-transparent black overlay
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    
    // Game title
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("Vowelocity Voyage", width/2, height/2 - 100);
    
    // Countdown
    if (gameState.countdown > 0) {
        textSize(64);
        text(gameState.countdown, width/2, height/2);
    } else {
        textSize(32);
        text("Say 'spEEd' to start!", width/2, height/2);
    }
    
    // Reset text alignment
    textAlign(LEFT, BASELINE);
}

function updateGameState() {
    if (gameState.isGameOver) {
        // Immediately transition to title screen
        gameState.showTitle = true;
        gameState.isGameOver = false;
        gameState.countdown = 3;
        currentLevel = 1; // Reset to level 1
        loadLevel(currentLevel);
        startCountdown(); // Start the countdown
    }
}

function startCountdown() {
    if (gameState.countdown > 0) {
        setTimeout(() => {
            gameState.countdown--;
            if (gameState.countdown > 0) {
                startCountdown();
            } else {
                // Start the level when countdown reaches 0
                setTimeout(() => {
                    gameState.isPaused = false;
                    gameState.showTitle = false;
                }, 1000); // Wait 1 second after countdown before starting
            }
        }, 1000);
    }
}

function checkLevelComplete() {
    if (portal && dist(player.position.x, player.position.y, portal.x, portal.y) < 50) {
        if (currentLevel < levels.length) {
            currentLevel++;
            loadLevel(currentLevel);
            startCountdown(); // Start countdown for new level
        } else {
            // Completed last level, show congratulations screen
            gameState.showCongratulations = true;
            gameState.congratsCountdown = 3;
            startCongratsCountdown();
        }
    }
}

function updatePlayer() {
    if (!gameState.isPaused && !gameState.isGameOver) {
        // Reset velocity to zero by default
        player.velocity.x = 0;
        
        // Apply formant-based controls
        if (f1 && f2 && confidence > MIN_CONFIDENCE) {
            // Calculate amplitude scaling factor (0.3 to 1.0)
            const amplitudeScale = map(
                constrain(gameState.amplitude, MIN_AMPLITUDE, MAX_AMPLITUDE),
                MIN_AMPLITUDE, MAX_AMPLITUDE,
                MIN_AMPLITUDE_SCALE, 1.0
            );
            
            // F2 (front-back) controls horizontal movement
            const neutralF2 = 840;
            
            // Calculate distance from neutral point
            const f2Distance = f2 - neutralF2;
            
            // Apply asymmetric scaling for movement (stronger left movement)
            let f2_normalized = f2Distance / (MAX_F2 - MIN_F2);
            if (f2_normalized < 0) {
                f2_normalized *= 1.5; // Amplify left movement by 50%
            }
            
            // Apply amplitude scaling to the normalized value
            f2_normalized *= amplitudeScale;
            
            // Direct velocity control with amplitude scaling and time factor
            player.velocity.x = f2_normalized * MAX_SPEED * movementConfig.horizontalFactor * confidence * TIME_FACTOR;
            
            // F1 (openness) controls antigravity
            const neutralF1 = 375;  // Raised from 350 to 375
            const balanceF1 = 475;
            let antigravityForce = 0;
            
            if (f1 >= neutralF1) {
                const f1Range = balanceF1 - neutralF1;  // Now 100Hz range
                const f1Offset = f1 - neutralF1;
                
                // Calculate force with time factor
                antigravityForce = (f1Offset / f1Range) * GRAVITY * movementConfig.verticalFactor * confidence * TIME_FACTOR;
                
                // Apply amplitude scaling to antigravity
                antigravityForce *= amplitudeScale;
                
                // Apply the force
                player.velocity.y -= antigravityForce;
                
                // Apply terminal velocity for upward movement
                const terminalVelocity = -antigravityForce * 2;
                if (player.velocity.y < terminalVelocity) {
                    player.velocity.y = terminalVelocity;
                }
            }
        }
        
        // Apply gravity with time factor
        player.velocity.y += GRAVITY * TIME_FACTOR;
        
        // Update position
        player.position.add(player.velocity);
        
        // Check for game over conditions (falling through ground or hitting ceiling)
        if (player.position.y >= height) {
            gameOver("You fell through the ground!");
        } else if (player.position.y <= 0) {
            gameOver("You hit the ceiling!");
        }
        
        // Check platform collisions
        const headW = player.size * 0.9;
        const headH = player.size * 0.7;
        for (let platform of platforms) {
            if (player.position.x + headW / 2 > platform.position.x && 
                player.position.x - headW / 2 < platform.position.x + platform.size.x &&
                player.position.y + headH / 2 > platform.position.y && 
                player.position.y - headH / 2 < platform.position.y + PLATFORM_HEIGHT) {
                
                // If platform is moving, add its velocity to player
                if (platform.moveType === 'horizontal') {
                    player.position.x += platform.moveSpeed * platform.moveDirection;
                } else if (platform.moveType === 'vertical') {
                    player.position.y += platform.moveSpeed * platform.moveDirection;
                    // For vertical platforms, ensure player stays on top
                    if (player.velocity.y >= 0) {  // If falling or moving down
                        player.position.y = platform.position.y - headH / 2;
                        player.velocity.y = 0;
                    }
                }
                
                if (player.velocity.y > 0) {  // Falling
                    player.position.y = platform.position.y - headH / 2;
                    player.velocity.y = 0;
                } else if (player.velocity.y < 0) {  // Jumping
                    player.position.y = platform.position.y + PLATFORM_HEIGHT + headH / 2;
                    player.velocity.y = 0;
                }
            }
        }
        
        // Check obstacle collisions
        for (let obstacle of obstacles) {
            if (player.position.x + headW / 2 > obstacle.position.x && 
                player.position.x - headW / 2 < obstacle.position.x + obstacle.size.x &&
                player.position.y + headH / 2 > obstacle.position.y && 
                player.position.y - headH / 2 < obstacle.position.y + obstacle.size.y) {
                // Trigger explosion immediately
                gameState.explosionActive = true;
                gameState.explosionPosition = { x: obstacle.position.x, y: obstacle.position.y };
                gameState.explosionTimer = EXPLOSION_DURATION;
                gameState.explosionTriggeredGameOver = true;
                // Remove the obstacle immediately to prevent multiple triggers
                obstacles = obstacles.filter(o => o !== obstacle);
                break;
            }
        }
        
        // Update explosion timer
        if (gameState.explosionActive) {
            gameState.explosionTimer--;
            if (gameState.explosionTimer <= 0) {
                gameState.explosionActive = false;
                // Only trigger game over after explosion animation if it was a bomb
                if (gameState.explosionTriggeredGameOver) {
                    gameState.explosionTriggeredGameOver = false;
                    gameOver("You hit a bomb!");
                } else if (gameState.pendingGameOver) {
                    gameState.pendingGameOver = false;
                    triggerGameOver();
                }
            }
        }
    }
}

function drawFormantVisualization() {
    // Draw background
    fill(0, 0, 0, 200);
    rect(FORMANT_VIZ_X, FORMANT_VIZ_Y, FORMANT_VIZ_WIDTH, FORMANT_VIZ_HEIGHT);
    
    // Draw grid
    stroke(50);
    strokeWeight(1);
    for (let f1 = MIN_F1; f1 <= MAX_F1; f1 += 100) {
        let y = map(f1, MIN_F1, MAX_F1, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y);
        line(FORMANT_VIZ_X, y, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH, y);
    }
    for (let f2 = MIN_F2; f2 <= MAX_F2; f2 += 200) {
        let x = map(f2, MIN_F2, MAX_F2, FORMANT_VIZ_X, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH);
        line(x, FORMANT_VIZ_Y, x, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT);
    }
    // Draw blue axes for control directions (30% alpha)
    stroke(100, 200, 200, 77); // blue like vowel dots, 30% alpha
    strokeWeight(2);
    // Vertical axis at neutral F2 (840Hz)
    let neutralF2 = 840;
    let xAxisX = map(neutralF2, MIN_F2, MAX_F2, FORMANT_VIZ_X, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH);
    line(xAxisX, FORMANT_VIZ_Y, xAxisX, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT);
    // Horizontal axes at neutral F1 (375Hz) and balance F1 (475Hz)
    let neutralF1 = 375;
    let balanceF1 = 475;
    let yNeutral = map(neutralF1, MIN_F1, MAX_F1, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y);
    let yBalance = map(balanceF1, MIN_F1, MAX_F1, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y);
    line(FORMANT_VIZ_X, yNeutral, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH, yNeutral);
    line(FORMANT_VIZ_X, yBalance, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH, yBalance);
    // Draw vowel points
    for (let point of vowelPoints) {
        fill(0, 100, 100);
        noStroke();
        ellipse(point.x, point.y, 10, 10);
        fill(100, 200, 200);
        textSize(14);
        text(point.label, point.x + 10, point.y + 5);
    }
    
    // Draw current formant position
    if (f1 && f2 && confidence > 0.3) {
        let x = map(f2, MIN_F2, MAX_F2, FORMANT_VIZ_X, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH);
        let y = map(f1, MIN_F1, MAX_F1, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y);
        // Calculate influence factor (amplitude scaling)
        let amp = constrain(gameState.amplitude, MIN_AMPLITUDE, MAX_AMPLITUDE);
        let influenceFactor = map(amp, MIN_AMPLITUDE, MAX_AMPLITUDE, MIN_AMPLITUDE_SCALE, 1.0);
        influenceFactor = constrain(influenceFactor, MIN_AMPLITUDE_SCALE, 1.0);
        let alpha = influenceFactor * 255;
        let dotColor = color(255, 255, 0, alpha);
        noStroke();
        fill(dotColor);
        ellipse(x, y, 20, 20);
        // Draw current values
        fill(255);
        textSize(12);
        text(`F1: ${Math.round(f1)} Hz`, FORMANT_VIZ_X + 10, FORMANT_VIZ_Y + 20);
        text(`F2: ${Math.round(f2)} Hz`, FORMANT_VIZ_X + 10, FORMANT_VIZ_Y + 35);
        text(`Conf: ${confidence.toFixed(2)}`, FORMANT_VIZ_X + 10, FORMANT_VIZ_Y + 50);
    }

    // Draw config button if needed
    if (showConfig) {
        fill(0, 100, 100);
        rect(FORMANT_VIZ_X, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 10, 100, 30);
        fill(255);
        textSize(14);
        text("Show Config", FORMANT_VIZ_X + 10, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 30);
    }
}

function mousePressed() {
    // Check if config button is clicked
    if (showConfig && mouseX >= FORMANT_VIZ_X && mouseX <= FORMANT_VIZ_X + 100 &&
        mouseY >= FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 10 && mouseY <= FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 40) {
        const config = generateConfigText();
        console.log('Copy this config and replace in vowel_config.json:');
        console.log(config);
        showConfig = false;
        return;
    }

    // Check if any vowel point is clicked
    for (let point of vowelPoints) {
        if (point.containsPoint(mouseX, mouseY)) {
            point.startDrag(mouseX, mouseY);
            return;
        }
    }
}

function mouseReleased() {
    // Stop dragging any vowel point
    for (let point of vowelPoints) {
        if (point.isDragging) {
            point.stopDrag();
        }
    }
}

function mouseDragged() {
    // Update position of dragged vowel point
    for (let point of vowelPoints) {
        point.updateDrag(mouseX, mouseY);
    }
}

function gameOver(reason) {
    // Instead of immediate game over, wait for explosion animation
    if (gameState.explosionActive) {
        gameState.pendingGameOver = true;
    } else {
        triggerGameOver();
    }
}

function triggerGameOver() {
    gameState.isGameOver = true;
    gameState.isPaused = true;
    loadLevel(currentLevel);
    startCountdown();
}

function loadLevel(levelNum) {
    platforms = [];
    obstacles = [];
    const level = levels[levelNum - 1];
    
    // Create platforms
    for (let platform of level.platforms) {
        platforms.push(new Platform(platform.x, platform.y, platform.width, PLATFORM_HEIGHT, platform.moveType, platform.moveMin, platform.moveMax, platform.moveSpeed, platform.moveDirection));
    }
    
    // Create obstacles
    for (let obstacle of level.obstacles) {
        obstacles.push(new Obstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height));
    }
    
    // Set portal (reset to original position)
    portal = { ...level.portal };
    
    // Reset player position
    player.position.x = 100;
    player.position.y = SCREEN_HEIGHT - 100;
    player.velocity.x = 0;
    player.velocity.y = 0;
    
    // Reset game state
    gameState.isPaused = true;
    gameState.isGameOver = false;
    gameState.countdown = 3;
    gameState.explosionActive = false;
    gameState.showTitle = true;
}

function drawCongratulationsScreen() {
    fill(0, 0, 0, 220);
    rect(0, 0, width, height);
    fill(255);
    textSize(48);
    textAlign(CENTER, CENTER);
    text("Congratulations!", width/2, height/2 - 60);
    textSize(32);
    text("You completed all levels!", width/2, height/2);
    textSize(24);
    text(`Restarting in ${gameState.congratsCountdown}...`, width/2, height/2 + 60);
    textAlign(LEFT, BASELINE);
}

function startCongratsCountdown() {
    if (gameState.congratsCountdown > 0) {
        setTimeout(() => {
            gameState.congratsCountdown--;
            if (gameState.congratsCountdown > 0) {
                startCongratsCountdown();
            } else {
                // Restart at level 1
                currentLevel = 1;
                loadLevel(currentLevel);
                gameState.showCongratulations = false;
                startCountdown();
            }
        }, 1000);
    }
}

function drawTutorial() {
    // Position the tutorial elements in the top-left corner
    const baseX = 15; // Adjusted to be closer to the left edge (equal to padding)
    let currentY = 15; // Adjusted to be closer to the top edge (equal to padding)
    const lineHeight = 25; // Reduced line height
    const arrowSize = 15; // Increased arrow size
    const padding = 15; // Padding around the content
    const titleHeight = 20; // Approximate height for the title text
    const labelSize = 16; // Reduced text size for labels
    const titleSize = 18; // Reduced text size for title
    const arrowOffsetX = 20; // Increased offset from text to arrow

    // Draw semi-transparent black background box
    fill(0, 0, 0, 150); // Black with 150 alpha (out of 255)
    noStroke();
    // Recalculate box width and height based on new sizes
    textSize(titleSize); // Use title size for title width calculation
    const titleTextW = textWidth("Say vowel to move:");
    textSize(labelSize); // Use label size for label width calculation
    const uupTextW = textWidth("UUp:");
    const speedTextW = textWidth("spEEd:");
    const holdTextW = textWidth("hOld:");
    const maxLabelTextW = max(uupTextW, speedTextW, holdTextW);
    
    // Box width needs to accommodate the widest line: either the title or a label + arrow
    const maxContentW = max(titleTextW, maxLabelTextW + arrowOffsetX + arrowSize * 2); // Label width + offset + arrow length
    const boxWidth = maxContentW + padding * 2; // Add padding on both sides
    
    const boxHeight = titleHeight + padding + lineHeight * 3 + padding * 2; // Height for title, padding, three lines, and padding
    rect(baseX - padding, currentY - padding, boxWidth, boxHeight, 10); // Draw rounded rectangle

    fill(255);
    textSize(titleSize); // Use title size for the title
    textAlign(LEFT, TOP);

    // Add the title text
    text("Say vowel to move:", baseX, currentY);

    currentY += titleHeight + padding; // Move down for the movement instructions

    textSize(labelSize); // Use label size for the labels and arrows

    // UUp (Vertical Movement - Antigravity)
    text("UUp:", baseX, currentY);
    // Draw upward arrow (shapes)
    let arrowUpX = baseX + uupTextW + arrowOffsetX;
    let arrowUpY = currentY + lineHeight / 2;
    stroke(255); // White stroke for arrows
    strokeWeight(2);
    line(arrowUpX, arrowUpY + arrowSize * 0.7, arrowUpX, arrowUpY - arrowSize * 0.7);
    noStroke();
    fill(255); // White fill for arrow head
    triangle(arrowUpX - arrowSize * 0.4, arrowUpY - arrowSize * 0.7, arrowUpX + arrowSize * 0.4, arrowUpY - arrowSize * 0.7, arrowUpX, arrowUpY - arrowSize);

    currentY += lineHeight; // Move down for next instruction

    // spEEd (Horizontal Movement - Right)
    text("spEEd:", baseX, currentY);
    // Draw rightward arrow (shapes)
    let arrowRightX = baseX + speedTextW + arrowOffsetX;
    let arrowRightY = currentY + lineHeight / 2;
    stroke(255); // White stroke for arrows
    strokeWeight(2);
    line(arrowRightX - arrowSize * 0.7, arrowRightY, arrowRightX + arrowSize * 0.7, arrowRightY);
    noStroke();
    fill(255); // White fill for arrow head
    triangle(arrowRightX + arrowSize * 0.7, arrowRightY - arrowSize * 0.4, arrowRightX + arrowSize * 0.7, arrowRightY + arrowSize * 0.4, arrowRightX + arrowSize, arrowRightY);

    currentY += lineHeight; // Move down for next instruction

    // hOld (Horizontal Movement - Left)
    text("hOld:", baseX, currentY);
    // Draw leftward arrow (shapes) - Adjusted triangle points
    let arrowLeftX = baseX + holdTextW + arrowOffsetX;
    let arrowLeftY = currentY + lineHeight / 2;
    stroke(255); // White stroke for arrows
    strokeWeight(2);
    line(arrowLeftX + arrowSize * 0.7, arrowLeftY, arrowLeftX - arrowSize * 0.7, arrowLeftY);
    noStroke();
    fill(255); // White fill for arrow head
    // Adjusted triangle points to be relative to the end of the line for better shape
    triangle(arrowLeftX - arrowSize * 0.7, arrowLeftY - arrowSize * 0.4, arrowLeftX - arrowSize * 0.7, arrowLeftY + arrowSize * 0.4, arrowLeftX - arrowSize, arrowLeftY);

    textAlign(LEFT, BASELINE); // Reset text alignment
}

// Clean up when the page is closed
window.addEventListener('beforeunload', () => {
  if (formantAnalyzer) {
    formantAnalyzer.stop();
  }
}); 