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

trait IncomingCallRulesTrait
{
    /**
     * Fill basic rule information
     */
    protected function fillBasicInfo(array $params): void
    {
        $this->changeTextAreaValue('note', $params['note']);

        if (!empty($params['providerName'])) {
            $this->selectDropdownItem('providerid', $params['providerName']);
        } else {
            $this->selectDropdownItem('providerid', $params['provider']);
        }

        $this->changeInputField('number', $params['number']);
        $this->selectDropdownItem('extension', $params['extension']);
        $this->changeInputField('timeout', $params['timeout']);
    }

    /**
     * Verify rule configuration
     */
    protected function verifyRuleConfig(array $params): void
    {
        $this->assertTextAreaValueIsEqual('note', $params['note']);
        $this->assertMenuItemSelected('providerid', $params['provider']);
        $this->assertInputFieldValueEqual('number', $params['number']);
        $this->assertMenuItemSelected('extension', $params['extension']);
        $this->assertInputFieldValueEqual('timeout', $params['timeout']);
    }

    /**
     * Get rule description for logging
     */
    protected function getRuleDescription(array $params): string
    {
        $description = "Rule: {$params['rulename']}";
        if (!empty($params['providerName'])) {
            $description .= " (Provider: {$params['providerName']})";
        }
        if (!empty($params['number'])) {
            $description .= " Number: {$params['number']}";
        }
        return $description;
    }
}