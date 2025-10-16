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
 * Class SystemProblemsNotificationBuilder
 *
 * Builder for system problems/advice notifications sent to administrators.
 * Consolidates multiple system issues into single notification.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class SystemProblemsNotificationBuilder extends AbstractNotificationBuilder
{
    /** @var array<int, array{messageTpl: string, messageParams?: array<string, mixed>}> */
    private array $problems = [];

    private string $adminUrl = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::SYSTEM_PROBLEMS);

        $this->subject = TranslationProvider::translate('ms_EmailNotification_SystemProblems_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_SystemProblems_Preheader');
    }

    /**
     * Set problems list
     *
     * @param array<int, array{messageTpl: string, messageParams?: array<string, mixed>}> $problems Array of problem messages
     * @return $this
     */
    public function setProblems(array $problems): static
    {
        $this->problems = $problems;
        return $this;
    }

    /**
     * Add single problem
     *
     * @param string $messageTpl Translation key
     * @param array<string, mixed> $params Translation parameters
     * @return $this
     */
    public function addProblem(string $messageTpl, array $params = []): static
    {
        $this->problems[] = [
            'messageTpl' => $messageTpl,
            'messageParams' => $params
        ];
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
        $problemCount = count($this->problems);

        $this->mainMessage = TranslationProvider::translate(
            'ms_EmailNotification_SystemProblems_Message',
            ['count' => $problemCount]
        );

        // Build problems list HTML
        $problemsHtml = '<div style="margin: 25px 0;">';
        $problemsHtml .= '<h3 style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
        $problemsHtml .= 'font-size: 16px; color: #333333; margin-bottom: 15px;">' . TranslationProvider::translate('ms_EmailNotification_SystemProblems_DetectedProblems') . ':</h3>';

        foreach ($this->problems as $index => $problem) {
            $message = TranslationProvider::translate(
                $problem['messageTpl'],
                $problem['messageParams'] ?? []
            );

            // Remove HTML tags and links from translated messages
            // (they are intended for web UI, not for emails)
            // Remove <a> tags with their content first
            $cleanMessage = preg_replace('/<a\b[^>]*>.*?<\/a>/is', '', $message);
            // Remove any remaining HTML tags
            $cleanMessage = strip_tags($cleanMessage);
            // Clean up extra whitespace
            $cleanMessage = trim(preg_replace('/\s+/', ' ', $cleanMessage));

            $problemsHtml .= '<div style="background-color: #fff3cd; padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 3px solid #ffa502;">';
            $problemsHtml .= '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">';
            $problemsHtml .= '<strong style="color: #856404; font-size: 14px;">' . ($index + 1) . '. ' . EmailTemplateRenderer::escapeHtml($cleanMessage) . '</strong>';
            $problemsHtml .= '</div>';
            $problemsHtml .= '</div>';
        }

        $problemsHtml .= '</div>';

        $this->dynamicContent = $problemsHtml;

        // Info box with action required message
        $infoBoxContent = '<strong>' . TranslationProvider::translate('ms_EmailNotification_SystemProblems_ActionRequired') . ':</strong> ';
        $infoBoxContent .= TranslationProvider::translate('ms_EmailNotification_SystemProblems_PleaseResolve');

        $colorScheme = $this->type->getColorScheme();

        return [
            // Info box
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => $colorScheme['start'],
            'INFO_BOX_CONTENT' => $infoBoxContent,

            // CTA button to admin panel
            'IF_CTA_BUTTON' => !empty($this->adminUrl),
            'CTA_URL' => $this->adminUrl,
            'CTA_COLOR' => $colorScheme['start'],
            'CTA_TEXT' => TranslationProvider::translate('ms_EmailNotification_SystemProblems_GoToAdminPanel'),

            // Help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => TranslationProvider::translate('ms_EmailNotification_SystemProblems_HelpText'),
        ];
    }
}
