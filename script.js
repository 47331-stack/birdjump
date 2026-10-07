const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const uiOverlay = document.getElementById('uiOverlay');
const startBtn = document.getElementById('startButton');
const menuSubtitle = document.getElementById('menuSubtitle');

// Ajuste Dinâmico da Tela
let W = window.innerWidth;
let H = window.innerHeight;

function resizeCanvas() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Estados Globais do Jogo
let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER', 'VICTORY'
let score = 0;
let level = 1;
const maxLevels = 20;

// Partículas e Efeitos Visuais
let particles = [];
let feathers = [];

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        this.size = Math.random() * 6 + 3;
        this.color = color;
        this.alpha = 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.025;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Configuração do Pássaro
const bird = {
    x: 0,
    y: 0,
    width: 44,
    height: 32,
    gravity: 0.42,
    lift: -8.8,
    velocity: 0,
    rotation: 0,
    wingAngle: 0,
    wingSpeed: 0.15,

    init() {
        this.x = W * 0.25;
        this.y = H * 0.4;
        this.velocity = 0;
        this.rotation = 0;
    },

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // Rotação dinamicamente suave
        this.rotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 4, this.velocity * 0.07));
        ctx.rotate(this.rotation);

        // Animação da asa
        this.wingAngle += this.wingSpeed;
        const wingYOffset = Math.sin(this.wingAngle) * 5;

        // Sombra Projetada
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.beginPath();
        ctx.ellipse(2, 16, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo Amarelo (Estilo Cartoon)
        ctx.fillStyle = '#fbc531';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // Barriguinha Clarinha
        ctx.fillStyle = '#fef5d1';
        ctx.beginPath();
        ctx.ellipse(-6, 6, 12, 8, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Asa
        ctx.fillStyle = '#e1b12c';
        ctx.beginPath();
        ctx.ellipse(-8, wingYOffset, 10, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Olhos Grandes Expressivos
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(10, -5, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupila
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(12, -5, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Brilho do Olho
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(13.5, -6.5, 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Bico Vermelho Grande Cartoonesco
        ctx.fillStyle = '#e84118';
        ctx.beginPath();
        ctx.ellipse(14, 6, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Linha da Boca
        ctx.beginPath();
        ctx.moveTo(8, 6);
        ctx.lineTo(26, 6);
        ctx.stroke();

        ctx.restore();
    },

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Partículas na cauda ao voar
        if (gameState === 'PLAYING' && Math.random() < 0.4) {
            particles.push(new Particle(this.x, this.y + this.height / 2, '#fbc531'));
        }

        // Colisão Chão (com margem para o terreno da grama)
        const groundHeight = 70;
        if (this.y + this.height >= H - groundHeight) {
            this.y = H - groundHeight - this.height;
            gameOver();
        }

        // Teto
        if (this.y <= 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },

    jump() {
        this.velocity = this.lift;
        // Solta penas e partículas ao pular
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(this.x, this.y + this.height, '#ffffff'));
        }
    }
};

// Tubos
let pipes = [];
const pipeWidth = 72;
let pipeGap = 160;
let pipeSpeed = 3.6; // Velocidade inicial ligeiramente aumentada
let spawnTimer = 0;

function createPipe() {
    const groundHeight = 70;
    const minHeight = 80;
    const maxHeight = H - groundHeight - pipeGap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    pipes.push({
        x: W,
        top: topHeight,
        bottom: H - groundHeight - (topHeight + pipeGap),
        passed: false
    });
}

// Fundo em Camadas Parallax
let skyOffset = 0;
let cityOffset = 0;

function drawBackground() {
    // 1. Céu com Degradê Suave
    const skyGradient = ctx.createLinearGradient(0, 0, 0, H);
    skyGradient.addColorStop(0, '#74b9ff');
    skyGradient.addColorStop(0.7, '#a1e0ff');
    skyGradient.addColorStop(1, '#dfe6e9');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, W, H);

    // 2. Raios Solares ao Fundo
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    const centerX = W / 2;
    for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.arc(centerX, 0, Math.max(W, H) * 1.5, (i * Math.PI) / 6, ((i + 0.5) * Math.PI) / 6);
        ctx.fill();
    }

    // 3. Silhuetas de Monumentos/Cidades ao Fundo (Parallax Leve)
    cityOffset = (cityOffset + (gameState === 'PLAYING' ? pipeSpeed * 0.2 : 0.5)) % 400;
    ctx.fillStyle = '#81ecec';
    
    for (let x = -cityOffset; x < W + 400; x += 350) {
        // Silhueta Torre/Prédios
        ctx.fillRect(x + 20, H - 220, 35, 150);
        ctx.fillRect(x + 90, H - 270, 50, 200);
        ctx.fillRect(x + 180, H - 200, 40, 130);
        ctx.fillRect(x + 250, H - 240, 45, 170);

        // Nuvens
        ctx.beginPath();
        ctx.arc(x + 50, H - 230, 40, 0, Math.PI * 2);
        ctx.arc(x + 110, H - 280, 50, 0, Math.PI * 2);
        ctx.arc(x + 210, H - 220, 45, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. Terreno e Grama Frontal
    const groundHeight = 70;
    // Chão Base
    ctx.fillStyle = '#2ed573';
    ctx.fillRect(0, H - groundHeight, W, groundHeight);

    // Borda Escura Superior da Grama
    ctx.fillStyle = '#26af5f';
    ctx.fillRect(0, H - groundHeight, W, 12);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, H - groundHeight, W, 3);
}

// Desenhar Tubos Cartoonescos
function drawPipes() {
    pipes.forEach(pipe => {
        const groundHeight = 70;

        // --- Tubo Superior ---
        const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
        topGrad.addColorStop(0, '#2ed573');
        topGrad.addColorStop(0.5, '#55efc4');
        topGrad.addColorStop(1, '#26af5f');

        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#000';
        ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.top);

        // Borda/Aba do Tubo Superior
        ctx.fillRect(pipe.x - 6, pipe.top - 26, pipeWidth + 12, 26);
        ctx.strokeRect(pipe.x - 6, pipe.top - 26, pipeWidth + 12, 26);

        // --- Tubo Inferior ---
        const bottomY = H - groundHeight - pipe.bottom;
        const botGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
        botGrad.addColorStop(0, '#2ed573');
        botGrad.addColorStop(0.5, '#55efc4');
        botGrad.addColorStop(1, '#26af5f');

        ctx.fillStyle = botGrad;
        ctx.fillRect(pipe.x, bottomY, pipeWidth, pipe.bottom);
        ctx.strokeRect(pipe.x, bottomY, pipeWidth, pipe.bottom);

        // Borda/Aba do Tubo Inferior
        ctx.fillRect(pipe.x - 6, bottomY, pipeWidth + 12, 26);
        ctx.strokeRect(pipe.x - 6, bottomY, pipeWidth + 12, 26);
    });
}

// Atualizar Tubos e Regra de Pontuação/Níveis
function updatePipes() {
    spawnTimer++;
    // Frequência de tubos diminui com a velocidade para manter distância justa
    const spawnInterval = Math.max(55, Math.floor(100 - (level * 1.8)));

    if (spawnTimer > spawnInterval) {
        createPipe();
        spawnTimer = 0;
    }

    pipes.forEach((pipe, index) => {
        pipe.x -= pipeSpeed;

        // Teste de Colisão
        const birdRight = bird.x + bird.width;
        const birdBottom = bird.y + bird.height;
        const pipeRight = pipe.x + pipeWidth;
        const groundHeight = 70;
        const bottomY = H - groundHeight - pipe.bottom;

        if (birdRight > pipe.x - 4 && bird.x < pipeRight + 4) {
            if (bird.y < pipe.top || birdBottom > bottomY) {
                gameOver();
            }
        }

        // Passou de fase
        if (pipe.x + pipeWidth < bird.x && !pipe.passed) {
            pipe.passed = true;
            score++;

            // Progressão de Nível
            if (score <= maxLevels) {
                level = score;
                pipeSpeed = 3.6 + (level * 0.35); // Aumento gradual de velocidade
            }

            if (score >= maxLevels) {
                victory();
            }
        }

        // Remover tubos que saíram da tela
        if (pipe.x + pipeWidth + 20 < 0) {
            pipes.splice(index, 1);
        }
    });
}

// Desenhar Texto Estilo Cartoon com Contorno
function drawCartoonText(text, x, y, size = 32, fillColor = '#fbc531', strokeColor = '#000000') {
    ctx.save();
    ctx.font = `800 ${size}px 'Fredoka', 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillText(text, x + 4, y + 5);

    // Contorno Grosso
    ctx.lineWidth = Math.max(6, size / 5);
    ctx.strokeStyle = strokeColor;
    ctx.strokeText(text, x, y);

    // Preenchimento
    ctx.fillStyle = fillColor;
    ctx.fillText(text, x, y);
    ctx.restore();
}

// Exibir HUD com Estilo Cartoonesco
function drawHUD() {
    if (gameState === 'PLAYING') {
        // Exibir Nível e Pontuação na parte superior
        drawCartoonText(`NÍVEL ${level} / ${maxLevels}`, W / 2, 50, 36, '#fbc531');
        drawCartoonText(`PONTOS: ${score}`, W / 2, 95, 26, '#ffffff');
    }
}

// Loop Principal do Jogo
function gameLoop() {
    ctx.clearRect(0, 0, W, H);

    drawBackground();

    // Atualização de Partículas
    particles.forEach((p, idx) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(idx, 1);
    });

    if (gameState === 'PLAYING') {
        bird.update();
        bird.draw();
        updatePipes();
        drawPipes();
        drawHUD();
    } else if (gameState === 'GAMEOVER') {
        drawPipes();
        bird.draw();
        drawHUD();
        drawCartoonText('FIM DE JOGO', W / 2, H * 0.35, 54, '#e84118');
        drawCartoonText(`Você chegou ao Nível ${level}`, W / 2, H * 0.45, 28, '#ffffff');
    } else if (gameState === 'VICTORY') {
        drawPipes();
        bird.draw();
        drawCartoonText('VOCÊ VENCEU!', W / 2, H * 0.35, 56, '#4cd137');
        drawCartoonText(`Completou todos os ${maxLevels} Níveis!`, W / 2, H * 0.45, 28, '#ffffff');
    } else {
        // Estado Início (START)
        bird.init();
        bird.draw();
    }

    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState = 'GAMEOVER';
    menuSubtitle.innerText = `Você fez ${score} pontos!`;
    startBtn.innerText = 'TENTAR NOVAMENTE';
    uiOverlay.classList.remove('hidden');
}

function victory() {
    gameState = 'VICTORY';
    menuSubtitle.innerText = 'Parabéns! Você dominou o jogo!';
    startBtn.innerText = 'JOGAR NOVAMENTE';
    uiOverlay.classList.remove('hidden');
}

function resetGame() {
    bird.init();
    pipes = [];
    score = 0;
    level = 1;
    pipeSpeed = 3.6;
    spawnTimer = 0;
    particles = [];
    gameState = 'PLAYING';
    uiOverlay.classList.add('hidden');
}

// Eventos de Ação e Pulo
function handleJump() {
    if (gameState === 'PLAYING') {
        bird.jump();
    }
}

startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetGame();
});

// Pulo via Espaço
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
    }
});

// Pulo via Clique / Toque
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handleJump();
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleJump();
}, { passive: false });

// Iniciar Loop
gameLoop();