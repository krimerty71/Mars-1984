// MARS: 1984 - Полная мобильная игра
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Размеры
        this.cellSize = 32;
        this.mapWidth = 20;
        this.mapHeight = 30;
        this.canvas.width = 400;
        this.canvas.height = 700;
        
        // Состояние игры
        this.player = {
            x: 10 * this.cellSize,
            y: 15 * this.cellSize,
            health: 100,
            maxHealth: 100,
            energy: 50,
            maxEnergy: 100,
            resources: {
                iron: 5,
                silicon: 2,
                rareMetal: 0
            }
        };
        
        this.map = [];
        this.enemies = [];
        this.buildings = [];
        this.wave = 1;
        this.kills = 0;
        this.day = 1;
        this.gameRunning = false;
        this.gameOver = false;
        this.paused = false;
        
        // Камера
        this.cameraX = 0;
        this.cameraY = 0;
        
        // Управление
        this.joystick = document.getElementById('joystick');
        this.joystickArea = document.getElementById('joystickArea');
        this.joystickActive = false;
        this.joystickDir = { x: 0, y: 0 };
        
        // Таймеры
        this.lastEnemySpawn = 0;
        this.enemySpawnInterval = 2000; // 2 секунды
        this.lastUpdate = 0;
        
        // Загрузка текстур
        this.textures = {};
        this.loadTextures();
        
        // Привязка методов
        this.gameLoop = this.gameLoop.bind(this);
        this.handleTouch = this.handleTouch.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Инициализация
        this.init();
    }
    
    loadTextures() {
        const textureList = {
            player: TEXTURES.player,
            enemyScout: TEXTURES.enemyScout,
            enemyWarrior: TEXTURES.enemyWarrior,
            enemyBoss: TEXTURES.enemyBoss,
            miner: TEXTURES.miner,
            base: TEXTURES.base,
            iron: TEXTURES.iron,
            silicon: TEXTURES.silicon,
            rareMetal: TEXTURES.rareMetal,
            marsTerrain: TEXTURES.marsTerrain
        };
        
        let loaded = 0;
        const total = Object.keys(textureList).length;
        
        for (let [key, data] of Object.entries(textureList)) {
            const img = new Image();
            img.onload = () => {
                loaded++;
                const progress = (loaded / total) * 100;
                document.getElementById('loadingProgress').style.width = progress + '%';
                
                if (loaded === total) {
                    setTimeout(() => {
                        document.getElementById('loadingScreen').classList.add('hidden');
                        document.getElementById('gameUI').classList.remove('hidden');
                        document.getElementById('controlPanel').classList.remove('hidden');
                        document.getElementById('joystickArea').classList.remove('hidden');
                        this.startGame();
                    }, 500);
                }
            };
            img.src = data;
            this.textures[key] = img;
        }
    }
    
    init() {
        this.generateMap();
        this.setupControls();
    }
    
    generateMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                // Процедурная генерация
                const terrain = Math.random();
                let type = 'plain';
                if (terrain < 0.2) type = 'crater';
                else if (terrain < 0.4) type = 'hill';
                else if (terrain < 0.5) type = 'mountain';
                
                // Ресурсы
                let resource = null;
                if (type === 'plain' && Math.random() < 0.1) resource = 'iron';
                else if (type === 'hill' && Math.random() < 0.15) resource = 'silicon';
                else if (type === 'mountain' && Math.random() < 0.05) resource = 'rareMetal';
                
                this.map[y][x] = {
                    type: type,
                    resource: resource,
                    building: null,
                    x: x,
                    y: y
                };
            }
        }
    }
    
    setupControls() {
        // Джойстик
        this.joystickArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.joystickActive = true;
            this.handleTouch(e);
        });
        
        this.joystickArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleTouch(e);
        });
        
        this.joystickArea.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.joystickActive = false;
            this.joystickDir = { x: 0, y: 0 };
            this.joystick.style.top = '35px';
            this.joystick.style.left = '35px';
        });
        
        // Кнопки действий
        document.getElementById('gatherBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.gatherResource();
        });
        
        document.getElementById('buildMinerBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.buildMiner();
        });
        
        document.getElementById('buildBaseBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.buildBase();
        });
        
        document.getElementById('pauseBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.pause();
        });
    }
    
    handleTouch(e) {
        if (!this.joystickActive) return;
        
        const touch = e.touches[0];
        const rect = this.joystickArea.getBoundingClientRect();
        
        // Координаты относительно джойстика
        let x = touch.clientX - rect.left - 60;
        let y = touch.clientY - rect.top - 60;
        
        // Ограничение радиуса
        const distance = Math.sqrt(x*x + y*y);
        const maxDistance = 40;
        
        if (distance > maxDistance) {
            x = (x / distance) * maxDistance;
            y = (y / distance) * maxDistance;
        }
        
        this.joystick.style.left = (35 + x) + 'px';
        this.joystick.style.top = (35 + y) + 'px';
        
        // Нормализованное направление
        this.joystickDir = {
            x: x / maxDistance,
            y: y / maxDistance
        };
    }
    
    startGame() {
        this.gameRunning = true;
        this.gameLoop();
    }
    
    update() {
        if (!this.gameRunning || this.paused || this.gameOver) return;
        
        // Движение игрока
        if (this.joystickActive) {
            const speed = 3;
            this.player.x += this.joystickDir.x * speed;
            this.player.y += this.joystickDir.y * speed;
            
            // Границы карты
            this.player.x = Math.max(0, Math.min(this.player.x, (this.mapWidth - 1) * this.cellSize));
            this.player.y = Math.max(0, Math.min(this.player.y, (this.mapHeight - 1) * this.cellSize));
        }
        
        // Обновление камеры
        this.cameraX = this.player.x - 200;
        this.cameraY = this.player.y - 350;
        
        // Спавн врагов
        const now = Date.now();
        if (now - this.lastEnemySpawn > this.enemySpawnInterval) {
            this.spawnEnemy();
            this.lastEnemySpawn = now;
            
            // Увеличиваем сложность
            if (this.enemies.length > this.wave * 3) {
                this.wave++;
                this.enemySpawnInterval = Math.max(500, 2000 - this.wave * 100);
            }
        }
        
        // Обновление врагов
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Движение к игроку
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }
            
            // Атака игрока
            if (dist < 30) {
                this.player.health -= 0.5;
                if (this.player.health <= 0) {
                    this.gameOver = true;
                    document.getElementById('finalWave').textContent = this.wave;
                    document.getElementById('finalKills').textContent = this.kills;
                    document.getElementById('gameOverOverlay').classList.remove('hidden');
                }
            }
            
            // Удаление мертвых врагов
            if (enemy.health <= 0) {
                this.enemies.splice(i, 1);
                this.kills++;
            }
        }
        
        // Автоматическая добыча от построек
        for (let building of this.buildings) {
            if (building.type === 'miner' && Math.random() < 0.01) {
                this.player.resources.iron += 1;
            }
        }
        
        // Восстановление энергии
        if (this.player.energy < this.player.maxEnergy) {
            this.player.energy += 0.1;
        }
        
        // Обновление UI
        this.updateUI();
    }
    
    spawnEnemy() {
        // Выбор стороны для спавна
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: // Сверху
                x = Math.random() * this.mapWidth * this.cellSize;
                y = -this.cellSize;
                break;
            case 1: // Справа
                x = this.mapWidth * this.cellSize + this.cellSize;
                y = Math.random() * this.mapHeight * this.cellSize;
                break;
            case 2: // Снизу
                x = Math.random() * this.mapWidth * this.cellSize;
                y = this.mapHeight * this.cellSize + this.cellSize;
                break;
            case 3: // Слева
                x = -this.cellSize;
                y = Math.random() * this.mapHeight * this.cellSize;
                break;
        }
        
        // Тип врага в зависимости от волны
        let type = 'scout';
        const rand = Math.random();
        if (this.wave > 3) {
            if (rand < 0.6) type = 'scout';
            else if (rand < 0.9) type = 'warrior';
            else type = 'boss';
        } else if (this.wave > 1) {
            if (rand < 0.8) type = 'scout';
            else type = 'warrior';
        }
        
        const enemy = {
            x: x,
            y: y,
            type: type,
            health: type === 'scout' ? 15 : (type === 'warrior' ? 40 : 100),
            speed: type === 'scout' ? 3 : (type === 'warrior' ? 1.5 : 1),
            texture: this.textures['enemy' + type.charAt(0).toUpperCase() + type.slice(1)]
        };
        
        this
