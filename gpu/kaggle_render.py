"""Runs on a free Kaggle GPU: installs Blender as a Python module (bpy), pulls the repo's real-district data and AI textures
from GitHub, and path-traces photoreal stills and a short drive-through video. Always exits 0 and writes run.log so the
GitHub workflow can commit whatever was produced."""
import glob, os, shutil, subprocess, sys, time, traceback, urllib.request

OUT = "/kaggle/working"; WORK = "/tmp/work"; RAW = "https://raw.githubusercontent.com/earthwildway2-gif/zahma/main/"
os.makedirs(OUT, exist_ok=True); os.makedirs(WORK + "/tex", exist_ok=True); os.makedirs(WORK + "/data", exist_ok=True)
LOG = open(OUT + "/run.log", "a")
def log(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); LOG.write(s + "\n"); LOG.flush()
def sh(cmd, check=True, tail=2500):
    log("$", cmd); r = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True); log(r.stdout[-tail:])
    if check and r.returncode: raise RuntimeError(f"command failed ({r.returncode}): {cmd}")
    return r
def fetch(rel, dest): urllib.request.urlretrieve(RAW + rel, dest)

t0 = time.time()
try:
    sh("nvidia-smi -L", check=False)
    sh("pip -q install uv")
    sh("uv python install 3.11"); sh("uv venv --python 3.11 /tmp/venv"); sh("uv pip install --python /tmp/venv/bin/python bpy")
    sh("apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq libxi6 libxrender1 libgl1 libsm6 libxkbcommon0 libxxf86vm1 libxfixes3 libegl1 ffmpeg", check=False)
    fetch("data/districts.json", WORK + "/data/districts.json"); fetch("gpu/render_scene.py", WORK + "/render_scene.py")
    for k in ("facade_imbaba_brick", "facade_imbaba_paint", "facade_downtown", "facade_haram"): fetch(f"assets/textures/{k}.jpg", f"{WORK}/tex/{k}.jpg")
    log(f"setup done in {time.time() - t0:.0f}s")
    base = f"/tmp/venv/bin/python {WORK}/render_scene.py --data {WORK}/data/districts.json --tex {WORK}/tex --device GPU"
    for d in (0, 1, 2):
        try: sh(f"{base} --district {d} --out {OUT} --res 1920x1080 --samples 96 --stills 3", tail=1500)
        except Exception: log(traceback.format_exc())
    try:
        sh(f"{base} --district 0 --out {WORK}/vid --res 1280x720 --samples 40 --stills 0 --video-frames 120", tail=1500)
        ff = shutil.which("ffmpeg")
        if not ff:
            sh("pip -q install imageio-ffmpeg"); import imageio_ffmpeg; ff = imageio_ffmpeg.get_ffmpeg_exe()
        sh(f"{ff} -y -framerate 24 -i {WORK}/vid/frames/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 20 {OUT}/imbaba_drive.mp4")
    except Exception: log(traceback.format_exc())
except Exception:
    log(traceback.format_exc())
log(f"finished in {time.time() - t0:.0f}s; files:", sorted(os.listdir(OUT)))
