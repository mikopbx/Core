<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk;

use MikoPBX\Core\Asterisk\Configs\QueueConf;
use PHPUnit\Framework\TestCase;

final class QueueConfSecurityTest extends TestCase
{
    public function testStoredQueueNameCannotOpenAnotherConfigurationSection(): void
    {
        $queueConf = new QueueConfSecurityFixture([
            'uniqid' => 'QUEUE-TEST',
            'name' => "Sales\n[INJECTED-QUEUE]\nstrategy=linear",
            'strategy' => 'ringall',
            'recive_calls_while_on_a_call' => '0',
            'announce_position' => '0',
            'announce_hold_time' => '0',
            'seconds_to_ring_each_member' => '15',
            'seconds_for_wrapup' => '3',
            'periodic_announce' => '',
            'periodic_announce_frequency' => '',
            'moh_sound' => 'default',
            'redirect_to_extension_if_empty' => '',
            'agents' => [],
        ]);

        $config = $queueConf->render();

        self::assertStringContainsString('[QUEUE-TEST]; Sales [INJECTED-QUEUE] strategy=linear', $config);
        self::assertStringNotContainsString("\n[INJECTED-QUEUE]\n", $config);
        self::assertSame(1, preg_match_all('/^\[/m', $config));
    }
}

final class QueueConfSecurityFixture extends QueueConf
{
    private string $capturedConfig = '';

    public function __construct(private readonly array $queue)
    {
    }

    public function getQueueData(): array
    {
        return [$this->queue];
    }

    public function render(): string
    {
        $this->generateConfigProtected();

        return $this->capturedConfig;
    }

    protected function saveConfig(string $config, string $filename): void
    {
        $this->capturedConfig = $config;
    }
}
