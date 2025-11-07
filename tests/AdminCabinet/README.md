# MikoPBX AdminCabinet Tests

## Overview
Browser automation tests for MikoPBX Admin Cabinet using Selenium WebDriver and BrowserStack.

## Architecture
- Tests run inside Docker container
- BrowserStack Local runs on macOS host (no ARM64 Linux binary available)
- Communication happens through BrowserStack cloud

## Setup

### 1. Start BrowserStack Local on macOS host
```bash
cd /Users/nb/PhpstormProjects/mikopbx/Core/tests
./start-browserstack-local.sh
```

### 2. Set environment variables
```bash
export BROWSERSTACK_DAEMON_STARTED=true
export BROWSERSTACK_LOCAL_IDENTIFIER=local_test
```

### 3. Run tests from VSCode
- Use the PHPUnit test explorer
- Or run manually in terminal

## Running Tests Manually

### Single test file
```bash
docker exec -t mikopbx-php83 /bin/sh -c "
  cd /offload/rootfs/usr/www && 
  BROWSERSTACK_DAEMON_STARTED=true BROWSERSTACK_LOCAL_IDENTIFIER=local_test \
  php -dxdebug.start_with_request=yes vendor/bin/phpunit \
  --configuration tests/Unit/phpunit.xml \
  tests/AdminCabinet/Tests/YourTest.php
"
```

### All tests
```bash
docker exec -t mikopbx-php83 /bin/sh -c "
  cd /offload/rootfs/usr/www && 
  BROWSERSTACK_DAEMON_STARTED=true BROWSERSTACK_LOCAL_IDENTIFIER=local_test \
  php -dxdebug.start_with_request=yes vendor/bin/phpunit \
  --configuration tests/Unit/phpunit.xml \
  tests/AdminCabinet/Tests/
"
```

## VSCode Configuration

Your `.vscode/settings.json` should include:
```json
{
    "phpunit.command": "docker exec -t mikopbx-php83 /bin/sh -c",
    "phpunit.phpunit": "/offload/rootfs/usr/www/vendor/bin/phpunit",
    "phpunit.php": "php -dxdebug.start_with_request=yes",
    "phpunit.args": [
        "--configuration",
        "/offload/rootfs/usr/www/tests/Unit/phpunit.xml"
    ],
    "phpunit.paths": {
        "/Users/nb/PhpstormProjects/mikopbx/Core/tests": "/offload/rootfs/usr/www/tests"
    }
}
```

## Troubleshooting

### Duplicate Sessions
- Fixed: Removed incorrect `setUpBeforeClass()` call from `setUp()` method
- Each test class should create only one BrowserStack session

### BrowserStack Local Not Running
- The test will show clear instructions if BrowserStack Local is not detected
- Always start it on the host system before running tests

### Debug Mode
- View BrowserStack session: https://automate.browserstack.com
- Enable verbose logging: `--verbose 3` in BrowserStackLocal command
- Check container logs: `docker logs mikopbx-php83`

## Common Issues

1. **"BrowserStack Local is not running"**
   - Start BrowserStackLocal on your macOS host
   - Set `BROWSERSTACK_DAEMON_STARTED=true`

2. **Connection timeouts**
   - Check if BrowserStackLocal is running: `ps aux | grep BrowserStackLocal`
   - Verify network connectivity to BrowserStack

3. **Test failures due to timing**
   - Use explicit waits: `$this->waitForAjax()`
   - Add appropriate wait conditions

## Best Practices

1. Always start BrowserStack Local before running tests
2. Use a consistent local identifier
3. Monitor BrowserStack dashboard for session limits
4. Clean up test data after each test run
5. Use data factories for consistent test data