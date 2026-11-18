/**
 * AETHERIA - 3D Player Character, Rigging, Procedural Animations & Physics Controller
 */
class Player {
    constructor(scene) {
        this.scene = scene;

        // Position & Kinematics
        this.position = new THREE.Vector3(0, 8, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y-rotation angle
        this.targetRotation = 0;
        this.bankAngle = 0; // Roll angle when turning/gliding

        // State Machine
        this.isGrounded = false;
        this.isGliding = false;
        this.isDashing = false;
        this.isGroundPounding = false;
        this.isSprinting = false;
        this.canDoubleJump = false;

        // Timers & Cooldowns
        this.dashCooldown = 0;
        this.dashMaxCooldown = 1.3;
        this.dashTimer = 0;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;

        // Constants & Tuning
        this.walkSpeed = 13;
        this.sprintSpeed = 22;
        this.glideSpeed = 16;
        this.dashSpeed = 42;
        this.jumpForce = 17;
        this.doubleJumpForce = 15;
        this.gravity = 36;
        this.glideGravity = 5.5; // low fall speed when gliding
        this.terminalVelocity = 48;
        this.maxGlideFallSpeed = 4.2;

        // Procedural Animation Clock
        this.animTime = 0;
        this.footstepPhase = 0;

        // Spawn & Respawn Checkpoint
        this.checkpoint = new THREE.Vector3(0, 8, 0);

        // Build 3D Articulated Model
        this.createModel();
    }

    createModel() {
        this.root = new THREE.Group();
        this.meshContainer = new THREE.Group();
        this.root.add(this.meshContainer);

        // Materials
        const armorMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            metalness: 0.8,
            roughness: 0.25
        });

        const whiteMat = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            metalness: 0.4,
            roughness: 0.3
        });

        const neonCyanMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.4,
            roughness: 0.2
        });

        const neonPinkMat = new THREE.MeshStandardMaterial({
            color: 0xff007b,
            emissive: 0xff007b,
            emissiveIntensity: 1.2,
            roughness: 0.2
        });

        // 1. Torso
        this.torsoGroup = new THREE.Group();
        this.torsoGroup.position.y = 1.1;

        // Main Chest
        const chestGeo = new THREE.CylinderGeometry(0.35, 0.25, 0.7, 8);
        const chest = new THREE.Mesh(chestGeo, whiteMat);
        chest.castShadow = true;
        this.torsoGroup.add(chest);

        // Armor Plate
        const plateGeo = new THREE.BoxGeometry(0.5, 0.45, 0.35);
        const plate = new THREE.Mesh(plateGeo, armorMat);
        plate.position.set(0, 0.05, 0.1);
        plate.castShadow = true;
        this.torsoGroup.add(plate);

        // Core Reactor (Glowing heart)
        const coreGeo = new THREE.SphereGeometry(0.12, 16, 16);
        this.reactorCore = new THREE.Mesh(coreGeo, neonCyanMat);
        this.reactorCore.position.set(0, 0.08, 0.26);
        this.torsoGroup.add(this.reactorCore);

        // 2. Head & Visor
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 0.55, 0);

        const headGeo = new THREE.BoxGeometry(0.4, 0.38, 0.42);
        const head = new THREE.Mesh(headGeo, whiteMat);
        head.castShadow = true;
        this.headGroup.add(head);

        // Visor Strip
        const visorGeo = new THREE.BoxGeometry(0.36, 0.14, 0.1);
        const visor = new THREE.Mesh(visorGeo, neonCyanMat);
        visor.position.set(0, 0.02, 0.22);
        this.headGroup.add(visor);

        // Head Antenna
        const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25);
        const ant = new THREE.Mesh(antGeo, armorMat);
        ant.position.set(0.14, 0.25, -0.05);
        ant.rotation.z = -0.2;
        this.headGroup.add(ant);

        const antTipGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const antTip = new THREE.Mesh(antTipGeo, neonPinkMat);
        antTip.position.set(0.18, 0.38, -0.05);
        this.headGroup.add(antTip);

        this.torsoGroup.add(this.headGroup);

        // 3. Back Thruster / Wingpack
        this.wingpack = new THREE.Group();
        this.wingpack.position.set(0, 0.1, -0.25);

        const packGeo = new THREE.BoxGeometry(0.4, 0.5, 0.18);
        const pack = new THREE.Mesh(packGeo, armorMat);
        pack.castShadow = true;
        this.wingpack.add(pack);

        // Thruster Nozzles
        const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.2, 12);
        const leftNozzle = new THREE.Mesh(nozzleGeo, armorMat);
        leftNozzle.position.set(-0.14, -0.25, 0);
        const rightNozzle = leftNozzle.clone();
        rightNozzle.position.x = 0.14;
        this.wingpack.add(leftNozzle);
        this.wingpack.add(rightNozzle);

        // Thruster glow emitters
        const glowGeo = new THREE.SphereGeometry(0.07, 12, 12);
        this.leftThrusterGlow = new THREE.Mesh(glowGeo, neonCyanMat);
        this.leftThrusterGlow.position.set(-0.14, -0.32, 0);
        this.rightThrusterGlow = this.leftThrusterGlow.clone();
        this.rightThrusterGlow.position.x = 0.14;
        this.wingpack.add(this.leftThrusterGlow);
        this.wingpack.add(this.rightThrusterGlow);

        // 4. Glider Wings (Holographic energy blades)
        const wingCanvas = document.createElement('canvas');
        wingCanvas.width = 128;
        wingCanvas.height = 256;
        const wctx = wingCanvas.getContext('2d');
        const grad = wctx.createLinearGradient(0, 0, 128, 256);
        grad.addColorStop(0, '#00f0ff');
        grad.addColorStop(0.5, '#7000ff');
        grad.addColorStop(1, 'rgba(0, 240, 255, 0)');
        wctx.fillStyle = grad;
        wctx.fillRect(0, 0, 128, 256);
        // Grid pattern
        wctx.strokeStyle = '#ffffff';
        wctx.lineWidth = 2;
        for (let i = 0; i < 256; i += 24) {
            wctx.beginPath();
            wctx.moveTo(0, i);
            wctx.lineTo(128, i + 30);
            wctx.stroke();
        }

        const wingTexture = new THREE.CanvasTexture(wingCanvas);
        const wingMat = new THREE.MeshBasicMaterial({
            map: wingTexture,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });

        // Wing Geometry (Swept wing shape)
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0);
        wingShape.lineTo(1.8, -0.4);
        wingShape.lineTo(1.5, -0.9);
        wingShape.lineTo(0, -0.3);
        wingShape.closePath();

        const wingGeo = new THREE.ShapeGeometry(wingShape);

        this.leftWing = new THREE.Mesh(wingGeo, wingMat);
        this.leftWing.position.set(-0.2, 0.1, 0);
        this.leftWing.scale.set(-1, 1, 1); // Flip for left
        this.leftWing.visible = false;
        this.wingpack.add(this.leftWing);

        this.rightWing = new THREE.Mesh(wingGeo, wingMat);
        this.rightWing.position.set(0.2, 0.1, 0);
        this.rightWing.visible = false;
        this.wingpack.add(this.rightWing);

        this.torsoGroup.add(this.wingpack);

        // 5. Arms
        const armGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.5, 8);
        armGeo.translate(0, -0.25, 0);

        this.leftArmGroup = new THREE.Group();
        this.leftArmGroup.position.set(-0.4, 0.25, 0);
        const leftArm = new THREE.Mesh(armGeo, armorMat);
        leftArm.castShadow = true;
        this.leftArmGroup.add(leftArm);
        this.torsoGroup.add(this.leftArmGroup);

        this.rightArmGroup = new THREE.Group();
        this.rightArmGroup.position.set(0.4, 0.25, 0);
        const rightArm = new THREE.Mesh(armGeo, armorMat);
        rightArm.castShadow = true;
        this.rightArmGroup.add(rightArm);
        this.torsoGroup.add(this.rightArmGroup);

        this.meshContainer.add(this.torsoGroup);

        // 6. Legs
        const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.55, 8);
        legGeo.translate(0, -0.27, 0);

        const bootGeo = new THREE.BoxGeometry(0.18, 0.2, 0.32);
        bootGeo.translate(0, -0.55, 0.06);

        this.leftLegGroup = new THREE.Group();
        this.leftLegGroup.position.set(-0.2, 0.75, 0);
        const leftLeg = new THREE.Mesh(legGeo, armorMat);
        leftLeg.castShadow = true;
        const leftBoot = new THREE.Mesh(bootGeo, whiteMat);
        leftBoot.castShadow = true;
        this.leftLegGroup.add(leftLeg);
        this.leftLegGroup.add(leftBoot);
        this.meshContainer.add(this.leftLegGroup);

        this.rightLegGroup = new THREE.Group();
        this.rightLegGroup.position.set(0.2, 0.75, 0);
        const rightLeg = new THREE.Mesh(legGeo, armorMat);
        rightLeg.castShadow = true;
        const rightBoot = new THREE.Mesh(bootGeo, whiteMat);
        rightBoot.castShadow = true;
        this.rightLegGroup.add(rightLeg);
        this.rightLegGroup.add(rightBoot);
        this.meshContainer.add(this.rightLegGroup);

        // Add to scene
        this.root.position.copy(this.position);
        this.scene.add(this.root);
    }

    update(dt, input, cameraAngle, world) {
        // Cooldowns
        if (this.dashCooldown > 0) {
            this.dashCooldown -= dt;
        }

        // Coyote Time & Jump Buffer
        if (this.isGrounded) {
            this.coyoteTimer = 0.15;
            this.canDoubleJump = true;
        } else {
            this.coyoteTimer -= dt;
        }

        if (input.jumpJustPressed) {
            this.jumpBufferTimer = 0.15;
        } else {
            this.jumpBufferTimer -= dt;
        }

        // Process Dash Input
        if (input.dashJustPressed && this.dashCooldown <= 0 && !this.isDashing) {
            this.startDash();
        }

        // Dash State
        if (this.isDashing) {
            this.dashTimer -= dt;
            if (this.dashTimer <= 0) {
                this.isDashing = false;
            }
        }

        // Ground Pound Input
        if (input.groundPoundJustPressed && !this.isGrounded && !this.isGroundPounding) {
            this.isGroundPounding = true;
            this.velocity.x = 0;
            this.velocity.z = 0;
            this.velocity.y = -35;
            window.audioManager.playDash();
        }

        // Movement Direction vector in world space
        const moveDir = new THREE.Vector3(0, 0, 0);
        if (input.forward) moveDir.z -= 1;
        if (input.backward) moveDir.z += 1;
        if (input.left) moveDir.x -= 1;
        if (input.right) moveDir.x += 1;

        const isMoving = moveDir.lengthSq() > 0.001;
        if (isMoving) {
            moveDir.normalize();
            // Transform input relative to camera horizontal orientation
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
        }

        // Check Gliding
        if (input.jump && !this.isGrounded && this.velocity.y < 1.0 && !this.isGroundPounding) {
            if (!this.isGliding) {
                this.isGliding = true;
                window.audioManager.playGliderDeploy();
            }
        } else {
            this.isGliding = false;
        }

        this.leftWing.visible = this.isGliding;
        this.rightWing.visible = this.isGliding;

        // Determine current target ground speed
        let maxSpeed = this.walkSpeed;
        this.isSprinting = input.sprint && this.isGrounded && isMoving;
        if (this.isSprinting) maxSpeed = this.sprintSpeed;
        if (this.isGliding) maxSpeed = this.glideSpeed;

        // Apply Horizontal Acceleration
        if (!this.isDashing && !this.isGroundPounding) {
            const accel = this.isGrounded ? 45 : 18;
            if (isMoving) {
                this.velocity.x += (moveDir.x * maxSpeed - this.velocity.x) * Math.min(accel * dt, 1.0);
                this.velocity.z += (moveDir.z * maxSpeed - this.velocity.z) * Math.min(accel * dt, 1.0);
                this.targetRotation = Math.atan2(moveDir.x, moveDir.z);
            } else {
                const friction = this.isGrounded ? 18 : 3.5;
                this.velocity.x *= Math.max(0, 1 - friction * dt);
                this.velocity.z *= Math.max(0, 1 - friction * dt);
            }
        }

        // Jumps
        if (this.jumpBufferTimer > 0) {
            if (this.coyoteTimer > 0) {
                // Ground Jump
                this.velocity.y = this.jumpForce;
                this.jumpBufferTimer = 0;
                this.coyoteTimer = 0;
                this.isGrounded = false;
                window.audioManager.playJump();
                if (world) world.spawnJumpRing(this.position);
            } else if (this.canDoubleJump && !this.isGroundPounding) {
                // Double Jump
                this.velocity.y = this.doubleJumpForce;
                this.jumpBufferTimer = 0;
                this.canDoubleJump = false;
                this.isGliding = false;
                window.audioManager.playDoubleJump();
                if (world) world.spawnDoubleJumpBurst(this.position);
            }
        }

        // Vertical Gravity & Gliding Physics
        if (!this.isGrounded) {
            let currentGravity = this.gravity;
            if (this.isGliding) {
                currentGravity = this.glideGravity;
                if (this.velocity.y < -this.maxGlideFallSpeed) {
                    this.velocity.y += ( -this.maxGlideFallSpeed - this.velocity.y ) * Math.min(8 * dt, 1.0);
                } else {
                    this.velocity.y -= currentGravity * dt;
                }
            } else if (!this.isGroundPounding) {
                this.velocity.y -= currentGravity * dt;
                if (this.velocity.y < -this.terminalVelocity) {
                    this.velocity.y = -this.terminalVelocity;
                }
            }
        }

        // Integrate Position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // Collision detection with world platforms
        this.handleCollisions(world, dt);

        // Fall into the void check & respawn
        if (this.position.y < -35) {
            this.respawn();
        }

        // Update mesh position and smooth rotation
        this.root.position.copy(this.position);

        // Smooth rotation towards travel direction
        let diff = this.targetRotation - this.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotation += diff * Math.min(14 * dt, 1.0);
        this.meshContainer.rotation.y = this.rotation;

        // Procedural Animation Updating
        this.animate(dt, isMoving);

        // Sound modulation
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        window.audioManager.updateWind(currentSpeed, this.isGliding);
    }

    startDash() {
        this.isDashing = true;
        this.dashTimer = 0.28;
        this.dashCooldown = this.dashMaxCooldown;
        this.isGliding = false;

        const forward = new THREE.Vector3(Math.sin(this.targetRotation), 0, Math.cos(this.targetRotation)).normalize();
        this.velocity.x = forward.x * this.dashSpeed;
        this.velocity.z = forward.z * this.dashSpeed;
        this.velocity.y = Math.max(this.velocity.y, 4.0);

        window.audioManager.playDash();
    }

    handleCollisions(world, dt) {
        if (!world) return;

        const playerRadius = 0.45;
        const playerHeight = 1.8;
        let onGround = false;

        // Check platforms
        const platforms = world.platforms;
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            const min = plat.min;
            const max = plat.max;

            // Check AABB overlap with sphere/cylinder
            if (
                this.position.x + playerRadius > min.x &&
                this.position.x - playerRadius < max.x &&
                this.position.z + playerRadius > min.z &&
                this.position.z - playerRadius < max.z
            ) {
                // Check if standing on top of platform
                const topY = max.y;
                if (this.position.y >= topY - 0.4 && this.position.y <= topY + 0.6 && this.velocity.y <= 0) {
                    this.position.y = topY;
                    this.velocity.y = 0;
                    onGround = true;
                    this.checkpoint.set(this.position.x, topY + 0.1, this.position.z);

                    // Ground pound landing shockwave
                    if (this.isGroundPounding) {
                        this.isGroundPounding = false;
                        window.audioManager.playGroundPound();
                        world.spawnGroundPoundShockwave(this.position);
                    }

                    // Moving platform carry
                    if (plat.deltaPos) {
                        this.position.add(plat.deltaPos);
                    }
                }
            }
        }

        this.isGrounded = onGround;
    }

    animate(dt, isMoving) {
        this.animTime += dt;
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);

        // Pulsing core light
        const pulse = 1.0 + Math.sin(this.animTime * 4.0) * 0.3;
        this.reactorCore.material.emissiveIntensity = pulse * 1.5;

        // GLIDING POSE
        if (this.isGliding) {
            // Horizontal streamlined lean
            this.meshContainer.rotation.x = THREE.MathUtils.lerp(this.meshContainer.rotation.x, 0.55, 10 * dt);
            this.meshContainer.rotation.z = THREE.MathUtils.lerp(this.meshContainer.rotation.z, -this.velocity.x * 0.02, 8 * dt);

            this.leftArmGroup.rotation.x = -1.2;
            this.rightArmGroup.rotation.x = -1.2;
            this.leftArmGroup.rotation.z = -0.7;
            this.rightArmGroup.rotation.z = 0.7;

            this.leftLegGroup.rotation.x = 0.6;
            this.rightLegGroup.rotation.x = 0.6;
            return;
        }

        // RESET X/Z TILT WHEN NOT GLIDING
        this.meshContainer.rotation.x = THREE.MathUtils.lerp(this.meshContainer.rotation.x, 0, 10 * dt);
        this.meshContainer.rotation.z = THREE.MathUtils.lerp(this.meshContainer.rotation.z, 0, 10 * dt);

        // DASH POSE
        if (this.isDashing) {
            this.meshContainer.rotation.x = 0.9;
            this.leftArmGroup.rotation.x = 1.4;
            this.rightArmGroup.rotation.x = 1.4;
            this.leftLegGroup.rotation.x = 0.8;
            this.rightLegGroup.rotation.x = 0.8;
            return;
        }

        // IN AIR POSE
        if (!this.isGrounded) {
            if (this.isGroundPounding) {
                this.meshContainer.rotation.x = 1.57; // vertical dive
                this.leftArmGroup.rotation.x = 0;
                this.rightArmGroup.rotation.x = 0;
            } else {
                // Rising or Falling
                const tuck = this.velocity.y > 0 ? -0.4 : 0.3;
                this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, tuck, 12 * dt);
                this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, tuck + 0.2, 12 * dt);
                this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, -1.0, 12 * dt);
                this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, -1.0, 12 * dt);
            }
            return;
        }

        // RUNNING / SPRINTING
        if (isMoving && speed > 0.5) {
            const gaitSpeed = this.isSprinting ? 18 : 12;
            const legAngle = Math.sin(this.animTime * gaitSpeed) * (this.isSprinting ? 0.95 : 0.65);
            const armAngle = -legAngle * 0.9;

            this.leftLegGroup.rotation.x = legAngle;
            this.rightLegGroup.rotation.x = -legAngle;

            this.leftArmGroup.rotation.x = armAngle;
            this.rightArmGroup.rotation.x = -armAngle;
            this.leftArmGroup.rotation.z = 0.15;
            this.rightArmGroup.rotation.z = -0.15;

            // Torso forward lean into sprint
            this.torsoGroup.rotation.x = this.isSprinting ? 0.3 : 0.15;
            this.torsoGroup.position.y = 1.1 + Math.abs(Math.sin(this.animTime * gaitSpeed)) * 0.08;

            // Footstep sounds
            this.footstepPhase += dt * gaitSpeed;
            if (this.footstepPhase > Math.PI) {
                this.footstepPhase = 0;
                window.audioManager.playFootstep();
            }
        } else {
            // IDLE BREATHING
            const breathe = Math.sin(this.animTime * 2.2) * 0.04;
            this.torsoGroup.position.y = 1.1 + breathe;
            this.torsoGroup.rotation.x = 0;

            this.leftLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLegGroup.rotation.x, 0, 10 * dt);
            this.rightLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLegGroup.rotation.x, 0, 10 * dt);

            this.leftArmGroup.rotation.x = THREE.MathUtils.lerp(this.leftArmGroup.rotation.x, 0, 10 * dt);
            this.rightArmGroup.rotation.x = THREE.MathUtils.lerp(this.rightArmGroup.rotation.x, 0, 10 * dt);
            this.leftArmGroup.rotation.z = 0.1 + breathe * 0.5;
            this.rightArmGroup.rotation.z = -0.1 - breathe * 0.5;
        }
    }

    respawn() {
        this.position.copy(this.checkpoint);
        this.position.y += 2.0;
        this.velocity.set(0, 0, 0);
        this.isGliding = false;
        this.isGroundPounding = false;
        this.isDashing = false;
        window.audioManager.playJump();
    }
}

window.Player = Player;
