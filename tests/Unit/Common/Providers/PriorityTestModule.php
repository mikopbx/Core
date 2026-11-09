<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Providers;

/**
 * Module config stand-in: reports a priority per hook and answers each hook with its name.
 */
final class PriorityTestModule
{
    /**
     * @param array<string, int> $priorities
     */
    public function __construct(private string $name, private array $priorities)
    {
    }

    public function getMethodPriority(string $methodName = ''): int
    {
        return $this->priorities[$methodName] ?? 1000;
    }

    public function hookA(): string
    {
        return $this->name;
    }

    public function hookB(): string
    {
        return $this->name;
    }
}
