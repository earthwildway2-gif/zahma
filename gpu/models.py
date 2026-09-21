"""Free Kaggle GPU: generate reference photos of Egyptian vehicles with SDXL, then turn them into 3D models (GLB) with TripoSR."""
import subprocess, sys, os, traceback
OUT = "/kaggle/working"; LOG = open(f"{OUT}/log.txt", "w")
def log(*a):
    s = " ".join(str(x) for x in a); print(s, flush=True); LOG.write(s + "\n"); LOG.flush()
def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True); log("$", cmd, "->", r.returncode); log(r.stdout[-1500:], r.stderr[-1500:]); return r.returncode
try:
    sh(f"{sys.executable} -m pip install -q diffusers transformers accelerate safetensors")
    import torch
    from diffusers import StableDiffusionXLPipeline
    assert torch.cuda.is_available(), "no GPU"
    log("GPU:", torch.cuda.get_device_name(0))
    pipe = StableDiffusionXLPipeline.from_pretrained("stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16", use_safetensors=True).to("cuda")
    JOBS = {
        "tuktuk":  "a yellow and blue Egyptian auto rickshaw tuk-tuk, three-quarter front view, studio product photo, plain white background, centered, full vehicle visible, photorealistic",
        "microbus": "a white Egyptian microbus minibus, three-quarter front view, studio product photo, plain white background, centered, full vehicle visible, photorealistic",
        "taxi":     "a black and white Cairo taxi car, three-quarter front view, studio product photo, plain white background, centered, full vehicle visible, photorealistic",
        "kiosk":    "an Egyptian street kiosk stall with a striped awning, three-quarter view, studio product photo, plain white background, centered, photorealistic",
    }
    os.makedirs(f"{OUT}/ref", exist_ok=True)
    for k, p in JOBS.items():
        g = torch.Generator("cuda").manual_seed(7)
        pipe(p, negative_prompt="text, watermark, people, multiple vehicles, blur, cartoon", num_inference_steps=30, guidance_scale=7, width=1024, height=1024, generator=g).images[0].save(f"{OUT}/ref/{k}.png")
        log("ref done", k)
    del pipe; torch.cuda.empty_cache()

    sh("git clone -q https://github.com/VAST-AI-Research/TripoSR /kaggle/working/TripoSR")
    sh(f"{sys.executable} -m pip install -q omegaconf einops trimesh rembg onnxruntime xatlas moderngl 'imageio[ffmpeg]' huggingface_hub")
    # torchmcubes needs a CUDA build that fails on Kaggle: use a small scikit-image based drop-in instead
    open("/kaggle/working/TripoSR/torchmcubes.py", "w").write(
        "import numpy as np, torch\nfrom skimage import measure\n"
        "def marching_cubes(vol, thresh):\n"
        "    v = vol.detach().float().cpu().numpy()\n"
        "    verts, faces, _, _ = measure.marching_cubes(v, level=float(thresh))\n"
        "    verts = np.ascontiguousarray(verts[:, ::-1]); faces = np.ascontiguousarray(faces[:, [0, 2, 1]])\n"
        "    return torch.from_numpy(verts.astype(np.float32)), torch.from_numpy(faces.astype(np.int64))\n")
    sys.path.insert(0, "/kaggle/working/TripoSR")
    import numpy as np, rembg
    from PIL import Image
    from tsr.system import TSR
    from tsr.utils import remove_background, resize_foreground
    model = TSR.from_pretrained("stabilityai/TripoSR", config_name="config.yaml", weight_name="model.ckpt")
    model.renderer.set_chunk_size(8192); model.to("cuda")
    sess = rembg.new_session(); os.makedirs(f"{OUT}/models", exist_ok=True)
    for k in JOBS:
        try:
            img = remove_background(Image.open(f"{OUT}/ref/{k}.png"), sess); img = resize_foreground(img, 0.85)
            a = np.array(img).astype(np.float32) / 255.0; a = a[:, :, :3] * a[:, :, 3:4] + (1 - a[:, :, 3:4]) * 0.5
            img = Image.fromarray((a * 255).astype(np.uint8))
            with torch.no_grad(): codes = model([img], device="cuda")
            mesh = model.extract_mesh(codes, True, resolution=256)[0]
            mesh.export(f"{OUT}/models/{k}.glb"); log("model done", k, len(mesh.vertices), "verts")
        except Exception:
            log("model FAILED", k, traceback.format_exc()[-800:])
    for k in JOBS: Image.open(f"{OUT}/ref/{k}.png").resize((384, 384)).save(f"{OUT}/ref_{k}.jpg")
except Exception:
    log("FATAL", traceback.format_exc()[-2000:])
log("ALL DONE")
