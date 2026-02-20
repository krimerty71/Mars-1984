// MARS: 1984 - Версия с оружием и улучшенным управлением
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
            resources: { iron: 5, silicon: 2, rareMetal: 0 },
            attackCooldown: 0,
            attackDamage: 25
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
        
        // Джойстик - теперь выше
        this.joystickActive = false;
        this.joystickDir = { x: 0, y: 0 };
        
        // Спавн врагов - УВЕЛИЧИЛ ИНТЕРВАЛ в 3 раза
        this.lastEnemySpawn = Date.now();
        this.enemySpawnInterval = 6000; // Было 2000, стало 6000 (6 секунд)
        
        // Оружие
        this.weaponType = 'melee'; // melee или ranged
        this.bullets = [];
        
        this.generateMap();
        this.setupControls();
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
        
        // Джойстик
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
        
        // Кнопки
        document.getElementById('gatherBtn').onclick = () => this.gatherResource();
        document.getElementById('buildMinerBtn').onclick = () => this.buildMiner();
        document.getElementById('buildBaseBtn').onclick = () => this.buildBase();
        document.getElementById('attackBtn').onclick = () => this.attack();
        document.getElementById('pauseBtn').onclick = () => this.pause();
        
        // Переключение оружия (двойной тап на кнопке атаки)
        let lastTap = 0;
        document.getElementById('attackBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 300 && tapLength > 0) {
                this.switchWeapon();
            }
            lastTap = currentTime;
        });
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
    
    attack() {
        if (this.player.attackCooldown > 0) return;
        
        if (this.weaponType === 'melee') {
            // Ближний бой - удар по врагам рядом
            for (let i = 0; i < this.enemies.length; i++) {
                const e = this.enemies[i];
                const dist = Math.sqrt(
                    Math.pow(this.player.x - e.x, 2) + 
                    Math.pow(this.player.y - e.y, 2)
                );
                
                if (dist < 50) { // Радиус удара
                    e.health -= this.player.attackDamage;
                    this.player.attackCooldown = 20; // Кадры перезарядки
                    
                    // Эффект удара
                    this.hitEffect = {
                        x: e.x,
                        y: e.y,
                        timer: 10
                    };
                }
            }
        } else {
            // Дальний бой - пуля в направлении взгляда
            if (this.player.resources.iron > 0) {
                this.bullets.push({
                    x: this.player.x + 16,
                    y: this.player.y + 16,
                    dx: this.joystickDir.x * 8,
                    dy: this.joystickDir.y * 8,
                    damage: 15
                });
                this.player.resources.iron -= 1;
                this.player.attackCooldown = 15;
            }
        }
    }
    
    switchWeapon() {
        this.weaponType = this.weaponType === 'melee' ? 'ranged' : 'melee';
        // Покажем уведомление
        this.weaponMessage = this.weaponType === 'melee' ? '⚔️ РУКОПАШКА' : '🔫 ДАЛЬНИЙ БОЙ';
        this.weaponMessageTimer = 60;
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
        
        // Кулдаун атаки
        if (this.player.attackCooldown > 0) {
            this.player.attackCooldown--;
        }
        
        // Спавн врагов - РЕЖЕ
        if (Date.now() - this.lastEnemySpawn > this.enemySpawnInterval) {
            // Спавним меньше врагов за раз
            if (Math.random() < 0.3) { // 30% шанс спавна
                this.spawnEnemy();
            }
            this.lastEnemySpawn = Date.now();
            
            // Волны наступают медленнее
            if (this.enemies.length > this.wave * 2) {
                this.wave++;
            }
        }
        
        // Обновление пуль
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.dx;
            b.y += b.dy;
            
            // Проверка попаданий
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                const dist = Math.sqrt(Math.pow(b.x - e.x, 2) + Math.pow(b.y - e.y, 2));
                if (dist < 20) {
                    e.health -= b.damage;
                    this.bullets.splice(i, 1);
                    break;
                }
            }
            
            // Удаление пуль за границами
            if (b.x < -100 || b.x > 1000 || b.y < -100 || b.y > 1500) {
                this.bullets.splice(i, 1);
            }
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
            
            // Атака игрока
            if (dist < 30) {
                this.player.health -= 0.3; // Меньше урона
                if (this.player.health <= 0) {
                    this.gameOver = true;
                    document.getElementById('gameOverOverlay').classList.remove('hidden');
                }
            }
            
            // Смерть врага
            if (e.health <= 0) {
                this.enemies.splice(i, 1);
                this.kills++;
                // Шанс выпадения ресурса
                if (Math.random() < 0.3) {
                    this.player.resources.iron += 1;
                }
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
        
        // Враги слабее
        this.enemies.push({
            x: x, y: y,
            type: 'scout',
            health: 10 + this.wave * 2, // Меньше здоровья
            maxHealth: 10 + this.wave * 2,
            speed: 1.5 + this.wave * 0.1
        });
    }
    
    gatherResource() {
        if (this.player.energy < 10) return;
        
        const x = Math.floor(this.player.x / 32);
        const y = Math.floor(this.player.y / 32);
        
        if (x >= 0 && x < 20 && y >= 0 && y < 30) {
            const cell = this.map[y][x];
            if (cell.resource) {
                this.player.resources[cell.resource] += 2; // Больше ресурсов
                cell.resource = null;
                this.player.energy -= 5; // Меньше трат энергии
            }
        }
    }
    
    buildMiner() {
        if (this.player.resources.iron < 2) return; // Дешевле
        
        const x = Math.floor(this.player.x / 32);
        const y = Math.floor(this.player.y / 32);
        
        if (x >= 0 && x < 20 && y >= 0 && y < 30) {
            const cell = this.map[y][x];
            if (!cell.building) {
                cell.building = 'miner';
                this.player.resources.iron -= 2;
            }
        }
    }
    
    buildBase() {
        if (this.player.resources.iron < 3 || this.player.resources.silicon < 1) return; // Дешевле
        
        const x = Math.floor(this.player.x / 32);
        const y = Math.floor(this.player.y / 32);
        
        if (x >= 0 && x < 20 && y >= 0 && y < 30) {
            const cell = this.map[y][x];
            if (!cell.building) {
                cell.building = 'base';
                this.player.resources.iron -= 3;
                this.player.resources.silicon -= 1;
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
        alert('💾 Сохранено');
    }
    
    load() {
        const data = localStorage.getItem('mars1984_save');
        if (data) {
            const d = JSON.parse(data);
            this.player = d.player;
            this.map = d.map;
            this.wave = d.wave;
            this.kills = d.kills;
            alert('📂 Загружено');
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
            resources: { iron: 5, silicon: 2, rareMetal: 0 },
            attackCooldown: 0,
            attackDamage: 25
        };
        this.enemies = [];
        this.bullets = [];
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
        
        document.getElementById('statDay').textContent = this.wave;
        document.getElementById('statKills').textContent = this.kills;
        document.getElementById('statBuildings').textContent = this.buildings.length;
        document.getElementById('finalWave').textContent = this.wave;
        document.getElementById('finalKills').textContent = this.kills;
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
                    } else if (cell.resource === 'silicon') {
                        this.ctx.fillStyle = '#bd10e0';
                        this.ctx.fillRect(sx+8, sy+8, 16, 16);
                    } else if (cell.resource === 'rareMetal') {
                        this.ctx.fillStyle = '#f5a623';
                        this.ctx.fillRect(sx+10, sy+10, 12, 12);
                    }
                    
                    // Постройки
                    if (cell.building === 'miner') {
                        this.ctx.fillStyle = '#7ed321';
                        this.ctx.fillRect(sx+8, sy+8, 16, 16);
                        // Труба
                        this.ctx.fillStyle = '#4a4a4a';
                        this.ctx.fillRect(sx+14, sy+2, 4, 8);
                    } else if (cell.building === 'base') {
                        this.ctx.fillStyle = '#4a90e2';
                        this.ctx.fillRect(sx+4, sy+4, 24, 24);
                        // Купол
                        this.ctx.fillStyle = '#f5a623';
                        this.ctx.fillRect(sx+12, sy-2, 8, 6);
                    }
                    
                    // Сетка
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                    this.ctx.strokeRect(sx, sy, 32, 32);
                }
            }
        }
        
        // Пули
        this.ctx.fillStyle = '#ffff00';
        for (let b of this.bullets) {
            const sx = b.x - this.cameraX;
            const sy = b.y - this.cameraY;
            this.ctx.beginPath();
            this.ctx.arc(sx, sy, 4, 0, 2*Math.PI);
            this.ctx.fill();
        }
        
        // Враги
        for (let e of this.enemies) {
            const sx = e.x - this.cameraX;
            const sy = e.y - this.cameraY;
            if (sx > -32 && sx < 400 && sy > -32 && sy < 700) {
                // Тело
                this.ctx.fillStyle = '#ff4444';
                this.ctx.beginPath();
                this.ctx.arc(sx+16, sy+16, 12, 0, 2*Math.PI);
                this.ctx.fill();
                
                // Глаза
                this.ctx.fillStyle = '#000000';
                this.ctx.fillRect(sx+10, sy+12, 3, 3);
                this.ctx.fillRect(sx+18, sy+12, 3, 3);
                
                // Полоска здоровья
                const healthPercent = e.health / e.maxHealth;
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(sx, sy-5, 32 * healthPercent, 3);
            }
        }
        
        // Игрок
        const px = this.player.x - this.cameraX;
        const py = this.player.y - this.cameraY;
        
        // Тело
        this.ctx.fillStyle = '#4a90e2';
        this.ctx.fillRect(px+8, py+4, 16, 20);
        
        // Шлем
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(px+10, py, 12, 6);
        
        // Глаза
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(px+12, py+2, 2, 2);
        this.ctx.fillRect(px+18, py+2, 2, 2);
        
        // Оружие (в зависимости от типа)
        if (this.weaponType === 'melee') {
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillRect(px+24, py+12, 8, 4); // Меч
        } else {
            this.ctx.fillStyle = '#333333';
            this.ctx.fillRect(px+24, py+10, 10, 6); // Пистолет
        }
        
        // Полоски здоровья и энергии
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(px, py-10, 32 * (this.player.health/100), 4);
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(px, py-15, 32 * (this.player.energy/100), 3);
        
        // Индикатор кулдауна атаки
        if (this.player.attackCooldown > 0) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(px, py-20, 32 * (this.player.attackCooldown/20), 2);
        }
        
        // Сообщение о смене оружия
        if (this.weaponMessageTimer > 0) {
            this.weaponMessageTimer--;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(this.weaponMessage, 200, 100);
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

//
