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

namespace MikoPBX\Core\System\ConsoleMenu\Menus;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\ConsoleMenu\Actions\SystemActions;
use MikoPBX\Core\System\ConsoleMenu\Utilities\NetworkInfo;
use MikoPBX\Core\System\ConsoleMenu\Wizards\NetworkWizard;
use PhpSchool\CliMenu\CliMenu;

/**
 * Network configuration menu
 *
 * Provides access to:
 * - Network interface configuration wizard
 * - Network information display
 * - MTR diagnostic tool
 */
class NetworkMenu extends AbstractMenu
{
    /**
     * {@inheritdoc}
     */
    public function getTitle(): string
    {
        return $this->translation->_('cm_NetworkAndConnection');
    }

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool
    {
        return $this->env->canConfigureNetwork() || $this->env->isDocker();
    }

    /**
     * {@inheritdoc}
     */
    public function show(?CliMenu $parentMenu = null): void
    {
        $builder = $this->createMenuBuilder();
        $index = 1;

        // [1] Configure network interfaces (not in Docker)
        if ($this->env->canConfigureNetwork()) {
            $builder->addItem("[$index] " . $this->translation->_('cm_ConfigureInterfaces'), function (CliMenu $menu) use ($parentMenu) {
                $wizard = new NetworkWizard();
                $wizard->run($menu);
                // Close and reopen menu to restore terminal state after wizard's submenus
                $menu->close();
                $this->show($parentMenu);
            });
            $index++;
        }

        // [2] Show network information
        $builder->addItem("[$index] " . $this->translation->_('cm_ShowNetworkInfo'), function (CliMenu $menu) {
            $menu->close();
            $networkInfo = new NetworkInfo();
            $networkInfo->display();
            echo "\n" . $this->translation->_('cm_PressEnterToContinue') . "\n";
            fgets(STDIN);
            echo "\033[2J\033[H";
            $menu->open();
        });
        $index++;

        // [3] Firewall (not in LiveCD)
        if ($this->env->canConfigureFirewall()) {
            $actions = new SystemActions();
            $firewallLabel = $this->translation->_('cm_Firewall') . $this->getFirewallStatus();
            $builder->addItem("[$index] $firewallLabel", function (CliMenu $menu) use ($actions) {
                $actions->setupFirewall($menu);
            });
            $index++;
        }

        // [4] HTTP Redirect (not in LiveCD)
        if (!$this->env->isLiveCd()) {
            $actions = new SystemActions();
            $httpRedirectLabel = $this->translation->_('cm_HttpRedirect') . $this->getHttpRedirectStatus();
            $builder->addItem("[$index] $httpRedirectLabel", function (CliMenu $menu) use ($actions) {
                $actions->toggleHttpRedirect($menu);
            });
            $index++;
        }

        // [5] MTR
        $builder->addItem("[$index] " . $this->translation->_('cm_Mtr'), function (CliMenu $menu) {
            $menu->close();
            $mtrMenu = new MtrMenu();
            $mtrMenu->show($menu);
        });
        $index++;

        // [4] Back
        $this->addBackItem($builder, $index, $parentMenu);

        $menu = $builder->build();
        try {
            $menu->open();
        } catch (\Throwable $e) {
            // Log error and continue
        }
    }

    /**
     * Get firewall status indicator
     *
     * @return string Status text with color
     */
    private function getFirewallStatus(): string
    {
        if (PbxSettings::getValueByKey(PbxSettings::PBX_FIREWALL_ENABLED) === '0') {
            return "\033[01;31m (" . $this->translation->_('cm_FirewallDisabled') . ") \033[39m";
        }
        return '';
    }

    /**
     * Get HTTP redirect status indicator
     *
     * @return string Status text with color
     */
    private function getHttpRedirectStatus(): string
    {
        if (PbxSettings::getValueByKey(PbxSettings::REDIRECT_TO_HTTPS) === '1') {
            return "\033[01;32m (" . $this->translation->_('cm_HttpRedirectEnabled') . ") \033[39m";
        }
        return "\033[01;31m (" . $this->translation->_('cm_HttpRedirectDisabled') . ") \033[39m";
    }
}
