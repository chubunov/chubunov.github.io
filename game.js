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
let soundEnabled = true;
let assetsLoaded = false;

// Элементы управления
const startButton = document.getElementById('startButton');
const coinsDisplay = document.getElementById('coins');
const gameOverMenu = document.getElementById('gameOverMenu');
const returnToMenuButton = document.getElementById('returnToMenuButton');
const finalCoins = document.getElementById('finalCoins');
const toggleSound = document.getElementById('toggleSound');

// Загрузка ресурсов
const assets = {
    mario: new Image(),
    coin: new Image(),
    obstacle: new Image(),
    background: new Image()
};

assets.mario.src = 'images/mario.png';
assets.coin.src = 'images/pzmc_coin.png';
assets.obstacle.src = 'images/obstacle.png';
assets.background.src = 'images/background.png';

// Звуковые эффекты
const sounds = {
    jump: new Audio('sounds/jump.mp3'),
    coin: new Audio('sounds/coin.mp3'),
    background: new Audio('sounds/background.mp3'),
    gameOver: new Audio('sounds/game_over.mp3')
};

// Инициализация звука
sounds.background.loop = true;

// Управление звуком
toggleSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    toggleSound.textContent = soundEnabled ? '🔈 Звук Вкл' : '🔇 Звук Выкл';
    if (soundEnabled && gameRunning) sounds.background.play();
    else sounds.background.pause();
});

class Mario {
    constructor() {
        this.x = 50;
        this.y = canvas.height - 100;
        this.width = 80;
        this.height = 80;
        this.gravity = 0.8;
        this.lift = -18;
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
            playSound(sounds.jump);
        }
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        if (this.y > canvas.height - this.height - 20) {
            this.y = canvas.height - this.height - 20;
            this.velocity = 0;
            this.onGround = true;
        }
    }
}

class Obstacle {
    constructor() {
        this.width = 40;
        this.height = 80;
        this.x = canvas.width + Math.random() * 500;
        this.y = canvas.height - this.height - 20;
    }

    show() {
        ctx.drawImage(assets.obstacle, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= speed;
    }
}

class Coin {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = canvas.width + Math.random() * 500;
        this.y = canvas.height - 150 - Math.random() * 50;
    }

    show() {
        ctx.drawImage(assets.coin, this.x, this.y, this.width, this.height);
    }

    update() {
        this.x -= speed;
    }
}

function checkCollision(obj) {
    return (
        mario.x < obj.x + obj.width &&
        mario.x + mario.width > obj.x &&
        mario.y < obj.y + obj.height &&
        mario.y + mario.height > obj.y
    );
}

function playSound(sound) {
    if (!soundEnabled) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка фона
    ctx.drawImage(
        assets.background,
        0, 0,
        canvas.width, canvas.height
    );

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
            coinsDisplay.textContent = `Монеты: ${coins}`;
            coinsArray.splice(index, 1);
            playSound(sounds.coin);
        }

        if (coin.x + coin.width < 0) {
            coinsArray.splice(index, 1);
        }
    });

    requestAnimationFrame(gameLoop);
}

function startGame() {
    if (gameRunning || !assetsLoaded) return;
    
    coins = 0;
    coinsDisplay.textContent = `Монеты: ${coins}`;
    mario = new Mario();
    obstacles = [];
    coinsArray = [];
    gameRunning = true;
    speed = 5;

    // Настройка размера canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    obstacleInterval = setInterval(() => {
        obstacles.push(new Obstacle());
    }, 1500 + Math.random() * 1000);

    coinInterval = setInterval(() => {
        coinsArray.push(new Coin());
    }, 1000 + Math.random() * 800);

    startButton.style.display = 'none';
    gameOverMenu.style.display = 'none';
    playSound(sounds.background);
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    clearInterval(obstacleInterval);
    clearInterval(coinInterval);
    sounds.background.pause();
    playSound(sounds.gameOver);
    finalCoins.textContent = `Монеты: ${coins}`;
    gameOverMenu.style.display = 'flex';
}

function resetGame() {
    gameOverMenu.style.display = 'none';
    startButton.style.display = 'block';
}

// Управление
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') mario?.up();
});

canvas.addEventListener('touchstart', (e) => {
    if (gameRunning) mario?.up();
    e.preventDefault();
});

startButton.addEventListener('click', startGame);
returnToMenuButton.addEventListener('click', resetGame);

// Адаптация размеров
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (mario) {
        mario.y = canvas.height - mario.height - 20;
    }
}

window.addEventListener('resize', resizeCanvas);

// Проверка загрузки ресурсов
Promise.all([
    new Promise(resolve => {
        assets.mario.onload = resolve;
        assets.mario.onerror = () => console.error('Ошибка загрузки Mario');
    }),
    new Promise(resolve => {
        assets.coin.onload = resolve;
        assets.coin.onerror = () => console.error('Ошибка загрузки Coin');
    }),
    new Promise(resolve => {
        assets.obstacle.onload = resolve;
        assets.obstacle.onerror = () => console.error('Ошибка загрузки Obstacle');
    }),
    new Promise(resolve => {
        assets.background.onload = resolve;
        assets.background.onerror = () => console.error('Ошибка загрузки Background');
    })
]).then(() => {
    assetsLoaded = true;
    startButton.disabled = false;
    console.log('Все ресурсы загружены');
});

// Первоначальная настройка
resizeCanvas();
