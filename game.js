// game.js
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let coins = 0;
let gameRunning = false;
let mario;
let obstacles = [];
let coinsArray = [];
let obstacleInterval;
let coinInterval;
let lastFrameTime = 0;
let speed = 5;
const startButton = document.getElementById('startButton');
const coinsDisplay = document.getElementById('coins');
const gameOverMenu = document.getElementById('gameOverMenu');
const returnToMenuButton = document.getElementById('returnToMenuButton');

// Загрузка изображений
const assets = {
    mario: 'mario.png',
    coin: 'pzmc_coin.png',
    obstacle: 'obstacle.png',
    background: 'background.png'
};

// Предзагрузка изображений
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Класс Марио
class Mario {
    constructor() {
        this.x = 50;
        this.y = canvas.height - 50 - 55;
        this.width = 50;
        this.height = 50;
        this.gravity = 0.8;
        this.lift = -15;
        this.velocity = 0;
        this.onGround = true;
    }

    show() {
        ctx.drawImage(assets.mario, this.x, this.y, this.width, this.height);
    }

    up() {
        if (this.onGround) {
            this.velocity = this.lift;
            this.onGround = false;
        }
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        if (this.y > canvas.height - this.height - 55) {
            this.y = canvas.height - this.height - 55;
            this.velocity = 0;
            this.onGround = true;
        }
    }
}

// Класс препятствия
class Obstacle {
    constructor() {
        this.width = 40;
        this.height = 55;
        this.x = canvas.width + Math.random() * 500;
        this.y = canvas.height - 55 - 55;
    }

    show() {
        ctx.drawImage(assets.obstacle, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= speed;
    }
}

// Класс монеты
class Coin {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = canvas.width + Math.random() * 500;
        this.y = canvas.height - 100 - 55 - Math.random() * 30;
    }

    show() {
        ctx.drawImage(assets.coin, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= speed;
    }
}

// Проверка коллизий
function checkCollision(obj) {
    return (
        mario.x < obj.x + obj.width &&
        mario.x + mario.width > obj.x &&
        mario.y < obj.y + obj.height &&
        mario.y + mario.height > obj.y
    );
}

// Игровой цикл
function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);

    mario.update();
    mario.show();

    // Обработка препятствий
    obstacles.forEach((obstacle, index) => {
        obstacle.update();
        obstacle.show();

        if (checkCollision(obstacle)) {
            gameOver();
            return;
        }

        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }
    });

    // Обработка монет
    coinsArray.forEach((coin, index) => {
        coin.update();
        coin.show();

        if (checkCollision(coin)) {
            coins++;
            coinsDisplay.textContent = `Coins: ${coins}`;
            coinsArray.splice(index, 1);
        }

        if (coin.x + coin.width < 0) {
            coinsArray.splice(index, 1);
        }
    });

    requestAnimationFrame(gameLoop);
}

// Запуск игры
async function startGame() {
    await Promise.all([
        loadImage(assets.mario),
        loadImage(assets.coin),
        loadImage(assets.obstacle),
        loadImage(assets.background)
    ]);

    assets.mario = await loadImage(assets.mario);
    assets.coin = await loadImage(assets.coin);
    assets.obstacle = await loadImage(assets.obstacle);
    assets.background = await loadImage(assets.background);

    coins = 0;
    coinsDisplay.textContent = `Coins: ${coins}`;
    mario = new Mario();
    obstacles = [];
    coinsArray = [];
    gameRunning = true;
    speed = 5;

    obstacleInterval = setInterval(() => {
        obstacles.push(new Obstacle());
    }, 1500 + Math.random() * 1000);

    coinInterval = setInterval(() => {
        coinsArray.push(new Coin());
    }, 1500 + Math.random() * 1000);

    startButton.style.display = 'none';
    requestAnimationFrame(gameLoop);
}

// Завершение игры
function gameOver() {
    gameRunning = false;
    clearInterval(obstacleInterval);
    clearInterval(coinInterval);
    gameOverMenu.style.display = 'flex';
}

// Сброс игры
function resetGame() {
    gameOverMenu.style.display = 'none';
    startButton.style.display = 'block';
}

// Управление
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') mario.up();
});

canvas.addEventListener('touchstart', (e) => {
    if (gameRunning) mario.up();
});

startButton.addEventListener('click', startGame);
returnToMenuButton.addEventListener('click', resetGame);

// Адаптация размеров
function resizeCanvas() {
    canvas.width = window.innerWidth * 0.95;
    canvas.height = window.innerHeight * 0.7;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
