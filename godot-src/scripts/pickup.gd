extends Area3D
class_name Pickup

enum Kind { WEAPON, AMMO, HEALTH }

@export var kind: Kind = Kind.AMMO
@export var weapon_id := "rifle"
@export var ammo_amount := 20
@export var heal_amount := 30.0

func _ready() -> void:
	collision_layer = 0
	collision_mask = 1  # default physics layer (player and enemies both use it; we filter by group below)
	body_entered.connect(_on_body_entered)
	var mesh := MeshInstance3D.new()
	var mat := StandardMaterial3D.new()
	mat.emission_enabled = true
	match kind:
		Kind.WEAPON:
			var box := BoxMesh.new(); box.size = Vector3(0.35, 0.15, 0.7); mesh.mesh = box
			mat.albedo_color = Color(0.85, 0.7, 0.2); mat.emission = Color(0.9, 0.75, 0.2); mat.emission_energy_multiplier = 1.2
		Kind.AMMO:
			var box2 := BoxMesh.new(); box2.size = Vector3(0.3, 0.25, 0.3); mesh.mesh = box2
			mat.albedo_color = Color(0.3, 0.65, 0.35); mat.emission = Color(0.3, 0.8, 0.4); mat.emission_energy_multiplier = 1.0
		Kind.HEALTH:
			var box3 := BoxMesh.new(); box3.size = Vector3(0.3, 0.3, 0.3); mesh.mesh = box3
			mat.albedo_color = Color(0.8, 0.25, 0.3); mat.emission = Color(0.9, 0.2, 0.25); mat.emission_energy_multiplier = 1.0
	mesh.material_override = mat
	mesh.position.y = 0.5
	add_child(mesh)
	var col := CollisionShape3D.new()
	var shape := SphereShape3D.new(); shape.radius = 0.7
	col.shape = shape
	col.position.y = 0.5
	add_child(col)
	var tw := create_tween().set_loops()
	tw.tween_property(mesh, "rotation:y", TAU, 2.2)

func _on_body_entered(body: Node3D) -> void:
	if not body.is_in_group("player") or not body.has_method("grant_weapon"):
		return
	match kind:
		Kind.WEAPON:
			body.grant_weapon(weapon_id)
		Kind.AMMO:
			body.grant_ammo(weapon_id, ammo_amount)
		Kind.HEALTH:
			body.health = min(body.max_health, body.health + heal_amount)
			body.health_changed.emit(body.health, body.max_health)
	queue_free()
