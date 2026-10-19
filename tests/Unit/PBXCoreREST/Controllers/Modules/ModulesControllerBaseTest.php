<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Controllers\Modules;

use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Controllers\Modules\ModulesControllerBase;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Providers\ResponseProvider;
use Phalcon\Di\Di;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;
use stdClass;

/**
 * Regression coverage for the module pass of {@see ModulesControllerBase::callActionForModule()}.
 *
 * Module endpoints (`/pbxcore/api/modules/{module}/{action}`) decode the response that
 * `BaseController` has already built once more, as an associative array, to find the flat
 * `data.fpassthru` file descriptor. The default branch used to re-encode that array, so empty
 * JSON objects (`{}`) and objects with keys `"0","1",…` collapsed into JSON arrays (issue #1162,
 * follow-up to #1141). The payload must stay lossless while the `fpassthru` branch keeps reading
 * arrays.
 *
 * When `BaseController` has already answered itself (a core-format file streamed, the content
 * left empty), the module pass must leave it alone: it used to throw a TypeError after the file
 * was sent, on every ModuleAutoprovision config download (issue #1167).
 *
 * The HTTP status `BaseController` set (422/409 for a failed result, 503 for an overloaded queue)
 * must survive the module pass: the default branch used to reset it to 200 (issue #1166).
 */
class ModulesControllerBaseTest extends TestCase
{
    /**
     * Put the worker answer into the response the way BaseController does, then run the
     * module pass exactly as callActionForModule() does, through the real handleResponse().
     */
    private function passThroughModule(string $workerAnswer, int $httpCode = 200): Response
    {
        $response = new Response();
        $di = new Di();
        $di->setShared(ResponseProvider::SERVICE_NAME, $response);
        $controller = new ModulesControllerBase();
        $controller->setDI($di);

        $response->setPayloadSuccess((array) json_decode($workerAnswer), $httpCode);
        $handleResponse = new ReflectionMethod($controller, 'handleResponse');
        $handleResponse->invoke($controller, json_decode((string) $response->getContent(), true));

        return $response;
    }

    public function testKeepsNestedEmptyAndNumericKeyObjects(): void
    {
        $response = $this->passThroughModule(
            '{"result":true,"data":{"settings":{},"map":{"0":"a","1":"b"},"nested":{"x":{}},'
            . '"list":[1,2],"none":[]},"messages":[],"function":"getSettings","processor":"ModuleX","pid":1}'
        );
        $content = (string) $response->getContent();
        $decoded = json_decode($content);

        $this->assertInstanceOf(stdClass::class, $decoded->data->settings);
        $this->assertInstanceOf(stdClass::class, $decoded->data->map);
        $this->assertSame('a', $decoded->data->map->{'0'});
        $this->assertSame('b', $decoded->data->map->{'1'});
        $this->assertInstanceOf(stdClass::class, $decoded->data->nested->x);
        $this->assertSame([1, 2], $decoded->data->list);
        $this->assertSame([], $decoded->data->none);
        $this->assertSame([], $decoded->messages);
        $this->assertStringContainsString('"settings":{}', $content);
        $this->assertSame(200, $response->getStatusCode());
    }

    public function testFailedResultKeepsTheStatusBaseControllerSet(): void
    {
        // BaseController::sendRequestToBackendWorker() answers a result:false with 422 (or the
        // action's own httpCode); the module pass must not downgrade it to 200.
        $response = $this->passThroughModule(
            '{"result":false,"data":{"settings":{}},"messages":{"error":["LDAP bind failed"]},'
            . '"function":"test-ldap-bind","processor":"ModuleLdapSync","pid":1}',
            422
        );
        $decoded = json_decode((string) $response->getContent());

        $this->assertSame(422, $response->getStatusCode());
        $this->assertFalse($decoded->result);
        $this->assertSame(['LDAP bind failed'], $decoded->messages->error);
        $this->assertInstanceOf(stdClass::class, $decoded->data->settings);

        $this->assertSame(409, $this->passThroughModule('{"result":false,"data":[],"messages":[]}', 409)->getStatusCode());
        // A successful action's own 2xx (e.g. 201 Created) survives too.
        $this->assertSame(201, $this->passThroughModule('{"result":true,"data":[],"messages":[]}', 201)->getStatusCode());
    }

    /**
     * @testWith [503]
     *           [504]
     */
    public function testWorkerErrorKeepsItsStatus(int $status): void
    {
        // Queue backpressure (503) and worker timeout (504, #1171) are built with
        // setPayloadError()->setStatusCode().
        $response = new Response();
        $di = new Di();
        $di->setShared(ResponseProvider::SERVICE_NAME, $response);
        $controller = new ModulesControllerBase();
        $controller->setDI($di);
        $response->setPayloadError('Service temporarily unavailable, please retry later')->setStatusCode($status);

        $handleResponse = new ReflectionMethod($controller, 'handleResponse');
        $handleResponse->invoke($controller, json_decode((string) $response->getContent(), true));

        $this->assertSame($status, $response->getStatusCode());
        $this->assertFalse(json_decode((string) $response->getContent())->result);
    }

    public function testFlatFilePassThroughIsStillStreamed(): void
    {
        $file = (string) tempnam(sys_get_temp_dir(), 'mod1162');
        file_put_contents($file, 'provisioning config');

        $this->expectOutputString('provisioning config');
        $this->passThroughModule(json_encode([
            'result' => true,
            'data' => ['fpassthru' => true, 'filename' => $file, 'need_delete' => true],
            'messages' => [],
        ]));

        $this->assertFileDoesNotExist($file);
    }

    public function testStreamedCoreFormatFileIsNotRoutedAgain(): void
    {
        $file = (string) tempnam(sys_get_temp_dir(), 'mod1167');
        file_put_contents($file, 'phone config');
        $response = new Response();
        $di = new Di();
        $di->setShared(ResponseProvider::SERVICE_NAME, $response);
        $controller = new ModulesControllerBase();
        $controller->setDI($di);

        // BaseController::sendRequestToBackendWorker() streams a core-format descriptor itself
        // (handleSpecialResponse() -> handleFileStreaming()) and returns with the content empty.
        $handleSpecialResponse = new ReflectionMethod(BaseController::class, 'handleSpecialResponse');
        ob_start();
        ob_start(); // handleFullFileRequest() calls ob_flush(): keep a buffer level below it
        $handled = $handleSpecialResponse->invoke($controller, [
            'result' => true,
            'data' => ['fpassthru' => ['filename' => $file, 'content_type' => 'text/plain', 'need_delete' => true]],
            'messages' => [],
        ], null);
        ob_end_flush();
        $streamed = (string) ob_get_clean();

        // Then the module pass, exactly as callActionForModule() runs it.
        $handleResponse = new ReflectionMethod($controller, 'handleResponse');
        $handleResponse->invoke($controller, json_decode((string) $response->getContent(), true));

        $this->assertTrue($handled);
        $this->assertSame('phone config', $streamed);
        $this->assertFileDoesNotExist($file);
        $this->assertSame('', (string) $response->getContent());
    }
}
