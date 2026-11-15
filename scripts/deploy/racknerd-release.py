#!/usr/bin/env python3
"""Restricted, non-root PAVP release receiver. Application schema validation belongs to CI.

Install this file root-owned. The dedicated deploy key's forced command invokes it
without forwarding shell arguments. Only SSH_ORIGINAL_COMMAND selects an operation.
"""

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile
import uuid

SHA = re.compile(r"[0-9a-f]{40}")
DIGEST = re.compile(r"[0-9a-f]{64}")
MAX_BYTES = 256 * 1024 * 1024
MAX_FILES = 10000


def require(condition, message):
    if not condition:
        raise ValueError(message)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON key")
        result[key] = value
    return result


def read_json(path):
    require(path.stat().st_size <= 4 * 1024 * 1024, "JSON document too large")
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError("Non-finite JSON")))


def digest(path):
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def relative_name(name):
    require(isinstance(name, str) and name and "\\" not in name, "Invalid archive path")
    path = PurePosixPath(name)
    require(not path.is_absolute() and ".." not in path.parts and path.parts,
            "Unsafe archive path")
    require(str(path) == name.rstrip("/"), "Non-canonical archive path")
    return path


def extract(source, destination):
    total = 0
    names = set()
    with tarfile.open(fileobj=source, mode="r|gz") as archive:
        for member in archive:
            path = relative_name(member.name)
            require(str(path) not in names, "Duplicate archive entry")
            names.add(str(path))
            require(len(names) <= MAX_FILES, "Too many archive entries")
            require(member.isdir() or member.isreg(), "Only directories and regular files allowed")
            require(not member.issparse(), "Sparse files prohibited")
            target = destination.joinpath(*path.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True, mode=0o755)
                continue
            total += member.size
            require(0 <= member.size <= MAX_BYTES and total <= MAX_BYTES, "Archive too large")
            target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
            with archive.extractfile(member) as incoming, target.open("xb") as outgoing:
                shutil.copyfileobj(incoming, outgoing)
                require(outgoing.tell() == member.size, "Truncated archive file")
            target.chmod(0o644)


def validate(directory, sha):
    release = read_json(directory / "release.json")
    runtime = read_json(directory / "runtime-configuration.json")
    require(isinstance(release, dict) and isinstance(runtime, dict), "Expected JSON objects")
    for document in (release, runtime):
        require(document.get("releaseSha") == sha, "Release identity mismatch")
        require(document.get("environment") == "production", "Not a production artifact")
        require(document.get("deploymentBase") == "/", "Unsupported deployment base")
    require(isinstance(runtime.get("buildVersion"), str) and
            re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", runtime["buildVersion"]),
            "Invalid build version")
    require(release.get("buildVersion") == runtime["buildVersion"], "Build identity mismatch")
    require(runtime.get("schemaVersion") == 2 and isinstance(runtime.get("api"), dict),
            "Invalid runtime envelope")
    require(set(runtime) <= {"schemaVersion", "environment", "deploymentBase", "releaseSha",
                             "buildVersion", "api", "presentation"}, "Unexpected runtime fields")
    require(isinstance(release.get("expectedCurrentConfigSha256"), str) and
            DIGEST.fullmatch(release["expectedCurrentConfigSha256"]), "Missing configuration baseline")
    files = release.get("files")
    require(isinstance(files, dict) and files, "Missing integrity manifest")
    actual = {str(path.relative_to(directory)) for path in directory.rglob("*") if path.is_file()}
    require(actual == set(files) | {"release.json"}, "Integrity manifest coverage mismatch")
    require("index.html" in files and "runtime-configuration.json" in files and
            any(name.startswith("assets/") for name in files), "Incomplete application")
    for name, expected in files.items():
        relative_name(name)
        require(isinstance(expected, str) and DIGEST.fullmatch(expected), "Invalid file digest")
        require(digest(directory / name) == expected, "File integrity mismatch")
    return release


def linked_release(root, name):
    link = root / name
    if not link.exists() and not link.is_symlink():
        return None
    require(link.is_symlink(), "Release pointer is not a symlink")
    target = os.readlink(link)
    require(re.fullmatch(r"releases/[0-9a-f]{40}", target), "Unsafe release pointer")
    require((root / target).is_dir(), "Missing release target")
    return target.split("/")[1]


def point(root, name, sha):
    temporary = root / ("." + name + "-" + uuid.uuid4().hex)
    try:
        temporary.symlink_to("releases/" + sha)
        os.replace(temporary, root / name)
    finally:
        temporary.unlink(missing_ok=True)


def run(root, command, source):
    require(command == "configuration" or
            re.fullmatch(r"(?:stage|activate|rollback) [0-9a-f]{40}", command),
            "Unsupported deployment command")
    require(root.is_dir() and not root.is_symlink(), "Deployment root must be provisioned")
    with (root / ".deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        current = linked_release(root, "current")
        configuration = (root / "releases" / current / "runtime-configuration.json") if current else None
        if configuration is not None:
            require(not configuration.is_symlink(), "Unsafe configuration file")
            read_json(configuration)
        baseline = configuration.read_bytes() if configuration else b"null\n"
        if command == "configuration":
            return baseline
        action, sha = command.split(" ")
        releases = root / "releases"
        releases.mkdir(exist_ok=True, mode=0o755)
        require(not releases.is_symlink(), "Unsafe releases directory")
        destination = releases / sha
        if action == "stage":
            with tempfile.TemporaryDirectory(prefix=".incoming-", dir=root) as temporary:
                incoming = Path(temporary)
                extract(source, incoming)
                validate(incoming, sha)
                if destination.exists():
                    validate(destination, sha)
                    require(read_json(destination / "release.json") == read_json(incoming / "release.json"),
                            "Release SHA already has different content")
                else:
                    incoming.chmod(0o755)
                    os.rename(incoming, destination)
            return {"status": "staged", "releaseSha": sha}
        if action == "activate":
            release = validate(destination, sha)
            if current != sha:
                require(hashlib.sha256(baseline).hexdigest() == release["expectedCurrentConfigSha256"],
                        "Live configuration changed since artifact preparation")
                if current:
                    point(root, "previous", current)
                point(root, "current", sha)
            return {"status": "active", "releaseSha": sha, "previous": linked_release(root, "previous")}
        require(current == sha, "Rollback requires the current failed release SHA")
        previous = linked_release(root, "previous")
        if previous is None:
            (root / "current").unlink()
            return {"status": "rolled-back", "releaseSha": None}
        require(previous != sha, "Invalid previous release")
        # Previous configuration may have been deliberately edited after its original deploy.
        # Restore the entire known-live release, not freshly generated configuration.
        point(root, "current", previous)
        return {"status": "rolled-back", "releaseSha": previous}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("/var/www/pavp"))
    args = parser.parse_args()
    try:
        result = run(args.root, os.environ.get("SSH_ORIGINAL_COMMAND", ""), sys.stdin.buffer)
        if isinstance(result, bytes):
            sys.stdout.buffer.write(result)
        else:
            print(json.dumps(result, separators=(",", ":")))
    except (OSError, ValueError, tarfile.TarError, EOFError) as error:
        # Never echo payloads, configuration values, or archive-controlled path strings.
        print("PAVP release rejected: " + type(error).__name__, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
