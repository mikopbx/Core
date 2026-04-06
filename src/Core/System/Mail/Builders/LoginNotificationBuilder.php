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
 * Class LoginNotificationBuilder
 *
 * Builder for admin panel login notifications.
 * Alerts administrators when someone successfully authenticates to the system.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class LoginNotificationBuilder extends AbstractNotificationBuilder
{
    private string $username = '';
    private string $ipAddress = '';
    private string $userAgent = '';
    private string $loginTime = '';
    private string $adminUrl = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::LOGIN_NOTIFICATION);

        $this->subject = TranslationProvider::translate('ms_EmailNotification_Login_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_Login_Preheader');
    }

    /**
     * Set username that logged in
     *
     * @param string $username User login
     * @return $this
     */
    public function setUsername(string $username): static
    {
        $this->username = $username;
        return $this;
    }

    /**
     * Set IP address of login origin
     *
     * @param string $ip IP address
     * @return $this
     */
    public function setIpAddress(string $ip): static
    {
        $this->ipAddress = $ip;
        return $this;
    }

    /**
     * Set user agent (browser information)
     *
     * @param string $userAgent Browser/client user agent
     * @return $this
     */
    public function setUserAgent(string $userAgent): static
    {
        $this->userAgent = $userAgent;
        return $this;
    }

    /**
     * Set login time
     *
     * @param string $time Timestamp of login
     * @return $this
     */
    public function setLoginTime(string $time): static
    {
        $this->loginTime = $time;
        return $this;
    }

    /**
     * Set admin panel URL
     *
     * @param string $url URL to admin panel
     * @return $this
     */
    public function setAdminUrl(string $url): static
    {
        $this->adminUrl = $url;
        return $this;
    }

    /**
     * Build template variables
     *
     * @return array<string, mixed> Template variables
     */
    protected function buildVariables(): array
    {
        $this->mainMessage = TranslationProvider::translate('ms_EmailNotification_Login_Message');

        // Build login details table
        $loginDetails = [
            [
                'label' => TranslationProvider::translate('ms_EmailNotification_Login_Username'),
                'value' => $this->username
            ],
            [
                'label' => TranslationProvider::translate('ms_EmailNotification_Login_IPAddress'),
                'value' => $this->ipAddress
            ],
            [
                'label' => TranslationProvider::translate('ms_EmailNotification_Login_Time'),
                'value' => $this->loginTime
            ],
        ];

        // Add browser info if available
        if (!empty($this->userAgent)) {
            $loginDetails[] = [
                'label' => TranslationProvider::translate('ms_EmailNotification_Login_Browser'),
                'value' => $this->userAgent
            ];
        }

        $this->dynamicContent = '';

        $colorScheme = $this->type->getColorScheme();

        return [
            // Login details table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildDataTable($loginDetails),

            // Info box with security notice
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => $colorScheme['start'],
            'INFO_BOX_CONTENT' => '<strong>' . TranslationProvider::translate('ms_EmailNotification_Login_SecurityNotice') . ':</strong> ' .
                                  TranslationProvider::translate('ms_EmailNotification_Login_SecurityAction'),

            // CTA button to admin panel
            'IF_CTA_BUTTON' => !empty($this->adminUrl),
            'CTA_URL' => $this->adminUrl,
            'CTA_COLOR' => $colorScheme['start'],
            'CTA_TEXT' => TranslationProvider::translate('ms_EmailNotification_Login_GoToAdminPanel'),

            // Help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => TranslationProvider::translate('ms_EmailNotification_Login_HelpText'),
        ];
    }
}
