# 🌌 Aetèria: El Santuari Celeste (Aetheria 3D)

> Un joc d'acció, plataformes 3D i exploració aèria creat amb **WebGL & Three.js**.
> Fetes les físiques cinètiques, planador hologràfic, síntesi d'àudio procedural en temps real i controls tàctils optimitzats per a mòbil.

🎮 **Jugar en línia (GitHub Pages):** [https://workspacenil.github.io/gerard/](https://workspacenil.github.io/gerard/)

---

## 📱 Com jugar des del Mòbil

Pots jugar directament obrint el navegador del teu telèfon (Chrome, Safari, Firefox...):
1. Entra a **[https://workspacenil.github.io/gerard/](https://workspacenil.github.io/gerard/)**
2. Fes clic a **«Començar Aventura 3D»**.
3. **Recomanació:** Posa el mòbil en **horitzontal (apaisat)** per a una millor experiència.

### Controles Tàctils en Pantalla:
* **Joystick Virtual (Costat esquerre):** Arrossega amb el polze esquerre per moure't en qualsevol direcció 3D.
* **Rotació de Càmera 360° (Costat dret):** Llisca el polze dret per la pantalla per girar la càmera lliurement.
* **Botó 🚀 (Salto / Planador):** 
  * Toca una vegada per saltar.
  * Toca dues vegades per a un doble salt acrobàtic amb ona d'energia.
  * **Mantén premut en l'aire** per obrir el **Planador Celeste** i volar suaument.
* **Botó ⚡ (Dash Sònic):** Impuls supersònic cap endavant.
* **Botó 💥 (Ground Pound):** Picat vertical que colpeja el terra amb ona sísmica.

---

## 💻 Controls en Ordinador (PC / Mac)

* **W, A, S, D / Fletxes:** Moure's
* **Ratolí:** Rotació lliure de càmera (fes clic per bloquejar el punter)
* **Shift:** Esprintar
* **Espai:** Saltar / Doble Salt
* **Mantenir Espai en l'aire:** 🪂 Activar Planador Celeste
* **E o Clic Dret:** ⚡ Impuls Dash
* **C o Ctrl:** 💥 Ground Pound (en l'aire)
* **T:** Canviar cicle ambiental en temps real (*Alba, Migdia, Capvespre, Nit Cyberpunk*)
* **M:** Silenciar / Activar àudio
* **R:** Respawn a l'últim punt de control

---

## 🛠️ Execució Local

Si vols córrer el joc localment:
1. Fes doble clic a `start_game.bat` (inicia el servidor local automàticament).
2. O bé executa des del terminal:
   ```bash
   python -m http.server 8000
   ```
   I accedeix a `http://localhost:8000`.

---

## ✨ Característiques Tècniques
* **Renderitzador WebGL / Three.js:** Il·luminació dinàmica, ombres suaus (*PCFSoftShadowMap*), mapatge tonal cinematogràfic (*ACESFilmic*) i textures procedurals en Canvas (sense càrrega d'imatges externes).
* **Motor d'Àudio Web Audio API:** Síntesi en temps real d'acords ambientals, sintetitzador de vent aerodinàmic segons velocitat de vol, i campanetes melòdiques pentatòniques per combo d'orbes.
* **HUD Tàctic:** Radar minimapa en temps real, comptadors d'orbes, velocímetre i detector d'estat de vol.
