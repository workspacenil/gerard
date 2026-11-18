/**
 * AETHERIA - Main Game Engine, Third-Person Camera, Input & HUD Orchestrator
 */
class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.radarCanvas = document.getElementById('radar-canvas');
        this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

        // Clock & Timers
        this.clock = new THREE.Clock();
        this.gameStartTime = Date.now();
        this.isGameOver = false;
        this.gameStarted = false;

        // Score & Progress
        this.orbsCollected = 0;
        this.totalOrbs = 30;
        this.beaconsCount = 0;
        this.totalBeacons = 3;

        // Camera Orbit Angles & Zoom
        this.cameraDistance = 8.5;
        this.cameraYaw = 0;     // horizontal angle
        this.cameraPitch = 0.36; // vertical angle (pitch up/down)
        this.cameraTarget = new THREE.Vector3();
        this.cameraFovTarget = 68;
        this.screenShake = 0;

        // Mouse & Pointer Lock State
        this.isPointerLocked = false;
        this.isMouseDown = false;
        this.mouseSensitivity = 0.0022;

        // Input State
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            jumpJustPressed: false,
            sprint: false,
            dashJustPressed: false,
            groundPoundJustPressed: false
        };

        this.initThree();
        this.initEntities();
        this.initInput();
        this.initUI();

        // Start render loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initThree() {
        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            68,
            window.innerWidth / window.innerHeight,
            0.1,
            1200
        );

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.container.appendChild(this.renderer.domElement);

        // Window resize event
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initEntities() {
        this.world = new World(this.scene);
        this.player = new Player(this.scene);
        this.totalOrbs = this.world.orbs.length;
    }

    initInput() {
        // Keyboard Down
        window.addEventListener('keydown', (e) => {
            if (!this.gameStarted) return;

            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.input.forward = true;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.input.backward = true;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.input.left = true;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.input.right = true;
                    break;
                case 'Space':
                    if (!this.input.jump) {
                        this.input.jumpJustPressed = true;
                    }
                    this.input.jump = true;
                    e.preventDefault();
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.input.sprint = true;
                    break;
                case 'KeyE':
                    this.input.dashJustPressed = true;
                    break;
                case 'KeyC':
                case 'ControlLeft':
                    this.input.groundPoundJustPressed = true;
                    break;
                case 'KeyR':
                    this.player.respawn();
                    this.showToast('↺ Respawn al punt de control');
                    break;
                case 'KeyT':
                    const timeName = this.world.cycleTimeOfDay();
                    this.showToast('☀ Ambient: ' + timeName);
                    break;
                case 'KeyH':
                    this.toggleHelpModal();
                    break;
                case 'KeyM':
                    const muted = window.audioManager.toggleMute();
                    this.showToast(muted ? '🔇 Àudio Silenciat' : '🔊 Àudio Activat');
                    break;
            }
        });

        // Keyboard Up
        window.addEventListener('keyup', (e) => {
            switch (e.code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.input.forward = false;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.input.backward = false;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.input.left = false;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.input.right = false;
                    break;
                case 'Space':
                    this.input.jump = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.input.sprint = false;
                    break;
            }
        });

        // Mouse Down
        window.addEventListener('mousedown', (e) => {
            if (!this.gameStarted) return;
            this.isMouseDown = true;

            // Right click triggers Dash
            if (e.button === 2) {
                this.input.dashJustPressed = true;
                e.preventDefault();
            }

            // Click canvas to request Pointer Lock
            if (e.target === this.renderer.domElement && !this.isPointerLocked) {
                this.renderer.domElement.requestPointerLock();
            }
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });

        // Pointer Lock State Changes
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        });

        // Mouse Move for Camera
        window.addEventListener('mousemove', (e) => {
            if (!this.gameStarted) return;

            if (this.isPointerLocked || this.isMouseDown) {
                const dx = e.movementX || 0;
                const dy = e.movementY || 0;

                this.cameraYaw -= dx * this.mouseSensitivity;
                this.cameraPitch += dy * this.mouseSensitivity;

                // Pitch limits: prevent flipping upside down
                this.cameraPitch = Math.max(-0.4, Math.min(1.3, this.cameraPitch));
            }
        });

        // Mouse Wheel for Camera Zoom
        window.addEventListener('wheel', (e) => {
            if (!this.gameStarted) return;
            this.cameraDistance += e.deltaY * 0.005;
            this.cameraDistance = Math.max(3.5, Math.min(18.0, this.cameraDistance));
        });

        // Touch & Mobile Controls
        this.initTouchControls();
    }

    initTouchControls() {
        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouchDevice) {
            document.body.classList.add('touch-enabled');
        }

        const joystickBase = document.getElementById('joystick-base');
        const joystickKnob = document.getElementById('joystick-knob');
        let joystickTouchId = null;
        let joyStartX = 0;
        let joyStartY = 0;

        let lookTouchId = null;
        let lastLookX = 0;
        let lastLookY = 0;

        // Window Touchstart
        window.addEventListener('touchstart', (e) => {
            document.body.classList.add('touch-enabled');
            if (!this.gameStarted) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const isLeftHalf = touch.clientX < window.innerWidth * 0.52;

                // Left side: Joystick
                if (isLeftHalf && joystickTouchId === null) {
                    joystickTouchId = touch.identifier;
                    joyStartX = touch.clientX;
                    joyStartY = touch.clientY;
                    if (joystickBase) {
                        joystickBase.style.left = `${joyStartX}px`;
                        joystickBase.style.top = `${joyStartY}px`;
                        joystickBase.style.display = 'block';
                    }
                    if (joystickKnob) {
                        joystickKnob.style.transform = 'translate(-50%, -50%)';
                    }
                } 
                // Right side: Camera swipe (ignore if touching action buttons)
                else if (!isLeftHalf && lookTouchId === null) {
                    const target = touch.target;
                    if (!target.closest('.touch-btn') && !target.closest('.action-btn')) {
                        lookTouchId = touch.identifier;
                        lastLookX = touch.clientX;
                        lastLookY = touch.clientY;
                    }
                }
            }
        }, { passive: false });

        // Window Touchmove
        window.addEventListener('touchmove', (e) => {
            if (!this.gameStarted) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];

                // Handle Joystick Move
                if (touch.identifier === joystickTouchId) {
                    const dx = touch.clientX - joyStartX;
                    const dy = touch.clientY - joyStartY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 48;
                    const clampedDist = Math.min(dist, maxDist);
                    const angle = Math.atan2(dy, dx);

                    const knobX = Math.cos(angle) * clampedDist;
                    const knobY = Math.sin(angle) * clampedDist;

                    if (joystickKnob) {
                        joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
                    }

                    const normX = knobX / maxDist;
                    const normY = knobY / maxDist;

                    this.input.forward = normY < -0.22;
                    this.input.backward = normY > 0.22;
                    this.input.left = normX < -0.22;
                    this.input.right = normX > 0.22;
                    this.input.sprint = dist > maxDist * 0.85; // Sprint on full extension!
                }

                // Handle Camera Swipe
                if (touch.identifier === lookTouchId) {
                    const deltaX = touch.clientX - lastLookX;
                    const deltaY = touch.clientY - lastLookY;

                    this.cameraYaw -= deltaX * 0.005;
                    this.cameraPitch += deltaY * 0.005;
                    this.cameraPitch = Math.max(-0.4, Math.min(1.3, this.cameraPitch));

                    lastLookX = touch.clientX;
                    lastLookY = touch.clientY;
                }
            }
        }, { passive: false });

        // Window Touchend / Touchcancel
        const handleTouchEnd = (e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];

                if (touch.identifier === joystickTouchId) {
                    joystickTouchId = null;
                    if (joystickBase) joystickBase.style.display = 'none';
                    if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
                    this.input.forward = false;
                    this.input.backward = false;
                    this.input.left = false;
                    this.input.right = false;
                    this.input.sprint = false;
                }

                if (touch.identifier === lookTouchId) {
                    lookTouchId = null;
                }
            }
        };

        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);

        // Touch Action Buttons
        const jumpBtn = document.getElementById('btn-touch-jump');
        if (jumpBtn) {
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!this.input.jump) {
                    this.input.jumpJustPressed = true;
                }
                this.input.jump = true;
            }, { passive: false });

            jumpBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.input.jump = false;
            }, { passive: false });
        }

        const dashBtn = document.getElementById('btn-touch-dash');
        if (dashBtn) {
            dashBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.input.dashJustPressed = true;
            }, { passive: false });
        }

        const poundBtn = document.getElementById('btn-touch-pound');
        if (poundBtn) {
            poundBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.input.groundPoundJustPressed = true;
            }, { passive: false });
        }
    }

    initUI() {
        // Start Screen Button
        const startBtn = document.getElementById('start-btn');
        const startOverlay = document.getElementById('start-screen');
        if (startBtn && startOverlay) {
            startBtn.addEventListener('click', () => {
                window.audioManager.init();
                startOverlay.classList.add('hidden');
                this.gameStarted = true;
                this.renderer.domElement.requestPointerLock();
                this.showToast('✨ Benvingut a Aetèria! Explora i activa els fars.');
            });
        }

        // Action Buttons in HUD
        const timeBtn = document.getElementById('btn-time');
        if (timeBtn) {
            timeBtn.addEventListener('click', () => {
                const name = this.world.cycleTimeOfDay();
                this.showToast('☀ Ambient: ' + name);
            });
        }

        const audioBtn = document.getElementById('btn-audio');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const muted = window.audioManager.toggleMute();
                audioBtn.innerHTML = muted ? '🔇 Silenci' : '🔊 So';
                this.showToast(muted ? '🔇 Àudio Silenciat' : '🔊 Àudio Activat');
            });
        }

        const helpBtn = document.getElementById('btn-help');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => this.toggleHelpModal());
        }

        const closeHelpBtn = document.getElementById('close-help-btn');
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => this.toggleHelpModal());
        }

        // Mobile QR Modal Handlers
        const mobileModal = document.getElementById('mobile-modal');
        const openMobileModal = () => {
            if (mobileModal) {
                mobileModal.classList.remove('hidden');
                if (this.isPointerLocked) document.exitPointerLock();
            }
        };

        const btnMobile = document.getElementById('btn-mobile');
        if (btnMobile) btnMobile.addEventListener('click', openMobileModal);

        const startMobileBtn = document.getElementById('start-mobile-btn');
        if (startMobileBtn) startMobileBtn.addEventListener('click', openMobileModal);

        const closeMobileBtn = document.getElementById('close-mobile-btn');
        if (closeMobileBtn) {
            closeMobileBtn.addEventListener('click', () => {
                if (mobileModal) mobileModal.classList.add('hidden');
            });
        }

        const victoryRestartBtn = document.getElementById('victory-restart-btn');
        if (victoryRestartBtn) {
            victoryRestartBtn.addEventListener('click', () => {
                location.reload();
            });
        }

        const victoryContinueBtn = document.getElementById('victory-continue-btn');
        if (victoryContinueBtn) {
            victoryContinueBtn.addEventListener('click', () => {
                document.getElementById('victory-screen').classList.add('hidden');
            });
        }
    }

    toggleHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) {
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden') && this.isPointerLocked) {
                document.exitPointerLock();
            }
        }
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2700);
    }

    triggerScreenShake(intensity = 0.5) {
        this.screenShake = intensity;
    }

    updateCamera(dt) {
        // Target is player's center-of-mass
        const targetPos = this.player.position.clone();
        targetPos.y += 1.4;

        // Smooth camera follow target
        this.cameraTarget.lerp(targetPos, Math.min(14 * dt, 1.0));

        // Spherical offset from yaw and pitch
        const cx = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
        const cy = Math.sin(this.cameraPitch) * this.cameraDistance;
        const cz = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

        const desiredCamPos = this.cameraTarget.clone().add(new THREE.Vector3(cx, cy, cz));

        // Prevent camera from penetrating ground below target
        if (desiredCamPos.y < targetPos.y - 0.5) {
            desiredCamPos.y = targetPos.y - 0.5;
        }

        // Apply screen shake
        if (this.screenShake > 0.01) {
            desiredCamPos.x += (Math.random() - 0.5) * this.screenShake;
            desiredCamPos.y += (Math.random() - 0.5) * this.screenShake;
            desiredCamPos.z += (Math.random() - 0.5) * this.screenShake;
            this.screenShake = THREE.MathUtils.lerp(this.screenShake, 0, 10 * dt);
        }

        this.camera.position.lerp(desiredCamPos, Math.min(18 * dt, 1.0));
        this.camera.lookAt(this.cameraTarget);

        // Dynamic FOV based on speed and gliding
        const currentSpeed = Math.sqrt(this.player.velocity.x * this.player.velocity.x + this.player.velocity.z * this.player.velocity.z);
        if (this.player.isDashing) {
            this.cameraFovTarget = 86;
        } else if (this.player.isGliding) {
            this.cameraFovTarget = 78;
        } else if (this.player.isSprinting) {
            this.cameraFovTarget = 74;
        } else {
            this.cameraFovTarget = 68;
        }

        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.cameraFovTarget, 6 * dt);
        this.camera.updateProjectionMatrix();
    }

    updateUI() {
        // 1. Orbs Counter
        const orbValue = document.getElementById('stat-orbs');
        if (orbValue) {
            orbValue.textContent = `${this.orbsCollected} / ${this.totalOrbs}`;
        }

        // 2. Beacons Counter
        const beaconValue = document.getElementById('stat-beacons');
        if (beaconValue) {
            beaconValue.textContent = `${this.beaconsCount} / ${this.totalBeacons}`;
        }

        // 3. Dash Cooldown Bar
        const dashBar = document.getElementById('dash-bar');
        if (dashBar) {
            const pct = Math.max(0, 1 - (this.player.dashCooldown / this.player.dashMaxCooldown)) * 100;
            dashBar.style.width = `${pct}%`;
        }

        // 4. Gliding & Dashing State Pills
        const glidePill = document.getElementById('pill-gliding');
        if (glidePill) {
            if (this.player.isGliding) glidePill.classList.add('visible');
            else glidePill.classList.remove('visible');
        }

        const dashPill = document.getElementById('pill-dashing');
        if (dashPill) {
            if (this.player.isDashing) dashPill.classList.add('visible');
            else dashPill.classList.remove('visible');
        }

        // 5. Crosshair style
        const crosshair = document.getElementById('crosshair');
        if (crosshair) {
            if (this.player.isGliding) crosshair.classList.add('gliding');
            else crosshair.classList.remove('gliding');
        }

        // 6. Speed Gauge
        const speedNum = document.getElementById('speed-val');
        if (speedNum) {
            const hSpeed = Math.sqrt(this.player.velocity.x * this.player.velocity.x + this.player.velocity.z * this.player.velocity.z);
            speedNum.textContent = Math.round(hSpeed * 3.6); // km/h equivalent
        }

        // 7. Radar Canvas Drawing
        this.drawRadar();
    }

    drawRadar() {
        if (!this.radarCtx) return;
        const ctx = this.radarCtx;
        const width = this.radarCanvas.width;
        const height = this.radarCanvas.height;
        const cx = width / 2;
        const cy = height / 2;
        const radius = width / 2 - 4;
        const radarRange = 120; // World units shown in radar radius

        ctx.clearRect(0, 0, width, height);

        // Center player position
        const px = this.player.position.x;
        const pz = this.player.position.z;

        // Draw radar concentric grid rings
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(cx, 4);
        ctx.lineTo(cx, height - 4);
        ctx.moveTo(4, cy);
        ctx.lineTo(width - 4, cy);
        ctx.stroke();

        // Draw Beacons on Radar
        this.world.beacons.forEach((b) => {
            const dx = b.pos.x - px;
            const dz = b.pos.z - pz;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx) - (this.cameraYaw - Math.PI / 2);

            let r = (dist / radarRange) * radius;
            r = Math.min(r, radius - 6);

            const bx = cx + Math.sin(angle) * r;
            const by = cy - Math.cos(angle) * r;

            ctx.fillStyle = b.activated ? '#00f0ff' : '#' + b.color.toString(16).padStart(6, '0');
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = b.activated ? 10 : 4;

            ctx.beginPath();
            ctx.arc(bx, by, b.activated ? 5 : 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        });

        // Draw Apex Sanctuary
        const adx = this.world.apexPos.x - px;
        const adz = this.world.apexPos.z - pz;
        const aDist = Math.sqrt(adx * adx + adz * adz);
        const aAngle = Math.atan2(adz, adx) - (this.cameraYaw - Math.PI / 2);
        let ar = (aDist / radarRange) * radius;
        ar = Math.min(ar, radius - 6);
        const ax = cx + Math.sin(aAngle) * ar;
        const ay = cy - Math.cos(aAngle) * ar;

        ctx.fillStyle = this.world.apexUnlocked ? '#ffffff' : '#ff007b';
        ctx.beginPath();
        ctx.arc(ax, ay, 4, 0, Math.PI * 2);
        ctx.fill();

        // Player marker at center: arrow pointing towards player facing direction
        ctx.save();
        ctx.translate(cx, cy);
        const playerRelativeAngle = this.player.rotation - (this.cameraYaw - Math.PI);
        ctx.rotate(-playerRelativeAngle);

        ctx.fillStyle = '#00f0ff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    checkVictory() {
        if (this.isGameOver) return;

        // Victory condition: All 3 beacons active AND player reached Apex Sanctuary platform
        if (this.beaconsCount >= 3) {
            const distToApex = this.player.position.distanceTo(this.world.apexPos);
            if (distToApex < 18.0 && this.player.position.y >= this.world.apexPos.y - 1.0) {
                this.isGameOver = true;
                window.audioManager.playBeaconActivate();

                const timeElapsedSec = Math.floor((Date.now() - this.gameStartTime) / 1000);
                const minutes = Math.floor(timeElapsedSec / 60);
                const seconds = timeElapsedSec % 60;
                const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

                document.getElementById('victory-time').textContent = formattedTime;
                document.getElementById('victory-orbs').textContent = `${this.orbsCollected} / ${this.totalOrbs}`;

                const ratingEl = document.getElementById('victory-rating');
                if (this.orbsCollected >= 25) {
                    ratingEl.textContent = '⭐⭐⭐ Mestre Celestial S+';
                } else if (this.orbsCollected >= 15) {
                    ratingEl.textContent = '⭐⭐ Guardià de l\'Àpex A';
                } else {
                    ratingEl.textContent = '⭐ Explorador Aliat B';
                }

                document.getElementById('victory-screen').classList.remove('hidden');
                if (this.isPointerLocked) {
                    document.exitPointerLock();
                }
            }
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        const rawDt = this.clock.getDelta();
        const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling

        if (this.gameStarted) {
            // Update Player
            this.player.update(dt, this.input, this.cameraYaw, this.world);

            // Update World
            this.world.update(
                dt,
                this.player,
                (orb) => {
                    this.orbsCollected++;
                    this.showToast(`+1 Orbe de Llum! (${this.orbsCollected}/${this.totalOrbs})`);
                },
                (beacon) => {
                    this.beaconsCount++;
                    this.triggerScreenShake(0.65);
                    const dot = document.getElementById(`beacon-dot-${beacon.id}`);
                    if (dot) dot.classList.add('active');

                    if (this.beaconsCount < 3) {
                        this.showToast(`🌟 ${beacon.name} Activat! [${this.beaconsCount}/3]`);
                    } else {
                        this.showToast(`⚡ TOTS ELS FARS ACTIVATS! Santuari de l'Àpex desbloquejat!`);
                    }
                }
            );

            // Camera follow
            this.updateCamera(dt);

            // UI & Radar
            this.updateUI();

            // Check Victory
            this.checkVictory();

            // Reset one-frame input triggers
            this.input.jumpJustPressed = false;
            this.input.dashJustPressed = false;
            this.input.groundPoundJustPressed = false;
        }

        // Render Scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
