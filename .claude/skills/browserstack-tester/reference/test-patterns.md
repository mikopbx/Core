# BrowserStack Test Patterns

## Test Class Structure

```php
<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use Facebook\WebDriver\WebDriverExpectedCondition;
use GuzzleHttp\Exception\GuzzleException;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class MyFeatureTest extends MikoPBXTestsBase
{
    /**
     * @throws GuzzleException
     * @throws \Exception
     */
    public function setUp(): void
    {
        parent::setUp();
        $this->setSessionName("Test: My Feature Description");
    }

    /**
     * Test description
     *
     * @dataProvider dataProvider  // Optional
     * @depends previousTest       // Optional - run after another test
     */
    public function testMyFeature(array $params): void
    {
        // Test implementation
    }

    public function dataProvider(): array
    {
        return [
            'scenario1' => [['key' => 'value']],
        ];
    }
}
```

## Form Interaction Patterns

### Input Fields

```php
// Simple input
$this->changeInputField('fieldName', 'new value');

// Clear and type
$input = self::$driver->findElement(WebDriverBy::name('fieldName'));
$input->clear();
$input->sendKeys('new value');

// With explicit wait
self::$driver->wait(10)->until(
    WebDriverExpectedCondition::elementToBeClickable(
        WebDriverBy::name('fieldName')
    )
)->sendKeys('value');
```

### Dropdowns (Semantic UI)

```php
// Using helper method
$this->selectDropdownItem('dropdown-id', 'option-value');

// Manual selection
$dropdown = self::$driver->findElement(WebDriverBy::id('dropdown-id'));
$dropdown->click();
sleep(1); // Wait for animation
$option = $dropdown->findElement(
    WebDriverBy::cssSelector('.item[data-value="option-value"]')
);
$option->click();
```

### Checkboxes

```php
// Using helper
$this->changeCheckBoxState('checkbox-name', true);  // Check
$this->changeCheckBoxState('checkbox-name', false); // Uncheck

// Manual toggle
$checkbox = self::$driver->findElement(WebDriverBy::name('checkbox-name'));
if ($checkbox->isSelected() !== $expectedState) {
    $checkbox->click();
}
```

### File Upload

```php
$fileInput = self::$driver->findElement(WebDriverBy::cssSelector('input[type="file"]'));
$fileInput->sendKeys('/path/to/file.mp3');
```

## Navigation Patterns

### Sidebar Menu

```php
$this->clickSidebarMenuItemByHref("/admin-cabinet/extensions/index/");
$this->waitForAjax();
```

### Tabs

```php
// By tab index
$this->changeTabOnCurrentPage('0');  // First tab
$this->changeTabOnCurrentPage('1');  // Second tab

// By data attribute
$tab = self::$driver->findElement(
    WebDriverBy::cssSelector('[data-tab="settings"]')
);
$tab->click();
```

### Modal Dialogs

```php
// Wait for modal to appear
$modalXpath = "//div[contains(@class, 'modal') and contains(@class, 'visible')]";
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::xpath($modalXpath)
    )
);

// Click confirm button
$confirmButton = self::$driver->findElement(WebDriverBy::id('confirm-button'));
$confirmButton->click();

// Wait for modal to close
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::invisibilityOfElementLocated(
        WebDriverBy::xpath($modalXpath)
    )
);
```

## Table Patterns

### Find Row by Text

```php
$xpath = "//table[@id='my-table']//tr[contains(., 'search text')]";
$row = self::$driver->findElement(WebDriverBy::xpath($xpath));
```

### Click Edit Button in Row

```php
$editButton = $row->findElement(WebDriverBy::cssSelector('.edit-button'));
$editButton->click();
```

### Get All Rows

```php
$rows = self::$driver->findElements(
    WebDriverBy::cssSelector('#my-table tbody tr:not(.template)')
);
foreach ($rows as $row) {
    $cellValue = $row->findElement(WebDriverBy::cssSelector('td:first-child'))->getText();
}
```

### DataTable with Dynamic Content

```php
// Wait for table to load
$this->waitForAjax();
sleep(1); // Additional wait for DataTable rendering

// Scroll to load more rows if needed
$table = self::$driver->findElement(WebDriverBy::id('my-table'));
self::$driver->executeScript("arguments[0].scrollIntoView(true);", [$table]);
```

## Assertion Patterns

### Field Values

```php
$this->assertInputFieldValueEqual('fieldName', 'expected value');
$this->assertCheckBoxStageIsEqual('checkboxName', true);
$this->assertMenuItemSelected('dropdownId', 'expected-value');
```

### Element Visibility

```php
$element = self::$driver->findElement(WebDriverBy::id('my-element'));
$this->assertTrue($element->isDisplayed(), 'Element should be visible');
$this->assertFalse($element->isDisplayed(), 'Element should be hidden');
```

### Element Existence

```php
$elements = self::$driver->findElements(WebDriverBy::id('optional-element'));
$this->assertCount(1, $elements, 'Element should exist');
$this->assertCount(0, $elements, 'Element should not exist');
```

### Text Content

```php
$element = self::$driver->findElement(WebDriverBy::id('message'));
$this->assertStringContainsString('success', $element->getText());
```

## Wait Patterns

### Explicit Wait

```php
// Wait for element to be visible
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::visibilityOfElementLocated(
        WebDriverBy::id('element-id')
    )
);

// Wait for element to be clickable
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::elementToBeClickable(
        WebDriverBy::id('button-id')
    )
);

// Wait for text to appear
self::$driver->wait(10, 500)->until(
    WebDriverExpectedCondition::textToBePresentInElement(
        WebDriverBy::id('status'),
        'Complete'
    )
);
```

### AJAX Wait

```php
$this->waitForAjax();  // Built-in helper

// Manual jQuery AJAX wait
self::$driver->wait(30)->until(function() {
    return self::$driver->executeScript('return jQuery.active == 0');
});
```

### Fixed Sleep (Use Sparingly)

```php
sleep(1);  // Only when animations/transitions need time
usleep(500000);  // 500ms
```

## JavaScript Execution

```php
// Execute script
self::$driver->executeScript("$('#my-element').click();");

// Get return value
$value = self::$driver->executeScript("return $('#field').val();");

// Pass arguments
self::$driver->executeScript(
    "arguments[0].scrollIntoView(true);",
    [$element]
);
```

## Test Dependencies

```php
/**
 * First test - creates data
 */
public function testCreateItem(): void
{
    // Create item
}

/**
 * Second test - depends on first
 * @depends testCreateItem
 */
public function testModifyItem(): void
{
    // Modify item created in first test
}

/**
 * Third test - depends on second
 * @depends testModifyItem
 */
public function testDeleteItem(): void
{
    // Delete item
}
```

## Data Providers

```php
/**
 * @dataProvider extensionDataProvider
 */
public function testCreateExtension(array $params): void
{
    $this->changeInputField('number', $params['number']);
    $this->changeInputField('name', $params['name']);
    // ...
}

public function extensionDataProvider(): array
{
    return [
        'internal_extension' => [[
            'number' => '201',
            'name' => 'John Doe',
            'type' => 'internal',
        ]],
        'external_extension' => [[
            'number' => '202',
            'name' => 'Jane Doe',
            'type' => 'external',
        ]],
    ];
}
```

## Cleanup Pattern

```php
public function testFeatureWithCleanup(): void
{
    try {
        // Create test data
        $this->createTestItem();

        // Perform test
        $this->verifyItem();

    } finally {
        // Always cleanup, even if test fails
        $this->deleteTestItem();
    }
}
```
