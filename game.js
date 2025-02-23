const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');

// 设置画布大小
canvas.width = 800;
canvas.height = 600;

// 游戏状态
const gameState = {
    score: 0,
    coins: 0,
    isGameOver: false,
    isPaused: false,
    gravity: 0.3,
    gap: canvas.height * 0.35,
    obstacleWidth: 50,
    baseSpeed: 3,  // 基础速度
    speedMultiplier: 1,  // 速度倍数
    maxSpeedMultiplier: 2,  // 最大速度倍数
    isShopOpen: false,  // 添加商城开关状态
    showPauseMenu: false,  // 添加暂停菜单显示状态
    
    // 添加速度计算属性
    get obstacleSpeed() {
        return this.baseSpeed * this.speedMultiplier;
    }
};

// 小鸟对象
const bird = {
    x: canvas.width * 0.2,
    y: canvas.height * 0.5,
    radius: 20,
    velocity: 0,
    lift: -6,
    
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const skin = Shop.skins.find(s => s.id === Shop.selectedSkin);
        
        // 绘制身体
        ctx.fillStyle = skin.colors.body;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制眼睛
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(8, -8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(10, -8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制嘴巴
        ctx.fillStyle = skin.colors.beak;
        ctx.beginPath();
        ctx.moveTo(15, -2);
        ctx.lineTo(30, 0);
        ctx.lineTo(15, 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    },
    
    update() {
        if (!gameState.isPaused) {
            this.velocity += gameState.gravity;
            this.velocity = Math.min(Math.max(this.velocity, -8), 8);
            this.y += this.velocity;
            
            if (this.y > canvas.height - this.radius) {
                this.y = canvas.height - this.radius;
                gameState.isGameOver = true;
            }
            if (this.y < this.radius) {
                this.y = this.radius;
                this.velocity = 0;
            }
        }
    }
};

// 障碍物数组
let obstacles = [];

// 添加金币对象
const Coin = {
    radius: 12,
    rotationSpeed: 0.05,
    
    create(x, y) {
        return {
            x: x,
            y: y,
            rotation: 0,
            collected: false,
            
            draw() {
                if (this.collected) return;
                
                ctx.save();
                ctx.translate(this.x, this.y);
                this.rotation += Coin.rotationSpeed;
                ctx.rotate(this.rotation);
                
                // 绘制金币
                const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Coin.radius);
                gradient.addColorStop(0, '#FFD700');  // 金色中心
                gradient.addColorStop(1, '#DAA520');  // 金币边缘
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, Coin.radius, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加闪光效果
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(-4, -4, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加¥符号
                ctx.fillStyle = '#B8860B';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('¥', 0, 0);
                
                ctx.restore();
            },
            
            update() {
                if (this.collected) return;
                
                // 使用计算后的速度
                this.x -= gameState.obstacleSpeed;
                
                // 检测与小鸟的碰撞
                const dx = this.x - bird.x;
                const dy = this.y - bird.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < Coin.radius + bird.radius) {
                    this.collected = true;
                    gameState.coins++;
                    scoreDisplay.textContent = `得分: ${gameState.score} | 金币: ${gameState.coins}`;
                    createCoinEffect(this.x, this.y);
                }
            }
        };
    }
};

// 添加金币数组
let coins = [];

// 创建障碍物
function createObstacle() {
    const height = Math.random() * (canvas.height * 0.6);
    const obstacle = {
        x: canvas.width,
        height: height,
        width: gameState.obstacleWidth,
        passed: false,
        
        draw() {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(this.x, 0, this.width, this.height);
            ctx.fillRect(this.x, this.height + gameState.gap, this.width, canvas.height);
        }
    };
    
    // 在障碍物间隙中添加金币
    const gapCenter = height + gameState.gap / 2;
    const coinCount = Math.floor(Math.random() * 3) + 1;  // 1-3个金币
    
    for(let i = 0; i < coinCount; i++) {
        const coinX = obstacle.x + obstacle.width + 30 + i * 40;
        const coinY = gapCenter + Math.sin(i * Math.PI / 2) * 30;  // 波浪形排列
        coins.push(Coin.create(coinX, coinY));
    }
    
    return obstacle;
}

// 检测碰撞
function checkCollision(obstacle) {
    return (bird.x + bird.radius > obstacle.x && 
            bird.x - bird.radius < obstacle.x + obstacle.width && 
            (bird.y - bird.radius < obstacle.height || 
             bird.y + bird.radius > obstacle.height + gameState.gap));
}

// 添加商城系统
const Shop = {
    isOpen: false,
    selectedTab: 'skins',  // 'skins' 或 'items'
    
    skins: [
        {
            id: 'default',
            name: '默认小鸟',
            price: 0,
            colors: {
                body: '#FFD700',
                beak: '#FF6B6B'
            },
            owned: true
        },
        {
            id: 'blue',
            name: '蓝色小鸟',
            price: 50,
            colors: {
                body: '#4169E1',
                beak: '#FF6B6B'
            },
            owned: false
        },
        {
            id: 'red',
            name: '红色小鸟',
            price: 80,
            colors: {
                body: '#FF4444',
                beak: '#FFD700'
            },
            owned: false
        }
    ],
    
    selectedSkin: 'default',
    
    draw() {
        if (!this.isOpen) return;
        
        // 绘制半透明背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制商城标题
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('商城', canvas.width/2, 50);
        
        // 显示金币数量
        ctx.font = '24px Arial';
        ctx.fillText(`金币: ${gameState.coins}`, canvas.width/2, 90);
        
        // 绘制皮肤列表
        this.skins.forEach((skin, index) => {
            const x = canvas.width/2 - 200;
            const y = 150 + index * 100;
            
            // 绘制选项背景
            ctx.fillStyle = skin.owned ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)';
            if (this.selectedSkin === skin.id) {
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            }
            ctx.fillRect(x, y, 400, 80);
            
            // 绘制皮肤预览
            ctx.save();
            ctx.translate(x + 40, y + 40);
            ctx.fillStyle = skin.colors.body;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // 绘制皮肤信息
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.fillText(skin.name, x + 80, y + 35);
            if (!skin.owned) {
                ctx.fillText(`价格: ${skin.price} 金币`, x + 80, y + 65);
            } else {
                ctx.fillText('已拥有', x + 80, y + 65);
            }
            
            // 绘制购买/选择按钮
            if (!skin.owned) {
                ctx.fillStyle = gameState.coins >= skin.price ? '#4CAF50' : '#666666';
                ctx.fillRect(x + 280, y + 20, 100, 40);
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText('购买', x + 330, y + 45);
            } else if (this.selectedSkin !== skin.id) {
                ctx.fillStyle = '#2196F3';
                ctx.fillRect(x + 280, y + 20, 100, 40);
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText('选择', x + 330, y + 45);
            }
        });
        
        // 绘制关闭按钮
        ctx.fillStyle = '#FF5252';
        ctx.fillRect(canvas.width - 60, 20, 40, 40);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('×', canvas.width - 40, 45);
        
        // 添加操作提示
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('按ESC或右键点击退出商城', canvas.width/2, canvas.height - 30);
    },
    
    handleClick(x, y) {
        if (!this.isOpen) return;
        
        // 检查关闭按钮
        if (x > canvas.width - 60 && x < canvas.width - 20 && y > 20 && y < 60) {
            this.isOpen = false;
            gameState.isPaused = false;
            return;
        }
        
        // 检查皮肤选项
        this.skins.forEach((skin, index) => {
            const buttonX = canvas.width/2 - 200 + 280;
            const buttonY = 150 + index * 100 + 20;
            
            if (x > buttonX && x < buttonX + 100 && y > buttonY && y < buttonY + 40) {
                if (!skin.owned && gameState.coins >= skin.price) {
                    // 购买皮肤
                    skin.owned = true;
                    gameState.coins -= skin.price;
                    this.selectedSkin = skin.id;
                    scoreDisplay.textContent = `得分: ${gameState.score} | 金币: ${gameState.coins}`;
                } else if (skin.owned) {
                    // 选择皮肤
                    this.selectedSkin = skin.id;
                }
            }
        });
    }
};

// 添加商城按钮
function drawShopButton() {
    if (gameState.isGameOver) return;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(canvas.width - 100, 20, 80, 40);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('商城', canvas.width - 60, 45);
}

// 添加背景对象
const Background = {
    clouds: [],
    mountains: [],
    buildings: [],
    
    // 初始化背景元素
    init() {
        // 生成云朵
        for(let i = 0; i < 5; i++) {
            this.clouds.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height * 0.3,
                width: 80 + Math.random() * 60,
                speed: 0.2 + Math.random() * 0.3
            });
        }
        
        // 生成山脉
        for(let i = 0; i < 3; i++) {
            this.mountains.push({
                x: i * (canvas.width/2),
                height: 150 + Math.random() * 100
            });
        }
        
        // 生成建筑物
        let x = 0;
        while(x < canvas.width) {
            const height = 100 + Math.random() * 200;
            this.buildings.push({
                x: x,
                height: height,
                width: 40 + Math.random() * 30
            });
            x += 50 + Math.random() * 30;
        }
    },
    
    // 绘制背景
    draw() {
        // 绘制渐变天空
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');  // 天空蓝
        gradient.addColorStop(1, '#E0F6FF');  // 浅蓝色
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制云朵
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.clouds.forEach(cloud => {
            ctx.beginPath();
            ctx.arc(cloud.x, cloud.y, cloud.width/3, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.width/4, cloud.y - cloud.width/6, cloud.width/4, 0, Math.PI * 2);
            ctx.arc(cloud.x + cloud.width/2, cloud.y, cloud.width/3, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 绘制远处的山脉
        ctx.fillStyle = '#9CB6C5';
        this.mountains.forEach(mountain => {
            ctx.beginPath();
            ctx.moveTo(mountain.x, canvas.height - 100);
            ctx.lineTo(mountain.x + canvas.width/3, canvas.height - mountain.height);
            ctx.lineTo(mountain.x + canvas.width/1.5, canvas.height - 100);
            ctx.fill();
        });
        
        // 绘制建筑物
        this.buildings.forEach(building => {
            // 建筑物主体
            const gradient = ctx.createLinearGradient(building.x, 0, building.x + building.width, 0);
            gradient.addColorStop(0, '#2C3E50');
            gradient.addColorStop(1, '#34495E');
            ctx.fillStyle = gradient;
            ctx.fillRect(building.x, canvas.height - building.height, building.width, building.height);
            
            // 绘制窗户
            ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
            for(let y = canvas.height - building.height + 10; y < canvas.height - 10; y += 20) {
                for(let x = building.x + 5; x < building.x + building.width - 5; x += 15) {
                    if(Math.random() > 0.3) {  // 随机点亮窗户
                        ctx.fillRect(x, y, 10, 15);
                    }
                }
            }
        });
    },
    
    // 更新背景元素
    update() {
        // 移动云朵
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if(cloud.x + cloud.width < 0) {
                cloud.x = canvas.width;
                cloud.y = Math.random() * canvas.height * 0.3;
            }
        });
    }
};

// 添加金币收集特效
function createCoinEffect(x, y) {
    const particles = [];
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 1
        });
    }
    
    function updateParticles() {
        ctx.save();
        particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            if (p.life > 0) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 215, 0, ${p.life})`;
                ctx.fill();
            } else {
                particles.splice(index, 1);
            }
        });
        ctx.restore();
        
        if (particles.length > 0) {
            requestAnimationFrame(updateParticles);
        }
    }
    
    updateParticles();
}

// 添加暂停菜单绘制函数
function drawPauseMenu() {
    if (!gameState.showPauseMenu || Shop.isOpen || gameState.isGameOver) return;
    
    // 绘制半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制暂停菜单
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏暂停', canvas.width/2, canvas.height/2 - 50);
    
    // 绘制继续按钮
    ctx.fillStyle = '#4CAF50';
    const continueButtonY = canvas.height/2 + 20;
    ctx.fillRect(canvas.width/2 - 100, continueButtonY, 200, 50);
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.fillText('继续游戏', canvas.width/2, continueButtonY + 32);
    
    // 添加操作提示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '16px Arial';
    ctx.fillText('按空格键或P键暂停/继续游戏', canvas.width/2, canvas.height - 30);
}

// 添加暂停按钮绘制函数
function drawPauseButton() {
    if (gameState.isGameOver || Shop.isOpen) return;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(20, 20, 40, 40);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.showPauseMenu ? '▶' : '❚❚', 40, 45);
}

// 添加暂停功能处理
function togglePause() {
    if (!gameState.isGameOver && !Shop.isOpen) {
        gameState.showPauseMenu = !gameState.showPauseMenu;
        gameState.isPaused = gameState.showPauseMenu;
    }
}

// 添加速度控制按钮绘制函数
function drawSpeedButton() {
    if (gameState.isGameOver || Shop.isOpen || gameState.showPauseMenu) return;
    
    // 绘制速度按钮
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(70, 20, 60, 40);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameState.speedMultiplier}x`, 100, 45);
}

// 添加速度控制函数
function toggleSpeed() {
    if (gameState.speedMultiplier >= gameState.maxSpeedMultiplier) {
        gameState.speedMultiplier = 1;  // 重置为正常速度
    } else {
        gameState.speedMultiplier += 0.5;  // 增加0.5倍速
    }
}

// 游戏循环
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 更新和绘制背景
    Background.update();
    Background.draw();
    
    if (!gameState.isGameOver && !gameState.isPaused) {
        // 生成障碍物
        if (obstacles.length === 0 || 
            obstacles[obstacles.length - 1].x < canvas.width - 300) {
            obstacles.push(createObstacle());
        }
        
        // 更新和绘制障碍物
        obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
        obstacles.forEach(obstacle => {
            // 使用计算后的速度
            obstacle.x -= gameState.obstacleSpeed;
            obstacle.draw();
            
            if (!obstacle.passed && obstacle.x + obstacle.width < bird.x) {
                obstacle.passed = true;
                gameState.score++;
                scoreDisplay.textContent = `得分: ${gameState.score} | 金币: ${gameState.coins}`;
            }
            
            if (checkCollision(obstacle)) {
                gameState.isGameOver = true;
            }
        });
        
        // 更新和绘制金币
        coins = coins.filter(coin => coin.x + Coin.radius > 0);
        coins.forEach(coin => {
            coin.update();
            coin.draw();
        });
    }
    
    // 更新和绘制小鸟
    bird.update();
    bird.draw();
    
    // 绘制商城按钮和商城
    drawShopButton();
    Shop.draw();
    
    // 绘制暂停按钮和暂停菜单
    drawPauseButton();
    drawPauseMenu();
    
    // 绘制速度按钮
    // 游戏结束画面
    if (gameState.isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('游戏结束', canvas.width/2, canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText(`得分: ${gameState.score}`, canvas.width/2, canvas.height/2 + 50);
        ctx.fillText('点击重新开始', canvas.width/2, canvas.height/2 + 100);
    }
    
    requestAnimationFrame(gameLoop);
}

// 处理输入
function handleInput(event) {
    event.preventDefault();
    
    if (gameState.isGameOver) {
        gameState.isGameOver = false;
        gameState.score = 0;
        scoreDisplay.textContent = `得分: 0 | 金币: ${gameState.coins}`;
        bird.y = canvas.height/2;
        bird.velocity = 0;
        obstacles = [];
        coins = [];  // 重置金币
    } else if (!gameState.isPaused) {
        bird.velocity = bird.lift;
    }
}

// 修改事件监听器
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    
    // 检查暂停按钮点击
    if (x > 20 && x < 60 && y > 20 && y < 60 && !gameState.isGameOver && !Shop.isOpen) {
        togglePause();
        return;
    }
    
    // 检查继续按钮点击
    if (gameState.showPauseMenu) {
        const continueButtonY = canvas.height/2 + 20;
        if (x > canvas.width/2 - 100 && x < canvas.width/2 + 100 &&
            y > continueButtonY && y < continueButtonY + 50) {
            togglePause();
            return;
        }
    }
    
    // 检查商城按钮点击
    if (x > canvas.width - 100 && x < canvas.width - 20 && 
        y > 20 && y < 60 && !gameState.isGameOver) {
        Shop.isOpen = true;
        gameState.isPaused = true;
        return;
    }
    
    // 处理商城内的点击
    if (Shop.isOpen) {
        Shop.handleClick(x, y);
        return;
    }
    
    // 处理游戏点击
    handleInput(event);
});

// 添加鼠标右键和触摸事件来退出商城
canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault();  // 阻止默认右键菜单
    if (Shop.isOpen) {
        Shop.isOpen = false;
        gameState.isPaused = false;
    }
});

// 添加触摸事件
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (event) => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
});

canvas.addEventListener('touchend', (event) => {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;
    
    // 检测滑动手势
    const swipeDistance = Math.sqrt(
        Math.pow(touchEndX - touchStartX, 2) + 
        Math.pow(touchEndY - touchStartY, 2)
    );
    
    if (swipeDistance > 50 && Shop.isOpen) {  // 如果滑动距离超过50像素
        Shop.isOpen = false;
        gameState.isPaused = false;
    }
});

// 添加键盘事件
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && Shop.isOpen) {
        Shop.isOpen = false;
        gameState.isPaused = false;
    }
    if ((event.code === 'Space' || event.key === 'p' || event.key === 'P') && 
        !gameState.isGameOver && !Shop.isOpen) {
        togglePause();
    }
});

// 在游戏开始时初始化背景
Background.init();

// 开始游戏
gameLoop();