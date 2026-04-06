<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\AdminCabinet\Tests\Traits;

trait AmiPermissionsTrait
{
    /**
     * Set permission checkboxes
     */
    protected function setPermissions(array $permissions): void
    {
        foreach ($permissions as $key => $value) {
            $this->setPermission($key, $value);
        }
    }

    /**
     * Set single permission
     */
    protected function setPermission(string $key, string $value): void
    {
        if (strpos($value, 'read') !== false) {
            $this->changeCheckBoxState("{$key}_read", true);
        } else {
            $this->changeCheckBoxState("{$key}_read", false);
        }
        if (strpos($value, 'write') !== false) {
            $this->changeCheckBoxState("{$key}_write", true);
        } else {
            $this->changeCheckBoxState("{$key}_write", false);
        }
    }

    /**
     * Verify permissions
     */
    protected function verifyPermissions(array $permissions): void
    {
        foreach ($permissions as $key => $value) {
            $this->verifyPermission($key, $value);
        }
    }

    /**
     * Verify single permission
     */
    protected function verifyPermission(string $key, string $value): void
    {
        if (strpos($value, 'read') !== false) {
            $this->assertCheckBoxStageIsEqual("{$key}_read", true);
        } else {
            $this->assertCheckBoxStageIsEqual("{$key}_read", false);
        }
        if (strpos($value, 'write') !== false) {
            $this->assertCheckBoxStageIsEqual("{$key}_write", true);
        } else {
            $this->assertCheckBoxStageIsEqual("{$key}_write", false);
        }
    }
}