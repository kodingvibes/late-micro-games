extends Control

const CELL := 24
const COLS := 10
const ROWS := 20
const INITIAL_DELAY := 0.6

var board: Array[Array] = []
var current_piece: Array[Vector2i] = []
var current_color: Color
var current_pos: Vector2i
var score: int = 0
var lines: int = 0
var game_over: bool = false
var paused: bool = false
var tick: float = 0.0
var delay: float = INITIAL_DELAY
var held: bool = false

var shapes: Array[Array] = [
	[Vector2i(0,0), Vector2i(1,0), Vector2i(0,1), Vector2i(1,1)],   # O
	[Vector2i(0,0), Vector2i(1,0), Vector2i(2,0), Vector2i(3,0)],   # I
	[Vector2i(1,0), Vector2i(0,1), Vector2i(1,1), Vector2i(2,1)],   # T
	[Vector2i(0,0), Vector2i(0,1), Vector2i(1,1), Vector2i(2,1)],   # L
	[Vector2i(2,0), Vector2i(0,1), Vector2i(1,1), Vector2i(2,1)],   # J
	[Vector2i(0,0), Vector2i(1,0), Vector2i(1,1), Vector2i(2,1)],   # S
	[Vector2i(1,0), Vector2i(2,0), Vector2i(0,1), Vector2i(1,1)],   # Z
]
var colors: Array[Color] = [
	Color.YELLOW, Color.CYAN, Color.PURPLE, Color.ORANGE, Color.BLUE, Color.GREEN, Color.RED
]

@onready var score_lbl := Label.new()
@onready var restart_btn := Button.new()

func _ready():
	custom_minimum_size = Vector2(COLS * CELL + 220, ROWS * CELL + 80)
	set_anchors_preset(Control.PRESET_CENTER)
	
	score_lbl.text = "Score: 0   Lines: 0"
	score_lbl.position = Vector2(20, 10)
	score_lbl.add_theme_font_size_override("font_size", 20)
	add_child(score_lbl)
	
	restart_btn.text = "Reiniciar (R)"
	restart_btn.position = Vector2(260, 10)
	restart_btn.pressed.connect(start_game)
	add_child(restart_btn)
	
	var help := Label.new()
	help.text = "Flechas: mover/rotar · Abajo: caída rápida · P: pausa"
	help.position = Vector2(20, 40)
	help.add_theme_font_size_override("font_size", 14)
	add_child(help)
	
	start_game()

func start_game():
	board.clear()
	for y in range(ROWS):
		var row: Array[Color] = []
		row.resize(COLS)
		board.append(row)
	score = 0
	lines = 0
	game_over = false
	paused = false
	delay = INITIAL_DELAY
	spawn_piece()
	update_ui()
	queue_redraw()

func spawn_piece():
	var idx := randi() % shapes.size()
	current_piece = shapes[idx].duplicate()
	current_color = colors[idx]
	current_pos = Vector2i(COLS / 2 - 1, 0)
	if not valid_position(current_piece, current_pos):
		game_over = true

func update_ui():
	score_lbl.text = "Score: %d   Lines: %d" % [score, lines]

func valid_position(piece: Array[Vector2i], offset: Vector2i) -> bool:
	for c in piece:
		var p := c + offset
		if p.x < 0 or p.x >= COLS or p.y >= ROWS:
			return false
		if p.y >= 0 and board[p.y][p.x] != null:
			return false
	return true

func lock_piece():
	for c in current_piece:
		var p := c + current_pos
		if p.y >= 0 and p.y < ROWS and p.x >= 0 and p.x < COLS:
			board[p.y][p.x] = current_color
	clear_lines()
	spawn_piece()

func clear_lines():
	var cleared := 0
	var y := ROWS - 1
	while y >= 0:
		var full := true
		for x in range(COLS):
			if board[y][x] == null:
				full = false
				break
		if full:
			board.remove_at(y)
			var row: Array[Color] = []
			row.resize(COLS)
			board.insert(0, row)
			cleared += 1
		else:
			y -= 1
	if cleared > 0:
		lines += cleared
		score += cleared * 100 * cleared
		delay = max(0.1, INITIAL_DELAY - lines * 0.02)
		update_ui()

func rotate_piece():
	var rotated: Array[Vector2i] = []
	for c in current_piece:
		rotated.append(Vector2i(-c.y, c.x))
	# Adjust kick if invalid
	var kicks := [Vector2i(0,0), Vector2i(1,0), Vector2i(-1,0), Vector2i(0,-1), Vector2i(0,1)]
	for k in kicks:
		if valid_position(rotated, current_pos + k):
			current_piece = rotated
			current_pos += k
			return

func _process(delta):
	if game_over or paused:
		return
	tick += delta
	if tick >= delay:
		tick = 0.0
		if valid_position(current_piece, current_pos + Vector2i.DOWN):
			current_pos += Vector2i.DOWN
		else:
			lock_piece()
	queue_redraw()

func _input(event):
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_LEFT:
				if valid_position(current_piece, current_pos + Vector2i.LEFT):
					current_pos += Vector2i.LEFT
			KEY_RIGHT:
				if valid_position(current_piece, current_pos + Vector2i.RIGHT):
					current_pos += Vector2i.RIGHT
			KEY_UP, KEY_X:
				rotate_piece()
			KEY_DOWN:
				if valid_position(current_piece, current_pos + Vector2i.DOWN):
					current_pos += Vector2i.DOWN
					score += 1
					update_ui()
			KEY_SPACE:
				while valid_position(current_piece, current_pos + Vector2i.DOWN):
					current_pos += Vector2i.DOWN
					score += 2
				lock_piece()
				update_ui()
			KEY_P:
				paused = not paused
			KEY_R:
				start_game()
		queue_redraw()

func _draw():
	var offset := Vector2(20, 80)
	# Board bg
	draw_rect(Rect2(offset, Vector2(COLS * CELL, ROWS * CELL)), Color.BLACK, true)
	# Grid
	for x in range(COLS + 1):
		draw_line(offset + Vector2(x * CELL, 0), offset + Vector2(x * CELL, ROWS * CELL), Color.DARK_GRAY, 1.0)
	for y in range(ROWS + 1):
		draw_line(offset + Vector2(0, y * CELL), offset + Vector2(COLS * CELL, y * CELL), Color.DARK_GRAY, 1.0)
	# Locked cells
	for y in range(ROWS):
		for x in range(COLS):
			if board[y][x] != null:
				draw_rect(Rect2(offset + Vector2(x * CELL + 1, y * CELL + 1), Vector2(CELL - 2, CELL - 2)), board[y][x], true)
	# Current piece
	for c in current_piece:
		var p := c + current_pos
		if p.y >= 0:
			draw_rect(Rect2(offset + Vector2(p.x * CELL + 1, p.y * CELL + 1), Vector2(CELL - 2, CELL - 2)), current_color, true)
	
	if game_over:
		var center := offset + Vector2(COLS * CELL / 2.0, ROWS * CELL / 2.0)
		draw_string(get_theme_default_font(), center - Vector2(70, 0), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, -1, 32, Color.WHITE)
	elif paused:
		var center := offset + Vector2(COLS * CELL / 2.0, ROWS * CELL / 2.0)
		draw_string(get_theme_default_font(), center - Vector2(40, 0), "PAUSA", HORIZONTAL_ALIGNMENT_CENTER, -1, 32, Color.WHITE)
