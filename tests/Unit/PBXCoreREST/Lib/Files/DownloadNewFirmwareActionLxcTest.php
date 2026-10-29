<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Lib\Files;

use MikoPBX\PBXCoreREST\Lib\Files\DownloadNewFirmwareAction;
use PHPUnit\Framework\TestCase;

/**
 * #1295: an IMG cannot be applied on LXC, so files:downloadFirmware refuses before downloading.
 */
final class DownloadNewFirmwareActionLxcTest extends TestCase
{
    public function testRefusesDownloadInLxcContainer(): void
    {
        putenv('container=lxc');
        try {
            $res = DownloadNewFirmwareAction::main([
                'url' => 'https://example.com/mikopbx.img',
                'md5' => str_repeat('a', 32),
            ]);
        } finally {
            putenv('container');
        }

        $this->assertFalse($res->success);
        $this->assertCount(1, $res->messages['error']);
        $this->assertStringContainsString('lxc', strtolower((string)$res->messages['error'][0]));
        $this->assertSame([], $res->data);
    }
}
