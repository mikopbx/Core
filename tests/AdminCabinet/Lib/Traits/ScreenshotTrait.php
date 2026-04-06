<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Traits;

use RuntimeException;

/**
 * Trait ScreenshotTrait
 * Handles screenshot functionality in tests
 */
trait ScreenshotTrait
{
    /**
     * Take screenshot of current page state
     *
     * @param string $name Screenshot name
     * @return string Path to saved screenshot, or empty string if directory creation fails
     */
    protected function takeScreenshot(string $name): string
    {
        $tempDir = sys_get_temp_dir();
        if (!is_dir($tempDir)) {
            $tempDir = '/tmp';
        }

        $screenshotDir = sprintf(
            '%s/%s',
            $tempDir,
            self::CONFIG['test']['screenshot_dir']
        );

        if (!is_dir($screenshotDir) && !@mkdir($screenshotDir, 0777, true) && !is_dir($screenshotDir)) {
            self::annotate("Warning: Cannot create screenshot directory: $screenshotDir");
            return '';
        }

        $filename = sprintf(
            '%s/%s_%s_%s.png',
            $screenshotDir,
            date('Y-m-d_H-i-s'),
            $this->getName(),
            preg_replace('/[^a-zA-Z0-9_-]/', '_', $name)
        );

        self::$driver->takeScreenshot($filename);
        self::annotate("Screenshot saved: $filename");

        return $filename;
    }

    /**
     * Take element screenshot
     *
     * @param string $xpath Element xpath
     * @param string $name Screenshot name
     * @return string Path to saved screenshot
     */
    protected function takeElementScreenshot(string $xpath, string $name): string
    {
        $element = $this->findElementSafely($xpath);
        if (!$element) {
            throw new RuntimeException("Element not found for screenshot: $xpath");
        }

        $this->scrollIntoView($element);
        return $this->takeScreenshot($name);
    }
}