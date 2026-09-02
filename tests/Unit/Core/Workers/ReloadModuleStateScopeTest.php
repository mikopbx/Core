<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers;

use PHPUnit\Framework\TestCase;

final class ReloadModuleStateScopeTest extends TestCase
{
    public function testModuleStateChangeRefreshesSupervisorAndApiWorkersOnly(): void
    {
        $source = (string) file_get_contents(
            dirname(__DIR__, 4)
            . '/src/Core/Workers/Libs/WorkerModelsEvents/Actions/ReloadModuleStateAction.php'
        );

        self::assertStringNotContainsString('Processes::restartAllWorkers(', $source);
        self::assertStringContainsString('WorkerSafeScriptsCore::class', $source);
        self::assertStringContainsString('WorkerApiCommands::class', $source);
        self::assertStringContainsString('Processes::processPHPWorker(', $source);
    }
}
