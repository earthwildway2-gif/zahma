"""Free Kaggle GPU job: AI-generated environment textures (SDXL) and sound effects (AudioLDM2) for the shooter.
Every item is generated inside try/except so one failure does not lose the rest. Outputs + run.log go to /kaggle/working."""
import gc, os, subprocess, sys, time, traceback
OUT = "/kaggle/working"; os.makedirs(OUT, exist_ok=True); LOG = open(OUT + "/run.log", "a")
def log(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); LOG.write(s + "\n"); LOG.flush()
def sh(c):
    r = subprocess.run(c, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True); log("$", c, "->", r.returncode, r.stdout[-400:]); return r
t0 = time.time()
try:
    sh(f"{sys.executable} -m pip -q install diffusers transformers accelerate safetensors scipy imageio-ffmpeg soundfile")
    import numpy as np, torch
    import imageio_ffmpeg; FF = imageio_ffmpeg.get_ffmpeg_exe(); log("ffmpeg", FF, "| GPU", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "NONE")
    # ---------------- textures ----------------
    from diffusers import StableDiffusionXLPipeline
    pipe = StableDiffusionXLPipeline.from_pretrained("stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16", use_safetensors=True).to("cuda")
    def tileable(on):
        for net in (pipe.unet, pipe.vae):
            for m in net.modules():
                if isinstance(m, torch.nn.Conv2d): m.padding_mode = "circular" if on else "zeros"
    NEG = "text, watermark, logo, people, blur, cartoon, painting, perspective"
    TEX = {
        "ground_wet": ("seamless tileable texture, top-down photograph of wet dark asphalt at night with puddles, cracks and oil stains, industrial yard, photorealistic", 1024, 1024, True),
        "concrete_wall": ("seamless tileable texture, weathered concrete perimeter wall with stains and rain streaks, photorealistic", 1024, 1024, True),
        "metal_panel": ("seamless tileable texture, light grey painted corrugated steel shipping container panel with scratches and rust, photorealistic", 1024, 1024, True),
        "wood_crate": ("seamless tileable texture, old wooden shipping crate planks with nails and dirt, photorealistic", 1024, 1024, True),
        "warehouse_floor": ("seamless tileable texture, polished concrete warehouse floor with oil stains and tire marks, top-down, photorealistic", 1024, 1024, True),
        "warehouse_wall": ("seamless tileable texture, industrial warehouse wall clad in corrugated metal sheets with rust streaks, photorealistic", 1024, 1024, True),
        "night_sky": ("night sky over the outskirts of a city, heavy storm clouds lit orange by city lights, dramatic, photorealistic, wide panorama", 1024, 512, False),
    }
    for name, (prompt, w, h, tile) in TEX.items():
        try:
            tileable(tile); g = torch.Generator("cuda").manual_seed(77)
            img = pipe(prompt, negative_prompt=NEG, num_inference_steps=30, guidance_scale=6.5, width=w, height=h, generator=g).images[0]
            img.resize((512, 512) if tile else (1024, 512)).save(f"{OUT}/{name}.jpg", quality=88); log("tex ok", name)
        except Exception: log("tex FAIL", name, traceback.format_exc()[-500:])
    del pipe; gc.collect(); torch.cuda.empty_cache()
    # ---------------- sound effects ----------------
    from diffusers import AudioLDM2Pipeline
    import scipy.io.wavfile as wf
    ap = AudioLDM2Pipeline.from_pretrained("cvssp/audioldm2", torch_dtype=torch.float16).to("cuda")
    SFX = {
        "amb_rain": ("heavy rain falling on wet asphalt and metal roofs at night, steady ambient", 10),
        "amb_wind": ("cold night wind blowing across an industrial yard with distant city hum", 10),
        "thunder": ("distant rolling thunder during a rainstorm", 6),
        "step_wet1": ("a single footstep on wet concrete", 1.6), "step_wet2": ("a single boot step on a wet asphalt road", 1.6), "step_wet3": ("one heavy footstep in a puddle", 1.6),
        "step_metal1": ("a single footstep on a metal grating floor", 1.6), "step_metal2": ("one boot step on a steel plate, echo in a warehouse", 1.6),
        "door_roll": ("a heavy metal roller shutter door opening with rumble and clang", 4),
        "gate_slam": ("a heavy steel gate slamming shut with a long echo", 3.5),
        "mag_in": ("a rifle magazine being inserted with a metallic click", 2.0), "bolt": ("a rifle bolt being pulled and released, chambering a round", 2.0),
        "casing1": ("a brass bullet casing dropping and bouncing on concrete", 1.6), "casing2": ("two brass shell casings falling on a concrete floor", 1.8),
        "explosion": ("a large explosion of a burning fuel barrel with debris flying and a rumbling tail", 5),
        "ping1": ("a bullet hitting a metal container and ricocheting with a high pitched whine", 2.0), "ping2": ("a bullet striking a steel plate, metallic ping", 1.8),
        "chip": ("a bullet hitting a concrete wall, chips of stone", 1.6),
        "radio": ("walkie talkie radio static crackle and a short beep", 2.5),
        "heart": ("a human heartbeat thumping slowly, close, muffled", 4),
    }
    for name, (prompt, dur) in SFX.items():
        try:
            g = torch.Generator("cuda").manual_seed(11)
            a = ap(prompt, negative_prompt="low quality, music, speech, voice", num_inference_steps=120, audio_length_in_s=float(dur), generator=g).audios[0]
            a = np.asarray(a, dtype=np.float32); a = a / (np.abs(a).max() + 1e-6) * 0.9
            wf.write(f"/tmp/{name}.wav", 16000, (a * 32767).astype(np.int16))
            sh(f'{FF} -y -i /tmp/{name}.wav -af "afade=t=in:d=0.01,afade=t=out:st={max(0.1, dur - 0.15)}:d=0.15" -ac 1 -b:a 56k {OUT}/{name}.mp3'); log("sfx ok", name)
        except Exception: log("sfx FAIL", name, traceback.format_exc()[-500:])
except Exception:
    log("FATAL", traceback.format_exc())
log(f"finished in {time.time() - t0:.0f}s; files:", sorted(f for f in os.listdir(OUT)))
