# JUnit Report Upload to BrowserStack - Complete Guide

This guide explains how to generate JUnit XML test reports from PHPUnit tests and upload them to BrowserStack Test Observability.

## Overview

The integration consists of three main components:

1. **JUnit XML Generation** - PHPUnit generates test reports in JUnit XML format
2. **Report Collection** - Reports are copied from Docker container to host
3. **BrowserStack Upload** - Reports are uploaded via REST API

## Prerequisites

### BrowserStack Credentials

Get your credentials from: https://www.browserstack.com/accounts/settings

Set environment variables:
```bash
export BROWSERSTACK_USERNAME='your_username'
export BROWSERSTACK_ACCESS_KEY='your_access_key'
```

### BrowserStack Local Running

Make sure BrowserStack Local is running:
```bash
# Start BrowserStack Local
./tests/AdminCabinet/start-browserstack-local.sh

# Verify it's running
ps aux | grep -i browserstack | grep -v grep
```

## Generated Files

### Scripts

1. **upload-junit-to-browserstack.sh**
   - Location: `tests/AdminCabinet/Scripts/upload-junit-to-browserstack.sh`
   - Purpose: Upload JUnit XML reports to BrowserStack
   - Features:
     - Validates prerequisites (curl, report file, credentials)
     - Checks file size (max 100MB)
     - Uploads to BrowserStack API
     - Displays upload status and link to results

2. **run-tests-and-upload.sh**
   - Location: `tests/AdminCabinet/Scripts/run-tests-and-upload.sh`
   - Purpose: Complete workflow - run tests and upload results
   - Features:
     - Runs PHPUnit tests inside Docker
     - Generates JUnit XML report
     - Copies report from container to host
     - Uploads to BrowserStack
     - Displays comprehensive summary

### Report Directory

- **Location**: `tests/AdminCabinet/reports/`
- **Files**:
  - `junit.xml` - JUnit XML test report
  - `testdox.html` - Human-readable HTML report (optional)
  - `testdox.txt` - Plain text report (optional)

## Usage Examples

### Method 1: Automated Script (Recommended)

Run all tests and upload automatically:
```bash
# Run all test suites
./tests/AdminCabinet/Scripts/run-tests-and-upload.sh

# Run specific test suite
./tests/AdminCabinet/Scripts/run-tests-and-upload.sh Extensions

# With custom BrowserStack settings
BROWSERSTACK_PROJECT_NAME="My Project" \
BROWSERSTACK_BUILD_NAME="Sprint 42" \
BROWSERSTACK_TAGS="regression,smoke" \
./tests/AdminCabinet/Scripts/run-tests-and-upload.sh PBXSettings
```

### Method 2: Manual Step-by-Step

#### Step 1: Run Tests and Generate Report

```bash
# Generate JUnit report in /tmp (writable location)
docker exec mikopbx_php83 /offload/rootfs/usr/www/vendor/bin/phpunit \
  --configuration /offload/rootfs/usr/www/tests/AdminCabinet/phpunit.xml \
  --testsuite Extensions \
  --log-junit /tmp/junit.xml
```

#### Step 2: Copy Report from Container

```bash
# Copy report from container to host
docker cp mikopbx_php83:/tmp/junit.xml tests/AdminCabinet/reports/junit.xml

# Verify report
ls -lh tests/AdminCabinet/reports/junit.xml
```

#### Step 3: Upload to BrowserStack

```bash
# Upload using script
./tests/AdminCabinet/Scripts/upload-junit-to-browserstack.sh tests/AdminCabinet/reports/junit.xml

# Or upload manually with curl
curl -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
    -X POST \
    -F "data=@tests/AdminCabinet/reports/junit.xml" \
    -F "projectName=MikoPBX AdminCabinet Tests" \
    -F "buildName=Build $(date +%Y%m%d-%H%M%S)" \
    -F "buildIdentifier=$(date +%Y%m%d-%H%M%S)" \
    -F "tags=phpunit,selenium,admin-cabinet" \
    -F "frameworkVersion=phpunit, 9.6.22" \
    https://upload-automation.browserstack.com/upload
```

## Environment Variables

All scripts support the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `BROWSERSTACK_USERNAME` | BrowserStack username | (required) |
| `BROWSERSTACK_ACCESS_KEY` | BrowserStack access key | (required) |
| `BROWSERSTACK_PROJECT_NAME` | Project name in BrowserStack | `MikoPBX AdminCabinet Tests` |
| `BROWSERSTACK_BUILD_NAME` | Build name | `Build <timestamp>` |
| `BROWSERSTACK_TAGS` | Comma-separated tags | `phpunit,selenium,admin-cabinet,automated` |
| `BUILD_NUMBER` | Build identifier (CI/CD) | `local-<timestamp>` |
| `CI_JOB_URL` | CI job URL | (optional) |
| `CONTAINER_NAME` | Docker container name | `mikopbx_php83` |

## JUnit XML Report Format

PHPUnit generates JUnit XML in the following structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="TestSuiteName" tests="10" assertions="25" errors="0" failures="1" skipped="0" time="45.123">
    <testsuite name="TestClassName" file="/path/to/Test.php" tests="5" ...>
      <testcase name="testMethod" class="TestClass" file="/path/to/Test.php" line="42" assertions="3" time="1.234">
        <!-- Success (no child elements) -->
      </testcase>
      <testcase name="testFailingMethod" ...>
        <failure type="AssertionError">Failure message and stack trace</failure>
      </testcase>
      <testcase name="testError" ...>
        <error type="RuntimeException">Error message and stack trace</error>
      </testcase>
    </testsuite>
  </testsuite>
</testsuites>
```

## BrowserStack API Details

### Endpoint
```
POST https://upload-automation.browserstack.com/upload
```

### Authentication
```bash
-u "USERNAME:ACCESS_KEY"
```

### Request Parameters

**Required:**
- `data`: JUnit XML file (multipart/form-data)
- `projectName`: Project name (string)
- `buildName`: Build name (string)

**Optional:**
- `buildIdentifier`: Unique build ID (expires after 6 hours)
- `tags`: Comma-separated tags
- `ci`: CI job URL
- `frameworkVersion`: Format: "framework, version"
- `versionControl`: Git repository details

### Response

**Success (200 OK):**
```json
{
    "status": "success",
    "message": "Request to import JUnit reports received."
}
```

**Note:** Parsing is asynchronous - results appear in BrowserStack UI within a few seconds.

### Limitations

- **Max file size**: 100MB
- **Upload order**: Reports should be uploaded chronologically
- **Build identifier**: Expires after 6 hours
- **Supported formats**: Apache Ant, Jenkins, Maven Surefire JUnit XML schemas

## Viewing Results

After successful upload, view your test results at:
```
https://observability.browserstack.com/
```

Or for the legacy interface:
```
https://automate.browserstack.com/dashboard
```

## Troubleshooting

### Issue: "JUnit report not found"

**Cause**: Report wasn't generated or wrong path

**Solution**:
```bash
# Check if report exists in container
docker exec mikopbx_php83 ls -lh /tmp/junit.xml

# Check on host
ls -lh tests/AdminCabinet/reports/junit.xml
```

### Issue: "Read-only file system"

**Cause**: Trying to write to read-only location in container

**Solution**: Always use `/tmp` for reports inside container:
```bash
--log-junit /tmp/junit.xml  # ✓ Correct
--log-junit /offload/rootfs/usr/www/tests/AdminCabinet/reports/junit.xml  # ✗ Wrong
```

### Issue: "BrowserStack credentials not set"

**Cause**: Environment variables not exported

**Solution**:
```bash
export BROWSERSTACK_USERNAME='your_username'
export BROWSERSTACK_ACCESS_KEY='your_access_key'

# Verify
echo $BROWSERSTACK_USERNAME
```

### Issue: "File size exceeds maximum (100MB)"

**Cause**: JUnit XML file is too large

**Solution**:
1. Split test suites into smaller groups
2. Run tests in batches
3. Upload multiple smaller reports instead of one large report

### Issue: "Upload failed with HTTP 401"

**Cause**: Invalid credentials

**Solution**:
1. Verify credentials at: https://www.browserstack.com/accounts/settings
2. Check for typos in username/access key
3. Regenerate access key if necessary

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Run Tests and Upload to BrowserStack

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Start BrowserStack Local
        run: |
          ./tests/AdminCabinet/start-browserstack-local.sh &
          sleep 5

      - name: Run Tests
        run: |
          docker exec mikopbx_php83 /offload/rootfs/usr/www/vendor/bin/phpunit \
            --configuration /offload/rootfs/usr/www/tests/AdminCabinet/phpunit.xml \
            --log-junit /tmp/junit.xml

      - name: Copy Report
        run: docker cp mikopbx_php83:/tmp/junit.xml tests/AdminCabinet/reports/junit.xml

      - name: Upload to BrowserStack
        env:
          BROWSERSTACK_USERNAME: ${{ secrets.BROWSERSTACK_USERNAME }}
          BROWSERSTACK_ACCESS_KEY: ${{ secrets.BROWSERSTACK_ACCESS_KEY }}
          BUILD_NUMBER: ${{ github.run_number }}
          CI_JOB_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
        run: |
          ./tests/AdminCabinet/Scripts/upload-junit-to-browserstack.sh \
            tests/AdminCabinet/reports/junit.xml

      - name: Upload Artifact
        uses: actions/upload-artifact@v2
        if: always()
        with:
          name: junit-report
          path: tests/AdminCabinet/reports/junit.xml
```

### GitLab CI Example

```yaml
test:
  stage: test
  script:
    - ./tests/AdminCabinet/start-browserstack-local.sh &
    - sleep 5
    - docker exec mikopbx_php83 /offload/rootfs/usr/www/vendor/bin/phpunit
        --configuration /offload/rootfs/usr/www/tests/AdminCabinet/phpunit.xml
        --log-junit /tmp/junit.xml
    - docker cp mikopbx_php83:/tmp/junit.xml tests/AdminCabinet/reports/junit.xml
    - export BUILD_NUMBER=$CI_PIPELINE_ID
    - export CI_JOB_URL=$CI_JOB_URL
    - ./tests/AdminCabinet/Scripts/upload-junit-to-browserstack.sh
  artifacts:
    when: always
    paths:
      - tests/AdminCabinet/reports/junit.xml
    reports:
      junit: tests/AdminCabinet/reports/junit.xml
```

## Best Practices

1. **Always use timestamps in build names** for easy identification
2. **Tag reports appropriately** (e.g., `regression`, `smoke`, `nightly`)
3. **Include CI job URLs** for traceability
4. **Upload reports even for failed tests** to track failures in BrowserStack
5. **Use unique build identifiers** to avoid report conflicts
6. **Archive reports as CI artifacts** for later reference
7. **Clean up old reports** from local filesystem

## References

- **BrowserStack Upload API**: https://www.browserstack.com/docs/test-reporting-and-analytics/references/upload-junit-reports
- **PHPUnit Documentation**: https://phpunit.de/manual/9.6/en/logging.html
- **JUnit XML Format**: https://github.com/junit-team/junit5/blob/main/platform-tests/src/test/resources/jenkins-junit.xsd
