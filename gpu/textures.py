"""Runs on a free Kaggle GPU (T4/P100): generates photoreal, seamless Egyptian building/road textures with SDXL.
Output goes to /kaggle/working/*.jpg and is pulled back into the repo by the GitHub workflow."""
import subprocess, sys, os
subprocess.run([sys.executable, "-m", "pip", "install", "-q", "diffusers", "transformers", "accelerate", "safetensors"], check=True)

import torch
from diffusers import StableDiffusionXLPipeline

assert torch.cuda.is_available(), "No GPU attached to this Kaggle kernel"
print("GPU:", torch.cuda.get_device_name(0), flush=True)

pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16", use_safetensors=True
).to("cuda")

# make every convolution wrap around -> the generated images tile seamlessly
for net in (pipe.unet, pipe.vae):
    for m in net.modules():
        if isinstance(m, torch.nn.Conv2d):
            m.padding_mode = "circular"

BASE = ("seamless tileable texture, flat orthographic front view photograph, photorealistic, sharp, high detail, "
        "natural daylight, weathered, dusty, Egypt, ")
JOBS = {
    "facade_imbaba_brick": BASE + "exposed red brick and grey concrete apartment building facade with balconies, window air conditioners, laundry, satellite dishes",
    "facade_imbaba_paint": BASE + "painted beige and ochre concrete apartment building facade, windows with wooden shutters, small balconies, peeling paint",
    "facade_downtown":     BASE + "old Cairo downtown belle epoque stone facade, tall windows, wrought iron balconies, carved cornices, aged limestone",
    "facade_haram":        BASE + "modern Giza residential building facade, cream paint, aluminium windows, glass balconies, clean lines",
    "shopfronts":          BASE + "Egyptian street shop fronts, rolling metal shutters, hand painted signs in Arabic, awnings, ground floor",
    "asphalt":             "seamless tileable texture, top-down photograph of cracked dusty asphalt road, patches, faded paint, Egypt, photorealistic",
    "sidewalk":            "seamless tileable texture, top-down photograph of worn concrete pavement tiles with dust, Egypt, photorealistic",
    "ground_dust":         "seamless tileable texture, top-down photograph of dusty sand and dirt ground with small stones, Egypt, photorealistic",
}
NEG = "text, watermark, logo, people, cars, perspective, sky, blur, cartoon, painting"

os.makedirs("/kaggle/working", exist_ok=True)
for name, prompt in JOBS.items():
    g = torch.Generator("cuda").manual_seed(2026)
    img = pipe(prompt, negative_prompt=NEG, num_inference_steps=30, guidance_scale=6.5, width=1024, height=1024, generator=g).images[0]
    img.resize((512, 512)).save(f"/kaggle/working/{name}.jpg", quality=86)
    print("done", name, flush=True)
print("ALL DONE")
