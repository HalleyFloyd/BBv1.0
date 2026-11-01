const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const mapWidth = 3000, mapHeight = 3000;

// Estados del Juego y Puntuaciones
let gameState = 'menu';
let score = 0;
let selectedChar = 'walter';
let selectedCompanion = null;
let isSelectingCompanion = false;
let showPlayerStatsPanel = false;

const companion = {
    active: false, alive: false, char: null, x: 0, y: 0, 
    width: 32, height: 32, scale: 2, state: 'idle', 
    frameX: 0, frameTimer: 0, animationSpeed: 10, hitTimer: 0, 
    maxHp: 80, hp: 80, physDmg: 3, magicDmg: 0, fireCooldown: 0,
    // Nuevas variables para el patrullaje:
    patrolAngle: 0, patrolTimer: 0
};
let highScores = JSON.parse(localStorage.getItem('mrWhiteScores')) || [];
let totalPoints = parseInt(localStorage.getItem('zombieTotalPoints')) || 0;
let unlockedSkills = JSON.parse(localStorage.getItem('zombieGrowing')) || { consecuencias: false, quimica: false, calidad: false, escudo: false, compañero: false };
let equippedSkills = JSON.parse(localStorage.getItem('zombieEquipped')) || { consecuencias: false, quimica: false, calidad: false, escudo: false, compañero: false };
// --- VARIABLES DE KING CRIMSON ---
let kcCooldown = 0;
let kcGhosts = [];
let isTimeStopped = false;      
let timeStopDuration = 0;       
let timeStopCooldown = 0;       
let isHoldingTheWorld = false;
let worldFlashTimer = 0;
let worldFlashMax = 30;      
let worldWaves = [];
// --- EFECTOS DE SONIDO DE THE WORLD ---
const soundTheWorld1 = new Audio('THEWORLDSoundeffect1.mp3');
const soundTheWorld2 = new Audio('THEWORLDSoundeffect2.mp3');         
soundTheWorld2.playbackRate = 1.75;
// --- ESTADÍSTICAS BASE DEL JUGADOR ---
const player = {
    x: mapWidth / 2, y: mapHeight / 2, width: 32, height: 32, scale: 2,
    state: 'idle', frameX: 0, frameTimer: 0, animationSpeed: 10, hitTimer: 0,
    maxHp: 100, hp: 100, physRes: 25, magicRes: 25, physDmg: 10, magicDmg: 0,
    speed: 1.7, atkSpeed: 1.0, lifesteal: 0.5, sustain: 0.5, armorPenPct: 0, lethality: 0,
    magicPenPct: 0, magicPenFlat: 0, healPower: 0, projectiles: 1, spread: 0.5,
    knockback: 0, piercing: 0,
    shield: 0, arrepentimientoStacks: 0, arrepentimientoTimer: 0, killCount: 0, ownedUpgrades: [], algoMasDebuff: 0
};

// --- CATÁLOGO DE LOS 100 AUMENTOS ---
const poolUpgrades = [
    // 💠 PLATINO (5%)
    { name: "Pureza del 99.1%", rarity: "platinum", desc: "TODAS las estadísticas base aumentan un 30%.", apply: () => { player.maxHp *= 1.3; player.hp = Math.min(player.maxHp, player.hp * 1.3); player.physDmg *= 1.3; player.magicDmg *= 1.3; player.physRes *= 1.3; player.magicRes *= 1.3; player.speed *= 1.3; player.atkSpeed *= 1.3; } },
    { name: "Ira de Gus", rarity: "platinum", desc: "+25% Succión, +25% Robo de Vida.", apply: () => { player.sustain += 25; player.lifesteal += 25; } },
    { name: "Todo por la biografia", rarity: "platinum", desc: "Disparas +4 Proyectiles, +3 Empuje. Vel. Mov. bloqueada en 1.7.", apply: () => { player.projectiles += 4; player.knockback += 3; player.speed = 1.7; } },
    { name: "Yo soy el Peligro", rarity: "platinum", desc: "+3 Perforación, +30 Letalidad. Vida Máxima a la mitad.", apply: () => { player.piercing += 3; player.lethality += 30; player.maxHp = Math.floor(player.maxHp / 2); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Desmadrenberg", rarity: "platinum", desc: "+20% tamaño, +2.0 Vel. Ataque, +20 Daño.", apply: () => { player.scale *= 1.2; player.atkSpeed += 2.0; player.physDmg += 20; } },

    // 🥇 ORO (15%)
    { name: "Say My Name", rarity: "gold", desc: "+40 Daño Físico, +20% Pen. Armadura. -20 Resistencias.", apply: () => { player.physDmg += 40; player.armorPenPct += 20; player.physRes -= 20; player.magicRes -= 20; } },
    { name: "Desmadre de Tuco", rarity: "gold", desc: "+10 Poder Mágico. +20% tamaño.", apply: () => { player.magicDmg += 10; player.scale *= 1.2; } },
    { name: "Ricina", rarity: "gold", desc: "+20 Letalidad, +20 Perforación Mágica. -30 Vida Base.", apply: () => { player.lethality += 20; player.magicPenFlat += 20; player.maxHp = Math.max(20, player.maxHp - 30); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Escopeta de Mike", rarity: "gold", desc: "+2 Proyectiles, +2 Empuje. -0.5 Vel. Ataque.", apply: () => { player.projectiles += 2; player.knockback += 2; player.atkSpeed = Math.max(0.4, player.atkSpeed - 0.5); } },
    { name: "Metástasis", rarity: "gold", desc: "+120 Vida, +30 Resistencias. +30% tamaño, -1.0 Vel. Ataque.", apply: () => { player.maxHp += 120; player.hp += 120; player.physRes += 30; player.magicRes += 30; player.scale *= 1.3; player.atkSpeed = Math.max(0.4, player.atkSpeed - 1.0); } },
    { name: "Fuga a Nuevo México", rarity: "gold", desc: "-30% tamaño, +1.0 Vel. Mov. +8% Daño total.", apply: () => { player.scale *= 0.7; player.speed += 1.0; player.physDmg *= 1.08; player.magicDmg *= 1.08; } },
    { name: "Abogado Intocable", rarity: "gold", desc: "+5% Poder de Curaciones, +10% Robo de Vida. -0.3 Vel. Mov.", apply: () => { player.healPower += 5; player.lifesteal += 10; player.speed = Math.max(0.5, player.speed - 0.3); } },
    { name: "Cristal Puro", rarity: "gold", desc: "+20 Poder Mágico, +10% Penetración Mágica. -15 Res. Mágica.", apply: () => { player.magicDmg += 20; player.magicPenPct += 10; player.magicRes -= 15; } },
    { name: "Balas Blindadas", rarity: "gold", desc: "+1 Perforación. -10 Daño Físico.", apply: () => { player.piercing += 1; player.physDmg = Math.max(1, player.physDmg - 10); } },
    { name: "Dosis Letal", rarity: "gold", desc: "+7% Robo de Vida, +3% Succión. -25 de vida.", apply: () => { player.lifesteal += 7; player.sustain += 3; player.maxHp = Math.max(20, player.maxHp - 25); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "(Ding Ding)", rarity: "gold", desc: "+1.0 Vel. Ataque. -0.7 Vel. Mov.", apply: () => { player.atkSpeed += 1.0; player.speed = Math.max(0.5, player.speed - 0.7); } },
    { name: "Lavado de Dinero", rarity: "gold", desc: "+15 Letalidad, +15 Perf. Mágica, +50 Vida. -10% Robo/Succión.", apply: () => { player.lethality += 15; player.magicPenFlat += 15; player.maxHp += 50; player.hp += 50; player.lifesteal -= 10; player.sustain -= 10; } },
    { name: "Pacto con el Diablo", rarity: "gold", desc: "-5% Succión, +25 de vida.", apply: () => { player.sustain -= 5; player.maxHp += 25; player.hp += 25; } },
    { name: "Defensa de Hierro", rarity: "gold", desc: "+2 de Empuje. -10 Daño.", apply: () => { player.knockback += 2; player.physDmg = Math.max(1, player.physDmg - 10); } },
    { name: "Dosis Mezcladas", rarity: "gold", desc: "+10 Daño, +10 poder magico. -40 Vida.", apply: () => { player.physDmg += 10; player.magicDmg += 10; player.maxHp = Math.max(20, player.maxHp - 40); player.hp = Math.min(player.hp, player.maxHp); } },

    // 🥈 PLATA (25%)
    { name: "Desayuno de Walter Jr", rarity: "silver", desc: "+40 Vida, +5% Curaciones. +10% tamaño.", apply: () => { player.maxHp += 40; player.hp += 40; player.healPower += 5; player.scale *= 1.1; } },
    { name: "Chaleco Kevlar", rarity: "silver", desc: "+20 Resistencia Física. -0.5 Vel. Mov.", apply: () => { player.physRes += 20; player.speed = Math.max(0.5, player.speed - 0.5); } },
    { name: "Traje Hazmat Pesado", rarity: "silver", desc: "+20 Resistencia Mágica. -0.5 Vel. Mov.", apply: () => { player.magicRes += 20; player.speed = Math.max(0.5, player.speed - 0.5); } },
    { name: "Munición Punta Hueca", rarity: "silver", desc: "+15% Penetración Armadura. -5 Poder Mágico.", apply: () => { player.armorPenPct += 15; player.magicDmg = Math.max(0, player.magicDmg - 5); } },
    { name: "Ácido Concentrado", rarity: "silver", desc: "+15% Penetración Mágica. -5 Daño Físico.", apply: () => { player.magicPenPct += 15; player.physDmg = Math.max(1, player.physDmg - 5); } },
    { name: "Sed de Supervivencia", rarity: "silver", desc: "+5% Robo de Vida. -15 Vida Base.", apply: () => { player.lifesteal += 5; player.maxHp = Math.max(20, player.maxHp - 15); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Negocio Rentable", rarity: "silver", desc: "+5% Succión. +15 Daño Mágico.", apply: () => { player.sustain += 5; player.magicDmg = Math.max(0, player.magicDmg + 15); } },
    { name: "Metilamina Robada", rarity: "silver", desc: "+0.8 Vel. Mov. -15 Vida.", apply: () => { player.speed += 0.8; player.maxHp = Math.max(20, player.maxHp - 15); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Balas Pesadas", rarity: "silver", desc: "+1 de Empuje, +10 Daño. -0.3 Vel. Ataque.", apply: () => { player.knockback += 1; player.physDmg += 10; player.atkSpeed = Math.max(0.4, player.atkSpeed - 0.3); } },
    { name: "Láser Químico", rarity: "silver", desc: "+12 Poder Mágico, +5 Perf. Mágica. -5 Res. Mágica.", apply: () => { player.magicDmg += 12; player.magicPenFlat += 5; player.magicRes -= 5; } },
    { name: "Paranoia de Hank", rarity: "silver", desc: "-0.3 Vel. Mov, +20 Letalidad. +15 Vida.", apply: () => { player.speed = Math.max(0.5, player.speed - 0.3); player.lethality += 20; player.maxHp = Math.max(20, player.maxHp + 15); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Zapatos de Bolos", rarity: "silver", desc: "-10% de tamaño, +0.5 Vel. Movimiento.", apply: () => { player.scale *= 0.9; player.speed += 0.5; } },
    { name: "Tequila Envenenado", rarity: "silver", desc: "+10% Poder de Curaciones, +3% Succión. -0.2 Vel. Mov.", apply: () => { player.healPower += 10; player.sustain += 3; player.speed = Math.max(0.5, player.speed - 0.2); } },
    { name: "Caravana Blindada", rarity: "silver", desc: "+30 Vida Base, +10 Resistencias. +10% tamaño.", apply: () => { player.maxHp += 30; player.hp += 30; player.physRes += 10; player.magicRes += 10; player.scale *= 1.1; } },
    { name: "Gatillo Modificado", rarity: "silver", desc: "+0.8 Vel. Ataque. -10 Daño Físico.", apply: () => { player.atkSpeed += 0.8; player.physDmg = Math.max(1, player.physDmg - 5); } },
    { name: "Jeringa Usada", rarity: "silver", desc: "+5% Robo de Vida, +0.5 Vel. Ataque, +10 Poder Mágico, -10 Vida.", apply: () => { player.lifesteal += 5; player.atkSpeed += 0.5; player.magicDmg += 10; player.maxHp = Math.max(20, player.maxHp - 10); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Bolsa con Billetes", rarity: "silver", desc: "+10 Letalidad. -0.1 Vel. Movimiento.", apply: () => { player.lethality += 10; player.speed = Math.max(0.5, player.speed - 0.1); } },
    { name: "Bomba Casera", rarity: "silver", desc: "+1 Proyectil. +0.5 Vel. Ataque.", apply: () => { player.projectiles += 1; player.atkSpeed = Math.max(0.4, player.atkSpeed + 0.5); } },
    { name: "Ojo por Ojo", rarity: "silver", desc: "+15 Daño, +15 magia, +2% Succión. -15 Vida.", apply: () => { player.physDmg += 15; player.magicDmg += 15; player.sustain += 2; player.maxHp = Math.max(20, player.maxHp - 15); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Tiro a Quemarropa", rarity: "silver", desc: "+15 Daño Físico. -0.2 Vel. Movimiento.", apply: () => { player.physDmg += 15; player.speed = Math.max(0.5, player.speed - 0.2); } },
    { name: "Sombrero de Pork-Pie", rarity: "silver", desc: "+10 Letalidad, +5 Vida. -5 Poder Mágico.", apply: () => { player.lethality += 10; player.maxHp += 5; player.hp += 5; player.magicDmg = Math.max(0, player.magicDmg - 5); } },
    { name: "Filtro de Gas", rarity: "silver", desc: "+15 Res. Mágica, +2% Curaciones. -5 Daño Físico.", apply: () => { player.magicRes += 15; player.healPower += 2; player.physDmg = Math.max(1, player.physDmg - 5); } },
    { name: "Cristal Rosa", rarity: "silver", desc: "+15 Poder Mágico, +2% Succión. -15 Res. Física.", apply: () => { player.magicDmg += 15; player.sustain += 2; player.physRes -= 15; } },
    { name: "Bate de Béisbol", rarity: "silver", desc: "+2 de Empuje, +5 Daño. -0.5 Vel. Ataque.", apply: () => { player.knockback += 2; player.physDmg += 5; player.atkSpeed = Math.max(0.4, player.atkSpeed - 0.5); } },
    { name: "Cinta de Aislar", rarity: "silver", desc: "+20 Vida, +3% Curaciones. -10 Letalidad.", apply: () => { player.maxHp += 20; player.hp += 20; player.healPower += 3; player.lethality = Math.max(0, player.lethality - 10); } },

    // 🥉 BRONCE (55%)
    { name: "Gota de Sangre", rarity: "bronze", desc: "+2% Robo de Vida, +5% tamaño.", apply: () => { player.lifesteal += 2; player.scale *= 1.05; } },
    { name: "Tubo de Ensayo Roto", rarity: "bronze", desc: "+2% Succión, +10 Resistencias, +10 Poder Mágico.", apply: () => { player.sustain += 2; player.physRes += 10; player.magicRes += 10; player.magicDmg += 10; } },
    { name: "Curita Usada", rarity: "bronze", desc: "+4% Robo de Vida, -15 de Vida.", apply: () => { player.lifesteal += 4; player.maxHp = Math.max(20, player.maxHp - 15); player.hp = Math.min(player.hp, player.maxHp); } },
    { name: "Bolsa de Suero", rarity: "bronze", desc: "+5% Poder de Curaciones.", apply: () => { player.healPower += 5; } },
    { name: "Paracetamol", rarity: "bronze", desc: "+25 Vida, +2% Poder de Curaciones.", apply: () => { player.maxHp += 25; player.hp += 25; player.healPower += 2; } },
    { name: "Sándwich sin Bordes", rarity: "bronze", desc: "+25 Vida, +1% Succión.", apply: () => { player.maxHp += 25; player.hp += 25; player.sustain += 1; } },
    { name: "Algodón Quirúrgico", rarity: "bronze", desc: "-1% Robo de Vida, +4% Curaciones, +10 Poder Mágico.", apply: () => { player.lifesteal -= 1; player.healPower += 4; player.magicDmg += 10; } },
    { name: "Píldora Azul", rarity: "bronze", desc: "+10 Poder Mágico, +1% Succión.", apply: () => { player.magicDmg += 10; player.sustain += 1; } },
    { name: "Venda Táctica", rarity: "bronze", desc: "+15 Res. Física, +1% Robo de Vida.", apply: () => { player.physRes += 15; player.lifesteal += 1; } },
    { name: "Refresco de Cola", rarity: "bronze", desc: "+25 Vida, +1% Robo de Vida.", apply: () => { player.maxHp += 25; player.hp += 25; player.lifesteal += 1; } },
    { name: "Fórmula Pura", rarity: "bronze", desc: "+8 Daño Físico.", apply: () => { player.physDmg += 8; } },
    { name: "Pistola Limpia", rarity: "bronze", desc: "+5 Daño Físico, +5 Letalidad.", apply: () => { player.physDmg += 5; player.lethality += 5; } },
    { name: "Gafas de Sol", rarity: "bronze", desc: "+6 Letalidad.", apply: () => { player.lethality += 6; } },
    { name: "Munición 9mm", rarity: "bronze", desc: "+5% Penetración Armadura.", apply: () => { player.armorPenPct += 5; } },
    { name: "Gatillo Engrasado", rarity: "bronze", desc: "+0.5 Vel. Ataque.", apply: () => { player.atkSpeed += 0.5; } },
    { name: "Café de Gale", rarity: "bronze", desc: "+0.5 Vel. Ataque, +25 Vida.", apply: () => { player.atkSpeed += 0.5; player.maxHp += 25; player.hp += 25; } },
    { name: "Culata Reforzada", rarity: "bronze", desc: "+1 de empuje, +8 Daño.", apply: () => { player.knockback += 1; player.physDmg += 8; } },
    { name: "Bala Pulida", rarity: "bronze", desc: "+8 Daño, +2% Penetración Armadura.", apply: () => { player.physDmg += 8; player.armorPenPct += 2; } },
    { name: "Mira Láser", rarity: "bronze", desc: "+5 Letalidad, +0.5 Vel. Ataque.", apply: () => { player.lethality += 5; player.atkSpeed += 0.5; } },
    { name: "Cargador Extendido", rarity: "bronze", desc: "+0.6 Vel. Ataque, +5 Poder Mágico.", apply: () => { player.atkSpeed += 0.6; player.magicDmg += 5; } },
    { name: "Vaso de Precipitados", rarity: "bronze", desc: "+14 Poder Mágico.", apply: () => { player.magicDmg += 14; } },
    { name: "Fósforos Largos", rarity: "bronze", desc: "+8 Perforación Mágica.", apply: () => { player.magicPenFlat += 8; } },
    { name: "Ácido Diluido", rarity: "bronze", desc: "+7% Penetración Mágica.", apply: () => { player.magicPenPct += 7; } },
    { name: "Guantes de Goma", rarity: "bronze", desc: "+9 Poder Mágico, +2 Perforación Mágica.", apply: () => { player.magicDmg += 9; player.magicPenFlat += 2; } },
    { name: "Polvo Azul", rarity: "bronze", desc: "+13 Poder Mágico, +1% Succión.", apply: () => { player.magicDmg += 13; player.sustain += 1; } },
    { name: "Batería de Limón", rarity: "bronze", desc: "+12 Poder Mágico, +0.2 Vel. Ataque.", apply: () => { player.magicDmg += 12; player.atkSpeed += 0.2; } },
    { name: "Cuentagotas", rarity: "bronze", desc: "+5 Perforación Mágica, +4% Pen. Mágica.", apply: () => { player.magicPenFlat += 5; player.magicPenPct += 4; } },
    { name: "Mascarilla Básica", rarity: "bronze", desc: "+10 Poder Mágico, +10 Resistencia Mágica.", apply: () => { player.magicDmg += 10; player.magicRes += 10; } },
    { name: "Bata de Laboratorio", rarity: "bronze", desc: "+15 Poder Mágico.", apply: () => { player.magicDmg += 15; } },
    { name: "Cristal Opaco", rarity: "bronze", desc: "+10 Poder Mágico, +15 de Vida.", apply: () => { player.magicDmg += 10; player.maxHp += 15; player.hp += 15; } },
    { name: "Cinta Adhesiva Gris", rarity: "bronze", desc: "+15 de Vida.", apply: () => { player.maxHp += 15; player.hp += 15; } },
    { name: "Sudaderas Holgadas", rarity: "bronze", desc: "+15 Resistencia Física, +0.3 Vel. Movimiento.", apply: () => { player.physRes += 15; player.speed += 0.3; } },
    { name: "Guantes de Nitrilo", rarity: "bronze", desc: "+15 Resistencia Mágica, +35 Vida.", apply: () => { player.magicRes += 15; player.maxHp += 35; player.hp += 35; } },
    { name: "Pantalones Caqui", rarity: "bronze", desc: "+10 Res. Física, +10 Res. Mágica.", apply: () => { player.physRes += 10; player.magicRes += 10; } },
    { name: "Casco de Bici", rarity: "bronze", desc: "+15 Resistencia Física.", apply: () => { player.physRes += 15; } },
    { name: "Manta Térmica", rarity: "bronze", desc: "+15 Resistencia Mágica.", apply: () => { player.magicRes += 15; } },
    { name: "Botiquín de Coche", rarity: "bronze", desc: "+30 Vida Base.", apply: () => { player.maxHp += 30; player.hp += 30; } },
    { name: "Espinilleras", rarity: "bronze", desc: "+15 Resistencia Física, +15 Vida.", apply: () => { player.physRes += 15; player.maxHp += 15; player.hp += 15; } },
    { name: "Gafas de Seguridad", rarity: "bronze", desc: "+15 Resistencia Mágica, +15 Vida.", apply: () => { player.magicRes += 15; player.maxHp += 15; player.hp += 15; } },
    { name: "Placa de Metal", rarity: "bronze", desc: "+15 Resistencia Física, -0.1 Vel. Mov.", apply: () => { player.physRes += 15; player.speed = Math.max(0.5, player.speed - 0.1); } },
    { name: "Abrigo Grueso", rarity: "bronze", desc: "+25 Resistencia Mágica y Física. -0.1 Vel. Mov.", apply: () => { player.physRes += 25; player.magicRes += 25; player.speed = Math.max(0.5, player.speed - 0.1); } },
    { name: "Litlle Pollitos", rarity: "bronze", desc: "+55 Vida, -10% tamaño.", apply: () => { player.maxHp += 55; player.hp += 55; player.scale *= 0.95; } },
    { name: "Bebida Energética", rarity: "bronze", desc: "+25 Vida, +0.2 Vel. Mov.", apply: () => { player.maxHp += 25; player.hp += 25; player.speed += 0.2; } },
    { name: "Cinturón de Cuero", rarity: "bronze", desc: "+15 Res. Física, +0.3 Vel. Ataque.", apply: () => { player.physRes += 15; player.atkSpeed += 0.3; } },
    { name: "Botas de Trabajo", rarity: "bronze", desc: "+10 Res. Física, +1 de Empuje.", apply: () => { player.physRes += 10; player.knockback += 1; } },
    { name: "Zapatos Cómodos", rarity: "bronze", desc: "+0.5 Vel. Movimiento.", apply: () => { player.speed += 0.5; } },
    { name: "Volante de Aztek", rarity: "bronze", desc: "+0.3 Vel. Movimiento, +25 Vida.", apply: () => { player.speed += 0.3; player.maxHp += 25; player.hp += 25; } },
    { name: "Teléfono Desechable", rarity: "bronze", desc: "+7 Letalidad, +7 Perforación Mágica.", apply: () => { player.lethality += 7; player.magicPenFlat += 7; } },
    { name: "Mentiras Piadosas", rarity: "bronze", desc: "+2 Daño Físico, +8 Poder Mágico.", apply: () => { player.physDmg += 2; player.magicDmg += 8; } },
    { name: "Dinero Enterrado", rarity: "bronze", desc: "+5 Vida, +5 Daño, +5 Poder Mágico.", apply: () => { player.maxHp += 5; player.hp += 5; player.physDmg += 5; player.magicDmg += 5; } },
    { name: "Llave Maestra", rarity: "bronze", desc: "+4% Pen. Armadura, +4% Pen. Mágica.", apply: () => { player.armorPenPct += 4; player.magicPenPct += 4; } },
    { name: "Plumas de Cuervo", rarity: "bronze", desc: "+0.5 Vel. Movimiento, -5% tamaño.", apply: () => { player.speed += 0.5; player.scale *= 0.95; } },
    { name: "Adrenalina Pura", rarity: "bronze", desc: "+0.5 Vel. Movimiento, +0.3 Vel. Ataque.", apply: () => { player.speed += 0.5; player.atkSpeed += 0.3; } },
    { name: "Pizza en el Tejado", rarity: "bronze", desc: "+5% Curaciones, +1 Empuje.", apply: () => { player.healPower += 5; player.knockback += 1; } },
    { name: "Timbre de Héctor", rarity: "bronze", desc: "+4 Daño, +4 Magia, +10 Vida, +10 Res.F, +10 Res.M", apply: () => { player.physDmg += 4; player.magicDmg += 4; player.maxHp += 10; player.hp += 10; player.physRes += 10; player.magicRes += 10; } }
];

// --- DATOS DEL ÁRBOL GROWING ---
const passivesData = [
    { id: 'consecuencias', title: "Consecuencias", desc: "Recibir daño de cualquier tipo otorga arrepentimiento que se puede acumular hasta 5 veces. Arrepentimiento: otorga 0.2 de velocidad de movimiento y 3 de resistencia física y mágica." },
    { id: 'quimica', title: "Química pura", desc: "Los disparos tienen un 17% de probabilidad de aplicar un debilitador (duración de 5s). Debilitador: 1. Veneno: inflige 1.5% de la vida actual por segundo y reduce 15 la res. mágica. 2. Hielo: quita 0.7 de vel. movimiento pero otorga 20 de res. física y mágica. 3. Incineración: inflige 1.5% de la vida actual por segundo y reduce 15 la res. física." },
    { id: 'calidad', title: "Producto de calidad", desc: "Los ataques tienen 10% de probabilidad de otorgar 1.0 de velocidad de movimiento a los enemigos, pero perderán un 7% de su resistencia física y mágica, este efecto dura 4 segundos." },
    { id: 'escudo', title: "No tienes que hacer esto", desc: "Otorga un escudo de 50 de vida cada vez que asesinas 40 enemigos, este escudo se puede acumular hasta un máximo de 120 de vida." },
    { id: 'theWorld', title: "The World", desc: "Permite detener el tiempo hasta por 10 segundos haciendo clic derecho. Puedes hacer clic derecho nuevamente para reanudar el tiempo. Tiene un enfriamiento de 3 minutos." },
    { id: 'companero', title: "Socio de Negocios", desc: "Te apoya un 2do personaje. Hereda 100% Vida, 90% Resistencias/Velocidad, 30% Daño y 35% Vel. Ataque. La penetración y robo de vida se reducen a la mitad." },
    { id: 'kingCrimson', title: "King Crimson", desc: "Presiona SHIFT para borrar medio segundo de tiempo. Reapareces instantáneamente 150 píxeles en tu dirección de movimiento, evadiendo todo el daño. Enfriamiento: 5 segundos." }
];

// --- SISTEMA DE XP ---
const orbs = [];
let level = 1, currentExp = 0, maxExp = 5;
const imgMonedaXP = new Image(); 
imgMonedaXP.src = 'puntos147x61.png';

function spawnExpOrb(x, y) {
    orbs.push({ 
        x: x, 
        y: y, 
        radius: 8,
        frameX: Math.floor(Math.random() * 16),
        frameTimer: 0,
        animationSpeed: 4 
    });
}

// --- EVENTOS DEL MENÚ PRINCIPAL ---
document.getElementById('btn-play').addEventListener('click', () => {
    document.getElementById('menu-main').classList.add('hidden');
    document.getElementById('char-select').classList.remove('hidden');
});

document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
        document.exitFullscreen();
    }
});

document.getElementById('btn-best').addEventListener('click', showBestScores);
document.getElementById('btn-close-scores').addEventListener('click', () => {
    document.getElementById('scores-container').classList.add('hidden');
});

function handleCharSelection(charName) {
    if (unlockedSkills.companero && equippedSkills.companero) {
        if (!isSelectingCompanion) {
            // Primer clic: Elige al jugador principal
            selectedChar = charName;
            isSelectingCompanion = true;
            document.getElementById('char-select-title').innerText = "ELIGE A TU COMPAÑERO";
            
            // Ocultar al personaje ya elegido para no clonarlo
            document.getElementById(`char-${charName}`).style.opacity = "0.3";
            document.getElementById(`char-${charName}`).style.pointerEvents = "none";
        } else {
            // Segundo clic: Elige al compañero
            selectedCompanion = charName;
            startGame();
        }
    } else {
        // Modo normal (sin pasiva)
        selectedChar = charName;
        selectedCompanion = null;
        startGame();
    }
}

document.getElementById('char-walter').addEventListener('click', () => handleCharSelection('walter'));
document.getElementById('char-gus').addEventListener('click', () => handleCharSelection('gus'));
document.getElementById('char-jesse').addEventListener('click', () => handleCharSelection('jesse'));
document.getElementById('char-mike').addEventListener('click', () => handleCharSelection('mike'));

// Resetear el menú al darle a "Jugar" desde el inicio
document.getElementById('btn-play').addEventListener('click', () => {
    document.getElementById('menu-main').classList.add('hidden');
    document.getElementById('char-select').classList.remove('hidden');
    isSelectingCompanion = false;
    document.getElementById('char-select-title').innerText = "ELIGE TU PERSONAJE";
    ['walter', 'gus', 'jesse', 'mike'].forEach(c => {
        document.getElementById(`char-${c}`).style.opacity = "1";
        document.getElementById(`char-${c}`).style.pointerEvents = "auto";
    });
});
document.getElementById('btn-back-char').addEventListener('click', () => {
    document.getElementById('char-select').classList.add('hidden');
    document.getElementById('menu-main').classList.remove('hidden');
});

document.getElementById('btn-growing').addEventListener('click', showGrowingMenu);
document.getElementById('btn-back-growing').addEventListener('click', () => {
    document.getElementById('growing-menu').classList.add('hidden');
    document.getElementById('menu-main').classList.remove('hidden');
});

document.getElementById('btn-pause').addEventListener('click', pauseGame);
document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-quit').addEventListener('click', quitGame);

function showGrowingMenu() {
    document.getElementById('menu-main').classList.add('hidden');
    document.getElementById('growing-menu').classList.remove('hidden');
    document.getElementById('growing-points').innerText = `Puntos Disponibles: ${totalPoints}`;
    
    const list = document.getElementById('growing-list');
    list.innerHTML = '';
    
    passivesData.forEach(p => {
        let div = document.createElement('div');
        div.style = "background: rgba(255,255,255,0.1); border: 2px solid white; border-radius: 10px; padding: 15px; text-align: left;";
        let isBought = unlockedSkills[p.id];
        let isEquipped = equippedSkills[p.id];
        
        let btnText = 'Comprar (1000 pts)';
        let btnBg = 'rgba(255,255,255,0.2)';
        
        if (isBought) {
            btnText = isEquipped ? 'Equipado' : 'No equipado';
            btnBg = isEquipped ? '#27ae60' : '#c0392b'; // Verde si está equipado, Rojo si no
        }
        
        div.innerHTML = `
            <h3 style="color: #f1c40f; margin-top: 0;">${p.title}</h3>
            <p style="font-size: 0.9rem; margin-bottom: 15px;">${p.desc}</p>
            <button id="buy-${p.id}" style="background: ${btnBg}; cursor: pointer; border: 2px solid white; padding: 10px 20px; border-radius: 5px; color: white; font-weight: bold;">
                ${btnText}
            </button>
        `;
        list.appendChild(div);
        
        document.getElementById(`buy-${p.id}`).addEventListener('click', () => {
            if (!isBought) {
                // Comprar por primera vez
                if (totalPoints >= 1000) {
                    totalPoints -= 1000;
                    unlockedSkills[p.id] = true;
                    equippedSkills[p.id] = true; // Por defecto se equipa al comprar
                    localStorage.setItem('zombieTotalPoints', totalPoints);
                    localStorage.setItem('zombieGrowing', JSON.stringify(unlockedSkills));
                    localStorage.setItem('zombieEquipped', JSON.stringify(equippedSkills));
                    showGrowingMenu(); 
                } else {
                    alert("Puntos insuficientes.");
                }
            } else {
                // Alternar entre equipado / no equipado
                equippedSkills[p.id] = !equippedSkills[p.id];
                localStorage.setItem('zombieEquipped', JSON.stringify(equippedSkills));
                showGrowingMenu();
            }
        });
    });
}

function startGame() {
    score = 0; currentWave = 1; waveTimer = 1800; waveIntroTimer = 180; isResting = false;
    slimes.length = 0; bullets.length = 0; orbs.length = 0;
    level = 1; currentExp = 0; maxExp = 5;
    
    player.maxHp = 100; player.hp = 100; player.physRes = 25; player.magicRes = 25;
    player.physDmg = 10; player.magicDmg = 0; player.speed = 1.7; player.atkSpeed = 1.0;
    player.lifesteal = 0.5; player.sustain = 0.5; player.armorPenPct = 0; player.lethality = 0;
    player.magicPenPct = 0; player.magicPenFlat = 0; player.healPower = 0; player.projectiles = 1;
    player.spread = 0.5; player.knockback = 0; player.piercing = 1; player.scale = 2;
    player.x = mapWidth / 2; player.y = mapHeight / 2; player.hitTimer = 0;
    
    player.shield = 0; player.arrepentimientoStacks = 0; player.arrepentimientoTimer = 0; player.calidadTimer = 0; player.killCount = 0; player.ownedUpgrades = []; player.algoMasDebuff = 0;

    gameState = 'playing';
    document.getElementById('char-select').classList.add('hidden');
    document.getElementById('pc-hud')?.classList.remove('hidden');
    document.getElementById('ui-pause-btn').classList.remove('hidden');
    // Inicializar compañero
    if (selectedCompanion) {
        companion.active = true;
        companion.alive = true;
        companion.char = selectedCompanion;
        companion.x = player.x - 40;
        companion.y = player.y - 40;
        companion.maxHp = player.maxHp * 0.8;
        companion.hp = companion.maxHp;
    } else {
        companion.active = false;
    }
}

function getEffStats() {
    let pSpd = player.speed + (player.arrepentimientoStacks * 0.2) + (player.calidadTimer > 0 ? 1.0 : 0);
    if (player.algoMasDebuff > 0) pSpd = Math.max(0.1, pSpd - 0.6);
    
    if (isTimeStopped) pSpd *= 1.8;

    let pPR = (player.physRes + (player.arrepentimientoStacks * 3)) * (player.calidadTimer > 0 ? 0.93 : 1);
    let pMR = (player.magicRes + (player.arrepentimientoStacks * 3)) * (player.calidadTimer > 0 ? 0.93 : 1);
    return { spd: pSpd, pr: pPR, mr: pMR };
}
function pauseGame() {
    gameState = 'paused';
    document.getElementById('touch-controls')?.classList.add('hidden');
    document.getElementById('pc-hud')?.classList.add('hidden');
    document.getElementById('ui-pause-btn').classList.add('hidden');
    document.getElementById('menu-pause').classList.remove('hidden');
    
    document.getElementById('pause-wave').innerText = `OLEADA: ${currentWave}`;
    
    if (isResting) {
        document.getElementById('pause-time').innerText = `DESCANSO: ${Math.ceil(restTimer/60)}s`;
    } else if (waveTimer > 0) {
        document.getElementById('pause-time').innerText = `TIEMPO RESTANTE: ${Math.ceil(waveTimer/60)}s`;
    } else {
        document.getElementById('pause-time').innerText = `ENEMIGOS RESTANTES: ${slimes.length}`;
    }
    
    document.getElementById('pause-score').innerText = `PUNTOS: ${score} | NIVEL: ${level}`;
    
    let eS = getEffStats();
    document.getElementById('rpg-stats-container').innerHTML = `
        <p style="margin-bottom: 12px;">
            <strong style="color: #4E5E07;">VIDA BASE:</strong> ${Math.floor(player.hp)} / ${Math.floor(player.maxHp)} &nbsp;|&nbsp; 
            <strong style="color: #8D8179;">ESCUDO:</strong> ${Math.floor(player.shield)}
        </p>
        
        <p style="margin-bottom: 12px;">
            <strong style="color: #EDD600;">RES. FÍSICA:</strong> ${eS.pr.toFixed(1)} &nbsp;|&nbsp; 
            <strong style="color: #499BED;">RES. MÁGICA:</strong> ${eS.mr.toFixed(1)}
        </p>
        
        <p style="margin-bottom: 12px;">
            <strong style="color: #CA4213;">DAÑO FÍSICO:</strong> ${Math.floor(player.physDmg)} &nbsp;|&nbsp; 
            <strong style="color: #430357;">PODER MÁGICO:</strong> ${Math.floor(player.magicDmg)}
        </p>
        
        <p style="margin-bottom: 12px;">
            <strong style="color: #FAFAFA;">VEL. MOVIMIENTO:</strong> ${eS.spd.toFixed(2)} &nbsp;|&nbsp; 
            <strong style="color: #FBF3A7;">VEL. ATAQUE:</strong> ${(player.atkSpeed * (isTimeStopped ? 1.8 : 1)).toFixed(1)}
        </p>
        
        <p style="margin-bottom: 12px;">
            <strong style="color: #A90101;">ROBO DE VIDA:</strong> ${player.lifesteal}% &nbsp;|&nbsp; 
            <strong style="color: #C40361;">SUCCIÓN:</strong> ${player.sustain}%
        </p>
        
        <p style="margin-bottom: 12px;">
            <strong style="color: #943A02;">PEN. ARMADURA:</strong> ${player.armorPenPct}% &nbsp;|&nbsp; 
            <strong style="color: #943A02;">LETALIDAD:</strong> ${player.lethality}
        </p>
        
        <p style="margin-bottom: 12px;">
            <strong style="color: #A95993;">PEN. MÁGICA:</strong> ${player.magicPenPct}% &nbsp;|&nbsp; 
            <strong style="color: #A95993;">PERF. MÁGICA:</strong> ${player.magicPenFlat}
        </p>
        
        <p style="margin-bottom: 12px;">
            <strong style="color: #011F28;">EMPUJE:</strong> ${player.knockback} &nbsp;|&nbsp; 
            <strong style="color: #011F28;">PERFORACIÓN:</strong> ${player.piercing}
        </p>
        
        <p style="margin-bottom: 5px;">
            <strong style="color: #729969;">PODER DE CURACIÓN/ESCUDOS:</strong> +${player.healPower}%
        </p>
    `;
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('menu-pause').classList.add('hidden');
    document.getElementById('touch-controls')?.classList.remove('hidden');
    document.getElementById('pc-hud')?.classList.remove('hidden');
    document.getElementById('ui-pause-btn').classList.remove('hidden');
}

function quitGame() {
    saveScore();
    document.getElementById('menu-pause').classList.add('hidden');
    document.getElementById('menu-main').classList.remove('hidden');
    gameState = 'menu';
}

function saveScore() {
    if (score > 0) {
        highScores.push(score);
        highScores.sort((a, b) => b - a);
        highScores = highScores.slice(0, 5);
        localStorage.setItem('mrWhiteScores', JSON.stringify(highScores));
        totalPoints += score;
        localStorage.setItem('zombieTotalPoints', totalPoints);
    }
}

function showBestScores() {
    let l = document.getElementById('scores-list');
    l.innerHTML = '';
    if (highScores.length === 0) {
        l.innerHTML = '<li>Sin puntajes aún</li>';
    } else {
        highScores.forEach((s, i) => l.innerHTML += `<li>#${i + 1}: ${s} pts</li>`);
    }
    document.getElementById('scores-container').classList.remove('hidden');
}

function triggerLevelUp() {
    gameState = 'levelup';
    document.getElementById('touch-controls')?.classList.add('hidden');
    document.getElementById('pc-hud')?.classList.add('hidden');
    document.getElementById('ui-pause-btn').classList.add('hidden');
    let uc = document.getElementById('upgrades-container');
    uc.innerHTML = '';
    
    let options = [];
    for (let k = 0; k < 3; k++) {
        let chosen = null;
        while (!chosen) {
            let rand = Math.random() * 100, targetRarity = 'bronze';
            if (rand < 5) targetRarity = 'platinum'; // 5% 
            else if (rand < 20) targetRarity = 'gold'; // 15% 
            else if (rand < 45) targetRarity = 'silver'; // 25% 
            
            // Filtramos la rareza estricta, quitando cartas en pantalla y cartas ya compradas
            let filtered = poolUpgrades.filter(u => u.rarity === targetRarity && !options.some(o => o.name === u.name) && (u.rarity !== 'platinum' || !player.ownedUpgrades.includes(u.name)));            
            if (filtered.length > 0) {
                chosen = filtered[Math.floor(Math.random() * filtered.length)];
            } 
            // Si el jugador ya compró TODAS las cartas de esa rareza, el bucle repite para darle otra
        }
        options.push(chosen);
    }
    
    options.forEach(upg => {
        let card = document.createElement('div');
        card.className = `upgrade-card card-${upg.rarity}`;
        card.innerHTML = `<div class="card-title">${upg.name} (${upg.rarity.toUpperCase()})</div><div class="card-desc">${upg.desc}</div>`;
        card.addEventListener('click', () => {
            if (typeof upg.apply === 'function') upg.apply();
            player.ownedUpgrades.push(upg.name); // <--- NUEVA LÍNEA: Guarda la mejora para que no vuelva a salir
            document.getElementById('menu-levelup').classList.add('hidden');
            document.getElementById('touch-controls')?.classList.remove('hidden');
            document.getElementById('pc-hud')?.classList.remove('hidden');
            document.getElementById('ui-pause-btn').classList.remove('hidden');
            gameState = 'playing';
        });
        uc.appendChild(card);
    });
    document.getElementById('menu-levelup').classList.remove('hidden');
}

// --- CARGA DE IMÁGENES ---
const imgPergamino = new Image(); imgPergamino.src = 'pergaminoinfo.png';
const imgMikeIdle = new Image(); imgMikeIdle.src = 'modeloMIKEEHRMANTRAUTposereposo32x32.png';
const imgMikeWalk = new Image(); imgMikeWalk.src = 'modeloMIKEEHRMANTRAUTcaminando32x32.png';
const imgBarraSlime = new Image(); imgBarraSlime.src = 'barraslime.png';
const imgDisparoBase = new Image(); imgDisparoBase.src = 'animaciondisparobase.png';
const imgDisparoRojo = new Image(); imgDisparoRojo.src = 'animaciondisparorojo.png';
const imgDisparoVerde = new Image(); imgDisparoVerde.src = 'animaciondisparoverde.png';
const imgDisparoAzul = new Image(); imgDisparoAzul.src = 'animaciondisparoazul.png';
const imgDisparoMorado = new Image(); imgDisparoMorado.src = 'animaciondisparomorado.png';
const imgSlimeBase = new Image(); imgSlimeBase.src = 'slimereposogris.png';
const imgSlimeRojo = new Image(); imgSlimeRojo.src = 'slimereposorojo.png';
const imgSlimeVerde = new Image(); imgSlimeVerde.src = 'slimereposoverde.png';
const imgSlimeAzul = new Image(); imgSlimeAzul.src = 'slimereposoazul.png';
const imgMarcoGrande = new Image(); imgMarcoGrande.src = 'marcogrande.png'; 
let selectedTarget = null;
const imgBarraVida = new Image(); imgBarraVida.src = 'barradevida.png';
const imgBarraExp = new Image(); imgBarraExp.src = 'barradeexperiencia.png';
const imgBarraEscudo = new Image(); imgBarraEscudo.src = 'barradeescudo.png';
const imgWalterIdle = new Image(); imgWalterIdle.src = 'modeloWALTERWHITEposereposo32x32.png';
const imgWalterWalk = new Image(); imgWalterWalk.src = 'modeloWALTERWHITEcaminando32x32.png';
const imgGusIdle = new Image(); imgGusIdle.src = 'modeloGUSTAVOFRINGposereposo32x32.png';
const imgGusWalk = new Image(); imgGusWalk.src = 'modeloGUSTAVOFRINGcaminando32x32.png';
const imgJesseIdle = new Image(); imgJesseIdle.src = 'modeloJESSEPINKMANposereposo32x32.png';
const imgJesseWalk = new Image(); imgJesseWalk.src = 'modeloJESSEPINKMANcaminando32x32.png';
const imgRock = new Image(); imgRock.src = 'roca32x32.png';
const imgTree = new Image(); imgTree.src = 'arbol64x64.png'; 
const imgSlimeManto = new Image(); imgSlimeManto.src = 'SLIMEREPOSOMANTOUNIVERSAL32x32.png';
const imgSlimeBrazo = new Image(); imgSlimeBrazo.src = 'SLIMEREPOSOALGOMAS32x32.png';
const imgSlimeQuimica = new Image(); imgSlimeQuimica.src = 'SLIMEREPOSOQUIMICAESPACIAL32x32.png';
const imgSlimeInevitable = new Image(); imgSlimeInevitable.src = 'SLIMEREPOSOINEVITABLE32x32.png';
const imgPasto = new Image(); imgPasto.src = 'pasto32x32.png';
let groundPattern = null;
const imgIconTheWorld = new Image(); imgIconTheWorld.src = 'ICONOTHEWORLD.png';
const imgMarcoSocio = new Image(); imgMarcoSocio.src = 'marcosocio.png';
const imgBarraSocio = new Image(); imgBarraSocio.src = 'barradesocio.png';
const imgMarcoJugador = new Image(); imgMarcoJugador.src = 'marcosimplejugador.png';
const imgOjo = new Image(); imgOjo.src = 'OJOREPOSO.png';
const imgOjoMorado = new Image(); imgOjoMorado.src = 'OJOREPOSOMORADO.png';

imgPasto.onload = () => {
    groundPattern = ctx.createPattern(imgPasto, 'repeat');
};

// --- MAPA ---
const rocks = []; const rockSizes = [1.5, 2, 3, 4]; 
for (let i = 0; i < 35; i++) {
    let rx, ry, validPos = false, attempts = 0;
    let rScale = rockSizes[Math.floor(Math.random() * rockSizes.length)];
    while (!validPos && attempts < 100) {
        rx = Math.random() * (mapWidth - 100) + 50;
        ry = Math.random() * (mapHeight - 100) + 50;
        validPos = true;
        if (Math.abs(rx - mapWidth / 2) < 200 && Math.abs(ry - mapHeight / 2) < 200) validPos = false;
        if (validPos) {
            for (let rock of rocks) {
                if (Math.hypot(rx - rock.x, ry - rock.y) < (rScale + rock.scale) * 22) { validPos = false; break; }
            }
        }
        attempts++;
    }
    if (validPos) rocks.push({ x: rx, y: ry, width: 32, height: 32, scale: rScale, type: 'rock' });
}

const trees = []; const cellW = mapWidth / 5, cellH = mapHeight / 5;
for (let c = 0; c < 5; c++) {
    for (let r = 0; r < 5; r++) {
        let tx, ty, validPos = false, attempts = 0;
        while (!validPos && attempts < 50) {
            tx = (c * cellW) + (Math.random() * (cellW - 100)) + 50;
            ty = (r * cellH) + (Math.random() * (cellH - 100)) + 50;
            validPos = true;
            if (Math.abs(tx - mapWidth / 2) < 200 && Math.abs(ty - mapHeight / 2) < 200) validPos = false;
            if (validPos) {
                for (let rock of rocks) {
                    if (Math.hypot(tx - rock.x, ty - rock.y) < 100 + (rock.scale * 15)) { validPos = false; break; }
                }
            }
            attempts++;
        }
        if (validPos) trees.push({ x: tx, y: ty, width: 64, height: 64, scale: 2.5, type: 'tree' });
    }
}
const obstacles = [...rocks, ...trees];

// --- SLIMES ---
const slimes = [];
let currentWave = 1, isResting = false, waveTimer = 3600, restTimer = 0, spawnTimer = 0, waveIntroTimer = 0;

function spawnSlimeFromEdge() {
    let edge = Math.floor(Math.random() * 4), sx, sy;
    if (edge === 0) { sx = Math.random() * mapWidth; sy = -50; }
    else if (edge === 1) { sx = mapWidth + 50; sy = Math.random() * mapHeight; }
    else if (edge === 2) { sx = Math.random() * mapWidth; sy = mapHeight + 50; }
    else { sx = -50; sy = Math.random() * mapHeight; }
    
    let mult = currentWave - 1;

    // --- ¿ES UN SLIME TITÁN? ---
    // Aparece desde la oleada 5 en adelante con un 30% de probabilidad (0.3)
    let isGiant = (currentWave >= 5 && Math.random() < 0.3);

    if (isGiant) {
        slimes.push({
            x: sx, y: sy, width: 32, height: 32, 
            scale: 5.5, // 2.5 veces más alto/grande
            hp: (500 + (mult * 60)), maxHp: (500 + (mult * 60)), // Vida base y escalado moderado
            speed: 0.4,
            physDmg: 10 + (mult * 2), magicDmg: 10 + (mult * 2), // Daño escalado moderado
            physRes: 100 + (mult * 5), magicRes: 100 + (mult * 5), // Resistencias altas y escaladas
            atkSpeed: 0.3, 
            frameX: Math.floor(Math.random() * 4), frameTimer: 0, animationSpeed: 12,
            poisonStacks: 0, poisonTimer: 0, iceTimer: 0, fireStacks: 0, fireTimer: 0, calidadTimer: 0,
            isGiant: true, // Identificador para futuras mecánicas
            hasManta: false, hasAlgoMas: false, hasQuimica: false, hasInevitable: false
        });
} else {
        // Probabilidades: 25% Ojo Morado, 25% Ojo Normal, 50% Slime
        let randType = Math.random();
        let chosenType = 'slime';
        if (randType < 0.25) chosenType = 'ojoMorado';
        else if (randType < 0.50) chosenType = 'ojo';

        let isOjoLike = (chosenType === 'ojo' || chosenType === 'ojoMorado');
        
        slimes.push({
            type: chosenType,
            x: sx, y: sy, 
            width: isOjoLike ? 40 : 32,    
            height: isOjoLike ? 40 : 32, 
            scale: isOjoLike ? 2.0 : 2.5,  
            hp: 40 * Math.pow(1.10, mult), maxHp: 40 * Math.pow(1.10, mult),
            speed: 0.7 + (mult * 0.05), physDmg: 5 + (mult * 2), magicDmg: 5 + (mult * 2),
            physRes: 10 + (mult * 2), magicRes: 10 + (mult * 2),
            atkSpeed: 1.0,
            frameX: Math.floor(Math.random() * 4), frameTimer: 0, animationSpeed: 12,
            poisonStacks: 0, poisonTimer: 0, iceTimer: 0, fireStacks: 0, fireTimer: 0, calidadTimer: 0,
            
            hasManta: (!isOjoLike && currentWave >= 3 && Math.random() < 0.35),
            mantaStacks: 0,
            hasAlgoMas: (!isOjoLike && currentWave >= 6 && Math.random() < 0.35), 
            hasQuimica: (!isOjoLike && currentWave >= 10 && Math.random() < 0.25), 
            hasInevitable: (!isOjoLike && currentWave >= 12 && Math.random() < 0.15), 
            isImmortal: false, immortalTimer: 0, activatedInevitable: false
        });
    }
}
// --- CONTROLES Y DISPAROS ---
const bullets = []; const bulletSpeed = 6, bulletMaxRange = 400; let fireCooldown = 0;
const damageTexts = [];
// === CONTROLES PC: WASD + MOUSE (SPACE DISPARA) ===
let lastAimVector = { x: 1, y: 0 };
let isSpaceDown = false; // <--- BARRA ESPACIADORA = disparo continuo
let mouseScreenX = window.innerWidth / 2;
let mouseScreenY = window.innerHeight / 2;

// Mouse SOLO para apuntar (no dispara)
window.addEventListener('mousemove', (e) => {
    mouseScreenX = e.clientX;
    mouseScreenY = e.clientY;
    if (gameState === 'playing') {
        let dx = mouseScreenX - canvas.width / 2;
        let dy = mouseScreenY - canvas.height / 2;
        if (Math.hypot(dx, dy) > 5) {
            let len = Math.hypot(dx, dy);
            lastAimVector = { x: dx/len, y: dy/len };
        }
    }
});
window.addEventListener('mousedown', (e) => {
    if (gameState !== 'playing') return;

    // Actualiza el vector de disparo
    let dx = e.clientX - canvas.width / 2;
    let dy = e.clientY - canvas.height / 2;
    if (Math.hypot(dx, dy) > 1) {
        let len = Math.hypot(dx, dy);
        lastAimVector = { x: dx/len, y: dy/len };
    }

    // --- CLIC IZQUIERDO: SELECCIÓN DE SLIMES ---
    if (e.button === 0) { 
        let cX = Math.max(0, Math.min(mapWidth - canvas.width, player.x - canvas.width / 2));
        let cY = Math.max(0, Math.min(mapHeight - canvas.height, player.y - canvas.height / 2));

        let mouseMapX = e.clientX + cX;
        let mouseMapY = e.clientY + cY;

        let hitSlime = null;
        for (let s of slimes) {
            let hitRadius = s.isGiant ? 90 : 35;
            if (Math.hypot(mouseMapX - s.x, mouseMapY - s.y) < hitRadius) {
                hitSlime = s;
                break;
            }
        }
        selectedTarget = hitSlime;
    }

// --- CLIC DERECHO: ACTIVAR / DESACTIVAR THE WORLD ---
    if (e.button === 2) {
        if (unlockedSkills.theWorld && equippedSkills.theWorld) {
            if (!isTimeStopped) {
                // Solo activa si no está en enfriamiento
                if (timeStopCooldown <= 0) {
                    isTimeStopped = true;
                    timeStopDuration = 10000;
                    
                    soundTheWorld1.currentTime = 0;
                    soundTheWorld1.play().catch(e => {});

                    shakeTimer = 20;
                    shakeIntensity = 8;
                    worldFlashTimer = 100; 
                    worldFlashMax = 100;  
                    worldWaves.push({ x: player.x, y: player.y, radius: 10, speed: 60, alpha: 1.0 });
                }
            } else {
                // Desactivar manualmente antes de tiempo
                isTimeStopped = false;
                timeStopDuration = 0;
                timeStopCooldown = 10800; 

                soundTheWorld2.currentTime = 0;
                soundTheWorld2.play().catch(e => {});

                shakeTimer = 30;
                shakeIntensity = 10;
                worldFlashTimer = 30; 
                worldFlashMax = 30;   // <--- También al desactivar para que tenga el mismo efecto suave
                worldWaves.push({ x: player.x, y: player.y, radius: 10, speed: 60, alpha: 1.0 });
            }
        }
    }
});
// evitar menú contextual con click derecho
canvas.addEventListener('contextmenu', e => e.preventDefault());

function fireBullet(bA) {

    let cnt = player.projectiles, spA = player.spread;
for (let p = 0; p < cnt; p++) {
        let ang = bA;
        if (cnt > 1) ang += (p - (cnt - 1) / 2) * (spA / Math.max(1, cnt - 1));
        
        // Calcular elemento de la bala basado en la pasiva
        let bulletElement = 'none';
        if (equippedSkills.quimica && Math.random() < 0.17) {
            let ef = Math.floor(Math.random() * 3);
            if (ef === 0) bulletElement = 'poison';
            else if (ef === 1) bulletElement = 'ice';
            else bulletElement = 'fire';
        }

        bullets.push({
            x: player.x, y: player.y - 15,
            vx: Math.cos(ang) * bulletSpeed, vy: Math.sin(ang) * bulletSpeed,
            angle: ang, 
            width: 32, height: 32, scale: 1.5, 
            state: 'flying', 
            frameX: 0, 
            frameTimer: 0, 
            animationSpeed: 5, 
            traveled: 0, physDmg: player.physDmg, magicDmg: player.magicDmg,
            knockback: player.knockback, piercing: player.piercing, hitEnemies: [],
            element: bulletElement 
        });
    }
}
const keys = { w: false, a: false, s: false, d: false, W: false, A: false, S: false, D: false };
window.addEventListener('keydown', e => {
    // Mostrar / Ocultar estadísticas con TAB
    if (e.key === 'Tab') {
        e.preventDefault(); // Evita que el navegador cambie de ventana o seleccione botones
        if (gameState === 'playing') {
            showPlayerStatsPanel = !showPlayerStatsPanel;
        }
        return;
    }
    // ESPACIO = disparo (mantener pulsado = rafaga, pulsar repetido = rafaga)
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        if (gameState === 'playing') {
            e.preventDefault(); // evita scroll de la pagina
            if (!isSpaceDown) {
                isSpaceDown = true;
                if (fireCooldown <= 0) {
                    // Calcula estrictamente hacia el mouse, sumando la posición de la cámara
                    let cX = Math.max(0, Math.min(mapWidth - canvas.width, player.x - canvas.width / 2));
                    let cY = Math.max(0, Math.min(mapHeight - canvas.height, player.y - canvas.height / 2));
                    let ang = Math.atan2((mouseScreenY + cY) - player.y, (mouseScreenX + cX) - player.x);
                    
                    fireBullet(ang);
                    let currentAtkSpdClick = Math.max(0.1, player.atkSpeed - (player.algoMasDebuff > 0 ? 0.6 : 0));
                    
                    // --- BONO DEL 80% EN VEL. DE ATAQUE MANUAL DURANTE THE WORLD ---
                    if (isTimeStopped) currentAtkSpdClick *= 1.8;
                    
                    fireCooldown = Math.max(5, Math.floor(60 / currentAtkSpdClick));
                }
            }
        }
        return;
    }
    if (e.key === 'Shift') {
        if (gameState === 'playing' && unlockedSkills.kingCrimson && equippedSkills.kingCrimson && kcCooldown <= 0) {
            e.preventDefault();
            
            // 1. Determinar dirección de salto
            let dx = 0, dy = 0;
            if (keys.w || keys.W) dy -= 1;
            if (keys.s || keys.S) dy += 1;
            if (keys.a || keys.A) dx -= 1;
            if (keys.d || keys.D) dx += 1;
            
            let dirX, dirY;
            if (dx === 0 && dy === 0) {
                dirX = lastAimVector.x; dirY = lastAimVector.y;
            } else {
                let len = Math.hypot(dx, dy);
                dirX = dx / len; dirY = dy / len;
            }

            // 2. Salto instantáneo con detección de colisiones (150px divididos en 15 pasos)
            let stepSize = 10;
            for (let i = 0; i < 15; i++) {
                let nextX = player.x + (dirX * stepSize);
                let nextY = player.y + (dirY * stepSize);
                
                // Evitar salir del mapa
                if (nextX < 0 || nextX > mapWidth || nextY < 0 || nextY > mapHeight) break;
                
                // Evitar chocar contra obstáculos
                let hitWall = false;
                for (let obs of obstacles) {
                    if (isColliding(nextX, nextY, obs)) { hitWall = true; break; }
                }
                if (hitWall) break;
                
                player.x = nextX;
                player.y = nextY;
                
                // Generar rastro visual cada ciertos pasos
                if (i % 2 === 0) {
                    kcGhosts.push({
                        x: player.x, y: player.y, 
                        frameX: player.frameX, state: player.state,
                        life: 25 
                    });
                }
            }
            
            player.hitTimer = 30; // Medio segundo de invulnerabilidad perfecta
            kcCooldown = 300;     // 5 segundos de enfriamiento
        }
        return;
    }
    if (e.key === 'Escape') {
        if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
        return;
    }
    if (e.key === 'F11') { e.preventDefault(); document.getElementById('btn-fullscreen')?.click(); }
    if (keys.hasOwnProperty(e.key) && gameState === 'playing') keys[e.key] = true;
    // soporte minusculas
    let lk = e.key.toLowerCase();
    if (keys.hasOwnProperty(lk) && gameState === 'playing') keys[lk] = true;
});

window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
        isSpaceDown = false;
        e.preventDefault();
        return;
    }
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    let lk = e.key.toLowerCase();
    if (keys.hasOwnProperty(lk)) keys[lk] = false;
});

function isColliding(px, py, obs) {
    const pBW = 30 * player.scale / 2, pBH = 20 * player.scale / 2, pOY = 35;
    const pL = px - pBW, pR = px + pBW, pT = (py + pOY) - pBH, pB = (py + pOY) + pBH;
    let oL, oR, oT, oB;
    if (obs.type === 'rock') {
        const rW = 22 * obs.scale, rH = 8.6 * obs.scale, rY = 8.3 * obs.scale;
        oL = obs.x - rW / 2; oR = obs.x + rW / 2; oT = (obs.y + rY) - rH / 2; oB = (obs.y + rY) + rH / 2;
    } else {
        const tW = 10 * obs.scale, tH = 15 * obs.scale, tY = 20 * obs.scale;
        oL = obs.x - tW / 2; oR = obs.x + tW / 2; oT = (obs.y + tY) - tH / 2; oB = (obs.y + tY) + tH / 2;
    }
    return pL < oR && pR > oL && pT < oB && pB > oT;
}

// --- BUCLE PRINCIPAL DE ACTUALIZACIÓN ---
function update() {
    if (gameState !== 'playing') return;
// --- LÓGICA DE THE WORLD ---
if (isTimeStopped) {
    // Restamos 16.66 milisegundos por frame (para simular 60 FPS exactos)
    timeStopDuration -= 16.666; 
    
    // Reproducir el sonido justo 2 segundos (2000 ms) antes de que expire
    if (timeStopDuration <= 500 && timeStopDuration > 480) {
        soundTheWorld2.currentTime = 0;
        soundTheWorld2.play().catch(e => {});
    }

    if (timeStopDuration <= 0) {
        isTimeStopped = false;
        timeStopCooldown = 10800; // Aplica los 3 mins de enfriamiento
        
        shakeTimer = 30;
        shakeIntensity = 10;
        worldFlashTimer = 30; 
        worldFlashMax = 30;
        worldWaves.push({ x: player.x, y: player.y, radius: 10, speed: 60, alpha: 1.0 });
    }
}

if (timeStopCooldown > 0) {
    timeStopCooldown--;
}
if (kcCooldown > 0) kcCooldown--;
    for (let i = kcGhosts.length - 1; i >= 0; i--) {
        kcGhosts[i].life--;
        if (kcGhosts[i].life <= 0) kcGhosts.splice(i, 1);
    }
// Actualizar animaciones de The World
if (worldFlashTimer > 0) worldFlashTimer--;
for (let i = worldWaves.length - 1; i >= 0; i--) {
    let w = worldWaves[i];
    w.radius += w.speed;
    w.alpha -= 0.02; // Desvanecer poco a poco
    if (w.alpha <= 0) worldWaves.splice(i, 1);
}

if (isResting) {
        restTimer--;
        if (restTimer <= 0) { 
            isResting = false; 
            currentWave++; 
            
            // NUEVO SISTEMA DE TIEMPOS POR OLEADA
            if (currentWave <= 5) waveTimer = 1800;         // 30 Segundos
            else if (currentWave <= 10) waveTimer = 3600;   // 1 Minuto
            else waveTimer = 5400;                          // 1 Minuto con 30 Segundos
            
            waveIntroTimer = 180; 
        }
    } else {
        if (waveIntroTimer > 0) waveIntroTimer--;
        
        // FASE DE GENERACIÓN: Mientras haya tiempo, spawnean enemigos
        if (waveTimer > 0) {
            waveTimer--;
            spawnTimer--;
            if (spawnTimer <= 0) { 
                // LÍMITE ANTILAG (Hard Cap): Si hay 300 o más enemigos procesándose, frenamos la generación
                if (slimes.length < 300) {
                    spawnSlimeFromEdge(); 
                }
                spawnTimer = Math.max(20, 150 - (currentWave * 20)); 
            }
        } else {
            // FASE DE LIMPIEZA: El tiempo acabó, no spawnean más.
            // Esperamos a que el jugador elimine a todos los enemigos restantes.
            if (slimes.length === 0) {
                isResting = true; 
                
                // --- SISTEMA DE DESCANSO ESCALONADO ---
                if (currentWave <= 4) {
                    restTimer = 300; // 5 segundos de descanso
                } else if (currentWave <= 9) {
                    restTimer = 540; // 9 segundos de descanso
                } else {
                    restTimer = 720; // 12 segundos de descanso
                }
                
                waveIntroTimer = restTimer; 

                // --- NUEVO: REVIVIR Y CURAR AL COMPAÑERO ---
                if (companion.active) {
                    companion.alive = true;
                    companion.hp = companion.maxHp; // Lo curamos al 100%
                    companion.x = player.x - 40;    // Lo teletransportamos a tu lado
                    companion.y = player.y - 40;
                }
            }
        }
    }

    let effS = getEffStats();
    let isMoving = false, dx = 0, dy = 0;
    if (keys.w || keys.W) { dy = -effS.spd; isMoving = true; }
    if (keys.s || keys.S) { dy = effS.spd; isMoving = true; }
    if (keys.a || keys.A) { dx = -effS.spd; isMoving = true; }
    if (keys.d || keys.D) { dx = effS.spd; isMoving = true; }
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
    if (dx !== 0 || dy !== 0) isMoving = true;

    let nX = player.x + dx, cX = false;
    // Si 'isTimeStopped' es true, ignoramos las colisiones con los obstáculos por completo
    if (!isTimeStopped) {
        for (let obs of obstacles) if (isColliding(nX, player.y, obs)) { cX = true; break; }
    }
    if (!cX) player.x = nX;

    let nY = player.y + dy, cY = false;
    if (!isTimeStopped) {
        for (let obs of obstacles) if (isColliding(player.x, nY, obs)) { cY = true; break; }
    }
    if (!cY) player.y = nY;

    player.x = Math.max(0, Math.min(mapWidth, player.x));
    player.y = Math.max(0, Math.min(mapHeight, player.y));
    player.state = isMoving ? 'walk' : 'idle';
    
    player.frameTimer++;
    if (player.frameTimer >= player.animationSpeed) {
        player.frameX++;
        if (player.frameX >= 4) player.frameX = 0;
        player.frameTimer = 0;
    }
    if (player.hitTimer > 0) player.hitTimer--;

if (player.algoMasDebuff > 0) player.algoMasDebuff--;
    
    let currentAtkSpd = Math.max(0.1, player.atkSpeed - (player.algoMasDebuff > 0 ? 0.6 : 0));
    
    if (isTimeStopped) currentAtkSpd *= 1.8;
    
    let effFR = Math.max(5, Math.floor(60 / currentAtkSpd));
    if (fireCooldown > 0) fireCooldown--;
    
    if (isSpaceDown && fireCooldown <= 0) {
        let cX = Math.max(0, Math.min(mapWidth - canvas.width, player.x - canvas.width / 2));
        let cY = Math.max(0, Math.min(mapHeight - canvas.height, player.y - canvas.height / 2));
        let ang = Math.atan2((mouseScreenY + cY) - player.y, (mouseScreenX + cX) - player.x);
        
        fireBullet(ang);
        fireCooldown = effFR;
    }
// --- INTELIGENCIA DEL COMPAÑERO ---
    if (companion.active && companion.alive && !isTimeStopped) {
        companion.physDmg = player.physDmg * 0.30;
        companion.magicDmg = player.magicDmg * 0.30;
        let compSpeed = player.speed * 0.9; 

        // 2. Escanear enemigo más cercano
        let nearestSlime = null;
        let minDist = Infinity;
        for (let s of slimes) {
            let d = Math.hypot(companion.x - s.x, companion.y - s.y);
            if (d < minDist) { minDist = d; nearestSlime = s; }
        }

        let cDx = 0, cDy = 0;
        let distToPlayer = Math.hypot(player.x - companion.x, player.y - companion.y);

        // Actualizar el temporizador de patrullaje (cambia de dirección aleatoriamente)
        companion.patrolTimer--;
        if (companion.patrolTimer <= 0) {
            companion.patrolAngle = Math.random() * Math.PI * 2; // Ángulo aleatorio
            companion.patrolTimer = 60 + Math.random() * 60; // 1 a 2 segundos
        }

        // PRIORIDAD 1: Supervivencia y Kiteo (Mantener distancia)
        if (nearestSlime && minDist < 180) { // Antes era 60. Ahora retrocede desde mucho antes
            let angleAway = Math.atan2(companion.y - nearestSlime.y, companion.x - nearestSlime.x);
            
            // Si el slime está muy cerca (< 70) entra en pánico y corre rápido, si no, hace un "kiteo" suave a velocidad normal
            let kiteSpeed = minDist < 70 ? compSpeed * 1.2 : compSpeed * 0.85;
            
            cDx = Math.cos(angleAway) * kiteSpeed;
            cDy = Math.sin(angleAway) * kiteSpeed;
            // Al huir o kitear, reinicia el patrullaje
            companion.patrolTimer = 0;
        } 
        // PRIORIDAD 2: Regresar al jugador si se aleja demasiado (Aumentado a 280px para darle espacio de kiteo)
        else if (distToPlayer > 280) {
            let angleToPlayer = Math.atan2(player.y - companion.y, player.x - companion.x);
            cDx = Math.cos(angleToPlayer) * compSpeed * 1.5; // Corre más rápido para alcanzarte
            cDy = Math.sin(angleToPlayer) * compSpeed * 1.5;
        }
        // PRIORIDAD 2: Regresar al jugador si se aleja demasiado (> 200px)
        else if (distToPlayer > 200) {
            let angleToPlayer = Math.atan2(player.y - companion.y, player.x - companion.x);
            cDx = Math.cos(angleToPlayer) * compSpeed * 1.5; // Corre más rápido para alcanzarte
            cDy = Math.sin(angleToPlayer) * compSpeed * 1.5;
        }
        // PRIORIDAD 3: Patrullaje Libre (Dentro de un radio de 50 a 150px)
        else {
            if (distToPlayer < 50) {
                 // Si está muy pegado a ti, se aleja un poco
                 let angleAwayPlayer = Math.atan2(companion.y - player.y, companion.x - player.x);
                 cDx = Math.cos(angleAwayPlayer) * (compSpeed * 0.5);
                 cDy = Math.sin(angleAwayPlayer) * (compSpeed * 0.5);
            } else if (distToPlayer > 150) {
                // Si está llegando al límite de patrulla, gira suavemente hacia ti
                companion.patrolAngle = Math.atan2(player.y - companion.y, player.x - companion.x) + (Math.random() - 0.5);
                cDx = Math.cos(companion.patrolAngle) * (compSpeed * 0.8);
                cDy = Math.sin(companion.patrolAngle) * (compSpeed * 0.8);
            } else {
                 // Movimiento de patrullaje normal
                 cDx = Math.cos(companion.patrolAngle) * (compSpeed * 0.8);
                 cDy = Math.sin(companion.patrolAngle) * (compSpeed * 0.8);
            }
        }

        // --- APLICAR EL MOVIMIENTO Y COLISIONES ---
        let nCX = companion.x + cDx, colCX = false;
        for (let obs of obstacles) if (isColliding(nCX, companion.y, obs)) { colCX = true; break; }
        if (!colCX) companion.x = nCX;
        
        let nCY = companion.y + cDy, colCY = false;
        for (let obs of obstacles) if (isColliding(companion.x, nCY, obs)) { colCY = true; break; }
        if (!colCY) companion.y = nCY;

        // --- ANIMACIÓN ---
        companion.state = (cDx !== 0 || cDy !== 0) ? 'walk' : 'idle';
        companion.frameTimer++;
        if (companion.frameTimer >= companion.animationSpeed) {
            companion.frameX = (companion.frameX + 1) % 4;
            companion.frameTimer = 0;
        }
        if (companion.hitTimer > 0) companion.hitTimer--;

// --- 3. SISTEMA DE DISPARO DEL COMPAÑERO ---
        if (companion.fireCooldown > 0) companion.fireCooldown--;
        if (nearestSlime && minDist < 350 && companion.fireCooldown <= 0) {
            let compProjectiles = Math.min(player.projectiles, 3); // Máximo 3 proyectiles
            let compPiercing = Math.min(player.piercing, 2);       // Máximo +2 de perforación
            let spA = player.spread;

            for (let p = 0; p < compProjectiles; p++) {
                let baseAng = Math.atan2(nearestSlime.y - companion.y, nearestSlime.x - companion.x);
                let ang = baseAng;
                if (compProjectiles > 1) ang += (p - (compProjectiles - 1) / 2) * (spA / Math.max(1, compProjectiles - 1));

                bullets.push({
                    x: companion.x, y: companion.y - 15,
                    vx: Math.cos(ang) * bulletSpeed, vy: Math.sin(ang) * bulletSpeed,
                    angle: ang, width: 32, height: 32, scale: 1.5, state: 'flying', 
                    frameX: 0, frameTimer: 0, animationSpeed: 5, traveled: 0, 
                    physDmg: companion.physDmg, magicDmg: companion.magicDmg,
                    knockback: player.knockback * 0.4, // Empuje al 40%
                    piercing: compPiercing, hitEnemies: [], element: 'none',
                    isCompanion: true // Identificador para reducir el robo de vida y penetración al 50%
                });
            }
            // Cadencia al 35% de la Velocidad de Ataque del jugador
            let compAtkSpeed = Math.max(0.1, player.atkSpeed * 0.35);
            companion.fireCooldown = Math.max(15, Math.floor(120 / compAtkSpeed)); 
        }
    }

for (let i = slimes.length - 1; i >= 0; i--) {
    let s = slimes[i];

    // --- SI EL TIEMPO ESTÁ DETENIDO, LOS SLIMES SE CONGELAN POR COMPLETO ---
    if (isTimeStopped) {
        continue; 
    }

    // --- A PARTIR DE AQUÍ EL TIEMPO FLUYE NORMALMENTE ---
        let rX = 0, rY = 0;

        if (s.poisonTimer > 0) { 
            s.poisonTimer--; 
            if (s.poisonTimer % 60 === 0) {
                let poisonDmg = Math.max(1, s.hp * 0.015);
                s.hp -= poisonDmg;
                damageTexts.push({
                    text: Math.round(poisonDmg),
                    x: s.x + (Math.random() * 20 - 10),
                    y: s.y - 15,
                    color: '#165225',
                    life: 40,
                    alpha: 1.0
                });
            }
        }

        if (s.fireTimer > 0) { 
            s.fireTimer--; 
            if (s.fireTimer % 60 === 0) {
                let fireDmg = Math.max(1, s.hp * 0.015);
                s.hp -= fireDmg;
                damageTexts.push({
                    text: Math.round(fireDmg),
                    x: s.x + (Math.random() * 20 - 10),
                    y: s.y - 15,
                    color: '#A90101',
                    life: 40,
                    alpha: 1.0
                });
            }
        }

        if (s.iceTimer > 0) { s.iceTimer--; }

if (s.hp <= 0) {
            if (selectedTarget === s) selectedTarget = null;
            spawnExpOrb(s.x, s.y);
            score += 10;
            if (equippedSkills.escudo) {
                player.killCount++;
                if (player.killCount >= 40) {
                    player.killCount = 0;
                    player.shield = Math.min(120, player.shield + 50);
                }
            }
            
slimes.splice(i, 1);
            continue;
        }

        if (s.isImmortal) {
            s.immortalTimer--;
            if (s.immortalTimer <= 0) s.isImmortal = false;
        }

        let pDist = Math.hypot(player.x - s.x, player.y - s.y);
        if (s.hasAlgoMas && pDist < 70) {
            player.algoMasDebuff = 2;
        }

        if (s.calidadTimer !== undefined && s.calidadTimer > 0) s.calidadTimer--;
        
        let bonusSlimeSpd = (s.calidadTimer > 0) ? 0.8 : 0;
        let sSpd = Math.max(0.1, (s.speed + bonusSlimeSpd) - (s.iceTimer > 0 ? 0.7 : 0));
        
        // Determinar el objetivo más cercano para el slime (Jugador o Compañero)
        let targetX = player.x;
        let targetY = player.y;
        
        if (companion.active && companion.alive) {
            let distToPlayer = Math.hypot(player.x - s.x, player.y - s.y);
            let distToCompanion = Math.hypot(companion.x - s.x, companion.y - s.y);
            
            if (distToCompanion < distToPlayer) {
                targetX = companion.x;
                targetY = companion.y;
            }
        }
        
let a = Math.atan2(targetY - s.y, targetX - s.x);
        let distToTarget = Math.hypot(targetX - s.x, targetY - s.y);
        
        let moveX = 0;
        let moveY = 0;

if (s.type === 'ojo' || s.type === 'ojoMorado') {
            // --- KITEO: Mantener distancia entre 200 y 250 ---
            if (distToTarget > 250) {
                moveX = (Math.cos(a) * sSpd) + (rX * 0.8);
                moveY = (Math.sin(a) * sSpd) + (rY * 0.8);
            } else if (distToTarget < 200) {
                // Si estás muy cerca, retrocede
                moveX = -(Math.cos(a) * sSpd) + (rX * 0.8);
                moveY = -(Math.sin(a) * sSpd) + (rY * 0.8);
            }

            // --- LÓGICA DE DISPARO ---
            if (s.fireCooldown === undefined) s.fireCooldown = 0;
            if (s.fireCooldown > 0) s.fireCooldown--;

// Dispara si estás a la vista y tiene el enfriamiento listo
            if (distToTarget < 350 && s.fireCooldown <= 0) {
                let isPurple = (s.type === 'ojoMorado');
                let pSpeed = isPurple ? 1.5 : 4.5; // Disparo muy lento y amenazante para el morado
                let pRange = isPurple ? 900 : 400; // Rango masivo de distancia para el morado (900 píxeles)
                
                bullets.push({
                    x: s.x, y: s.y - 15,
                    vx: Math.cos(a) * pSpeed, 
                    vy: Math.sin(a) * pSpeed, 
                    angle: a, width: 32, height: 32, 
                    scale: isPurple ? 2.8 : 1.5, 
                    state: 'flying', 
                    frameX: 0, frameTimer: 0, animationSpeed: 5, traveled: 0, 
                    maxRange: pRange, // Asignamos su propio límite de distancia
                    physDmg: s.physDmg * (isPurple ? 2.2 : 1.5), 
                    magicDmg: s.magicDmg * (isPurple ? 2.2 : 1.5), 
                    knockback: 0, piercing: 1, hitEnemies: [], element: 'none',
                    isEnemyBullet: true 
                });
                s.fireCooldown = isPurple ? 200 : 120; // Ajustamos un poco la cadencia por lo imponente del proyectil
            }
        } else {
            // Slime cuerpo a cuerpo normal
            moveX = (Math.cos(a) * sSpd) + (rX * 0.8);
            moveY = (Math.sin(a) * sSpd) + (rY * 0.8);
        }
        
        s.x += moveX;
        s.y += moveY;

        s.frameTimer++;
        if (s.frameTimer >= s.animationSpeed) {
            s.frameX = (s.frameX + 1) % 4; 
            s.frameTimer = 0;
        }

// COLISIÓN Y DAÑO AL JUGADOR (CON MITIGACIÓN DE ARMADURA)
        let collisionDist = s.isGiant ? 90 : 40;
            if (Math.hypot(player.x - s.x, player.y - s.y) < collisionDist) {
            if (s.hasQuimica && Math.random() < 0.3) {
                player.algoMasDebuff = 60;
            }

            // Calculamos el daño base del slime mitigado por las estadísticas del jugador
            let rawDmg = s.physDmg * 0.5; // Ajustado para que no sea instakill
            let effPR = player.physRes + (player.arrepentimientoStacks * 3);
            let mitigation = 100 / (100 + effPR);
            let finalDmg = rawDmg * mitigation;

            if (player.shield > 0) {
                let absorbed = Math.min(player.shield, finalDmg);
                player.shield -= absorbed;
                finalDmg -= absorbed;
            }

            if (finalDmg > 0) {
                player.hp -= finalDmg;
                player.hitTimer = 15;
            }
            
            if (equippedSkills.consecuencias) {
                if (player.arrepentimientoStacks < 5) {
                    player.arrepentimientoStacks++;
                }
                player.arrepentimientoTimer = 120;
            }
            
            if (player.hp <= 0) {
                saveScore();
                gameState = 'menu';
                document.getElementById('menu-main').classList.remove('hidden');
                document.getElementById('touch-controls')?.classList.add('hidden');
                document.getElementById('pc-hud')?.classList.add('hidden');
                document.getElementById('ui-pause-btn').classList.add('hidden');
            }
        }

        // --- DAÑO AL COMPAÑERO (INDEPENDIENTE Y MITIGADO) ---
        if (companion.active && companion.alive && Math.hypot(companion.x - s.x, companion.y - s.y) < 40) {
            let rawDmg = s.physDmg * 0.5;
            let compPR = player.physRes * 0.9;
            let compMR = player.magicRes * 0.9;
            let mitigation = 100 / (100 + compPR + compMR);
            
            companion.hp -= (rawDmg * mitigation);
            companion.hitTimer = 15;
            
            if (companion.hp <= 0) {
                companion.alive = false; 
            }
        }

        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            if (b.isEnemyBullet) continue;
                if (!b.hitEnemies.includes(s) && Math.hypot(b.x - s.x, b.y - s.y) < 30) {
                b.hitEnemies.push(s);

                if (b.element === 'poison') { s.poisonTimer = 300; }
                else if (b.element === 'ice') { s.iceTimer = 120; }
                else if (b.element === 'fire') { s.fireTimer = 300; }

                if (equippedSkills.calidad && Math.random() < 0.10) {
                    s.calidadTimer = 240;
                }

                if (b.knockback > 0) {
                    let kA = Math.atan2(s.y - player.y, s.x - player.x);
                    s.x += Math.cos(kA) * (b.knockback * 8);
                    s.y += Math.sin(kA) * (b.knockback * 8);
                }

            let sPR = (s.physRes + (s.iceTimer > 0 ? 20 : 0) - (s.fireTimer > 0 ? 15 : 0)) * ((s.calidadTimer > 0) ? 0.93 : 1); 
            let sMR = (s.magicRes + (s.iceTimer > 0 ? 20 : 0) - (s.poisonTimer > 0 ? 15 : 0)) * ((s.calidadTimer > 0) ? 0.93 : 1);

            let statMult = b.isCompanion ? 0.5 : 1; 
            let eA = Math.max(0, (sPR * (1 - (player.armorPenPct * statMult) / 100)) - (player.lethality * statMult));
            let fP = b.physDmg * (100 / (100 + eA));
            if (fP > 0) {
              damageTexts.push({
               text: Math.round(fP), x: s.x + (Math.random() * 20 - 10), y: s.y - 10,
               color: '#CA4213', life: 40, alpha: 1.0
        });
    }

    let eM = Math.max(0, (sMR * (1 - (player.magicPenPct * statMult) / 100)) - (player.magicPenFlat * statMult));
    let fM = b.magicDmg * (100 / (100 + eM));
    if (fM > 0) {
        damageTexts.push({
            text: Math.round(fM), x: s.x + (Math.random() * 20 - 10), y: s.y - 25,
            color: '#430357', life: 40, alpha: 1.0
        });
    }

                let tD = fP + fM;

                if (s.hasManta && s.mantaStacks < 3) {
                    s.mantaStacks++;
                    s.maxHp += 5; s.hp += 5;
                    s.physRes += 5; s.magicRes += 5;
                }

                if (!s.isImmortal) {
                    s.hp -= tD;
                    if (s.hasInevitable && s.hp <= 1) {
                        s.hp = 1;
                        s.isImmortal = true;
                        s.activatedInevitable = true;
                        s.hasInevitable = false;
                        s.immortalTimer = 180;
                    }
                }

                let hD = 0;
                if (player.lifesteal > 0) hD += fP * (player.lifesteal / 100);
                if (player.sustain > 0) hD += tD * (player.sustain / 100);
                if (hD > 0) {
                    hD *= (1 + player.healPower / 100);
                    player.hp = Math.min(player.maxHp, player.hp + hD);
                }

                b.piercing--;
                if (b.piercing <= 0 && b.state === 'flying') {
                    b.state = 'hitting';
                    b.frameX = 4;
                    b.vx = 0; 
                    b.vy = 0;
                }

                if (s.hp <= 0) {
                    if (selectedTarget === s) selectedTarget = null;
                    spawnExpOrb(s.x, s.y);
                    score += 10;
                    if (equippedSkills.escudo) {
                        player.killCount++;
                        if (player.killCount >= 40) {
                            player.killCount = 0;
                            player.shield = Math.min(120, player.shield + 50);
                        }
                    }             
                    slimes.splice(i, 1);
                    break;
                }
            }
        }
    }

for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];

        // Si el tiempo está detenido, aplicamos el avance progresivo especial de los 4 frames
        if (isTimeStopped) {
            // Inicializamos propiedades de congelación progresiva si la bala acaba de ser disparada en The World
            if (b.timestopTravelCount === undefined) {
                b.timestopTravelCount = 0; // Contará hasta 4 pasos/frames de avance
            }

            // Si aún no ha completado sus 4 pasos progresivos de desaceleración
            if (b.timestopTravelCount < 4) {
                b.timestopTravelCount++;
                
                // Velocidad progresivamente más lenta en cada uno de los 4 frames (ej. factor 0.5, 0.25, 0.1, 0.05)
                let progressiveFactor = Math.pow(0.5, b.timestopTravelCount);
                let currentStepSpeed = bulletSpeed * progressiveFactor;

                b.x += b.vx * (currentStepSpeed / bulletSpeed);
                b.y += b.vy * (currentStepSpeed / bulletSpeed);
                b.traveled += currentStepSpeed;

                // Avanzamos la animación suavemente de forma muy lenta
                b.frameTimer++;
                if (b.frameTimer >= b.animationSpeed * 2) {
                    b.frameTimer = 0;
                    if (b.frameX < 3) b.frameX++;
                }
            }
            // Si ya dio sus 4 pasos, se queda completamente estática en el tiempo sin explotar
            continue; 
        } else {
            // Si el tiempo se reanuda, limpiamos el contador para que pueda avanzar normal si vuelve a activarse
            if (b.timestopTravelCount !== undefined) {
                b.timestopTravelCount = undefined;
            }
        }

        // --- FLUJO NORMAL DE LA BALA (CUANDO EL TIEMPO NO ESTÁ DETENIDO) ---
        b.frameTimer++;
        if (b.frameTimer >= b.animationSpeed) {
            b.frameTimer = 0;
            
            if (b.state === 'flying') {
                if (b.frameX < 3) {
                    b.frameX++;
                } else {
                    b.frameX = 1; 
                }
            } else if (b.state === 'hitting') {
                b.frameX++;
                if (b.frameX > 5) {
                    bullets.splice(i, 1);
                    continue;
                }
            }
        }

if (b.state === 'flying') {
            b.x += b.vx; 
            b.y += b.vy; 
            // Incrementamos la distancia recorrida basada en la velocidad real de cada bala
            b.traveled += Math.hypot(b.vx, b.vy);

            let allowedRange = b.maxRange || bulletMaxRange;

            let hO = false;
            for (let obs of obstacles) {
                let oL = obs.x - (obs.width * obs.scale) / 3, oR = obs.x + (obs.width * obs.scale) / 3;
                let oT = obs.y - (obs.height * obs.scale) / 3, oB = obs.y + (obs.height * obs.scale) / 3;
                if (b.x > oL && b.x < oR && b.y > oT && b.y < oB) { hO = true; break; }
            }

            if (b.traveled >= allowedRange || hO) {
                b.state = 'hitting';
                b.frameX = 4;
                b.vx = 0; 
                b.vy = 0;
            }
            if (b.isEnemyBullet && b.state === 'flying') {
                // Te golpea a ti
                if (Math.hypot(b.x - player.x, b.y - player.y) < 25) {
                    let effPR = player.physRes + (player.arrepentimientoStacks * 3);
                    let mitigation = 100 / (100 + effPR);
                    let finalDmg = b.physDmg * mitigation;

                    if (player.shield > 0) {
                        let absorbed = Math.min(player.shield, finalDmg);
                        player.shield -= absorbed;
                        finalDmg -= absorbed;
                    }

                    if (finalDmg > 0) {
                        player.hp -= finalDmg;
                        player.hitTimer = 15;
                    }
                    
                    if (equippedSkills.consecuencias) {
                        if (player.arrepentimientoStacks < 5) player.arrepentimientoStacks++;
                        player.arrepentimientoTimer = 120;
                    }

                    b.state = 'hitting'; b.frameX = 4; b.vx = 0; b.vy = 0;

                    if (player.hp <= 0) {
                        saveScore(); gameState = 'menu';
                        document.getElementById('menu-main').classList.remove('hidden');
                        document.getElementById('touch-controls')?.classList.add('hidden');
                        document.getElementById('pc-hud')?.classList.add('hidden');
                        document.getElementById('ui-pause-btn').classList.add('hidden');
                    }
                }
                // Golpea al compañero
                else if (companion.active && companion.alive && Math.hypot(b.x - companion.x, b.y - companion.y) < 25) {
                    let compPR = player.physRes * 0.9;
                    let compMR = player.magicRes * 0.9;
                    let mitigation = 100 / (100 + compPR + compMR);
                    
                    companion.hp -= (b.physDmg * mitigation);
                    companion.hitTimer = 15;
                    if (companion.hp <= 0) companion.alive = false;

                    b.state = 'hitting'; b.frameX = 4; b.vx = 0; b.vy = 0;
                }
            }
        }
    }

// --- ACTUALIZACIÓN Y LIMPIEZA DE NÚMEROS DE DAÑO ---
    for (let i = damageTexts.length - 1; i >= 0; i--) {
        let dt = damageTexts[i];
        dt.y -= 0.8;
        dt.life--;
        dt.alpha = dt.life / 40;

        if (dt.life <= 0) {
            damageTexts.splice(i, 1);
        }
    }

for (let i = orbs.length - 1; i >= 0; i--) {
        let o = orbs[i];
        
        // --- ANIMAR LA MONEDA ---
        o.frameTimer++;
        if (o.frameTimer >= o.animationSpeed) {
         o.frameX = (o.frameX + 1) % 16; 
         o.frameTimer = 0;
        }

        let d = Math.hypot(player.x - o.x, player.y - o.y);
        if (d < 120) {
            let a = Math.atan2(player.y - o.y, player.x - o.x);
            o.x += Math.cos(a) * 4; 
            o.y += Math.sin(a) * 4;
            
            let currentDist = Math.hypot(player.x - o.x, player.y - o.y);
            if (currentDist < 20) {
                orbs.splice(i, 1);
                currentExp++;
                if (currentExp >= maxExp) {
                    currentExp -= maxExp;
                    level++;
                    maxExp = Math.floor(maxExp * 1.25);
                    triggerLevelUp();
                }
            }
        }
    }
}
const kcSpriteCache = new Map();
function getKCSprite(img) {
    if (!kcSpriteCache.has(img)) {
        let tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        let tCtx = tempCanvas.getContext('2d');
        // Aplicamos el filtro costoso UNA sola vez
        tCtx.filter = 'brightness(70%) sepia(100%) hue-rotate(-50deg) saturate(500%)';
        tCtx.drawImage(img, 0, 0);
        kcSpriteCache.set(img, tempCanvas);
    }
    return kcSpriteCache.get(img);
}
// --- BUCLE PRINCIPAL DE DIBUJO ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (gameState === 'menu' || gameState === 'charselect' || gameState === 'growing') return;

    let cX = Math.max(0, Math.min(mapWidth - canvas.width, player.x - canvas.width / 2));
    let cY = Math.max(0, Math.min(mapHeight - canvas.height, player.y - canvas.height / 2));

    ctx.save();
// --- LÓGICA DE SACUDIDA DE CÁMARA (SCREEN SHAKE) ---
    let currentShakeX = 0;
    let currentShakeY = 0;
    if (typeof shakeTimer !== 'undefined' && shakeTimer > 0) {
        shakeTimer--;
        currentShakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
        currentShakeY = (Math.random() - 0.5) * 2 * shakeIntensity;
    }

// Aplicamos la traslación sumándole el temblor aleatorio
    ctx.translate(-cX + currentShakeX, -cY + currentShakeY);

    if (groundPattern) {
        ctx.fillStyle = groundPattern;
    } else {
        ctx.fillStyle = '#78a25b';
    }
    ctx.fillRect(0, 0, mapWidth, mapHeight);

for (let o of orbs) {
    if (imgMonedaXP.complete && imgMonedaXP.naturalWidth > 0) {
        const frameW = 32; 
        const frameH = 32;
        const scaleMoneda = 0.6; // Ajusta el tamaño visual en mapa si la ves grande o pequeña

        ctx.drawImage(
            imgMonedaXP,
            o.frameX * frameW, 0,
            frameW, frameH,
            o.x - (frameW * scaleMoneda) / 2,
            o.y - (frameH * scaleMoneda) / 2,
            frameW * scaleMoneda,
            frameH * scaleMoneda
        );
    } else {
        ctx.beginPath(); ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f'; ctx.fill(); ctx.closePath();
    }
}

    let dw = [];
    for (let r of rocks) dw.push({ t: 'r', o: r, s: r.y + (r.width * r.scale) / 2 });
    for (let t of trees) dw.push({ t: 't', o: t, s: t.y + (t.height * t.scale) / 2 });
    for (let s of slimes) dw.push({ t: 's', o: s, s: s.y + (s.height * s.scale) / 2 });
    dw.push({ t: 'p', o: player, s: player.y + (player.height * player.scale) / 2 });
    for (let g of kcGhosts) {
        dw.push({ t: 'kc', o: g, s: g.y + (player.height * player.scale) / 2 });
    }
    if (companion.active && companion.alive) {
        dw.push({ t: 'c', o: companion, s: companion.y + (companion.height * companion.scale) / 2 });
    }
    for (let b of bullets) {
        let sortY = b.state === 'hitting' ? b.y + 100 : b.y;
        dw.push({ t: 'b', o: b, s: sortY });
    }
    
    dw.sort((a, b) => a.s - b.s);

    // 2. DIBUJAMOS TODOS LOS ELEMENTOS DEL MUNDO (CON SU COLOR NORMAL)
    for (let i of dw) {
        if (i.t === 'r' && imgRock.complete) {
            ctx.drawImage(imgRock, i.o.x - (i.o.width * i.o.scale) / 2, i.o.y - (i.o.width * i.o.scale) / 2, i.o.width * i.o.scale, i.o.width * i.o.scale);
        } else if (i.t === 't' && imgTree.complete) {
            ctx.drawImage(imgTree, i.o.x - (i.o.width * i.o.scale) / 2, i.o.y - (i.o.height * i.o.scale) / 2, i.o.width * i.o.scale, i.o.height * i.o.scale);
} else if (i.t === 's') {
        if (i.o.type === 'ojo' || i.o.type === 'ojoMorado') {
                let currentEyeImg = (i.o.type === 'ojoMorado') ? imgOjoMorado : imgOjo;
                if (currentEyeImg.complete) {
                    ctx.save();
                    // Filtros de estado alterado
                    if (i.o.iceTimer > 0) ctx.filter = 'sepia(100%) hue-rotate(180deg) saturate(200%)';
                    else if (i.o.fireTimer > 0) ctx.filter = 'sepia(100%) hue-rotate(-50deg) saturate(300%)';
                    else if (i.o.poisonTimer > 0) ctx.filter = 'sepia(100%) hue-rotate(50deg) saturate(200%)';
                    
                    ctx.drawImage(
                        currentEyeImg, 
                        i.o.frameX * i.o.width, 0, 
                        i.o.width, i.o.height, 
                        i.o.x - (i.o.width * i.o.scale) / 2, 
                        i.o.y - (i.o.height * i.o.scale) / 2, 
                        i.o.width * i.o.scale, i.o.height * i.o.scale
                    );
                    ctx.restore();
                }
            }
            else {
                let currentSlimeImg = imgSlimeBase;
                if (i.o.iceTimer > 0) currentSlimeImg = imgSlimeAzul;
                else if (i.o.fireTimer > 0) currentSlimeImg = imgSlimeRojo;
                else if (i.o.poisonTimer > 0) currentSlimeImg = imgSlimeVerde;

                if (currentSlimeImg.complete) {
                    ctx.drawImage(currentSlimeImg, i.o.frameX * i.o.width, 0, i.o.width, i.o.height, i.o.x - (i.o.width * i.o.scale) / 2, i.o.y - (i.o.height * i.o.scale) / 2, i.o.width * i.o.scale, i.o.height * i.o.scale);
                }
                
                if (i.o.hasManta && imgSlimeManto.complete) ctx.drawImage(imgSlimeManto, i.o.frameX * i.o.width, 0, i.o.width, i.o.height, i.o.x - (i.o.width * i.o.scale) / 2, i.o.y - (i.o.height * i.o.scale) / 2, i.o.width * i.o.scale, i.o.height * i.o.scale);
                if (i.o.hasAlgoMas && imgSlimeBrazo.complete) ctx.drawImage(imgSlimeBrazo, i.o.frameX * i.o.width, 0, i.o.width, i.o.height, i.o.x - (i.o.width * i.o.scale) / 2, i.o.y - (i.o.height * i.o.scale) / 2, i.o.width * i.o.scale, i.o.height * i.o.scale);
                if (i.o.hasQuimica && imgSlimeQuimica.complete) ctx.drawImage(imgSlimeQuimica, i.o.frameX * i.o.width, 0, i.o.width, i.o.height, i.o.x - (i.o.width * i.o.scale) / 2, i.o.y - (i.o.height * i.o.scale) / 2, i.o.width * i.o.scale, i.o.height * i.o.scale);
                if ((i.o.hasInevitable || i.o.isImmortal || i.o.activatedInevitable) && imgSlimeInevitable.complete) ctx.drawImage(imgSlimeInevitable, i.o.frameX * i.o.width, 0, i.o.width, i.o.height, i.o.x - (i.o.width * i.o.scale) / 2, i.o.y - (i.o.height * i.o.scale) / 2, i.o.width * i.o.scale, i.o.height * i.o.scale);
            }

            if (i.o.state !== 'hurt' && i.o.hp < i.o.maxHp && i.o.hp > 0 && imgBarraSlime.complete) {
                const totalFramesBarra = 11;
                const frameW = 64; 
                const frameH = 16; 
                const scaleBarra = 0.8; 
                let pctVida = Math.max(0, Math.min(1, i.o.hp / i.o.maxHp));
                let frameIdx = Math.round(pctVida * (totalFramesBarra - 1));
                let bWidth = frameW * scaleBarra;
                let bHeight = frameH * scaleBarra;
                let bX = i.o.x - bWidth / 2;
                let bY = i.o.y - (i.o.height * i.o.scale) / 2 + 2;

                ctx.drawImage(imgBarraSlime, frameIdx * frameW, 0, frameW, frameH, bX, bY, bWidth, bHeight);
            }
            } else if (i.t === 'c') {
            let imgI = imgWalterIdle; let imgW = imgWalterWalk;
            if (companion.char === 'gus') { imgI = imgGusIdle; imgW = imgGusWalk; }
            else if (companion.char === 'jesse') { imgI = imgJesseIdle; imgW = imgJesseWalk; }
            else if (companion.char === 'mike') { imgI = imgMikeIdle; imgW = imgMikeWalk; }
            
            let imgC = companion.state === 'idle' ? imgI : imgW;
            if (imgC.complete) {
                // Dibujar sombra de daño
                if (companion.hitTimer > 0) ctx.filter = 'brightness(200%) sepia(100%) hue-rotate(-50deg) saturate(500%)';
                
                ctx.drawImage(imgC, companion.frameX * companion.width, 0, companion.width, companion.height, companion.x - (companion.width * companion.scale) / 2, companion.y - (companion.height * companion.scale) / 2, companion.width * companion.scale, companion.height * companion.scale);
                ctx.filter = 'none';

                // Barra de vida del compañero encima de su cabeza
                if (imgBarraSocio.complete) {
                    let pctVida = Math.max(0, Math.min(1, companion.hp / companion.maxHp));
                    let frameIdx = Math.round(pctVida * 10); 
                    ctx.drawImage(imgBarraSocio, frameIdx * 64, 0, 64, 16, companion.x - 20, companion.y - 45, 40, 10);
                }
            }
        }           
else if (i.t === 'kc') {
            let g = i.o;
            let imgI = imgWalterIdle; let imgW = imgWalterWalk;
            if (selectedChar === 'gus') { imgI = imgGusIdle; imgW = imgGusWalk; }
            else if (selectedChar === 'jesse') { imgI = imgJesseIdle; imgW = imgJesseWalk; }
            else if (selectedChar === 'mike') { imgI = imgMikeIdle; imgW = imgMikeWalk; }
            
            let img = g.state === 'idle' ? imgI : imgW;
            if (img.complete) {
                let tintedImg = getKCSprite(img); // Llama a la copia ya procesada
                
                ctx.save();
                ctx.globalAlpha = g.life / 25; // Mantiene el desvanecimiento 
                // ctx.filter ya NO es necesario aquí
                ctx.drawImage(tintedImg, g.frameX * player.width, 0, player.width, player.height, g.x - (player.width * player.scale) / 2, g.y - (player.height * player.scale) / 2, player.width * player.scale, player.height * player.scale);
                ctx.restore();
            }
        }
        else if (i.t === 'p') {
            let imgI = imgWalterIdle;
            let imgW = imgWalterWalk;
            
            if (selectedChar === 'gus') {
                imgI = imgGusIdle;
                imgW = imgGusWalk;
            } else if (selectedChar === 'jesse') {
                imgI = imgJesseIdle;
                imgW = imgJesseWalk;
            } else if (selectedChar === 'mike') {
                imgI = imgMikeIdle;
                imgW = imgMikeWalk;
            }
            
            let img = player.state === 'idle' ? imgI : imgW;
            if (img.complete) {
                ctx.drawImage(img, player.frameX * player.width, 0, player.width, player.height, player.x - (player.width * player.scale) / 2, player.y - (player.height * player.scale) / 2, player.width * player.scale, player.height * player.scale);
            }
            } else if (i.t === 'b') {
            let b = i.o;
            let currentBulletImg = imgDisparoBase;
            
            if (b.isEnemyBullet) {
                currentBulletImg = imgDisparoMorado;
            } else {
                if (b.element === 'poison') currentBulletImg = imgDisparoVerde;
                else if (b.element === 'ice') currentBulletImg = imgDisparoAzul;
                else if (b.element === 'fire') currentBulletImg = imgDisparoRojo;
            }

            if (currentBulletImg.complete) {
                ctx.save();
                ctx.translate(b.x, b.y);
                ctx.rotate(b.angle);

                ctx.drawImage(
                    currentBulletImg,
                    b.frameX * b.width, 0,
                    b.width, b.height,
                    -(b.width * b.scale) / 2, -(b.height * b.scale) / 2,
                    b.width * b.scale, b.height * b.scale
                );
                ctx.restore();
            }
        }
    }
    
if (isTimeStopped) {
        // 1. Matizamos con un gris más profundo y subimos la intensidad de la capa a 0.85 para quitarles todo el color por completo
        ctx.fillStyle = 'rgba(128, 128, 128, 1.0)'; 
        ctx.globalCompositeOperation = 'saturation'; 
        ctx.fillRect(0, 0, mapWidth, mapHeight);
        
        // 2. Añadimos una ligera capa extra de sombra monocromática para oscurecer y matizar los tonos oscuros
        ctx.fillStyle = 'rgba(30, 30, 35, 0.45)';
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, mapWidth, mapHeight);

        ctx.globalCompositeOperation = 'source-over';

        // Redibujamos SOLAMENTE al jugador encima para que él sí conserve todo su color original vivo
        let imgI = imgWalterIdle;
        let imgW = imgWalterWalk;
        if (selectedChar === 'gus') { imgI = imgGusIdle; imgW = imgGusWalk; }
        else if (selectedChar === 'jesse') { imgI = imgJesseIdle; imgW = imgJesseWalk; }
        else if (selectedChar === 'mike') { imgI = imgMikeIdle; imgW = imgMikeWalk; }
        
        let imgP = player.state === 'idle' ? imgI : imgW;
        if (imgP.complete) {
            ctx.drawImage(imgP, player.frameX * player.width, 0, player.width, player.height, player.x - (player.width * player.scale) / 2, player.y - (player.height * player.scale) / 2, player.width * player.scale, player.height * player.scale);
        }
    }
    // --- DIBUJAR NÚMEROS FLOTANTES DE DAÑO EN EL MUNDO ---
    ctx.font = '10px "PixelFont", monospace';
    ctx.textAlign = 'center';

    for (let dt of damageTexts) {
        ctx.globalAlpha = dt.alpha;
        
        ctx.fillStyle = '#000000';
        ctx.fillText(dt.text, dt.x + 1, dt.y + 1);
        
        ctx.fillStyle = dt.color;
        ctx.fillText(dt.text, dt.x, dt.y);
    }

// --- ONDAS EXPANSIVAS (Anillos) ---
    for (let w of worldWaves) {
        // Anillo exterior difuminado (morado)
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.lineWidth = 20;
        ctx.strokeStyle = `rgba(180, 50, 255, ${Math.max(0, w.alpha)})`;
        ctx.stroke();
        
        // Anillo interior brillante (blanco)
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0, w.alpha)})`;
        ctx.stroke();
    }

    // --- DESTELLO NEGATIVO (EXPANSIÓN Y CONTRACCIÓN DESDE EL JUGADOR) ---
    if (worldFlashTimer > 0) {
        // Calculamos el progreso de 0 a 1 según el temporizador
        let p = 1 - (worldFlashTimer / worldFlashMax);
        // Radio máximo ampliado para asegurar que cubra toda la pantalla
        let maxRadius = Math.hypot(canvas.width, canvas.height) * 1.2; 
        // Radio actual basado en seno (crece hasta maxRadius y vuelve a 0)
        let radius = Math.max(0.1, maxRadius * Math.sin(p * Math.PI));

        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        
        // Gradiente para que el borde de la inversión de color se difumine y se vea súper limpio
        let grad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)'); // El borde se desvanece suavemente

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // --- AHORA SÍ, RESTAURAMOS LA CÁMARA DESPUÉS DEL EFECTO ---
    ctx.restore(); 

    if (player.hitTimer > 0) {
        let g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height / 3, canvas.width / 2, canvas.height / 2, canvas.height / 1.1);
        g.addColorStop(0, 'rgba(180,0,0,0)');
        g.addColorStop(1, `rgba(180,0,0,${(player.hitTimer / 15) * 0.8})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.textAlign = 'center';
    if (waveIntroTimer > 0) {
        ctx.font = '28px "PixelFont", monospace'; ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
        let tx = isResting ? '¡PREPÁRATE!' : `¡OLEADA ${currentWave}!`;
        ctx.strokeText(tx, canvas.width / 2, 80);
        ctx.fillStyle = isResting ? '#fff' : '#cc0000'; ctx.fillText(tx, canvas.width / 2, 80);
    }

    ctx.font = '12px "PixelFont", monospace'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    
    // --- TEXTO DINÁMICO PARA EL TIEMPO/LIMPIEZA ---
    let ti = '';
    if (isResting) {
        ti = `Descanso: ${Math.ceil(restTimer / 60)}s`;
    } else if (waveTimer > 0) {
        ti = `Tiempo: ${Math.ceil(waveTimer / 60)}s`;
    } else {
        ti = `¡LIMPIA LA ZONA! (${slimes.length} restantes)`;
    }
    
    let it = `${ti} | Puntos: ${score} | Nivel: ${level}`;
    ctx.strokeText(it, canvas.width / 2, 25); ctx.fillStyle = '#fff'; ctx.fillText(it, canvas.width / 2, 25);

// --- TEMPORIZADOR MILISEGUNDOS DE THE WORLD ---
    if (isTimeStopped && timeStopDuration > 0) {
        let sec = Math.floor(timeStopDuration / 1000);
        let ms = Math.floor((timeStopDuration % 1000) / 10); // Milisegundos a dos dígitos
        
        let msText = `${sec}:${ms.toString().padStart(2, '0')}`;
        
        // Hacemos que parpadee levemente
        let pulseAlpha = 0.7 + (Math.sin(Date.now() / 50) * 0.3);
        
        ctx.font = '24px "PixelFont", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(msText, canvas.width / 2, 55); // Justo debajo de los puntos
        
        ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`; // Dorado parpadeante
        ctx.fillText(msText, canvas.width / 2, 55);
    }

// --- BARRA DE VIDA Y ESCUDO ANIMADOS CON PORCENTAJES (HUD) ---
    const startX = 20;
    const startY = 50;
    const scale = 2.5;
    const barWidth = 64 * scale;
    const barHeight = 16 * scale;

    if (imgBarraVida.complete && imgBarraVida.naturalWidth > 0) {
        const totalFramesVida = 11;
        const frameW = 64;
        const frameH = 16;
        
        let pctVida = Math.max(0, Math.min(1, player.hp / player.maxHp));
        let frameIdxVida = Math.round(pctVida * (totalFramesVida - 1));

        ctx.drawImage(
            imgBarraVida,
            frameIdxVida * frameW, 0,
            frameW, frameH,
            startX, startY,
            barWidth, barHeight
        );

        // --- PORCENTAJE DE VIDA A LA DERECHA ---
        let vidaPercent = Math.floor(pctVida * 100);
        ctx.font = '12px "PixelFont", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#000000';
        ctx.fillText(vidaPercent + '%', startX + barWidth + 12, startY + (barHeight / 2) + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(vidaPercent + '%', startX + barWidth + 12, startY + (barHeight / 2));
    }

    if (unlockedSkills.escudo && imgBarraEscudo.complete && imgBarraEscudo.naturalWidth > 0) {
        const totalFramesEscudo = 11;
        const frameW = 64;
        const frameH = 16;
        
        let pctEscudo = Math.max(0, Math.min(1, player.shield / 120));
        let frameIdxEscudo = Math.round(pctEscudo * (totalFramesEscudo - 1));
        let escudoPosY = startY + 42;

        ctx.drawImage(
            imgBarraEscudo,
            frameIdxEscudo * frameW, 0,
            frameW, frameH,
            startX, escudoPosY,
            barWidth, barHeight
        );

        // --- PORCENTAJE DE ESCUDO A LA DERECHA ---
        let escudoPercent = Math.floor(pctEscudo * 100);
        ctx.font = '12px "PixelFont", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        ctx.fillStyle = '#000000';
        ctx.fillText(escudoPercent + '%', startX + barWidth + 12, escudoPosY + (barHeight / 2) + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(escudoPercent + '%', startX + barWidth + 12, escudoPosY + (barHeight / 2));
    }
    
// --- BARRA DE EXPERIENCIA ANIMADA Y TEXTO DE PORCENTAJE (HUD) ---
    if (imgBarraExp.complete && imgBarraExp.naturalWidth > 0) {
        const totalFramesExp = 11;
        const frameW = 64;
        const frameH = 16;
        
        let pctExp = Math.max(0, Math.min(1, currentExp / maxExp));
        let frameIdxExp = Math.round(pctExp * (totalFramesExp - 1));

        let barWidth = frameW * scale;
        let barHeight = frameH * scale;
        let expPosX = (canvas.width / 2) - (barWidth / 2);
        let expPosY = canvas.height - barHeight - 30;

        ctx.drawImage(
            imgBarraExp,
            frameIdxExp * frameW, 0,
            frameW, frameH,
            expPosX, expPosY,
            barWidth, barHeight
        );

        // --- VALOR EN PORCENTAJE DE XP JUSTO A LA DERECHA (DONDE MARCSTE LA X) ---
        let expPercent = Math.floor(pctExp * 100);
        
        ctx.font = '12px "PixelFont", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Sombra negra para que resalte con el fondo
        ctx.fillStyle = '#000000';
        ctx.fillText(expPercent + '%', expPosX + barWidth + 12, expPosY + (barHeight / 2) + 1);
        
        // Texto blanco del porcentaje
        ctx.fillStyle = '#ffffff';
        ctx.fillText(expPercent + '%', expPosX + barWidth + 12, expPosY + (barHeight / 2));
    }
// --- HUD: PANEL DE ESTADÍSTICAS DEL JUGADOR (TECLA TAB) ---
    if (showPlayerStatsPanel && imgMarcoJugador.complete && imgMarcoJugador.naturalWidth > 0) {
        const panelX = 20;
        const panelY = 160; 
        const drawW = 290;  
        const drawH = 225;  

        ctx.drawImage(imgMarcoJugador, panelX, panelY, drawW, drawH);

        // 1. Disminuimos el tamaño de la letra de 10px a 9px
        ctx.font = '9px "PixelFont", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        let textY = panelY + 28; 
        const lineGap = 21;      
        
        // 2. Corremos las columnas más hacia la derecha para alejarlas del borde rojo
        const col1X = panelX + 35;  // Antes estaba en 22
        const col2X = panelX + 170; // Antes estaba en 155
        
        let eS = getEffStats();

        // Función constructora corregida para máxima legibilidad
        function drawStat(label, labelColor, val, startX) {
            // 3. EL SECRETO: Borde negro y un poco más delgado. 
            // Esto hace que el texto blanco y de colores resalte a la perfección sin volverse una mancha.
            ctx.strokeStyle = '#000000'; 
            ctx.lineWidth = 2.5; 
            ctx.lineJoin = 'round'; 
            
            // Dibujar Etiqueta (Ej: "HP:")
            ctx.strokeText(label, startX, textY);
            ctx.fillStyle = labelColor;
            ctx.fillText(label, startX, textY);
            
            // Calculamos el espacio exacto después de la etiqueta
            let valX = startX + ctx.measureText(label + " ").width; 
            
            // Dibujar Valor (Ej: "100/100")
            ctx.strokeText(val, valX, textY);
            ctx.fillStyle = '#FFFFFF'; // Relleno blanco con el borde negro
            ctx.fillText(val, valX, textY);
        }

        // --- RENDERIZADO DE LAS 9 FILAS ---
        
        // Fila 1
        drawStat('HP:', '#4E5E07', `${Math.floor(player.hp)}/${Math.floor(player.maxHp)}`, col1X);
        drawStat('ESC:', '#8D8179', `${Math.floor(player.shield)}`, col2X);
        textY += lineGap;

        // Fila 2
        drawStat('RF:', '#EDD600', `${eS.pr.toFixed(1)}`, col1X);
        drawStat('RM:', '#499BED', `${eS.mr.toFixed(1)}`, col2X);
        textY += lineGap;

        // Fila 3
        drawStat('DF:', '#CA4213', `${Math.floor(player.physDmg)}`, col1X);
        drawStat('DM:', '#430357', `${Math.floor(player.magicDmg)}`, col2X);
        textY += lineGap;

        // Fila 4
        drawStat('VM:', '#FAFAFA', `${eS.spd.toFixed(2)}`, col1X);
        drawStat('VA:', '#FBF3A7', `${(player.atkSpeed * (isTimeStopped ? 1.8 : 1)).toFixed(1)}`, col2X);
        textY += lineGap;

        // Fila 5
        drawStat('RV:', '#A90101', `${player.lifesteal}%`, col1X);
        drawStat('SUC:', '#C40361', `${player.sustain}%`, col2X);
        textY += lineGap;

        // Fila 6
        drawStat('PA:', '#943A02', `${player.armorPenPct}%`, col1X);
        drawStat('LET:', '#943A02', `${player.lethality}`, col2X);
        textY += lineGap;

        // Fila 7
        drawStat('PM:', '#A95993', `${player.magicPenPct}%`, col1X);
        drawStat('PF:', '#A95993', `${player.magicPenFlat}`, col2X);
        textY += lineGap;

        // Fila 8
        drawStat('EMP:', '#011F28', `${player.knockback}`, col1X);
        drawStat('PER:', '#011F28', `${player.piercing}`, col2X);
        textY += lineGap;

        // Fila 9
        drawStat('CURACIÓN:', '#729969', `+${player.healPower}%`, col1X);
    }

// --- MARCO DEL OBJETIVO SELECCIONADO Y PANEL DE INFO (PERGAMINO) ---
    if (selectedTarget && imgMarcoGrande.complete) {
        const frameX = 20;
        const frameY = 150;
        const frameSize = 100;

        // 1. Dibujar el marco grande del slime
        ctx.drawImage(imgMarcoGrande, frameX, frameY, frameSize, frameSize);

        const centerX = frameX + frameSize / 2;
        const centerY = frameY + frameSize / 2;

        let currentTargetImg = imgSlimeBase;
        if (selectedTarget.iceTimer > 0) currentTargetImg = imgSlimeAzul;
        else if (selectedTarget.fireTimer > 0) currentTargetImg = imgSlimeRojo;
        else if (selectedTarget.poisonTimer > 0) currentTargetImg = imgSlimeVerde;

        if (currentTargetImg.complete) {
            ctx.drawImage(
                currentTargetImg,
                selectedTarget.frameX * selectedTarget.width, 0,
                selectedTarget.width, selectedTarget.height,
                centerX - 30, centerY - 30,
                60, 60
            );

            if (selectedTarget.hasManta && imgSlimeManto.complete) {
                ctx.drawImage(imgSlimeManto, selectedTarget.frameX * selectedTarget.width, 0, selectedTarget.width, selectedTarget.height, centerX - 30, centerY - 30, 60, 60);
            }
            if (selectedTarget.hasAlgoMas && imgSlimeBrazo.complete) {
                ctx.drawImage(imgSlimeBrazo, selectedTarget.frameX * selectedTarget.width, 0, selectedTarget.width, selectedTarget.height, centerX - 30, centerY - 30, 60, 60);
            }
            if (selectedTarget.hasQuimica && imgSlimeQuimica.complete) {
                ctx.drawImage(imgSlimeQuimica, selectedTarget.frameX * selectedTarget.width, 0, selectedTarget.width, selectedTarget.height, centerX - 30, centerY - 30, 60, 60);
            }
            if ((selectedTarget.hasInevitable || selectedTarget.isImmortal || selectedTarget.activatedInevitable) && imgSlimeInevitable.complete) {
    ctx.drawImage(imgSlimeInevitable, selectedTarget.frameX * selectedTarget.width, 0, selectedTarget.width, selectedTarget.height, centerX - 30, centerY - 30, 60, 60);
            }
        }

        // 2. Dibujar el pergamino de estadísticas al lado derecho del marco principal
        if (imgPergamino.complete && imgPergamino.naturalWidth > 0) {
            const pergaminoX = frameX + frameSize + 8;
            const pergaminoY = frameY;
            const pergaminoW = 100;
            const pergaminoH = 100;

            ctx.drawImage(imgPergamino, pergaminoX, pergaminoY, pergaminoW, pergaminoH);

            // --- RENDERIZAR TEXTOS DINÁMICOS DENTRO DEL PERGAMINO ---
            ctx.font = '8px "PixelFont", monospace';
            ctx.textBaseline = 'middle';

            const textX = pergaminoX + 38;

            // A. VIDA (Fila superior - Negro)
            let vidaText = `${Math.floor(selectedTarget.hp)}/${Math.floor(selectedTarget.maxHp)}`;
            ctx.textAlign = 'left';
            ctx.fillStyle = '#000000'; 
            ctx.fillText(vidaText, textX, pergaminoY + 28);

            // B. DAÑO (Fila central - Físico Naranja - Mágico Morado)
            let physStr = `${Math.floor(selectedTarget.physDmg || 5)}`;
            let magicStr = `${Math.floor(selectedTarget.magicDmg || 5)}`;
            let dmgY = pergaminoY + 51;

            let currentX = textX;

            // Daño Físico (Naranja)
            ctx.fillStyle = '#CA4213';
            ctx.fillText(physStr, currentX, dmgY);
            currentX += ctx.measureText(physStr).width;

            // Guion separador sin espacios (Negro)
            ctx.fillStyle = '#000000';
            ctx.fillText("-", currentX, dmgY);
            currentX += ctx.measureText("-").width;

            // Daño Mágico (Morado)
            ctx.fillStyle = '#430357';
            ctx.fillText(magicStr, currentX, dmgY);

// C. RESISTENCIAS (Fila inferior - Física Naranja - Mágica Celeste #499BED o Vinotinto #6A1823 si es negativo)
            let effSlimePR = (selectedTarget.physRes || 10) + (selectedTarget.iceTimer > 0 ? 20 : 0) - (selectedTarget.fireTimer > 0 ? 15 : 0);
            let effSlimeMR = (selectedTarget.magicRes || 10) + (selectedTarget.iceTimer > 0 ? 20 : 0) - (selectedTarget.poisonTimer > 0 ? 15 : 0);

            if (selectedTarget.calidadTimer > 0) {
                effSlimePR *= 0.93;
                effSlimeMR *= 0.93;
}
            let physResVal = Math.floor(effSlimePR);
            let magicResVal = Math.floor(effSlimeMR);
            
            let physResStr = `${physResVal}`;
            let magicResStr = `${magicResVal}`;
            let resY = pergaminoY + 74;

            currentX = textX;

            // Resistencia Física: Vinotinto (#6A1823) si es negativa, o Naranja (#CA4213) si es normal
            ctx.fillStyle = physResVal < 0 ? '#6A1823' : '#CA4213';
            ctx.fillText(physResStr, currentX, resY);
            currentX += ctx.measureText(physResStr).width;

            // Guion separador sin espacios (Negro)
            ctx.fillStyle = '#000000';
            ctx.fillText("-", currentX, resY);
            currentX += ctx.measureText("-").width;

            // Resistencia Mágica: Vinotinto (#6A1823) si es negativa, o Celeste (#499BED) si es normal
            ctx.fillStyle = magicResVal < 0 ? '#6A1823' : '#499BED';
            ctx.fillText(magicResStr, currentX, resY);
        }
    }
    // --- HUD: ÍCONO DE THE WORLD ---
    if (unlockedSkills.theWorld && equippedSkills.theWorld && imgIconTheWorld.complete) {
const iconSize = 32;
    const iconScale = 2;
    const iconW = iconSize * iconScale; // 64
    const iconH = iconSize * iconScale; // 64
    const iconX = 20; // Esquina izquierda común

    // --- HUD: ÍCONO DE KING CRIMSON (Arriba) ---
    if (unlockedSkills.kingCrimson && equippedSkills.kingCrimson && imgIconTheWorld.complete) {
        // Se ubica 15 píxeles arriba del icono de The World
        const kcIconY = canvas.height - (iconH * 2) - 35; 

        ctx.save();
        
        // Si está en enfriamiento, se ve gris y semitransparente. Si está listo, brilla en tonos rojizos.
        if (kcCooldown > 0) {
            ctx.filter = 'grayscale(100%) opacity(50%)';
        } else {
            // Filtro para teñir el reloj de color rojo característico de King Crimson
            ctx.filter = 'sepia(100%) hue-rotate(-50deg) saturate(500%) brightness(90%)';
        }
        
        ctx.drawImage(imgIconTheWorld, 0, 0, iconSize, iconSize, iconX, kcIconY, iconW, iconH);
        ctx.restore();

        // Mostrar temporizador de enfriamiento en segundos si está activo
        if (kcCooldown > 0) {
            let kcSecondsLeft = (kcCooldown / 60).toFixed(1); // Muestra segundos con un decimal (ej: 4.5s)
            let kcTimeString = `${kcSecondsLeft}s`;
            
            ctx.save();
            ctx.font = '20px "PixelFont", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Sombra negra
            ctx.fillStyle = '#000000';
            ctx.fillText(kcTimeString, iconX + iconW + 12, kcIconY + (iconH / 2) + 2);
            
            // Texto rojo brillante
            ctx.fillStyle = '#ff4d4d';
            ctx.fillText(kcTimeString, iconX + iconW + 12, kcIconY + (iconH / 2));
            ctx.restore();
        }
    }

    // --- HUD: ÍCONO DE THE WORLD (Abajo) ---
    if (unlockedSkills.theWorld && equippedSkills.theWorld && imgIconTheWorld.complete) {
        const worldIconY = canvas.height - iconH - 20; // Esquina inferior original

        ctx.save();
        
        // Si está en enfriamiento, aplicamos filtro gris y algo de transparencia
        if (timeStopCooldown > 0 || isTimeStopped) {
            ctx.filter = 'grayscale(100%) opacity(50%)';
        }
        
        ctx.drawImage(imgIconTheWorld, 0, 0, iconSize, iconSize, iconX, worldIconY, iconW, iconH);
        
        ctx.filter = 'none'; // Restaurar filtros a la normalidad

        // Si está en enfriamiento, dibujar el temporizador (minutos : segundos)
        if (timeStopCooldown > 0 && !isTimeStopped) {
            let secondsLeft = Math.ceil(timeStopCooldown / 60);
            let m = Math.floor(secondsLeft / 60);
            let s = secondsLeft % 60;
            let timeString = `${m}:${s.toString().padStart(2, '0')}`; // Formato 3:00
            
            ctx.font = '20px "PixelFont", monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Sombra negra
            ctx.fillStyle = '#000000';
            ctx.fillText(timeString, iconX + iconW + 12, worldIconY + (iconH / 2) + 2);
            
            // Texto blanco
            ctx.fillStyle = '#ffffff';
            ctx.fillText(timeString, iconX + iconW + 12, worldIconY + (iconH / 2));
        }
        
        ctx.restore();
    }
}
// --- HUD: PANEL DE ESTADÍSTICAS DEL COMPAÑERO (ESQUINA INFERIOR DERECHA) ---
    if (companion.active && companion.alive && imgMarcoSocio.complete && imgMarcoSocio.naturalWidth > 0) {
        const panelSize = 130;
        const panelScale = 1.45; 
        const drawW = panelSize * panelScale;
        const drawH = panelSize * panelScale;
        
        const panelX = canvas.width - drawW - 20;
        const panelY = canvas.height - drawH - 20;

        ctx.drawImage(imgMarcoSocio, panelX, panelY, drawW, drawH);

        ctx.font = '8px "PixelFont", monospace'; 
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // Coordenada X fija para que todos los textos comiencen alineados en columna (como el slime)
        const textX = panelX + (42 * panelScale); 
        let textY = panelY + (19 * panelScale); 
        const rowGap = 15.3 * panelScale; 

        function drawSingleStat(val, color, x, y) {
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.lineJoin = 'round';
            ctx.strokeText(val, x, y);
            ctx.fillStyle = color;
            ctx.fillText(val, x, y);
        }

        // --- FILA 1: Velocidad de Ataque ---
        let compAtkSpd = (player.atkSpeed * 0.35).toFixed(2);
        drawSingleStat(compAtkSpd, '#FAFAFA', textX, textY);
        textY += rowGap;

        // --- FILA 2: Resistencias (Física - Mágica) ---
        let compPR = Math.floor(player.physRes * 0.9);
        let compMR = Math.floor(player.magicRes * 0.9);
        let resText = `${compPR}-${compMR}`;
        drawSingleStat(resText, '#EDD600', textX, textY);
        textY += rowGap;

        // --- FILA 3: Vida ---
        let hpText = `${Math.floor(companion.hp)}/${Math.floor(companion.maxHp)}`;
        drawSingleStat(hpText, '#FFFFFF', textX, textY);
        textY += rowGap;

        // --- FILA 4: Daño (Físico - Mágico) ---
        let physDmg = `${Math.floor(companion.physDmg)}`;
        let magicDmg = `${Math.floor(companion.magicDmg)}`;
        let dmgText = `${physDmg}-${magicDmg}`;
        drawSingleStat(dmgText, '#CA4213', textX, textY);
        textY += rowGap;

        // --- FILA 5: Robo de Vida y Succión ---
        let compLs = (player.lifesteal * 0.5).toFixed(1);
        let compSus = (player.sustain * 0.5).toFixed(1);
        let lifestealText = `${compLs}%,${compSus}%`;
        drawSingleStat(lifestealText, '#A90101', textX, textY);
        textY += rowGap;

        // --- FILA 6: Velocidad de Movimiento ---
        let compSpd = (player.speed * 0.9).toFixed(2);
        drawSingleStat(compSpd, '#FAFAFA', textX, textY);
        textY += rowGap;

// --- FILA 7: Penetraciones (Física en naranja/marrón y Mágica en morado) ---
        let compArmorPen = (player.armorPenPct * 0.5).toFixed(0);
        let compLethality = Math.floor(player.lethality * 0.5);
        let compMagicPen = (player.magicPenPct * 0.5).toFixed(0);
        let compMagicPerf = Math.floor(player.magicPenFlat * 0.5);

        let physPenText = `${compArmorPen}%,${compLethality}`;
        let separatorText = `-`;
        let magicPenText = `${compMagicPen}%,${compMagicPerf}`;

        // Dibujar parte física
        drawSingleStat(physPenText, '#943A02', textX, textY);
        let curX = textX + ctx.measureText(physPenText).width;

        // Dibujar guion separador en blanco/negro
        drawSingleStat(separatorText, '#FFFFFF', curX, textY);
        curX += ctx.measureText(separatorText).width;

        // Dibujar parte mágica en morado
        drawSingleStat(magicPenText, '#A95993', curX, textY);
    }
    const mS = 120, mX = canvas.width - mS, mY = 0, mC = mS / mapWidth;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mX, mY, mS, mS);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(mX, mY, mS, mS);
    
    ctx.fillStyle = '#999'; for (let r of rocks) ctx.fillRect(mX + r.x * mC - 1, mY + r.y * mC - 1, 2, 2);
    ctx.fillStyle = '#2d6a4f'; for (let t of trees) ctx.fillRect(mX + t.x * mC - 2, mY + t.y * mC - 2, 4, 4);
    ctx.fillStyle = '#8B0000'; for (let s of slimes) { ctx.beginPath(); ctx.arc(mX + s.x * mC, mY + s.y * mC, 1.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(mX + player.x * mC, mY + player.y * mC, 3, 0, Math.PI * 2); ctx.fill();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
requestAnimationFrame(gameLoop);