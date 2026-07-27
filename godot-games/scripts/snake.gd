extends Control

const CELL := 20
const GRID_W := 25
const GRID_H := 25
const INITIAL_SPEED := 0.15

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

@onready var restart_btn := Button.new()
@onready var score_lbl := Label.new()

func _ready():
	custom_minimum_size = Vector2(GRID_W * CELL + 200, GRID_H * CELL + 80)
	set_anchors_preset(Control.PRESET_CENTER)
	
	score_lbl.text = "Score: 0"
	score_lbl.position = Vector2(20, 10)
	score_lbl.add_theme_font_size_override("font_size", 20)
	add_child(score_lbl)
	
	restart_btn.text = "Reiniciar (R)"
	restart_btn.position = Vector2(180, 10)
	restart_btn.pressed.connect(start_game)
	add_child(restart_btn)
	
	var help := Label.new()
	help.text = "Flechas: mover · P: pausa"
	help.position = Vector2(20, 40)
	help.add_theme_font_size_override("font_size", 14)
	add_child(help)
	
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
	update_score()
	queue_redraw()

func spawn_food():
	while true:
		food = Vector2i(randi() % GRID_W, randi() % GRID_H)
		if not food in snake:
			break

func update_score():
	score_lbl.text = "Score: %d   High: %d" % [score, max(high_score, score)]

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
		update_score()
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

func _draw():
	var offset := Vector2(20, 80)
	# Background
	draw_rect(Rect2(offset, Vector2(GRID_W * CELL, GRID_H * CELL)), Color.BLACK, true)
	# Grid lines
	for x in range(GRID_W + 1):
		draw_line(offset + Vector2(x * CELL, 0), offset + Vector2(x * CELL, GRID_H * CELL), Color.DARK_GRAY, 1.0)
	for y in range(GRID_H + 1):
		draw_line(offset + Vector2(0, y * CELL), offset + Vector2(GRID_W * CELL, y * CELL), Color.DARK_GRAY, 1.0)
	# Snake
	for i in range(snake.size()):
		var c := snake[i]
		var color := Color.GREEN if i == 0 else Color.LIME_GREEN
		draw_rect(Rect2(offset + Vector2(c.x * CELL + 1, c.y * CELL + 1), Vector2(CELL - 2, CELL - 2)), color, true)
	# Food
	draw_rect(Rect2(offset + Vector2(food.x * CELL + 2, food.y * CELL + 2), Vector2(CELL - 4, CELL - 4)), Color.RED, true)
	
	if game_over:
		var center := offset + Vector2(GRID_W * CELL / 2.0, GRID_H * CELL / 2.0)
		draw_string(get_theme_default_font(), center - Vector2(70, 0), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, -1, 32, Color.WHITE)
		draw_string(get_theme_default_font(), center + Vector2(-50, 30), "Presiona R", HORIZONTAL_ALIGNMENT_CENTER, -1, 18, Color.WHITE)
	elif paused:
		var center := offset + Vector2(GRID_W * CELL / 2.0, GRID_H * CELL / 2.0)
		draw_string(get_theme_default_font(), center - Vector2(40, 0), "PAUSA", HORIZONTAL_ALIGNMENT_CENTER, -1, 32, Color.WHITE)
