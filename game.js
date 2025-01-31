const tg = window.Telegram.WebApp;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const ASPECT_RATIO = 16 / 9;
const GRAVITY = 0.8;
const JUMP_FORCE = -18;
const BASE_SPEED = 5;

// Game State
let gameState = {
    coins: 0,
    score: 0,
    running: false,
    sound: true,
    mario: null,
    obstacles: [],
    coinsArray: [],
    speed: BASE_SPEED
};

// Assets
const assets = {
    mario: loadImage('mario.png'),
    coin: loadImage('coin.png'),
    obstacle: loadImage('obstacle.png'),
    background: loadImage('background.png')
};

// Init Web App
tg.expand();
tg.enableClosingConfirmation();
tg.BackButton.hide();

// Game Objects
class Mario {
    constructor() {
        this.width = 80;
        this.height = 80;
        this.x = canvas.width * 0.1;
        this.y = canvas.height - this.height - 50;
        this.velocity = 0;
        this.grounded = true;
    }
}

class Obstacle {
    constructor() {
        this.width = 60;
        this.height = 80;
        this.x = canvas.width + Math.random() * 300;
        this.y = canvas.height - this.height - 50;
    }
}

class Coin {
    constructor() {
        this.width = 40;
        this.height = 40;
        this.x = canvas.width + Math.random() * 500;
        this.y = canvas.height * 0.4 + Math.random() * 100;
    }
}

// Core Functions
function resizeCanvas() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    if (screenWidth / screenHeight > ASPECT_RATIO) {
        canvas.width = screenHeight * ASPECT_RATIO;
        canvas.height = screenHeight;
    } else {
        canvas.width = screenWidth;
        canvas.height = screenWidth / ASPECT_RATIO;
    }
    
    canvas.style.left = `${(window.innerWidth - canvas.width) / 2}px`;
    canvas.style.top = `${(window.innerHeight - canvas.height) / 2}px`;
}

function drawBackground() {
    const bg = assets.background;
    const scale = Math.max(canvas.width / bg.width, canvas.height / bg.height);
    const width = bg.width * scale;
    const height = bg.height * scale;
    
    ctx.drawImage(
        bg,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height
    );
}

function checkCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// Game Loop
function update() {
    if (!gameState.running) return;

    // Mario physics
    gameState.mario.velocity += GRAVITY;
    gameState.mario.y += gameState.mario.velocity;
    
    if (gameState.mario.y > canvas.height - gameState.mario.height - 50) {
        gameState.mario.y = canvas.height - gameState.mario.height - 50;
        gameState.mario.velocity = 0;
        gameState.mario.grounded = true;
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    
    // Draw Mario
    ctx.drawImage(
        assets.mario,
        gameState.mario.x,
        gameState.mario.y,
        gameState.mario.width,
        gameState.mario.height
    );
    
    // Draw objects
    gameState.obstacles.forEach(obj => {
        ctx.drawImage(assets.obstacle, obj.x, obj.y, obj.width, obj.height);
        obj.x -= gameState.speed;
    });
    
    gameState.coinsArray.forEach((coin, index) => {
        ctx.drawImage(assets.coin, coin.x, coin.y, coin.width, coin.height);
        coin.x -= gameState.speed;
        
        if (checkCollision(gameState.mario, coin)) {
            gameState.coins++;
            document.getElementById('coins').textContent = gameState.coins;
            gameState.coinsArray.splice(index, 1);
        }
    });
    
    // Collision detection
    if (gameState.obstacles.some(obj => checkCollision(gameState.mario, obj))) {
        gameOver();
    }
}

function gameLoop() {
    update();
    draw();
    if (gameState.running) requestAnimationFrame(gameLoop);
}

// Game Controls
function jump() {
    if (gameState.mario.grounded) {
        gameState.mario.velocity = JUMP_FORCE;
        gameState.mario.grounded = false;
    }
}

function startGame() {
    gameState = {
        coins: 0,
        score: 0,
        running: true,
        sound: gameState.sound,
        mario: new Mario(),
        obstacles: [],
        coinsArray: [],
        speed: BASE_SPEED
    };
    
    document.getElementById('coins').textContent = '0';
    
    // Spawn objects
    setInterval(() => {
        gameState.obstacles.push(new Obstacle());
        if (Math.random() > 0.5) gameState.coinsArray.push(new Coin());
    }, 1500);
    
    gameLoop();
}

function gameOver() {
    gameState.running = false;
    tg.showAlert(`Game Over! Coins: ${gameState.coins}`);
}

// Event Listeners
document.addEventListener('touchstart', jump);
document.addEventListener('keydown', e => {
    if (e.code === 'Space') jump();
});

document.getElementById('restartBtn').addEventListener('click', startGame);
document.getElementById('soundBtn').addEventListener('click', () => {
    gameState.sound = !gameState.sound;
    document.getElementById('soundBtn').textContent = gameState.sound ? '🔊' : '🔇';
});

// Init
window.addEventListener('resize', resizeCanvas);
tg.onEvent('viewportChanged', resizeCanvas);

Promise.all(Object.values(assets).map(img => 
    new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
    })
)).then(() => {
    resizeCanvas();
    startGame();
});

// Helper function
function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
}
