extends Control

const HUD_HEIGHT := 60
const PLAY_AREA_RATIO := 0.8

const PLAYER_RATIO := 0.07
const BULLET_RATIO := 0.012
const ALIEN_RATIO := 0.05

const ROWS := 5
const COLS := 8
const SPACING_RATIO := 0.18

var play_w: float = 600
var play_h: float = 500
var player_w: float = 40
var player_h: float = 20
var bullet_w: float = 4
var bullet_h: float = 10
var alien_w: float = 30
var alien_h: float = 20
var spacing_x: float = 50
var spacing_y: float = 35
var margin_x: float = 60
var margin_y: float = 60
var scale_factor: float = 1.0

var player_x: float = 0.0
var bullets: Array[Dictionary] = []
var aliens: Array[Dictionary] = []
var alien_dir: int = 1
var alien_speed: float = 20.0
var alien_tick: float = 0.0
var score: int = 0
var lives: int = 3
var game_over: bool = false
var paused: bool = false

func _ready():
	start_game()

func recompute_layout():
	var avail_w := size.x - 40
	var avail_h := size.y - HUD_HEIGHT - 40
	play_w = avail_w
	play_h = avail_h
	var s: float = min(play_w / 600.0, play_h / 500.0) * PLAY_AREA_RATIO / 0.8
	scale_factor = s
	player_w = 40 * s
	player_h = 20 * s
	bullet_w = 4 * s
	bullet_h = 10 * s
	alien_w = 30 * s
	alien_h = 20 * s
	spacing_x = 50 * s
	spacing_y = 35 * s
	margin_x = max(20, 60 * s)
	margin_y = max(20, 60 * s)

func start_game():
	recompute_layout()
	player_x = play_w / 2.0 - player_w / 2.0
	bullets.clear()
	aliens.clear()
	score = 0
	lives = 3
	game_over = false
	paused = false
	alien_dir = 1
	alien_speed = 12.0

	for row in range(ROWS):
		for col in range(COLS):
			aliens.append({
				"x": margin_x + col * spacing_x,
				"y": margin_y + row * spacing_y,
				"alive": true,
			})
	queue_redraw()

func _process(delta):
	if game_over or paused:
		return

	var move := 0.0
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		move -= 1.0
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		move += 1.0
	player_x = clamp(player_x + move * 300.0 * scale_factor * delta, 0.0, play_w - player_w)

	alien_tick += delta
	if alien_tick >= 1.0 / alien_speed:
		alien_tick = 0.0
		var drop := false
		var edge := false
		for a in aliens:
			if not a.alive:
				continue
			var nx: float = a.x + alien_dir * spacing_x * 0.25
			if nx <= 0 or nx >= play_w - alien_w:
				edge = true
				break
		if edge:
			alien_dir *= -1
			drop = true
		for a in aliens:
			if a.alive:
				a.x += alien_dir * spacing_x * 0.25
				if drop:
					a.y += spacing_y * 0.5
				if a.y + alien_h >= play_h - 50 * scale_factor:
					lose_life()

	for i in range(bullets.size() - 1, -1, -1):
		var b := bullets[i]
		b.y -= 400.0 * scale_factor * delta
		if b.y < 0:
			bullets.remove_at(i)
			continue
		for a in aliens:
			if a.alive and b.x > a.x and b.x < a.x + alien_w and b.y > a.y and b.y < a.y + alien_h:
				a.alive = false
				score += 10
				bullets.remove_at(i)
				alien_speed += 1.0
				break

	if aliens_alive() == 0:
		score += 100
		start_game()

	queue_redraw()

func aliens_alive() -> int:
	var count := 0
	for a in aliens:
		if a.alive:
			count += 1
	return count

func lose_life():
	lives -= 1
	if lives <= 0:
		game_over = true
	else:
		bullets.clear()

func _input(event):
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_SPACE:
				if not game_over:
					bullets.append({"x": player_x + player_w / 2.0, "y": play_h - 40 * scale_factor})
			KEY_P:
				paused = not paused
			KEY_R:
				start_game()

func _draw():
	recompute_layout()
	var font := get_theme_default_font()
	var offset := Vector2((size.x - play_w) / 2.0, HUD_HEIGHT + (size.y - HUD_HEIGHT - play_h) / 2.0)

	draw_rect(Rect2(Vector2.ZERO, size), Color(0.05, 0.05, 0.08, 1), true)
	draw_rect(Rect2(offset, Vector2(play_w, play_h)), Color.BLACK, true)

	draw_string(font, Vector2(20, 28), "Score: %d   Lives: %d" % [score, lives], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color.WHITE)
	draw_string(font, Vector2(20, 50), "Flechas/A,D: mover · Espacio: disparar · P: pausa · R: reiniciar", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.GRAY)

	draw_rect(Rect2(offset + Vector2(player_x, play_h - 30 * scale_factor), Vector2(player_w, player_h)), Color.CYAN, true)

	for b in bullets:
		draw_rect(Rect2(offset + Vector2(b.x - bullet_w / 2.0, b.y), Vector2(bullet_w, bullet_h)), Color.YELLOW, true)

	for a in aliens:
		if a.alive:
			draw_rect(Rect2(offset + Vector2(a.x, a.y), Vector2(alien_w, alien_h)), Color.GREEN, true)
			draw_rect(Rect2(offset + Vector2(a.x + alien_w * 0.2, a.y + alien_h * 0.3), Vector2(alien_w * 0.6, alien_h * 0.2)), Color.BLACK, true)

	if game_over:
		var center := offset + Vector2(play_w / 2.0, play_h / 2.0)
		draw_string(font, center + Vector2(-90, -10), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color.WHITE)
		draw_string(font, center + Vector2(-70, 30), "Presiona R", HORIZONTAL_ALIGNMENT_CENTER, -1, 18, Color.LIGHT_GRAY)
	elif paused:
		var center := offset + Vector2(play_w / 2.0, play_h / 2.0)
		draw_string(font, center + Vector2(-50, -10), "PAUSA", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color.WHITE)