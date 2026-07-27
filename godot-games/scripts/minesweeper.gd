extends Control

const COLS := 10
const ROWS := 10
const MINES := 15
const HUD_HEIGHT := 80

var cell: float = 32.0
var board_origin: Vector2 = Vector2.ZERO

var cells: Array = []
var revealed := 0
var game_over := false
var first_click := true

func _ready():
	start_game()

func start_game():
	cells.clear()
	for y in range(ROWS):
		for x in range(COLS):
			cells.append({"x": x, "y": y, "mine": false, "revealed": false, "flagged": false, "adjacent": 0})
	revealed = 0
	game_over = false
	first_click = true
	queue_redraw()

func get_cell_index(x: int, y: int) -> int:
	if x < 0 or x >= COLS or y < 0 or y >= ROWS:
		return -1
	return y * COLS + x

func get_cell(x: int, y: int) -> Dictionary:
	var idx := get_cell_index(x, y)
	if idx < 0:
		return {}
	return cells[idx]

func place_mines(exclude_x: int, exclude_y: int):
	var positions: Array[Vector2i] = []
	for y in range(ROWS):
		for x in range(COLS):
			if x != exclude_x or y != exclude_y:
				positions.append(Vector2i(x, y))
	positions.shuffle()
	for i in range(MINES):
		var p: Vector2i = positions[i]
		cells[p.y * COLS + p.x].mine = true

	for y in range(ROWS):
		for x in range(COLS):
			var idx := get_cell_index(x, y)
			var count := 0
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					if dx == 0 and dy == 0:
						continue
					var neighbor := get_cell(x + dx, y + dy)
					if not neighbor.is_empty() and neighbor.mine:
						count += 1
			cells[idx].adjacent = count

func reveal(x: int, y: int):
	var cell_dict := get_cell(x, y)
	if cell_dict.is_empty() or cell_dict.revealed or cell_dict.flagged:
		return
	cell_dict.revealed = true
	revealed += 1
	if cell_dict.mine:
		game_over = true
		return
	if cell_dict.adjacent == 0:
		for dy in range(-1, 2):
			for dx in range(-1, 2):
				if dx == 0 and dy == 0:
					continue
				reveal(x + dx, y + dy)

func check_win():
	if revealed == COLS * ROWS - MINES:
		game_over = true

func recompute_layout():
	var avail: float = min(size.x, size.y - HUD_HEIGHT) - 40
	cell = max(20.0, avail / max(COLS, ROWS))
	var board_w := cell * COLS
	var board_h := cell * ROWS
	board_origin = Vector2((size.x - board_w) / 2.0, HUD_HEIGHT + (size.y - HUD_HEIGHT - board_h) / 2.0)

func _input(event):
	if event is InputEventKey and event.pressed and event.keycode == KEY_R:
		start_game()
		return
	if game_over:
		return
	if event is InputEventMouseButton and event.pressed:
		recompute_layout()
		var mx := int((event.position.x - board_origin.x) / cell)
		var my := int((event.position.y - board_origin.y) / cell)
		if mx < 0 or my < 0 or mx >= COLS or my >= ROWS:
			return

		if first_click:
			first_click = false
			place_mines(mx, my)

		if event.button_index == MOUSE_BUTTON_LEFT:
			reveal(mx, my)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			var cell_dict := get_cell(mx, my)
			if not cell_dict.revealed:
				cell_dict.flagged = not cell_dict.flagged

		check_win()
		queue_redraw()

func _draw():
	recompute_layout()
	var font := get_theme_default_font()
	draw_rect(Rect2(Vector2.ZERO, size), Color("#2c3e50"), true)

	# HUD
	var flagged := 0
	for c in cells:
		if c.flagged:
			flagged += 1
	var status := "Buscaminas — Minas: %d · Banderas: %d" % [MINES, flagged]
	if game_over:
		status = "¡Ganaste! 🎉" if revealed == COLS * ROWS - MINES else "¡Boom! Perdiste 💥"
	draw_string(font, Vector2(20, 30), status, HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color.WHITE)
	draw_string(font, Vector2(20, 55), "Click izq: revelar · Click der: bandera · R: reiniciar", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color.LIGHT_GRAY)

	# Board
	var board_size := Vector2(cell * COLS, cell * ROWS)
	draw_rect(Rect2(board_origin, board_size), Color("#34495e"), true)

	var font_size := max(10.0, cell * 0.55)
	for c in cells:
		var rect := Rect2(board_origin + Vector2(c.x * cell + 1, c.y * cell + 1), Vector2(cell - 2, cell - 2))
		if c.revealed:
			if c.mine:
				draw_rect(rect, Color.RED, true)
				var tsize := font.get_string_size("💣", HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
				draw_string(font, rect.position + Vector2((cell - tsize.x) / 2.0, (cell - tsize.y) / 2.0 + font_size * 0.8), "💣", HORIZONTAL_ALIGNMENT_CENTER, -1, font_size, Color.WHITE)
			else:
				draw_rect(rect, Color("#7f8c8d"), true)
				if c.adjacent > 0:
					var color := Color.WHITE
					match c.adjacent:
						1: color = Color("#3498db")
						2: color = Color("#27ae60")
						3: color = Color("#e74c3c")
						4: color = Color("#8e44ad")
						5: color = Color("#d35400")
						6: color = Color("#16a085")
						7: color = Color.BLACK
						8: color = Color.GRAY
					var text := str(c.adjacent)
					var tsize2 := font.get_string_size(text, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
					draw_string(font, rect.position + Vector2((cell - tsize2.x) / 2.0, (cell - tsize2.y) / 2.0 + font_size * 0.8), text, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size, color)
		else:
			draw_rect(rect, Color("#95a5a6"), true)
			if c.flagged:
				var tsize3 := font.get_string_size("⚑", HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
				draw_string(font, rect.position + Vector2((cell - tsize3.x) / 2.0, (cell - tsize3.y) / 2.0 + font_size * 0.8), "⚑", HORIZONTAL_ALIGNMENT_CENTER, -1, font_size, Color.RED)