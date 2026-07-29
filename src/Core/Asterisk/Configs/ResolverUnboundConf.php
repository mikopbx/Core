<?php

declare(strict_types=1);

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\Core\Asterisk\Configs;

/**
 * Generates configuration for the Unbound DNS resolver module.
 */
final class ResolverUnboundConf extends AsteriskConfigClass
{
    protected string $description = 'resolver_unbound.conf';

    protected function generateConfigProtected(): void
    {
        $this->saveConfig($this->buildConfig(), $this->description);
    }

    protected function buildConfig(): string
    {
        return "[general]\n"
            . "hosts = system\n"
            . "resolv = system\n"
            . "debug = 0\n";
    }
}
