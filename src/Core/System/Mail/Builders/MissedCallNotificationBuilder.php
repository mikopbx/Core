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
 * Class MissedCallNotificationBuilder
 *
 * Builder for missed call notifications sent to extension owners.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class MissedCallNotificationBuilder extends AbstractNotificationBuilder
{
    private string $callerId = '';
    private string $callerName = '';
    private string $extension = '';
    private string $extensionName = '';
    private string $callTime = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::MISSED_CALL);
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
     * @param string $name Caller name from phonebook
     * @return $this
     */
    public function setCallerName(string $name): static
    {
        $this->callerName = $name;
        return $this;
    }

    /**
     * Set extension number
     *
     * @param string $extension Extension that missed the call
     * @return $this
     */
    public function setExtension(string $extension): static
    {
        $this->extension = $extension;
        return $this;
    }

    /**
     * Set extension name
     *
     * @param string $name Extension owner name
     * @return $this
     */
    public function setExtensionName(string $name): static
    {
        $this->extensionName = $name;
        return $this;
    }

    /**
     * Set call time
     *
     * @param string $time Call timestamp
     * @return $this
     */
    public function setCallTime(string $time): static
    {
        $this->callTime = $time;
        return $this;
    }

    /**
     * Build template variables
     *
     * @return array<string, mixed> Template variables
     */
    protected function buildVariables(): array
    {
        // Build subject and message
        $callerDisplay = $this->callerId;
        if (!empty($this->callerName)) {
            $callerDisplay .= ' (' . $this->callerName . ')';
        }

        $this->subject = TranslationProvider::translate('ms_EmailNotification_MissedCall_Subject') . ' ' . $callerDisplay;
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_MissedCall_Preheader') . ' ' . $callerDisplay;

        // No main message - all details are in the data table to avoid duplication
        $this->mainMessage = '';

        // Build call details table
        // Format caller info: clickable phone number + name on separate line
        $callerInfo = '<a href="tel:' . EmailTemplateRenderer::escapeHtml($this->callerId) . '" style="color: #007bff; text-decoration: none; font-weight: bold;">'
                    . EmailTemplateRenderer::escapeHtml($this->callerId) . '</a>';

        if (!empty($this->callerName)) {
            $callerInfo .= '<br><span style="color: #6c757d; font-size: 13px;">'
                        . EmailTemplateRenderer::escapeHtml($this->callerName) . '</span>';
        }

        $callDetails = [
            [
                'label' => TranslationProvider::translate('ms_EmailNotification_MissedCall_From'),
                'value' => $callerInfo,
                'escapeValue' => false  // Contains safe HTML (tel: link)
            ],
            [
                'label' => TranslationProvider::translate('ms_EmailNotification_MissedCall_ToExtension'),
                'value' => $this->extension . (!empty($this->extensionName) ? ' (' . $this->extensionName . ')' : '')
            ],
            [
                'label' => TranslationProvider::translate('ms_EmailNotification_MissedCall_Time'),
                'value' => $this->callTime
            ],
        ];

        // Override footer for user notifications
        $this->footerMessage = TranslationProvider::translate('ms_EmailNotification_MissedCall_Footer');

        return [
            // Call details table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildDataTable($callDetails),

            // Unsubscribe link for user notifications
            'IF_UNSUBSCRIBE' => true,
            'UNSUBSCRIBE_URL' => '#',
            'UNSUBSCRIBE_TEXT' => TranslationProvider::translate('ms_EmailNotification_MissedCall_ManagePreferences'),

            // No powered by for user emails
            'IF_POWERED_BY' => false,
        ];
    }
}
