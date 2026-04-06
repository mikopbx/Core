# BrowserStack Troubleshooting Guide

## Connection Issues

### "BrowserStack Local not running"

**Symptom:**
```
BrowserStackLocal binary is not running. Please check the connection.
```

**Solution:**
1. Start BrowserStack Local on macOS host:
```bash
cd ~/PhpstormProjects/mikopbx/Core/tests/AdminCabinet
./start-browserstack-local.sh
```

2. Verify it's running:
```bash
pgrep -f BrowserStackLocal
```

3. Check logs for errors:
```bash
ps aux | grep BrowserStackLocal
```

### "Could not connect to PBX server"

**Symptom:**
- Tests timeout on page load
- "Connection refused" errors

**Solutions:**

1. Verify PBX server is accessible:
```bash
curl -k https://172.16.33.72
```

2. Check firewall allows connections from BrowserStack IPs

3. Ensure `BROWSERSTACK_LOCAL_IDENTIFIER` matches in both:
   - start-browserstack-local.sh
   - Test execution command

### "Session not created"

**Symptom:**
```
WebDriverCurlException: Unable to create session
```

**Solutions:**

1. Check BrowserStack credentials in `config/local.conf.json`
2. Verify account quota at https://automate.browserstack.com/
3. Try different browser/OS combination

## Element Location Issues

### "Unable to locate element"

**Common causes and solutions:**

1. **Element not yet loaded**
```php
// Add explicit wait
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::id('element-id')
    )
);
```

2. **Element inside iframe**
```php
self::$driver->switchTo()->frame('iframe-name');
// ... interact with elements
self::$driver->switchTo()->defaultContent();
```

3. **Element has dynamic ID**
```php
// Use CSS selector or XPath instead
WebDriverBy::cssSelector('[data-field="name"]')
WebDriverBy::xpath("//input[contains(@name, 'pattern')]")
```

4. **Element is hidden**
```php
// Check visibility first
$elements = self::$driver->findElements(WebDriverBy::id('my-element'));
if (count($elements) > 0 && $elements[0]->isDisplayed()) {
    // Interact with element
}
```

### "Stale element reference"

**Symptom:**
```
StaleElementReferenceException: Element is no longer attached to the DOM
```

**Solution:** Re-find the element after page updates:
```php
// DON'T do this
$element = self::$driver->findElement(WebDriverBy::id('my-element'));
$this->submitForm('form');
$element->click();  // Stale!

// DO this instead
$this->submitForm('form');
$element = self::$driver->findElement(WebDriverBy::id('my-element'));
$element->click();
```

### "Element not interactable"

**Symptom:**
```
ElementNotInteractableException: element not interactable
```

**Solutions:**

1. **Scroll element into view**
```php
$element = self::$driver->findElement(WebDriverBy::id('button'));
self::$driver->executeScript("arguments[0].scrollIntoView(true);", [$element]);
sleep(1);
$element->click();
```

2. **Wait for element to be clickable**
```php
self::$driver->wait(10)->until(
    WebDriverExpectedCondition::elementToBeClickable(
        WebDriverBy::id('button')
    )
)->click();
```

3. **Element covered by another element**
```php
// Use JavaScript click
self::$driver->executeScript("document.getElementById('button').click();");
```

## Form Issues

### Dropdown Not Selecting Value

**For Semantic UI dropdowns:**
```php
// Click dropdown to open
$dropdown = self::$driver->findElement(WebDriverBy::id('dropdown-id'));
$dropdown->click();
sleep(1);  // Wait for animation

// Find and click option
$option = self::$driver->findElement(
    WebDriverBy::cssSelector('#dropdown-id .menu .item[data-value="value"]')
);
$option->click();
sleep(1);  // Wait for selection
```

### Checkbox State Not Changing

**For Semantic UI checkboxes:**
```php
// Click the label, not the input
$checkbox = self::$driver->findElement(
    WebDriverBy::cssSelector('.ui.checkbox input[name="fieldname"]')
);
$label = $checkbox->findElement(WebDriverBy::xpath('./following-sibling::label'));
$label->click();
```

### Form Validation Errors

**Check for validation messages:**
```php
$this->submitForm('form-id');
sleep(1);

// Check for error messages
$errors = self::$driver->findElements(
    WebDriverBy::cssSelector('.field.error .prompt')
);
if (count($errors) > 0) {
    foreach ($errors as $error) {
        echo "Validation error: " . $error->getText() . "\n";
    }
}
```

## Timing Issues

### Tests Fail Intermittently

**Solutions:**

1. **Add waitForAjax() after navigation**
```php
$this->clickSidebarMenuItemByHref("/admin-cabinet/page/");
$this->waitForAjax();
```

2. **Use explicit waits instead of sleep()**
```php
// Instead of sleep(3)
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::id('expected-element')
    )
);
```

3. **Wait for specific condition**
```php
self::$driver->wait(10)->until(function($driver) {
    $element = $driver->findElement(WebDriverBy::id('status'));
    return $element->getText() === 'Complete';
});
```

### AJAX Requests Not Completing

```php
// Increase timeout
$this->waitForAjax(30);  // 30 seconds

// Or check jQuery manually
self::$driver->wait(30)->until(function($driver) {
    return $driver->executeScript('return typeof jQuery !== "undefined" && jQuery.active === 0');
});
```

## Authentication Issues

### "Login failed" or Stuck on Login Page

**Solutions:**

1. **Check credentials in config:**
```json
{
  "login": "admin",
  "password": "123456789MikoPBX#1",
  "password2": "admin"
}
```

2. **Wait for login form to load:**
```php
self::$driver->wait(10)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::id('login-form')
    )
);
```

3. **Check for error messages:**
```php
$errors = self::$driver->findElements(
    WebDriverBy::cssSelector('.ui.error.message')
);
```

### Session Expires During Test

**For long tests, extend session:**
```php
// Navigate to any page to refresh session
$this->clickSidebarMenuItemByHref("/admin-cabinet/extensions/index/");
```

## Debug Techniques

### Screenshot on Failure

```php
try {
    // Test code
} catch (\Exception $e) {
    $screenshot = self::$driver->takeScreenshot();
    file_put_contents('/tmp/failure.png', $screenshot);
    throw $e;
}
```

### Console Logs

```php
$logs = self::$driver->manage()->getLog('browser');
foreach ($logs as $log) {
    echo $log['message'] . "\n";
}
```

### Network Requests

Check BrowserStack dashboard for:
- Network tab shows all requests
- HAR file can be downloaded
- Response codes and timing

### Page Source

```php
$source = self::$driver->getPageSource();
file_put_contents('/tmp/page.html', $source);
```

## BrowserStack Specific

### View Test Recording

1. Go to https://automate.browserstack.com/dashboard/
2. Find your session by name or time
3. Watch video recording
4. Check screenshots at key moments

### Check Session Logs

In BrowserStack dashboard:
- Text Logs: WebDriver commands
- Network Logs: HTTP requests
- Console Logs: JavaScript errors

### Session Timeout

Default session timeout is 90 seconds of inactivity.

**Extend timeout:**
```php
// In capabilities
'browserstack.idleTimeout' => 300  // 5 minutes
```

### Parallel Tests

To run tests in parallel:
```bash
# Run multiple test files simultaneously
php vendor/bin/phpunit --processes=4 tests/AdminCabinet/Tests/
```

Note: Requires adequate BrowserStack parallel session quota.
