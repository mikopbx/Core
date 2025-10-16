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

        $template_body = PbxSettings::getValueByKey(PbxSettings::MAIL_TPL_MISSED_CALL_BODY);
        $template_subject = PbxSettings::getValueByKey(PbxSettings::MAIL_TPL_MISSED_CALL_SUBJECT);

        // Set default subject if not provided
        if (empty($template_subject)) {
            $template_subject = Util::translate("You have missing call") . ' <-- NOTIFICATION_CALLERID';
        }
        $template_Footer = PbxSettings::getValueByKey(PbxSettings::MAIL_TPL_MISSED_CALL_FOOTER);
        $emails = [];

        $tmpArray = [];
        foreach ($data as $call) {
            $keyHash = $call['email'] . $call['start'] . $call['from_number'] . $call['to_number'];
            // Skip duplicate emails
            if (in_array($keyHash, $tmpArray, true)) {
                continue;
            }
            if (isset($phonesCid[$call['to_number']])) {
                $call['to_name'] = $phonesCid[$call['to_number']];
            } else {
                $call['to_name'] = Extensions::getCidByPhoneNumber($call['to_number']);
                $phonesCid[$call['to_number']] = $call['to_name'];
            }
            if (isset($phonesCid[$call['from_number']])) {
                $call['from_name'] = $phonesCid[$call['from_number']];
            } else {
                $call['from_name'] = Extensions::getCidByPhoneNumber($call['from_number']);
                $phonesCid[$call['from_number']] = $call['from_name'];
            }
            $tmpArray[] = $keyHash;
            if (!isset($emails[$call['email']])) {
                $emails[$call['email']] = [
                    'subject' => $this->replaceParams($template_subject, $call),
                    'body' => '',
                    'footer' => $this->replaceParams($template_Footer, $call),
                ];
            }
            if (!empty($template_body)) {
                $email = $this->replaceParams($template_body, $call);
                $emails[$call['email']]['body'] .= "$email <br><hr><br>";
            }
        }
        // Use new template system for beautiful missed call notifications
        $emailService = new EmailNotificationService();

        foreach ($emails as $to => $email) {
            // Extract first call data for this recipient (for basic info)
            $firstCall = null;
            foreach ($data as $call) {
                if ($call['email'] === $to) {
                    $firstCall = $call;
                    break;
                }
            }

            if ($firstCall) {
                // Use new builder for modern HTML email
                $builder = new MissedCallNotificationBuilder();
                $builder->setRecipient($to)
                        ->setCallerId($firstCall['from_number'])
                        ->setCallerName($firstCall['from_name'])
                        ->setExtension($firstCall['to_number'])
                        ->setExtensionName($firstCall['to_name'])
                        ->setCallTime($firstCall['start']);

                $emailService->sendNotification($builder, $notifier);
            } else {
                // Fallback to legacy method if no call data
                $subject = $email['subject'];
                $body = "{$email['body']}<br>{$email['footer']}";
                $notifier->sendMail($to, $subject, $body);
            }
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
            $externalIp = PbxSettings::getValueByKey(PbxSettings::EXTERNAL_SIP_IP_ADDR);

            if (!empty($webHttpsPort) && $webHttpsPort !== '443') {
                $adminUrl = "https://{$externalIp}:{$webHttpsPort}/admin-cabinet/";
            } elseif (!empty($webHttpsPort)) {
                $adminUrl = "https://{$externalIp}/admin-cabinet/";
            } elseif (!empty($webPort) && $webPort !== '80') {
                $adminUrl = "http://{$externalIp}:{$webPort}/admin-cabinet/";
            } else {
                $adminUrl = "http://{$externalIp}/admin-cabinet/";
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

    /**
     * Replaces the placeholders in the source string with the provided parameters.
     *
     * @param string $src The source string.
     * @param array<string, mixed> $params The parameters to replace.
     * @return string The modified string.
     */
    private function replaceParams(string $src, array $params): string
    {
        return str_replace(
            [
                "\n",
                "NOTIFICATION_MISSEDCAUSE",
                "NOTIFICATION_CALLERID",
                "NOTIFICATION_TO",
                "NOTIFICATION_NAME_TO",
                "NOTIFICATION_NAME_FROM",
                "NOTIFICATION_DURATION",
                "NOTIFICATION_DATE"
            ],
            [
                "<br>",
                'NOANSWER',
                $params['from_number'],
                $params['to_number'],
                $params['to_name'],
                $params['from_name'],
                $params['duration'],
                explode('.', $params['start'])[0]
            ],
            $src
        );
    }
}

// Start a worker process
WorkerNotifyByEmail::startWorker($argv ?? []);
