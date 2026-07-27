extends Control

const W := 600
const H := 500
const PLAYER_W := 40
const PLAYER_H := 20
const BULLET_W := 4
const BULLET_H := 10
const ALIEN_W := 30
const ALIEN_H := 20
const ROWS := 5
const COLS := 8
const MARGIN_X := 60
const MARGIN_Y := 60
const SPACING_X := 50
const SPACING_Y := 35

var player_x: float = W / 2.0 - PLAYER_W / 2.0
var bullets: Array[Dictionary] = []
var aliens: Array[Dictionary] = []
var alien_dir: int = 1
var alien_speed: float = 20.0
var alien_tick: float = 0.0
var score: int = 0
var lives: int = 3
var game_over: bool = false
var paused: bool = false

@onready var score_lbl := Label.new()
@onready var restart_btn := Button.new()

func _ready():
	custom_minimum_size = Vector2(W + 40, H + 80)
	set_anchors_preset(Control.PRESET_CENTER)
	
	score_lbl.text = "Score: 0   Lives: 3"
	score_lbl.position = Vector2(20, 10)
	score_lbl.add_theme_font_size_override("font_size", 20)
	add_child(score_lbl)
	
	restart_btn.text = "Reiniciar (R)"
	restart_btn.position = Vector2(280, 10)
	restart_btn.pressed.connect(start_game)
	add_child(restart_btn)
	
	var help := Label.new()
	help.text = "Flechas: mover · Espacio: disparar · P: pausa"
	help.position = Vector2(20, 40)
	help.add_theme_font_size_override("font_size", 14)
	add_child(help)
	
	start_game()

func start_game():
	player_x = W / 2.0 - PLAYER_W / 2.0
	bullets.clear()
	aliens.clear()
	score = 0
	lives = 3
	game_over = false
	paused = false
	alien_dir = 1
	alien_speed = 20.0
	
	for row in range(ROWS):
		for col in range(COLS):
			aliens.append({
				"x": MARGIN_X + col * SPACING_X,
				"y": MARGIN_Y + row * SPACING_Y,
				"alive": true,
			})
	update_ui()
	queue_redraw()

func update_ui():
	score_lbl.text = "Score: %d   Lives: %d" % [score, lives]

func _process(delta):
	if game_over or paused:
		return
	
	# Player movement
	var move := 0.0
	if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
		move -= 1.0
	if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
		move += 1.0
	player_x = clamp(player_x + move * 300.0 * delta, 0.0, W - PLAYER_W)
	
	# Alien movement
	alien_tick += delta
	if alien_tick >= 1.0 / alien_speed:
		alien_tick = 0.0
		var drop := false
		var edge := false
		for a in aliens:
			if not a.alive:
				continue
			var nx: float = a.x + alien_dir * SPACING_X * 0.25
			if nx <= 0 or nx >= W - ALIEN_W:
				edge = true
				break
		if edge:
			alien_dir *= -1
			drop = true
		for a in aliens:
			if a.alive:
				a.x += alien_dir * SPACING_X * 0.25
				if drop:
					a.y += SPACING_Y * 0.5
				if a.y + ALIEN_H >= H - 50:
					lose_life()
	
	# Bullets
	for i in range(bullets.size() - 1, -1, -1):
		var b := bullets[i]
		b.y -= 400.0 * delta
		if b.y < 0:
			bullets.remove_at(i)
			continue
		for a in aliens:
			if a.alive and b.x > a.x and b.x < a.x + ALIEN_W and b.y > a.y and b.y < a.y + ALIEN_H:
				a.alive = false
				score += 10
				bullets.remove_at(i)
				alien_speed += 1.0
				break
	
	if aliens_alive() == 0:
		start_game()
		score += 100
	
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
	update_ui()

func _input(event):
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_SPACE:
				if not game_over:
					bullets.append({"x": player_x + PLAYER_W / 2.0, "y": H - 40})
			KEY_P:
				paused = not paused
			KEY_R:
				start_game()

func _draw():
	var offset := Vector2(20, 80)
	draw_rect(Rect2(offset, Vector2(W, H)), Color.BLACK, true)
	
	# Player
	draw_rect(Rect2(offset + Vector2(player_x, H - 30), Vector2(PLAYER_W, PLAYER_H)), Color.CYAN, true)
	
	# Bullets
	for b in bullets:
		draw_rect(Rect2(offset + Vector2(b.x - BULLET_W / 2.0, b.y), Vector2(BULLET_W, BULLET_H)), Color.YELLOW, true)
	
	# Aliens
	for a in aliens:
		if a.alive:
			draw_rect(Rect2(offset + Vector2(a.x, a.y), Vector2(ALIEN_W, ALIEN_H)), Color.GREEN, true)
			draw_rect(Rect2(offset + Vector2(a.x + 5, a.y + 5), Vector2(ALIEN_W - 10, 4)), Color.BLACK, true)
	
	if game_over:
		var center := offset + Vector2(W / 2.0, H / 2.0)
		draw_string(get_theme_default_font(), center - Vector2(70, 0), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, -1, 32, Color.WHITE)
	elif paused:
		var center := offset + Vector2(W / 2.0, H / 2.0)
		draw_string(get_theme_default_font(), center - Vector2(40, 0), "PAUSA", HORIZONTAL_ALIGNMENT_CENTER, -1, 32, Color.WHITE)
