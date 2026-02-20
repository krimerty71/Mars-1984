// MARS: 1984 - Максимально простая версия, ничего не загружает
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
        
        // Игрок
        this.player = {
            x: 10 * 32,
            y: 15 * 32,
            health: 100,
            maxHealth: 100,
            energy: 50,
            maxEnergy: 100,
            resources: { iron: 5, silicon: 2, rareMetal: 0 }
        };
        
        // Карта
        this.map = [];
        this.enemies = [];
        this.buildings = [];
        this.wave = 1;
        this.kills = 0;
        this.gameRunning = true;
        this.gameOver = false;
        this.paused = false;
        
        // Камера
        this.cameraX = 0;
        this.cameraY = 0;
        
        // Джойстик
        this.joystickActive = false;
        this.joystickDir = { x: 0, y: 0 };
        this.lastEnemySpawn = Date.now();
        
        // Генерируем карту сразу
        this.generateMap();
        
        // Управление
        this.setupControls();
        
        // Запускаем игру БЕЗ ВСЯКОЙ ЗАГРУЗКИ
        this.gameLoop();
    }
    
    generateMap() {
        for (let y = 0; y < this.mapHeight; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                let type = 'plain';
                let r = Math.random();
                if (r < 0.2) type = 'crater';
                else if (r < 0.4) type = 'hill';
                else if (r < 0.5) type = 'mountain';
                
                let resource = null;
                r = Math.random();
                if (type === 'plain' && r < 0.1) resource = 'iron';
                else if (type === 'hill' && r < 0.15) resource = 'silicon';
                else if (type === 'mountain' && r < 0.05) resource = 'rareMetal';
                
                this.map[y][x] = {
                    type: type,
                    resource: resource,
                    building: null,
                    x: x, y: y
                };
            }
        }
    }
    
    setupControls() {
        const joystick = document.getElementById('joystick');
        const area = document.getElementById('joystickArea');
        
        area.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.joystickActive = true;
            this.handleJoystick(e);
        });
        
        area.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handleJoystick(e);
        });
        
        area.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.joystickActive = false;
            this.joystickDir = { x: 0, y: 0 };
            joystick.style.top = '35px';
            joystick.style.left = '35px';
        });
        
        document.getElementById('gatherBtn').onclick = () => this.gatherResource();
        document.getElementById('buildMinerBtn').onclick = () => this.buildMiner();
        document.getElementById('buildBaseBtn').onclick = () => this.buildBase();
        document.getElementById('pauseBtn').onclick = () => this.pause();
    }
    
    handleJoystick(e) {
        if (!this.joystickActive) return;
        
        const touch = e.touches[0];
        const rect = document.getElementById('joystickArea').getBoundingClientRect();
        
        let x = touch.clientX - rect.left - 60;
        let y = touch.clientY - rect.top - 60;
        
        const dist = Math.sqrt(x*x + y*y);
        const maxDist = 40;
        
        if (dist > maxDist) {
            x = (x / dist) * maxDist;
            y = (y / dist) * maxDist;
        }
        
        document.getElementById('joystick').style.left = (35 + x) + 'px';
        document.getElementById('joystick').style.top = (35 + y) + 'px';
        
        this.joystickDir = {
            x: x / maxDist,
            y: y / maxDist
        };
    }
    
    update() {
        if (!this.gameRunning || this.paused || this.gameOver) return;
        
        // Движение
        if (this.joystickActive) {
            this.player.x += this.joystickDir.x * 3;
            this.player.y += this.joystickDir.y * 3;
            
            this.player.x = Math.max(0, Math.min(this.player.x, (this.mapWidth - 1) * 32));
            this.player.y = Math.max(0, Math.min(this.player.y, (this.mapHeight - 1) * 32));
        }
        
        // Камера
        this.cameraX = this.player.x - 200;
        this.cameraY = this.player.y - 350;
        
        // Спавн врагов
        if (Date.now() - this.lastEnemySpawn > 2000) {
            this.spawnEnemy();
            this.lastEnemySpawn = Date.now();
        }
        
        // Обновление врагов
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist > 0) {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
            }
            
            if (dist < 30) {
                this.player.health -= 0.5;
                if (this.player.health <= 0) {
                    this.gameOver = true;
                    document.getElementById('gameOverOverlay').classList.remove('hidden');
                }
            }
            
            if (e.health <= 0) {
                this.enemies.splice(i, 1);
                this.kills++;
            }
        }
        
        // UI
        this.updateUI();
    }
    
    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
            case 0: x = Math.random() * 640; y = -32; break;
            case 1: x = 640; y = Math.random() * 960; break;
            case 2: x = Math.random() * 640; y = 960; break;
            case 3: x = -32; y = Math.random() * 960; break;
        }
        
        this.enemies.push({
            x: x, y: y,
            type: 'scout',
            health: 15,
            speed: 2
        });
    }
    
    gatherResource() {
        if (this.player.energy < 10) return;
        
        const x = Math.floor(this.player.x / 32);
        const y = Math.floor(this.player.y / 32);
        
        if (x >= 0 && x < 20 && y >= 0 && y < 30) {
            const cell = this.map[y][x];
            if (cell.resource) {
                this.player.resources[cell.resource] += 1;
                cell.resource = null;
                this.player.energy -= 10;
            }
        }
    }
    
    buildMiner() {
        if (this.player.resources.iron < 3) return;
        
        const x = Math.floor(this.player.x / 32);
        const y = Math.floor(this.player.y / 32);
        
        if (x >= 0 && x < 20 && y >= 0 && y < 30) {
            const cell = this.map[y][x];
            if (!cell.building) {
                cell.building = 'miner';
                this.player.resources.iron -= 3;
            }
        }
    }
    
    buildBase() {
        if (this.player.resources.iron < 5 || this.player.resources.silicon < 2) return;
        
        const x = Math.floor(this.player.x / 32);
        const y = Math.floor(this.player.y / 32);
        
        if (x >= 0 && x < 20 && y >= 0 && y < 30) {
            const cell = this.map[y][x];
            if (!cell.building) {
                cell.building = 'base';
                this.player.resources.iron -= 5;
                this.player.resources.silicon -= 2;
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
        localStorage.setItem('mars1984_save', JSON.stringify({
            player: this.player,
            map: this.map,
            wave: this.wave,
            kills: this.kills
        }));
        alert('Сохранено');
    }
    
    load() {
        const data = localStorage.getItem('mars1984_save');
        if (data) {
            const d = JSON.parse(data);
            this.player = d.player;
            this.map = d.map;
            this.wave = d.wave;
            this.kills = d.kills;
            alert('Загружено');
        }
    }
    
    restart() {
        this.player = {
            x: 10 * 32,
            y: 15 * 32,
            health: 100,
            maxHealth: 100,
            energy: 50,
            maxEnergy: 100,
            resources: { iron: 5, silicon: 2, rareMetal: 0 }
        };
        this.enemies = [];
        this.buildings = [];
        this.wave = 1;
        this.kills = 0;
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
    }
    
    draw() {
        // Очистка
        this.ctx.fillStyle = '#2a1a0f';
        this.ctx.fillRect(0, 0, 400, 700);
        
        // Карта
        for (let y = 0; y < 30; y++) {
            for (let x = 0; x < 20; x++) {
                const cell = this.map[y][x];
                const sx = x * 32 - this.cameraX;
                const sy = y * 32 - this.cameraY;
                
                if (sx > -32 && sx < 400 && sy > -32 && sy < 700) {
                    // Цвет поверхности
                    if (cell.type === 'plain') this.ctx.fillStyle = '#c44d34';
                    else if (cell.type === 'crater') this.ctx.fillStyle = '#a33d2a';
                    else if (cell.type === 'hill') this.ctx.fillStyle = '#b34d34';
                    else this.ctx.fillStyle = '#8b3d2a';
                    
                    this.ctx.fillRect(sx, sy, 31, 31);
                    
                    // Ресурсы
                    if (cell.resource === 'iron') {
                        this.ctx.fillStyle = '#9b9b9b';
                        this.ctx.beginPath();
                        this.ctx.arc(sx+16, sy+16, 6, 0, 2*Math.PI);
                        this.ctx.fill();
                    }
                    
                    // Постройки
                    if (cell.building === 'miner') {
                        this.ctx.fillStyle = '#7ed321';
                        this.ctx.fillRect(sx+8, sy+8, 16, 16);
                    } else if (cell.building === 'base') {
                        this.ctx.fillStyle = '#4a90e2';
                        this.ctx.fillRect(sx+4, sy+4, 24, 24);
                    }
                    
                    // Сетка
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                    this.ctx.strokeRect(sx, sy, 32, 32);
                }
            }
        }
        
        // Враги
        this.ctx.fillStyle = '#ff4444';
        for (let e of this.enemies) {
            const sx = e.x - this.cameraX;
            const sy = e.y - this.cameraY;
            if (sx > -32 && sx < 400 && sy > -32 && sy < 700) {
                this.ctx.beginPath();
                this.ctx.arc(sx+16, sy+16, 12, 0, 2*Math.PI);
                this.ctx.fill();
            }
        }
        
        // Игрок
        const px = this.player.x - this.cameraX;
        const py = this.player.y - this.cameraY;
        
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.fillRect(px+8, py+4, 16, 20);
        
        // Полоска здоровья
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(px, py-10, 32 * (this.player.health/100), 4);
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск
new Game();
