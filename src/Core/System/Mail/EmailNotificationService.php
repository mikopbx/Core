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

namespace MikoPBX\Core\System\Mail;

use MikoPBX\Core\System\Mail\Builders\AbstractNotificationBuilder;
use MikoPBX\Core\System\Notifications;

/**
 * Class EmailNotificationService
 *
 * Facade service for sending email notifications using the new template system.
 * Provides simple interface while maintaining backward compatibility with legacy Notifications class.
 *
 * Key features:
 * - Uses builder pattern for notification configuration
 * - Renders modern HTML templates
 * - Delegates actual sending to legacy Notifications::sendMail()
 * - Supports both direct sending and queueing
 *
 * @package MikoPBX\Core\System\Mail
 */
class EmailNotificationService
{
    /**
     * Send email notification using builder
     *
     * Main method for sending notifications. Process:
     * 1. Validates builder configuration
     * 2. Renders HTML template
     * 3. Sends via legacy Notifications class (for backward compatibility)
     *
     * @param AbstractNotificationBuilder $builder Configured notification builder
     * @param Notifications|null $legacyNotifier Optional legacy notifier instance (for DI)
     * @param string $attachmentFile Optional file to attach (for voicemail recordings)
     * @return bool True if email sent successfully
     *
     * @example
     * $builder = new SmtpTestNotificationBuilder();
     * $builder->setRecipient('admin@example.com')
     *         ->setSmtpServer('smtp.gmail.com')
     *         ->setSmtpPort(587);
     *
     * $service = new EmailNotificationService();
     * $success = $service->sendNotification($builder);
     */
    public function sendNotification(
        AbstractNotificationBuilder $builder,
        ?Notifications $legacyNotifier = null,
        string $attachmentFile = ''
    ): bool {
        // Build HTML email first (this populates subject/mainMessage via buildVariables())
        try {
            $html = $builder->buildHtml();
        } catch (\Throwable $e) {
            // Log template rendering error
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                __CLASS__,
                'Failed to render email template: ' . $e->getMessage(),
                LOG_ERR
            );
            return false;
        }

        // Validate builder configuration (after buildHtml has populated fields)
        try {
            $builder->validate();
        } catch (\RuntimeException $e) {
            // Log validation error
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                __CLASS__,
                'Notification validation failed: ' . $e->getMessage(),
                LOG_ERR
            );
            return false;
        }

        // Get recipient and subject from builder
        $recipient = $builder->getRecipient();
        $subject = $builder->getSubject();

        // Use provided notifier or create new one
        $notifier = $legacyNotifier ?? new Notifications();

        // Send email via legacy system with optional attachment
        // This maintains backward compatibility and reuses existing SMTP configuration
        return $notifier->sendMail($recipient, $subject, $html, $attachmentFile);
    }

    /**
     * Send multiple notifications (batch)
     *
     * Efficiently sends multiple notifications with same configuration.
     * Useful for mass notifications (e.g., to all admins).
     *
     * @param AbstractNotificationBuilder $builder Template builder
     * @param array<int, string> $recipients Array of email addresses
     * @return array<string, bool> Map of recipient => success status
     *
     * @example
     * $admins = ['admin1@example.com', 'admin2@example.com'];
     * $results = $service->sendBatch($builder, $admins);
     * // Returns: ['admin1@example.com' => true, 'admin2@example.com' => false]
     */
    public function sendBatch(
        AbstractNotificationBuilder $builder,
        array $recipients
    ): array {
        $results = [];

        foreach ($recipients as $recipient) {
            // Clone builder to avoid state pollution
            $builderClone = clone $builder;
            $builderClone->setRecipient($recipient);

            $results[$recipient] = $this->sendNotification($builderClone);
        }

        return $results;
    }

    /**
     * Queue notification for later sending
     *
     * Useful for non-critical notifications that don't need immediate delivery.
     * Uses Beanstalk queue for async processing.
     *
     * @param AbstractNotificationBuilder $builder Notification builder
     * @return bool True if successfully queued
     *
     * @example
     * $builder = new SystemUpdatesNotificationBuilder();
     * // ... configure builder ...
     * $service->queueNotification($builder); // Returns immediately
     */
    public function queueNotification(AbstractNotificationBuilder $builder): bool
    {
        // Validate before queueing
        try {
            $builder->validate();
        } catch (\RuntimeException $e) {
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                __CLASS__,
                'Cannot queue invalid notification: ' . $e->getMessage(),
                LOG_ERR
            );
            return false;
        }

        // Serialize builder for queue
        $queueData = [
            'class' => get_class($builder),
            'recipient' => $builder->getRecipient(),
            'subject' => $builder->getSubject(),
            'html' => $builder->buildHtml(),
            'type' => $builder->getType()->value,
        ];

        // Add to Beanstalk queue (using WorkerNotifyByEmail tube)
        try {
            $client = new \MikoPBX\Core\System\BeanstalkClient(__CLASS__);
            $client->publish(json_encode($queueData), 'WorkerNotifyByEmail');
            return true;
        } catch (\Throwable $e) {
            \MikoPBX\Core\System\SystemMessages::sysLogMsg(
                __CLASS__,
                'Failed to queue notification: ' . $e->getMessage(),
                LOG_ERR
            );
            return false;
        }
    }

    /**
     * Test notification configuration without sending
     *
     * Validates builder and renders HTML without actually sending email.
     * Useful for testing and debugging notification templates.
     *
     * @param AbstractNotificationBuilder $builder Notification builder
     * @return array{valid: bool, html?: string, error?: string} Validation result
     *
     * @example
     * $result = $service->testNotification($builder);
     * if ($result['valid']) {
     *     echo "HTML preview: " . $result['html'];
     * } else {
     *     echo "Error: " . $result['error'];
     * }
     */
    public function testNotification(AbstractNotificationBuilder $builder): array
    {
        // Validate configuration
        try {
            $builder->validate();
        } catch (\RuntimeException $e) {
            return [
                'valid' => false,
                'error' => $e->getMessage()
            ];
        }

        // Try to render HTML
        try {
            $html = $builder->buildHtml();
            return [
                'valid' => true,
                'html' => $html
            ];
        } catch (\Throwable $e) {
            return [
                'valid' => false,
                'error' => 'Template rendering failed: ' . $e->getMessage()
            ];
        }
    }
}
