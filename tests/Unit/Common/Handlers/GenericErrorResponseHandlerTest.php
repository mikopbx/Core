<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Common\Handlers;

use MikoPBX\Common\Handlers\GenericErrorResponseHandler;
use MikoPBX\Common\Providers\ConfigProvider;
use MikoPBX\Common\Providers\WhoopsErrorHandlerProvider;
use Phalcon\Config\Config;
use Phalcon\Di\Di;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Whoops\Handler\Handler;
use Whoops\Handler\JsonResponseHandler;
use Whoops\Handler\PlainTextHandler;
use Whoops\Handler\PrettyPageHandler;
use Whoops\Run;

/**
 * An exception that escapes the AdminCabinet must not reach the client in detail.
 */
class GenericErrorResponseHandlerTest extends TestCase
{
    /**
     * Run Whoops with the generic handler and return what it would send to the client.
     */
    private function renderException(\Throwable $exception, bool $asJson): string
    {
        $whoops = new Run();
        $whoops->appendHandler(new GenericErrorResponseHandler($asJson));
        $whoops->writeToOutput(false);
        $whoops->allowQuit(false);

        return $whoops->handleException($exception);
    }

    public function testAjaxAnswersGenericJsonError(): void
    {
        $decoded = json_decode($this->renderException(new RuntimeException('boom'), true), true);

        $this->assertIsArray($decoded);
        $this->assertFalse($decoded['success']);
        $this->assertSame(['error' => [GenericErrorResponseHandler::MESSAGE]], $decoded['message']);
    }

    public function testPageAnswersGenericHtml(): void
    {
        $output = $this->renderException(new RuntimeException('boom'), false);

        $this->assertStringStartsWith('<!DOCTYPE html>', $output);
        $this->assertStringContainsString(GenericErrorResponseHandler::MESSAGE, $output);
    }

    /**
     * @return array<string, array{bool}>
     */
    public static function formatProvider(): array
    {
        return ['json' => [true], 'html' => [false]];
    }

    /**
     * @dataProvider formatProvider
     */
    public function testDoesNotLeakExceptionDetails(bool $asJson): void
    {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer secret-token';
        putenv('MIKO_TEST_SECRET=env-secret');
        $output = $this->renderException(new RuntimeException('read error on connection'), $asJson);

        $this->assertStringNotContainsString('read error on connection', $output);
        $this->assertStringNotContainsString(RuntimeException::class, $output);
        $this->assertStringNotContainsString(__FILE__, $output);
        $this->assertStringNotContainsString(basename(__FILE__), $output);
        $this->assertStringNotContainsString('secret-token', $output);
        $this->assertStringNotContainsString('env-secret', $output);
    }

    public function testQuitsWithMatchingContentType(): void
    {
        foreach (['application/json' => true, 'text/html' => false] as $contentType => $asJson) {
            $handler = new GenericErrorResponseHandler($asJson);
            ob_start();
            $result = $handler->handle();
            ob_end_clean();

            $this->assertSame(Handler::QUIT, $result);
            $this->assertSame($contentType, $handler->contentType());
        }
    }

    public function testWebHandlerIsGenericWithoutDebugMode(): void
    {
        $page = WhoopsErrorHandlerProvider::createWebOutputHandler(false, false);
        $ajax = WhoopsErrorHandlerProvider::createWebOutputHandler(true, false);

        $this->assertInstanceOf(GenericErrorResponseHandler::class, $page);
        $this->assertSame('text/html', $page->contentType());
        $this->assertInstanceOf(GenericErrorResponseHandler::class, $ajax);
        $this->assertSame('application/json', $ajax->contentType());
    }

    public function testDebugModeKeepsDetailedHandlers(): void
    {
        $this->assertInstanceOf(
            PrettyPageHandler::class,
            WhoopsErrorHandlerProvider::createWebOutputHandler(false, true)
        );
        $this->assertInstanceOf(
            JsonResponseHandler::class,
            WhoopsErrorHandlerProvider::createWebOutputHandler(true, true)
        );
    }

    public function testDebugModeIsOffWithoutConfig(): void
    {
        Di::reset();
        $this->assertFalse(WhoopsErrorHandlerProvider::isDebugMode());

        $di = new Di();
        $di->setShared(ConfigProvider::SERVICE_NAME, function () {
            throw new RuntimeException('Config file does not exist');
        });
        Di::setDefault($di);
        $this->assertFalse(WhoopsErrorHandlerProvider::isDebugMode());
    }

    public function testDebugModeFollowsAdminApplicationSetting(): void
    {
        foreach ([true, false] as $debugMode) {
            $di = new Di();
            $di->setShared(
                ConfigProvider::SERVICE_NAME,
                new Config(['adminApplication' => ['debugMode' => $debugMode]])
            );
            Di::setDefault($di);
            $this->assertSame($debugMode, WhoopsErrorHandlerProvider::isDebugMode());
        }
    }

    public function testCommandLineKeepsPlainTextHandler(): void
    {
        $this->assertInstanceOf(
            PlainTextHandler::class,
            (new WhoopsErrorHandlerProvider())->createOutputHandler()
        );
    }
}
