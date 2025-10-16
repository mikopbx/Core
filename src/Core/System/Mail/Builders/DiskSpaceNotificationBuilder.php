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
 * Class DiskSpaceNotificationBuilder
 *
 * Builder for disk space warning notifications.
 * Alerts administrators when storage is running low.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class DiskSpaceNotificationBuilder extends AbstractNotificationBuilder
{
    private int $diskUsage = 0;
    private string $freeSpace = '';
    /** @var array<int, array{name: string, usage: int}> */
    private array $partitions = [];
    private string $adminUrl = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::DISK_SPACE_WARNING);

        $this->subject = TranslationProvider::translate('ms_EmailNotification_DiskSpace_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_DiskSpace_Preheader');
    }

    /**
     * Set overall disk usage percentage
     *
     * @param int $percentage Disk usage (0-100)
     * @return $this
     */
    public function setDiskUsage(int $percentage): static
    {
        $this->diskUsage = $percentage;
        return $this;
    }

    /**
     * Set free space amount
     *
     * @param string $space Free space (e.g., '10 GB', '500 MB')
     * @return $this
     */
    public function setFreeSpace(string $space): static
    {
        $this->freeSpace = $space;
        return $this;
    }

    /**
     * Set affected partitions
     *
     * @param array<int, array{name: string, usage: int}> $partitions Partition info
     * @return $this
     */
    public function setPartitions(array $partitions): static
    {
        $this->partitions = $partitions;
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
        $this->mainMessage = TranslationProvider::translate('ms_EmailNotification_DiskSpace_Message');

        // Build disk usage visualization
        $diskContent = $this->buildProgressBar($this->diskUsage);

        // Add partitions list if provided
        if (!empty($this->partitions)) {
            $diskContent .= EmailTemplateRenderer::buildPartitionsList($this->partitions);
        }

        $this->dynamicContent = $diskContent;

        // Build info box with current status
        $infoBoxContent = '<strong>' . TranslationProvider::translate('ms_EmailNotification_DiskSpace_CurrentUsage') . ':</strong> ' . $this->diskUsage . '%';

        if (!empty($this->freeSpace)) {
            $infoBoxContent .= '<br><strong>' . TranslationProvider::translate('ms_EmailNotification_DiskSpace_AvailableSpace') . ':</strong> ' . EmailTemplateRenderer::escapeHtml($this->freeSpace);
        }

        $infoBoxContent .= '<br><strong>' . TranslationProvider::translate('ms_EmailNotification_DiskSpace_Threshold') . ':</strong> 500 MB';

        $colorScheme = $this->type->getColorScheme();

        return [
            // Info box with current status
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => $colorScheme['start'],
            'INFO_BOX_CONTENT' => $infoBoxContent,

            // CTA to admin panel
            'IF_CTA_BUTTON' => !empty($this->adminUrl),
            'CTA_URL' => $this->adminUrl,
            'CTA_COLOR' => '#007bff',
            'CTA_TEXT' => TranslationProvider::translate('ms_EmailNotification_DiskSpace_GoToAdminPanel'),

            // Help text with remediation steps
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => TranslationProvider::translate('ms_EmailNotification_DiskSpace_HelpText'),
        ];
    }
}
