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

use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Mail\Builders\AbstractNotificationBuilder;
use MikoPBX\Core\System\Mail\Builders\VoicemailNotificationBuilder;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\Workers\WorkerNotifyByEmail;

/**
 * Class NotificationQueueHelper
 *
 * Centralized helper for queueing email notifications through WorkerNotifyByEmail.
 * Provides consistent interface for both async (queue) and sync (direct) sending.
 *
 * Key features:
 * - Automatic fallback to sync sending if queue unavailable
 * - Priority support for critical notifications
 * - Serialization/deserialization of builders
 * - Consistent error handling and logging
 *
 * @package MikoPBX\Core\System\Mail
 */
class NotificationQueueHelper
{
    /**
     * Priority levels for Beanstalk queue
     * Lower number = higher priority
     */
    public const int PRIORITY_CRITICAL = 100;    // SSH password, system problems
    public const int PRIORITY_HIGH = 512;        // Disk space, security alerts
    public const int PRIORITY_NORMAL = 1024;     // Login notifications, missed calls
    public const int PRIORITY_LOW = 2048;        // SMTP tests, routine notifications

    /**
     * Queue notification for async sending via WorkerNotifyByEmail
     *
     * Main method for queueing notifications. Process:
     * 1. Validates builder configuration
     * 2. Serializes builder data
     * 3. Publishes to Beanstalk queue
     * 4. Falls back to sync sending if queue unavailable
     *
     * @param AbstractNotificationBuilder $builder Configured notification builder
     * @param bool $async If true, queue for async sending; if false, send immediately
     * @param int $priority Beanstalk priority (lower = higher priority)
     * @return bool True if queued/sent successfully
     *
     * @example
     * // Queue critical notification
     * $builder = new SshPasswordChangedNotificationBuilder();
     * $builder->setRecipient('admin@example.com')->...;
     * NotificationQueueHelper::queueOrSend($builder, async: true, priority: NotificationQueueHelper::PRIORITY_CRITICAL);
     *
     * @example
     * // Send immediately (sync)
     * NotificationQueueHelper::queueOrSend($builder, async: false);
     */
    public static function queueOrSend(
        AbstractNotificationBuilder $builder,
        bool $async = true,
        int $priority = self::PRIORITY_NORMAL
    ): bool {
        // If sync sending requested, use direct method
        if (!$async) {
            return self::sendDirect($builder);
        }

        // Try async queueing
        try {
            return self::queueAsync($builder, $priority);
        } catch (\Throwable $e) {
            // Log queueing failure
            SystemMessages::sysLogMsg(
                __CLASS__,
                sprintf(
                    'Failed to queue %s notification, falling back to direct send: %s',
                    $builder->getType()->value,
                    $e->getMessage()
                ),
                LOG_WARNING
            );

            // Fallback to sync sending
            return self::sendDirect($builder);
        }
    }

    /**
     * Queue notification asynchronously via Beanstalk
     *
     * Internal method that handles actual queueing logic.
     *
     * @param AbstractNotificationBuilder $builder Notification builder
     * @param int $priority Beanstalk priority
     * @return bool True if successfully queued
     * @throws \Exception If queueing fails
     */
    private static function queueAsync(AbstractNotificationBuilder $builder, int $priority): bool
    {
        // Validate builder before queueing
        // This throws RuntimeException if validation fails
        $builder->validate();

        // Create Beanstalk client
        $client = new BeanstalkClient(WorkerNotifyByEmail::class);

        if (!$client->isConnected()) {
            throw new \RuntimeException('Failed to connect to Beanstalk server');
        }

        // Serialize builder data for queue
        $queueData = [
            'notification_type' => $builder->getType()->value,
            'builder_class' => get_class($builder),
            'builder_data' => $builder->toArray(),
            'timestamp' => time(),
        ];

        // Publish to queue
        $client->publish(
            json_encode($queueData),
            WorkerNotifyByEmail::class,
            $priority
        );

        // Log successful queueing
        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                'Queued %s notification for %s (priority: %d)',
                $builder->getType()->value,
                $builder->getRecipient(),
                $priority
            ),
            LOG_INFO
        );

        return true;
    }

    /**
     * Send notification directly (synchronously)
     *
     * Fallback method when queue is unavailable or sync sending is requested.
     *
     * @param AbstractNotificationBuilder $builder Notification builder
     * @return bool True if sent successfully
     */
    private static function sendDirect(AbstractNotificationBuilder $builder): bool
    {
        SystemMessages::sysLogMsg(
            __CLASS__,
            sprintf(
                'Sending %s notification directly (sync) to %s',
                $builder->getType()->value,
                $builder->getRecipient()
            ),
            LOG_INFO
        );

        $attachmentFile = '';
        if ($builder instanceof VoicemailNotificationBuilder) {
            $attachmentFile = $builder->getRecordingFile();
        }

        $service = new EmailNotificationService();
        return $service->sendNotification($builder, attachmentFile: $attachmentFile);
    }

    /**
     * Reconstruct builder from queue data
     *
     * Used by WorkerNotifyByEmail to deserialize queued notifications.
     *
     * @param array<string, mixed> $queueData Data from queue
     * @return AbstractNotificationBuilder Reconstructed builder
     * @throws \RuntimeException If builder class doesn't exist or data is invalid
     */
    public static function rebuildFromQueueData(array $queueData): AbstractNotificationBuilder
    {
        $builderClass = $queueData['builder_class'] ?? '';

        if (!class_exists($builderClass)) {
            throw new \RuntimeException("Builder class not found: {$builderClass}");
        }

        if (!is_subclass_of($builderClass, AbstractNotificationBuilder::class)) {
            throw new \RuntimeException("Invalid builder class: {$builderClass}");
        }

        $builderData = $queueData['builder_data'] ?? [];

        /** @var AbstractNotificationBuilder $builder */
        $builder = new $builderClass();
        $builder->fromArray($builderData);

        return $builder;
    }

    /**
     * Get recommended priority for notification type
     *
     * Returns appropriate priority level based on notification criticality.
     *
     * @param NotificationType $type Notification type
     * @return int Beanstalk priority value
     */
    public static function getPriorityForType(NotificationType $type): int
    {
        return match($type) {
            NotificationType::SSH_PASSWORD_CHANGED,
            NotificationType::SYSTEM_PROBLEMS => self::PRIORITY_CRITICAL,

            NotificationType::DISK_SPACE_WARNING => self::PRIORITY_HIGH,

            NotificationType::LOGIN_NOTIFICATION,
            NotificationType::MISSED_CALL => self::PRIORITY_NORMAL,

            NotificationType::SMTP_TEST,
            NotificationType::VOICEMAIL,
            NotificationType::SIP_CREDENTIALS,
            NotificationType::SYSTEM_UPDATES => self::PRIORITY_LOW,
        };
    }

    /**
     * Queue notification with automatic priority
     *
     * Convenience method that determines priority automatically based on type.
     *
     * @param AbstractNotificationBuilder $builder Notification builder
     * @param bool $async Use async queueing
     * @return bool True if queued/sent successfully
     */
    public static function queueAuto(AbstractNotificationBuilder $builder, bool $async = true): bool
    {
        $priority = self::getPriorityForType($builder->getType());
        return self::queueOrSend($builder, $async, $priority);
    }
}
