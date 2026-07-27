extends Control

const COLS := 10
const ROWS := 10
const MINES := 15
const CELL := 32
const START_X := 60
const START_Y := 90

var cells: Array[Dictionary] = []
var revealed := 0
var game_over := false
var first_click := true

@onready var status_lbl := Label.new()
@onready var restart_btn := Button.new()

func _ready():
	custom_minimum_size = Vector2(COLS * CELL + START_X * 2, ROWS * CELL + START_Y + 40)
	set_anchors_preset(Control.PRESET_CENTER)
	
	status_lbl.text = "Buscaminas — 15 minas"
	status_lbl.position = Vector2(START_X, 20)
	status_lbl.add_theme_font_size_override("font_size", 22)
	add_child(status_lbl)
	
	restart_btn.text = "Reiniciar (R)"
	restart_btn.position = Vector2(START_X + 260, 20)
	restart_btn.pressed.connect(start_game)
	add_child(restart_btn)
	
	var help := Label.new()
	help.text = "Click izq: revelar · Click der: bandera"
	help.position = Vector2(START_X, 55)
	help.add_theme_font_size_override("font_size", 14)
	add_child(help)
	
	start_game()

func start_game():
	cells.clear()
	for y in range(ROWS):
		for x in range(COLS):
			cells.append({"x": x, "y": y, "mine": false, "revealed": false, "flagged": false, "adjacent": 0})
	revealed = 0
	game_over = false
	first_click = true
	update_status()
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
	var positions := []
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
	var cell := get_cell(x, y)
	if cell.is_empty() or cell.revealed or cell.flagged:
		return
	cell.revealed = true
	revealed += 1
	if cell.mine:
		game_over = true
		return
	if cell.adjacent == 0:
		for dy in range(-1, 2):
			for dx in range(-1, 2):
				if dx == 0 and dy == 0:
					continue
				reveal(x + dx, y + dy)

func check_win():
	if revealed == COLS * ROWS - MINES:
		game_over = true

func update_status():
	if game_over and revealed == COLS * ROWS - MINES:
		status_lbl.text = "¡Ganaste!"
	elif game_over:
		status_lbl.text = "Perdiste — ¡Boom!"
	else:
		var flagged := 0
		for c in cells:
			if c.flagged:
				flagged += 1
		status_lbl.text = "Minas: %d / %d" % [MINES - flagged, MINES]

func _gui_input(event):
	if game_over:
		return
	if event is InputEventMouseButton and event.pressed:
		var mx := int(event.position.x - START_X)
		var my := int(event.position.y - START_Y)
		if mx < 0 or my < 0:
			return
		var x := mx / CELL
		var y := my / CELL
		if x >= COLS or y >= ROWS:
			return
		
		if first_click:
			first_click = false
			place_mines(x, y)
		
		if event.button_index == MOUSE_BUTTON_LEFT:
			reveal(x, y)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			var cell := get_cell(x, y)
			if not cell.revealed:
				cell.flagged = not cell.flagged
		
		check_win()
		update_status()
		queue_redraw()

func _input(event):
	if event is InputEventKey and event.pressed and event.keycode == KEY_R:
		start_game()

func _draw():
	# Background
	draw_rect(Rect2(Vector2(START_X, START_Y), Vector2(COLS * CELL, ROWS * CELL)), Color.GRAY, true)
	
	for c in cells:
		var rect := Rect2(Vector2(START_X + c.x * CELL + 1, START_Y + c.y * CELL + 1), Vector2(CELL - 2, CELL - 2))
		if c.revealed:
			if c.mine:
				draw_rect(rect, Color.RED, true)
				draw_string(get_theme_default_font(), rect.position + Vector2(6, 20), "💣", HORIZONTAL_ALIGNMENT_CENTER, -1, 16, Color.WHITE)
			else:
				draw_rect(rect, Color.DARK_GRAY, true)
				if c.adjacent > 0:
					var color := Color.WHITE
					match c.adjacent:
						1: color = Color.BLUE
						2: color = Color.GREEN
						3: color = Color.RED
						4: color = Color.PURPLE
						5: color = Color.ORANGE
						6: color = Color.CYAN
						7: color = Color.BLACK
						8: color = Color.GRAY
					draw_string(get_theme_default_font(), rect.position + Vector2(10, 22), str(c.adjacent), HORIZONTAL_ALIGNMENT_CENTER, -1, 18, color)
		else:
			draw_rect(rect, Color.SLATE_GRAY, true)
			if c.flagged:
				draw_string(get_theme_default_font(), rect.position + Vector2(8, 20), "🚩", HORIZONTAL_ALIGNMENT_CENTER, -1, 16, Color.YELLOW)
