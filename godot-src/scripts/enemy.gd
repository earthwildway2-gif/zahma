extends CharacterBody3D
class_name Enemy

const OUTFITS := {
	"Swat": "res://models/characters/Swat.glb",
	"Suit": "res://models/characters/Suit.glb",
	"Worker": "res://models/characters/Worker.glb",
	"Punk": "res://models/characters/Punk.glb",
	"King": "res://models/characters/King.glb",
	"Casual": "res://models/characters/Casual.glb",
	"Casual2": "res://models/characters/Casual2.glb",
	"Beach": "res://models/characters/Beach.glb",
	"Adventurer": "res://models/characters/Adventurer.glb",
	"Farmer": "res://models/characters/Farmer.glb",
	"SpaceSuit": "res://models/characters/SpaceSuit.glb",
}
static var _model_cache := {}
static func _model(outfit: String) -> PackedScene:
	if not _model_cache.has(outfit):
		_model_cache[outfit] = load(OUTFITS.get(outfit, OUTFITS["Swat"]))
	return _model_cache[outfit]

@export var enemy_name := "حارس"
@export var outfit := "Swat"
@export var max_health := 50.0
@export var speed := 2.2
@export var chase_speed := 3.4
@export var detect_radius := 10.0
@export var attack_range := 9.0
@export var damage := 4.0
@export var is_boss := false

var health := max_health
var state := "patrol"  # patrol, chase, attack, dead
var patrol_a: Vector3
var patrol_b: Vector3
var patrol_target: Vector3
var attack_cooldown := 0.0
var player: Node3D = null
var GRAVITY := 10.5
var sfx: AudioStreamPlayer3D
var alerted_once := false

var model_root: Node3D
var anim: AnimationPlayer
var nav_agent: NavigationAgent3D
var cur_anim := ""
var hit_flash_t := 0.0
var mesh_mats := []  # [{mesh, surface_idx, material, orig_color}]

signal died(enemy)

func _ready() -> void:
	add_to_group("enemies")
	var scale_mul := 1.32 if is_boss else 1.0
	var shape := CapsuleShape3D.new()
	shape.radius = 0.32 * scale_mul
	shape.height = 1.75 * scale_mul
	var col := CollisionShape3D.new()
	col.shape = shape
	col.position.y = 0.9 * scale_mul
	add_child(col)

	model_root = _model(outfit).instantiate()
	add_child(model_root)
	model_root.scale = Vector3.ONE * scale_mul

	anim = _find_anim_player(model_root)
	if anim:
		anim.playback_default_blend_time = 0.15
		_play_anim("Idle")

	_style_materials(model_root)

	var label := Label3D.new()
	label.text = enemy_name
	label.position.y = 2.0 * scale_mul
	label.font_size = 32
	label.no_depth_test = true
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.modulate = Color(1, 0.65, 0.25) if is_boss else Color(1, 1, 1)
	add_child(label)

	sfx = AudioStreamPlayer3D.new(); add_child(sfx); sfx.unit_size = 8.0

	nav_agent = NavigationAgent3D.new()
	nav_agent.path_desired_distance = 0.6
	nav_agent.target_desired_distance = 0.6
	nav_agent.radius = 0.35
	nav_agent.height = 1.75
	nav_agent.avoidance_enabled = false
	add_child(nav_agent)

	patrol_a = global_position
	patrol_b = global_position + Vector3(randf_range(-4, 4), 0, randf_range(-4, 4))
	patrol_target = patrol_b
	health = max_health

	var players := get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		player = players[0]

func _find_anim_player(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var r := _find_anim_player(c)
		if r:
			return r
	return null

func _find_meshes(n: Node, out: Array) -> void:
	if n is MeshInstance3D:
		out.append(n)
	for c in n.get_children():
		_find_meshes(c, out)

static var _toon_shader_cache: Shader
static func _toon_shader_res() -> Shader:
	if _toon_shader_cache:
		return _toon_shader_cache
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode diffuse_toon, specular_toon, cull_back;
uniform vec4 albedo_color : source_color = vec4(1.0);
uniform sampler2D albedo_tex : source_color, filter_linear;
uniform float use_tex = 0.0;
void fragment() {
	vec3 base = albedo_color.rgb;
	if (use_tex > 0.5) {
		base *= texture(albedo_tex, UV).rgb;
	}
	ALBEDO = base;
	ROUGHNESS = 0.7;
	METALLIC = 0.0;
	SPECULAR = 0.3;
}
"""
	_toon_shader_cache = sh
	return sh

static var _outline_shader_cache: Shader
static func _outline_shader_res() -> Shader:
	if _outline_shader_cache:
		return _outline_shader_cache
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode cull_front, unshaded, depth_draw_always;
uniform float outline_width = 0.012;
void vertex() {
	VERTEX += NORMAL * outline_width;
}
void fragment() {
	ALBEDO = vec3(0.02, 0.02, 0.03);
}
"""
	_outline_shader_cache = sh
	return sh

func _style_materials(root: Node) -> void:
	# convert each mesh's existing (already well-designed) materials to toon-shaded
	# versions that keep their own color, instead of overriding with a single tint.
	var meshes: Array = []
	_find_meshes(root, meshes)
	for mi in meshes:
		if not mi.mesh:
			continue
		for si in mi.mesh.get_surface_count():
			var base_mat: Material = mi.mesh.surface_get_material(si)
			var color := Color(0.7, 0.7, 0.7)
			var tex: Texture2D = null
			if base_mat is StandardMaterial3D:
				color = base_mat.albedo_color
				tex = base_mat.albedo_texture
			var mat := ShaderMaterial.new()
			mat.shader = _toon_shader_res()
			mat.set_shader_parameter("albedo_color", color)
			if tex:
				mat.set_shader_parameter("use_tex", 1.0)
				mat.set_shader_parameter("albedo_tex", tex)
			mi.set_surface_override_material(si, mat)
			mesh_mats.append({"mesh": mi, "idx": si, "mat": mat, "orig": color})
		_add_outline(mi, 0.01)

func _add_outline(mi: MeshInstance3D, width: float) -> void:
	var outline := MeshInstance3D.new()
	outline.mesh = mi.mesh
	var m := ShaderMaterial.new()
	m.shader = _outline_shader_res()
	m.set_shader_parameter("outline_width", width)
	outline.material_override = m
	outline.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.add_child(outline)

func _play_anim(name: String, force := false) -> void:
	if not anim or not anim.has_animation(name):
		return
	if cur_anim == name and not force:
		return
	cur_anim = name
	anim.play(name)

func _play(sound_name: String, vol: float = 1.0) -> void:
	var stream: AudioStream = load("res://sfx/%s.wav" % sound_name)
	if stream:
		sfx.stream = stream
		sfx.volume_db = linear_to_db(vol)
		sfx.play()

func take_damage(amount: float, _hit_pos: Vector3 = Vector3.ZERO, headshot: bool = false) -> void:
	if state == "dead":
		return
	health -= amount
	_play("headshot" if headshot else "hit", 0.7)
	hit_flash_t = 0.1
	for m in mesh_mats:
		m["mat"].set_shader_parameter("albedo_color", Color(2.2, 2.2, 2.2))
	if health <= 0:
		_die()
	else:
		if state != "attack":
			_play_anim("HitRecieve", true)
		if state == "patrol":
			state = "chase"
			if not alerted_once:
				alerted_once = true
				_play("alert", 0.6)

func _die() -> void:
	state = "dead"
	set_collision_layer_value(1, false)
	set_collision_mask_value(1, false)
	_play("death", 0.8)
	_play_anim("Death", true)
	died.emit(self)

func _physics_process(delta: float) -> void:
	if hit_flash_t > 0:
		hit_flash_t -= delta
		if hit_flash_t <= 0:
			for m in mesh_mats:
				m["mat"].set_shader_parameter("albedo_color", m["orig"])

	if state == "dead":
		return
	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	else:
		velocity.y = 0

	if not is_instance_valid(player):
		var players := get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			player = players[0]

	var to_player := Vector3.ZERO
	var dist := 999.0
	if is_instance_valid(player):
		to_player = player.global_position - global_position
		dist = to_player.length()

	var moving_anim := ""
	if state == "patrol":
		if dist < detect_radius:
			state = "chase"
		else:
			var to_target := patrol_target - global_position
			to_target.y = 0
			if to_target.length() < 0.8:
				patrol_target = patrol_a if patrol_target == patrol_b else patrol_b
			else:
				var dir := _nav_dir(patrol_target)
				if dir.length() > 0.01:
					_face(dir)
					velocity.x = dir.x * speed
					velocity.z = dir.z * speed
					moving_anim = "Walk"
	elif state == "chase":
		if dist > detect_radius * 1.8:
			state = "patrol"
		elif dist < attack_range:
			state = "attack"
		else:
			if not alerted_once:
				alerted_once = true
				_play("alert", 0.6)
			var dir := _nav_dir(player.global_position)
			if dir.length() > 0.01:
				_face(dir)
				velocity.x = dir.x * chase_speed
				velocity.z = dir.z * chase_speed
				moving_anim = "Run"
	elif state == "attack":
		velocity.x = 0
		velocity.z = 0
		if dist > attack_range * 1.2:
			state = "chase"
		else:
			_face(to_player)
			attack_cooldown -= delta
			if attack_cooldown <= 0 and is_instance_valid(player):
				_shoot_at_player(dist)
				attack_cooldown = 1.0 if is_boss else 1.3

	move_and_slide()

	if state == "attack":
		_play_anim("Idle_Gun_Shoot")
	elif moving_anim != "":
		_play_anim(moving_anim)
	elif state != "dead":
		_play_anim("Idle")

func _nav_dir(target: Vector3) -> Vector3:
	nav_agent.target_position = target
	if nav_agent.is_navigation_finished():
		var direct := target - global_position
		direct.y = 0
		return direct.normalized() if direct.length() > 0.6 else Vector3.ZERO
	var next_pos: Vector3 = nav_agent.get_next_path_position()
	var d := next_pos - global_position
	d.y = 0
	if d.length() < 0.01:
		var direct2 := target - global_position
		direct2.y = 0
		return direct2.normalized() if direct2.length() > 0.6 else Vector3.ZERO
	return d.normalized()

func _face(dir: Vector3) -> void:
	dir.y = 0
	if dir.length() < 0.01:
		return
	var wanted := Transform3D().looking_at(dir.normalized(), Vector3.UP)
	var target_yaw := wanted.basis.get_euler().y
	rotation.y = lerp_angle(rotation.y, target_yaw, 0.12)

func _shoot_at_player(dist: float) -> void:
	var muzzle_pos := global_position + Vector3(0, 1.3 * (1.32 if is_boss else 1.0), 0) + (-global_transform.basis.z) * 0.4
	var hit_chance: float = clamp(0.82 - dist * 0.015, 0.25, 0.82)
	var will_hit := randf() < hit_chance
	var target_pos: Vector3
	if is_instance_valid(player):
		target_pos = player.global_position + Vector3(0, 1.2, 0)
		if not will_hit:
			target_pos += Vector3(randf_range(-1.2, 1.2), randf_range(-0.6, 1.0), randf_range(-1.2, 1.2))
	else:
		target_pos = muzzle_pos - global_transform.basis.z * 20.0

	_play("rifle" if is_boss else "pistol", 0.55)
	_spawn_tracer(muzzle_pos, target_pos)
	var light := OmniLight3D.new()
	light.light_color = Color(1.0, 0.75, 0.4)
	light.light_energy = 3.0
	light.omni_range = 2.5
	light.position = muzzle_pos
	get_tree().current_scene.add_child(light)
	var tw := create_tween()
	tw.tween_property(light, "light_energy", 0.0, 0.08)
	tw.tween_callback(light.queue_free)

	if will_hit and is_instance_valid(player) and player.has_method("take_damage"):
		player.take_damage(damage * (1.6 if is_boss else 1.0))

func _spawn_tracer(from_pos: Vector3, to_pos: Vector3) -> void:
	var line := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	var dist := from_pos.distance_to(to_pos)
	if dist < 0.05:
		return
	cyl.top_radius = 0.01; cyl.bottom_radius = 0.01; cyl.height = dist
	line.mesh = cyl
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.55, 0.3)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.45, 0.2)
	mat.emission_energy_multiplier = 3.5
	line.material_override = mat
	get_tree().current_scene.add_child(line)
	line.global_position = from_pos.lerp(to_pos, 0.5)
	line.look_at(to_pos, Vector3.UP)
	line.rotate_object_local(Vector3.RIGHT, PI / 2.0)
	var tw := create_tween()
	tw.tween_property(line, "scale", Vector3(0.2, 1.0, 0.2), 0.08)
	tw.tween_callback(line.queue_free)
