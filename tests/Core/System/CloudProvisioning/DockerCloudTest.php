<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Tests\Core\System\CloudProvisioning;

use MikoPBX\Core\System\CloudProvisioning\DockerCloud;
use MikoPBX\Core\System\Util;
use PHPUnit\Framework\TestCase;

/**
 * Unit tests for DockerCloud provider.
 *
 * Tests the Docker-specific cloud provisioning functionality.
 * Note: Most tests are limited because they depend on running in a Docker container.
 *
 * Note: This test uses PHPUnit\Framework\TestCase directly without MikoPBX DI
 * to allow running tests outside of Docker container environment.
 *
 * @package MikoPBX\Tests\Core\System\CloudProvisioning
 */
class DockerCloudTest extends TestCase
{
    private DockerCloud $dockerCloud;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dockerCloud = new DockerCloud();
    }

    /**
     * Test that CloudID constant is set correctly.
     */
    public function testCloudIdConstant(): void
    {
        $this->assertSame('DockerCloud', DockerCloud::CloudID);
    }

    /**
     * Test checkAvailability returns a promise.
     */
    public function testCheckAvailabilityReturnsPromise(): void
    {
        $promise = $this->dockerCloud->checkAvailability();

        $this->assertInstanceOf(\GuzzleHttp\Promise\PromiseInterface::class, $promise);
    }

    /**
     * Test checkAvailability resolves to boolean.
     */
    public function testCheckAvailabilityResolvesToBoolean(): void
    {
        $promise = $this->dockerCloud->checkAvailability();
        $result = $promise->wait();

        $this->assertIsBool($result);
    }

    /**
     * Test checkAvailability matches Util::isDocker().
     */
    public function testCheckAvailabilityMatchesUtilIsDocker(): void
    {
        $expectedResult = Util::isDocker();
        $promise = $this->dockerCloud->checkAvailability();
        $result = $promise->wait();

        $this->assertSame($expectedResult, $result);
    }

    /**
     * Test provision returns false when not in Docker.
     *
     * Note: This test will only pass when NOT running in Docker.
     */
    public function testProvisionReturnsFalseOutsideDocker(): void
    {
        if (Util::isDocker()) {
            $this->markTestSkipped('Test only runs outside Docker');
        }

        $result = $this->dockerCloud->provision();

        $this->assertFalse($result);
    }

    /**
     * Test that DockerCloud extends CloudProvider.
     */
    public function testExtendsCloudProvider(): void
    {
        $this->assertInstanceOf(
            \MikoPBX\Core\System\CloudProvisioning\CloudProvider::class,
            $this->dockerCloud
        );
    }

    /**
     * Test that applyPortSettings method exists and is callable via reflection.
     * This tests the method signature without actually calling it.
     */
    public function testApplyPortSettingsMethodExists(): void
    {
        $reflection = new \ReflectionClass(DockerCloud::class);

        $this->assertTrue($reflection->hasMethod('applyPortSettings'));
        $method = $reflection->getMethod('applyPortSettings');
        $this->assertTrue($method->isPrivate());
    }

    /**
     * Test JSON settings path constant.
     */
    public function testJsonSettingsPathConstant(): void
    {
        $reflection = new \ReflectionClass(DockerCloud::class);
        $constants = $reflection->getConstants();

        $this->assertArrayHasKey('JSON_SETTINGS_PATH', $constants);
        $this->assertSame('/etc/inc/mikopbx-settings.json', $constants['JSON_SETTINGS_PATH']);
    }
}
