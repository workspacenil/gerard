/**
 * AETHERIA - Procedural Web Audio Engine
 * Generates ambient music, dynamic wind, and all sound effects without any external audio files.
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.initialized = false;
        
        // Gains
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.windGain = null;
        this.windFilter = null;
        this.windNode = null;
        
        // Music synthesis state
        this.musicInterval = null;
        this.chordStep = 0;
        this.orbStreak = 0;
        this.lastOrbTime = 0;
        
        // Pentatonic scale frequencies for musical pickups (C Major Pentatonic: C, D, E, G, A, C...)
        this.pentatonic = [
            261.63, 293.66, 329.63, 392.00, 440.00,
            523.25, 587.33, 659.25, 783.99, 880.00,
            1046.50, 1174.66, 1318.51
        ];

        // Ambient chord progressions (frequencies for gentle pad)
        this.chords = [
            [130.81, 164.81, 196.00, 246.94], // Cmaj7
            [110.00, 130.81, 164.81, 220.00], // Am7
            [146.83, 174.61, 220.00, 261.63], // Dm7
            [98.00,  146.83, 196.00, 246.94]  // G7sus
        ];
    }

    init() {
        if (this.initialized) {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            return;
        }

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // SFX Sub-bus
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            // Music Sub-bus
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.initWindSynth();
            this.startAmbientMusic();
            this.initialized = true;
        } catch (e) {
            console.warn("Web Audio API not supported or blocked:", e);
        }
    }

    // Continuous wind synthesizer (aerodynamic speed feedback)
    initWindSynth() {
        if (!this.ctx) return;
        const bufferSize = 2 * this.ctx.sampleRate;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            // Pink-ish filtered noise
            output[i] = (Math.random() * 2 - 1) * 0.4;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        this.windFilter = this.ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
        this.windFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

        this.windGain = this.ctx.createGain();
        this.windGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        whiteNoise.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.sfxGain);

        whiteNoise.start();
        this.windNode = whiteNoise;
    }

    // Dynamic wind modulation based on player speed and gliding state
    updateWind(speed, isGliding) {
        if (!this.ctx || !this.windGain || this.isMuted) return;
        const targetGain = isGliding ? 0.35 + Math.min(speed / 40, 0.4) : Math.min(Math.max((speed - 15) / 50, 0), 0.25);
        const targetFreq = isGliding ? 450 + speed * 15 : 250 + speed * 12;

        const now = this.ctx.currentTime;
        this.windGain.gain.setTargetAtTime(targetGain, now, 0.1);
        this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.1);
    }

    // Ambient generative musical pads
    startAmbientMusic() {
        if (!this.ctx) return;

        const playNextChord = () => {
            if (!this.ctx || this.isMuted) return;
            const now = this.ctx.currentTime;
            const chord = this.chords[this.chordStep % this.chords.length];
            this.chordStep++;

            chord.forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();

                osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
                osc.frequency.setValueAtTime(freq, now);

                // Subtle detune for lush thickness
                osc.detune.setValueAtTime((Math.random() - 0.5) * 8, now);

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(800 + idx * 200, now);

                // Gentle swelling envelope
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(0.08 / chord.length, now + 2.5);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 7.5);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(this.musicGain);

                osc.start(now);
                osc.stop(now + 8.0);
            });

            // Generative twinkle arpeggio
            setTimeout(() => {
                if (!this.isMuted && this.ctx) {
                    this.playAmbientArpeggio();
                }
            }, 3000);
        };

        playNextChord();
        this.musicInterval = setInterval(playNextChord, 8000);
    }

    playAmbientArpeggio() {
        if (!this.ctx || this.isMuted) return;
        const noteCount = 3 + Math.floor(Math.random() * 3);
        const now = this.ctx.currentTime;

        for (let i = 0; i < noteCount; i++) {
            const noteIdx = 4 + Math.floor(Math.random() * 8);
            const freq = this.pentatonic[noteIdx];
            const time = now + i * 0.28;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);

            gain.gain.setValueAtTime(0.0001, time);
            gain.gain.exponentialRampToValueAtTime(0.04, time + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

            osc.connect(gain);
            gain.connect(this.musicGain);

            osc.start(time);
            osc.stop(time + 1.3);
        }
    }

    // Sound Effect: Jump
    playJump() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.16);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    // Sound Effect: Double Jump (brighter with harmonic pop)
    playDoubleJump() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        [320, 640].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);
            osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + idx * 0.04 + 0.18);

            gain.gain.setValueAtTime(0.22, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.24);
        });
    }

    // Sound Effect: Air Dash
    playDash() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Bass sweep
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);

        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.36);
    }

    // Sound Effect: Glider Deploy
    playGliderDeploy() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Sound Effect: Bounce Pad (Spring Launch)
    playBouncePad() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.42);
    }

    // Sound Effect: Speed Ring Boost
    playSpeedRing() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + idx * 0.04;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(t);
            osc.stop(t + 0.26);
        });
    }

    // Sound Effect: Collect Light Orb (Musical combo scale!)
    playOrbCollect() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // Combo check
        if (now - this.lastOrbTime < 2.0) {
            this.orbStreak = Math.min(this.orbStreak + 1, this.pentatonic.length - 1);
        } else {
            this.orbStreak = 2; // base note
        }
        this.lastOrbTime = now;

        const baseFreq = this.pentatonic[this.orbStreak];

        // Two harmonizing crystals
        [baseFreq, baseFreq * 1.5].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + i * 0.03);

            gain.gain.setValueAtTime(0.3 / (i + 1), now + i * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 0.45);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.03);
            osc.stop(now + i * 0.03 + 0.48);
        });
    }

    // Sound Effect: Beacon Activation (Epic celestial chord!)
    playBeaconActivate() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const chord = [220, 277.18, 329.63, 440, 554.37, 659.25];

        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, now);
            filter.frequency.exponentialRampToValueAtTime(2500, now + 1.2);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(0.3 / chord.length, now + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 3.6);
        });
    }

    // Sound Effect: Ground Pound Impact
    playGroundPound() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.48);
    }

    // Footstep tick
    playFootstep() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80 + Math.random() * 40, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.07);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
        }
        return this.isMuted;
    }
}

window.audioManager = new AudioManager();
