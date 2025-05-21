// Vowel-Controlled Platformer using P5.js
let player;
let platforms = [];
let obstacles = [];
let clouds = [];
let portal;
let currentLevel = 1;
let formantAnalyzer;
let f1, f2, confidence;

// Movement control sliders
let horizontalSlider;
let verticalSlider;

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
const PORTAL_SIZE = 80;
const FINISH_LINE_WIDTH = 20;  // Width of the finish line
const FINISH_LINE_HEIGHT = 200;  // Height of the finish line
const PLATFORM_TOLERANCE = 5;
const TIME_FACTOR = 0.5;  // Global time scaling factor
const EXPLOSION_DURATION = 30; // Frames for explosion animation
const SLOW_FALL_DAMPING = 0.85;  // Increased damping (from 0.95 to 0.85) for slower gliding
const DOWNSTRIKE_FORCE = 25;  // Powerful downstrike
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
    amplitude: 0 // Add amplitude tracking
};

// Level Design from prototype-b-ultimate
const levels = [
    // Level 1: Introduction (Easier, Wider Platforms, No Obstacles)
    {
        platforms: [
            { x: 100, y: SCREEN_HEIGHT - 50, width: 200 }, // Start platform
            { x: 400, y: SCREEN_HEIGHT - 100, width: 180 }, // First gap, slightly higher
            { x: 700, y: SCREEN_HEIGHT - 150, width: 160 }, // Second gap, higher still
            { x: 1000, y: SCREEN_HEIGHT - 120, width: 180 }, // Back down a bit
            { x: 1300, y: SCREEN_HEIGHT - 180, width: 200 }, // Bigger gap, higher
            { x: 1600, y: SCREEN_HEIGHT - 140, width: 180 }, // Back down slightly
            { x: 1900, y: SCREEN_HEIGHT - 200, width: 200 }, // Final gap to portal
        ],
        obstacles: [], // No obstacles in level 1
        portal: { x: 2200, y: SCREEN_HEIGHT - 250 },
        tutorialText: [
            "Level 1: Get Started!",
            "Controls:",
            "  F1 (openness) -> Float Up",
            "  F2 (front-back) -> Move Left/Right",
            "  Say 'EE' to move right",
            "  Say 'AH' to move left",
            "  Say 'AE' to float up",
            "Reach the portal!"
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
    horizontalFactor: 0.5,
    verticalFactor: 5.0  // Increased from 3.0 to 5.0
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
                horizontalSlider.value(movementConfig.horizontalFactor);
                verticalSlider.value(movementConfig.verticalFactor);
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
    constructor(x, y, w, h, moveType = null, moveMin = null, moveMax = null, moveSpeed = null, moveDirection = 1) {
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

function setup() {
    createCanvas(SCREEN_WIDTH, SCREEN_HEIGHT);
    
    // Initialize colors
    skyColorTop = color(135, 206, 250); // Light Sky Blue
    skyColorBottom = color(173, 216, 230); // Lighter Blue
    
    // Create sliders
    horizontalSlider = createSlider(0, 2, movementConfig.horizontalFactor, 0.1);
    horizontalSlider.position(FORMANT_VIZ_X, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 50);
    horizontalSlider.style('width', '150px');
    
    verticalSlider = createSlider(0, 10, movementConfig.verticalFactor, 0.1);  // Increased range to 0-10
    verticalSlider.position(FORMANT_VIZ_X, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 80);
    verticalSlider.style('width', '150px');
    
    // Create player
    player = new Player(100, SCREEN_HEIGHT - 100);
    
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
    // Calculate camera position
    let cameraX = player.position.x - CAMERA_OFFSET_X;
    let cameraY = player.position.y - CAMERA_OFFSET_Y;
    
    // Draw sky gradient background
    drawSkyGradient();
    
    // Apply camera transform
    push();
    translate(-cameraX, -cameraY);
    
    // Draw reference lines
    drawReferenceLines();
    
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
    
    pop();  // Reset transform
    
    // Draw formant visualization (not affected by camera)
    drawFormantVisualization();
    
    // Draw screens based on game state
    if (gameState.isPaused) {
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
    
    // Draw UI (not affected by camera)
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
        cloud.x -= cloud.speed * (player.speed / BASE_SPEED * 0.5 + 0.2);
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
    for (let platform of platforms) {
        // Handle platform's own movement logic
        if (platform.moveType) {
            let speed = platform.moveSpeed * platform.moveDirection;
            if (platform.moveType === 'horizontal') {
                platform.position.x += speed;
                if ((platform.moveDirection === 1 && platform.position.x >= platform.moveMax) ||
                    (platform.moveDirection === -1 && platform.position.x <= platform.moveMin)) {
                    platform.moveDirection *= -1;
                    platform.position.x = constrain(platform.position.x, platform.moveMin, platform.moveMax);
                }
            } else if (platform.moveType === 'vertical') {
                platform.position.y += speed;
                if ((platform.moveDirection === 1 && platform.position.y >= platform.moveMax) ||
                    (platform.moveDirection === -1 && platform.position.y <= platform.moveMin)) {
                    platform.moveDirection *= -1;
                    platform.position.y = constrain(platform.position.y, platform.moveMin, platform.moveMax);
                }
            }
        }

        // Apply world scroll based on player's movement
        if (player.velocity.x !== 0) {
            platform.position.x -= player.velocity.x * TIME_FACTOR;
        }
    }

    // Remove platforms that are off-screen
    platforms = platforms.filter(p => p.position.x + p.size.x > 0);
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
    // Only move obstacles if player has horizontal velocity
    if (player.velocity.x !== 0) {
        for (let obstacle of obstacles) {
            obstacle.position.x -= player.velocity.x * TIME_FACTOR;
        }
        obstacles = obstacles.filter(o => o.position.x + o.size.x > 0);
    }
}

function drawPortal() {
    if (portal) {
        // Draw portal ring
        noFill();
        stroke(255, 0, 255);
        strokeWeight(3);
        ellipse(portal.x, portal.y, 50, 50);
        
        // Draw portal center
        fill(255, 0, 255, 100);
        noStroke();
        ellipse(portal.x, portal.y, 30, 30);
        
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
    // Only move portal if player has horizontal velocity
    if (portal && player.velocity.x !== 0) {
        portal.x -= player.velocity.x * TIME_FACTOR;
    }
}

function drawPlayer() {
    fill(255, 255, 0);
    noStroke();
    rect(player.position.x, player.position.y, player.size, player.size);
}

function drawUI() {
    fill(200);
    textSize(16);
    text("Vowel-Controlled Platformer", 20, 20);
    text("F1 (openness) controls antigravity", 20, 40);
    text("F2 (front-back) controls movement", 20, 60);
    text("Say 'EE' to move right", 20, 80);
    text("Say 'AH' to move left", 20, 100);
    text("Say 'AE' to float up", 20, 120);
    text("Press SPACE to start/pause", 20, 140);
    text("Press ESC to quit", 20, 160);
    
    // Draw level info
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
    text("Vowel-Controlled Platformer", width/2, height/2 - 100);
    
    // Countdown
    if (gameState.countdown > 0) {
        textSize(64);
        text(gameState.countdown, width/2, height/2);
    } else {
        textSize(32);
        text("Say 'chEEse' to start!", width/2, height/2);
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
        }
    }
}

function updatePlayer() {
    if (!gameState.isPaused && !gameState.isGameOver) {
        // Update movement factors from sliders
        movementConfig.horizontalFactor = horizontalSlider.value();
        movementConfig.verticalFactor = verticalSlider.value();
        
        // Reset velocity to zero by default
        player.velocity.x = 0;
        
        // Apply formant-based controls
        if (f1 && f2 && confidence > MIN_CONFIDENCE) {
            // Calculate amplitude scaling factor (0.3 to 1.0)
            // This will only reduce movement at low volumes, never increase it
            const amplitudeScale = map(
                constrain(gameState.amplitude, MIN_AMPLITUDE, MAX_AMPLITUDE),
                MIN_AMPLITUDE, MAX_AMPLITUDE,
                MIN_AMPLITUDE_SCALE, 1.0  // Scale from 0.3 to 1.0
            );
            
            // F2 (front-back) controls horizontal movement
            const neutralF2 = 840;
            
            // Calculate distance from neutral point
            const f2Distance = f2 - neutralF2;
            
            // Apply asymmetric scaling for left/right movement
            let f2_normalized;
            if (f2Distance < 0) {
                // Amplify left movement (negative values)
                f2_normalized = (f2Distance / (neutralF2 - MIN_F2)) * 1.5; // 1.5x amplification for left
            } else {
                // Normal scaling for right movement
                f2_normalized = f2Distance / (MAX_F2 - neutralF2);
            }
            
            // Apply amplitude scaling to the normalized value
            // This will only reduce movement at low volumes
            f2_normalized *= amplitudeScale;
            
            // Direct velocity control with amplitude scaling
            player.velocity.x = f2_normalized * MAX_SPEED * movementConfig.horizontalFactor * confidence;
            
            // F1 (openness) controls antigravity
            // Map F1 to antigravity force:
            // - 400Hz = 0 (no antigravity)
            // - 600Hz = -GRAVITY (exactly cancels gravity)
            // - >600Hz = stronger upward force
            const neutralF1 = 400;     // 400Hz
            const balanceF1 = 600;     // 600Hz (lowered from 650Hz)
            let antigravityForce = 0;
            
            if (f1 >= neutralF1) {  // Only apply if F1 is at least 400Hz
                // Calculate how far we are from neutral point (400Hz)
                const f1Range = balanceF1 - neutralF1;  // 200Hz range (reduced from 250Hz)
                const f1Offset = f1 - neutralF1;        // How far above 400Hz
                
                // Calculate force: 0 at 400Hz, -GRAVITY at 600Hz, stronger above 600Hz
                antigravityForce = (f1Offset / f1Range) * GRAVITY * movementConfig.verticalFactor * confidence;
                
                // Apply amplitude scaling to antigravity
                // This will only reduce movement at low volumes
                antigravityForce *= amplitudeScale;
                
                // Apply the force
                player.velocity.y -= antigravityForce;
                
                // Apply terminal velocity for upward movement
                // Terminal velocity is proportional to antigravity strength
                const terminalVelocity = -antigravityForce * 2; // Terminal velocity is 2x the antigravity force
                if (player.velocity.y < terminalVelocity) {
                    player.velocity.y = terminalVelocity;
                }
            }
        }
        
        // Apply gravity
        player.velocity.y += GRAVITY;
        
        // Update position
        player.position.add(player.velocity);
        
        // Keep player in horizontal bounds
        if (player.position.x < 0) {
            player.position.x = 0;
            player.velocity.x = 0;
        }
        if (player.position.x > width - player.size) {
            player.position.x = width - player.size;
            player.velocity.x = 0;
        }
        
        // Check for game over conditions (falling through ground or hitting ceiling)
        if (player.position.y >= height) {
            gameOver("You fell through the ground!");
        } else if (player.position.y <= 0) {
            gameOver("You hit the ceiling!");
        }
        
        // Check platform collisions
        for (let platform of platforms) {
            if (player.position.x + player.size > platform.position.x && 
                player.position.x < platform.position.x + platform.size.x &&
                player.position.y + player.size > platform.position.y && 
                player.position.y < platform.position.y + PLATFORM_HEIGHT) {
                if (player.velocity.y > 0) {  // Falling
                    player.position.y = platform.position.y - player.size;
                    player.velocity.y = 0;
                } else if (player.velocity.y < 0) {  // Jumping
                    player.position.y = platform.position.y + PLATFORM_HEIGHT;
                    player.velocity.y = 0;
                }
            }
        }
        
        // Check obstacle collisions
        for (let obstacle of obstacles) {
            if (player.position.x + player.size > obstacle.position.x && 
                player.position.x < obstacle.position.x + obstacle.size.x &&
                player.position.y + player.size > obstacle.position.y && 
                player.position.y < obstacle.position.y + obstacle.size.y) {
                // Trigger explosion
                gameState.explosionActive = true;
                gameState.explosionPosition = { x: obstacle.position.x, y: obstacle.position.y };
                gameState.explosionTimer = EXPLOSION_DURATION;
                
                // Remove obstacle
                obstacles = obstacles.filter(o => o !== obstacle);
                
                // Reset player position
                player.position.x = 100;
                player.position.y = SCREEN_HEIGHT - 100;
                player.velocity.x = 0;
                player.velocity.y = 0;
                break;
            }
        }
        
        // Update explosion timer
        if (gameState.explosionActive) {
            gameState.explosionTimer--;
            if (gameState.explosionTimer <= 0) {
                gameState.explosionActive = false;
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
    
    // Horizontal lines for F1
    for (let f1 = MIN_F1; f1 <= MAX_F1; f1 += 100) {
        let y = map(f1, MIN_F1, MAX_F1, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y);
        line(FORMANT_VIZ_X, y, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH, y);
        // Label
        if (f1 % 200 === 0) {
            fill(100);
            noStroke();
            text(f1, FORMANT_VIZ_X - 30, y);
        }
    }
    
    // Vertical lines for F2
    for (let f2 = MIN_F2; f2 <= MAX_F2; f2 += 200) {
        let x = map(f2, MIN_F2, MAX_F2, FORMANT_VIZ_X, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH);
        line(x, FORMANT_VIZ_Y, x, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT);
        // Label
        if (f2 % 400 === 0) {
            fill(100);
            noStroke();
            text(f2, x, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 15);
        }
    }
    
    // Draw vowel points
    for (let point of vowelPoints) {
        // Draw vowel point
        fill(0, 100, 100);
        noStroke();
        ellipse(point.x, point.y, 10, 10);
        
        // Draw vowel label
        fill(100, 200, 200);
        textSize(14);
        text(point.label, point.x + 10, point.y + 5);
    }
    
    // Draw current formant position
    if (f1 && f2 && confidence > 0.3) {
        let x = map(f2, MIN_F2, MAX_F2, FORMANT_VIZ_X, FORMANT_VIZ_X + FORMANT_VIZ_WIDTH);
        let y = map(f1, MIN_F1, MAX_F1, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT, FORMANT_VIZ_Y);
        
        // Draw circle with transparency based on confidence
        noStroke();
        fill(255, 255, 0, confidence * 255);
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

    // Draw slider labels
    fill(255);
    textSize(12);
    text(`Horizontal Factor: ${movementConfig.horizontalFactor.toFixed(1)}`, 
         FORMANT_VIZ_X, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 45);
    text(`Vertical Factor: ${movementConfig.verticalFactor.toFixed(1)}`, 
         FORMANT_VIZ_X, FORMANT_VIZ_Y + FORMANT_VIZ_HEIGHT + 75);
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
    gameState.isGameOver = true;
    gameState.isPaused = true;
    // No need to show game over screen, just trigger the transition
}

function loadLevel(levelNum) {
    platforms = [];
    obstacles = [];
    const level = levels[levelNum - 1];
    
    // Create platforms
    for (let platform of level.platforms) {
        platforms.push(new Platform(
            platform.x,
            platform.y,
            platform.width,
            PLATFORM_HEIGHT,
            platform.moveType,
            platform.moveMin,
            platform.moveMax,
            platform.moveSpeed,
            platform.moveDirection
        ));
    }
    
    // Create obstacles
    for (let obstacle of level.obstacles) {
        obstacles.push(new Obstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height));
    }
    
    // Set portal
    portal = level.portal;
    
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

// Clean up when the page is closed
window.addEventListener('beforeunload', () => {
  if (formantAnalyzer) {
    formantAnalyzer.stop();
  }
}); 