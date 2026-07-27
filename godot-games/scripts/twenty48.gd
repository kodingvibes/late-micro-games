extends Control

const GRID_SIZE := 4
const HUD_HEIGHT := 80

var cell: float = 100.0
var gap: float = 12.0
var board_size: float = 0.0
var board_origin: Vector2 = Vector2.ZERO

var grid: Array[Array] = []
var score: int = 0
var high_score: int = 0
var game_over: bool = false
var won: bool = false

var colors := {
	0: Color("#cdc1b4"),
	2: Color("#eee4da"),
	4: Color("#ede0c8"),
	8: Color("#f2b179"),
	16: Color("#f59563"),
	32: Color("#f67c5f"),
	64: Color("#f65e3b"),
	128: Color("#edcf72"),
	256: Color("#edcc61"),
	512: Color("#edc850"),
	1024: Color("#edc53f"),
	2048: Color("#edc22e"),
}

func _ready():
	start_game()

func start_game():
	grid.clear()
	for y in range(GRID_SIZE):
		var row: Array[int] = []
		row.resize(GRID_SIZE)
		row.fill(0)
		grid.append(row)
	score = 0
	game_over = false
	won = false
	spawn_tile()
	spawn_tile()
	queue_redraw()

func spawn_tile():
	var empty: Array[Vector2i] = []
	for y in range(GRID_SIZE):
		for x in range(GRID_SIZE):
			if grid[y][x] == 0:
				empty.append(Vector2i(x, y))
	if empty.is_empty():
		return
	var pos: Vector2i = empty[randi() % empty.size()]
	grid[pos.y][pos.x] = 2 if randf() < 0.9 else 4

func slide_line(line: Array) -> Array:
	var filtered: Array[int] = []
	for v in line:
		if v != 0:
			filtered.append(v)
	var merged: Array[int] = []
	var i := 0
	while i < filtered.size():
		if i + 1 < filtered.size() and filtered[i] == filtered[i + 1]:
			merged.append(filtered[i] * 2)
			score += filtered[i] * 2
			i += 2
		else:
			merged.append(filtered[i])
			i += 1
	while merged.size() < GRID_SIZE:
		merged.append(0)
	return merged

func move(dx: int, dy: int) -> bool:
	var moved := false
	if dx != 0:
		for y in range(GRID_SIZE):
			var line: Array[int] = []
			if dx > 0:
				for x in range(GRID_SIZE - 1, -1, -1):
					line.append(grid[y][x])
			else:
				for x in range(GRID_SIZE):
					line.append(grid[y][x])
			var new_line := slide_line(line)
			if dx > 0:
				for x in range(GRID_SIZE):
					if grid[y][GRID_SIZE - 1 - x] != new_line[x]:
						moved = true
					grid[y][GRID_SIZE - 1 - x] = new_line[x]
			else:
				for x in range(GRID_SIZE):
					if grid[y][x] != new_line[x]:
						moved = true
					grid[y][x] = new_line[x]
	else:
		for x in range(GRID_SIZE):
			var line: Array[int] = []
			if dy > 0:
				for y in range(GRID_SIZE - 1, -1, -1):
					line.append(grid[y][x])
			else:
				for y in range(GRID_SIZE):
					line.append(grid[y][x])
			var new_line := slide_line(line)
			if dy > 0:
				for y in range(GRID_SIZE):
					if grid[GRID_SIZE - 1 - y][x] != new_line[y]:
						moved = true
					grid[GRID_SIZE - 1 - y][x] = new_line[y]
			else:
				for y in range(GRID_SIZE):
					if grid[y][x] != new_line[y]:
						moved = true
					grid[y][x] = new_line[y]
	return moved

func can_move() -> bool:
	for y in range(GRID_SIZE):
		for x in range(GRID_SIZE):
			if grid[y][x] == 0:
				return true
			if x + 1 < GRID_SIZE and grid[y][x] == grid[y][x + 1]:
				return true
			if y + 1 < GRID_SIZE and grid[y][x] == grid[y + 1][x]:
				return true
	return false

func check_win():
	for y in range(GRID_SIZE):
		for x in range(GRID_SIZE):
			if grid[y][x] == 2048 and not won:
				won = true

func _input(event):
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_R:
			start_game()
			return
		if game_over:
			return
		var moved := false
		match event.keycode:
			KEY_UP, KEY_W:
				moved = move(0, -1)
			KEY_DOWN, KEY_S:
				moved = move(0, 1)
			KEY_LEFT, KEY_A:
				moved = move(-1, 0)
			KEY_RIGHT, KEY_D:
				moved = move(1, 0)
		if moved:
			spawn_tile()
			check_win()
			if not can_move():
				game_over = true
			queue_redraw()

func recompute_layout():
	var avail: float = min(size.x, size.y - HUD_HEIGHT) - 40
	cell = max(40.0, (avail - (GRID_SIZE + 1) * 12) / GRID_SIZE)
	gap = max(6.0, cell * 0.12)
	board_size = GRID_SIZE * cell + (GRID_SIZE + 1) * gap
	board_origin = Vector2((size.x - board_size) / 2.0, HUD_HEIGHT + (size.y - HUD_HEIGHT - board_size) / 2.0)

func get_text_color(value: int) -> Color:
	return Color.BLACK if value <= 4 else Color.WHITE

func get_font_size(value: int) -> float:
	var ratio := cell / 100.0
	return (28 if value < 1000 else 22) * ratio * 2.0

func _draw():
	recompute_layout()
	var font := get_theme_default_font()
	draw_rect(Rect2(Vector2.ZERO, size), Color("#faf8ef"), true)

	# HUD
	draw_string(font, Vector2(20, 30), "Score: %d   High: %d" % [score, max(high_score, score)], HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color("#776e65"))
	draw_string(font, Vector2(20, 55), "Flechas/WASD: mover · R: reiniciar", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("#776e65"))

	# Board background
	draw_rect(Rect2(board_origin, Vector2(board_size, board_size)), Color("#bbada0"), true)

	for y in range(GRID_SIZE):
		for x in range(GRID_SIZE):
			var value: int = grid[y][x]
			var rect_pos := board_origin + Vector2(gap + x * (cell + gap), gap + y * (cell + gap))
			draw_rect(Rect2(rect_pos, Vector2(cell, cell)), colors.get(value, Color("#3c3a32")), true)
			if value > 0:
				var text := str(value)
				var fsize := get_font_size(value)
				var tsize := font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, fsize)
				var tpos := rect_pos + Vector2((cell - tsize.x) / 2.0, (cell - tsize.y) / 2.0 + fsize * 0.8)
				draw_string(font, tpos, text, HORIZONTAL_ALIGNMENT_CENTER, -1, fsize, get_text_color(value))

	if game_over:
		var center := board_origin + Vector2(board_size / 2.0, board_size / 2.0)
		draw_string(font, center + Vector2(-90, -10), "GAME OVER", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color(0.8, 0, 0, 1))
		draw_string(font, center + Vector2(-70, 30), "R para reiniciar", HORIZONTAL_ALIGNMENT_CENTER, -1, 18, Color.DARK_RED)
	elif won:
		var center := board_origin + Vector2(board_size / 2.0, board_size / 2.0)
		draw_string(font, center + Vector2(-50, -10), "¡2048!", HORIZONTAL_ALIGNMENT_CENTER, -1, 36, Color(0, 0.5, 0, 1))