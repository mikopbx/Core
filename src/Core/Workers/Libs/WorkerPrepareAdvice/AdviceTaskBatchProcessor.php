<?php

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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use RuntimeException;

/**
 * Drains pending advice tasks in priority order under per-task mutexes.
 */
final class AdviceTaskBatchProcessor
{
    private const int LOCK_TTL_SECONDS = 600;

    /**
     * @param array<int, array{type: class-string|string, cacheTime: int, priority: int}> $adviceTypes
     * @param callable(string): bool $isCached
     * @param callable(string, callable, int, int): mixed $synchronized
     * @param callable(array{type: class-string|string, cacheTime: int, priority: int}): bool $process
     * @param callable(): bool $isStopping
     * @param callable(): void $afterBatch
     */
    public function drain(
        array $adviceTypes,
        callable $isCached,
        callable $synchronized,
        callable $process,
        callable $isStopping,
        callable $afterBatch
    ): int {
        $pendingAdviceTypes = array_values(
            array_filter(
                $adviceTypes,
                static fn(array $adviceType): bool => !$isCached($adviceType['type'])
            )
        );

        usort(
            $pendingAdviceTypes,
            static fn(array $left, array $right): int => $left['priority'] <=> $right['priority']
        );

        $processedCount = 0;

        foreach ($pendingAdviceTypes as $adviceType) {
            if ($isStopping()) {
                break;
            }

            $adviceClass = $adviceType['type'];

            try {
                $processed = $synchronized(
                    $adviceClass . ':lock',
                    static function () use (
                        $adviceClass,
                        $adviceType,
                        $isCached,
                        $process,
                        $isStopping
                    ): bool {
                        if ($isStopping() || $isCached($adviceClass)) {
                            return false;
                        }

                        return $process($adviceType);
                    },
                    0,
                    self::LOCK_TTL_SECONDS
                );
            } catch (RuntimeException) {
                continue;
            }

            if ($processed === true) {
                $processedCount++;
            }
        }

        if ($processedCount > 0) {
            $afterBatch();
        }

        return $processedCount;
    }
}
