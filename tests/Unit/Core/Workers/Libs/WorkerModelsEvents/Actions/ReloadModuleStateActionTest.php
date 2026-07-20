<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions\ReloadModuleStateAction;
use MikoPBX\Modules\Config\ConfigClass;
use PHPUnit\Framework\TestCase;
use ReflectionClass;

/**
 * Ensures model-event processing reacts to persisted module state without
 * repeating lifecycle hooks already executed by PbxExtensionState.
 */
class ReloadModuleStateActionTest extends TestCase
{
    public function testEnabledModelEventDoesNotInvokeAfterEnableHook(): void
    {
        $config = $this->makeConfig();

        (new ReloadModuleStateAction())->handleModuleConfigChanges(
            $config,
            ['disabled' => '0']
        );

        $this->assertSame(0, $config->afterEnableCalls);
        $this->assertSame(0, $config->afterDisableCalls);
    }

    public function testDisabledModelEventDoesNotInvokeAfterDisableHook(): void
    {
        $config = $this->makeConfig();

        (new ReloadModuleStateAction())->handleModuleConfigChanges(
            $config,
            ['disabled' => '1']
        );

        $this->assertSame(0, $config->afterEnableCalls);
        $this->assertSame(0, $config->afterDisableCalls);
    }

    public function testModelEventStillEvaluatesConfigurationReloadDeclarations(): void
    {
        $config = $this->makeConfig();

        (new ReloadModuleStateAction())->handleModuleConfigChanges(
            $config,
            ['disabled' => '0']
        );

        $this->assertSame(1, $config->fail2BanCalls);
        $this->assertSame(1, $config->nginxLocationsCalls);
        $this->assertSame(1, $config->nginxServersCalls);
        $this->assertSame(1, $config->cronCalls);
        $this->assertSame(1, $config->managerCalls);
    }

    private function makeConfig(): ModuleLifecycleConfigFixture
    {
        $reflection = new ReflectionClass(ModuleLifecycleConfigFixture::class);

        /** @var ModuleLifecycleConfigFixture $config */
        $config = $reflection->newInstanceWithoutConstructor();
        return $config;
    }
}

class ModuleLifecycleConfigFixture extends ConfigClass
{
    public int $afterEnableCalls = 0;
    public int $afterDisableCalls = 0;
    public int $fail2BanCalls = 0;
    public int $nginxLocationsCalls = 0;
    public int $nginxServersCalls = 0;
    public int $cronCalls = 0;
    public int $managerCalls = 0;

    public function onAfterModuleEnable(): void
    {
        $this->afterEnableCalls++;
    }

    public function onAfterModuleDisable(): void
    {
        $this->afterDisableCalls++;
    }

    public function generateFail2BanJails(): string
    {
        $this->fail2BanCalls++;
        return '';
    }

    public function createNginxLocations(): string
    {
        $this->nginxLocationsCalls++;
        return '';
    }

    public function createNginxServers(): string
    {
        $this->nginxServersCalls++;
        return '';
    }

    public function createCronTasks(array &$tasks): void
    {
        $this->cronCalls++;
    }

    public function generateManagerConf(): string
    {
        $this->managerCalls++;
        return '';
    }
}
