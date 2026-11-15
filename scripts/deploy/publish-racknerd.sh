#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_SHA:?Missing build revision}"
: "${RUNNER_TEMP:?Missing runner temporary directory}"
: "${DEPLOY_HOST:?RackNerd deployment host is not configured}"
: "${DEPLOY_PORT:?RackNerd deployment port is not configured}"
: "${DEPLOY_ORIGIN:?Public HTTPS origin is not configured}"
: "${DEPLOY_PRIVATE_KEY:?RackNerd deployment key is not configured}"
: "${DEPLOY_KNOWN_HOSTS:?RackNerd host fingerprint is not configured}"

if [[ ! $GITHUB_SHA =~ ^[0-9a-f]{40}$ || ! $DEPLOY_HOST =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ||
  ! $DEPLOY_PORT =~ ^[1-9][0-9]{0,4}$ || ! $DEPLOY_ORIGIN =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] ||
  (( DEPLOY_PORT > 65535 )); then
  printf 'Invalid release revision or deployment endpoint.\n' >&2
  exit 1
fi

umask 077
directory=$(mktemp -d "$RUNNER_TEMP/pavp-racknerd.XXXXXX")
trap 'rm -rf -- "$directory"' EXIT
printf '%s\n' "$DEPLOY_PRIVATE_KEY" >"$directory/identity"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" >"$directory/known_hosts"
unset DEPLOY_PRIVATE_KEY DEPLOY_KNOWN_HOSTS

remote=(
  ssh -F /dev/null -T -i "$directory/identity" -p "$DEPLOY_PORT"
  -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15
  -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$directory/known_hosts"
  -o GlobalKnownHostsFile=/dev/null -o ClearAllForwardings=yes
  "pavp-deploy@$DEPLOY_HOST"
)
artifact=apps/web/dist
"${remote[@]}" configuration >"$directory/current.json"

healthy() {
  curl -fsS --connect-timeout 5 --max-time 10 --retry 2 "$DEPLOY_ORIGIN/" >"$directory/home.html" &&
    cmp -s "$artifact/index.html" "$directory/home.html" &&
    curl -fsS --connect-timeout 5 --max-time 10 --retry 2 "$DEPLOY_ORIGIN/components/tables/tree" >"$directory/deep.html" &&
    cmp -s "$artifact/index.html" "$directory/deep.html" &&
    curl -fsS --connect-timeout 5 --max-time 10 --retry 2 -D "$directory/headers" "$DEPLOY_ORIGIN/runtime-configuration.json" >"$directory/remote.json" &&
    grep -Eiq '^cache-control:.*no-store' "$directory/headers" &&
    node -e 'const a=require(process.argv[1]); if(a.releaseSha!==process.argv[2]||a.environment!=="production")process.exit(1)' "$directory/remote.json" "$GITHUB_SHA"
}

if node -e 'if(require(process.argv[1])?.releaseSha!==process.argv[2])process.exit(1)' "$directory/current.json" "$GITHUB_SHA"; then
  healthy
  printf 'Verified already-active release %s.\n' "$GITHUB_SHA"
  exit 0
fi

# Carry only the owner-edited public settings into the new build identity.
node --input-type=module - "$artifact/runtime-configuration.json" "$directory/current.json" "$GITHUB_SHA" <<'NODE'
import { readFileSync, writeFileSync } from 'node:fs'
const [path, currentPath, revision] = process.argv.slice(2)
const next = JSON.parse(readFileSync(path, 'utf8'))
const current = JSON.parse(readFileSync(currentPath, 'utf8'))
if (next.environment !== 'production' || next.releaseSha !== revision) {
  throw new Error('Production artifact does not belong to the verified revision.')
}
if (current !== null) {
  for (const key of ['api', 'presentation']) {
    if (Object.hasOwn(current, key)) next[key] = current[key]
  }
}
writeFileSync(path, JSON.stringify(next, null, 2) + '\n')
NODE
pnpm config:generate --check --artifact-dir "$artifact"

python3 - "$artifact" "$directory/current.json" "$directory/release.tar.gz" <<'PY'
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile

artifact, baseline, archive = map(Path, sys.argv[1:])
runtime = json.loads((artifact / "runtime-configuration.json").read_bytes())
files = {}
with tarfile.open(archive, "w:gz") as tar:
    for path in sorted(artifact.rglob("*")):
        name = path.relative_to(artifact).as_posix()
        if name == ".vite" or name.startswith(".vite/"):
            continue
        if path.is_symlink():
            raise ValueError("A deployment artifact must not contain symbolic links.")
        if not path.is_file():
            continue
        files[name] = hashlib.sha256(path.read_bytes()).hexdigest()
        tar.add(path, arcname=name, recursive=False)
    manifest = json.dumps({
        **{key: runtime[key] for key in ("releaseSha", "environment", "deploymentBase", "buildVersion")},
        "expectedCurrentConfigSha256": hashlib.sha256(baseline.read_bytes()).hexdigest(),
        "files": files,
    }).encode()
    info = tarfile.TarInfo("release.json")
    info.size = len(manifest)
    tar.addfile(info, io.BytesIO(manifest))
PY

"${remote[@]}" "stage $GITHUB_SHA" <"$directory/release.tar.gz"
"${remote[@]}" "activate $GITHUB_SHA"
if ! healthy; then
  printf 'Public HTTPS verification failed; restoring previous release.\n' >&2
  "${remote[@]}" "rollback $GITHUB_SHA"
  exit 1
fi
printf 'Published %s at %s.\n' "$GITHUB_SHA" "$DEPLOY_ORIGIN"
