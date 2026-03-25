<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers;

require_once 'Globals.php';

use MikoPBX\Core\System\{BeanstalkClient, Notifications, SystemMessages, Util};
use MikoPBX\Core\System\Mail\Builders\MissedCallNotificationBuilder;
use MikoPBX\Core\System\Mail\Builders\LoginNotificationBuilder;
use MikoPBX\Core\System\Mail\Builders\VoicemailNotificationBuilder;
use MikoPBX\Core\System\Mail\EmailNotificationService;
use MikoPBX\Core\System\Mail\NotificationQueueHelper;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;

/**
 * WorkerNotifyByEmail is a worker class responsible for sending notifications.
 *
 * @package MikoPBX\Core\Workers
 */
class WorkerNotifyByEmail extends WorkerBase
{
    /**
     * Entry point for the worker.
     *
     * @param array<int, string> $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {
        $client = new BeanstalkClient(__CLASS__);
        if ($client->isConnected() === false) {
            SystemMessages::sysLogMsg(self::class, 'Fail connect to beanstalkd...');
            sleep(2);
            return;
        }
        $client->subscribe(__CLASS__, [$this, 'workerNotifyByEmail']);
        $client->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        while ($this->needRestart === false) {
            $client->wait();
        }
    }

    /**
     * The main worker method for sending email notifications.
     *
     * Handles three types of notification formats:
     * 1. Typed notifications (new format): notification_type + builder_data
     * 2. Login notifications (legacy): type='login', contains username, IP, user agent
     * 3. Missed call notifications (legacy): contains from_number, to_number, start time
     *
     * @param mixed $message The message received from Beanstalkd.
     * @return void
     */
    public function workerNotifyByEmail(mixed $message): void
    {
        $phonesCid = [];
        $notifier = new Notifications();

        /** @var BeanstalkClient $message */
        $data = json_decode($message->getBody(), true);

        // NEW: Check if this is a typed notification (builder-based)
        if (isset($data['notification_type'])) {
            $this->handleTypedNotification($data, $notifier);
            return;
        }

        // LEGACY: Check if this is a login notification
        if (isset($data[0]['type']) && $data[0]['type'] === 'login') {
            $this->handleLoginNotifications($data, $notifier);
            return;
        }

        // LEGACY: Otherwise handle as missed call notifications
        // Group calls by recipient and send using new Builder system

        $emailService = new EmailNotificationService();
        $processedCalls = []; // Track sent notifications to prevent duplicates

        foreach ($data as $call) {
            // Generate unique key to prevent duplicate notifications
            $keyHash = $call['email'] . $call['start'] . $call['from_number'] . $call['to_number'];

            if (in_array($keyHash, $processedCalls, true)) {
                continue;
            }

            // Resolve caller and extension names
            if (isset($phonesCid[$call['to_number']])) {
                $call['to_name'] = $phonesCid[$call['to_number']];
            } else {
                $call['to_name'] = Extensions::getCidByPhoneNumber($call['to_number']);
                $phonesCid[$call['to_number']] = $call['to_name'];
            }

            // Use caller name from CDR (CallerID name from provider/phonebook) if available,
            // otherwise fall back to Extensions lookup (internal users)
            $cdrCallerName = $call['from_name'] ?? '';
            if (!empty($cdrCallerName) && $cdrCallerName !== $call['from_number']) {
                $call['from_name'] = $cdrCallerName;
            } elseif (isset($phonesCid[$call['from_number']])) {
                $call['from_name'] = $phonesCid[$call['from_number']];
            } else {
                $call['from_name'] = Extensions::getCidByPhoneNumber($call['from_number']);
                $phonesCid[$call['from_number']] = $call['from_name'];
            }

            // Check if missed call notifications are enabled
            if (!PbxSettings::getValueByKey(PbxSettings::SEND_MISSED_CALL_NOTIFICATIONS)) {
                $processedCalls[] = $keyHash;
                continue; // Skip sending if disabled
            }

            // Send notification using Builder
            $builder = new MissedCallNotificationBuilder();
            $builder->setRecipient($call['email'])
                    ->setCallerId($call['from_number'])
                    ->setCallerName($call['from_name'])
                    ->setExtension($call['to_number'])
                    ->setExtensionName($call['to_name'])
                    ->setCallTime($call['start']);

            $emailService->sendNotification($builder, $notifier);

            $processedCalls[] = $keyHash;
        }

        sleep(1);
    }

    /**
     * Handle typed notification (builder-based format)
     *
     * Processes notifications sent via NotificationQueueHelper.
     * Reconstructs builder from queue data and sends email.
     * Handles attachments for voicemail notifications.
     *
     * @param array<string, mixed> $data Queue data with notification_type and builder_data
     * @param Notifications $notifier Notification service instance
     * @return void
     */
    private function handleTypedNotification(array $data, Notifications $notifier): void
    {
        try {
            // Reconstruct builder from queue data
            $builder = NotificationQueueHelper::rebuildFromQueueData($data);

            // Check if specific notification type is enabled
            if ($builder instanceof MissedCallNotificationBuilder) {
                if (!PbxSettings::getValueByKey(PbxSettings::SEND_MISSED_CALL_NOTIFICATIONS)) {
                    return; // Skip if missed call notifications disabled
                }
            } elseif ($builder instanceof VoicemailNotificationBuilder) {
                if (!PbxSettings::getValueByKey(PbxSettings::SEND_VOICEMAIL_NOTIFICATIONS)) {
                    return; // Skip if voicemail notifications disabled
                }
            } elseif ($builder instanceof LoginNotificationBuilder) {
                if (!PbxSettings::getValueByKey(PbxSettings::SEND_LOGIN_NOTIFICATIONS)) {
                    return; // Skip if login notifications disabled
                }
            }

            // Check if builder has attachment (voicemail)
            $attachmentFile = '';
            if ($builder instanceof VoicemailNotificationBuilder) {
                $attachmentFile = $builder->getRecordingFile();
            }

            // Send notification with optional attachment
            $emailService = new EmailNotificationService();
            $result = $emailService->sendNotification($builder, $notifier, $attachmentFile);

            // Clean up temporary recording file if exists
            if (!empty($attachmentFile) && file_exists($attachmentFile)) {
                unlink($attachmentFile);
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf('Cleaned up temporary recording file: %s', $attachmentFile),
                    LOG_DEBUG
                );
            }

            if ($result) {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'Successfully sent %s notification to: %s',
                        $data['notification_type'],
                        $builder->getRecipient()
                    ),
                    LOG_INFO
                );
            } else {
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    sprintf(
                        'Failed to send %s notification to: %s',
                        $data['notification_type'],
                        $builder->getRecipient()
                    ),
                    LOG_WARNING
                );
            }
        } catch (\Throwable $e) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                sprintf(
                    'Exception handling typed notification %s: %s',
                    $data['notification_type'] ?? 'unknown',
                    $e->getMessage()
                ),
                LOG_ERR
            );
        }
    }

    /**
     * Handle login notifications with deduplication
     *
     * Processes login notification jobs from queue. Implements deduplication
     * to prevent sending multiple emails for rapid repeated logins.
     *
     * @param array<int, array<string, mixed>> $notifications Array of login notification data
     * @param Notifications $notifier Notification service instance
     * @return void
     */
    private function handleLoginNotifications(array $notifications, Notifications $notifier): void
    {
        $emailService = new EmailNotificationService();

        // Deduplicate by email + username + IP within 5-minute window
        $deduplicationKey = [];
        $now = time();

        foreach ($notifications as $notification) {
            $email = $notification['email'] ?? '';
            $username = $notification['username'] ?? '';
            $ipAddress = $notification['ip_address'] ?? '';
            $timestamp = $notification['timestamp'] ?? $now;

            // Create deduplication key: email + username + IP + 5-minute window
            $window = floor($timestamp / 300) * 300; // 5-minute intervals
            $keyHash = md5($email . $username . $ipAddress . $window);

            // Skip if already sent in this window
            if (in_array($keyHash, $deduplicationKey, true)) {
                SystemMessages::sysLogMsg(__METHOD__, "Skipping duplicate login notification for {$username} from {$ipAddress}", LOG_DEBUG);
                continue;
            }

            $deduplicationKey[] = $keyHash;

            if (empty($email)) {
                SystemMessages::sysLogMsg(__METHOD__, "Skipping login notification - no email provided", LOG_WARNING);
                continue;
            }

            // Get admin panel URL
            $webPort = PbxSettings::getValueByKey(PbxSettings::WEB_PORT);
            $webHttpsPort = PbxSettings::getValueByKey(PbxSettings::WEB_HTTPS_PORT);
            $host = LanInterfaces::getExternalAddress();

            if (!empty($webHttpsPort) && $webHttpsPort !== '443') {
                $adminUrl = "https://{$host}:{$webHttpsPort}/admin-cabinet/";
            } elseif (!empty($webHttpsPort)) {
                $adminUrl = "https://{$host}/admin-cabinet/";
            } elseif (!empty($webPort) && $webPort !== '80') {
                $adminUrl = "http://{$host}:{$webPort}/admin-cabinet/";
            } else {
                $adminUrl = "http://{$host}/admin-cabinet/";
            }

            // Build notification
            $builder = new LoginNotificationBuilder();
            $builder->setRecipient($email)
                    ->setUsername($username)
                    ->setIpAddress($ipAddress)
                    ->setUserAgent($notification['user_agent'] ?? 'Unknown')
                    ->setLoginTime($notification['login_time'] ?? date('Y-m-d H:i:s T'))
                    ->setAdminUrl($adminUrl);

            // Send email
            $result = $emailService->sendNotification($builder, $notifier);

            if ($result) {
                SystemMessages::sysLogMsg(__METHOD__, "Login notification sent successfully to: {$email}", LOG_INFO);
            } else {
                SystemMessages::sysLogMsg(__METHOD__, "Failed to send login notification to: {$email}", LOG_WARNING);
            }
        }

        sleep(1);
    }
}

// Start a worker process
WorkerNotifyByEmail::startWorker($argv ?? []);
