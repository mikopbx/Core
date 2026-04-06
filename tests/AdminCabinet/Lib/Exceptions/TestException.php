<?php

namespace MikoPBX\Tests\AdminCabinet\Lib\Exceptions;

use Exception;
use Throwable;

/**
 * Custom exception class for test failures
 */
class TestException extends Exception
{
    /**
     * Test context data
     *
     * @var array
     */
    private array $context;

    /**
     * Screenshot path if available
     *
     * @var string|null
     */
    private ?string $screenshotPath;

    /**
     * Page source path if available
     *
     * @var string|null
     */
    private ?string $pageSourcePath;

    /**
     * TestException constructor
     *
     * @param string $message Error message
     * @param int $code Error code
     * @param Throwable|null $previous Previous exception
     * @param array $context Additional context data
     * @param string|null $screenshotPath Path to failure screenshot
     * @param string|null $pageSourcePath Path to page source
     */
    public function __construct(
        string $message = "",
        int $code = 0,
        ?Throwable $previous = null,
        array $context = [],
        ?string $screenshotPath = null,
        ?string $pageSourcePath = null
    ) {
        parent::__construct($message, $code, $previous);

        $this->context = $context;
        $this->screenshotPath = $screenshotPath;
        $this->pageSourcePath = $pageSourcePath;
    }

    /**
     * Create exception instance with context
     *
     * @param string $message Error message
     * @param array $context Context data
     * @param Throwable|null $previous Previous exception
     * @return self
     */
    public static function withContext(
        string $message,
        array $context,
        ?Throwable $previous = null
    ): self {
        return new self(
            $message,
            0,
            $previous,
            $context
        );
    }

    /**
     * Create exception instance with screenshot
     *
     * @param string $message Error message
     * @param string $screenshotPath Path to screenshot
     * @param Throwable|null $previous Previous exception
     * @return self
     */
    public static function withScreenshot(
        string $message,
        string $screenshotPath,
        ?Throwable $previous = null
    ): self {
        return new self(
            $message,
            0,
            $previous,
            [],
            $screenshotPath
        );
    }

    /**
     * Create exception instance with full debug info
     *
     * @param string $message Error message
     * @param array $context Context data
     * @param string $screenshotPath Screenshot path
     * @param string $pageSourcePath Page source path
     * @param Throwable|null $previous Previous exception
     * @return self
     */
    public static function withDebugInfo(
        string $message,
        array $context,
        string $screenshotPath,
        string $pageSourcePath,
        ?Throwable $previous = null
    ): self {
        return new self(
            $message,
            0,
            $previous,
            $context,
            $screenshotPath,
            $pageSourcePath
        );
    }

    /**
     * Get exception context data
     *
     * @return array
     */
    public function getContext(): array
    {
        return $this->context;
    }

    /**
     * Get screenshot path
     *
     * @return string|null
     */
    public function getScreenshotPath(): ?string
    {
        return $this->screenshotPath;
    }

    /**
     * Get page source path
     *
     * @return string|null
     */
    public function getPageSourcePath(): ?string
    {
        return $this->pageSourcePath;
    }

    /**
     * Get formatted error message with all available info
     *
     * @return string
     */
    public function getDetailedMessage(): string
    {
        $message = $this->getMessage();

        if ($this->context) {
            $message .= "\nContext: " . json_encode($this->context, JSON_PRETTY_PRINT);
        }

        if ($this->screenshotPath) {
            $message .= "\nScreenshot: " . $this->screenshotPath;
        }

        if ($this->pageSourcePath) {
            $message .= "\nPage Source: " . $this->pageSourcePath;
        }

        if ($this->getPrevious()) {
            $message .= "\nCaused by: " . $this->getPrevious()->getMessage();
        }

        return $message;
    }

    /**
     * String representation of the exception
     *
     * @return string
     */
    public function __toString(): string
    {
        return $this->getDetailedMessage();
    }
}