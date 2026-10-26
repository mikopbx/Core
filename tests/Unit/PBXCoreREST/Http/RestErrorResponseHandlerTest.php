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

namespace MikoPBX\Tests\Unit\PBXCoreREST\Http;

use MikoPBX\PBXCoreREST\Http\RestErrorResponseHandler;
use MikoPBX\PBXCoreREST\Providers\RestWhoopsErrorHandlerProvider;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Whoops\Handler\Handler;
use Whoops\Handler\PlainTextHandler;
use Whoops\Run;

/**
 * #1260: an exception that escapes the REST controllers must not reach the client in detail.
 */
class RestErrorResponseHandlerTest extends TestCase
{
    /**
     * Run Whoops with the REST handler and return what it would send to the client.
     */
    private function renderException(\Throwable $exception): string
    {
        $whoops = new Run();
        $whoops->appendHandler(new RestErrorResponseHandler());
        $whoops->writeToOutput(false);
        $whoops->allowQuit(false);

        return $whoops->handleException($exception);
    }

    public function testAnswersGenericJsonError(): void
    {
        $decoded = json_decode($this->renderException(new RuntimeException('boom')), true);

        $this->assertIsArray($decoded);
        $this->assertFalse($decoded['result']);
        $this->assertSame([], $decoded['data']);
        $this->assertSame(['error' => [RestErrorResponseHandler::MESSAGE]], $decoded['messages']);
    }

    public function testDoesNotLeakExceptionDetails(): void
    {
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer secret-token';
        $output = $this->renderException(new RuntimeException('read error on connection'));

        $this->assertStringNotContainsString('read error on connection', $output);
        $this->assertStringNotContainsString(__FILE__, $output);
        $this->assertStringNotContainsString(basename(__FILE__), $output);
        $this->assertStringNotContainsString('secret-token', $output);
        $this->assertStringNotContainsString('<', $output);
    }

    public function testQuitsWithJsonContentType(): void
    {
        $handler = new RestErrorResponseHandler();
        ob_start();
        $result = $handler->handle();
        ob_end_clean();

        $this->assertSame(Handler::QUIT, $result);
        $this->assertSame('application/json', $handler->contentType());
    }

    public function testCommandLineKeepsPlainTextHandler(): void
    {
        $this->assertInstanceOf(
            PlainTextHandler::class,
            (new RestWhoopsErrorHandlerProvider())->createOutputHandler()
        );
    }
}
