extends CharacterBody3D
class_name Enemy

@export var enemy_name := "حارس"
@export var max_health := 50.0
@export var speed := 2.2
@export var chase_speed := 3.2
@export var detect_radius := 10.0
@export var attack_range := 9.0
@export var damage := 4.0
@export var body_color := Color(0.55, 0.18, 0.16)
@export var is_boss := false
@export var drop_weapon := ""

var health := max_health
var state := "patrol"  # patrol, chase, attack, dead
var patrol_a: Vector3
var patrol_b: Vector3
var patrol_target: Vector3
var attack_cooldown := 0.0
var player: Node3D = null
var body_mat: StandardMaterial3D
var GRAVITY := 10.5
var sfx: AudioStreamPlayer3D
var alerted_once := false

signal died(enemy)

func _ready() -> void:
	add_to_group("enemies")
	var scale_mul := 1.4 if is_boss else 1.0
	var shape := CapsuleShape3D.new()
	shape.radius = 0.35 * scale_mul
	shape.height = 1.75 * scale_mul
	var col := CollisionShape3D.new()
	col.shape = shape
	col.position.y = 0.9 * scale_mul
	add_child(col)

	body_mat = StandardMaterial3D.new()
	body_mat.albedo_color = body_color
	body_mat.roughness = 0.7

	# torso
	var torso := MeshInstance3D.new()
	var cap := CapsuleMesh.new(); cap.radius = 0.28 * scale_mul; cap.height = 1.1 * scale_mul
	torso.mesh = cap; torso.position.y = 1.0 * scale_mul
	torso.material_override = body_mat
	add_child(torso)

	# head
	var head := MeshInstance3D.new()
	var sph := SphereMesh.new(); sph.radius = 0.22 * scale_mul; sph.height = 0.44 * scale_mul
	head.mesh = sph; head.position.y = 1.68 * scale_mul
	var head_mat := StandardMaterial3D.new(); head_mat.albedo_color = Color(0.75, 0.55, 0.42)
	head.material_override = head_mat
	add_child(head)

	# arms
	for side in [-1, 1]:
		var arm := MeshInstance3D.new()
		var acap := CapsuleMesh.new(); acap.radius = 0.08 * scale_mul; acap.height = 0.75 * scale_mul
		arm.mesh = acap
		arm.position = Vector3(0.36 * scale_mul * side, 1.05 * scale_mul, 0.05)
		arm.rotation.z = -0.15 * side
		arm.material_override = body_mat
		add_child(arm)

	# legs
	for side in [-1, 1]:
		var leg := MeshInstance3D.new()
		var lcap := CapsuleMesh.new(); lcap.radius = 0.1 * scale_mul; lcap.height = 0.85 * scale_mul
		leg.mesh = lcap
		leg.position = Vector3(0.14 * scale_mul * side, 0.42 * scale_mul, 0)
		var leg_mat := StandardMaterial3D.new(); leg_mat.albedo_color = Color(0.12, 0.12, 0.14)
		leg.material_override = leg_mat
		add_child(leg)

	# held weapon (visual only)
	var gun := MeshInstance3D.new()
	var gbox := BoxMesh.new(); gbox.size = Vector3(0.06, 0.08, (0.5 if is_boss else 0.35))
	gun.mesh = gbox
	gun.position = Vector3(0.4 * scale_mul, 1.05 * scale_mul, -0.15)
	var gun_mat := StandardMaterial3D.new(); gun_mat.albedo_color = Color(0.05, 0.05, 0.06)
	gun.material_override = gun_mat
	add_child(gun)

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
	var flash_col := body_mat.albedo_color
	body_mat.albedo_color = Color(1, 1, 1)
	get_tree().create_timer(0.08).timeout.connect(func():
		if is_instance_valid(self) and body_mat:
			body_mat.albedo_color = flash_col
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

func _face(dir: Vector3) -> void:
	dir.y = 0
	if dir.length() < 0.01:
		return
	var wanted := Transform3D().looking_at(dir.normalized(), Vector3.UP)
	var target_yaw := wanted.basis.get_euler().y
	rotation.y = lerp_angle(rotation.y, target_yaw, 0.12)
