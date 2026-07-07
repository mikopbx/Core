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

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessCustomFiles;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessOtherModels;
use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\ProcessPBXSettings;
use MikoPBX\Core\Workers\WorkerModelsEvents;
use MikoPBX\Tests\Unit\AbstractUnitTest;
use ReflectionClass;
use ReflectionMethod;

/**
 * Guardrail against the "born dead reload action" class of bug.
 *
 * WorkerModelsEvents::startReload() executes changes by iterating ONLY the master
 * priority list returned by getReloadActionsWithPriority(); a planned action that is
 * absent from that list is silently skipped and NEVER runs, even though it is queued
 * from a dependency table.
 *
 * This is exactly how ReloadDockerNetworkFiltersAction shipped dead (feat: dynamic IP
 * filtering for Docker without iptables, #908 / commit 641f8565e): it was registered as
 * a NetworkFilters dependency in ProcessOtherModels but never added to the master list,
 * so its Redis firewall sync + nginx WEB-deny only ever ran at boot. The container-level
 * diagnosis confirmed WEB blocks did not reach nginx until reboot.
 *
 * The invariant these tests lock in: every reload action referenced by ANY dependency
 * table (ProcessPBXSettings / ProcessOtherModels / ProcessCustomFiles) MUST be present
 * in the master priority list, must exist as a class, and the list must not duplicate.
 */
class ReloadActionsRegistryTest extends AbstractUnitTest
{
    /**
     * Master priority list the execution loop iterates.
     *
     * getReloadActionsWithPriority() is a private method that returns a literal array and
     * uses no instance state, so it is invoked on an instance built without the constructor
     * (which would otherwise wire PID files, signal handlers, and the DI container).
     *
     * @return array<int, string>
     */
    private function masterPriorityList(): array
    {
        $instance = (new ReflectionClass(WorkerModelsEvents::class))->newInstanceWithoutConstructor();
        $method   = new ReflectionMethod(WorkerModelsEvents::class, 'getReloadActionsWithPriority');
        $method->setAccessible(true);

        /** @var array<int, string> $list */
        $list = $method->invoke($instance);
        return $list;
    }

    /**
     * Every reload action referenced by a dependency table, mapped to the table(s) that
     * declare it (for a readable failure message).
     *
     * @return array<string, array<int, string>> action class => source table names
     */
    private function dependencyActions(): array
    {
        $sources = [
            'ProcessPBXSettings' => ProcessPBXSettings::getDependencyTable(),
            'ProcessOtherModels' => ProcessOtherModels::getDependencyTable(),
            'ProcessCustomFiles' => ProcessCustomFiles::getDependencyTable(),
        ];

        $actions = [];
        foreach ($sources as $sourceName => $table) {
            foreach ($table as $entry) {
                foreach ($entry['actions'] ?? [] as $actionClass) {
                    $actions[$actionClass][] = $sourceName;
                }
            }
        }

        return $actions;
    }

    /**
     * The core invariant: no dependency-table action may be missing from the master list.
     */
    public function testEveryDependencyActionIsInMasterPriorityList(): void
    {
        $master = $this->masterPriorityList();
        $this->assertNotEmpty($master, 'Master priority list must not be empty');

        $missing = [];
        foreach ($this->dependencyActions() as $actionClass => $declaredIn) {
            if (!in_array($actionClass, $master, true)) {
                $missing[$actionClass] = array_values(array_unique($declaredIn));
            }
        }

        $message = "These reload actions are referenced by a dependency table but are missing from "
            . "WorkerModelsEvents::getReloadActionsWithPriority(), so they are queued but NEVER executed:\n";
        foreach ($missing as $actionClass => $declaredIn) {
            $message .= sprintf("  - %s (declared in: %s)\n", $actionClass, implode(', ', $declaredIn));
        }

        $this->assertEmpty($missing, $message);
    }

    /**
     * A duplicate in the master list means the action runs twice per pass — a latent
     * performance/ordering bug that this list is otherwise silent about.
     */
    public function testMasterPriorityListHasNoDuplicates(): void
    {
        $master     = $this->masterPriorityList();
        $duplicates = array_keys(array_filter(array_count_values($master), static fn(int $n): bool => $n > 1));

        $this->assertEmpty(
            $duplicates,
            'Duplicate actions in getReloadActionsWithPriority(): ' . implode(', ', $duplicates)
        );
    }

    /**
     * Every class named in the master list must actually exist (guards against a rename or
     * a stale reference slipping in).
     */
    public function testEveryMasterActionClassExists(): void
    {
        foreach ($this->masterPriorityList() as $actionClass) {
            $this->assertTrue(class_exists($actionClass), "Reload action class does not exist: $actionClass");
        }
    }
}
