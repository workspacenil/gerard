/**
 * AETHERIA - 3D Player Character, Rigging, Procedural Animations & Physics Controller
 * Character: The Bearded Catalan Adventurer riding his Wild Jumping Goat!
 * Features:
 *   - Highly detailed 3D articulated rider (red hoodie, backpack with Catalan Senyera flag, beard, denim jeans, sneakers)
 *   - Hyper-expressive jumping goat (fluffy wool, ribbed horns, flapping floppy ears, lolling pink tongue, cloven hooves)
 *   - Underbelly Fire Rocket Thruster System with dynamic animated flame mesh, trailing ember particles & flickering light
 *   - Majestic feathered Glider Wings that dynamically unfurl and flap/ripple with airflow during flight
 *   - Rich procedural kinematic state machine & physics controller
 */

class Player {
    constructor(scene) {
        this.scene = scene;

        // Position & Kinematics
        this.position = new THREE.Vector3(0, 8, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = Math.PI; // Y-rotation angle (faces forward into world along -Z at spawn)
        this.targetRotation = Math.PI;
        this.bankAngle = 0; // Roll angle when turning/gliding
        this.pitchAngle = 0; // Pitch angle when diving/climbing

        // State Machine
        this.isGrounded = false;
        this.isGliding = false;
        this.isDashing = false;
        this.isGroundPounding = false;
        this.isSprinting = false;
        this.canDoubleJump = false;

        // Timers & Cooldowns
        this.dashCooldown = 0;
        this.dashMaxCooldown = 1.2;
        this.dashTimer = 0;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;

        // Movement Constants & Tuning
        this.walkSpeed = 14;
        this.sprintSpeed = 23;
        this.glideSpeed = 18;
        this.dashSpeed = 46;
        this.jumpForce = 18;
        this.doubleJumpForce = 16;
        this.gravity = 36;
        this.glideGravity = 5.2; // Gentle descent while gliding
        this.terminalVelocity = 48;
        this.maxGlideFallSpeed = 4.0;

        // Procedural Animation Clock & States
        this.animTime = 0;
        this.wingDeployProgress = 0; // 0 (hidden) to 1 (fully spread)
        this.thrusterFireIntensity = 0; // 0 to 1

        // Spawn & Respawn Checkpoint
        this.checkpoint = new THREE.Vector3(0, 8, 0);

        // Build Textures, Materials & 3D Model
        this.initTexturesAndMaterials();
        this.createModel();
        this.initThrusterFireEffects();
    }

    // ==========================================
    // PROCEDURAL TEXTURES & HIGH QUALITY MATERIALS
    // ==========================================
    initTexturesAndMaterials() {
        // 1. Catalan Flag (Senyera) Patch: 4 red stripes on yellow background with embroidered border
        const flagCanvas = document.createElement('canvas');
        flagCanvas.width = 256;
        flagCanvas.height = 170;
        const fctx = flagCanvas.getContext('2d');
        // Yellow base
        fctx.fillStyle = '#facc15';
        fctx.fillRect(0, 0, 256, 170);
        // 4 Red horizontal bars
        const stripeHeight = 170 / 9;
        fctx.fillStyle = '#dc2626';
        for (let i = 1; i < 9; i += 2) {
            fctx.fillRect(0, i * stripeHeight, 256, stripeHeight);
        }
        // Border & stitching
        fctx.strokeStyle = '#92400e';
        fctx.lineWidth = 8;
        fctx.strokeRect(4, 4, 248, 162);
        fctx.strokeStyle = '#fef08a';
        fctx.lineWidth = 3;
        fctx.strokeRect(7, 7, 242, 156);

        this.flagTexture = new THREE.CanvasTexture(flagCanvas);

        // 2. Goat Wool / Fur Procedural Texture
        const furCanvas = document.createElement('canvas');
        furCanvas.width = 256;
        furCanvas.height = 256;
        const uctx = furCanvas.getContext('2d');
        uctx.fillStyle = '#f8f7f4';
        uctx.fillRect(0, 0, 256, 256);
        uctx.fillStyle = 'rgba(235, 230, 220, 0.45)';
        for (let i = 0; i < 1200; i++) {
            const rx = Math.random() * 256;
            const ry = Math.random() * 256;
            const rr = 1.5 + Math.random() * 3.5;
            uctx.beginPath();
            uctx.arc(rx, ry, rr, 0, Math.PI * 2);
            uctx.fill();
        }
        this.furTexture = new THREE.CanvasTexture(furCanvas);
        this.furTexture.wrapS = THREE.RepeatWrapping;
        this.furTexture.wrapT = THREE.RepeatWrapping;
        this.furTexture.repeat.set(2, 2);

        // 3. Denim Jeans Fabric Texture
        const denimCanvas = document.createElement('canvas');
        denimCanvas.width = 128;
        denimCanvas.height = 128;
        const dctx = denimCanvas.getContext('2d');
        dctx.fillStyle = '#254e7a';
        dctx.fillRect(0, 0, 128, 128);
        dctx.strokeStyle = 'rgba(180, 205, 235, 0.2)';
        dctx.lineWidth = 1;
        for (let x = -128; x < 256; x += 4) {
            dctx.beginPath();
            dctx.moveTo(x, 0);
            dctx.lineTo(x + 128, 128);
            dctx.stroke();
        }
        this.denimTexture = new THREE.CanvasTexture(denimCanvas);
        this.denimTexture.wrapS = THREE.RepeatWrapping;
        this.denimTexture.wrapT = THREE.RepeatWrapping;
        this.denimTexture.repeat.set(3, 3);

        // 4. Feather Texture for Wings
        const featherCanvas = document.createElement('canvas');
        featherCanvas.width = 256;
        featherCanvas.height = 512;
        const wctx = featherCanvas.getContext('2d');
        const wingGrad = wctx.createLinearGradient(0, 0, 256, 512);
        wingGrad.addColorStop(0, '#ffffff');
        wingGrad.addColorStop(0.5, '#e0f2fe');
        wingGrad.addColorStop(0.85, '#bae6fd');
        wingGrad.addColorStop(1, '#38bdf8');
        wctx.fillStyle = wingGrad;
        wctx.fillRect(0, 0, 256, 512);
        // Central feather shafts & barb lines
        wctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        wctx.lineWidth = 3;
        for (let y = 30; y < 512; y += 38) {
            wctx.beginPath();
            wctx.moveTo(128, y);
            wctx.quadraticCurveTo(200, y + 15, 250, y + 25);
            wctx.moveTo(128, y);
            wctx.quadraticCurveTo(56, y + 15, 6, y + 25);
            wctx.stroke();
        }
        this.featherTexture = new THREE.CanvasTexture(featherCanvas);

        // --- Standard PBR Materials ---
        this.matGoatFur = new THREE.MeshStandardMaterial({
            map: this.furTexture,
            color: 0xfbfbf8,
            roughness: 0.85,
            metalness: 0.05
        });

        this.matGoatHorn = new THREE.MeshStandardMaterial({
            color: 0x785536,
            roughness: 0.65,
            metalness: 0.15
        });

        this.matGoatHoof = new THREE.MeshStandardMaterial({
            color: 0x241d18,
            roughness: 0.45,
            metalness: 0.2
        });

        this.matSkin = new THREE.MeshStandardMaterial({
            color: 0xf5c39b,
            roughness: 0.65,
            metalness: 0.05
        });

        this.matHairBeard = new THREE.MeshStandardMaterial({
            color: 0x3d2114,
            roughness: 0.8,
            metalness: 0.08
        });

        this.matHoodie = new THREE.MeshStandardMaterial({
            color: 0xbe123c, // Vibrant red hoodie
            roughness: 0.75,
            metalness: 0.05
        });

        this.matBackpack = new THREE.MeshStandardMaterial({
            color: 0x27272a, // Charcoal backpack
            roughness: 0.65,
            metalness: 0.15
        });

        this.matSenyera = new THREE.MeshStandardMaterial({
            map: this.flagTexture,
            roughness: 0.5,
            metalness: 0.1
        });

        this.matDenim = new THREE.MeshStandardMaterial({
            map: this.denimTexture,
            color: 0x3b6694,
            roughness: 0.75,
            metalness: 0.05
        });

        this.matShoe = new THREE.MeshStandardMaterial({
            color: 0x4a2e1b,
            roughness: 0.6,
            metalness: 0.1
        });

        this.matShoeSole = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.1
        });

        this.matLeatherHarness = new THREE.MeshStandardMaterial({
            color: 0x543217,
            roughness: 0.5,
            metalness: 0.2
        });

        this.matGoldBuckle = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            roughness: 0.3,
            metalness: 0.85
        });

        this.matMouthInside = new THREE.MeshStandardMaterial({
            color: 0x7f1d1d,
            roughness: 0.5
        });

        this.matTongue = new THREE.MeshStandardMaterial({
            color: 0xf43f5e,
            roughness: 0.35
        });

        this.matEyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.matPupil = new THREE.MeshBasicMaterial({ color: 0x0f172a });

        this.matFeatherWing = new THREE.MeshStandardMaterial({
            map: this.featherTexture,
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.1,
            side: THREE.DoubleSide
        });

        this.matThrusterNozzle = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.25,
            metalness: 0.85
        });
    }

    // ==========================================
    // 3D MODEL HIERARCHY CONSTRUCTION
    // ==========================================
    createModel() {
        this.root = new THREE.Group();
        this.meshContainer = new THREE.Group();
        this.root.add(this.meshContainer);

        // Character assembly group centered on the goat
        this.characterGroup = new THREE.Group();
        this.meshContainer.add(this.characterGroup);

        // 1. BUILD THE GOAT (La Cabra)
        this.buildGoat();

        // 2. BUILD THE RIDER (El Genet amb dessuadora vermella i senyera)
        this.buildRider();

        // 3. BUILD THE SPREADING GLIDER WINGS (Ales dinàmiques)
        this.buildGliderWings();

        // 4. LOAD HIGH QUALITY CUSTOM 3D GLB MODEL
        this.loadCustomGLB('models/skyebrowse-3d-model.glb');

        // Add to Three.js scene
        this.root.position.copy(this.position);
        this.scene.add(this.root);
    }

    loadCustomGLB(url) {
        if (typeof THREE.GLTFLoader === 'undefined') return;

        const loader = new THREE.GLTFLoader();
        loader.load(url, (gltf) => {
            const model = gltf.scene;

            model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.computeVertexNormals();
                    }
                    if (child.material) {
                        child.material.side = THREE.DoubleSide;
                        child.material.roughness = 0.55;
                        child.material.metalness = 0.1;
                    }
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Calculate bounding box and scale to standard height (~1.85m) with robust, chubbier girth
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());

            const targetHeight = 1.85;
            const scaleY = targetHeight / (size.y || 1.0);
            const scaleX = scaleY * 1.48; // Més gras i ample (silueta robusta de videojoc)
            const scaleZ = scaleY * 1.28; // Més volum corporal
            model.scale.set(scaleX, scaleY, scaleZ);

            // Re-center model so feet touch ground at Y = 0 and center is at (0, 0)
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
            model.position.x = -scaledCenter.x;
            model.position.y = -scaledBox.min.y;
            model.position.z = -scaledCenter.z;
            model.rotation.y = 0; // Model native front is +Z, aligned with characterGroup

            this.customModelGroup = new THREE.Group();
            this.customModelGroup.add(model);
            this.characterGroup.add(this.customModelGroup);

            // Hide the fallback procedural geometry
            if (this.goatGroup) this.goatGroup.visible = false;
            if (this.riderGroup) this.riderGroup.visible = false;

            console.log('✅ Model 3D GLB carregat i optimitzat amb èxit!', { size, scale });
        }, undefined, (err) => {
            console.log('Utilitzant model procedural de suport:', err);
        });
    }

    // --- 1. THE GOAT MESH ---
    buildGoat() {
        this.goatGroup = new THREE.Group();
        this.goatGroup.position.set(0, 0, 0);
        this.characterGroup.add(this.goatGroup);

        // Goat Main Body Torso (Woolly sphere-cylinder)
        const bodyGeo = new THREE.SphereGeometry(0.5, 20, 16);
        bodyGeo.scale(0.85, 0.92, 1.4);
        this.goatBody = new THREE.Mesh(bodyGeo, this.matGoatFur);
        this.goatBody.position.set(0, 0.72, 0);
        this.goatBody.castShadow = true;
        this.goatGroup.add(this.goatBody);

        // Fluffy Chest Tuft
        const chestGeo = new THREE.SphereGeometry(0.42, 16, 14);
        chestGeo.scale(0.85, 1.05, 0.9);
        const chestTuft = new THREE.Mesh(chestGeo, this.matGoatFur);
        chestTuft.position.set(0, 0.76, 0.45);
        chestTuft.castShadow = true;
        this.goatGroup.add(chestTuft);

        // Leather Saddle Girth Belt & Buckle
        const strapGeo = new THREE.CylinderGeometry(0.53, 0.53, 0.16, 20);
        strapGeo.rotateZ(Math.PI / 2);
        strapGeo.scale(1, 0.88, 1.15);
        const strap = new THREE.Mesh(strapGeo, this.matLeatherHarness);
        strap.position.set(0, 0.72, 0.05);
        this.goatGroup.add(strap);

        const buckleGeo = new THREE.BoxGeometry(0.12, 0.1, 0.22);
        const buckle = new THREE.Mesh(buckleGeo, this.matGoldBuckle);
        buckle.position.set(0.46, 0.68, 0.05);
        this.goatGroup.add(buckle);

        // Goat Tail (Perky & wagging)
        this.goatTailGroup = new THREE.Group();
        this.goatTailGroup.position.set(0, 0.85, -0.66);
        const tailGeo = new THREE.ConeGeometry(0.12, 0.32, 10);
        tailGeo.rotateX(-Math.PI / 3.2);
        const tailMesh = new THREE.Mesh(tailGeo, this.matGoatFur);
        tailMesh.castShadow = true;
        this.goatTailGroup.add(tailMesh);
        this.goatGroup.add(this.goatTailGroup);

        // Goat Neck
        this.goatNeckGroup = new THREE.Group();
        this.goatNeckGroup.position.set(0, 0.82, 0.5);
        const neckGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.45, 14);
        neckGeo.rotateX(Math.PI / 5);
        const neckMesh = new THREE.Mesh(neckGeo, this.matGoatFur);
        neckMesh.castShadow = true;
        this.goatNeckGroup.add(neckMesh);
        this.goatGroup.add(this.goatNeckGroup);

        // Goat Head Group
        this.goatHeadGroup = new THREE.Group();
        this.goatHeadGroup.position.set(0, 0.3, 0.26);
        this.goatNeckGroup.add(this.goatHeadGroup);

        // Skull & Cheek fluff
        const skullGeo = new THREE.SphereGeometry(0.3, 16, 14);
        skullGeo.scale(0.85, 0.95, 1.15);
        const skull = new THREE.Mesh(skullGeo, this.matGoatFur);
        skull.castShadow = true;
        this.goatHeadGroup.add(skull);

        // Muzzle / Snout
        const muzzleGeo = new THREE.CylinderGeometry(0.16, 0.24, 0.38, 12);
        muzzleGeo.rotateX(Math.PI / 2.3);
        const muzzle = new THREE.Mesh(muzzleGeo, this.matGoatFur);
        muzzle.position.set(0, -0.05, 0.28);
        muzzle.castShadow = true;
        this.goatHeadGroup.add(muzzle);

        // Pink Nostrils / Snout Tip
        const snoutTipGeo = new THREE.SphereGeometry(0.11, 10, 10);
        snoutTipGeo.scale(1.2, 0.8, 0.8);
        const snoutTip = new THREE.Mesh(snoutTipGeo, this.matSkin);
        snoutTip.position.set(0, -0.12, 0.46);
        this.goatHeadGroup.add(snoutTip);

        // Chin Goatee Beard (Swings with motion)
        this.goatBeard = new THREE.Group();
        this.goatBeard.position.set(0, -0.25, 0.3);
        const beardGeo = new THREE.ConeGeometry(0.1, 0.28, 8);
        beardGeo.rotateX(Math.PI / 6);
        const beardMesh = new THREE.Mesh(beardGeo, this.matGoatFur);
        this.goatBeard.add(beardMesh);
        this.goatHeadGroup.add(this.goatBeard);

        // Open Mouth Interior & Teeth
        const mouthCavityGeo = new THREE.SphereGeometry(0.14, 10, 8);
        mouthCavityGeo.scale(1.2, 0.7, 0.9);
        const mouthCavity = new THREE.Mesh(mouthCavityGeo, this.matMouthInside);
        mouthCavity.position.set(0, -0.14, 0.35);
        this.goatHeadGroup.add(mouthCavity);

        // Hilarious Pink Floppy Tongue (Lolls out to the right side!)
        this.goatTongueGroup = new THREE.Group();
        this.goatTongueGroup.position.set(0.08, -0.15, 0.38);
        const tongueGeo = new THREE.BoxGeometry(0.14, 0.05, 0.32);
        tongueGeo.translate(0.04, -0.04, 0.12);
        const tongueMesh = new THREE.Mesh(tongueGeo, this.matTongue);
        this.goatTongueGroup.add(tongueMesh);
        this.goatHeadGroup.add(this.goatTongueGroup);

        // Big Goofy Eyes (White sclera + round dark pupils)
        const eyeGeo = new THREE.SphereGeometry(0.13, 14, 12);
        const pupilGeo = new THREE.SphereGeometry(0.065, 10, 10);
        pupilGeo.scale(1, 1, 0.4);

        // Left Eye
        this.goatLeftEye = new THREE.Mesh(eyeGeo, this.matEyeWhite);
        this.goatLeftEye.position.set(-0.25, 0.12, 0.2);
        const leftPupil = new THREE.Mesh(pupilGeo, this.matPupil);
        leftPupil.position.set(-0.04, -0.01, 0.11);
        this.goatLeftEye.add(leftPupil);
        this.goatHeadGroup.add(this.goatLeftEye);

        // Right Eye (Slightly derpy pupil looking outward/excited)
        this.goatRightEye = new THREE.Mesh(eyeGeo, this.matEyeWhite);
        this.goatRightEye.position.set(0.25, 0.12, 0.2);
        const rightPupil = new THREE.Mesh(pupilGeo, this.matPupil);
        rightPupil.position.set(0.04, -0.01, 0.11);
        this.goatRightEye.add(rightPupil);
        this.goatHeadGroup.add(this.goatRightEye);

        // Floppy Long Goat Ears (Bob up & down with physics!)
        const earShape = new THREE.ConeGeometry(0.12, 0.45, 8);
        earShape.scale(1.2, 1, 0.4);
        earShape.translate(0, -0.2, 0);

        this.goatLeftEar = new THREE.Group();
        this.goatLeftEar.position.set(-0.28, 0.1, -0.05);
        this.goatLeftEar.rotation.z = Math.PI / 2.6;
        this.goatLeftEar.rotation.x = 0.2;
        const leftEarMesh = new THREE.Mesh(earShape, this.matGoatFur);
        this.goatLeftEar.add(leftEarMesh);
        this.goatHeadGroup.add(this.goatLeftEar);

        this.goatRightEar = new THREE.Group();
        this.goatRightEar.position.set(0.28, 0.1, -0.05);
        this.goatRightEar.rotation.z = -Math.PI / 2.6;
        this.goatRightEar.rotation.x = 0.2;
        const rightEarMesh = new THREE.Mesh(earShape, this.matGoatFur);
        this.goatRightEar.add(rightEarMesh);
        this.goatHeadGroup.add(this.goatRightEar);

        // Curved Brown Horns (Held as handlebars by the rider!)
        this.goatLeftHorn = this.createHorn(-1);
        this.goatRightHorn = this.createHorn(1);
        this.goatHeadGroup.add(this.goatLeftHorn);
        this.goatHeadGroup.add(this.goatRightHorn);

        // 4 ARTICULATED GOAT LEGS
        this.frontLeftLeg = this.createGoatLeg(-0.25, 0.65, 0.38, true);
        this.frontRightLeg = this.createGoatLeg(0.25, 0.65, 0.38, true);
        this.rearLeftLeg = this.createGoatLeg(-0.25, 0.65, -0.42, false);
        this.rearRightLeg = this.createGoatLeg(0.25, 0.65, -0.42, false);

        this.goatGroup.add(this.frontLeftLeg.root);
        this.goatGroup.add(this.frontRightLeg.root);
        this.goatGroup.add(this.rearLeftLeg.root);
        this.goatGroup.add(this.rearRightLeg.root);
    }

    createHorn(side) {
        const hornGroup = new THREE.Group();
        hornGroup.position.set(side * 0.15, 0.26, 0.05);

        // Arc curve sweeping back and outwards
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(side * 0.08, 0.22, -0.12),
            new THREE.Vector3(side * 0.22, 0.38, -0.32),
            new THREE.Vector3(side * 0.32, 0.42, -0.52)
        ]);

        const hornGeo = new THREE.TubeGeometry(curve, 18, 0.075, 10, false);
        const hornMesh = new THREE.Mesh(hornGeo, this.matGoatHorn);
        hornMesh.castShadow = true;
        hornGroup.add(hornMesh);

        return hornGroup;
    }

    createGoatLeg(x, y, z, isFront) {
        const root = new THREE.Group();
        root.position.set(x, y, z);

        // Upper leg (shoulder / thigh)
        const upperGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.36, 10);
        upperGeo.translate(0, -0.18, 0);
        const upperMesh = new THREE.Mesh(upperGeo, this.matGoatFur);
        upperMesh.castShadow = true;
        root.add(upperMesh);

        // Knee joint / lower leg
        const lowerGroup = new THREE.Group();
        lowerGroup.position.set(0, -0.34, 0);

        const lowerGeo = new THREE.CylinderGeometry(0.08, 0.065, 0.34, 10);
        lowerGeo.translate(0, -0.17, 0);
        const lowerMesh = new THREE.Mesh(lowerGeo, this.matGoatFur);
        lowerMesh.castShadow = true;
        lowerGroup.add(lowerMesh);

        // Cloven Hoof
        const hoofGeo = new THREE.CylinderGeometry(0.075, 0.09, 0.12, 8);
        hoofGeo.translate(0, -0.36, 0.02);
        const hoofMesh = new THREE.Mesh(hoofGeo, this.matGoatHoof);
        hoofMesh.castShadow = true;
        lowerGroup.add(hoofMesh);

        root.add(lowerGroup);

        return { root, upper: upperMesh, lower: lowerGroup, isFront };
    }

    // --- 2. THE RIDER MESH ---
    buildRider() {
        this.riderGroup = new THREE.Group();
        this.riderGroup.position.set(0, 0.95, -0.05); // Astride the goat
        this.characterGroup.add(this.riderGroup);

        // Rider Torso in Red Hoodie
        const torsoGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.65, 14);
        torsoGeo.scale(1.15, 1, 0.85);
        this.riderTorso = new THREE.Mesh(torsoGeo, this.matHoodie);
        this.riderTorso.position.set(0, 0.32, 0);
        this.riderTorso.rotation.x = 0.22; // Leaning forward eagerly
        this.riderTorso.castShadow = true;
        this.riderGroup.add(this.riderTorso);

        // Hoodie collar / hood bunched behind neck
        const hoodCollarGeo = new THREE.TorusGeometry(0.25, 0.1, 10, 16);
        hoodCollarGeo.rotateX(Math.PI / 2.3);
        const hoodCollar = new THREE.Mesh(hoodCollarGeo, this.matHoodie);
        hoodCollar.position.set(0, 0.3, -0.06);
        this.riderTorso.add(hoodCollar);

        // Dangling white hoodie drawstrings
        const stringGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6);
        stringGeo.translate(0, -0.11, 0);
        const leftString = new THREE.Mesh(stringGeo, this.matShoeSole);
        leftString.position.set(-0.09, 0.25, 0.24);
        const rightString = leftString.clone();
        rightString.position.x = 0.09;
        this.riderTorso.add(leftString);
        this.riderTorso.add(rightString);

        // BACKPACK WITH CATALAN FLAG (SENYERA)
        this.backpackGroup = new THREE.Group();
        this.backpackGroup.position.set(0, 0.02, -0.22);

        const packGeo = new THREE.BoxGeometry(0.42, 0.46, 0.22);
        const packMesh = new THREE.Mesh(packGeo, this.matBackpack);
        packMesh.castShadow = true;
        this.backpackGroup.add(packMesh);

        // Backpack front pouch
        const pouchGeo = new THREE.BoxGeometry(0.34, 0.26, 0.08);
        const pouchMesh = new THREE.Mesh(pouchGeo, this.matBackpack);
        pouchMesh.position.set(0, -0.06, -0.13);
        this.backpackGroup.add(pouchMesh);

        // Senyera Patch mounted cleanly on the back
        const flagPlaneGeo = new THREE.PlaneGeometry(0.24, 0.16);
        flagPlaneGeo.rotateY(Math.PI); // Facing backward
        const flagMesh = new THREE.Mesh(flagPlaneGeo, this.matSenyera);
        flagMesh.position.set(0, 0.04, -0.175);
        this.backpackGroup.add(flagMesh);

        this.riderTorso.add(this.backpackGroup);

        // RIDER HEAD & EXPRESSIVE FACE
        this.riderHeadGroup = new THREE.Group();
        this.riderHeadGroup.position.set(0, 0.42, 0.08);

        // Head Base
        const headGeo = new THREE.SphereGeometry(0.28, 18, 16);
        headGeo.scale(0.92, 1, 0.95);
        const headMesh = new THREE.Mesh(headGeo, this.matSkin);
        headMesh.castShadow = true;
        this.riderHeadGroup.add(headMesh);

        // Chunky Beard & Mustache
        const beardGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.32, 12);
        beardGeo.scale(1, 0.9, 1.05);
        const beardMesh = new THREE.Mesh(beardGeo, this.matHairBeard);
        beardMesh.position.set(0, -0.12, 0.06);
        this.riderHeadGroup.add(beardMesh);

        const mustacheGeo = new THREE.SphereGeometry(0.12, 10, 8);
        mustacheGeo.scale(2.2, 0.7, 0.9);
        const mustache = new THREE.Mesh(mustacheGeo, this.matHairBeard);
        mustache.position.set(0, -0.02, 0.26);
        this.riderHeadGroup.add(mustache);

        // Expressive Open Mouth ("WOOO!")
        const riderMouthGeo = new THREE.SphereGeometry(0.09, 10, 8);
        riderMouthGeo.scale(1.1, 0.6, 0.7);
        const riderMouth = new THREE.Mesh(riderMouthGeo, this.matMouthInside);
        riderMouth.position.set(0, -0.07, 0.26);
        this.riderHeadGroup.add(riderMouth);

        // Rider Big Expressive Eyes
        const riderEyeGeo = new THREE.SphereGeometry(0.085, 12, 10);
        const riderPupilGeo = new THREE.SphereGeometry(0.042, 10, 8);
        riderPupilGeo.scale(1, 1, 0.4);

        // Left Eye
        const rLeftEye = new THREE.Mesh(riderEyeGeo, this.matEyeWhite);
        rLeftEye.position.set(-0.11, 0.06, 0.24);
        const rLeftPupil = new THREE.Mesh(riderPupilGeo, this.matPupil);
        rLeftPupil.position.set(0, 0, 0.075);
        rLeftEye.add(rLeftPupil);
        this.riderHeadGroup.add(rLeftEye);

        // Right Eye
        const rRightEye = new THREE.Mesh(riderEyeGeo, this.matEyeWhite);
        rRightEye.position.set(0.11, 0.06, 0.24);
        const rRightPupil = new THREE.Mesh(riderPupilGeo, this.matPupil);
        rRightPupil.position.set(0, 0, 0.075);
        rRightEye.add(rRightPupil);
        this.riderHeadGroup.add(rRightEye);

        // Eyebrows
        const browGeo = new THREE.BoxGeometry(0.1, 0.035, 0.04);
        const leftBrow = new THREE.Mesh(browGeo, this.matHairBeard);
        leftBrow.position.set(-0.11, 0.16, 0.26);
        leftBrow.rotation.z = 0.25;
        this.riderHeadGroup.add(leftBrow);

        const rightBrow = new THREE.Mesh(browGeo, this.matHairBeard);
        rightBrow.position.set(0.11, 0.16, 0.26);
        rightBrow.rotation.z = -0.25;
        this.riderHeadGroup.add(rightBrow);

        // Messy Layered Spiky Hair (matching the turnaround)
        this.riderHairGroup = new THREE.Group();
        this.riderHairGroup.position.set(0, 0.15, -0.04);

        const hairCapGeo = new THREE.SphereGeometry(0.3, 16, 12);
        hairCapGeo.scale(0.95, 0.9, 1);
        const hairCap = new THREE.Mesh(hairCapGeo, this.matHairBeard);
        this.riderHairGroup.add(hairCap);

        // Hair tufts / spikes on top and sides
        const tuftGeo = new THREE.ConeGeometry(0.09, 0.22, 6);
        const tuftOffsets = [
            [-0.14, 0.25, 0.08, 0.3, -0.4],
            [0, 0.28, 0.12, 0.2, 0],
            [0.14, 0.25, 0.08, 0.3, 0.4],
            [-0.2, 0.12, -0.1, 0, -0.8],
            [0.2, 0.12, -0.1, 0, 0.8],
            [0, 0.22, -0.22, -0.6, 0],
            [-0.12, 0.26, -0.12, -0.4, -0.3],
            [0.12, 0.26, -0.12, -0.4, 0.3]
        ];

        tuftOffsets.forEach(([tx, ty, tz, rx, rz]) => {
            const tuft = new THREE.Mesh(tuftGeo, this.matHairBeard);
            tuft.position.set(tx, ty, tz);
            tuft.rotation.x = rx;
            tuft.rotation.z = rz;
            this.riderHairGroup.add(tuft);
        });

        this.riderHeadGroup.add(this.riderHairGroup);
        this.riderTorso.add(this.riderHeadGroup);

        // RIDER ARMS & HANDS (Clutching the goat horns)
        this.riderLeftArm = this.createRiderArm(-1);
        this.riderRightArm = this.createRiderArm(1);
        this.riderTorso.add(this.riderLeftArm.root);
        this.riderTorso.add(this.riderRightArm.root);

        // RIDER LEGS & SNEAKERS (Straddling goat flanks in blue jeans)
        this.riderLeftLeg = this.createRiderLeg(-1);
        this.riderRightLeg = this.createRiderLeg(1);
        this.riderGroup.add(this.riderLeftLeg.root);
        this.riderGroup.add(this.riderRightLeg.root);
    }

    createRiderArm(side) {
        const root = new THREE.Group();
        root.position.set(side * 0.34, 0.18, 0.05);

        // Upper Arm (Red sleeve)
        const upperArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.36, 10);
        upperArmGeo.translate(0, -0.16, 0);
        const upperArmMesh = new THREE.Mesh(upperArmGeo, this.matHoodie);
        upperArmMesh.castShadow = true;
        root.add(upperArmMesh);

        // Forearm extending forward towards the goat horns
        const foreArmGroup = new THREE.Group();
        foreArmGroup.position.set(0, -0.3, 0);

        const foreArmGeo = new THREE.CylinderGeometry(0.075, 0.07, 0.34, 10);
        foreArmGeo.translate(0, -0.15, 0);
        const foreArmMesh = new THREE.Mesh(foreArmGeo, this.matHoodie);
        foreArmMesh.castShadow = true;
        foreArmGroup.add(foreArmMesh);

        // Hand clutching horn
        const handGeo = new THREE.SphereGeometry(0.08, 10, 8);
        handGeo.scale(1, 0.9, 1.2);
        const handMesh = new THREE.Mesh(handGeo, this.matSkin);
        handMesh.position.set(0, -0.32, 0.04);
        foreArmGroup.add(handMesh);

        root.add(foreArmGroup);

        // Initial pose holding horns
        root.rotation.x = 0.85;
        root.rotation.z = side * -0.28;
        foreArmGroup.rotation.x = -0.45;

        return { root, upper: upperArmMesh, foreArm: foreArmGroup, side };
    }

    createRiderLeg(side) {
        const root = new THREE.Group();
        root.position.set(side * 0.28, 0.2, -0.05);

        // Thigh in Blue Jeans
        const thighGeo = new THREE.CylinderGeometry(0.14, 0.12, 0.38, 10);
        thighGeo.translate(0, -0.18, 0);
        const thighMesh = new THREE.Mesh(thighGeo, this.matDenim);
        thighMesh.castShadow = true;
        root.add(thighMesh);

        // Shin / Lower Leg
        const shinGroup = new THREE.Group();
        shinGroup.position.set(0, -0.34, 0);

        const shinGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.34, 10);
        shinGeo.translate(0, -0.16, 0);
        const shinMesh = new THREE.Mesh(shinGeo, this.matDenim);
        shinMesh.castShadow = true;
        shinGroup.add(shinMesh);

        // Sneaker (Brown skater shoe with thick white rubber sole)
        const shoeGroup = new THREE.Group();
        shoeGroup.position.set(0, -0.32, 0.08);

        const shoeUpperGeo = new THREE.BoxGeometry(0.18, 0.14, 0.32);
        shoeUpperGeo.translate(0, 0.04, 0.04);
        const shoeUpper = new THREE.Mesh(shoeUpperGeo, this.matShoe);
        shoeUpper.castShadow = true;
        shoeGroup.add(shoeUpper);

        const soleGeo = new THREE.BoxGeometry(0.2, 0.06, 0.34);
        soleGeo.translate(0, -0.05, 0.04);
        const sole = new THREE.Mesh(soleGeo, this.matShoeSole);
        sole.castShadow = true;
        shoeGroup.add(sole);

        shinGroup.add(shoeGroup);
        root.add(shinGroup);

        // Riding astride stance
        root.rotation.z = side * -0.65;
        root.rotation.x = 0.65;
        shinGroup.rotation.x = -1.15;

        return { root, thigh: thighMesh, shin: shinGroup, shoe: shoeGroup, side };
    }

    // --- 3. MAJESTIC GLIDER WINGS ---
    buildGliderWings() {
        this.wingsContainer = new THREE.Group();
        this.wingsContainer.position.set(0, 0.95, -0.08);
        this.characterGroup.add(this.wingsContainer);

        // Left & Right Wings
        this.leftWingGroup = this.createFeatheredWing(-1);
        this.rightWingGroup = this.createFeatheredWing(1);

        this.wingsContainer.add(this.leftWingGroup);
        this.wingsContainer.add(this.rightWingGroup);

        // Initial state: hidden/folded
        this.wingsContainer.scale.set(0.001, 0.001, 0.001);
        this.wingsContainer.visible = false;
    }

    createFeatheredWing(side) {
        const wingRoot = new THREE.Group();
        wingRoot.position.set(side * 0.22, 0, 0);

        // Wing Bone / Spar
        const sparCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(side * 0.9, 0.25, -0.1),
            new THREE.Vector3(side * 1.8, 0.1, -0.3),
            new THREE.Vector3(side * 2.3, -0.2, -0.55)
        ]);
        const sparGeo = new THREE.TubeGeometry(sparCurve, 16, 0.045, 8, false);
        const sparMesh = new THREE.Mesh(sparGeo, this.matGoatHorn);
        wingRoot.add(sparMesh);

        // Multi-feather layered aerodynamic wingspan
        const featherShape = new THREE.Shape();
        featherShape.moveTo(0, 0);
        featherShape.quadraticCurveTo(side * 1.2, 0.35, side * 2.3, -0.2);
        featherShape.quadraticCurveTo(side * 2.1, -0.65, side * 1.6, -0.85);
        featherShape.quadraticCurveTo(side * 1.0, -0.7, side * 0.4, -0.6);
        featherShape.quadraticCurveTo(side * 0.1, -0.4, 0, 0);
        featherShape.closePath();

        const wingGeo = new THREE.ShapeGeometry(featherShape, 12);
        const wingMesh = new THREE.Mesh(wingGeo, this.matFeatherWing);
        wingMesh.castShadow = true;
        wingRoot.add(wingMesh);

        // Secondary inner feather layer for visual depth
        const innerShape = new THREE.Shape();
        innerShape.moveTo(0, 0);
        innerShape.quadraticCurveTo(side * 0.9, 0.2, side * 1.6, -0.15);
        innerShape.quadraticCurveTo(side * 1.3, -0.5, side * 0.8, -0.55);
        innerShape.quadraticCurveTo(side * 0.2, -0.35, 0, 0);
        innerShape.closePath();

        const innerGeo = new THREE.ShapeGeometry(innerShape, 8);
        const innerMesh = new THREE.Mesh(innerGeo, this.matFeatherWing);
        innerMesh.position.set(0, 0.02, 0.02);
        wingRoot.add(innerMesh);

        return wingRoot;
    }

    // ==========================================
    // UNDERBELLY FIRE ROCKET THRUSTER & FLAME JETS
    // ==========================================
    initThrusterFireEffects() {
        this.thrusterGroup = new THREE.Group();
        this.thrusterGroup.position.set(0, 0.42, -0.1);
        this.goatGroup.add(this.thrusterGroup);

        // Twin metallic exhaust nozzles mounted under the belly
        const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.13, 0.22, 12);
        nozzleGeo.rotateX(Math.PI / 8);

        this.leftNozzle = new THREE.Mesh(nozzleGeo, this.matThrusterNozzle);
        this.leftNozzle.position.set(-0.18, 0, 0);
        this.rightNozzle = new THREE.Mesh(nozzleGeo, this.matThrusterNozzle);
        this.rightNozzle.position.set(0.18, 0, 0);

        this.thrusterGroup.add(this.leftNozzle);
        this.thrusterGroup.add(this.rightNozzle);

        // Dynamic Animated Flame Cones
        // Inner Core: White-hot blaze
        const coreFlameGeo = new THREE.ConeGeometry(0.14, 0.8, 10);
        coreFlameGeo.rotateX(-Math.PI / 1.15);
        coreFlameGeo.translate(0, -0.38, -0.12);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        // Mid Flame: Intense fiery yellow-orange
        const midFlameGeo = new THREE.ConeGeometry(0.24, 1.25, 12);
        midFlameGeo.rotateX(-Math.PI / 1.15);
        midFlameGeo.translate(0, -0.55, -0.16);
        const midMat = new THREE.MeshBasicMaterial({
            color: 0xff8800,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        // Outer Flame: Fiery crimson flicker
        const outerFlameGeo = new THREE.ConeGeometry(0.34, 1.6, 12);
        outerFlameGeo.rotateX(-Math.PI / 1.15);
        outerFlameGeo.translate(0, -0.7, -0.2);
        const outerMat = new THREE.MeshBasicMaterial({
            color: 0xff2200,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.flameLeftCore = new THREE.Mesh(coreFlameGeo, coreMat);
        this.flameLeftMid = new THREE.Mesh(midFlameGeo, midMat);
        this.flameLeftOuter = new THREE.Mesh(outerFlameGeo, outerMat);

        this.flameRightCore = this.flameLeftCore.clone();
        this.flameRightMid = this.flameLeftMid.clone();
        this.flameRightOuter = this.flameLeftOuter.clone();

        this.leftNozzle.add(this.flameLeftCore);
        this.leftNozzle.add(this.flameLeftMid);
        this.leftNozzle.add(this.flameLeftOuter);

        this.rightNozzle.add(this.flameRightCore);
        this.rightNozzle.add(this.flameRightMid);
        this.rightNozzle.add(this.flameRightOuter);

        // Dynamic PointLight casting warm fiery glow on goat belly & floor
        this.thrusterLight = new THREE.PointLight(0xff6600, 0, 14);
        this.thrusterLight.position.set(0, -0.3, 0);
        this.thrusterGroup.add(this.thrusterLight);

        // Particle System for trailing fire sparks & smoke embers
        this.initFireParticles();

        // Default: hidden until thrust is activated
        this.setFlameVisibility(false);
    }

    initFireParticles() {
        this.particleCount = 50;
        this.particles = [];
        this.particleGeo = new THREE.SphereGeometry(0.065, 6, 6);

        this.particleMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);

        for (let i = 0; i < this.particleCount; i++) {
            const p = new THREE.Mesh(this.particleGeo, this.particleMat.clone());
            p.visible = false;
            this.particleGroup.add(p);
            this.particles.push({
                mesh: p,
                active: false,
                life: 0,
                maxLife: 0.4 + Math.random() * 0.3,
                vel: new THREE.Vector3()
            });
        }
    }

    setFlameVisibility(visible) {
        this.flameLeftCore.visible = visible;
        this.flameLeftMid.visible = visible;
        this.flameLeftOuter.visible = visible;
        this.flameRightCore.visible = visible;
        this.flameRightMid.visible = visible;
        this.flameRightOuter.visible = visible;
    }

    spawnFireParticle(origin, direction) {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (!p.active) {
                p.active = true;
                p.life = 0;
                p.maxLife = 0.28 + Math.random() * 0.25;
                p.mesh.visible = true;
                p.mesh.position.copy(origin);
                p.mesh.position.x += (Math.random() - 0.5) * 0.3;
                p.mesh.position.y += (Math.random() - 0.5) * 0.15;
                p.mesh.position.z += (Math.random() - 0.5) * 0.3;

                // Fire streams downward and backward
                p.vel.set(
                    (Math.random() - 0.5) * 5,
                    -12 - Math.random() * 10,
                    (Math.random() - 0.5) * 5
                );
                p.vel.addScaledVector(direction, -18);

                p.mesh.scale.setScalar(0.7 + Math.random() * 0.8);
                break;
            }
        }
    }

    updateFireParticles(dt) {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            if (p.active) {
                p.life += dt;
                const progress = p.life / p.maxLife;
                if (progress >= 1.0) {
                    p.active = false;
                    p.mesh.visible = false;
                    continue;
                }

                // Physics movement
                p.mesh.position.addScaledVector(p.vel, dt);
                p.vel.y += 18 * dt; // Fire rises due to buoyancy
                p.vel.x += (Math.random() - 0.5) * 2;

                // Color shifts: White/Yellow -> Orange -> Deep Red/Smoke
                if (progress < 0.25) {
                    p.mesh.material.color.setHex(0xffffff);
                } else if (progress < 0.6) {
                    p.mesh.material.color.setHex(0xff9900);
                } else {
                    p.mesh.material.color.setHex(0xdc2626);
                }

                p.mesh.material.opacity = (1.0 - progress) * 0.9;
                p.mesh.scale.setScalar((1.0 + progress * 1.5) * (1.0 - progress));
            }
        }
    }

    // ==========================================
    // MAIN UPDATE LOOP
    // ==========================================
    update(dt, input, cameraAngle, world) {
        // Cooldowns
        if (this.dashCooldown > 0) {
            this.dashCooldown -= dt;
        }

        // Coyote Time & Jump Buffer
        if (this.isGrounded) {
            this.coyoteTimer = 0.16;
            this.canDoubleJump = true;
        } else {
            this.coyoteTimer -= dt;
        }

        if (input.jumpJustPressed) {
            this.jumpBufferTimer = 0.16;
        } else {
            this.jumpBufferTimer -= dt;
        }

        // Process Dash Input -> Blazing Fire Boost!
        if (input.dashJustPressed && this.dashCooldown <= 0 && !this.isDashing) {
            this.startDash();
        }

        // Dash State Active
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
            this.velocity.y = -36;
            if (window.audioManager) window.audioManager.playDash();
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
            moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngle);
        }

        // Check Gliding (Holding jump mid-air while descending)
        if (input.jump && !this.isGrounded && this.velocity.y < 1.0 && !this.isGroundPounding) {
            if (!this.isGliding) {
                this.isGliding = true;
                if (window.audioManager) window.audioManager.playGliderDeploy();
            }
        } else {
            this.isGliding = false;
        }

        // Determine current target ground speed
        let maxSpeed = this.walkSpeed;
        this.isSprinting = input.sprint && this.isGrounded && isMoving;
        if (this.isSprinting) maxSpeed = this.sprintSpeed;
        if (this.isGliding) maxSpeed = this.glideSpeed;

        // Apply Horizontal Acceleration
        if (!this.isDashing && !this.isGroundPounding) {
            const accel = this.isGrounded ? 46 : 20;
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
                if (window.audioManager) window.audioManager.playJump();
                if (world) world.spawnJumpRing(this.position);
            } else if (this.canDoubleJump && !this.isGroundPounding) {
                // Double Jump (Goat mid-air kick & bleat!)
                this.velocity.y = this.doubleJumpForce;
                this.jumpBufferTimer = 0;
                this.canDoubleJump = false;
                this.isGliding = false;
                if (window.audioManager) {
                    window.audioManager.playDoubleJump();
                    window.audioManager.playGoatBleat(0.04);
                }
                if (world) world.spawnDoubleJumpBurst(this.position);
            }
        }

        // Vertical Gravity & Gliding Physics
        if (!this.isGrounded) {
            let currentGravity = this.gravity;
            if (this.isGliding) {
                currentGravity = this.glideGravity;
                if (this.velocity.y < -this.maxGlideFallSpeed) {
                    this.velocity.y += (-this.maxGlideFallSpeed - this.velocity.y) * Math.min(8 * dt, 1.0);
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

        // Fall into void respawn check
        if (this.position.y < -35) {
            this.respawn();
        }

        // Update root position
        this.root.position.copy(this.position);

        // Smooth rotation towards travel direction
        let diff = this.targetRotation - this.rotation;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotation += diff * Math.min(14 * dt, 1.0);
        this.meshContainer.rotation.y = this.rotation;

        // Procedural Animations & Effects
        this.animate(dt, isMoving);

        // Particle fire update
        this.updateFireParticles(dt);

        // Sound modulation
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (window.audioManager && window.audioManager.updateWind) {
            window.audioManager.updateWind(currentSpeed, this.isGliding);
        }
    }

    startDash() {
        this.isDashing = true;
        this.dashTimer = 0.32;
        this.dashCooldown = this.dashMaxCooldown;
        this.isGliding = false;

        const forward = new THREE.Vector3(Math.sin(this.targetRotation), 0, Math.cos(this.targetRotation)).normalize();
        this.velocity.x = forward.x * this.dashSpeed;
        this.velocity.z = forward.z * this.dashSpeed;
        this.velocity.y = Math.max(this.velocity.y, 6.5); // Lift into the air with rocket fire!

        if (window.audioManager) window.audioManager.playDash();
    }

    // ==========================================
    // PROCEDURAL ANIMATIONS & DYNAMICS
    // ==========================================
    animate(dt, isMoving) {
        this.animTime += dt;
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);

        // --- 1. FIRE PROPULSION / THRUSTER SIMULATION ---
        const isFireThrusting = this.isDashing;
        const targetThruster = isFireThrusting ? 1.0 : 0.0;
        this.thrusterFireIntensity += (targetThruster - this.thrusterFireIntensity) * Math.min(20 * dt, 1.0);

        if (this.thrusterFireIntensity > 0.05) {
            this.setFlameVisibility(true);
            const flicker = 1.0 + (Math.random() - 0.5) * 0.35;
            const boostScale = isFireThrusting ? (2.2 * flicker) : (1.0 * flicker);

            // Jitter flame geometry
            this.flameLeftCore.scale.set(1.1 * flicker, boostScale, 1.1 * flicker);
            this.flameRightCore.scale.set(1.1 * flicker, boostScale, 1.1 * flicker);
            this.flameLeftMid.scale.set(1.2 * flicker, boostScale * 1.1, 1.2 * flicker);
            this.flameRightMid.scale.set(1.2 * flicker, boostScale * 1.1, 1.2 * flicker);
            this.flameLeftOuter.scale.set(1.3 * flicker, boostScale * 1.2, 1.3 * flicker);
            this.flameRightOuter.scale.set(1.3 * flicker, boostScale * 1.2, 1.3 * flicker);

            // Dynamic flame lighting underneath
            this.thrusterLight.intensity = this.thrusterFireIntensity * (4.5 + Math.random() * 2.0);

            // Emit sparks and trailing flame embers
            const nozzleWorldPos = new THREE.Vector3();
            this.thrusterGroup.getWorldPosition(nozzleWorldPos);
            const forward = new THREE.Vector3(Math.sin(this.rotation), 0, Math.cos(this.rotation));
            for (let k = 0; k < (isFireThrusting ? 3 : 1); k++) {
                this.spawnFireParticle(nozzleWorldPos, forward);
            }
        } else {
            this.setFlameVisibility(false);
            this.thrusterLight.intensity = 0;
        }

        // --- 2. GLIDER WINGS DEPLOYMENT & FLAPPING MOTION ---
        const targetWingDeploy = this.isGliding ? 1.0 : 0.0;
        this.wingDeployProgress += (targetWingDeploy - this.wingDeployProgress) * Math.min(10 * dt, 1.0);

        if (this.wingDeployProgress > 0.01) {
            this.wingsContainer.visible = true;
            const spread = this.wingDeployProgress;
            this.wingsContainer.scale.set(spread, spread, spread);

            // Flapping wave animation with airflow ripple
            const flapSpeed = 7.5;
            const flapAngle = Math.sin(this.animTime * flapSpeed) * 0.28;
            const wingPitch = 0.15 + Math.cos(this.animTime * flapSpeed) * 0.1;

            this.leftWingGroup.rotation.z = -flapAngle;
            this.rightWingGroup.rotation.z = flapAngle;
            this.leftWingGroup.rotation.y = wingPitch;
            this.rightWingGroup.rotation.y = -wingPitch;
        } else {
            this.wingsContainer.visible = false;
        }

        // --- 3. GOAT TAIL, EARS, TONGUE & BEARD PHYSICS ---
        // Tail wags with high energy
        const tailWag = Math.sin(this.animTime * 14) * 0.35;
        this.goatTailGroup.rotation.y = tailWag;
        this.goatTailGroup.rotation.x = -0.4 + Math.sin(this.animTime * 7) * 0.15;

        // Floppy Ears bounce up and down with movement inertia
        const earBounce = Math.sin(this.animTime * 9) * 0.22 - (speed * 0.015);
        this.goatLeftEar.rotation.z = Math.PI / 2.6 + earBounce;
        this.goatRightEar.rotation.z = -Math.PI / 2.6 - earBounce;

        // Pink Tongue flaps excitedly in the wind!
        const tongueFlap = Math.sin(this.animTime * 18) * 0.3 + (speed * 0.03);
        this.goatTongueGroup.rotation.z = 0.2 + tongueFlap;
        this.goatTongueGroup.rotation.y = Math.cos(this.animTime * 12) * 0.2;

        // Chin Goatee beard swings with velocity
        this.goatBeard.rotation.x = Math.sin(this.animTime * 8) * 0.25 - (this.velocity.y * 0.02);

        // --- 4. GAIT & BODY POSING BY STATE ---

        // A) GLIDING STATE (Streamlined flight pose)
        if (this.isGliding) {
            // Forward flight lean & banking into turns
            this.characterGroup.rotation.x = THREE.MathUtils.lerp(this.characterGroup.rotation.x, 0.45, 10 * dt);
            this.characterGroup.rotation.z = THREE.MathUtils.lerp(this.characterGroup.rotation.z, -this.velocity.x * 0.025, 8 * dt);

            // Legs streamlined backward
            this.frontLeftLeg.root.rotation.x = -0.6;
            this.frontRightLeg.root.rotation.x = -0.6;
            this.rearLeftLeg.root.rotation.x = 0.5;
            this.rearRightLeg.root.rotation.x = 0.5;

            // Rider hugs goat neck aerodynamic
            this.riderTorso.rotation.x = 0.55;
            this.goatHeadGroup.rotation.x = -0.25;
            return;
        }

        // B) FIRE DASH / BOOST STATE (Explosive rocket projectile pose)
        if (this.isDashing) {
            this.characterGroup.rotation.x = 0.7; // Tilted forward like a rocket
            this.characterGroup.rotation.z = 0;

            this.frontLeftLeg.root.rotation.x = -0.8;
            this.frontRightLeg.root.rotation.x = -0.8;
            this.rearLeftLeg.root.rotation.x = 0.7;
            this.rearRightLeg.root.rotation.x = 0.7;

            this.riderTorso.rotation.x = 0.75;
            this.goatHeadGroup.rotation.x = -0.4;
            return;
        }

        // C) AIRBORNE / JUMPING STATE
        if (!this.isGrounded) {
            if (this.isGroundPounding) {
                // Vertical meteor dive
                this.characterGroup.rotation.x = 1.57;
                this.characterGroup.rotation.z = 0;
            } else {
                // Rising / Falling arc
                const airLean = this.velocity.y > 0 ? -0.2 : 0.3;
                this.characterGroup.rotation.x = THREE.MathUtils.lerp(this.characterGroup.rotation.x, airLean, 10 * dt);
                this.characterGroup.rotation.z = THREE.MathUtils.lerp(this.characterGroup.rotation.z, 0, 10 * dt);

                // Legs tucking mid-air (just like in the turnaround!)
                const legTuck = this.velocity.y > 0 ? 0.4 : -0.3;
                this.frontLeftLeg.root.rotation.x = THREE.MathUtils.lerp(this.frontLeftLeg.root.rotation.x, legTuck, 12 * dt);
                this.frontRightLeg.root.rotation.x = THREE.MathUtils.lerp(this.frontRightLeg.root.rotation.x, legTuck + 0.1, 12 * dt);
                this.rearLeftLeg.root.rotation.x = THREE.MathUtils.lerp(this.rearLeftLeg.root.rotation.x, -legTuck, 12 * dt);
                this.rearRightLeg.root.rotation.x = THREE.MathUtils.lerp(this.rearRightLeg.root.rotation.x, -legTuck - 0.1, 12 * dt);
            }
            return;
        }

        // D) GROUND RUNNING / GALLOPING STATE
        // Reset X/Z character tilt
        this.characterGroup.rotation.x = THREE.MathUtils.lerp(this.characterGroup.rotation.x, 0, 12 * dt);
        this.characterGroup.rotation.z = THREE.MathUtils.lerp(this.characterGroup.rotation.z, 0, 12 * dt);

        if (isMoving && speed > 0.4) {
            // Dynamic 4-beat bounding gallop cycle
            const gallopRate = this.isSprinting ? 22 : 14;
            const phase = this.animTime * gallopRate;
            const strideAmp = this.isSprinting ? 0.85 : 0.55;

            // Front legs swing alternately
            this.frontLeftLeg.root.rotation.x = Math.sin(phase) * strideAmp;
            this.frontRightLeg.root.rotation.x = Math.sin(phase + Math.PI) * strideAmp;
            this.frontLeftLeg.lower.rotation.x = Math.max(0, -Math.sin(phase)) * 0.8;
            this.frontRightLeg.lower.rotation.x = Math.max(0, -Math.sin(phase + Math.PI)) * 0.8;

            // Rear legs swing with phase offset
            this.rearLeftLeg.root.rotation.x = Math.sin(phase + 1.2) * strideAmp;
            this.rearRightLeg.root.rotation.x = Math.sin(phase + Math.PI + 1.2) * strideAmp;
            this.rearLeftLeg.lower.rotation.x = Math.max(0, -Math.sin(phase + 1.2)) * 0.7;
            this.rearRightLeg.lower.rotation.x = Math.max(0, -Math.sin(phase + Math.PI + 1.2)) * 0.7;

            // Goat body bouncing & pitching in gallop rhythm
            this.goatGroup.position.y = Math.abs(Math.sin(phase)) * (this.isSprinting ? 0.12 : 0.07);
            this.goatGroup.rotation.x = Math.sin(phase) * 0.08;

            // Rider bouncing enthusiastically on the saddle
            this.riderGroup.position.y = 0.95 + Math.abs(Math.sin(phase * 1.5)) * 0.06;
            this.riderTorso.rotation.x = 0.25 + Math.sin(phase) * 0.06;
            this.riderHeadGroup.rotation.x = -Math.sin(phase) * 0.08;
        } else {
            // Idle breathing & gentle tongue sway
            const breathe = Math.sin(this.animTime * 3.0) * 0.02;
            this.goatGroup.position.y = breathe;
            this.riderGroup.position.y = 0.95 + breathe * 0.5;

            // Reset leg angles
            this.frontLeftLeg.root.rotation.x = 0;
            this.frontRightLeg.root.rotation.x = 0;
            this.rearLeftLeg.root.rotation.x = 0;
            this.rearRightLeg.root.rotation.x = 0;
            this.frontLeftLeg.lower.rotation.x = 0;
            this.frontRightLeg.lower.rotation.x = 0;
            this.rearLeftLeg.lower.rotation.x = 0;
            this.rearRightLeg.lower.rotation.x = 0;

            this.goatGroup.rotation.x = 0;
            this.riderTorso.rotation.x = 0.22;
        }
    }

    // ==========================================
    // PLATFORM COLLISIONS & RESPAWN
    // ==========================================
    handleCollisions(world, dt) {
        if (!world) return;

        const playerRadius = 0.58;
        const playerHeight = 1.85;
        let onGround = false;

        const platforms = world.platforms;
        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            if (plat.isBarrier && !plat.active) continue;

            const min = plat.min;
            const max = plat.max;

            const overlapX = (this.position.x + playerRadius > min.x) && (this.position.x - playerRadius < max.x);
            const overlapZ = (this.position.z + playerRadius > min.z) && (this.position.z - playerRadius < max.z);
            const overlapY = (this.position.y < max.y) && (this.position.y + playerHeight > min.y);

            if (overlapX && overlapZ && overlapY) {
                if (plat.isBarrier) {
                    const penLeft = (this.position.x + playerRadius) - min.x;
                    const penRight = max.x - (this.position.x - playerRadius);
                    const penBack = (this.position.z + playerRadius) - min.z;
                    const penFront = max.z - (this.position.z - playerRadius);

                    const minPen = Math.min(penLeft, penRight, penBack, penFront);
                    if (minPen === penLeft) {
                        this.position.x = min.x - playerRadius;
                        this.velocity.x = Math.min(this.velocity.x, 0);
                    } else if (minPen === penRight) {
                        this.position.x = max.x + playerRadius;
                        this.velocity.x = Math.max(this.velocity.x, 0);
                    } else if (minPen === penBack) {
                        this.position.z = min.z - playerRadius;
                        this.velocity.z = Math.min(this.velocity.z, 0);
                    } else {
                        this.position.z = max.z + playerRadius;
                        this.velocity.z = Math.max(this.velocity.z, 0);
                    }
                    continue;
                }

                // Landing on platform top
                const topY = max.y;
                if (this.position.y >= topY - 0.48 && this.velocity.y <= 0.5) {
                    this.position.y = topY;
                    this.velocity.y = 0;
                    onGround = true;

                    if (!plat.isMoving) {
                        this.checkpoint.set(this.position.x, topY + 0.1, this.position.z);
                    }

                    if (this.isGroundPounding) {
                        this.isGroundPounding = false;
                        if (window.audioManager) {
                            window.audioManager.playGroundPound();
                            window.audioManager.playGoatBleat();
                        }
                        world.spawnGroundPoundShockwave(this.position);
                    }

                    if (plat.deltaPos) {
                        this.position.add(plat.deltaPos);
                    }
                } else if (this.position.y < topY - 0.48 && this.position.y + playerHeight > min.y + 0.2) {
                    // Push out horizontally from platform walls
                    const penX1 = (this.position.x + playerRadius) - min.x;
                    const penX2 = max.x - (this.position.x - playerRadius);
                    const penZ1 = (this.position.z + playerRadius) - min.z;
                    const penZ2 = max.z - (this.position.z - playerRadius);
                    const minPen = Math.min(penX1, penX2, penZ1, penZ2);
                    if (minPen < 0.6) {
                        if (minPen === penX1) this.position.x = min.x - playerRadius;
                        else if (minPen === penX2) this.position.x = max.x + playerRadius;
                        else if (minPen === penZ1) this.position.z = min.z - playerRadius;
                        else this.position.z = max.z + playerRadius;
                    }
                }
            }
        }

        this.isGrounded = onGround;
    }

    respawn() {
        this.position.copy(this.checkpoint);
        this.velocity.set(0, 0, 0);
        this.rotation = Math.PI;
        this.targetRotation = Math.PI;
        if (this.meshContainer) this.meshContainer.rotation.y = Math.PI;
        this.isGliding = false;
        this.isDashing = false;
        this.isGroundPounding = false;
        if (window.audioManager) window.audioManager.playRespawn();
    }
}
