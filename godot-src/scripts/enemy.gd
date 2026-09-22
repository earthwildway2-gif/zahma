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
	if mesh_inst:
		for i in mesh_inst.get_surface_override_material_count() if mesh_inst.mesh else 0:
			pass
		if mesh_inst.mesh:
			for si in mesh_inst.mesh.get_surface_count():
				var base_mat := mesh_inst.mesh.surface_get_material(si)
				var mat: StandardMaterial3D
				if base_mat is StandardMaterial3D:
					mat = base_mat.duplicate()
				else:
					mat = StandardMaterial3D.new()
				mat.albedo_color = body_tint
				mat.roughness = 0.8
				mesh_inst.set_surface_override_material(si, mat)

	var label := Label3D.new()
	label.text = enemy_name
	label.position.y = 2.05 * scale_mul
	label.font_size = 32
	label.no_depth_test = true
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.modulate = Color(1, 0.65, 0.25) if is_boss else Color(1, 1, 1)
	add_child(label)

	sfx = AudioStreamPlayer3D.new(); add_child(sfx); sfx.unit_size = 8.0

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

func take_damage(amount: float, _hit_pos: Vector3 = Vector3.ZERO, headshot: bool = false) -> void:
	if state == "dead":
		return
	health -= amount
	_play("headshot" if headshot else "hit", 0.7)
	if mesh_inst:
		for si in mesh_inst.get_surface_override_material_count():
			var m := mesh_inst.get_surface_override_material(si)
			if m is StandardMaterial3D:
				var orig: Color = m.albedo_color
				m.albedo_color = Color(1, 1, 1)
				get_tree().create_timer(0.08).timeout.connect(func():
					if is_instance_valid(self) and m:
						m.albedo_color = orig
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
			if to_target.length() < 0.6:
				patrol_target = patrol_a if patrol_target == patrol_b else patrol_b
			else:
				_face(to_target)
				var dir := to_target.normalized()
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
			var dir := to_player.normalized()
			_face(to_player)
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
			if attack_cooldown <= 0 and is_instance_valid(player) and player.has_method("take_damage"):
				player.take_damage(damage)
				attack_cooldown = 1.5

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
