<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\System;

use MikoPBX\Core\System\System;
use MikoPBX\Tests\Unit\AbstractUnitTest;

/**
 * Regression coverage for {@see System::getDockerNetworkMode()} and its pure
 * helper {@see System::detectDockerNetworkMode()}.
 *
 * The detector is used by the Firewall UI banner and by the
 * `system:checkClientIpVisibility` REST endpoint to tell junior admins
 * when their Docker deployment hides the real client IP behind a veth
 * pair. The four contractually-required outcomes are exercised through
 * the pure helper to avoid mocking /sys/class/net at filesystem level.
 *
 * Mapping of outcomes:
 *   - 'native'  — not Docker at all (LXC or bare-metal)
 *   - 'host'    — Docker with --network=host (no veth pair → iflink == ifindex)
 *   - 'bridge'  — Docker bridge (veth pair present → iflink != ifindex)
 *   - 'unknown' — Docker but sysfs unreadable or eth0 missing
 */
class DockerNetworkModeTest extends AbstractUnitTest
{
    public function testReturnsNativeOutsideDocker(): void
    {
        $this->assertSame(
            'native',
            System::detectDockerNetworkMode(false, '5', '5')
        );
        // Even with bridge-shaped sysfs values, non-Docker must short-circuit.
        $this->assertSame(
            'native',
            System::detectDockerNetworkMode(false, '11', '5')
        );
    }

    public function testReturnsBridgeWhenIflinkDiffersFromIfindex(): void
    {
        // Real veth pair example: container eth0 has its own ifindex but
        // iflink points to the host-side veth peer.
        $this->assertSame(
            'bridge',
            System::detectDockerNetworkMode(true, '11', '5')
        );
    }

    public function testReturnsHostWhenIflinkEqualsIfindex(): void
    {
        // Docker --network=host: eth0 is the host's own interface, no veth pair.
        $this->assertSame(
            'host',
            System::detectDockerNetworkMode(true, '2', '2')
        );
    }

    public function testReturnsUnknownWhenFilesMissingInsideDocker(): void
    {
        $this->assertSame(
            'unknown',
            System::detectDockerNetworkMode(true, null, null),
            'Both files missing must yield unknown'
        );
        $this->assertSame(
            'unknown',
            System::detectDockerNetworkMode(true, '5', null),
            'Only ifindex missing must yield unknown'
        );
        $this->assertSame(
            'unknown',
            System::detectDockerNetworkMode(true, null, '5'),
            'Only iflink missing must yield unknown'
        );
        $this->assertSame(
            'unknown',
            System::detectDockerNetworkMode(true, '', ''),
            'Empty reads (e.g. permission failure) must yield unknown'
        );
    }

    /**
     * The public method delegates to the helper after filesystem reads;
     * outside Docker the helper short-circuits before touching /sys, so
     * this case is portable and safe to assert on any host (CI, macOS dev).
     */
    public function testPublicMethodReturnsNativeOutsideDocker(): void
    {
        if (file_exists('/.dockerenv')) {
            $this->markTestSkipped('Test host is itself a Docker container — cannot assert native here');
        }
        $this->assertSame('native', System::getDockerNetworkMode());
    }

    /**
     * Belt-and-braces: getPlatformInfo() must include the new
     * DOCKER_NETWORK_MODE key alongside the existing ARCH/TYPE/BOARD
     * fields without renaming or removing any of them. Existing
     * release-server payload consumers depend on this contract.
     */
    public function testPlatformInfoExposesDockerNetworkModeKey(): void
    {
        $info = System::getPlatformInfo();
        $this->assertArrayHasKey('ARCH', $info);
        $this->assertArrayHasKey('TYPE', $info);
        $this->assertArrayHasKey('BOARD', $info);
        $this->assertArrayHasKey('DOCKER_NETWORK_MODE', $info);
        $this->assertContains(
            $info['DOCKER_NETWORK_MODE'],
            ['native', 'host', 'bridge', 'unknown'],
            'DOCKER_NETWORK_MODE must be one of the four contractually-defined values'
        );
    }
}
