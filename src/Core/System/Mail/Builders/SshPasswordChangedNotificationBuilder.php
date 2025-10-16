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
 * Class SshPasswordChangedNotificationBuilder
 *
 * Builder for SSH password change security notifications.
 * Alerts administrators when SSH password is modified outside normal procedures.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class SshPasswordChangedNotificationBuilder extends AbstractNotificationBuilder
{
    private string $changedBy = 'unknown';
    private string $ipAddress = '';
    private string $changeTime = '';
    private string $securityUrl = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::SSH_PASSWORD_CHANGED);

        $this->subject = TranslationProvider::translate('ms_EmailNotification_SSHPassword_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_SSHPassword_Preheader');
        $this->footerMessage = TranslationProvider::translate('ms_EmailNotification_SSHPassword_Footer');
    }

    /**
     * Set who changed the password
     *
     * @param string $changedBy User/method that changed password
     * @return $this
     */
    public function setChangedBy(string $changedBy): static
    {
        $this->changedBy = $changedBy;
        return $this;
    }

    /**
     * Set IP address of change origin
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
     * Set time of password change
     *
     * @param string $time Timestamp of change
     * @return $this
     */
    public function setChangeTime(string $time): static
    {
        $this->changeTime = $time;
        return $this;
    }

    /**
     * Set security settings URL
     *
     * @param string $url URL to security settings page
     * @return $this
     */
    public function setSecurityUrl(string $url): static
    {
        $this->securityUrl = $url;
        return $this;
    }

    /**
     * Build template variables
     *
     * @return array<string, mixed> Template variables
     */
    protected function buildVariables(): array
    {
        // No main message - security notice is in help text to avoid duplication
        $this->mainMessage = '';

        // Build change details
        $changeDetails = '<strong>' . TranslationProvider::translate('ms_EmailNotification_SSHPassword_ChangedBy') . ':</strong> ' . EmailTemplateRenderer::escapeHtml($this->changedBy);

        if (!empty($this->ipAddress)) {
            $changeDetails .= '<br><strong>' . TranslationProvider::translate('ms_EmailNotification_SSHPassword_IPAddress') . ':</strong> ' . EmailTemplateRenderer::escapeHtml($this->ipAddress);
        }

        if (!empty($this->changeTime)) {
            $changeDetails .= '<br><strong>' . TranslationProvider::translate('ms_EmailNotification_SSHPassword_Time') . ':</strong> ' . EmailTemplateRenderer::escapeHtml($this->changeTime);
        }

        $colorScheme = $this->type->getColorScheme();

        return [
            // Info box with change details
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => $colorScheme['start'],
            'INFO_BOX_CONTENT' => $changeDetails,

            // Security action button
            'IF_CTA_BUTTON' => !empty($this->securityUrl),
            'CTA_URL' => $this->securityUrl,
            'CTA_COLOR' => $colorScheme['end'],
            'CTA_TEXT' => TranslationProvider::translate('ms_EmailNotification_SSHPassword_ReviewSecuritySettings'),

            // Critical help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => '<strong>' . TranslationProvider::translate('ms_EmailNotification_SSHPassword_SecurityNotice') . ':</strong> ' .
                          TranslationProvider::translate('ms_EmailNotification_SSHPassword_SecurityAction'),
        ];
    }
}
