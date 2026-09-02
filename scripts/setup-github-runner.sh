#!/usr/bin/env bash
# GitHub self-hosted runner — admin-panel
#
#   bash scripts/setup-github-runner.sh \
#     https://github.com/Akaikumogo/admin-panel.git elektro-admin TOKEN
set -euo pipefail

REPO_URL="${1:?Repo URL kerak}"
RUNNER_LABEL="${2:?Label kerak: elektro-admin}"
RUNNER_TOKEN="${3:?GitHub runner token kerak}"

RUNNER_DIR="${HOME}/actions-runner-${RUNNER_LABEL}"
RUNNER_VERSION="${RUNNER_VERSION:-2.323.0}"

echo "==> Runner: $RUNNER_DIR"
echo "==> Repo  : $REPO_URL"
echo "==> Label : $RUNNER_LABEL"

mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

if [ ! -f ./config.sh ]; then
  curl -sL -o actions-runner.tar.gz \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf actions-runner.tar.gz
  rm actions-runner.tar.gz
fi

./config.sh \
  --url "$REPO_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$(hostname)-${RUNNER_LABEL}" \
  --labels "$RUNNER_LABEL" \
  --unattended \
  --replace

sudo ./svc.sh install
sudo ./svc.sh start

echo "Runner online bo'lishi kerak: GitHub → Actions → Runners"
