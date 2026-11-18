/**
 * AETHERIA - Progressive Multi-Level World with Gated Puzzles & Non-Intersecting Platforms
 */
class World {
    constructor(scene) {
        this.scene = scene;

        // Collision & Physics
        this.platforms = [];
        this.movingPlatforms = [];

        // Progressive Levels State
        this.currentLevel = 1;
        this.maxLevel = 4;

        // Level 1: Relic Keys & Altar
        this.relicKeys = [];
        this.relicsCollected = 0;
        this.altarPad = null;
        this.gate1 = null;

        // Level 2: Sequence Puzzle
        this.sequencePillars = [];
        this.sequenceTarget = [0, 1, 2]; // Cyan, Purple, Gold
        this.sequenceCurrentStep = 0;
        this.gate2 = null;
        this.monolithDisplay = null;

        // Level 3: Timed Pressure Plates
        this.timedPlates = [];
        this.timerActive = false;
        this.timerSeconds = 35;
        this.timerRemaining = 35;
        this.gate3 = null;
        this.apexVortex = null;

        // Level 4: Apex Core
        this.apexPos = new THREE.Vector3(400, 115, 0);
        this.apexCore = null;
        this.apexReached = false;

        // Collectibles & Props
        this.orbs = [];
        this.jumpPads = [];
        this.speedRings = [];
        this.activeTransientParticles = [];

        // Environment
        this.timeOfDay = 2; // Sunset
        this.initProceduralTextures();
        this.initEnvironment();
        this.buildProgressiveWorld();
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
        gctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let i = 0; i < 2000; i++) {
            gctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 4 + Math.random() * 6);
        }
        this.grassTex = new THREE.CanvasTexture(gCanvas);
        this.grassTex.wrapS = THREE.RepeatWrapping;
        this.grassTex.wrapT = THREE.RepeatWrapping;
        this.grassTex.repeat.set(4, 4);

        // 2. Stone Canvas
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 256;
        sCanvas.height = 256;
        const sctx = sCanvas.getContext('2d');
        sctx.fillStyle = '#334155';
        sctx.fillRect(0, 0, 256, 256);
        sctx.fillStyle = '#1e293b';
        for (let y = 0; y < 256; y += 18) {
            sctx.fillRect(0, y + (Math.random() - 0.5) * 6, 256, 4 + Math.random() * 5);
        }
        this.stoneTex = new THREE.CanvasTexture(sCanvas);
        this.stoneTex.wrapS = THREE.RepeatWrapping;
        this.stoneTex.wrapT = THREE.RepeatWrapping;

        // Materials
        this.grassMat = new THREE.MeshStandardMaterial({ map: this.grassTex, roughness: 0.8, metalness: 0.1 });
        this.stoneMat = new THREE.MeshStandardMaterial({ map: this.stoneTex, roughness: 0.7, metalness: 0.2 });
        this.marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
        this.altarMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x00f0ff, emissiveIntensity: 0.5 });
    }

    initEnvironment() {
        const skyGeo = new THREE.SphereGeometry(750, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b, side: THREE.BackSide });
        this.skyDome = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skyDome);

        this.dirLight = new THREE.DirectionalLight(0xffedd5, 1.8);
        this.dirLight.position.set(160, 220, 100);
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.near = 10;
        this.dirLight.shadow.camera.far = 600;
        this.dirLight.shadow.camera.left = -220;
        this.dirLight.shadow.camera.right = 220;
        this.dirLight.shadow.camera.top = 220;
        this.dirLight.shadow.camera.bottom = -220;
        this.dirLight.shadow.bias = -0.0005;
        this.scene.add(this.dirLight);

        this.ambientLight = new THREE.AmbientLight(0x7dd3fc, 0.7);
        this.scene.add(this.ambientLight);

        this.scene.fog = new THREE.FogExp2(0x311028, 0.003);
        this.applyTimeOfDay(this.timeOfDay);
    }

    applyTimeOfDay(idx) {
        this.timeOfDay = idx % 4;
        const presets = [
            { sky: 0xf472b6, light: 0xffedd5, amb: 0xfbcfe8, fog: 0xf472b6, lightInt: 1.4, ambInt: 0.6 },
            { sky: 0x38bdf8, light: 0xffffff, amb: 0xbae6fd, fog: 0x7dd3fc, lightInt: 2.0, ambInt: 0.8 },
            { sky: 0x431407, light: 0xf97316, amb: 0xa855f7, fog: 0x311028, lightInt: 1.6, ambInt: 0.6 },
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

    buildProgressiveWorld() {
        // ==========================================
        // NIVELL 1: EL DESPERTAR RÚNIC (Pos: 0, 0, 0)
        // Gran Illa Majestuosa: Radi 48, Alçada 18 (com al primer joc!)
        // ==========================================
        this.createFloatingIsland(new THREE.Vector3(0, 0, 0), 48, 18);
        this.createTempleRuins(new THREE.Vector3(0, 0, 0));

        // Bouncy Temple Jump Pad (launches player straight up to grab Key 0 on colonnade!)
        this.templeJumpPad = this.createJumpPad(new THREE.Vector3(0, 1.5, -4), 25);

        // Gate 1 (Forcefield Barrier blocking exit to Level 2)
        this.gate1 = this.createEnergyGate(
            new THREE.Vector3(42, 4, 0),
            new THREE.Vector3(2, 7.5, 12),
            0xff007b,
            "Barrera Rúnica 1"
        );

        // Altar Pad on Island 1 (Discharges 3 Relic Keys)
        this.altarPad = this.createAltarPad(new THREE.Vector3(25, 1.5, 0));

        // 3 Relic Keys with beacons
        this.createRelicKey(0, new THREE.Vector3(0, 13.5, 0));       // On top of central temple colonnade (accessible via templeJumpPad!)
        this.createRelicKey(1, new THREE.Vector3(-22, 3.5, 22));     // Eastern ancient ruins
        this.createRelicKey(2, new THREE.Vector3(-26, 3.5, -24));    // Western clifftop overlook

        // Jump Pad 1 (behind Gate 1, launches to Stepping Platforms)
        this.jumpPad1 = this.createJumpPad(new THREE.Vector3(46, 1.5, 0), 34);

        // Stepping Stone Islands between Level 1 and Level 2 (Large, non-intersecting 16x16 platforms)
        this.createPlatform(new THREE.Vector3(76, 8, -6), new THREE.Vector3(16, 3, 16));
        this.createPlatform(new THREE.Vector3(112, 14, 6), new THREE.Vector3(16, 3, 16));
        this.createSpeedRing(new THREE.Vector3(94, 11, 0), 0);

        // ==========================================
        // NIVELL 2: LES AGULLES DE CRISTALL (Pos: 185, 20, 0)
        // Gran Illa: Radi 44, Alçada 20
        // ==========================================
        this.createFloatingIsland(new THREE.Vector3(185, 20, 0), 44, 20);

        // Gate 2 (Blocking exit to Moving Platforms)
        this.gate2 = this.createEnergyGate(
            new THREE.Vector3(224, 24, 0),
            new THREE.Vector3(2, 7.5, 12),
            0xa855f7,
            "Barrera Rúnica 2"
        );

        // Monolith Guide (Shows the Sequence Order)
        this.createSequenceGuide(new THREE.Vector3(185, 21.5, 0));

        // 3 Sequence Pillars (Cyan, Purple, Gold)
        this.createSequencePillar(0, new THREE.Vector3(155, 21.5, -22), 0x00f0ff, "1: Ciano");
        this.createSequencePillar(1, new THREE.Vector3(185, 21.5, 26), 0xa855f7, "2: Astral");
        this.createSequencePillar(2, new THREE.Vector3(215, 21.5, -18), 0xffb800, "3: Solar");

        // 2 Non-Intersecting Moving Platforms between Level 2 and Level 3 (Large 16x16 hover-barges, smooth easy speed)
        this.platM1 = this.createMovingPlatform(
            new THREE.Vector3(265, 28, -14),
            new THREE.Vector3(265, 28, 14),
            new THREE.Vector3(16, 3, 16),
            0.32
        );

        this.platM2 = this.createMovingPlatform(
            new THREE.Vector3(315, 34, 14),
            new THREE.Vector3(315, 34, -14),
            new THREE.Vector3(16, 3, 16),
            0.30
        );

        // Speed Ring to assist glide between M1 and M2
        this.createSpeedRing(new THREE.Vector3(290, 32, 0), 0);

        // ==========================================
        // NIVELL 3: LA FARGA TEMPORAL (Pos: 400, 40, 0)
        // Gran Illa: Radi 48, Alçada 22
        // ==========================================
        this.createFloatingIsland(new THREE.Vector3(400, 40, 0), 48, 22);

        // Gate 3 (Encircles the Central Apex Vortex)
        this.gate3 = this.createEnergyGate(
            new THREE.Vector3(400, 44, 0),
            new THREE.Vector3(12, 7.5, 2),
            0x00f0ff,
            "Barrera de l'Àpex"
        );

        // 3 Timed Pressure Plates situated around Island 3
        this.createTimedPlate(0, new THREE.Vector3(365, 41.5, -26));
        this.createTimedPlate(1, new THREE.Vector3(435, 41.5, -26));
        this.createTimedPlate(2, new THREE.Vector3(400, 41.5, 30));

        // Central Super Vortex (Launches directly to Level 4: Apex Sanctuary)
        this.apexVortex = this.createJumpPad(new THREE.Vector3(400, 41.5, 0), 58);

        // ==========================================
        // NIVELL 4: EL SANTUARI DE L'ÀPEX (Pos: 400, 115, 0)
        // ==========================================
        this.apexPos = new THREE.Vector3(400, 115, 0);
        this.createApexSanctuary(this.apexPos);

        // Distributed Collectible Light Orbs
        this.createOrbs();
        this.createClouds();
    }

    createFloatingIsland(pos, radius, height) {
        const group = new THREE.Group();
        group.position.copy(pos);

        // Top cylinder (walking platform)
        const topGeo = new THREE.CylinderGeometry(radius, radius * 0.94, 3, 32);
        const topMesh = new THREE.Mesh(topGeo, this.grassMat);
        topMesh.receiveShadow = true;
        topMesh.castShadow = true;
        group.add(topMesh);

        // Solid platform collision registration with CYLINDER support
        this.platforms.push({
            isCylinder: true,
            pos: pos.clone(),
            radius: radius,
            min: new THREE.Vector3(pos.x - radius, pos.y - 1.5, pos.z - radius),
            max: new THREE.Vector3(pos.x + radius, pos.y + 1.5, pos.z + radius),
            mesh: topMesh,
            deltaPos: null
        });

        // Rocky bottom cone
        const underGeo = new THREE.ConeGeometry(radius * 0.94, height, 32);
        underGeo.rotateX(Math.PI);
        const underMesh = new THREE.Mesh(underGeo, this.stoneMat);
        underMesh.position.y = -height / 2 - 1.5;
        underMesh.castShadow = true;
        group.add(underMesh);

        // Ancient decorative stone rim
        const rimGeo = new THREE.TorusGeometry(radius, 0.45, 10, 36);
        rimGeo.rotateX(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, this.marbleMat);
        rim.position.y = 1.45;
        group.add(rim);

        this.scene.add(group);
    }

    createPlatform(pos, size) {
        const group = new THREE.Group();
        group.position.copy(pos);

        // Top grass surface
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mesh = new THREE.Mesh(geo, this.grassMat);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        group.add(mesh);

        // Rocky under-base
        const underGeo = new THREE.BoxGeometry(size.x * 0.94, size.y * 1.8, size.z * 0.94);
        const under = new THREE.Mesh(underGeo, this.stoneMat);
        under.position.y = -size.y;
        under.castShadow = true;
        group.add(under);

        this.scene.add(group);

        const half = size.clone().multiplyScalar(0.5);
        this.platforms.push({
            isCylinder: false,
            min: new THREE.Vector3(pos.x - half.x, pos.y - half.y, pos.z - half.z),
            max: new THREE.Vector3(pos.x + half.x, pos.y + half.y, pos.z + half.z),
            mesh: mesh,
            deltaPos: null
        });
    }

    createEnergyGate(pos, size, colorHex, name) {
        const group = new THREE.Group();
        group.position.copy(pos);

        // Monolith pillars on left & right of gate
        const pillarGeo = new THREE.BoxGeometry(1.6, size.y + 1.5, 1.8);
        const leftPillar = new THREE.Mesh(pillarGeo, this.marbleMat);
        leftPillar.position.set(-size.x / 2 - 0.8, size.y / 2, 0);
        leftPillar.castShadow = true;
        group.add(leftPillar);

        const rightPillar = leftPillar.clone();
        rightPillar.position.x = size.x / 2 + 0.8;
        group.add(rightPillar);

        // Forcefield Barrier Mesh
        const barrierGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const barrierMat = new THREE.MeshBasicMaterial({
            color: colorHex,
            transparent: true,
            opacity: 0.65,
            wireframe: false,
            blending: THREE.AdditiveBlending
        });
        const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
        barrierMesh.position.y = size.y / 2;
        group.add(barrierMesh);

        this.scene.add(group);

        const gateObj = {
            name: name,
            mesh: barrierMesh,
            group: group,
            active: true,
            colorHex: colorHex,
            min: new THREE.Vector3(pos.x - size.x / 2 - 0.5, pos.y, pos.z - size.z / 2 - 0.5),
            max: new THREE.Vector3(pos.x + size.x / 2 + 0.5, pos.y + size.y, pos.z + size.z / 2 + 0.5),
            isBarrier: true
        };

        // Register as solid barrier in platforms
        this.platforms.push(gateObj);
        return gateObj;
    }

    dissolveGate(gateObj) {
        if (!gateObj || !gateObj.active) return;
        gateObj.active = false;
        gateObj.mesh.visible = false;
        window.audioManager.playGateDissolve();
        this.spawnExpandingRing(gateObj.group.position, gateObj.colorHex, 2.0, 16.0);
    }

    createAltarPad(pos) {
        const geo = new THREE.CylinderGeometry(3.5, 3.8, 0.4, 20);
        const mesh = new THREE.Mesh(geo, this.altarMat);
        mesh.position.copy(pos);
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        return {
            pos: pos,
            radius: 3.5,
            mesh: mesh,
            activated: false
        };
    }

    createRelicKey(id, pos) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const geo = new THREE.OctahedronGeometry(1.2, 0);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 2.2,
            roughness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        group.add(mesh);

        // Surrounding orbital ring
        const ringGeo = new THREE.TorusGeometry(1.9, 0.09, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        // Skyward Beacon Light Beam (visible across the island so it makes complete sense!)
        const beamGeo = new THREE.CylinderGeometry(0.3, 0.6, 36, 12);
        beamGeo.translate(0, 18, 0);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        group.add(beam);

        // Pedestal base
        const pedGeo = new THREE.CylinderGeometry(1.1, 1.4, 1.4, 12);
        pedGeo.translate(0, -1.1, 0);
        const ped = new THREE.Mesh(pedGeo, this.marbleMat);
        group.add(ped);

        this.scene.add(group);

        this.relicKeys.push({
            id: id,
            pos: pos.clone(),
            group: group,
            mesh: mesh,
            ring: ring,
            beam: beam,
            collected: false
        });
    }

    createCloudOrb(pos, orbId) {
        // Fluffy mystery cloud with a secret golden orb hidden inside!
        const cloudGroup = new THREE.Group();
        cloudGroup.position.copy(pos);

        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.85,
            transparent: true,
            opacity: 0.85
        });

        // Puffy cloud puffs surrounding the center
        const puffOffsets = [
            [0, 0, 0, 3.6],
            [-2.2, -0.4, 0.5, 2.8],
            [2.2, -0.3, -0.4, 3.0],
            [0.4, 0.8, -1.2, 2.6],
            [-0.8, -0.2, 1.8, 2.7],
            [1.2, 0.4, 1.4, 2.5]
        ];

        puffOffsets.forEach(([px, py, pz, radius]) => {
            const puffGeo = new THREE.DodecahedronGeometry(radius, 1);
            const puff = new THREE.Mesh(puffGeo, cloudMat);
            puff.position.set(px, py, pz);
            cloudGroup.add(puff);
        });

        this.scene.add(cloudGroup);

        // Hidden Golden Celestial Orb inside cloud
        const orbGeo = new THREE.OctahedronGeometry(0.85, 0);
        const orbMat = new THREE.MeshStandardMaterial({
            color: 0xffdd00,
            emissive: 0xffaa00,
            emissiveIntensity: 2.5,
            roughness: 0.1
        });
        const orbMesh = new THREE.Mesh(orbGeo, orbMat);
        orbMesh.position.copy(pos);
        this.scene.add(orbMesh);

        // Glowing orbital ring inside the cloud
        const ringGeo = new THREE.TorusGeometry(1.5, 0.08, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffe600, transparent: true, opacity: 0.8 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.rotation.x = Math.PI / 2;
        this.scene.add(ring);

        const orbObj = {
            id: orbId,
            originalPos: pos.clone(),
            pos: pos.clone(),
            mesh: orbMesh,
            ring: ring,
            cloudGroup: cloudGroup,
            isCloudSecret: true,
            collected: false
        };

        this.orbs.push(orbObj);
        return orbObj;
    }

    createSequenceGuide(pos) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const monoGeo = new THREE.BoxGeometry(2.2, 5.0, 2.2);
        const monoMesh = new THREE.Mesh(monoGeo, this.marbleMat);
        monoMesh.castShadow = true;
        group.add(monoMesh);

        // Sequence Glyphs Display (3 small glowing orbs representing the combination)
        const colors = [0x00f0ff, 0xa855f7, 0xffb800];
        colors.forEach((col, idx) => {
            const orbGeo = new THREE.SphereGeometry(0.35, 12, 12);
            const orbMat = new THREE.MeshBasicMaterial({ color: col });
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.set(0, 1.2 - idx * 0.9, 1.15);
            group.add(orb);
        });

        this.scene.add(group);
    }

    createSequencePillar(id, pos, colorHex, label) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const colGeo = new THREE.CylinderGeometry(1.2, 1.4, 4.5, 12);
        const col = new THREE.Mesh(colGeo, this.marbleMat);
        col.castShadow = true;
        group.add(col);

        // Glowing Core Crystal
        const crystalGeo = new THREE.DodecahedronGeometry(0.9);
        const crystalMat = new THREE.MeshStandardMaterial({
            color: colorHex,
            emissive: colorHex,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.position.y = 3.2;
        group.add(crystal);

        // Number Badge crown above each pillar (1, 2, 3)
        const numGroup = new THREE.Group();
        numGroup.position.set(0, 4.8, 0);

        const haloGeo = new THREE.TorusGeometry(0.8, 0.08, 8, 20);
        haloGeo.rotateX(Math.PI / 2);
        const haloMesh = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: colorHex }));
        numGroup.add(haloMesh);

        const dotCount = id + 1;
        for (let d = 0; d < dotCount; d++) {
            const dotGeo = new THREE.SphereGeometry(0.18, 8, 8);
            const dotMesh = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: colorHex }));
            dotMesh.position.set((d - (dotCount - 1) / 2) * 0.45, 0.35, 0);
            numGroup.add(dotMesh);
        }
        group.add(numGroup);

        this.scene.add(group);

        this.sequencePillars.push({
            id: id,
            pos: pos.clone(),
            group: group,
            crystal: crystal,
            numGroup: numGroup,
            colorHex: colorHex,
            activated: false
        });
    }

    createTimedPlate(id, pos) {
        const group = new THREE.Group();
        group.position.copy(pos);

        // Base
        const baseGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.4, 16);
        const base = new THREE.Mesh(baseGeo, this.marbleMat);
        group.add(base);

        // Kinetic Pressure Plate
        const plateGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.25, 16);
        const plateMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.4
        });
        const plate = new THREE.Mesh(plateGeo, plateMat);
        plate.position.y = 0.25;
        group.add(plate);

        this.scene.add(group);

        // Not registering duplicate platform box: plate sits on solid island cylinder

        this.timedPlates.push({
            id: id,
            pos: pos.clone(),
            plateMesh: plate,
            activated: false
        });
    }

    createApexSanctuary(pos) {
        const group = new THREE.Group();
        group.position.copy(pos);

        // Grand floating temple platform (Radius 30)
        const platGeo = new THREE.CylinderGeometry(30, 24, 3.5, 32);
        const plat = new THREE.Mesh(platGeo, this.marbleMat);
        plat.receiveShadow = true;
        group.add(plat);

        this.platforms.push({
            isCylinder: true,
            pos: pos.clone(),
            radius: 30,
            min: new THREE.Vector3(pos.x - 30, pos.y - 1.75, pos.z - 30),
            max: new THREE.Vector3(pos.x + 30, pos.y + 1.75, pos.z + 30),
            mesh: plat,
            deltaPos: null
        });

        // Celestial Core Sphere
        const coreGeo = new THREE.IcosahedronGeometry(4.2, 2);
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x00f0ff,
            emissiveIntensity: 2.0,
            roughness: 0.1
        });
        this.apexCore = new THREE.Mesh(coreGeo, coreMat);
        this.apexCore.position.y = 6.5;
        group.add(this.apexCore);

        // Orbiting rings
        const ringGeo = new THREE.TorusGeometry(8.0, 0.25, 12, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true });
        this.apexRing = new THREE.Mesh(ringGeo, ringMat);
        this.apexRing.position.y = 6.5;
        group.add(this.apexRing);

        this.scene.add(group);
    }

    createJumpPad(pos, power) {
        const group = new THREE.Group();
        group.position.copy(pos);

        const baseGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.5, 16);
        const baseMesh = new THREE.Mesh(baseGeo, this.marbleMat);
        group.add(baseMesh);

        const plateGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.35, 16);
        const plateMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.4
        });
        const plateMesh = new THREE.Mesh(plateGeo, plateMat);
        plateMesh.position.y = 0.35;
        group.add(plateMesh);

        this.scene.add(group);

        const padObj = {
            pos: pos.clone(),
            radius: 2.4,
            power: power,
            mesh: plateMesh
        };
        this.jumpPads.push(padObj);
        return padObj;
    }

    createMovingPlatform(startPos, endPos, size, speed) {
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
            max: new THREE.Vector3(),
            isMoving: true
        };

        this.updatePlatformBounds(platObj);
        this.platforms.push(platObj);
        this.movingPlatforms.push(platObj);
        return platObj;
    }

    createSpeedRing(pos, rotY) {
        const geo = new THREE.TorusGeometry(3.5, 0.35, 12, 28);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.5,
            roughness: 0.1
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.position.copy(pos);
        ring.rotation.y = rotY;
        this.scene.add(ring);

        this.speedRings.push({ pos: pos, radius: 3.5, mesh: ring, cooldown: 0 });
    }

    createTempleRuins(centerPos) {
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + 0.4;
            const x = centerPos.x + Math.cos(angle) * 16;
            const z = centerPos.z + Math.sin(angle) * 16;

            const colGeo = new THREE.CylinderGeometry(1.1, 1.3, 10, 12);
            const col = new THREE.Mesh(colGeo, this.marbleMat);
            col.position.set(x, centerPos.y + 6.5, z);
            col.castShadow = true;
            this.scene.add(col);

            const capGeo = new THREE.BoxGeometry(2.8, 0.9, 2.8);
            const cap = new THREE.Mesh(capGeo, this.marbleMat);
            cap.position.set(x, centerPos.y + 11.5, z);
            cap.castShadow = true;
            this.scene.add(cap);

            this.registerPlatform(
                new THREE.Vector3(x - 1.4, centerPos.y + 11.0, z - 1.4),
                new THREE.Vector3(x + 1.4, centerPos.y + 12.0, z + 1.4),
                cap
            );
        }

        const archGeo = new THREE.TorusGeometry(7, 1.1, 12, 24, Math.PI);
        const arch = new THREE.Mesh(archGeo, this.marbleMat);
        arch.position.set(centerPos.x, centerPos.y + 1.5, centerPos.z - 10);
        this.scene.add(arch);
    }

    createOrbs() {
        const orbPoints = [
            // Level 1
            new THREE.Vector3(0, 3.5, -12),
            new THREE.Vector3(14, 3.5, 14),
            new THREE.Vector3(-14, 3.5, 14),
            new THREE.Vector3(22, 3.5, -20),
            // Flight to Level 2 (Stepping Stones & Speed Ring)
            new THREE.Vector3(60, 10, -3),
            new THREE.Vector3(76, 12, -6),
            new THREE.Vector3(112, 17, 6),
            // Level 2
            new THREE.Vector3(160, 23.5, -12),
            new THREE.Vector3(185, 23.5, 14),
            new THREE.Vector3(205, 28, -8),
            // Flight to Level 3 (Moving Hover-Barges)
            new THREE.Vector3(265, 31, 0),
            new THREE.Vector3(315, 37, 0),
            // Level 3
            new THREE.Vector3(380, 43.5, -16),
            new THREE.Vector3(420, 43.5, 16),
            new THREE.Vector3(400, 49, 0),
            // Level 4 Summit
            new THREE.Vector3(392, 118, 8),
            new THREE.Vector3(408, 118, -8)
        ];

        const orbGeo = new THREE.OctahedronGeometry(0.65, 0);
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
            this.orbs.push({ id: idx, originalPos: pt.clone(), pos: pt.clone(), mesh: mesh, collected: false });
        });

        // 5 Secret Cloud Orbs (Els Núvols Màgics que amaguen orbes a dins!)
        this.createCloudOrb(new THREE.Vector3(-26, 4.5, 18), 101);   // Island 1 clifftop cloud
        this.createCloudOrb(new THREE.Vector3(94, 13.0, 0), 102);    // Stepping Stones aerial flight cloud
        this.createCloudOrb(new THREE.Vector3(170, 24.5, -24), 103); // Island 2 mystery waterfall cloud
        this.createCloudOrb(new THREE.Vector3(290, 33.5, 0), 104);   // Hover-barges glide cloud
        this.createCloudOrb(new THREE.Vector3(425, 44.5, -20), 105); // Island 3 temple terrace cloud
    }

    createClouds() {
        for (let i = 0; i < 16; i++) {
            const cloud = new THREE.Group();
            const angle = (i / 16) * Math.PI * 2;
            const dist = 240 + Math.random() * 80;
            const y = 35 + (Math.random() - 0.5) * 40;
            cloud.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);

            const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.85 });
            for (let j = 0; j < 5; j++) {
                const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(8 + Math.random() * 8, 1), cloudMat);
                puff.position.set((j - 2) * 8, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 6);
                cloud.add(puff);
            }
            this.scene.add(cloud);
        }
    }

    registerPlatform(min, max, mesh) {
        this.platforms.push({ min: min.clone(), max: max.clone(), mesh: mesh, deltaPos: null });
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
        const count = 300;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 450;
            positions[i * 3 + 1] = 5 + Math.random() * 90;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 350;
        }
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 1.4, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending });
        this.ambientParticles = new THREE.Points(geo, mat);
        this.scene.add(this.ambientParticles);
    }

    spawnExpandingRing(pos, color, startRadius, maxRadius) {
        const geo = new THREE.RingGeometry(startRadius, startRadius + 0.3, 32);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
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

    spawnJumpRing(pos) { this.spawnExpandingRing(pos, 0x00f0ff, 0.8, 4.0); }
    spawnDoubleJumpBurst(pos) { this.spawnExpandingRing(pos, 0xff007b, 1.2, 5.5); }
    spawnGroundPoundShockwave(pos) { this.spawnExpandingRing(pos, 0xffffff, 2.0, 12.0); }

    spawnOrbCollectBurst(pos) {
        for (let i = 0; i < 14; i++) {
            const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }));
            p.position.copy(pos);
            this.scene.add(p);
            const vel = new THREE.Vector3((Math.random() - 0.5) * 10, Math.random() * 8 + 2, (Math.random() - 0.5) * 10);
            this.activeTransientParticles.push({
                mesh: p,
                vel: vel,
                life: 0.55,
                maxLife: 0.55,
                update: (dt, item) => {
                    item.mesh.position.addScaledVector(item.vel, dt);
                    item.vel.y -= 14 * dt;
                    item.mesh.material.opacity = item.life / item.maxLife;
                }
            });
        }
    }

    update(dt, player, callbacks = {}) {
        const time = performance.now() * 0.001;

        // 1. Moving Platforms
        for (let i = 0; i < this.movingPlatforms.length; i++) {
            const p = this.movingPlatforms[i];
            const oldPos = p.mesh.position.clone();

            p.progress += dt * p.speed * p.direction;
            if (p.progress >= 1.0) { p.progress = 1.0; p.direction = -1; }
            else if (p.progress <= 0) { p.progress = 0; p.direction = 1; }

            const smoothT = 0.5 - 0.5 * Math.cos(p.progress * Math.PI);
            p.mesh.position.lerpVectors(p.startPos, p.endPos, smoothT);
            p.deltaPos.subVectors(p.mesh.position, oldPos);
            this.updatePlatformBounds(p);
        }

        // 2. PUZZLE 1: Relic Keys & Altar Pad (Fàcil i intuïtiu)
        for (let i = 0; i < this.relicKeys.length; i++) {
            const r = this.relicKeys[i];
            if (!r.collected) {
                r.mesh.rotation.y += dt * 2.5;
                r.ring.rotation.z += dt * 1.5;
                if (r.beam) r.beam.rotation.y += dt * 0.5;
                if (player.position.distanceTo(r.pos) < 2.5) {
                    r.collected = true;
                    r.group.visible = false;
                    this.relicsCollected++;
                    window.audioManager.playKeyCollect();
                    this.spawnOrbCollectBurst(r.pos);
                    if (callbacks.onRelicCollected) callbacks.onRelicCollected(this.relicsCollected, 3);

                    // Auto-unlock Gate 1 when all 3 keys are collected!
                    if (this.relicsCollected >= 3 && this.gate1 && this.gate1.active) {
                        if (this.altarPad) {
                            this.altarPad.activated = true;
                            this.altarPad.mesh.material.emissiveIntensity = 2.5;
                        }
                        this.dissolveGate(this.gate1);
                        this.currentLevel = 2;
                        if (callbacks.onLevelAdvanced) callbacks.onLevelAdvanced(2, "Nivell 2: Les Agulles de Cristall");
                    }
                }
            }
        }

        // Altar Pad check
        if (this.altarPad && !this.altarPad.activated) {
            if (this.relicsCollected >= 3 && player.position.distanceTo(this.altarPad.pos) < 3.2 && player.isGrounded) {
                this.altarPad.activated = true;
                this.altarPad.mesh.material.emissiveIntensity = 2.5;
                this.dissolveGate(this.gate1);
                this.currentLevel = 2;
                if (callbacks.onLevelAdvanced) callbacks.onLevelAdvanced(2, "Nivell 2: Les Agulles de Cristall");
            }
        }

        // 3. PUZZLE 2: Sequence Pillars (Pas a pas clar i guiat)
        if (this.currentLevel >= 2 && this.gate2 && this.gate2.active) {
            for (let i = 0; i < this.sequencePillars.length; i++) {
                const sp = this.sequencePillars[i];
                sp.crystal.rotation.y += dt * 2.0;
                if (sp.numGroup) sp.numGroup.rotation.y += dt * 1.2;

                const dist = player.position.distanceTo(sp.pos);
                if (dist < 3.2 && !sp.activated) {
                    const expectedId = this.sequenceTarget[this.sequenceCurrentStep];
                    if (sp.id === expectedId) {
                        // Correct touch!
                        sp.activated = true;
                        sp.crystal.material.emissiveIntensity = 3.5;
                        this.sequenceCurrentStep++;
                        window.audioManager.playRuneTouch(true);
                        this.spawnExpandingRing(sp.pos, sp.colorHex, 1.0, 6.0);

                        if (this.sequenceCurrentStep >= this.sequenceTarget.length) {
                            // Puzzle 2 solved!
                            this.dissolveGate(this.gate2);
                            this.currentLevel = 3;
                            if (callbacks.onLevelAdvanced) callbacks.onLevelAdvanced(3, "Nivell 3: La Farga de l'Àpex");
                        } else {
                            if (callbacks.onSequenceStep) callbacks.onSequenceStep(this.sequenceCurrentStep, 3);
                        }
                    } else {
                        // Soft hint sound if touching out of order without harsh reset
                        window.audioManager.playRuneTouch(false);
                    }
                }
            }
        }

        // 4. PUZZLE 3: Pressure Plates (Activació permanent, sense temporitzador estressant!)
        if (this.currentLevel >= 3 && this.gate3 && this.gate3.active) {
            for (let i = 0; i < this.timedPlates.length; i++) {
                const tp = this.timedPlates[i];
                if (!tp.activated && player.position.distanceTo(tp.pos) < 2.5 && player.isGrounded) {
                    tp.activated = true;
                    tp.plateMesh.position.y = 0.08; // Physical depress
                    tp.plateMesh.material.emissiveIntensity = 3.0;
                    tp.plateMesh.material.color.setHex(0x00ff88);
                    tp.plateMesh.material.emissive.setHex(0x00ff88);
                    window.audioManager.playRuneTouch(true);
                    this.spawnExpandingRing(tp.pos, 0x00ff88, 1.5, 7.0);

                    const activeCount = this.timedPlates.filter(p => p.activated).length;
                    if (callbacks.onPlateActivated) callbacks.onPlateActivated(activeCount, 3);

                    // Check if all 3 plates active
                    const allActive = this.timedPlates.every(p => p.activated);
                    if (allActive) {
                        this.dissolveGate(this.gate3);
                        this.currentLevel = 4;
                        if (callbacks.onLevelAdvanced) callbacks.onLevelAdvanced(4, "Nivell 4: L'Àpex Suprem");
                    }
                }
            }
        }

        // 5. Jump Pads (Generós i còmode de trepitjar)
        for (let i = 0; i < this.jumpPads.length; i++) {
            const pad = this.jumpPads[i];
            const dist = player.position.distanceTo(pad.pos);
            if (dist < pad.radius + 0.6 && player.position.y >= pad.pos.y - 0.4 && player.position.y <= pad.pos.y + 1.6) {
                player.velocity.y = pad.power;
                player.isGrounded = false;
                window.audioManager.playBouncePad();
                this.spawnJumpRing(pad.pos);
            }
        }

        // 6. Speed Rings
        for (let i = 0; i < this.speedRings.length; i++) {
            const ring = this.speedRings[i];
            if (ring.cooldown > 0) ring.cooldown -= dt;
            if (player.position.distanceTo(ring.pos) < ring.radius + 0.8 && ring.cooldown <= 0) {
                ring.cooldown = 2.0;
                const forward = new THREE.Vector3(Math.sin(player.targetRotation), 0.2, Math.cos(player.targetRotation)).normalize();
                player.velocity.x = forward.x * 35;
                player.velocity.z = forward.z * 35;
                player.velocity.y = 14;
                window.audioManager.playSpeedRing();
                this.spawnExpandingRing(ring.pos, 0x00f0ff, 1.5, 8.0);
            }
        }

        // 7. Apex Core & Victory Check
        if (this.apexCore) {
            this.apexCore.rotation.x += dt * 0.4;
            this.apexCore.rotation.y += dt * 0.6;
            this.apexRing.rotation.z += dt * 0.8;

            if (this.currentLevel >= 4 && !this.apexReached) {
                if (player.position.distanceTo(this.apexPos) < 18.0 && player.position.y >= this.apexPos.y - 1.0) {
                    this.apexReached = true;
                    if (callbacks.onVictory) callbacks.onVictory();
                }
            }
        }

        // 8. Collectible Orbs & Secret Cloud Orbs
        for (let i = 0; i < this.orbs.length; i++) {
            const orb = this.orbs[i];
            if (orb.collected) continue;

            orb.mesh.rotation.y += dt * 2.0;
            if (orb.ring) orb.ring.rotation.z += dt * 1.5;
            orb.pos.y = orb.originalPos.y + Math.sin(time * 3 + orb.id) * 0.35;
            orb.mesh.position.y = orb.pos.y;
            if (orb.ring) orb.ring.position.y = orb.pos.y;

            const dist = player.position.distanceTo(orb.mesh.position);
            // Magnetic attraction
            if (dist < 7.0) {
                const dir = new THREE.Vector3().subVectors(player.position, orb.mesh.position).normalize();
                orb.mesh.position.addScaledVector(dir, (7.0 - dist) * 7.5 * dt);
                if (orb.ring) orb.ring.position.copy(orb.mesh.position);
            }
            if (dist < 1.8) {
                orb.collected = true;
                orb.mesh.visible = false;
                if (orb.ring) orb.ring.visible = false;

                // Cloud Orb discovery delight!
                if (orb.isCloudSecret && orb.cloudGroup) {
                    orb.cloudGroup.scale.set(1.25, 1.25, 1.25);
                }

                window.audioManager.playOrbCollect();
                this.spawnOrbCollectBurst(orb.mesh.position);
                if (callbacks.onOrbCollected) callbacks.onOrbCollected(orb);
            }
        }

        // 9. Transient Particles
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

        if (this.ambientParticles) this.ambientParticles.rotation.y += dt * 0.02;
    }
}

window.World = World;
