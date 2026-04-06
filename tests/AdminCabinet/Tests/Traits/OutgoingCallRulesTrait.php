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

trait OutgoingCallRulesTrait
{
    /**
     * Fill basic rule information
     */
    protected function fillRuleInfo(array $params): void
    {
        $this->changeInputField('rulename', $params['rulename']);
        $this->changeTextAreaValue('note', $params['note']);
        $this->fillNumberSettings($params);
        $this->selectProvider($params);
    }

    /**
     * Fill number manipulation settings
     */
    protected function fillNumberSettings(array $params): void
    {
        $this->changeInputField('numberbeginswith', $params['numberbeginswith']);
        $this->changeInputField('restnumbers', $params['restnumbers']);
        $this->changeInputField('trimfrombegin', $params['trimfrombegin']);
        $this->changeInputField('prepend', $params['prepend']);
    }

    /**
     * Select provider
     */
    protected function selectProvider(array $params): void
    {
        if (!empty($params['providerName'])) {
            $this->selectDropdownItem('providerid', $params['providerName']);
        } else {
            $this->selectDropdownItem('providerid', $params['providerid']);
        }
    }

    /**
     * Verify rule configuration
     */
    protected function verifyRuleConfig(array $params): void
    {
        $this->verifyBasicInfo($params);
        $this->verifyNumberSettings($params);
        $this->verifyProvider($params);
    }

    /**
     * Verify basic information
     */
    protected function verifyBasicInfo(array $params): void
    {
        $this->assertInputFieldValueEqual('rulename', $params['rulename']);
        $this->assertTextAreaValueIsEqual('note', $params['note']);
    }

    /**
     * Verify number settings
     */
    protected function verifyNumberSettings(array $params): void
    {
        $this->assertInputFieldValueEqual('numberbeginswith', $params['numberbeginswith']);
        $this->assertInputFieldValueEqual('restnumbers', $params['restnumbers']);
        $this->assertInputFieldValueEqual('trimfrombegin', $params['trimfrombegin']);
        $this->assertInputFieldValueEqual('prepend', $params['prepend']);
    }

    /**
     * Verify provider selection
     */
    protected function verifyProvider(array $params): void
    {
        $this->assertMenuItemSelected('providerid', $params['providerid']);
    }

    /**
     * Get rule description for logging
     */
    protected function getRuleDescription(array $params): string
    {
        $description = "Rule: {$params['rulename']} (Type: {$params['type']})";
        if (!empty($params['providerName'])) {
            $description .= " Provider: {$params['providerName']}";
        }
        if (!empty($params['numberbeginswith'])) {
            $description .= " Pattern: {$params['numberbeginswith']}";
        }
        return $description;
    }
}