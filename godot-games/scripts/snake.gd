extends Control

const GRID_W := 25
const GRID_H := 25
const INITIAL_SPEED := 0.15
const HUD_HEIGHT := 60

var snake: Array[Vector2i] = []
var dir: Vector2i = Vector2i.RIGHT
var next_dir: Vector2i = Vector2i.RIGHT
var food: Vector2i
var score: int = 0
var high_score: int = 0
var game_over: bool = false
var paused: bool = false
var tick: float = 0.0
var speed: float = INITIAL_SPEED
var cell: float = 20.0
var board_origin: Vector2 = Vector2.ZERO

func _ready():
	start_game()

func start_game():
	snake = [Vector2i(12, 12), Vector2i(11, 12), Vector2i(10, 12)]
	dir = Vector2i.RIGHT
	next_dir = Vector2i.RIGHT
	score = 0
	game_over = false
	paused = false
	speed = INITIAL_SPEED
	spawn_food()
	queue_redraw()

func spawn_food():
	while true:
		food = Vector2i(randi() % GRID_W, randi() % GRID_H)
		if not food in snake:
			break

func _process(delta):
	if game_over or paused:
		return
	tick += delta
	if tick >= speed:
		tick = 0.0
		dir = next_dir
		move()

func move():
	var head := snake[0] + dir
	if head.x < 0 or head.x >= GRID_W or head.y < 0 or head.y >= GRID_H or head in snake:
		game_over = true
		queue_redraw()
		return

	snake.insert(0, head)
	if head == food:
		score += 10
		if score > high_score:
			high_score = score
		spawn_food()
		speed = max(0.06, INITIAL_SPEED - score * 0.002)
	else:
		snake.pop_back()
	queue_redraw()

func _input(event):
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_UP, KEY_W:
				if dir != Vector2i.DOWN:
					next_dir = Vector2i.UP
			KEY_DOWN, KEY_S:
				if dir != Vector2i.UP:
					next_dir = Vector2i.DOWN
			KEY_LEFT, KEY_A:
				if dir != Vector2i.RIGHT:
					next_dir = Vector2i.LEFT
			KEY_RIGHT, KEY_D:
				if dir != Vector2i.LEFT:
					next_dir = Vector2i.RIGHT
			KEY_P:
				paused = not paused
			KEY_R:
				start_game()

func recompute_layout():
	var avail_w := size.x - 40
	var avail_h := size.y - HUD_HEIGHT - 40
	var cell_w := avail_w / GRID_W
	var cell_h := avail_h / GRID_H
	cell = min(cell_w, cell_h)
	var board_w := cell * GRID_W
	var board_h := cell * GRID_H
	board_origin = Vector2((size.x - board_w) / 2.0, HUD_HEIGHT + (avail_h - board_h) / 2.0 + 20)

func _draw():
	recompute_layout()

	# Background
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.08, 0.08, 0.1, 1), true)

	# HUD
	var font := get_theme_default_font()
	var hud_color := Color.WHITE
	draw_string(font, Vector2(20, 30), "Score: %d   High: %d" % [score, max(high_score, score)], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, hud_color)
	draw_string(font, Vector2(20, 52), "Flechas/WASD: mover · P: pausa · R: reiniciar", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.GRAY)

	# Board
	var board_size := Vector2(cell * GRID_W, cell * GRID_H)
	draw_rect(Rect2(board_origin, board_size), Color.BLACK, true)
	for x in range(GRID_W + 1):
		draw_line(board_origin + Vector2(x * cell, 0), board_origin + Vector2(x * cell, board_size.y), Color.DARK_GRAY, 1.0)
	for y in range(GRID_H + 1):
		draw_line(board_origin + Vector2(0, y * cell), board_origin + Vector2(board_size.x, y * cell), Color.DARK_GRAY, 1.0)

	# Snake
	for i in range(snake.size()):
		var c := snake[i]
		var color := Color.GREEN if i == 0 else Color.LIME_GREEN
		draw_rect(Rect2(board_origin + Vector2(c.x * cell + 1, c.y * cell + 1), Vector2(cell - 2, cell - 2)), color, true)

	# Food
	draw_rect(Rect2(board_origin + Vector2(food.x * cell + 2, food.y * cell + 2), Vector2(cell - 4, cell - 4)), Color.RED, true)

	# Overlays
	if game_over:
		var center := board_origin + Vector2(board_size.x / 2.0, board_size.y / 2.0)
		draw_string(font, center + Vector2(-90, -10), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color.WHITE)
		draw_string(font, center + Vector2(-70, 30), "Presiona R", HORIZONTAL_ALIGNMENT_CENTER, -1, 18, Color.LIGHT_GRAY)
	elif paused:
		var center := board_origin + Vector2(board_size.x / 2.0, board_size.y / 2.0)
		draw_string(font, center + Vector2(-50, -10), "PAUSA", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color.WHITE)