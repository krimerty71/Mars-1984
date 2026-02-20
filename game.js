// MARS: 1984 - Полная мобильная игра (версия с мгновенной загрузкой)
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
        this.enemySpawnInterval = 2000;
        this.lastUpdate = 0;
        
        // Привязка методов
        this.gameLoop = this.gameLoop.bind(this);
        this.handleTouch = this.handleTouch.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Сразу запускаем игру без загрузки
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('gameUI').classList.remove('hidden');
            document.getElementById('controlPanel').classList.remove('hidden');
            document.getElementById('joystickArea').classList.remove('hidden');
            this.startGame();
        }, 100); // Всего 0.1 секунды задержки!
        
        // Инициализация
        this.init();
    }
    
    init() {
        this.generateMap();
        this.setupControls();
    }
    
    generateMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                const terrain = Math.random();
                let type = 'plain';
                if (terrain < 0.2) type = 'crater';
                else if (terrain < 0.4) type = 'hill';
                else if (terrain < 0.5) type = 'mountain';
                
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
        
        let x = touch.clientX - rect.left - 60;
        let y = touch.clientY - rect.top - 60;
        
        const distance = Math.sqrt(x*x + y*y);
        const maxDistance = 40;
        
        if (distance > maxDistance) {
            x = (x / distance) * maxDistance;
            y = (y / distance) * maxDistance;
        }
        
        this.joystick.style.left = (35 + x) + 'px';
        this.joystick.style.top = (35 + y) + 'px';
        
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
        
        if (this.joystickActive) {
            const speed = 3;
            this.player.x += this.joystickDir.x * speed;
            this.player.y += this.joystickDir.y * speed;
            
            this.player.x = Math.max(0, Math.min(this.player.x, (this.mapWidth - 1) * this.cellSize));
            this.player.y = Math.max(0, Math.min(this.player.y, (this.mapHeight - 1) * this.cellSize));
        }
        
        this.cameraX = this.player.x - 200;
        this.cameraY = this.player.y - 350;
        
        const now = Date.now();
        if (now - this.lastEnemySpawn > this.enemySpawnInterval) {
            this.spawnEnemy();
            this.lastEnemySpawn = now;
            
            if (this.enemies.length > this.wave * 3) {
                this.wave++;
                this.enemySpawnInterval = Math.max(500, 2000 - this.wave * 100);
            }
        }
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }
            
            if (dist < 30) {
                this.player.health -= 0.5;
                if (this.player.health <= 0) {
                    this.gameOver = true;
                    document.getElementById('finalWave').textContent = this.wave;
                    document.getElementById('finalKills').textContent = this.kills;
                    document.getElementById('gameOverOverlay').classList.remove('hidden');
                }
            }
            
            if (enemy.health <= 0) {
                this.enemies.splice(i, 1);
                this.kills++;
            }
        }
        
        for (let building of this.buildings) {
            if (building.type === 'miner' && Math.random() < 0.01) {
                this.player.resources.iron += 1;
            }
        }
        
        if (this.player.energy < this.player.maxEnergy) {
            this.player.energy += 0.1;
        }
        
        this.updateUI();
    }
    
    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0:
                x = Math.random() * this.mapWidth * this.cellSize;
                y = -this.cellSize;
                break;
            case 1:
                x = this.mapWidth * this.cellSize + this.cellSize;
                y = Math.random() * this.mapHeight * this.cellSize;
                break;
            case 2:
                x = Math.random() * this.mapWidth * this.cellSize;
                y = this.mapHeight * this.cellSize + this.cellSize;
                break;
            case 3:
                x = -this.cellSize;
                y = Math.random() * this.mapHeight * this.cellSize;
                break;
        }
        
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
        
        this.enemies.push({
            x: x,
            y: y,
            type: type,
            health: type === 'scout' ? 15 : (type === 'warrior' ? 40 : 100),
            speed: type === 'scout' ? 3 : (type === 'warrior' ? 1.5 : 1)
        });
    }
    
    gatherResource() {
        if (this.player.energy < 10) return;
        
        const cellX = Math.floor(this.player.x / this.cellSize);
        const cellY = Math.floor(this.player.y / this.cellSize);
        
        if (cellX >= 0 && cellX < this.mapWidth && cellY >= 0 && cellY < this.mapHeight) {
            const cell = this.map[cellY][cellX];
            
            if (cell.resource) {
                this.player.resources[cell.resource] += 1;
                cell.resource = null;
                this.player.energy -= 10;
            }
        }
    }
    
    buildMiner() {
        if (this.player.resources.iron < 3) return;
        
        const cellX = Math.floor(this.player.x / this.cellSize);
        const cellY = Math.floor(this.player.y / this.cellSize);
        
        if (cellX >= 0 && cellX < this.mapWidth && cellY >= 0 && cellY < this.mapHeight) {
            const cell = this.map[cellY][cellX];
            
            if (!cell.building) {
                cell.building = 'miner';
                this.player.resources.iron -= 3;
                this.buildings.push({
                    x: cellX * this.cellSize,
                    y: cellY * this.cellSize,
                    type: 'miner'
                });
            }
        }
    }
    
    buildBase() {
        if (this.player.resources.iron < 5 || this.player.resources.silicon < 2) return;
        
        const cellX = Math.floor(this.player.x / this.cellSize);
        const cellY = Math.floor(this.player.y / this.cellSize);
        
        if (cellX >= 0 && cellX < this.mapWidth && cellY >= 0 && cellY < this.mapHeight) {
            const cell = this.map[cellY][cellX];
            
            if (!cell.building) {
                cell.building = 'base';
                this.player.resources.iron -= 5;
                this.player.resources.silicon -= 2;
                this.buildings.push({
                    x: cellX * this.cellSize,
                    y: cellY * this.cellSize,
                    type: 'base'
                });
            }
        }
    }
    
    pause() {
        this.paused = !this.paused;
        document.getElementById('menuOverlay').classList.toggle('hidden');
    }
    
    resume() {
        this.paused = false;
        document.getElementById('menuOverlay').classList.add('hidden');
    }
    
    save() {
        const saveData = {
            player: this.player,
            map: this.map,
            wave: this.wave,
            kills: this.kills,
            day: this.day,
            buildings: this.buildings
        };
        localStorage.setItem('mars1984_save', JSON.stringify(saveData));
        alert('💾 Игра сохранена!');
    }
    
    load() {
        const saveData = localStorage.getItem('mars1984_save');
        if (saveData) {
            const data = JSON.parse(saveData);
            this.player = data.player;
            this.map = data.map;
            this.wave = data.wave;
            this.kills = data.kills;
            this.day = data.day;
            this.buildings = data.buildings;
            this.paused = false;
            document.getElementById('menuOverlay').classList.add('hidden');
            alert('📂 Загрузка завершена!');
        }
    }
    
    restart() {
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
        this.enemies = [];
        this.buildings = [];
        this.wave = 1;
        this.kills = 0;
        this.day = 1;
        this.gameOver = false;
        this.paused = false;
        this.generateMap();
        
        document.getElementById('gameOverOverlay').classList.add('hidden');
        document.getElementById('menuOverlay').classList.add('hidden');
    }
    
    updateUI() {
        document.getElementById('iron').textContent = this.player.resources.iron;
        document.getElementById('silicon').textContent = this.player.resources.silicon;
        document.getElementById('rareMetal').textContent = this.player.resources.rareMetal;
        document.getElementById('health').textContent = Math.floor(this.player.health);
        document.getElementById('energy').textContent = Math.floor(this.player.energy);
        document.getElementById('wave').textContent = this.wave;
        document.getElementById('enemies').textContent = this.enemies.length;
        
        document.getElementById('statDay').textContent = this.day;
        document.getElementById('statKills').textContent = this.kills;
        document.getElementById('statBuildings').textContent = this.buildings.length;
    }
    
    // ========== ОТРИСОВКА ВСЕХ СПРАЙТОВ КОДОМ ==========
    
    drawPlayer(x, y) {
        // Тело (скафандр)
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.fillRect(x + 8, y + 4, 16, 20);
        
        // Шлем
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x + 10, y + 2, 12, 6);
        
        // Стекло шлема
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(x + 12, y + 4, 4, 3);
        this.ctx.fillRect(x + 16, y + 4, 4, 3);
        
        // Ноги
        this.ctx.fillStyle = '#f5a623';
        this.ctx.fillRect(x + 12, y + 24, 4, 6);
        this.ctx.fillRect(x + 16, y + 24, 4, 6);
        
        // Рюкзак
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(x + 4, y + 8, 4, 12);
        
        // Глаза
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x + 12, y + 8, 2, 2);
        this.ctx.fillRect(x + 18, y + 8, 2, 2);
    }
    
    drawEnemyScout(x, y) {
        // Маленький красный враг
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(x + 16, y + 16, 10, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Глаза
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x + 12, y + 12, 3, 3);
        this.ctx.fillRect(x + 18, y + 12, 3, 3);
        
        // Щупальца
        this.ctx.strokeStyle = '#880000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + 8, y + 8);
        this.ctx.lineTo(x + 4, y + 4);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(x + 24, y + 8);
        this.ctx.lineTo(x + 28, y + 4);
        this.ctx.stroke();
    }
    
    drawEnemyWarrior(x, y) {
        // Большой красный враг
        this.ctx.fillStyle = '#cc0000';
        this.ctx.beginPath();
        this.ctx.arc(x + 16, y + 16, 13, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Броня
        this.ctx.fillStyle = '#990000';
        this.ctx.fillRect(x + 8, y + 6, 16, 6);
        
        // Глаза
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(x + 10, y + 12, 4, 4);
        this.ctx.fillRect(x + 18, y + 12, 4, 4);
        
        // Клыки
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x + 12, y + 20, 2, 4);
        this.ctx.fillRect(x + 18, y + 20, 2, 4);
    }
    
    drawEnemyBoss(x, y) {
        // Огромный босс
        this.ctx.fillStyle = '#8b0000';
        this.ctx.beginPath();
        this.ctx.arc(x + 16, y + 16, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Корона
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(x + 10, y + 2, 12, 4);
        for (let i = 0; i < 3; i++) {
            this.ctx.fillRect(x + 10 + i*5, y - 2, 3, 6);
        }
        
        // Глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(x + 10, y + 10, 4, 4);
        this.ctx.fillRect(x + 18, y + 10, 4, 4);
        
        // Пасть
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(x + 12, y + 20, 8, 3);
    }
    
    drawMiner(x, y) {
        // Шахта
        this.ctx.fillStyle = '#7ed321';
        this.ctx.fillRect(x + 8, y + 12, 16, 16);
        
        // Труба
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(x + 14, y + 4, 4, 8);
        
        // Огонек работы
        this.ctx.fillStyle = '#f8e71c';
        this.ctx.beginPath();
        this.ctx.arc(x + 16, y + 20, 3, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawBase(x, y) {
        // База
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.fillRect(x + 4, y + 12, 24, 16);
        
        // Купол
        this.ctx.fillStyle = '#f5a623';
        this.ctx.beginPath();
        this.ctx.arc(x + 16, y + 10, 8, 0, Math.PI, true);
        this.ctx.fill();
        
        // Дверь
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(x + 14, y + 20, 4, 8);
        
        // Окна
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(x + 6, y + 16, 3, 3);
        this.ctx.fillRect(x + 23, y + 16, 3, 3);
    }
    
    drawIron(x, y) {
        // Железо
        this.ctx.fillStyle = '#9b9b9b';
        this.ctx.beginPath();
        this.ctx.arc(x + 16, y + 16, 6, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(x + 10, y + 14, 12, 4);
    }
    
    drawSilicon(x, y) {
        // Кремний
        this.ctx.fillStyle = '#bd10e0';
        this.ctx.beginPath();
        this.ctx.moveTo(x + 16, y + 8);
        this.ctx.lineTo(x + 24, y + 16);
        this.ctx.lineTo(x + 16, y + 24);
        this.ctx.lineTo(x + 8, y + 16);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawRareMetal(x, y) {
        // Редкий металл
        this.ctx.fillStyle = '#f5a623';
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (Math.random() > 0.5) {
                    this.ctx.fillRect(x + 8 + i*6, y + 8 + j*6, 3, 3);
                }
            }
        }
    }
    
    drawTerrain(x, y, type) {
        // Базовая поверхность
        const colors = {
            'plain': '#c44d34',
            'crater': '#a33d2a',
            'hill': '#b34d34',
            'mountain': '#8b3d2a'
        };
        
        this.ctx.fillStyle = colors[type] || '#c44d34';
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
        
        // Добавляем текстуру
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                if (Math.random() > 0.7) {
                    this.ctx.fillRect(x + i*8, y + j*8, 2, 2);
                }
            }
        }
        
        // Кратеры
        if (type === 'crater') {
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
            this.ctx.beginPath();
          
