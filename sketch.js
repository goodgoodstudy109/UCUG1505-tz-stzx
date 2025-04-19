// Global variable to store the classifier
let classifier;

// Label (start by showing listening)
let label = "click to start";
let confidence = 0;

// Game state
let gameStarted = false;
let startButton;

// Teachable Machine model URL:
// NOTE: We'll construct the full URL in preload now
// let soundModel = 'tm-my-audio-model/'; // Use relative path
// let soundModelURL = soundModel + 'model.json';

// Platform game variables
let player = {
  x: 100,
  y: 100,
  width: 20,
  height: 40,
  speed: 1,
  velocityY: 0,
  isJumping: false,
  direction: 1 // 1 for right, -1 for left
};

// Gravity and jump settings
const gravity = 0.5;
const jumpForce = -12;

// Platforms - {x, y, width, height}
let platforms = [];
let ground;

function preload() {
  // Construct the full model URL dynamically
  const modelPath = 'tm-my-audio-model/';
  const currentURL = window.location.href;
  // Find the last '/' to get the base path
  const basePath = currentURL.substring(0, currentURL.lastIndexOf('/') + 1);
  const soundModelURL = basePath + modelPath + 'model.json';

  console.log("Loading model from:", soundModelURL); // Log the URL for debugging

  // Load the sound model (just load the model, don't classify yet)
  classifier = ml5.soundClassifier(soundModelURL, { probabilityThreshold: 0.7 });
}

function setup() {
  createCanvas(640, 480);
  
  // Create start button
  startButton = createButton('Start Game & Enable Microphone');
  startButton.position(width/2 - 100, height/2);
  startButton.mousePressed(startGame);
  
  // Create ground
  ground = {
    x: 0,
    y: height - 20,
    width: width,
    height: 20
  };
  
  // Create some platforms
  platforms = [
    { x: 100, y: 400, width: 100, height: 20 },
    { x: 300, y: 350, width: 100, height: 20 },
    { x: 450, y: 300, width: 100, height: 20 },
    { x: 200, y: 250, width: 100, height: 20 },
    { x: 50, y: 200, width: 100, height: 20 }
  ];
}

function startGame() {
  // Start classifying sounds - this will prompt for microphone access
  classifier.classify(gotResult);
  
  // Remove the button
  startButton.remove();
  
  // Update game state
  gameStarted = true;
  label = "listening";
}

function draw() {
  background(0);
  
  if (gameStarted) {
    // Process sound commands
    processSound();
    
    // Apply physics
    applyPhysics();
    
    // Draw player
    fill(255, 0, 0);
    rectMode(CENTER);
    // Draw a triangle to indicate direction
    triangle(
      player.x, player.y - player.height/2,
      player.x, player.y + player.height/2,
      player.x + 10 * player.direction, player.y
    );
    rect(player.x, player.y, player.width, player.height);
    
    // Draw ground
    fill(0, 255, 0);
    rectMode(CORNER);
    rect(ground.x, ground.y, ground.width, ground.height);
    
    // Draw platforms
    fill(0, 200, 255);
    for (let platform of platforms) {
      rect(platform.x, platform.y, platform.width, platform.height);
    }
    
    // Display sound info
    fill(255);
    textSize(24);
    textAlign(LEFT, TOP);
    text(`Sound: ${label}`, 10, 10);
    text(`Confidence: ${confidence.toFixed(2)}`, 10, 40);
    text(`Speed: ${player.speed}`, 10, 70);
  } else {
    // Display start screen
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Click the button to start", width/2, height/3);
    text("Controls:", width/2, height/3 + 50);
    textSize(24);
    text("\"blow\" - Speed 2", width/2, height/3 + 100);
    text("\"hiss\" - Stop moving", width/2, height/3 + 130);
    text("\"pop\" - Jump", width/2, height/3 + 160);
    text("\"hat\" - Turn around", width/2, height/3 + 190);
  }
}

function processSound() {
  // Only process relevant sounds ("blow", "hiss", "pop", "hat")
  if (["blow", "hiss", "pop", "hat"].includes(label)) {
    // Apply sound effects based on detected sound
    switch(label) {
      case "blow":
        player.speed = 2;
        break;
      case "hiss":
        player.speed = 0;
        break;
      case "pop":
        if (!player.isJumping) {
          player.velocityY = jumpForce;
          player.isJumping = true;
        }
        break;
      case "hat":
        player.direction *= -1; // Turn around
        break;
    }
  } else {
    // Default speed for any other sounds
    player.speed = 1;
  }
  
  // Move player horizontally based on direction and speed
  player.x += player.speed * player.direction;
  
  // Keep player within canvas bounds
  if (player.x < player.width/2) {
    player.x = player.width/2;
    player.direction = 1; // Bounce off left edge
  } else if (player.x > width - player.width/2) {
    player.x = width - player.width/2;
    player.direction = -1; // Bounce off right edge
  }
}

function applyPhysics() {
  // Apply gravity
  player.velocityY += gravity;
  player.y += player.velocityY;
  
  // Check collision with ground
  if (player.y + player.height/2 > ground.y) {
    player.y = ground.y - player.height/2;
    player.velocityY = 0;
    player.isJumping = false;
  }
  
  // Check collision with platforms
  for (let platform of platforms) {
    if (player.velocityY > 0 && // Moving downward
        player.y + player.height/2 > platform.y && 
        player.y + player.height/2 < platform.y + platform.height &&
        player.x + player.width/2 > platform.x && 
        player.x - player.width/2 < platform.x + platform.width) {
      
      // Land on platform
      player.y = platform.y - player.height/2;
      player.velocityY = 0;
      player.isJumping = false;
    }
  }
}

// The model recognizing a sound will trigger this event
function gotResult(error, results) {
  if (error) {
    console.error(error);
    return;
  }
  
  // The results are in an array ordered by confidence
  if (results[0].confidence > 0.7) { // Only change label if confidence is high enough
    label = results[0].label;
    confidence = results[0].confidence;
  }
}