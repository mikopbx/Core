<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs\Generators;

use MikoPBX\Core\Asterisk\Configs\ResParkingConf;

/**
 * Injects parking settings directly and captures saveConfig() output,
 * so tests need no DI, database or filesystem access.
 */
final class ResParkingConfFixture extends ResParkingConf
{
    private ?string $savedConfig = null;

    public function __construct(
        string $parkingExt = '800',
        string $parkingFeature = '*2',
        private readonly string $parkingDuration = '50',
        int $startSlot = 801,
        int $endSlot = 820
    ) {
        $this->ParkingExt       = $parkingExt;
        $this->ParkingFeature   = $parkingFeature;
        $this->ParkingDuration  = $this->parkingDuration;
        $this->ParkingStartSlot = (string)$startSlot;
        $this->ParkingEndSlot   = (string)$endSlot;
    }

    public function captureConfig(): string
    {
        $this->savedConfig = null;
        $this->generateConfigProtected();

        return $this->savedConfig ?? '';
    }

    public function getSettings(): void
    {
        // Parking settings come from the constructor; a re-read would need the database.
    }

    protected function saveConfig(string $config, string $filename): void
    {
        $this->savedConfig = $config;
    }
}
