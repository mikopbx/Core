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
 * Class UdptlConf
 *
 * Represents the udptl.conf configuration file.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class UdptlConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 1000;

    protected string $description = 'udptl.conf';


    /**
     * Generate the configuration content for udptl.conf.
     *
     * This method generates the configuration content for the udptl.conf file.
     */
    protected function generateConfigProtected(): void
    {
        $conf = '';

        // Write the configuration content to the file
        file_put_contents($this->config->path('asterisk.astetcdir') . '/udptl.conf', $conf);
    }
}