extends Control

const COLS := 10
const ROWS := 20
const INITIAL_DELAY := 0.6
const HUD_HEIGHT := 60
const NEXT_BOX_SIZE := 4

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

var cell: float = 24.0
var board_origin: Vector2 = Vector2.ZERO
var next_origin: Vector2 = Vector2.ZERO

var shapes: Array = [
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

func _ready():
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
	queue_redraw()

func spawn_piece():
	var idx := randi() % shapes.size()
	current_piece = shapes[idx].duplicate()
	current_color = colors[idx]
	current_pos = Vector2i(COLS / 2 - 1, 0)
	if not valid_position(current_piece, current_pos):
		game_over = true

func valid_position(piece: Array, offset: Vector2i) -> bool:
	for c in piece:
		var p: Vector2i = c + offset
		if p.x < 0 or p.x >= COLS or p.y >= ROWS:
			return false
		if p.y >= 0 and board[p.y][p.x] != null:
			return false
	return true

func lock_piece():
	for c in current_piece:
		var p: Vector2i = c + current_pos
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

func rotate_piece():
	var rotated: Array[Vector2i] = []
	for c in current_piece:
		rotated.append(Vector2i(-c.y, c.x))
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
			KEY_SPACE:
				while valid_position(current_piece, current_pos + Vector2i.DOWN):
					current_pos += Vector2i.DOWN
					score += 2
				lock_piece()
			KEY_P:
				paused = not paused
			KEY_R:
				start_game()
		queue_redraw()

func recompute_layout():
	var avail_h := size.y - HUD_HEIGHT - 40
	var cell_h := avail_h / ROWS
	cell = min(cell_h, (size.x - 40) / COLS)
	var board_w := cell * COLS
	var board_h := cell * ROWS
	# Center horizontally with a small next-piece box on the right
	var next_w := cell * NEXT_BOX_SIZE + 20
	var total_w := board_w + 20 + next_w
	board_origin = Vector2((size.x - total_w) / 2.0, HUD_HEIGHT + (avail_h - board_h) / 2.0 + 20)
	next_origin = board_origin + Vector2(board_w + 20, 0)

func _draw():
	recompute_layout()

	var font := get_theme_default_font()
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.08, 0.08, 0.1, 1), true)

	# HUD
	draw_string(font, Vector2(20, 28), "Score: %d   Lines: %d" % [score, lines], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color.WHITE)
	draw_string(font, Vector2(20, 50), "Flechas: mover · ↑/X: rotar · ↓: bajar · Espacio: caída · P: pausa · R: reiniciar", HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color.GRAY)

	# Board
	var board_size := Vector2(cell * COLS, cell * ROWS)
	draw_rect(Rect2(board_origin, board_size), Color.BLACK, true)
	for x in range(COLS + 1):
		draw_line(board_origin + Vector2(x * cell, 0), board_origin + Vector2(x * cell, board_size.y), Color.DARK_GRAY, 1.0)
	for y in range(ROWS + 1):
		draw_line(board_origin + Vector2(0, y * cell), board_origin + Vector2(board_size.x, y * cell), Color.DARK_GRAY, 1.0)

	for y in range(ROWS):
		for x in range(COLS):
			if board[y][x] != null:
				draw_rect(Rect2(board_origin + Vector2(x * cell + 1, y * cell + 1), Vector2(cell - 2, cell - 2)), board[y][x], true)

	for c in current_piece:
		var p: Vector2i = c + current_pos
		if p.y >= 0:
			draw_rect(Rect2(board_origin + Vector2(p.x * cell + 1, p.y * cell + 1), Vector2(cell - 2, cell - 2)), current_color, true)

	# Next box label
	draw_string(font, next_origin + Vector2(0, -10), "Próxima:", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.LIGHT_GRAY)

	if game_over:
		var center := board_origin + Vector2(board_size.x / 2.0, board_size.y / 2.0)
		draw_string(font, center + Vector2(-90, -10), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color.WHITE)
		draw_string(font, center + Vector2(-70, 30), "Presiona R", HORIZONTAL_ALIGNMENT_CENTER, -1, 18, Color.LIGHT_GRAY)
	elif paused:
		var center := board_origin + Vector2(board_size.x / 2.0, board_size.y / 2.0)
		draw_string(font, center + Vector2(-50, -10), "PAUSA", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color.WHITE)