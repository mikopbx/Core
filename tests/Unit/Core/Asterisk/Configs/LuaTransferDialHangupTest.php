<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use PHPUnit\Framework\TestCase;

final class LuaTransferDialHangupTest extends TestCase
{
    public function testHangupEventCarriesInheritedTransferUniqueId(): void
    {
        $source = file_get_contents(dirname(__DIR__, 5) . '/src/Core/Asterisk/Configs/lua/extensions.lua');

        self::assertIsString($source);
        self::assertMatchesRegularExpression(
            '/function event_transfer_dial_hangup\(\).*?data\[\'transfer_UNIQUEID\'\]\s*=\s*get_variable\("transfer_UNIQUEID"\)/s',
            $source
        );
    }
}
