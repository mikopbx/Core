# BrowserStack Local Setup for macOS

## Prerequisites
1. BrowserStack account with Automate access
2. BrowserStack Local binary for macOS
3. Docker with MikoPBX container running

## Installation

### 1. Download BrowserStack Local
```bash
# For Intel Mac
curl -O https://www.browserstack.com/browserstack-local/BrowserStackLocal-darwin-x64.zip
unzip BrowserStackLocal-darwin-x64.zip

# For Apple Silicon (M1/M2)
curl -O https://www.browserstack.com/browserstack-local/BrowserStackLocal-darwin-arm64.zip
unzip BrowserStackLocal-darwin-arm64.zip

# Make it executable
chmod +x BrowserStackLocal
```

### 2. Configure local.conf.json
```bash
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests/config
cp local.conf.json.example local.conf.json
# Edit with your credentials
```

### 3. Get Your BrowserStack Credentials
1. Log in to [BrowserStack Automate](https://automate.browserstack.com)
2. Click on "Access Key" in the top menu
3. Copy your username and access key

### 4. Update local.conf.json
Replace the following values:
- `"user"`: Your BrowserStack username
- `"key"`: Your BrowserStack access key
- `"MIKO_LICENSE_KEY"`: Your MikoPBX license key

## Running BrowserStack Local

### Option 1: Using the helper script
```bash
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests
./start-browserstack-local.sh
```

### Option 2: Manual start
```bash
./BrowserStackLocal --key YOUR_ACCESS_KEY \
  --local-identifier local_test \
  --force \
  --only-automate \
  --verbose 3
```

### Option 3: With specific settings
```bash
./BrowserStackLocal --key YOUR_ACCESS_KEY \
  --local-identifier my_test_session \
  --force \
  --only-automate \
  --proxy-host YOUR_PROXY \
  --proxy-port 8080 \
  --proxy-user USERNAME \
  --proxy-pass PASSWORD
```

## Environment Variables

### Required for tests
```bash
export BROWSERSTACK_DAEMON_STARTED=true
export BROWSERSTACK_LOCAL_IDENTIFIER=local_test
```

### Optional overrides
```bash
export BROWSERSTACK_USERNAME=your_username
export BROWSERSTACK_ACCESS_KEY=your_key
export SERVER_PBX=https://192.168.117.2:8081
export TASK_ID=0  # Select browser environment (0-3)
```

## Running Tests

### With environment variables set
```bash
docker exec -t mikopbx_php83 /bin/sh -c "
  cd /offload/rootfs/usr/www && 
  php vendor/bin/phpunit tests/AdminCabinet/Tests/CustomFileChangeTest.php
"
```

### With inline environment variables
```bash
docker exec -t mikopbx_php83 /bin/sh -c "
  cd /offload/rootfs/usr/www && 
  BROWSERSTACK_DAEMON_STARTED=true \
  BROWSERSTACK_LOCAL_IDENTIFIER=local_test \
  TASK_ID=0 \
  php vendor/bin/phpunit tests/AdminCabinet/Tests/
"
```

## Browser Selection

Use `TASK_ID` to select different browsers:
- `0` - Chrome on macOS (default)
- `1` - Firefox on macOS
- `2` - Safari on macOS
- `3` - Edge on Windows

Example:
```bash
TASK_ID=2 docker exec -t mikopbx_php83 ...
```

## Troubleshooting

### Check if BrowserStack Local is running
```bash
ps aux | grep BrowserStackLocal
```

### View BrowserStack Local logs
```bash
./BrowserStackLocal --key YOUR_KEY --verbose 3 2>&1 | tee browserstack.log
```

### Test connectivity
```bash
# From host
curl https://www.browserstack.com/local/v1/list \
  -u "USERNAME:ACCESS_KEY"

# From container
docker exec mikopbx_php83 curl http://host.docker.internal:45454/check
```

### Common Issues

1. **"BrowserStackLocal is not reachable"**
   - Ensure BrowserStackLocal is running on host
   - Check firewall settings
   - Try with `--force-local` flag

2. **"Invalid credentials"**
   - Verify username and access key
   - Check for special characters that need escaping

3. **"Local Testing connection not established"**
   - Use unique local identifier
   - Kill existing BrowserStackLocal processes
   - Check proxy settings if behind corporate firewall

## VSCode Integration

Add to `.vscode/settings.json`:
```json
{
  "terminal.integrated.env.osx": {
    "BROWSERSTACK_DAEMON_STARTED": "true",
    "BROWSERSTACK_LOCAL_IDENTIFIER": "local_test"
  }
}
```

## Security Notes

1. Never commit `local.conf.json` with real credentials
2. Use environment variables for CI/CD
3. Rotate access keys regularly
4. Use `--only-automate` to restrict access