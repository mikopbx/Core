<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Http;

use MikoPBX\PBXCoreREST\Http\Request;
use PHPUnit\Framework\TestCase;

/**
 * Regression coverage for {@see Request::getData()} (#1161).
 *
 * GET and HEAD must never read a request body. DELETE keeps its body:
 * the admin UI sends
 * `deleteRecording` as a form body (jQuery puts DELETE `data` into the
 * body) and the API tests send it as JSON.
 *
 * `php://input` is empty under the CLI, so the raw body is stubbed via a
 * partial mock of {@see Request::getRawBody()}.
 */
class RequestGetDataTest extends TestCase
{
    private const JSON_BODY = '{"uniqid":"../../evil","fromBody":"1"}';

    public function setUp(): void
    {
        parent::setUp();
        $_GET = ['fromQuery' => '1'];
        $_POST = [];
    }

    public function tearDown(): void
    {
        $_GET = [];
        $_POST = [];
        unset($_SERVER['REQUEST_METHOD'], $_SERVER['CONTENT_TYPE']);
        parent::tearDown();
    }

    private function requestWithBody(string $method, string $contentType, string $rawBody): Request
    {
        $_SERVER['REQUEST_METHOD'] = $method;
        $_SERVER['CONTENT_TYPE'] = $contentType;

        $request = $this->getMockBuilder(Request::class)
            ->onlyMethods(['getRawBody', 'getContentType'])
            ->getMock();
        $request->method('getRawBody')->willReturn($rawBody);
        $request->method('getContentType')->willReturn($contentType);

        return $request;
    }

    /** @dataProvider ignoredBodyMethods */
    public function testIgnoredMethodsNeverReadBody(string $method, string $contentType): void
    {
        $request = $this->requestWithBody($method, $contentType, self::JSON_BODY);
        $request->expects($this->never())->method('getRawBody');
        $request->expects($this->never())->method('getContentType');

        $this->assertSame(['fromQuery' => '1'], $request->getData());
    }

    public static function ignoredBodyMethods(): iterable
    {
        foreach (['GET', 'HEAD'] as $method) {
            foreach (['application/json', 'application/x-www-form-urlencoded'] as $type) {
                yield "$method $type" => [$method, $type];
            }
        }
    }

    /** @dataProvider jsonBodyMethods */
    public function testWritesReadJsonBodyAndQueryWins(string $method): void
    {
        $_GET['uniqid'] = 'fromQuery';
        $request = $this->requestWithBody($method, 'application/json', self::JSON_BODY);

        $data = $request->getData();

        $this->assertSame('1', $data['fromBody']);
        $this->assertSame('fromQuery', $data['uniqid'], 'query parameters take precedence over the body');
        $this->assertSame('1', $data['fromQuery']);
    }

    public static function jsonBodyMethods(): iterable
    {
        foreach (['POST', 'PUT', 'PATCH', 'DELETE'] as $method) {
            yield $method => [$method];
        }
    }

    public function testDeleteReadsJsonBody(): void
    {
        $request = $this->requestWithBody('DELETE', 'application/json', '{"deleteRecording":true}');

        $this->assertSame(['deleteRecording' => true, 'fromQuery' => '1'], $request->getData());
    }

    public function testDeleteReadsFormBody(): void
    {
        $request = $this->requestWithBody(
            'DELETE',
            'application/x-www-form-urlencoded',
            'deleteRecording=true'
        );

        $this->assertSame(['deleteRecording' => 'true', 'fromQuery' => '1'], $request->getData());
    }
}
