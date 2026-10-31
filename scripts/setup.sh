#!/usr/bin/env bash
# Safe for local and cloud setup: installs tools and generates local code only.
set -euo pipefail

radon_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
radon_bun_version=1.3.5
radon_install_dir=${RADON_BUN_INSTALL_DIR:-"$HOME/.local"}
export PATH="$radon_install_dir/bin:$PATH"

if ! command -v bun >/dev/null 2>&1 || [[ $(bun --version) != "$radon_bun_version" ]]; then
  command -v curl >/dev/null || { echo 'curl is required to install Bun.' >&2; exit 1; }
  command -v unzip >/dev/null || { echo 'unzip is required to install Bun.' >&2; exit 1; }
  radon_installer=$(mktemp)
  trap 'rm -f -- "$radon_installer"' EXIT
  curl --fail --silent --show-error --location https://bun.sh/install --output "$radon_installer"
  BUN_INSTALL="$radon_install_dir" bash "$radon_installer" "bun-v$radon_bun_version"
fi

[[ $(bun --version) == "$radon_bun_version" ]] || { echo 'Unexpected Bun version after installation.' >&2; exit 1; }
cd -- "$radon_root"
# Use repository-local caches so setup also works in restricted cloud workspaces.
export BUN_INSTALL_CACHE_DIR="${BUN_INSTALL_CACHE_DIR:-$radon_root/node_modules/.cache/bun}"
export BUN_TMPDIR="${BUN_TMPDIR:-$BUN_INSTALL_CACHE_DIR/tmp}"
mkdir -p -- "$BUN_TMPDIR"
bun install --frozen-lockfile
bun run db:generate
printf 'Radon is ready with Bun %s. Run bun run check to validate.\n' "$radon_bun_version"
