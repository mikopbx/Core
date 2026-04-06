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

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\ConsoleMenu\Utilities\EnvironmentHelper;
use MikoPBX\Core\System\ConsoleMenu\Utilities\MenuStyleConfig;
use Phalcon\Di\Di;
use Phalcon\Translate\Adapter\NativeArray;
use PhpSchool\CliMenu\Builder\CliMenuBuilder;
use PhpSchool\CliMenu\CliMenu;

/**
 * Abstract base class for console menus
 *
 * Provides common functionality for all menus including:
 * - Translation service access
 * - Environment detection
 * - Menu styling configuration
 */
abstract class AbstractMenu implements MenuInterface
{
    protected EnvironmentHelper $env;
    protected MenuStyleConfig $styleConfig;
    protected NativeArray $translation;

    public function __construct()
    {
        $this->env = new EnvironmentHelper();
        $this->styleConfig = new MenuStyleConfig();

        $di = Di::getDefault();
        $this->translation = $di->getShared(TranslationProvider::SERVICE_NAME);
    }

    /**
     * {@inheritdoc}
     */
    abstract public function show(?CliMenu $parentMenu = null): void;

    /**
     * {@inheritdoc}
     */
    abstract public function getTitle(): string;

    /**
     * {@inheritdoc}
     */
    public function isAvailable(): bool
    {
        return true;
    }

    /**
     * Create a preconfigured menu builder
     *
     * @param string|null $title Optional title override
     * @return CliMenuBuilder Configured menu builder
     */
    protected function createMenuBuilder(?string $title = null): CliMenuBuilder
    {
        $builder = new CliMenuBuilder();
        $builder->setTitle($title ?? $this->getTitle());
        return $this->styleConfig->applySubmenuStyle($builder);
    }

    /**
     * Add a cancel/back item to the menu
     *
     * @param CliMenuBuilder $builder Menu builder
     * @param int $index Menu item index
     * @param CliMenu|null $parentMenu Parent menu for navigation
     * @return void
     */
    protected function addCancelItem(CliMenuBuilder $builder, int $index, ?CliMenu $parentMenu = null): void
    {
        $label = "[$index] " . $this->translation->_('cm_Cancel');
        $builder->addItem($label, function (CliMenu $menu) use ($parentMenu) {
            $menu->close();
            if ($parentMenu !== null) {
                $parentMenu->open();
            }
        });
    }

    /**
     * Add a back item to the menu
     *
     * @param CliMenuBuilder $builder Menu builder
     * @param int $index Menu item index
     * @param CliMenu|null $parentMenu Parent menu for navigation
     * @return void
     */
    protected function addBackItem(CliMenuBuilder $builder, int $index, ?CliMenu $parentMenu = null): void
    {
        $label = "[$index] " . $this->translation->_('cm_GoBack');
        $builder->addItem($label, function (CliMenu $menu) use ($parentMenu) {
            $menu->close();
            if ($parentMenu !== null) {
                $parentMenu->open();
            }
        });
    }

    /**
     * Clear screen and redraw menu
     *
     * @param CliMenu $menu Menu to redraw
     * @return void
     */
    protected function clearAndRedraw(CliMenu $menu): void
    {
        // Reset terminal to sane state after ncurses applications (mtr, mc, sngrep)
        passthru('stty sane 2>/dev/null');
        echo "\033[2J\033[H";
        $menu->redraw();
    }
}
