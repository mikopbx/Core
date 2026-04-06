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

trait FirewallRulesTrait
{
    /**
     * Configure rules for firewall
     */
    protected function configureRules(array $rules): void
    {
        foreach ($rules as $key => $value) {
            $this->changeCheckBoxState('rule_' . $key, $value);
        }
    }

    /**
     * Verify configured rules
     */
    protected function verifyRules(array $rules): void
    {
        foreach ($rules as $key => $value) {
            $this->assertCheckBoxStageIsEqual('rule_' . $key, $value);
        }
    }

    /**
     * Get rule description
     */
    protected function getRuleDescription(array $params): string
    {
        $activeRules = array_filter($params['rules']);
        $rulesList = implode(', ', array_keys($activeRules));

        return sprintf(
            "Network: %s/%d, Active Rules: %s",
            $params['ipv4_network'],
            $params['ipv4_subnet'],
            $rulesList
        );
    }
}