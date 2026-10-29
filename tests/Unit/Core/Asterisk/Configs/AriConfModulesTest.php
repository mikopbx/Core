<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk\Configs;

use MikoPBX\Core\Asterisk\Configs\AriConf;
use PHPUnit\Framework\TestCase;

/**
 * #1262: with ARI enabled, ExternalMedia needs the UnicastRTP channel driver,
 * and modules.conf uses autoload=no, so it must be in the ARI module list.
 */
final class AriConfModulesTest extends TestCase
{
    public function testLoadsUnicastRtpChannelAfterItsDependency(): void
    {
        $modules = AriConf::getAriModules();

        $multicast = array_search('res_rtp_multicast.so', $modules, true);
        $chanRtp = array_search('chan_rtp.so', $modules, true);

        self::assertIsInt($multicast);
        self::assertIsInt($chanRtp);
        self::assertLessThan($chanRtp, $multicast, 'res_rtp_multicast.so must be loaded before chan_rtp.so');
    }
}
