<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Core\System\Mail\Builders;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Mail\EmailTemplateEngine;
use MikoPBX\Core\System\Mail\EmailTemplateRenderer;
use MikoPBX\Core\System\Mail\NotificationType;
use Phalcon\Di\Di;

/**
 * Abstract class AbstractNotificationBuilder
 *
 * Base class for all email notification builders using Builder pattern.
 * Provides common functionality and enforces structure for concrete builders.
 *
 * Features:
 * - Fluent interface for configuration
 * - Automatic color scheme and icon from NotificationType
 * - Server information auto-population
 * - Translation support via TranslationProvider (respects WEB_ADMIN_LANGUAGE)
 * - HTML template rendering
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
abstract class AbstractNotificationBuilder
{
    /** Email recipient address */
    protected string $recipient = '';

    /** Server name/hostname */
    protected string $serverName = '';

    /** Notification type enum */
    protected NotificationType $type;

    /** Email subject line */
    protected string $subject = '';

    /** Preheader text (preview text in email clients) */
    protected string $preheaderText = '';

    /** Main message content */
    protected string $mainMessage = '';

    /** Dynamic HTML content (custom for each notification type) */
    protected string $dynamicContent = '';

    /** Footer message */
    protected string $footerMessage = '';

    /** Dependency injection container */
    protected ?\Phalcon\Di\DiInterface $di = null;

    /**
     * Constructor
     *
     * Initializes builder with notification type and auto-populates server info.
     *
     * @param NotificationType $type Notification type
     */
    public function __construct(NotificationType $type)
    {
        $this->type = $type;
        $this->di = Di::getDefault();

        // Auto-populate server name from settings
        $this->serverName = PbxSettings::getValueByKey(PbxSettings::PBX_NAME) ?: 'MikoPBX';

        // Footer will be translated at render time in buildCommonVariables()
        // to ensure correct language when builder is serialized across process boundaries
    }

    /**
     * Set email recipient
     *
     * @param string $recipient Email address
     * @return static For method chaining
     */
    public function setRecipient(string $recipient): static
    {
        $this->recipient = $recipient;
        return $this;
    }

    /**
     * Set server name
     *
     * Override auto-detected server name if needed.
     *
     * @param string $serverName Custom server name
     * @return static For method chaining
     */
    public function setServerName(string $serverName): static
    {
        $this->serverName = $serverName;
        return $this;
    }

    /**
     * Set email subject
     *
     * @param string $subject Subject line
     * @return static For method chaining
     */
    public function setSubject(string $subject): static
    {
        $this->subject = $subject;
        return $this;
    }

    /**
     * Set main message content
     *
     * @param string $message Main message text
     * @return static For method chaining
     */
    public function setMainMessage(string $message): static
    {
        $this->mainMessage = $message;
        return $this;
    }

    /**
     * Set footer message
     *
     * @param string $footer Footer text
     * @return static For method chaining
     */
    public function setFooterMessage(string $footer): static
    {
        $this->footerMessage = $footer;
        return $this;
    }

    /**
     * Get email recipient
     *
     * @return string Email address
     */
    public function getRecipient(): string
    {
        return $this->recipient;
    }

    /**
     * Get email subject
     *
     * @return string Subject line
     */
    public function getSubject(): string
    {
        return $this->subject;
    }

    /**
     * Get notification type
     *
     * @return NotificationType Notification type enum
     */
    public function getType(): NotificationType
    {
        return $this->type;
    }

    /**
     * Build template variables array
     *
     * Concrete builders must implement this method to provide
     * notification-specific variables.
     *
     * @return array<string, mixed> Template variables
     */
    abstract protected function buildVariables(): array;

    /**
     * Build common template variables
     *
     * Provides variables common to all notification types:
     * - Header colors and icon
     * - Server information
     * - Timestamp
     * - Language code
     * - Footer
     *
     * @return array<string, mixed> Common template variables
     */
    protected function buildCommonVariables(): array
    {
        $colorScheme = $this->type->getColorScheme();

        return [
            // Header configuration
            'HEADER_COLOR_START' => $colorScheme['start'],
            'HEADER_COLOR_END' => $colorScheme['end'],
            'NOTIFICATION_ICON' => $this->type->getIcon(),
            'EMAIL_TITLE' => $this->subject ?: $this->type->getDefaultTitle(),
            'EMAIL_SUBJECT' => $this->subject ?: $this->type->getDefaultTitle(),
            'PREHEADER_TEXT' => $this->preheaderText ?: $this->subject,

            // Server identification
            'SERVER_LABEL' => TranslationProvider::translate('ms_EmailNotification_Server'),
            'SERVER_NAME' => EmailTemplateRenderer::escapeHtml($this->serverName),
            'TIMESTAMP' => date('Y-m-d H:i:s'),

            // Main content
            'MAIN_MESSAGE' => $this->mainMessage,
            'DYNAMIC_CONTENT' => $this->dynamicContent,

            // Footer — translate at render time if not explicitly set
            'FOOTER_MESSAGE' => $this->footerMessage ?: TranslationProvider::translate('ms_EmailNotification_Footer_AutomatedNotification'),
            'IF_POWERED_BY' => true,
            'POWERED_BY_TEXT' => TranslationProvider::translate('ms_EmailNotification_Footer_PoweredBy') . ' <a href="https://www.mikopbx.com" style="color: #007bff; text-decoration: none;">MikoPBX</a>',

            // Default conditional sections (can be overridden)
            'IF_INFO_BOX' => false,
            'IF_DATA_TABLE' => false,
            'IF_CTA_BUTTON' => false,
            'IF_HELP_TEXT' => false,
            'IF_UNSUBSCRIBE' => false,
        ];
    }

    /**
     * Build complete HTML email
     *
     * Combines common and specific variables, then renders template.
     *
     * @return string Rendered HTML email
     */
    public function buildHtml(): string
    {
        // Get notification-specific variables
        $variables = $this->buildVariables();

        // Merge with common variables (specific variables override common)
        $allVariables = array_merge(
            $this->buildCommonVariables(),
            $variables
        );

        // Render template
        $engine = new EmailTemplateEngine();
        return $engine->render($allVariables);
    }

    /**
     * Build data table HTML from rows
     *
     * Helper method for creating parameter tables.
     *
     * @param array<int, array{label: string, value: string}> $rows Table rows
     * @return string HTML table rows
     */
    protected function buildDataTable(array $rows): string
    {
        return EmailTemplateRenderer::buildDataTableRows($rows);
    }

    /**
     * Build progress bar HTML
     *
     * Helper method for disk usage indicators.
     *
     * @param int $percentage Percentage (0-100)
     * @param string|null $color Optional custom color
     * @return string HTML progress bar
     */
    protected function buildProgressBar(int $percentage, ?string $color = null): string
    {
        return EmailTemplateRenderer::buildProgressBar($percentage, $color);
    }

    /**
     * Build info box HTML
     *
     * Helper method for warnings, tips, etc.
     *
     * @param string $content Box content
     * @param string $borderColor Border accent color
     * @return string HTML info box
     */
    protected function buildInfoBox(string $content, string $borderColor = '#007bff'): string
    {
        return EmailTemplateRenderer::buildInfoBox($content, $borderColor);
    }

    /**
     * Build CTA button HTML
     *
     * Helper method for call-to-action buttons.
     *
     * @param string $url Button destination
     * @param string $text Button text
     * @param string $color Button color
     * @return string HTML button
     */
    protected function buildButton(string $url, string $text, string $color = '#007bff'): string
    {
        return EmailTemplateRenderer::buildButton($url, $text, $color);
    }

    /**
     * Validate builder state before rendering
     *
     * Checks that required fields are set.
     * Throws exception if validation fails.
     *
     * @return void
     * @throws \RuntimeException If validation fails
     */
    public function validate(): void
    {
        if (empty($this->recipient)) {
            throw new \RuntimeException('Email recipient is required');
        }

        if (!filter_var($this->recipient, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('Invalid email address: ' . $this->recipient);
        }
    }

    /**
     * Serialize builder to array for queue storage
     *
     * Converts builder state to array for Beanstalk queue.
     * Concrete builders can override to include additional fields.
     *
     * @return array<string, mixed> Serialized builder data
     */
    public function toArray(): array
    {
        return [
            'recipient' => $this->recipient,
            'serverName' => $this->serverName,
            'subject' => $this->subject,
            'preheaderText' => $this->preheaderText,
            'mainMessage' => $this->mainMessage,
            'dynamicContent' => $this->dynamicContent,
            'footerMessage' => $this->footerMessage,
        ];
    }

    /**
     * Deserialize builder from array
     *
     * Restores builder state from queue data.
     * Concrete builders can override to restore additional fields.
     *
     * @param array<string, mixed> $data Serialized builder data
     * @return static For method chaining
     */
    public function fromArray(array $data): static
    {
        if (isset($data['recipient'])) {
            $this->recipient = $data['recipient'];
        }
        if (isset($data['serverName'])) {
            $this->serverName = $data['serverName'];
        }
        if (isset($data['subject'])) {
            $this->subject = $data['subject'];
        }
        if (isset($data['preheaderText'])) {
            $this->preheaderText = $data['preheaderText'];
        }
        if (isset($data['mainMessage'])) {
            $this->mainMessage = $data['mainMessage'];
        }
        if (isset($data['dynamicContent'])) {
            $this->dynamicContent = $data['dynamicContent'];
        }
        if (isset($data['footerMessage'])) {
            $this->footerMessage = $data['footerMessage'];
        }

        return $this;
    }
}
