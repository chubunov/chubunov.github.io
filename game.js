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
let playerAddress = ''; // Адрес кошелька игрока
let paymentChecked = false; // Флаг, проверяющий оплату
let speed = 5; // Начальная скорость
const playerAddressInput = document.getElementById('playerAddress');
const checkPaymentButton = document.getElementById('checkPaymentButton');
const paymentStatus = document.getElementById('paymentStatus');
const startButton = document.getElementById('startButton');
const paymentMenu = document.getElementById('paymentMenu');
const testModeButton = document.getElementById('testModeButton');
const coinsDisplay = document.getElementById('coins');
const gameOverMenu = document.getElementById('gameOverMenu');
const returnToMenuButton = document.getElementById('returnToMenuButton');
// Элементы для отладки (если нужно)
const debugPositionElement = document.getElementById('debugPosition');
const debugVelocityElement = document.getElementById('debugVelocity');
// Аккаунт игры
const gameAccount = 'PRIZM-RGLR-K9WH-F7UH-RG5DF';
// Загрузка изображений
const marioImage = new Image();
marioImage.src = 'mario.png';
const coinImage = new Image();
coinImage.src = 'pzmc_coin.png';
const obstacleImage = new Image();
obstacleImage.src = 'obstacle.png';
const backgroundImage = new Image();
backgroundImage.src = 'background.png';
// Загрузка звуков
const jumpSound = document.getElementById('jumpSound');
const coinSound = document.getElementById('coinSound');
const backgroundMusic = document.getElementById('backgroundMusic');
const gameOverSound = document.getElementById('gameOverSound');
// Проверка загрузки звуков
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
// Активация тестового режима
testModeButton.addEventListener('click', function () {
    if (!marioImage.complete || !coinImage.complete || !obstacleImage.complete || !backgroundImage.complete) {
        alert('Изображения еще не загружены. Пожалуйста, подождите.');
        return;
    }
    paymentChecked = true; // Пропускаем проверку оплаты
    console.log('Тестовый режим активирован. paymentChecked:', paymentChecked); // Логирование
    paymentMenu.style.display = 'none'; // Скрываем меню оплаты
    startGame(); // Запуск игры
});
// Проверка оплаты
checkPaymentButton.addEventListener('click', async () => {
    playerAddress = playerAddressInput.value.trim();
    if (!playerAddress) {
        paymentStatus.textContent = 'Введите адрес кошелька!';
        return;
    }
    paymentStatus.textContent = 'Ожидание подтверждения транзакции...';
    checkPaymentButton.disabled = true;
    // Ждем 30 секунд для подтверждения транзакции
    await new Promise(resolve => setTimeout(resolve, 30000));
    // Проверка оплаты в течение 10 минут
    const startTime = Date.now();
    const interval = setInterval(async () => {
        try {
            // Получаем список транзакций для аккаунта игры
            const response = await fetch(`https://192.168.1.27:9976/prizm?requestType=getBlockchainTransactions&account=${gameAccount}`);
            const data = await response.json();
            console.log('Транзакции:', data);
            if (data.errorCode) {
                console.error('Ошибка API:', data.errorDescription);
                paymentStatus.textContent = 'Ошибка при проверке оплаты. Попробуйте снова.';
                clearInterval(interval);
                checkPaymentButton.disabled = false;
                return;
            }
            const transactions = data.transactions || [];
            const usedTransactions = await readUsedTransactions(); // Чтение использованных транзакций
            // Поиск транзакции от игрока
            const paymentTransaction = transactions.find(
                (tx) => {
                    const isSenderMatch = tx.senderRS === playerAddress || tx.sender === playerAddress;
                    const isRecipientMatch = tx.recipientRS === gameAccount || tx.recipient === gameAccount;
                    const isAmountMatch = parseInt(tx.amountNQT) === 100 * 1; // 100 PZM в NQT
                    const isNewTransaction = !usedTransactions.includes(tx.transaction); // Проверка, что транзакция не использовалась
                    return isSenderMatch && isRecipientMatch && isAmountMatch && isNewTransaction;
                }
            );
            if (paymentTransaction) {
                clearInterval(interval);
                paymentStatus.textContent = 'Оплата подтверждена!';
                paymentChecked = true;
                paymentMenu.style.display = 'none';
                startButton.style.display = 'block';
                // Запись использованной транзакции
                writeUsedTransaction(paymentTransaction.transaction);
            } else if (Date.now() - startTime > 600000) { // 10 минут = 600000 мс
                clearInterval(interval);
                paymentStatus.textContent = 'Время ожидания истекло. Попробуйте снова.';
                checkPaymentButton.disabled = false;
            }
        } catch (error) {
            console.error('Ошибка при проверке оплаты:', error);
            paymentStatus.textContent = 'Ошибка при проверке оплаты. Попробуйте снова.';
            checkPaymentButton.disabled = false;
            clearInterval(interval);
        }
    }, 5000); // Проверка каждые 5 секунд
});
// Функция для чтения использованных транзакций
async function readUsedTransactions() {
    try {
        const response = await fetch('/usedTransactions.txt');
        if (!response.ok) {
            return [];
        }
        const data = await response.text();
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error('Ошибка при чтении файла usedTransactions.txt:', error);
        return [];
    }
}
// Функция для записи использованных транзакций
async function writeUsedTransaction(transactionId) {
    try {
        const usedTransactions = await readUsedTransactions();
        if (!usedTransactions.includes(transactionId)) {
            usedTransactions.push(transactionId);
            const response = await fetch('/writeTransaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ transactionId }),
            });
            const result = await response.json();
            if (result.success) {
                console.log(`Транзакция записана: ${transactionId}`);
            } else {
                console.log(`Ошибка записи транзакции: ${result.message}`);
            }
        }
    } catch (error) {
        console.error('Ошибка при записи транзакции:', error);
    }
}
// Класс Марио
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
    // Отрисовка Марио
    show() {
        ctx.drawImage(marioImage, this.x, this.y, this.width, this.height);
    }
    // Прыжок
    up() {
        if (this.onGround) { // Прыжок возможен только с земли
            this.velocity = this.lift; // Устанавливаем скорость прыжка
            this.onGround = false; // Марио в воздухе
            jumpSound.currentTime = 0; // Перезапуск звука прыжка
            jumpSound.play();
        }
    }
    // Обновление позиции Марио
    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        // Ограничение падения на землю
        if (this.y > canvas.height - this.height - 55) {
            this.y = canvas.height - this.height - 55;
            this.velocity = 0;
            this.onGround = true; // Марио на земле
        }
        // Отладочная информация (если нужно)
        if (debugPositionElement && debugVelocityElement) {
            debugPositionElement.innerText = `Позиция Марио: x=${this.x.toFixed(2)}, y=${this.y.toFixed(2)}`;
            debugVelocityElement.innerText = `Скорость Марио: ${this.velocity.toFixed(2)}`;
        }
    }
}
// Класс препятствия
class Obstacle {
    constructor() {
        this.width = 40;
        this.height = 55;
        this.x = canvas.width + Math.random() * 500; // Случайное расстояние от края
        this.y = canvas.height - 55 - 55; // Поднимаем препятствие на 55 пикселей от низа
    }
    // Отрисовка препятствия
    show() {
        ctx.drawImage(obstacleImage, this.x, this.y, this.width, this.height);
    }
    // Обновление позиции препятствия
    update() {
        this.x -= speed;
    }
}
// Класс монеты
class Coin {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = canvas.width + Math.random() * 500; // Случайное расстояние от края
        this.y = canvas.height - 100 - 55 - Math.random() * 30; // Увеличенный диапазон y для монет
    }
    // Отрисовка монеты
    show() {
        ctx.drawImage(coinImage, this.x, this.y, this.width, this.height);
    }
    // Обновление позиции монеты
    update() {
        this.x -= speed;
    }
}
// Проверка коллизии с препятствиями
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
// Проверка коллизии с монетами
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
// Основной игровой цикл
function gameLoop(timestamp) {
    if (!gameRunning) return;
    const deltaTime = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Отрисовка фона
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    // Обновление и отрисовка Марио
    if (!mario) {
        console.error('Марио не инициализирован!');
        return;
    }
    mario.update();
    mario.show();
    // Обновление и отрисовка препятствий
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (!obstacles[i]) {
            console.error('Препятствие не инициализировано!');
            continue;
        }
        obstacles[i].update();
        obstacles[i].show();
        // Проверка коллизии с препятствиями
        if (checkCollision(obstacles[i])) {
            gameRunning = false;
            clearInterval(obstacleInterval);
            clearInterval(coinInterval);
            backgroundMusic.pause();
            gameOverSound.currentTime = 0; // Перезапуск звука проигрыша
            gameOverSound.play();
            coinsDisplay.innerText = `Монеты: ${coins}`;
            showGameOverMenu(); // Показываем меню проигрыша
            sendReward(coins);
            break;
        }
        // Удаление препятствий, которые вышли за пределы экрана
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
        }
    }
    // Обновление и отрисовка монет
    coinsArray = coinsArray.filter((coin) => {
        if (!coin) {
            console.error('Монета не инициализирована!');
            return false; // Пропустить неинициализированные монеты
        }
        coin.update();
        coin.show();
        // Проверка коллизии с монетами
        if (checkCoinCollision(coin)) {
            coins++;
            coinsDisplay.innerText = `Монеты: ${coins}`;
            coinSound.currentTime = 0; // Перезапуск звука монеты
            coinSound.play();
            return false; // Удалить монету из массива
        }
        // Удаление монет, которые вышли за пределы экрана
        if (coin.x + coin.width < 0) {
            return false; // Удалить монету из массива
        }
        return true; // Оставить монету в массиве
    });
    // Запуск следующего кадра
    requestAnimationFrame(gameLoop);
}
// Обработка нажатия клавиши пробела для прыжка
document.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
        if (!mario) {
            console.error('Марио не инициализирован!');
            return;
        }
        mario.up();
    }
});
// Добавляем обработчик касания для прыжка на холсте
canvas.addEventListener('touchstart', function (e) {
    if (!gameRunning) return;
    if (e.touches.length === 1) {
        mario.up();
    }
});
// Запуск игры
startButton.addEventListener('click', function () {
    if (gameRunning) return;
    // Проверка оплаты 100 PZM (если тестовый режим выключен)
    if (!paymentChecked) {
        alert('Пожалуйста, оплатите 1 PZM для начала игры.');
        return;
    }
    startGame(); // Запуск игры
});
// Функция для запуска игры
function startGame() {
    coins = 0;
    coinsDisplay.innerText = `Монеты: ${coins}`;
    mario = new Mario();
    obstacles = [];
    coinsArray = [];
    gameRunning = true;
    lastFrameTime = performance.now();
    speed = 5; // Уменьшенная начальная скорость
    // Генерация препятствий
    obstacleInterval = setInterval(() => {
        const obstacle = new Obstacle();
        obstacles.push(obstacle);
    }, 1500 + Math.random() * 1000); // Случайное время появления препятствий
    // Генерация монет
    coinInterval = setInterval(() => {
        const coin = new Coin();
        coinsArray.push(coin);
    }, 1500 + Math.random() * 1000); // Увеличенная частота монет
    // Увеличение скорости с течением времени
    increaseSpeed();
    // Запуск фоновой музыки
    backgroundMusic.play();
    // Запуск игрового цикла
    requestAnimationFrame(gameLoop);
    // Скрытие кнопки "Start"
    startButton.style.display = 'none';
}
// Плавное увеличение скорости с течением времени
function increaseSpeed() {
    if (gameRunning) {
        speed += 0.05; // Увеличиваем скорость каждые 1000 миллисекунд
        setTimeout(increaseSpeed, 1000);
    }
}
// Отправка награды
async function sendReward(coins) {
    const reward = coins; // 1 PZM за монету
    if (reward === 0) {
        return;
    }
    const recipient = playerAddress;
    if (!recipient) {
        console.error('Адрес получателя не указан!');
        return;
    }
    const secretPhrase = 'prizm three pen able ponder door morning around frame ash dry coward honey mom season born nearly i see dead people';
    try {
        const response = await fetch('https://192.168.1.27:9976/prizm', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                requestType: 'sendMoney',
                recipient: recipient,
                amountNQT: reward * 100, // Конвертация PZM в NQT
                feeNQT: 100, // Комиссия 1 NQT
                secretPhrase: secretPhrase,
                deadline: 1440, // Время жизни транзакции (1440 минут = 1 день)
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
// Обработка нажатия кнопки "Вернуться в меню" после проигрыша
returnToMenuButton.addEventListener('click', function () {
    hideGameOverMenu(); // Скрываем меню проигрыша
    resetGame(); // Сбрасываем состояние игры
    paymentMenu.style.display = 'block'; // Показываем основное меню игры
});
// Функция для показа меню проигрыша
function showGameOverMenu() {
    gameOverMenu.style.display = 'flex'; // Показываем меню проигрыша
}
// Функция для скрытия меню проигрыша
function hideGameOverMenu() {
    gameOverMenu.style.display = 'none'; // Скрываем меню проигрыша
}
// Функция для сброса состояния игры
function resetGame() {
    coins = 0;
    coinsDisplay.innerText = `Монеты: ${coins}`;
    mario = null;
    obstacles = [];
    coinsArray = [];
    gameRunning = false;
    speed = 5; // Начальная скорость
}
// Функция для корректировки размеров и позиций объектов
function resizeGame() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    if (mario) {
        mario.x = 50;
        mario.y = canvas.height - 50 - 55; // Опустим Марио на 55 пикселей от низа
    }
    obstacles.forEach(obstacle => {
        obstacle.y = canvas.height - 55 - 55; // Поднимаем препятствие на 55 пикселей от низа
    });
    coinsArray.forEach(coin => {
        coin.y = canvas.height - 100 - 55 - Math.random() * 30; // Увеличенный диапазон y для монет
    });
}

// Обработчик изменения размеров окна
window.addEventListener('resize', resizeGame);

// Инициализация игры после загрузки всех изображений
function initGame() {
    if (!marioImage.complete || !coinImage.complete || !obstacleImage.complete || !backgroundImage.complete) {
        setTimeout(initGame, 100); // Повторяем, пока изображения не загрузятся
        return;
    }
    resizeGame(); // Корректируем размеры и позиции объектов
    testModeButton.disabled = false; // Активируем кнопку тестового режима
}

initGame();

// Отключение контекстного меню
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
});

// Отключение стандартного поведения при двойном тапе
document.addEventListener('dblclick', function (e) {
    e.preventDefault();
});