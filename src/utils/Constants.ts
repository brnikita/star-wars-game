// === Игровые константы ===

// Физика
export const GRAVITY = -20;
export const FIXED_TIME_STEP = 1 / 60;
export const MAX_SUB_STEPS = 3;

// Персонаж K-2SO
export const K2SO_HEIGHT = 2.1;
export const K2SO_WALK_SPEED = 15;
export const K2SO_RUN_SPEED = 27;
export const K2SO_JUMP_FORCE = 8;
export const K2SO_TURN_SPEED = 8;
export const K2SO_MAX_HEALTH = 100;
export const K2SO_MAX_SHIELD = 50;
export const K2SO_SHIELD_REGEN_RATE = 5; // единиц в секунду
export const K2SO_SHIELD_REGEN_DELAY = 3; // секунд после урона

// Укрытие (приседание)
export const K2SO_CROUCH_SPEED_MULT = 0.4; // 40% скорости при приседании
export const K2SO_CROUCH_HEIGHT_SCALE = 0.55; // масштаб модели Y при приседании
export const K2SO_COVER_HEALTH_REGEN_RATE = 3; // HP/с в укрытии
export const K2SO_COVER_HEALTH_REGEN_DELAY = 4; // секунд после урона до начала лечения

// Камера
export const CAMERA_DISTANCE = 5;
export const CAMERA_HEIGHT = 2.5;
export const CAMERA_LERP_SPEED = 5;
export const CAMERA_AIM_DISTANCE = 2.5;
export const CAMERA_AIM_OFFSET_X = 1.2;
export const CAMERA_MIN_PITCH = -0.3;
export const CAMERA_MAX_PITCH = 0.6;
export const CAMERA_SENSITIVITY = 0.002;

// Оружие
export const BLASTER_FIRE_RATE = 0.2; // секунд между выстрелами
export const BLASTER_DAMAGE = 20;
export const BLASTER_SPEED = 60;
export const BLASTER_RANGE = 150;
export const BLASTER_AMMO_MAX = 30;
export const BLASTER_RELOAD_TIME = 1.5;
export const MELEE_DAMAGE = 40;
export const MELEE_RANGE = 2.5;
export const MELEE_COOLDOWN = 0.8;

// Враги — Штурмовик
export const STORMTROOPER_HEALTH = 60;
export const STORMTROOPER_SPEED = 3;
export const STORMTROOPER_ACCURACY = 0.6;
export const STORMTROOPER_FIRE_RATE = 0.8;
export const STORMTROOPER_DETECT_RANGE = 40;
export const STORMTROOPER_ATTACK_RANGE = 35;

// Враги — Турель на гусеницах
export const TURRET_HEALTH = 120;
export const TURRET_SPEED = 1.5;
export const TURRET_ACCURACY = 0.8;
export const TURRET_FIRE_RATE = 1.2;
export const TURRET_DETECT_RANGE = 45;
export const TURRET_ATTACK_RANGE = 40;
export const TURRET_DAMAGE = 10;

// Цвета
export const COLOR_BLASTER_PLAYER = 0x4a9eff; // синий
export const COLOR_BLASTER_ENEMY = 0x44ff44;   // зелёный (джедаи)
export const COLOR_BLASTER_TURRET = 0xff4422;  // красно-оранжевый (турель)
export const COLOR_K2SO_BODY = 0x1a1a1a;       // тёмный металл
export const COLOR_K2SO_EYES = 0xffffff;        // белые глаза
export const COLOR_IMPERIAL_WALL = 0x5a5a5e;    // серые стены
export const COLOR_IMPERIAL_FLOOR = 0x444448;   // тёмный пол
export const COLOR_EMERGENCY_LIGHT = 0xff2200;  // аварийный красный
export const COLOR_AMBIENT = 0x222233;           // холодный ambient
