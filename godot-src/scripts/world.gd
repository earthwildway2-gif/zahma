extends Node3D

var player: Player
var yard_enemies: Array = []
var wh_enemies: Array = []
var boss: Enemy = null
var warehouse_door: StaticBody3D
var stage := 0  # 0 = clear yard, 1 = clear warehouse, 2 = boss, 3 = won

var hud_health: Label
var hud_ammo: Label
var hud_status: Label
var hud_msg: Label
var crosshair: ColorRect

func _ready() -> void:
	_build_environment()
	_build_ground()
	_build_yard()
	_build_warehouse()
	await _bake_navigation()
	_spawn_player()
	_spawn_yard_enemies()
	_spawn_pickups()
	_build_hud()
	_set_status("خلّص الحرس اللي في الحوش")
	_start_music()

func _start_music() -> void:
	var music := AudioStreamPlayer.new()
	var stream: AudioStream = load("res://sfx/music_tension.wav")
	if stream:
		if stream is AudioStreamWAV:
			stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		music.stream = stream
		music.volume_db = -14.0
		music.autoplay = true
		add_child(music)
		music.play()

func _build_environment() -> void:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_SKY
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.04, 0.055, 0.12)
	sky_mat.sky_horizon_color = Color(0.14, 0.12, 0.17)
	sky_mat.ground_bottom_color = Color(0.02, 0.02, 0.03)
	sky_mat.ground_horizon_color = Color(0.1, 0.09, 0.11)
	sky_mat.sun_angle_max = 4.0
	var sky := Sky.new()
	sky.sky_material = sky_mat
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	e.ambient_light_energy = 1.0
	e.fog_enabled = true
	e.fog_light_color = Color(0.11, 0.13, 0.2)
	e.fog_density = 0.011
	e.fog_aerial_perspective = 0.3
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.tonemap_white = 1.6
	e.glow_enabled = true
	e.glow_intensity = 1.1
	e.glow_bloom = 0.15
	e.glow_strength = 1.2
	e.glow_hdr_threshold = 0.85
	e.glow_blend_mode = Environment.GLOW_BLEND_MODE_SOFTLIGHT
	e.adjustment_enabled = true
	e.adjustment_brightness = 1.35
	e.adjustment_contrast = 1.22
	e.adjustment_saturation = 1.28
	env.environment = e
	add_child(env)

	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-52, -40, 0)
	moon.light_color = Color(0.78, 0.83, 1.0)
	moon.light_energy = 2.0
	moon.shadow_enabled = true
	moon.directional_shadow_max_distance = 90.0
	moon.shadow_blur = 1.6
	moon.directional_shadow_split_1 = 0.1
	moon.directional_shadow_split_2 = 0.3
	add_child(moon)

	var rim := DirectionalLight3D.new()   # cool kicker from the opposite side for a two-tone cinematic look
	rim.rotation_degrees = Vector3(-25, 130, 0)
	rim.light_color = Color(0.35, 0.5, 0.95)
	rim.light_energy = 0.15
	add_child(rim)

	get_viewport().msaa_3d = Viewport.MSAA_2X
	get_viewport().screen_space_aa = Viewport.SCREEN_SPACE_AA_FXAA
	_build_postfx()

func _build_postfx() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 90
	add_child(layer)
	var rect := ColorRect.new()
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var shader := Shader.new()
	shader.code = """
shader_type canvas_item;
uniform sampler2D screen_tex : hint_screen_texture, filter_linear;
uniform float time_val = 0.0;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.7, 289.1))) * 43758.5453); }

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 center = uv - 0.5;
	float vig = 1.0 - dot(center, center) * 0.55;
	vig = clamp(vig, 0.0, 1.0);

	// subtle chromatic aberration, stronger toward the edges
	float ca = length(center) * 0.0035;
	vec2 dir = normalize(center + 0.0001);
	float r = texture(screen_tex, uv - dir * ca).r;
	float g = texture(screen_tex, uv).g;
	float b = texture(screen_tex, uv + dir * ca).b;
	vec3 col = vec3(r, g, b);

	col *= vig;
	col += (hash(uv * vec2(1920.0, 1080.0) + time_val) - 0.5) * 0.02;

	COLOR = vec4(col, 1.0);
}
"""
	var mat := ShaderMaterial.new()
	mat.shader = shader
	rect.material = mat
	layer.add_child(rect)
	var tw := create_tween().set_loops()
	tw.tween_method(func(t): mat.set_shader_parameter("time_val", t), 0.0, 1000.0, 1000.0)

var _tex_cache := {}
func _tex(name: String) -> Texture2D:
	if _tex_cache.has(name):
		return _tex_cache[name]
	var t: Texture2D = load("res://textures/%s.jpg" % name)
	_tex_cache[name] = t
	return t

var _toon_shader: Shader
func _toon_shader_res() -> Shader:
	if _toon_shader:
		return _toon_shader
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode diffuse_toon, specular_toon, cull_back;
uniform vec4 albedo_color : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear;
uniform float use_tex = 0.0;
uniform vec2 uv_scale = vec2(1.0, 1.0);
void fragment() {
	vec3 base = albedo_color.rgb;
	if (use_tex > 0.5) {
		base *= texture(albedo_tex, UV * uv_scale).rgb;
	}
	ALBEDO = base;
	ROUGHNESS = 0.75;
	METALLIC = 0.0;
	SPECULAR = 0.25;
}
"""
	_toon_shader = sh
	return sh

func _toon_mat(color: Color, tex_name := "", uv_scale := Vector2(1, 1)) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _toon_shader_res()
	m.set_shader_parameter("albedo_color", color)
	if tex_name != "":
		m.set_shader_parameter("use_tex", 1.0)
		m.set_shader_parameter("albedo_tex", _tex(tex_name))
		m.set_shader_parameter("uv_scale", uv_scale)
	return m

var _outline_shader: Shader
func _outline_shader_res() -> Shader:
	if _outline_shader:
		return _outline_shader
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_front, unshaded, depth_draw_always;
uniform float outline_width = 0.02;
void vertex() {
	VERTEX += NORMAL * outline_width;
}
void fragment() {
	ALBEDO = vec3(0.02, 0.02, 0.03);
}
"""
	_outline_shader = sh
	return sh

func _add_outline(mesh_inst: MeshInstance3D, width := 0.02) -> void:
	var outline := MeshInstance3D.new()
	outline.mesh = mesh_inst.mesh
	var m := ShaderMaterial.new()
	m.shader = _outline_shader_res()
	m.set_shader_parameter("outline_width", width)
	outline.material_override = m
	outline.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mesh_inst.add_child(outline)

func _build_ground() -> void:
	var body := StaticBody3D.new()
	body.name = "Ground"
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(90, 0.2, 130)
	col.shape = shape
	col.position.y = -0.1
	body.add_child(col)
	var mesh := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(90, 130)
	plane.subdivide_width = 1
	plane.subdivide_depth = 1
	mesh.mesh = plane
	mesh.material_override = _toon_mat(Color(0.62, 0.63, 0.68), "ground", Vector2(30, 42))
	body.add_child(mesh)
	body.position.z = -15
	add_child(body)

func _add_box(pos: Vector3, size: Vector3, color: Color, name_hint := "", tex_name := "") -> StaticBody3D:
	var body := StaticBody3D.new()
	if name_hint != "": body.name = name_hint
	var col := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	col.shape = shape
	body.add_child(col)
	var mesh := MeshInstance3D.new()
	var box := BoxMesh.new()
	box.size = size
	mesh.mesh = box
	mesh.material_override = _toon_mat(color, tex_name, Vector2(max(1.0, size.x / 1.4), max(1.0, size.y / 1.0)))
	body.add_child(mesh)
	body.position = pos
	add_child(body)
	_add_outline(mesh, 0.04)
	return body

func _add_lamp(pos: Vector3) -> void:
	_add_box(pos + Vector3(0, 2.5, 0), Vector3(0.15, 5.0, 0.15), Color(0.15, 0.15, 0.17))
	var light := OmniLight3D.new()
	light.position = pos + Vector3(0, 5.0, 0)
	light.light_color = Color(1.0, 0.85, 0.55)
	light.light_energy = 2.2
	light.omni_range = 12.0
	add_child(light)

var nav_region: NavigationRegion3D

func _bake_navigation() -> void:
	nav_region = NavigationRegion3D.new()
	var navmesh := NavigationMesh.new()
	navmesh.agent_radius = 0.45
	navmesh.agent_height = 1.8
	navmesh.agent_max_climb = 0.3
	navmesh.cell_size = 0.25
	navmesh.cell_height = 0.25
	navmesh.filter_baking_aabb = AABB(Vector3(-45, -1, -55), Vector3(90, 8, 90))
	navmesh.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	nav_region.navigation_mesh = navmesh
	add_child(nav_region)
	nav_region.bake_navigation_mesh()
	# let the NavigationServer finish syncing the new region into its map before any agent queries it
	await get_tree().physics_frame
	await get_tree().physics_frame
	await get_tree().physics_frame

func _build_yard() -> void:
	var crate_color := Color(0.85, 0.78, 0.62)
	var positions := [
		Vector3(-6, 0.5, -2), Vector3(4, 0.5, -6), Vector3(8, 0.5, 4),
		Vector3(-9, 0.5, 8), Vector3(0, 0.5, -10), Vector3(-4, 0.5, 12),
		Vector3(10, 0.5, -4), Vector3(-11, 0.5, -6)
	]
	for p in positions:
		_add_box(p, Vector3(1.4, 1.0, 1.4), crate_color, "", "wood")
	_add_box(Vector3(0, 2, 22), Vector3(44, 4, 1), Color(0.75, 0.75, 0.78), "", "concrete")
	_add_box(Vector3(-22, 2, 5), Vector3(1, 4, 34), Color(0.75, 0.75, 0.78), "", "concrete")
	_add_box(Vector3(22, 2, 5), Vector3(1, 4, 34), Color(0.75, 0.75, 0.78), "", "concrete")
	_add_lamp(Vector3(-14, 0, 10))
	_add_lamp(Vector3(14, 0, 10))
	_add_lamp(Vector3(-14, 0, -6))
	_add_lamp(Vector3(14, 0, -6))
	_add_box(Vector3(-16, 1.5, -10), Vector3(3, 3, 6), Color(0.55, 0.75, 0.65), "", "metal")
	_add_box(Vector3(16, 1.5, -12), Vector3(3, 3, 6), Color(0.8, 0.55, 0.5), "", "metal")

func _build_warehouse() -> void:
	var wall_col := Color(0.7, 0.72, 0.76)
	_add_box(Vector3(0, 2.5, -50), Vector3(28, 5, 1), wall_col, "", "metal")
	_add_box(Vector3(-14, 2.5, -31), Vector3(1, 5, 38), wall_col, "", "metal")
	_add_box(Vector3(14, 2.5, -31), Vector3(1, 5, 38), wall_col, "", "metal")
	_add_box(Vector3(-9, 2.5, -12), Vector3(10, 5, 1), wall_col, "", "metal")
	_add_box(Vector3(9, 2.5, -12), Vector3(10, 5, 1), wall_col, "", "metal")
	var floor_body := StaticBody3D.new()
	var fcol := CollisionShape3D.new(); var fshape := BoxShape3D.new(); fshape.size = Vector3(28, 0.2, 38); fcol.shape = fshape; fcol.position.y = -0.1
	floor_body.add_child(fcol)
	var fmesh := MeshInstance3D.new(); var fplane := PlaneMesh.new(); fplane.size = Vector2(28, 38); fmesh.mesh = fplane
	fmesh.material_override = _toon_mat(Color(0.55, 0.55, 0.58), "concrete", Vector2(10, 14))
	floor_body.add_child(fmesh)
	floor_body.position = Vector3(0, 0.01, -31)
	add_child(floor_body)
	warehouse_door = _add_box(Vector3(0, 2.5, -12), Vector3(8, 5, 0.6), Color(0.55, 0.5, 0.45), "WarehouseDoor", "metal")
	for p in [Vector3(-6, 0.5, -20), Vector3(6, 0.5, -22), Vector3(-4, 0.5, -34), Vector3(5, 0.5, -38), Vector3(0, 0.5, -44)]:
		_add_box(p, Vector3(1.5, 1.0, 1.5), Color(0.8, 0.7, 0.55), "", "wood")
	_add_lamp(Vector3(-8, 0, -20))
	_add_lamp(Vector3(8, 0, -20))
	_add_lamp(Vector3(0, 0, -40))

func _spawn_player() -> void:
	player = Player.new()
	player.position = Vector3(0, 1, 15)
	add_child(player)
	player.died.connect(_on_player_died)

func _spawn_yard_enemies() -> void:
	var spots := [Vector3(-6, 1, -2), Vector3(5, 1, -6), Vector3(9, 1, 4), Vector3(-8, 1, 8)]
	var names := ["المطرب كوكو الأسمر", "الكابتن قرش الكورة", "المؤثرة ميرو ستار", "الفنان عادل التمثيل"]
	var colors := [Color(0.55, 0.18, 0.16), Color(0.2, 0.32, 0.5), Color(0.5, 0.22, 0.45), Color(0.3, 0.45, 0.25)]
	for i in spots.size():
		var en := Enemy.new()
		en.enemy_name = names[i]
		en.body_tint = colors[i]
		en.position = spots[i]
		add_child(en)
		en.died.connect(_on_yard_enemy_died)
		yard_enemies.append(en)

func _spawn_warehouse_enemies() -> void:
	var spots := [Vector3(-6, 1, -20), Vector3(6, 1, -22), Vector3(-5, 1, -38), Vector3(6, 1, -40)]
	var names := ["المذيع لطفي آخر الليل", "الدوبلير عم صبحي الخطر", "رجل الأعمال منير الذهب", "المطرب دودو ستار"]
	var colors := [Color(0.4, 0.35, 0.15), Color(0.45, 0.2, 0.2), Color(0.25, 0.25, 0.5), Color(0.5, 0.3, 0.1)]
	for i in spots.size():
		var en := Enemy.new()
		en.enemy_name = names[i]
		en.body_tint = colors[i]
		en.detect_radius = 12.0
		en.position = spots[i]
		add_child(en)
		en.died.connect(_on_wh_enemy_died)
		wh_enemies.append(en)

func _spawn_boss() -> void:
	boss = Enemy.new()
	boss.enemy_name = "النجم سيف الصقر"
	boss.body_tint = Color(0.6, 0.15, 0.12)
	boss.max_health = 220.0
	boss.damage = 8.0
	boss.speed = 2.8
	boss.chase_speed = 4.0
	boss.detect_radius = 30.0
	boss.attack_range = 11.0
	boss.is_boss = true
	boss.position = Vector3(0, 1, -46)
	add_child(boss)
	boss.died.connect(_on_boss_died)
	_set_status("النجم سيف الصقر: 100%")

func _spawn_pickups() -> void:
	var rifle := Pickup.new()
	rifle.kind = Pickup.Kind.WEAPON
	rifle.weapon_id = "rifle"
	rifle.position = Vector3(6, 0.3, -8)
	add_child(rifle)

	var shotgun := Pickup.new()
	shotgun.kind = Pickup.Kind.WEAPON
	shotgun.weapon_id = "shotgun"
	shotgun.position = Vector3(-4, 0.3, -30)
	add_child(shotgun)

	for p in [Vector3(-8, 0.3, 6), Vector3(9, 0.3, -18), Vector3(-2, 0.3, -42)]:
		var ammo := Pickup.new()
		ammo.kind = Pickup.Kind.AMMO
		ammo.weapon_id = "pistol"
		ammo.ammo_amount = 24
		ammo.position = p
		add_child(ammo)

	var heal := Pickup.new()
	heal.kind = Pickup.Kind.HEALTH
	heal.heal_amount = 40.0
	heal.position = Vector3(2, 0.3, 2)
	add_child(heal)

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)

	crosshair = ColorRect.new()
	crosshair.color = Color(1, 1, 1, 0.9)
	crosshair.size = Vector2(3, 3)
	crosshair.set_anchors_preset(Control.PRESET_CENTER)
	crosshair.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(crosshair)

	hud_health = Label.new()
	hud_health.position = Vector2(24, 24)
	hud_health.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_health.add_theme_font_size_override("font_size", 22)
	layer.add_child(hud_health)

	hud_ammo = Label.new()
	hud_ammo.position = Vector2(24, 54)
	hud_ammo.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_ammo.add_theme_font_size_override("font_size", 18)
	layer.add_child(hud_ammo)

	hud_status = Label.new()
	hud_status.set_anchors_preset(Control.PRESET_TOP_WIDE)
	hud_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hud_status.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_status.position = Vector2(0, 20)
	hud_status.add_theme_font_size_override("font_size", 20)
	layer.add_child(hud_status)

	hud_msg = Label.new()
	hud_msg.set_anchors_preset(Control.PRESET_CENTER)
	hud_msg.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hud_msg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_msg.add_theme_font_size_override("font_size", 28)
	hud_msg.modulate = Color(1, 1, 1, 0)
	layer.add_child(hud_msg)

	var dmg_flash := ColorRect.new()
	dmg_flash.color = Color(0.7, 0.05, 0.05, 0.0)
	dmg_flash.set_anchors_preset(Control.PRESET_FULL_RECT)
	dmg_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(dmg_flash)

	player.health_changed.connect(func(hp, max_hp): hud_health.text = "الصحة: %d / %d" % [hp, max_hp])
	player.ammo_changed.connect(func(m, r, wname): hud_ammo.text = "%s: %d / %d" % [wname, m, r])
	player.hit_taken.connect(func(_amount):
		dmg_flash.color.a = 0.45
		var tw := create_tween()
		tw.tween_property(dmg_flash, "color:a", 0.0, 0.35)
	)
	hud_health.text = "الصحة: 100 / 100"
	hud_ammo.text = "مسدس: 12 / 48"

func _set_status(text: String) -> void:
	hud_status.text = text

func _flash_msg(text: String) -> void:
	hud_msg.text = text
	hud_msg.modulate.a = 1.0
	var tw := create_tween()
	tw.tween_interval(1.4)
	tw.tween_property(hud_msg, "modulate:a", 0.0, 0.8)

func _on_yard_enemy_died(_e) -> void:
	var alive := 0
	for e in yard_enemies:
		if e.state != "dead": alive += 1
	if alive == 0 and stage == 0:
		stage = 1
		warehouse_door.queue_free()
		_flash_msg("الباب اتفتح")
		_set_status("ادخل المخزن")
		_spawn_warehouse_enemies()
	else:
		_set_status("خلّص الحرس اللي في الحوش: %d" % alive)

func _on_wh_enemy_died(_e) -> void:
	var alive := 0
	for e in wh_enemies:
		if e.state != "dead": alive += 1
	if alive == 0 and stage == 1:
		stage = 2
		_flash_msg("النجم سيف الصقر جاي")
		_spawn_boss()
	else:
		_set_status("خلّص الحرس اللي في المخزن: %d" % alive)

func _on_boss_died(_e) -> void:
	stage = 3
	_flash_msg("خلصت الليلة! 🎉")
	_set_status("النجم سيف الصقر اتقتل. مبروك.")

func _on_player_died() -> void:
	_set_status("اتقتلت. اضغط R لإعادة المحاولة")

func _process(_delta: float) -> void:
	if stage == 2 and is_instance_valid(boss) and boss.state != "dead":
		_set_status("النجم سيف الصقر: %d%%" % int(max(0, boss.health / boss.max_health * 100)))


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and event.keycode == KEY_R:
		if is_instance_valid(player) and player.health <= 0:
			get_tree().reload_current_scene()
