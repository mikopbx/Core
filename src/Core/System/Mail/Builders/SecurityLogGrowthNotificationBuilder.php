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
 * Class SecurityLogGrowthNotificationBuilder
 *
 * Builder for security log growth warning notifications.
 * Alerts administrators when Asterisk security log grows suspiciously fast,
 * indicating potential security issues like brute force attacks or scanning.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class SecurityLogGrowthNotificationBuilder extends AbstractNotificationBuilder
{
    private float $growthRate = 0.0;
    private int $timeInterval = 0;
    private string $severity = 'warning';
    private string $adminUrl = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::SECURITY_ALERT);

        $this->subject = TranslationProvider::translate('ms_EmailNotification_SecurityLog_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_SecurityLog_Preheader');
    }

    /**
     * Set log growth rate
     *
     * @param float $growthMB Growth in megabytes
     * @return $this
     */
    public function setGrowthRate(float $growthMB): static
    {
        $this->growthRate = $growthMB;
        return $this;
    }

    /**
     * Set time interval for measurement
     *
     * @param int $minutes Time interval in minutes
     * @return $this
     */
    public function setTimeInterval(int $minutes): static
    {
        $this->timeInterval = $minutes;
        return $this;
    }

    /**
     * Set alert severity level
     *
     * @param string $severity Severity: 'warning' or 'critical'
     * @return $this
     */
    public function setSeverity(string $severity): static
    {
        $this->severity = $severity;
        return $this;
    }

    /**
     * Set admin panel URL
     *
     * @param string $url Admin panel URL
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
        $this->mainMessage = TranslationProvider::translate('ms_EmailNotification_SecurityLog_Message');

        // Build warning content with growth rate details
        $severityText = $this->severity === 'critical'
            ? TranslationProvider::translate('ms_EmailNotification_SecurityLog_Critical')
            : TranslationProvider::translate('ms_EmailNotification_SecurityLog_Warning');

        $dynamicContent = '<div style="padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; margin: 20px 0;">';
        $dynamicContent .= '<strong style="color: #856404;">' . $severityText . '</strong><br>';
        $dynamicContent .= TranslationProvider::translate('ms_EmailNotification_SecurityLog_GrowthRate') . ': ';
        $dynamicContent .= '<strong>' . $this->growthRate . ' ' . TranslationProvider::translate('ms_MB') . '</strong> ';
        $dynamicContent .= TranslationProvider::translate('ms_EmailNotification_SecurityLog_During') . ' ';
        $dynamicContent .= '<strong>' . $this->timeInterval . ' ' . TranslationProvider::translate('ms_Minutes') . '</strong>';
        $dynamicContent .= '</div>';

        $this->dynamicContent = $dynamicContent;

        // Build info box with security recommendations
        $infoBoxContent = '<strong>' . TranslationProvider::translate('ms_EmailNotification_SecurityLog_PossibleCauses') . ':</strong>';
        $infoBoxContent .= '<ul style="margin: 10px 0; padding-left: 20px;">';
        $infoBoxContent .= '<li>' . TranslationProvider::translate('ms_EmailNotification_SecurityLog_Cause_BruteForce') . '</li>';
        $infoBoxContent .= '<li>' . TranslationProvider::translate('ms_EmailNotification_SecurityLog_Cause_Scanning') . '</li>';
        $infoBoxContent .= '<li>' . TranslationProvider::translate('ms_EmailNotification_SecurityLog_Cause_Misconfiguration') . '</li>';
        $infoBoxContent .= '</ul>';

        $colorScheme = $this->type->getColorScheme();

        return [
            // Info box with security recommendations
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => $colorScheme['start'],
            'INFO_BOX_CONTENT' => $infoBoxContent,

            // CTA to firewall/security page
            'IF_CTA_BUTTON' => !empty($this->adminUrl),
            'CTA_URL' => $this->adminUrl,
            'CTA_COLOR' => '#dc3545',
            'CTA_TEXT' => TranslationProvider::translate('ms_EmailNotification_SecurityLog_CheckFirewall'),

            // Help text with remediation steps
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => TranslationProvider::translate('ms_EmailNotification_SecurityLog_HelpText'),
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
            'growthRate' => $this->growthRate,
            'timeInterval' => $this->timeInterval,
            'severity' => $this->severity,
            'adminUrl' => $this->adminUrl,
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

        if (isset($data['growthRate'])) {
            $this->growthRate = (float)$data['growthRate'];
        }
        if (isset($data['timeInterval'])) {
            $this->timeInterval = (int)$data['timeInterval'];
        }
        if (isset($data['severity'])) {
            $this->severity = $data['severity'];
        }
        if (isset($data['adminUrl'])) {
            $this->adminUrl = $data['adminUrl'];
        }

        return $this;
    }
}
