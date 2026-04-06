<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk\Configs;


/**
 * Class PjprojectConf
 *
 * Represents a configuration class for PJSIP.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class PjprojectConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'pjproject.conf';

    /**
     * Generates the configuration for the hep.conf file.
     *
     * @return void
     */
    protected function generateConfigProtected(): void
    {
        // Write pjproject.conf file
        $pjConf = '[log_mappings]' . "\n" .
        'type=log_mappings' . "\n" .
        'asterisk_error = 0' . "\n" .
        'asterisk_warning = 2' . "\n" .
        'asterisk_debug = 1,3,4,5,6' . "\n\n";
        $this->saveConfig($pjConf, $this->description);
    }

}