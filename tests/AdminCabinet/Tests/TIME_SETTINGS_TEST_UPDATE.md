# Time Settings Test Update

## Changes to FillDataTimeSettingsTest.php

### Problem
The test was changing system time by **+2 hours**, which exceeded JWT leeway tolerance and caused authentication loss, requiring re-login.

### Solution
Updated test to change time by only **+5 minutes** (within JWT leeway ±10 minutes), preserving authentication.

## Key Changes

### 1. Time Change Amount (Line 296)

**Before:**
```php
'ManualDateTime' => date('d/m/Y, h:i:s A', strtotime('+2 hours')),
```

**After:**
```php
'ManualDateTime' => date('d/m/Y, h:i:s A', strtotime('+5 minutes')),
```

### 2. Smart Re-login Logic (Lines 78-91)

**Before:**
```php
// Always re-login after time change
$this->reLoginAfterTimeChange();
```

**After:**
```php
// Only re-login if time change exceeds JWT leeway
if ($this->isTimeChangeBeyondLeeway($params)) {
    self::annotate("Time change beyond leeway, re-login required");
    $this->reLoginAfterTimeChange();
} else {
    self::annotate("Time change within leeway tolerance, session preserved");
    sleep(2);
    $this->waitForAjax();
    $this->verifySessionStillValid();
}
```

### 3. New Helper Methods

#### `isTimeChangeBeyondLeeway()` (Lines 170-186)
Checks if manual time change exceeds ±10 minutes JWT leeway:
- **NTP mode**: Always returns `false` (gradual changes)
- **Manual mode**: Calculates time difference and compares with 10-minute threshold

```php
protected function isTimeChangeBeyondLeeway(array $params): bool
{
    if (!$params[PbxSettings::PBX_MANUAL_TIME_SETTINGS]) {
        return false; // NTP changes are gradual
    }

    $manualDateTime = $params['ManualDateTime'];
    $targetTime = strtotime(str_replace(['/', ','], ['-', ''], $manualDateTime));
    $currentTime = time();
    $differenceMinutes = abs($targetTime - $currentTime) / 60;

    return $differenceMinutes > 10; // JWT leeway is 10 minutes
}
```

#### `verifySessionStillValid()` (Lines 192-214)
Validates that JWT authentication is still working after time change:
- Navigates to admin cabinet
- Checks for top menu visibility (session indicator)
- Throws exception if session is invalid

```php
protected function verifySessionStillValid(): void
{
    $url = $GLOBALS['SERVER_PBX'] . '/admin-cabinet/';
    self::$driver->get($url);
    $this->waitForAjax();

    $topMenu = self::$driver->findElement(
        \Facebook\WebDriver\WebDriverBy::id('top-menu-search')
    );

    if (!$topMenu->isDisplayed()) {
        throw new \Exception("Top menu not visible, session may be invalid");
    }

    self::annotate("Session still valid after time change", 'success');
}
```

### 4. Updated Documentation (Lines 287-299)

Added detailed comments explaining:
- JWT leeway tolerance (±10 minutes)
- Why +5 minutes doesn't require re-login
- How Redis refresh tokens are time-independent

## Test Scenarios

### Test 1: Manual Time Change (+5 minutes)
```php
[
    PbxSettings::PBX_MANUAL_TIME_SETTINGS => true,
    'ManualDateTime' => date('d/m/Y, h:i:s A', strtotime('+5 minutes')),
]
```

**Expected behavior:**
- ✅ Time changed successfully
- ✅ JWT tokens remain valid (within leeway)
- ✅ Session preserved (no re-login)
- ✅ Settings verified

### Test 2: NTP Synchronization
```php
[
    PbxSettings::PBX_MANUAL_TIME_SETTINGS => false,
    PbxSettings::NTP_SERVER => '0.pool.ntp.org',
]
```

**Expected behavior:**
- ✅ NTP configured successfully
- ✅ Time adjusted gradually
- ✅ Session always preserved
- ✅ Settings verified

## Technical Details

### JWT Leeway Mechanics

**Access Token Validation (with leeway):**
```
Token issued: 14:00
Token expires: 14:15 (base TTL)
With leeway: 14:25 (exp + 600 seconds)

Time change: +5 minutes → 14:05
Check: 14:05 < 14:25 ✅ Valid
```

**Token Tolerance:**
- Base TTL: 15 minutes
- Leeway: ±10 minutes
- Total tolerance: Up to 25 minutes from issue time

### Redis Refresh Tokens

**Not affected by system time changes:**
- TTL stored as counter (seconds remaining)
- Counts down independently of system clock
- Continues working after any time change

## Test Flow

```
1. Login → JWT tokens issued
2. Navigate to Time Settings
3. Change time to +5 minutes
4. Submit form
5. Wait for services restart (15 seconds)
6. Check if time change > 10 minutes:
   ├─ YES → Re-login required (not our case)
   └─ NO  → Verify session still valid ✅
7. Verify settings saved correctly
```

## Benefits

### Before Update
- ❌ Time change: +2 hours
- ❌ Always lost authentication
- ❌ Required re-login every time
- ❌ Couldn't test JWT leeway feature
- ❌ Slow test execution (login overhead)

### After Update
- ✅ Time change: +5 minutes
- ✅ Preserves authentication
- ✅ Re-login only when needed (>10 min)
- ✅ Tests JWT leeway feature
- ✅ Faster test execution
- ✅ More realistic scenario

## Related Files

- **JWT Implementation**: `src/PBXCoreREST/Lib/Auth/JWTHelper.php`
- **JWT Documentation**: `docs/JWT_TIME_CHANGE_HANDLING.md`
- **Test Base Class**: `tests/AdminCabinet/Lib/MikoPBXTestsBase.php`

## Running the Test

```bash
# Run time settings test
./vendor/bin/phpunit tests/AdminCabinet/Tests/FillDataTimeSettingsTest.php

# Expected output:
# Test 1: Manual time (+5 min) - PASSED
#   ✓ Time change within leeway tolerance, session preserved
#   ✓ Session still valid after time change
#   ✓ Time settings verified successfully
#
# Test 2: NTP mode - PASSED
#   ✓ Time change within leeway tolerance, session preserved
#   ✓ Session still valid after time change
#   ✓ Time settings verified successfully
```

## Edge Cases Handled

### 1. Large Time Changes
If someone modifies test to use >10 minutes:
```php
'ManualDateTime' => date('d/m/Y, h:i:s A', strtotime('+15 minutes')),
```
- `isTimeChangeBeyondLeeway()` returns `true`
- Test automatically triggers re-login
- Works correctly without modification

### 2. NTP Mode
- Always preserves session (gradual changes)
- Never triggers re-login
- Tests NTP configuration without side effects

### 3. System Restart
- `waitForSystemReady()` ensures services are up
- Exponential backoff prevents false failures
- Timeout protection (15 attempts max)

## Summary

The updated test now:
1. **Tests JWT leeway feature** - Verifies tokens work after time changes within ±10 minutes
2. **Preserves authentication** - No unnecessary re-logins for small time changes
3. **Runs faster** - Eliminates login overhead when not needed
4. **More realistic** - Simulates typical NTP adjustments (not 2-hour jumps)
5. **Flexible** - Automatically handles both small and large time changes

## Migration Notes

**For other tests that change time:**
- Consider reducing time changes to ±5 minutes
- Use `isTimeChangeBeyondLeeway()` pattern
- Add `verifySessionStillValid()` check
- Update comments to reflect JWT leeway

**For manual testing:**
- Time changes up to ±10 minutes: Session preserved
- Time changes beyond ±10 minutes: Re-login required
- NTP sync: Always preserves session
