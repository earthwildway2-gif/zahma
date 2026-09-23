extends CharacterBody3D
class_name Enemy

const MODEL := preload("res://models/CesiumMan.glb")

@export var enemy_name := "حارس"
@export var max_health := 50.0
@export var speed := 2.2
@export var chase_speed := 3.2
@export var detect_radius := 10.0
@export var attack_range := 9.0
@export var damage := 4.0
@export var body_tint := Color(1.0, 1.0, 1.0)
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
var anim_name := ""
var mesh_inst: MeshInstance3D
var moving_visual := false
var model_scale := 1.0
var nav_agent: NavigationAgent3D

signal died(enemy)

func _ready() -> void:
	add_to_group("enemies")
	var scale_mul := 1.35 if is_boss else 1.0
	var shape := CapsuleShape3D.new()
	shape.radius = 0.3 * scale_mul
	shape.height = 1.75 * scale_mul
	var col := CollisionShape3D.new()
	col.shape = shape
	col.position.y = 0.9 * scale_mul
	add_child(col)

	model_root = MODEL.instantiate()
	add_child(model_root)
	# CesiumMan is authored ~1.5m tall (local, pre Z-up-correction); scale it to our target height.
	model_scale = 1.78 * scale_mul
	model_root.scale = Vector3.ONE * model_scale

	anim = _find_anim_player(model_root)
	if anim:
		var list := anim.get_animation_list()
		if list.size() > 0:
			anim_name = list[0]
			anim.play(anim_name)
			anim.pause()

	mesh_inst = _find_mesh(model_root)
	if mesh_inst and mesh_inst.mesh:
		for si in mesh_inst.mesh.get_surface_count():
			var base_mat := mesh_inst.mesh.surface_get_material(si)
			var tex: Texture2D = null
			if base_mat is StandardMaterial3D and base_mat.albedo_texture:
				tex = base_mat.albedo_texture
			var mat := ShaderMaterial.new()
			mat.shader = _toon_shader_res()
			mat.set_shader_parameter("albedo_color", body_tint)
			if tex:
				mat.set_shader_parameter("use_tex", 1.0)
				mat.set_shader_parameter("albedo_tex", tex)
				mat.set_shader_parameter("uv_scale", Vector2(1, 1))
			mesh_inst.set_surface_override_material(si, mat)
		_add_outline(mesh_inst, 0.022 * model_scale)

	_build_gear()

	var label := Label3D.new()
	label.text = enemy_name
	label.position.y = 2.05 * scale_mul
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

func _find_skeleton(n: Node) -> Skeleton3D:
	if n is Skeleton3D:
		return n
	for c in n.get_children():
		var r := _find_skeleton(c)
		if r:
			return r
	return null

func _gear_mat(color: Color) -> ShaderMaterial:
	var m := ShaderMaterial.new()
	m.shader = _toon_shader_res()
	m.set_shader_parameter("albedo_color", color)
	return m

func _attach_prop(skel: Skeleton3D, bone_name: String, mesh: Mesh, offset: Vector3, mat: ShaderMaterial, rot := Vector3.ZERO) -> void:
	var bone_idx := skel.find_bone(bone_name)
	if bone_idx < 0:
		return
	var att := BoneAttachment3D.new()
	att.bone_name = bone_name
	skel.add_child(att)
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = offset
	mi.rotation_degrees = rot
	att.add_child(mi)

func _build_gear() -> void:
	var skel := _find_skeleton(model_root)
	if not skel:
		return
	var gear_dark := _gear_mat(Color(0.06, 0.06, 0.07))
	var gear_mid := _gear_mat(Color(0.14, 0.13, 0.1))
	# NOTE: sizes/offsets below are in real human-scale meters, unscaled.
	# BoneAttachment3D already inherits the skeleton's world scale (model_scale),
	# so multiplying here again would double-scale everything.

	# helmet / cap
	var helmet := SphereMesh.new(); helmet.radius = 0.14; helmet.height = 0.24
	helmet.radial_segments = 10; helmet.rings = 6
	_attach_prop(skel, "Skeleton_neck_joint_2", helmet, Vector3(0, 0.09, 0), gear_dark)
	var brim := BoxMesh.new(); brim.size = Vector3(0.24, 0.03, 0.14)
	_attach_prop(skel, "Skeleton_neck_joint_2", brim, Vector3(0, 0.13, 0.05), gear_dark)

	# chest vest (front plate)
	var vest := BoxMesh.new(); vest.size = Vector3(0.32, 0.34, 0.14)
	_attach_prop(skel, "torso_joint_3", vest, Vector3(0, 0.02, 0.05), gear_mid)
	for side in [-1, 1]:
		var strap := BoxMesh.new(); strap.size = Vector3(0.07, 0.22, 0.09)
		_attach_prop(skel, "torso_joint_3", strap, Vector3(0.14 * side, 0.14, 0), gear_dark)

	# backpack
	var pack := BoxMesh.new(); pack.size = Vector3(0.26, 0.32, 0.16)
	_attach_prop(skel, "torso_joint_3", pack, Vector3(0, 0.0, -0.14), gear_dark)

	# belt / hip pouches
	var belt := BoxMesh.new(); belt.size = Vector3(0.36, 0.09, 0.24)
	_attach_prop(skel, "Skeleton_torso_joint_1", belt, Vector3(0, 0.0, 0), gear_dark)
	for side in [-1, 1]:
		var pouch := BoxMesh.new(); pouch.size = Vector3(0.1, 0.1, 0.08)
		_attach_prop(skel, "Skeleton_torso_joint_1", pouch, Vector3(0.16 * side, -0.06, 0.1), gear_mid)

	# shoulder pads
	for side_name in ["R", "L"]:
		var pad := BoxMesh.new(); pad.size = Vector3(0.13, 0.1, 0.13)
		_attach_prop(skel, "Skeleton_arm_joint_%s" % side_name, pad, Vector3(0, 0.02, 0), gear_dark)

	# boots
	for bone in ["leg_joint_R_5", "leg_joint_L_5"]:
		var boot := BoxMesh.new(); boot.size = Vector3(0.15, 0.12, 0.24)
		_attach_prop(skel, bone, boot, Vector3(0, -0.02, 0.03), gear_dark)

	# a more readable held weapon: body + stock
	var gun_body := BoxMesh.new(); gun_body.size = Vector3(0.07, 0.09, 0.45)
	_attach_prop(skel, "Skeleton_arm_joint_R__3_", gun_body, Vector3(0.02, -0.02, -0.32), gear_dark)
	var gun_stock := BoxMesh.new(); gun_stock.size = Vector3(0.05, 0.1, 0.16)
	_attach_prop(skel, "Skeleton_arm_joint_R__3_", gun_stock, Vector3(0.02, -0.03, -0.05), gear_dark)

func _find_mesh(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D:
		return n
	for c in n.get_children():
		var r := _find_mesh(c)
		if r:
			return r
	return null

func _play(sound_name: String, vol: float = 1.0) -> void:
	var stream: AudioStream = load("res://sfx/%s.wav" % sound_name)
	if stream:
		sfx.stream = stream
		sfx.volume_db = linear_to_db(vol)
		sfx.play()

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
uniform vec2 uv_scale = vec2(1.0, 1.0);
void fragment() {
	vec3 base = albedo_color.rgb;
	if (use_tex > 0.5) {
		base *= texture(albedo_tex, UV * uv_scale).rgb;
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
uniform float outline_width = 0.015;
void vertex() {
	VERTEX += NORMAL * outline_width;
}
void fragment() {
	ALBEDO = vec3(0.02, 0.02, 0.03);
}
"""
	_outline_shader_cache = sh
	return sh

func _add_outline(mi: MeshInstance3D, width: float) -> void:
	var outline := MeshInstance3D.new()
	outline.mesh = mi.mesh
	var m := ShaderMaterial.new()
	m.shader = _outline_shader_res()
	m.set_shader_parameter("outline_width", width)
	outline.material_override = m
	outline.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	mi.add_child(outline)

func take_damage(amount: float, _hit_pos: Vector3 = Vector3.ZERO, headshot: bool = false) -> void:
	if state == "dead":
		return
	health -= amount
	_play("headshot" if headshot else "hit", 0.7)
	if mesh_inst:
		for si in mesh_inst.get_surface_override_material_count():
			var m := mesh_inst.get_surface_override_material(si)
			if m is ShaderMaterial:
				var orig: Color = m.get_shader_parameter("albedo_color")
				m.set_shader_parameter("albedo_color", Color(2.5, 2.5, 2.5))
				get_tree().create_timer(0.08).timeout.connect(func():
					if is_instance_valid(self) and m:
						m.set_shader_parameter("albedo_color", orig)
				)
	if health <= 0:
		_die()
	elif state == "patrol":
		state = "chase"
		if not alerted_once:
			alerted_once = true
			_play("alert", 0.6)

func _die() -> void:
	state = "dead"
	set_collision_layer_value(1, false)
	set_collision_mask_value(1, false)
	_play("death", 0.8)
	var tw := create_tween()
	tw.tween_property(self, "rotation:z", PI / 2.0, 0.4)
	tw.parallel().tween_property(self, "position:y", position.y - 0.3, 0.4)
	died.emit(self)

func _physics_process(delta: float) -> void:
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

	moving_visual = false
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
					moving_visual = true
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
				moving_visual = true
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

	if anim and anim_name != "":
		if moving_visual:
			if anim.is_playing() == false or anim.current_animation != anim_name:
				anim.play(anim_name)
			anim.speed_scale = 1.0
		else:
			anim.speed_scale = 0.0
			if not anim.is_playing():
				anim.play(anim_name)

func _face(dir: Vector3) -> void:
	dir.y = 0
	if dir.length() < 0.01:
		return
	var wanted := Transform3D().looking_at(dir.normalized(), Vector3.UP)
	var target_yaw := wanted.basis.get_euler().y
	rotation.y = lerp_angle(rotation.y, target_yaw, 0.12)

func _nav_dir(target: Vector3) -> Vector3:
	nav_agent.target_position = target
	if not nav_agent.is_target_reachable() and Engine.get_physics_frames() < 10:
		pass  # nav map may not be synced yet this early; fall through to direct fallback below
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

func _shoot_at_player(dist: float) -> void:
	var muzzle_pos := global_position + Vector3(0, 1.4 * (1.35 if is_boss else 1.0), 0) + (-global_transform.basis.z) * 0.4
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
