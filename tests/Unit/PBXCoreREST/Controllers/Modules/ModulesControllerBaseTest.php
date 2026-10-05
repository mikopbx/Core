<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Controllers\Modules;

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
 * `BaseController` has already built once more, as an associative array, to route the
 * control keys (`fpassthru`, `html`, `redirect`, `echo`, `echo_file`). The default branch
 * used to re-encode that array, so empty JSON objects (`{}`) and objects with keys
 * `"0","1",…` collapsed into JSON arrays (issue #1162, follow-up to #1141). The payload
 * must stay lossless while the control branches keep reading arrays.
 */
class ModulesControllerBaseTest extends TestCase
{
    /**
     * Put the worker answer into the response the way BaseController does, then run the
     * module pass exactly as callActionForModule() does, through the real handleResponse().
     */
    private function passThroughModule(string $workerAnswer): Response
    {
        $response = new Response();
        $di = new Di();
        $di->setShared(ResponseProvider::SERVICE_NAME, $response);
        $controller = new ModulesControllerBase();
        $controller->setDI($di);

        $response->setPayloadSuccess((array) json_decode($workerAnswer));
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
}
