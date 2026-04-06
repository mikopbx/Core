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

use MikoPBX\Core\System\Mail\EmailTemplateRenderer;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Mail\NotificationType;

/**
 * Class VoicemailNotificationBuilder
 *
 * Builder for voicemail message notifications.
 * Sent when new voicemail message is received.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class VoicemailNotificationBuilder extends AbstractNotificationBuilder
{
    private string $callerId = '';
    private string $callerName = '';
    private string $duration = '';
    private string $messageDate = '';
    private string $recordingFile = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::VOICEMAIL);

        // Subject and preheader are translated at render time in buildVariables()
        // to ensure correct language when builder is serialized across process boundaries
        // (voicemail-sender CLI → Beanstalk queue → WorkerNotifyByEmail)
    }

    /**
     * Set caller ID (phone number)
     *
     * @param string $callerId Caller phone number
     * @return $this
     */
    public function setCallerId(string $callerId): static
    {
        $this->callerId = $callerId;
        return $this;
    }

    /**
     * Set caller name
     *
     * @param string $callerName Caller display name
     * @return $this
     */
    public function setCallerName(string $callerName): static
    {
        $this->callerName = $callerName;
        return $this;
    }

    /**
     * Set message duration
     *
     * @param string $duration Message duration (e.g., "1:23")
     * @return $this
     */
    public function setDuration(string $duration): static
    {
        $this->duration = $duration;
        return $this;
    }

    /**
     * Set message date/time
     *
     * @param string $date Message timestamp
     * @return $this
     */
    public function setMessageDate(string $date): static
    {
        $this->messageDate = $date;
        return $this;
    }

    /**
     * Set recording file path
     *
     * @param string $file Path to recording file for attachment
     * @return $this
     */
    public function setRecordingFile(string $file): static
    {
        $this->recordingFile = $file;
        return $this;
    }

    /**
     * Get recording file path
     *
     * @return string Recording file path
     */
    public function getRecordingFile(): string
    {
        return $this->recordingFile;
    }

    /**
     * Build template variables
     *
     * Translates all strings at render time (inside WorkerNotifyByEmail)
     * to ensure correct language regardless of queue serialization context.
     *
     * @return array<string, mixed> Template variables
     */
    protected function buildVariables(): array
    {
        // Translate subject/preheader at render time for correct language
        $this->subject = TranslationProvider::translate('ms_EmailNotification_Voicemail_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_Voicemail_Preheader');

        $this->mainMessage = TranslationProvider::translate('ms_EmailNotification_Voicemail_Message');

        // Build message details table
        $messageDetails = [
            ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_From'), 'value' => EmailTemplateRenderer::escapeHtml($this->callerName ?: $this->callerId)],
        ];

        // Show number separately only when caller name is known (otherwise From already shows the number)
        if (!empty($this->callerName) && $this->callerName !== $this->callerId) {
            $messageDetails[] = ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_Number'), 'value' => EmailTemplateRenderer::escapeHtml($this->callerId)];
        }

        $messageDetails[] = ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_Duration'), 'value' => EmailTemplateRenderer::escapeHtml($this->duration)];
        $messageDetails[] = ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_Date'), 'value' => EmailTemplateRenderer::escapeHtml($this->messageDate)];

        $this->dynamicContent = '';

        return [
            // Message details table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildDataTable($messageDetails),

            // No info box — help text below already mentions the attachment
            'IF_INFO_BOX' => false,

            // Help text about attachment
            'IF_HELP_TEXT' => !empty($this->recordingFile),
            'HELP_TEXT' => TranslationProvider::translate('ms_EmailNotification_Voicemail_HelpText'),
        ];
    }

    /**
     * Serialize builder to array
     *
     * @return array<string, mixed> Serialized data
     */
    public function toArray(): array
    {
        return array_merge(parent::toArray(), [
            'callerId' => $this->callerId,
            'callerName' => $this->callerName,
            'duration' => $this->duration,
            'messageDate' => $this->messageDate,
            'recordingFile' => $this->recordingFile,
        ]);
    }

    /**
     * Deserialize builder from array
     *
     * @param array<string, mixed> $data Serialized data
     * @return static
     */
    public function fromArray(array $data): static
    {
        parent::fromArray($data);

        if (isset($data['callerId'])) {
            $this->callerId = $data['callerId'];
        }
        if (isset($data['callerName'])) {
            $this->callerName = $data['callerName'];
        }
        if (isset($data['duration'])) {
            $this->duration = $data['duration'];
        }
        if (isset($data['messageDate'])) {
            $this->messageDate = $data['messageDate'];
        }
        if (isset($data['recordingFile'])) {
            $this->recordingFile = $data['recordingFile'];
        }

        return $this;
    }
}
