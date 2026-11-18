/**
 * AETHERIA - World, Archipelago, Beacons, Moving Platforms, Collectibles & Particle FX
 */
class World {
    constructor(scene) {
        this.scene = scene;

        // Collision Platforms list { min: Vector3, max: Vector3, mesh: Mesh, deltaPos: Vector3 }
        this.platforms = [];
        this.movingPlatforms = [];

        // Interactive Objects
        this.orbs = [];
        this.jumpPads = [];
        this.speedRings = [];
        this.beacons = [
            { id: 'solar', name: 'Far Solar', pos: new THREE.Vector3(75, 22, -10), activated: false, color: 0xffb800 },
            { id: 'lunar', name: 'Far Lunar', pos: new THREE.Vector3(-80, 18, 40), activated: false, color: 0x9333ea },
            { id: 'astral', name: 'Far Astral', pos: new THREE.Vector3(15, 30, 95), activated: false, color: 0x00f0ff }
        ];

        // Apex Sanctuary
        this.apexPos = new THREE.Vector3(0, 52, 0);
        this.apexUnlocked = false;

        // Particle Manager
        this.particles = [];
        this.activeTransientParticles = [];

        // Environment & Lighting
        this.timeOfDay = 2; // 0: Dawn, 1: Day, 2: Sunset, 3: Night
        this.initProceduralTextures();
        this.initEnvironment();
        this.buildWorld();
        this.initAmbientParticles();
    }

    initProceduralTextures() {
        // 1. Stylized Grass Canvas
        const gCanvas = document.createElement('canvas');
        gCanvas.width = 512;
        gCanvas.height = 512;
        const gctx = gCanvas.getContext('2d');
        const gGrad = gctx.createLinearGradient(0, 0, 512, 512);
        gGrad.addColorStop(0, '#22c55e');
        gGrad.addColorStop(0.5, '#16a34a');
        gGrad.addColorStop(1, '#15803d');
        gctx.fillStyle = gGrad;
        gctx.fillRect(0, 0, 512, 512);
        // Grass flecks
        gctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let i = 0; i < 2000; i++) {
            const rx = Math.random() * 512;
            const ry = Math.random() * 512;
            gctx.fillRect(rx, ry, 2 + Math.random() * 3, 4 + Math.random() * 6);
        }
        this.grassTex = new THREE.CanvasTexture(gCanvas);
        this.grassTex.wrapS = THREE.RepeatWrapping;
        this.grassTex.wrapT = THREE.RepeatWrapping;
        this.grassTex.repeat.set(4, 4);

        // 2. Stylized Stone / Cliff Canvas
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 256;
        sCanvas.height = 256;
        const sctx = sCanvas.getContext('2d');
        sctx.fillStyle = '#334155';
        sctx.fillRect(0, 0, 256, 256);
        // Rock strata lines
        sctx.fillStyle = '#1e293b';
        for (let y = 0; y < 256; y += 18) {
            sctx.fillRect(0, y + (Math.random() - 0.5) * 6, 256, 4 + Math.random() * 5);
        }
        this.stoneTex = new THREE.CanvasTexture(sCanvas);
        this.stoneTex.wrapS = THREE.RepeatWrapping;
        this.stoneTex.wrapT = THREE.RepeatWrapping;

        // 3. Glowing Rune Canvas
        const rCanvas = document.createElement('canvas');
        rCanvas.width = 256;
        rCanvas.height = 256;
        const rctx = rCanvas.getContext('2d');
        rctx.fillStyle = '#0f172a';
        rctx.fillRect(0, 0, 256, 256);
        rctx.strokeStyle = '#00f0ff';
        rctx.lineWidth = 6;
        rctx.shadowColor = '#00f0ff';
        rctx.shadowBlur = 12;
        // Draw geometric runes
        rctx.strokeRect(40, 40, 176, 176);
        rctx.beginPath();
        rctx.arc(128, 128, 60, 0, Math.PI * 2);
        rctx.moveTo(128, 40);
        rctx.lineTo(128, 216);
        rctx.moveTo(40, 128);
        rctx.lineTo(216, 128);
        rctx.stroke();

        this.runeTex = new THREE.CanvasTexture(rCanvas);

        // Common Materials
        this.grassMat = new THREE.MeshStandardMaterial({
            map: this.grassTex,
            roughness: 0.8,
            metalness: 0.1
        });

        this.stoneMat = new THREE.MeshStandardMaterial({
            map: this.stoneTex,
            roughness: 0.7,
            metalness: 0.2
        });

        this.marbleMat = new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.3,
            metalness: 0.1
        });

        this.runeMat = new THREE.MeshStandardMaterial({
            map: this.runeTex,
            emissive: 0x00f0ff,
            emissiveMap: this.runeTex,
            emissiveIntensity: 0.8,
            roughness: 0.4
        });
    }

    initEnvironment() {
        // Sky Dome
        const skyGeo = new THREE.SphereGeometry(600, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            color: 0x1e1b4b,
            side: THREE.BackSide
        });
        this.skyDome = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skyDome);

        // Sunlight
        this.dirLight = new THREE.DirectionalLight(0xfff1e6, 1.8);
        this.dirLight.position.set(120, 200, 100);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 10;
        this.dirLight.shadow.camera.far = 450;
        this.dirLight.shadow.camera.left = -160;
        this.dirLight.shadow.camera.right = 160;
        this.dirLight.shadow.camera.top = 160;
        this.dirLight.shadow.camera.bottom = -160;
        this.dirLight.shadow.bias = -0.0005;
        this.scene.add(this.dirLight);

        // Ambient Light
        this.ambientLight = new THREE.AmbientLight(0x7dd3fc, 0.7);
        this.scene.add(this.ambientLight);

        // Fog
        this.scene.fog = new THREE.FogExp2(0x312e81, 0.0035);

        this.applyTimeOfDay(this.timeOfDay);
    }

    applyTimeOfDay(idx) {
        this.timeOfDay = idx % 4;
        const presets = [
            // 0: Dawn
            { sky: 0xf472b6, light: 0xffedd5, amb: 0xfbcfe8, fog: 0xf472b6, lightInt: 1.4, ambInt: 0.6 },
            // 1: Day
            { sky: 0x38bdf8, light: 0xffffff, amb: 0xbae6fd, fog: 0x7dd3fc, lightInt: 2.0, ambInt: 0.8 },
            // 2: Sunset
            { sky: 0x431407, light: 0xf97316, amb: 0xa855f7, fog: 0x311028, lightInt: 1.6, ambInt: 0.6 },
            // 3: Cyber Night
            { sky: 0x050814, light: 0x00f0ff, amb: 0x1e1b4b, fog: 0x070b19, lightInt: 0.9, ambInt: 0.5 }
        ];

        const p = presets[this.timeOfDay];
        this.skyDome.material.color.setHex(p.sky);
        this.dirLight.color.setHex(p.light);
        this.dirLight.intensity = p.lightInt;
        this.ambientLight.color.setHex(p.amb);
        this.ambientLight.intensity = p.ambInt;
        this.scene.fog.color.setHex(p.fog);
    }

    cycleTimeOfDay() {
        this.applyTimeOfDay(this.timeOfDay + 1);
        const names = ['Alba Daurada', 'Migdia Celestial', 'Capvespre Radiant', 'Nit Cyberpunk'];
        return names[this.timeOfDay];
    }

    buildWorld() {
        // 1. Central Sanctuary Island (Main Hub)
        this.createFloatingIsland(new THREE.Vector3(0, 0, 0), 45, 12, true);
        this.createTempleRuins(new THREE.Vector3(0, 0, 0));

        // 2. Solar Spires (East Island)
        this.createFloatingIsland(new THREE.Vector3(75, 14, -10), 28, 16);
        this.createCrystalSpires(new THREE.Vector3(75, 14, -10), 0xffb800);
        this.createBeacon(this.beacons[0]);

        // Stepping stone platforms connecting Hub to East Island
        this.createPlatform(new THREE.Vector3(32, 4, -4), new THREE.Vector3(7, 2, 7));
        this.createPlatform(new THREE.Vector3(48, 8, -6), new THREE.Vector3(8, 2, 8));

        // 3. Lunar Ruins (West Island)
        this.createFloatingIsland(new THREE.Vector3(-80, 10, 40), 32, 14);
        this.createBeacon(this.beacons[1]);

        // Moving platforms connecting Hub to West Island!
        this.createMovingPlatform(
            new THREE.Vector3(-35, 4, 18),
            new THREE.Vector3(-55, 7, 28),
            new THREE.Vector3(8, 2, 8),
            0.5
        );

        // 4. Astral Forge (North Island)
        this.createFloatingIsland(new THREE.Vector3(15, 20, 95), 34, 18);
        this.createBeacon(this.beacons[2]);

        // Moving vertical elevator platform
        this.createMovingPlatform(
            new THREE.Vector3(8, 6, 45),
            new THREE.Vector3(12, 16, 68),
            new THREE.Vector3(9, 2, 9),
            0.4
        );

        // 5. Apex Sanctuary (High Center)
        this.createApexSanctuary();

        // 6. Interactive Mechanics
        this.createJumpPads();
        this.createSpeedRings();
        this.createCollectibles();
        this.createFloatingClouds();
    }

    createFloatingIsland(pos, radius, height, isMain = false) {
        const islandGroup = new THREE.Group();
        islandGroup.position.copy(pos);

        // Grassy top cylinder
        const topGeo = new THREE.CylinderGeometry(radius, radius * 0.9, 3, 16);
        const topMesh = new THREE.Mesh(topGeo, this.grassMat);
        topMesh.position.y = 0;
        topMesh.receiveShadow = true;
        topMesh.castShadow = true;
        islandGroup.add(topMesh);

        // Register top as collision platform
        this.registerPlatform(
            new THREE.Vector3(pos.x - radius, pos.y - 1.5, pos.z - radius),
            new THREE.Vector3(pos.x + radius, pos.y + 1.5, pos.z + radius),
            topMesh
        );

        // Inverted Cone / Rocky underside
        const underGeo = new THREE.ConeGeometry(radius * 0.9, height, 16);
        underGeo.rotateX(Math.PI);
        const underMesh = new THREE.Mesh(underGeo, this.stoneMat);
        underMesh.position.y = -height / 2 - 1.5;
        underMesh.castShadow = true;
        underMesh.receiveShadow = true;
        islandGroup.add(underMesh);

        // Floating perimeter crystal shards
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + 0.3;
            const dist = radius + 6 + Math.random() * 4;
            const shardGeo = new THREE.OctahedronGeometry(2 + Math.random() * 2, 0);
            const shardMat = new THREE.MeshStandardMaterial({
                color: isMain ? 0x00f0ff : 0xa855f7,
                emissive: isMain ? 0x00f0ff : 0xa855f7,
                emissiveIntensity: 0.4,
                roughness: 0.3
            });
            const shard = new THREE.Mesh(shardGeo, shardMat);
            shard.position.set(Math.cos(angle) * dist, -3 - Math.random() * 6, Math.sin(angle) * dist);
            islandGroup.add(shard);
        }

        this.scene.add(islandGroup);
    }

    createTempleRuins(centerPos) {
        // Ancient Columns & Stone Arches on main island
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const colGeo = new THREE.CylinderGeometry(1.2, 1.4, 10, 12);
            const col = new THREE.Mesh(colGeo, this.marbleMat);
            const x = centerPos.x + Math.cos(angle) * 22;
            const z = centerPos.z + Math.sin(angle) * 22;
            col.position.set(x, centerPos.y + 6.5, z);
            col.castShadow = true;
            col.receiveShadow = true;
            this.scene.add(col);

            // Capital block on top
            const capGeo = new THREE.BoxGeometry(3.2, 1.0, 3.2);
            const cap = new THREE.Mesh(capGeo, this.marbleMat);
            cap.position.set(x, centerPos.y + 11.5, z);
            cap.castShadow = true;
            this.scene.add(cap);

            // Register platform on top of columns for secret parkour!
            this.registerPlatform(
                new THREE.Vector3(x - 1.6, centerPos.y + 10.8, z - 1.6),
                new THREE.Vector3(x + 1.6, centerPos.y + 12.0, z + 1.6),
                cap
            );
        }

        // Central Stone Archway
        const archGeo = new THREE.TorusGeometry(8, 1.2, 12, 24, Math.PI);
        const arch = new THREE.Mesh(archGeo, this.marbleMat);
        arch.position.set(centerPos.x, centerPos.y + 1.5, centerPos.z - 12);
        arch.castShadow = true;
        this.scene.add(arch);
    }

    createCrystalSpires(pos, colorHex) {
        for (let i = 0; i < 5; i++) {
            const h = 12 + Math.random() * 14;
            const geo = new THREE.ConeGeometry(2.0, h, 6);
            const mat = new THREE.MeshStandardMaterial({
                color: colorHex,
                emissive: colorHex,
                emissiveIntensity: 0.6,
                roughness: 0.2
            });
            const spire = new THREE.Mesh(geo, mat);
            const angle = Math.random() * Math.PI * 2;
            const r = 8 + Math.random() * 12;
            spire.position.set(pos.x + Math.cos(angle) * r, pos.y + h / 2 + 1.5, pos.z + Math.sin(angle) * r);
            spire.castShadow = true;
            this.scene.add(spire);
        }
    }

    createBeacon(beaconData) {
        const group = new THREE.Group();
        group.position.copy(beaconData.pos);

        // Stone Base Plinth
        const baseGeo = new THREE.CylinderGeometry(5.0, 5.8, 1.5, 12);
        const base = new THREE.Mesh(baseGeo, this.marbleMat);
        base.position.y = 0.75;
        base.receiveShadow = true;
        group.add(base);

        // Rune Pad on top
        const padGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.4, 16);
        const pad = new THREE.Mesh(padGeo, this.runeMat);
        pad.position.y = 1.6;
        pad.receiveShadow = true;
        group.add(pad);

        // Floating Core Crystal
        const crystalGeo = new THREE.OctahedronGeometry(2.2, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
            color: beaconData.color,
            emissive: beaconData.color,
            emissiveIntensity: 0.7,
            roughness: 0.1
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = 5.5;
        group.add(crystal);
        beaconData.crystalMesh = crystal;

        // Rotating Energy Ring around crystal
        const ringGeo = new THREE.TorusGeometry(3.6, 0.2, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: beaconData.color, wireframe: true });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.y = 5.5;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
        beaconData.ringMesh = ring;

        // Massive Sky Beam (initially hidden/faint)
        const beamGeo = new THREE.CylinderGeometry(1.2, 1.8, 300, 16, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: beaconData.color,
            transparent: true,
            opacity: 0.0,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 150;
        group.add(beam);
        beaconData.beamMesh = beam;

        // Register platform for player to step on
        this.registerPlatform(
            new THREE.Vector3(beaconData.pos.x - 4, beaconData.pos.y, beaconData.pos.z - 4),
            new THREE.Vector3(beaconData.pos.x + 4, beaconData.pos.y + 1.8, beaconData.pos.z + 4),
            base
        );

        this.scene.add(group);
    }

    createApexSanctuary() {
        this.apexGroup = new THREE.Group();
        this.apexGroup.position.copy(this.apexPos);

        // Floating Golden Temple Platform
        const platGeo = new THREE.CylinderGeometry(20, 16, 3, 16);
        const platMesh = new THREE.Mesh(platGeo, this.marbleMat);
        this.apexGroup.add(platMesh);

        // Apex Stone Underside
        const underGeo = new THREE.ConeGeometry(16, 18, 16);
        underGeo.rotateX(Math.PI);
        const underMesh = new THREE.Mesh(underGeo, this.stoneMat);
        underMesh.position.y = -10.5;
        this.apexGroup.add(underMesh);

        // Celestial Core Sphere
        const coreGeo = new THREE.IcosahedronGeometry(4.5, 2);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.5,
            roughness: 0.1
        });
        this.apexCore = new THREE.Mesh(coreGeo, coreMat);
        this.apexCore.position.y = 7;
        this.apexGroup.add(this.apexCore);

        // Forcefield Dome (Visible while locked, dissolves when unlocked!)
        const domeGeo = new THREE.SphereGeometry(22, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
        this.forcefieldMat = new THREE.MeshBasicMaterial({
            color: 0xff007b,
            wireframe: true,
            transparent: true,
            opacity: 0.6
        });
        this.forcefield = new THREE.Mesh(domeGeo, this.forcefieldMat);
        this.forcefield.position.y = 0;
        this.apexGroup.add(this.forcefield);

        // Register platform
        this.registerPlatform(
            new THREE.Vector3(this.apexPos.x - 18, this.apexPos.y - 1.5, this.apexPos.z - 18),
            new THREE.Vector3(this.apexPos.x + 18, this.apexPos.y + 1.5, this.apexPos.z + 18),
            platMesh
        );

        this.scene.add(this.apexGroup);
    }

    unlockApex() {
        this.apexUnlocked = true;
        // Fade out forcefield dome
        this.forcefield.visible = false;

        // Create Super Light Elevator / Launch Vortex on Main Hub to reach Apex directly!
        this.createSuperJumpVortex(new THREE.Vector3(0, 1.5, 0));
    }

    createSuperJumpVortex(pos) {
        const padGeo = new THREE.CylinderGeometry(5.0, 5.0, 0.4, 24);
        const padMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 2.0
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.copy(pos);
        this.scene.add(pad);

        // Register super jump pad
        this.jumpPads.push({
            pos: pos,
            radius: 4.5,
            power: 45, // Shoots player straight to Apex Sanctuary!
            mesh: pad
        });
    }

    createJumpPads() {
        // High-velocity launch pads positioned strategically
        const padLocations = [
            new THREE.Vector3(18, 1.5, -16),  // Hub -> Launch toward East Solar
            new THREE.Vector3(-18, 1.5, -16), // Hub -> Launch toward West Lunar
            new THREE.Vector3(0, 1.5, 24),    // Hub -> Launch toward North Astral
            new THREE.Vector3(58, 15.5, -8),  // Solar lower -> Solar peak
            new THREE.Vector3(-60, 11.5, 30), // Lunar approach pad
            new THREE.Vector3(12, 21.5, 75)   // Astral approach pad
        ];

        padLocations.forEach(pos => {
            const padGroup = new THREE.Group();
            padGroup.position.copy(pos);

            const baseGeo = new THREE.CylinderGeometry(2.0, 2.4, 0.5, 16);
            const baseMesh = new THREE.Mesh(baseGeo, this.marbleMat);
            padGroup.add(baseMesh);

            const plateGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.3, 16);
            const plateMat = new THREE.MeshStandardMaterial({
                color: 0x00f0ff,
                emissive: 0x00f0ff,
                emissiveIntensity: 1.2
            });
            const plateMesh = new THREE.Mesh(plateGeo, plateMat);
            plateMesh.position.y = 0.35;
            padGroup.add(plateMesh);

            this.scene.add(padGroup);

            this.jumpPads.push({
                pos: pos,
                radius: 2.2,
                power: 32, // standard high launch
                mesh: plateMesh
            });
        });
    }

    createSpeedRings() {
        // Speed boost accelerator rings suspended in air
        const ringConfigs = [
            { pos: new THREE.Vector3(45, 18, -8), rotY: Math.PI / 4 },
            { pos: new THREE.Vector3(-45, 16, 25), rotY: -Math.PI / 4 },
            { pos: new THREE.Vector3(10, 24, 55), rotY: 0 },
            { pos: new THREE.Vector3(0, 36, 0), rotY: 0 } // high altitude glide ring
        ];

        ringConfigs.forEach(cfg => {
            const geo = new THREE.TorusGeometry(3.5, 0.4, 12, 32);
            const mat = new THREE.MeshStandardMaterial({
                color: 0x00f0ff,
                emissive: 0x00f0ff,
                emissiveIntensity: 1.6,
                roughness: 0.1
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.position.copy(cfg.pos);
            ring.rotation.y = cfg.rotY;
            this.scene.add(ring);

            this.speedRings.push({
                pos: cfg.pos,
                radius: 3.5,
                mesh: ring,
                cooldown: 0
            });
        });
    }

    createCollectibles() {
        // 30 Light Orbs distributed across islands and in gliding flight paths!
        const orbPoints = [
            // Sanctuary Hub ground & arches
            new THREE.Vector3(0, 3.5, -6),
            new THREE.Vector3(10, 3.5, 10),
            new THREE.Vector3(-10, 3.5, 10),
            new THREE.Vector3(0, 13.5, 22),
            new THREE.Vector3(18, 13.5, 10),
            new THREE.Vector3(-18, 13.5, 10),
            // Aerial flight paths between islands (glide rewards!)
            new THREE.Vector3(30, 16, -6),
            new THREE.Vector3(42, 19, -8),
            new THREE.Vector3(56, 21, -9),
            new THREE.Vector3(-30, 14, 20),
            new THREE.Vector3(-45, 17, 26),
            new THREE.Vector3(-60, 18, 32),
            new THREE.Vector3(6, 22, 40),
            new THREE.Vector3(10, 26, 60),
            new THREE.Vector3(14, 30, 80),
            // East Solar Island
            new THREE.Vector3(70, 17, -15),
            new THREE.Vector3(82, 17, -5),
            new THREE.Vector3(75, 27, -10),
            // West Lunar Island
            new THREE.Vector3(-75, 13, 35),
            new THREE.Vector3(-85, 13, 45),
            new THREE.Vector3(-80, 23, 40),
            // North Astral Island
            new THREE.Vector3(10, 23, 90),
            new THREE.Vector3(20, 23, 100),
            new THREE.Vector3(15, 34, 95),
            // High Sky Glider Orbit
            new THREE.Vector3(0, 38, -30),
            new THREE.Vector3(30, 42, 0),
            new THREE.Vector3(0, 44, 30),
            new THREE.Vector3(-30, 42, 0),
            // Apex Rewards
            new THREE.Vector3(8, 54, 8),
            new THREE.Vector3(-8, 54, -8)
        ];

        const orbGeo = new THREE.OctahedronGeometry(0.7, 0);
        const orbMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.8,
            roughness: 0.1
        });

        orbPoints.forEach((pt, idx) => {
            const mesh = new THREE.Mesh(orbGeo, orbMat);
            mesh.position.copy(pt);
            this.scene.add(mesh);

            this.orbs.push({
                id: idx,
                originalPos: pt.clone(),
                pos: pt.clone(),
                mesh: mesh,
                collected: false
            });
        });
    }

    createFloatingClouds() {
        // Volumetric low-poly cloud clusters on the horizon
        for (let i = 0; i < 20; i++) {
            const cloud = new THREE.Group();
            const angle = (i / 20) * Math.PI * 2;
            const dist = 220 + Math.random() * 80;
            const y = 30 + (Math.random() - 0.5) * 50;

            cloud.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);

            const puffs = 4 + Math.floor(Math.random() * 4);
            const cloudMat = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.9,
                transparent: true,
                opacity: 0.85
            });

            for (let j = 0; j < puffs; j++) {
                const puffGeo = new THREE.DodecahedronGeometry(8 + Math.random() * 10, 1);
                const puff = new THREE.Mesh(puffGeo, cloudMat);
                puff.position.set((j - puffs / 2) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8);
                cloud.add(puff);
            }

            this.scene.add(cloud);
        }
    }

    createPlatform(pos, size) {
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mesh = new THREE.Mesh(geo, this.marbleMat);
        mesh.position.copy(pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        this.registerPlatform(
            new THREE.Vector3(pos.x - size.x / 2, pos.y - size.y / 2, pos.z - size.z / 2),
            new THREE.Vector3(pos.x + size.x / 2, pos.y + size.y / 2, pos.z + size.z / 2),
            mesh
        );
    }

    createMovingPlatform(startPos, endPos, size, speed = 0.5) {
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mesh = new THREE.Mesh(geo, this.marbleMat);
        mesh.position.copy(startPos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const platObj = {
            mesh: mesh,
            startPos: startPos.clone(),
            endPos: endPos.clone(),
            size: size.clone(),
            speed: speed,
            progress: 0,
            direction: 1,
            deltaPos: new THREE.Vector3(0, 0, 0),
            min: new THREE.Vector3(),
            max: new THREE.Vector3()
        };

        this.updatePlatformBounds(platObj);
        this.platforms.push(platObj);
        this.movingPlatforms.push(platObj);
    }

    registerPlatform(min, max, mesh) {
        this.platforms.push({
            min: min.clone(),
            max: max.clone(),
            mesh: mesh,
            deltaPos: null
        });
    }

    updatePlatformBounds(plat) {
        const pos = plat.mesh.position;
        const halfX = plat.size.x / 2;
        const halfY = plat.size.y / 2;
        const halfZ = plat.size.z / 2;

        plat.min.set(pos.x - halfX, pos.y - halfY, pos.z - halfZ);
        plat.max.set(pos.x + halfX, pos.y + halfY, pos.z + halfZ);
    }

    initAmbientParticles() {
        // Celestial glowing motes floating gently
        const count = 350;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 350;
            positions[i * 3 + 1] = 5 + Math.random() * 80;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 350;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0x00f0ff,
            size: 1.4,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });

        this.ambientParticles = new THREE.Points(geo, mat);
        this.scene.add(this.ambientParticles);
    }

    // Transient Particle Effects
    spawnJumpRing(pos) {
        this.spawnExpandingRing(pos, 0x00f0ff, 0.8, 4.0);
    }

    spawnDoubleJumpBurst(pos) {
        this.spawnExpandingRing(pos, 0xff007b, 1.2, 5.5);
    }

    spawnGroundPoundShockwave(pos) {
        this.spawnExpandingRing(pos, 0xffffff, 2.0, 12.0);
    }

    spawnExpandingRing(pos, color, startRadius, maxRadius) {
        const geo = new THREE.RingGeometry(startRadius, startRadius + 0.3, 32);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.set(pos.x, pos.y + 0.1, pos.z);
        this.scene.add(ring);

        this.activeTransientParticles.push({
            mesh: ring,
            life: 0.35,
            maxLife: 0.35,
            update: (dt, p) => {
                const t = 1 - (p.life / p.maxLife);
                const scale = 1 + t * (maxRadius / startRadius);
                p.mesh.scale.set(scale, 1, scale);
                p.mesh.material.opacity = (1 - t) * 0.9;
            }
        });
    }

    spawnOrbCollectBurst(pos) {
        const count = 16;
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.15, 6, 6);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending
            });
            const p = new THREE.Mesh(geo, mat);
            p.position.copy(pos);
            this.scene.add(p);

            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                Math.random() * 10 + 2,
                (Math.random() - 0.5) * 12
            );

            this.activeTransientParticles.push({
                mesh: p,
                vel: vel,
                life: 0.6,
                maxLife: 0.6,
                update: (dt, item) => {
                    item.mesh.position.addScaledVector(item.vel, dt);
                    item.vel.y -= 15 * dt;
                    const t = item.life / item.maxLife;
                    item.mesh.material.opacity = t;
                }
            });
        }
    }

    update(dt, player, onOrbCollected, onBeaconActivated) {
        const time = performance.now() * 0.001;

        // 1. Update Moving Platforms
        for (let i = 0; i < this.movingPlatforms.length; i++) {
            const p = this.movingPlatforms[i];
            const oldPos = p.mesh.position.clone();

            p.progress += dt * p.speed * p.direction;
            if (p.progress >= 1.0) {
                p.progress = 1.0;
                p.direction = -1;
            } else if (p.progress <= 0) {
                p.progress = 0;
                p.direction = 1;
            }

            // Smooth ease in/out
            const smoothT = 0.5 - 0.5 * Math.cos(p.progress * Math.PI);
            p.mesh.position.lerpVectors(p.startPos, p.endPos, smoothT);

            p.deltaPos.subVectors(p.mesh.position, oldPos);
            this.updatePlatformBounds(p);
        }

        // 2. Update Beacons & check player interaction
        for (let i = 0; i < this.beacons.length; i++) {
            const b = this.beacons[i];
            if (b.crystalMesh) {
                b.crystalMesh.rotation.y += dt * (b.activated ? 2.5 : 0.8);
                b.crystalMesh.position.y = 5.5 + Math.sin(time * 2 + i) * 0.35;
            }
            if (b.ringMesh) {
                b.ringMesh.rotation.z += dt * (b.activated ? 3.0 : 1.0);
            }

            // Beacon activation check: player stands on beacon pad
            if (!b.activated) {
                const distToPad = player.position.distanceTo(b.pos);
                if (distToPad < 4.0 && player.isGrounded) {
                    b.activated = true;
                    b.beamMesh.material.opacity = 0.75;
                    b.crystalMesh.material.emissiveIntensity = 2.5;
                    window.audioManager.playBeaconActivate();
                    this.spawnExpandingRing(b.pos, b.color, 2.0, 16.0);
                    if (onBeaconActivated) onBeaconActivated(b);

                    // Check if all 3 beacons activated!
                    if (this.beacons.every(beacon => beacon.activated)) {
                        this.unlockApex();
                    }
                }
            }
        }

        // 3. Update Apex Core
        if (this.apexCore) {
            this.apexCore.rotation.x += dt * 0.4;
            this.apexCore.rotation.y += dt * 0.6;
        }

        // 4. Update Jump Pads
        for (let i = 0; i < this.jumpPads.length; i++) {
            const pad = this.jumpPads[i];
            const dist = player.position.distanceTo(pad.pos);
            if (dist < pad.radius && player.position.y >= pad.pos.y - 0.2 && player.position.y <= pad.pos.y + 1.2) {
                player.velocity.y = pad.power;
                player.isGrounded = false;
                window.audioManager.playBouncePad();
                this.spawnJumpRing(pad.pos);
            }
        }

        // 5. Update Speed Boost Rings
        for (let i = 0; i < this.speedRings.length; i++) {
            const ring = this.speedRings[i];
            if (ring.cooldown > 0) ring.cooldown -= dt;
            const dist = player.position.distanceTo(ring.pos);
            if (dist < ring.radius && ring.cooldown <= 0) {
                ring.cooldown = 2.0;
                // Boost forward in character's rotation direction
                const forward = new THREE.Vector3(Math.sin(player.targetRotation), 0.2, Math.cos(player.targetRotation)).normalize();
                player.velocity.x = forward.x * 35;
                player.velocity.z = forward.z * 35;
                player.velocity.y = 14;
                window.audioManager.playSpeedRing();
                this.spawnExpandingRing(ring.pos, 0x00f0ff, 1.5, 8.0);
            }
        }

        // 6. Update Light Orbs (Floating, Magnetic Pull & Collection)
        for (let i = 0; i < this.orbs.length; i++) {
            const orb = this.orbs[i];
            if (orb.collected) continue;

            // Idle floating bob
            orb.mesh.rotation.y += dt * 2.0;
            orb.pos.y = orb.originalPos.y + Math.sin(time * 3 + orb.id) * 0.4;
            orb.mesh.position.y = orb.pos.y;

            // Distance to player
            const dist = player.position.distanceTo(orb.mesh.position);

            // Magnetic attraction within 7 units
            if (dist < 7.0) {
                const dir = new THREE.Vector3().subVectors(player.position, orb.mesh.position).normalize();
                const pullSpeed = (7.0 - dist) * 7.0;
                orb.mesh.position.addScaledVector(dir, pullSpeed * dt);
            }

            // Collection trigger within 1.4 units
            if (dist < 1.4) {
                orb.collected = true;
                orb.mesh.visible = false;
                window.audioManager.playOrbCollect();
                this.spawnOrbCollectBurst(orb.mesh.position);
                if (onOrbCollected) onOrbCollected(orb);
            }
        }

        // 7. Update Transient Particles
        for (let i = this.activeTransientParticles.length - 1; i >= 0; i--) {
            const p = this.activeTransientParticles[i];
            p.life -= dt;
            p.update(dt, p);
            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.activeTransientParticles.splice(i, 1);
            }
        }

        // 8. Gentle Ambient Dust Motation
        if (this.ambientParticles) {
            this.ambientParticles.rotation.y += dt * 0.02;
        }
    }
}

window.World = World;
