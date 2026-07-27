extends Control

@export var game_scenes: Dictionary = {
	"tetris": preload("res://scenes/tetris.tscn"),
	"2048": preload("res://scenes/twenty48.tscn"),
	"minesweeper": preload("res://scenes/minesweeper.tscn"),
	"snake": preload("res://scenes/snake.tscn"),
	"space_invaders": preload("res://scenes/space_invaders.tscn"),
}

func _ready():
	var game := "menu"
	if OS.has_feature("web"):
		var q = JavaScriptBridge.eval("new URLSearchParams(window.location.search).get('game') || 'menu'")
		if q is String:
			game = q

	var scene = game_scenes.get(game)
	if scene == null:
		show_menu()
	else:
		start_game(scene)

func show_menu():
	var label = Label.new()
	label.text = "Late Mini Games"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	label.add_theme_font_size_override("font_size", 32)
	add_child(label)

func start_game(scene: PackedScene):
	for c in get_children():
		c.queue_free()
	var instance = scene.instantiate()
	instance.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(instance)