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
let speed = 5; // Начальная скорость
const coinsDisplay = document.getElementById('coins');
const gameOverMenu = document.getElementById('gameOverMenu');
const returnToMenuButton = document.getElementById('returnToMenuButton');
const debugPositionElement = document.getElementById('debugPosition');
const debugVelocityElement = document.getElementById('debugVelocity');
const gameAccount = 'PRIZM-RGLR-K9WH-F7UH-RG5DF';
const marioImage = new Image();
marioImage.src = 'mario.png';
const coinImage = new Image();
coinImage.src = 'pzmc_coin.png';
const obstacleImage = new Image();
obstacleImage.src = 'obstacle.png';
const backgroundImage = new Image();
backgroundImage.src = 'background.png';
const jumpSound = document.getElementById('jumpSound');
const coinSound = document.getElementById('coinSound');
const backgroundMusic = document.getElementById('backgroundMusic');
const gameOverSound = document.getElementById('gameOverSound');

jumpSound.addEventListener('error', () => {
    console.error('Ошибка загрузки jump.mp3');
});
coinSound.addEventListener('error', () => {
    console.error('Ошибка загрузки coin.mp3');
});
backgroundMusic.addEventListener('error', () => {
    console.error('Ошибка загрузки background.mp3');
});
gameOverSound.addEventListener('error', () => {
    console.error('Ошибка загрузки game_over.mp3');
});

class Mario {
    constructor() {
        this.x = 50;
        this.y = canvas.height - 50 - 55; // Опустим Марио на 55 пикселей от низа
        this.width = 50;
        this.height = 50;
        this.gravity = 0.8; // Гравитация
        this.lift = -15; // Сила прыжка
        this.velocity = 0;
        this.onGround = true; // Флаг, указывающий, находится ли Марио на земле
    }
    show() {
        ctx.drawImage(marioImage, this.x, this.y, this.width, this.height);
    }
    up() {
        if (this.onGround) { // Прыжок возможен только с земли
            this.velocity = this.lift; // Устанавливаем скорость прыжка
            this.onGround = false; // Марио в воздухе
            jumpSound.currentTime = 0; // Перезапуск звука прыжка
            jumpSound.play();
        }
    }
    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        if (this.y > canvas.height - this.height - 55) {
            this.y = canvas.height - this.height - 55;
            this.velocity = 0;
            this.onGround = true; // Марио на земле
        }
        if (debugPositionElement && debugVelocityElement) {
            debugPositionElement.innerText = `Позиция Марио: x=${this.x.toFixed(2)}, y=${this.y.toFixed(2)}`;
            debugVelocityElement.innerText = `Скорость Марио: ${this.velocity.toFixed(2)}`;
        }
    }
}

class Obstacle {
    constructor() {
        this.width = 40;
        this.height = 55;
        this.x = canvas.width + Math.random() * 500; // Случайное расстояние от края
        this.y = canvas.height - 55 - 55; // Поднимаем препятствие на 55 пикселей от низа
    }
    show() {
        ctx.drawImage(obstacleImage, this.x, this.y, this.width, this.height);
    }
    update() {
        this.x -= speed;
    }
}

class Coin {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = canvas.width + Math.random() * 500; // Случайное расстояние от края
        this.y = canvas.height - 100 - 55 - Math.random() * 30; // Увеличенный диапазон y для монет
    }
    show() {
        ctx.drawImage(coinImage, this.x, this.y, this.width, this.height);
    }
    update() {
        this.x -= speed;
    }
}

function checkCollision(obstacle) {
    if (!mario || !obstacle) {
        console.error('Марио или препятствие не инициализированы!');
        return false;
    }
    const collision = (
        mario.x < obstacle.x + obstacle.width &&
        mario.x + mario.width > obstacle.x &&
        mario.y < obstacle.y + obstacle.height &&
        mario.y + mario.height > obstacle.y
    );
    if (collision) {
        console.log('Коллизия с препятствием:', {
            mario: { x: mario.x, y: mario.y },
            obstacle: { x: obstacle.x, y: obstacle.y },
        });
    }
    return collision;
}

function checkCoinCollision(coin) {
    if (!mario || !coin) {
        console.error('Марио или монета не инициализированы!');
        return false;
    }
    const buffer = 10; // Увеличенный буфер для коллизии
    const collision = (
        mario.x + mario.width - buffer > coin.x &&
        mario.x + buffer < coin.x + coin.width &&
        mario.y + mario.height - buffer > coin.y &&
        mario.y + buffer < coin.y + coin.height
    );
    if (collision) {
        console.log('Коллизия с монетой:', {
            mario: { x: mario.x, y: mario.y },
            coin: { x: coin.x, y: coin.y },
        });
    }
    return collision;
}

function gameLoop(timestamp) {
    if (!gameRunning) return;
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    if (!mario) {
        console.error('Марио не инициализирован!');
        return;
    }
    mario.update();
    mario.show();
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (!obstacles[i]) {
            console.error('Препятствие не инициализировано!');
            continue;
        }
        obstacles[i].update();
        obstacles[i].show();
        if (checkCollision(obstacles[i])) {
            gameRunning = false;
            clearInterval(obstacleInterval);
            clearInterval(coinInterval);
            backgroundMusic.pause();
            gameOverSound.currentTime = 0;
            gameOverSound.play();
            coinsDisplay.innerText = `Монеты: ${coins}`;
            showGameOverMenu();
            sendReward(coins);
            break;
        }
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
    coinsArray = coinsArray.filter((coin) => {
        if (!coin) {
            console.error('Монета не инициализирована!');
            return false;
        }
        coin.update();
        coin.show();
        if (checkCoinCollision(coin)) {
            coins++;
            coinsDisplay.innerText = `Монеты: ${coins}`;
            coinSound.currentTime = 0;
            coinSound.play();
            return false;
        }
        if (coin.x + coin.width < 0) {
            return false;
        }
        return true;
    });
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        if (!mario) {
            console.error('Марио не инициализирован!');
            return;
        }
        mario.up();
    }
});

canvas.addEventListener('touchstart', function (e) {
    if (!gameRunning) return;
    if (e.touches.length === 1) {
        mario.up();
    }
});

function startGame() {
    coins = 0;
    coinsDisplay.innerText = `Монеты: ${coins}`;
    mario = new Mario();
    obstacles = [];
    coinsArray = [];
    gameRunning = true;
    lastFrameTime = performance.now();
    speed = 5;
    obstacleInterval = setInterval(() => {
        const obstacle = new Obstacle();
        obstacles.push(obstacle);
    }, 1500 + Math.random() * 1000);
    coinInterval = setInterval(() => {
        const coin = new Coin();
        coinsArray.push(coin);
    }, 1500 + Math.random() * 1000);
    increaseSpeed();
    backgroundMusic.play();
    requestAnimationFrame(gameLoop);
}

function increaseSpeed() {
    if (gameRunning) {
        speed += 0.05;
        setTimeout(increaseSpeed, 1000);
    }
}

async function sendReward(coins) {
    const reward = coins;
    if (reward === 0) {
        return;
    }
    const recipient = Telegram.WebApp.initDataUnsafe.user.username; // Получаем username пользователя
    if (!recipient) {
        console.error('Адрес получателя не указан!');
        return;
    }
    const secretPhrase = 'prizm three pen able ponder door morning around frame ash dry';
    try {
        const response = await fetch('https://192.168.1.27:9976/prizm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                requestType: 'sendMoney',
                recipient: recipient,
                amountNQT: reward * 100,
                feeNQT: 100,
                secretPhrase: secretPhrase,
                deadline: 1440,
            }),
        });
        const data = await response.json();
        console.log('Награда отправлена:', data);
        alert(`Награда в размере ${reward} PZM была отправлена на ваш счет.`);
    } catch (error) {
        console.error('Ошибка при отправке награды:', error);
        alert("Произошла ошибка при отправке награды. Пожалуйста, попробуйте позже.");
    }
}

returnToMenuButton.addEventListener('click', function () {
    hideGameOverMenu();
    resetGame();
});

function showGameOverMenu() {
    gameOverMenu.style.display = 'flex';
}

function hideGameOverMenu() {
    gameOverMenu.style.display = 'none';
}

function resetGame() {
    coins = 0;
    coinsDisplay.innerText = `Монеты: ${coins}`;
    mario = null;
    obstacles = [];
    coinsArray = [];
    gameRunning = false;
    speed = 5;
}

function resizeGame() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    if (mario) {
        mario.x = 50;
        mario.y = canvas.height - 50 - 55;
    }
    obstacles.forEach(obstacle => {
        obstacle.y = canvas.height - 55 - 55;
    });
    coinsArray.forEach(coin => {
        coin.y = canvas.height - 100 - 55 - Math.random() * 30;
    });
}

window.addEventListener('resize', resizeGame);

function initGame() {
    if (!marioImage.complete || !coinImage.complete || !obstacleImage.complete || !backgroundImage.complete) {
        setTimeout(initGame, 100);
        return;
    }
    resizeGame();
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
    });
    document.addEventListener('dblclick', function (e) {
        e.preventDefault();
    });
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    Telegram.WebApp.BackButton.onClick(closeWebApp);
}

function closeWebApp() {
    Telegram.WebApp.close();
}

initGame();