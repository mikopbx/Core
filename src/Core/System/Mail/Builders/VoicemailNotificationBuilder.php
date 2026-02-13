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
    private string $mailbox = '';
    private string $messageNumber = '';
    private string $duration = '';
    private string $messageDate = '';
    private string $recordingFile = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::VOICEMAIL);

        $this->subject = TranslationProvider::translate('ms_EmailNotification_Voicemail_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_Voicemail_Preheader');
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
     * Set voicemail mailbox
     *
     * @param string $mailbox Mailbox identifier
     * @return $this
     */
    public function setMailbox(string $mailbox): static
    {
        $this->mailbox = $mailbox;
        return $this;
    }

    /**
     * Set message number
     *
     * @param string $messageNumber Message sequence number
     * @return $this
     */
    public function setMessageNumber(string $messageNumber): static
    {
        $this->messageNumber = $messageNumber;
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
     * @return array<string, mixed> Template variables
     */
    protected function buildVariables(): array
    {
        $this->mainMessage = TranslationProvider::translate('ms_EmailNotification_Voicemail_Message');

        // Build message details table
        $messageDetails = [
            ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_From'), 'value' => EmailTemplateRenderer::escapeHtml($this->callerName ?: $this->callerId)],
            ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_Number'), 'value' => EmailTemplateRenderer::escapeHtml($this->callerId)],
            ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_Mailbox'), 'value' => EmailTemplateRenderer::escapeHtml($this->mailbox)],
            ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_Duration'), 'value' => EmailTemplateRenderer::escapeHtml($this->duration)],
            ['label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_Date'), 'value' => EmailTemplateRenderer::escapeHtml($this->messageDate)],
        ];

        if (!empty($this->messageNumber)) {
            array_unshift($messageDetails, [
                'label' => TranslationProvider::translate('ms_EmailNotification_Voicemail_MessageNumber'),
                'value' => EmailTemplateRenderer::escapeHtml($this->messageNumber)
            ]);
        }

        $this->dynamicContent = '';

        $colorScheme = $this->type->getColorScheme();

        return [
            // Message details table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildDataTable($messageDetails),

            // Info box with attachment notice
            'IF_INFO_BOX' => !empty($this->recordingFile),
            'INFO_BOX_COLOR' => $colorScheme['start'],
            'INFO_BOX_CONTENT' => TranslationProvider::translate('ms_EmailNotification_Voicemail_AttachmentInfo'),

            // Help text
            'IF_HELP_TEXT' => true,
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
            'mailbox' => $this->mailbox,
            'messageNumber' => $this->messageNumber,
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
        if (isset($data['mailbox'])) {
            $this->mailbox = $data['mailbox'];
        }
        if (isset($data['messageNumber'])) {
            $this->messageNumber = $data['messageNumber'];
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
