# OrbStack Compatibility

## Overview

The test suite has been updated to work with OrbStack, a modern Docker Desktop alternative for macOS. OrbStack provides better performance and lower resource usage while maintaining Docker CLI compatibility.

## Changes Made

### Python Test Helpers

Updated the following files to properly pass environment variables to subprocess calls:

1. **`helpers/cdr_seeder_remote.py`**:
   - Added `env=dict(os.environ)` to subprocess calls in `_detect_mode()` and `_execute_command()`
   - This ensures Docker commands inherit OrbStack's `DOCKER_HOST` environment variable

2. **`helpers/reboot_helper.py`**:
   - Added comment noting Docker/OrbStack compatibility
   - The `os.system()` call automatically inherits environment

### Shell Scripts

No changes needed for shell scripts (`run-reboot-test.sh`, etc.) as they automatically inherit environment variables.

## How It Works

OrbStack sets the `DOCKER_HOST` environment variable to point to its socket:
```bash
# OrbStack default
DOCKER_HOST=unix:///Users/nb/.orbstack/run/docker.sock
```

By passing `env=dict(os.environ)` to subprocess calls, Python scripts now correctly inherit this variable, allowing `docker` commands to work with OrbStack.

## Docker Desktop vs OrbStack

Both systems work identically from the test suite perspective:

- **Docker Desktop**: Uses `unix:///var/run/docker.sock` (default)
- **OrbStack**: Uses `unix:///Users/nb/.orbstack/run/docker.sock` (via `DOCKER_HOST`)

The test suite automatically detects and uses whichever is available.

## Verification

To verify Docker/OrbStack is working correctly:

```bash
# Check Docker is accessible
docker ps

# Check environment
echo $DOCKER_HOST

# Run a simple test
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests/api
python3 -c "from helpers.cdr_seeder_remote import CDRSeederRemote; print(CDRSeederRemote()._detect_mode())"
# Should output: docker
```

## Troubleshooting

If you see errors like:
```
⚠ Cleanup warning: Cannot connect to the Docker daemon at unix:///Users/nb/.docker/run/docker.sock
```

This means the subprocess is not inheriting environment variables. Ensure:
1. You're using OrbStack or Docker Desktop
2. The `docker` command works in your shell
3. Python subprocess calls include `env=dict(os.environ)`
