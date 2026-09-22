extends CharacterBody3D
class_name Player

const WALK_SPEED := 4.2
const SPRINT_SPEED := 7.0
const CROUCH_SPEED := 2.0
const JUMP_VELOCITY := 4.6
const GRAVITY := 10.5
const MOUSE_SENS := 0.0025
const ACCEL := 10.0

const WEAPONS := {
	"pistol": {"name": "مسدس", "dmg": 28.0, "rate": 0.18, "mag": 12, "spread": 0.01, "pellets": 1, "sfx": "pistol"},
	"rifle": {"name": "رشاش", "dmg": 22.0, "rate": 0.1, "mag": 30, "spread": 0.022, "pellets": 1, "sfx": "rifle"},
	"shotgun": {"name": "خرطوش", "dmg": 14.0, "rate": 0.65, "mag": 6, "spread": 0.09, "pellets": 6, "sfx": "shotgun"},
}

var pitch := 0.0
var crouching := false
var health := 100.0
var max_health := 100.0
var can_shoot := true
var fire_cooldown := 0.0

var owned := {"pistol": true, "rifle": false, "shotgun": false}
var mag := {"pistol": 12, "rifle": 0, "shotgun": 0}
var reserve := {"pistol": 48, "rifle": 0, "shotgun": 0}
var current := "pistol"
var reloading := false
var reload_time := 0.0

var head: Node3D
var camera: Camera3D
var gun: Node3D
var muzzle: Node3D
var collider: CollisionShape3D
var sfx: AudioStreamPlayer3D
var footstep_t := 0.0

signal health_changed(hp, max_hp)
signal ammo_changed(mag_count, res_count, weapon_name)
signal died
signal weapon_switched(weapon_id)

func _ready() -> void:
	add_to_group("player")
	var shape := CapsuleShape3D.new()
	shape.radius = 0.4
	shape.height = 1.8
	collider = CollisionShape3D.new(); collider.name = "Collider"; add_child(collider)
	collider.shape = shape
	collider.position.y = 0.9

	head = Node3D.new(); head.name = "Head"; add_child(head)
	head.position.y = 1.6
	camera = Camera3D.new(); camera.name = "Camera3D"; head.add_child(camera)
	camera.fov = 78

	gun = Node3D.new(); gun.name = "Gun"; camera.add_child(gun)
	gun.position = Vector3(0.22, -0.22, -0.5)
	var gun_mesh := MeshInstance3D.new()
	var box := BoxMesh.new(); box.size = Vector3(0.08, 0.1, 0.42)
	gun_mesh.mesh = box
	var gm := StandardMaterial3D.new(); gm.albedo_color = Color(0.08, 0.08, 0.09)
	gun_mesh.material_override = gm
	gun_mesh.name = "GunMesh"
	gun.add_child(gun_mesh)

	muzzle = Node3D.new(); muzzle.name = "Muzzle"; gun.add_child(muzzle)
	muzzle.position = Vector3(0, 0.02, -0.24)

	sfx = AudioStreamPlayer3D.new(); add_child(sfx)
	sfx.unit_size = 6.0

	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	health_changed.emit(health, max_health)
	_emit_ammo()

func _emit_ammo() -> void:
	ammo_changed.emit(mag[current], reserve[current], WEAPONS[current]["name"])

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * MOUSE_SENS)
		pitch = clamp(pitch - event.relative.y * MOUSE_SENS, -1.3, 1.3)
		head.rotation.x = pitch
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if Input.get_mouse_mode() != Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	if Input.is_action_just_pressed("ui_cancel"):
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE if Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED else Input.MOUSE_MODE_CAPTURED)
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1: _switch_weapon("pistol")
			KEY_2: _switch_weapon("rifle")
			KEY_3: _switch_weapon("shotgun")
			KEY_R: _start_reload()

func _switch_weapon(id: String) -> void:
	if not owned.get(id, false) or id == current or reloading:
		return
	current = id
	weapon_switched.emit(id)
	_emit_ammo()

func grant_weapon(id: String) -> void:
	if not owned.get(id, false):
		owned[id] = true
		mag[id] = int(WEAPONS[id]["mag"] * 0.6)
		reserve[id] = WEAPONS[id]["mag"] * 2
		_switch_weapon(id)
	else:
		reserve[id] = min(reserve[id] + WEAPONS[id]["mag"], WEAPONS[id]["mag"] * 4)
		_emit_ammo()

func grant_ammo(id: String, amount: int) -> void:
	if owned.get(id, false):
		reserve[id] = min(reserve[id] + amount, WEAPONS[id]["mag"] * 4)
		if current == id:
			_emit_ammo()

func _physics_process(delta: float) -> void:
	if health <= 0:
		return
	crouching = Input.is_action_pressed("crouch")
	var target_h := 1.35 if crouching else 1.8
	(collider.shape as CapsuleShape3D).height = lerp((collider.shape as CapsuleShape3D).height, target_h, delta * 8.0)
	collider.position.y = (collider.shape as CapsuleShape3D).height * 0.5

	if not is_on_floor():
		velocity.y -= GRAVITY * delta
	elif Input.is_action_just_pressed("jump") and not crouching:
		velocity.y = JUMP_VELOCITY

	var input_dir := Vector2.ZERO
	if Input.is_action_pressed("move_forward"): input_dir.y -= 1
	if Input.is_action_pressed("move_back"): input_dir.y += 1
	if Input.is_action_pressed("move_left"): input_dir.x -= 1
	if Input.is_action_pressed("move_right"): input_dir.x += 1
	input_dir = input_dir.normalized()

	var speed := WALK_SPEED
	if crouching:
		speed = CROUCH_SPEED
	elif Input.is_action_pressed("sprint") and input_dir.y < 0:
		speed = SPRINT_SPEED

	var dir := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	var target_vel := dir * speed
	velocity.x = lerp(velocity.x, target_vel.x, delta * ACCEL)
	velocity.z = lerp(velocity.z, target_vel.z, delta * ACCEL)

	move_and_slide()

	var moving := Vector2(velocity.x, velocity.z).length() > 0.3 and is_on_floor()
	var t := Time.get_ticks_msec() / 1000.0
	if moving:
		gun.position.y = -0.22 + sin(t * 9.0) * 0.012
		gun.position.x = 0.22 + cos(t * 4.5) * 0.008
		footstep_t -= delta * (SPRINT_SPEED if speed == SPRINT_SPEED else 1.0)
		if footstep_t <= 0:
			footstep_t = 0.36 if speed == SPRINT_SPEED else 0.52
			_play("footstep", 0.4)
	else:
		gun.position = gun.position.lerp(Vector3(0.22, -0.22, -0.5), delta * 6.0)

	if reloading:
		reload_time -= delta
		if reload_time <= 0:
			_finish_reload()
	if not can_shoot:
		fire_cooldown -= delta
		if fire_cooldown <= 0:
			can_shoot = true
	if Input.is_action_pressed("fire") and can_shoot and not reloading:
		if mag[current] > 0:
			_shoot()
		else:
			_start_reload()

func _play(sound_name: String, vol: float = 1.0) -> void:
	var stream: AudioStream = load("res://sfx/%s.wav" % sound_name)
	if stream:
		sfx.stream = stream
		sfx.volume_db = linear_to_db(vol)
		sfx.play()

func _shoot() -> void:
	var w = WEAPONS[current]
	can_shoot = false
	fire_cooldown = w["rate"]
	mag[current] -= 1
	_emit_ammo()
	_play(w["sfx"], 1.0)
	var space_state := get_world_3d().direct_space_state
	for i in range(w["pellets"]):
		var from := camera.global_position
		var spread: Vector3 = Vector3(randf_range(-1, 1), randf_range(-1, 1), 0) * w["spread"]
		var fwd := -camera.global_transform.basis.z
		var dir := (fwd + camera.global_transform.basis.x * spread.x + camera.global_transform.basis.y * spread.y).normalized()
		var to := from + dir * 60.0
		var query := PhysicsRayQueryParameters3D.create(from, to)
		query.exclude = [self]
		var result := space_state.intersect_ray(query)
		var end_point := to
		if result:
			end_point = result.position
			var hit: Object = result.collider
			if hit and hit.is_in_group("enemies") and hit.has_method("take_damage"):
				var headshot: bool = result.position.y - hit.global_position.y > 1.5
				hit.take_damage(w["dmg"] * (1.8 if headshot else 1.0), result.position, headshot)
		_spawn_tracer(muzzle.global_position, end_point)
	_muzzle_flash()

func _start_reload() -> void:
	if reloading or reserve[current] <= 0 or mag[current] >= WEAPONS[current]["mag"]:
		return
	reloading = true
	reload_time = 1.3
	_play("reload", 0.5)

func _finish_reload() -> void:
	reloading = false
	var w = WEAPONS[current]
	var need: int = w["mag"] - mag[current]
	var take: int = min(need, reserve[current])
	mag[current] += take
	reserve[current] -= take
	_emit_ammo()

func _spawn_tracer(from_pos: Vector3, to_pos: Vector3) -> void:
	var line := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	var dist := from_pos.distance_to(to_pos)
	if dist < 0.05:
		return
	cyl.top_radius = 0.012; cyl.bottom_radius = 0.012; cyl.height = dist
	line.mesh = cyl
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(1.0, 0.85, 0.4)
	mat.emission_enabled = true
	mat.emission = Color(1.0, 0.7, 0.3)
	mat.emission_energy_multiplier = 4.0
	line.material_override = mat
	get_tree().current_scene.add_child(line)
	line.global_position = from_pos.lerp(to_pos, 0.5)
	line.look_at(to_pos, Vector3.UP)
	line.rotate_object_local(Vector3.RIGHT, PI / 2.0)
	var tw := create_tween()
	tw.tween_property(line, "scale", Vector3(0.2, 1.0, 0.2), 0.06)
	tw.tween_callback(line.queue_free)

func _muzzle_flash() -> void:
	var light := OmniLight3D.new()
	light.light_color = Color(1.0, 0.8, 0.5)
	light.light_energy = 4.0
	light.omni_range = 3.0
	muzzle.add_child(light)
	var tw := create_tween()
	tw.tween_property(light, "light_energy", 0.0, 0.06)
	tw.tween_callback(light.queue_free)

func take_damage(amount: float) -> void:
	health = max(0.0, health - amount)
	health_changed.emit(health, max_health)
	if health <= 0:
		died.emit()
