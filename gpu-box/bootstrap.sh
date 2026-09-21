#!/usr/bin/env bash
# One-time setup for a rented Ubuntu GPU machine. It turns the machine into a GitHub Actions self-hosted runner,
# so Claude can run builds/renders on it through GitHub (the machine only makes outbound connections).
# Usage:  bash bootstrap.sh <REPO_URL> <RUNNER_REGISTRATION_TOKEN>
set -euo pipefail
REPO_URL="${1:?repo url, e.g. https://github.com/USER/zahma-gpu}"; TOKEN="${2:?runner registration token}"
echo "== GPU / disk check"; nvidia-smi || { echo "!! no NVIDIA driver found: pick a GPU image with drivers"; exit 1; }
df -h / | tail -1; free -g | sed -n 2p; nproc
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y curl git jq unzip build-essential python3 python3-pip xvfb libvulkan1 vulkan-tools \
  clang cmake ninja-build mesa-vulkan-drivers ffmpeg libxcb-xinerama0 libnss3 libasound2t64 2>/dev/null || sudo apt-get install -y curl git jq unzip build-essential python3 python3-pip xvfb libvulkan1 vulkan-tools ffmpeg
mkdir -p "$HOME/actions-runner" && cd "$HOME/actions-runner"
VER="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/^v//')"
curl -fsSL -o runner.tgz "https://github.com/actions/runner/releases/download/v${VER}/actions-runner-linux-x64-${VER}.tar.gz"
tar xzf runner.tgz
./config.sh --unattended --url "$REPO_URL" --token "$TOKEN" --labels gpu,linux --name "zahma-gpu" --replace
sudo ./svc.sh install "$USER"; sudo ./svc.sh start
echo "== Runner installed and started. Tell Claude: done."
