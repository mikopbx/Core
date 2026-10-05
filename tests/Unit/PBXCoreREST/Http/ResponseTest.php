<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Http;

use MikoPBX\PBXCoreREST\Http\Response;
use PHPUnit\Framework\TestCase;
use stdClass;

/**
 * Regression coverage for {@see Response::send()}, which decodes the payload
 * once more to append `meta` before the REST response leaves the PBX.
 *
 * The decode must be lossless: an empty JSON object (`{}`) or an object with
 * keys `"0","1",…` has to stay an object, not collapse into a JSON array
 * (issue #1141, e.g. `providers:getStatuses` answering `"iax": []`).
 */
class ResponseTest extends TestCase
{
    /**
     * Run the real send() for the given content and return the raw output.
     */
    private function sendContent(string $content): string
    {
        $response = new Response();
        $response->setContent($content);
        ob_start();
        $response->send();

        return (string) ob_get_clean();
    }

    public function testKeepsNestedEmptyAndNumericKeyObjects(): void
    {
        $out = $this->sendContent(
            '{"result":true,"data":{"iax":{},"list":[],"map":{"0":"a","1":"b"},"nested":{"x":{}}}}'
        );
        $decoded = json_decode($out);

        $this->assertInstanceOf(stdClass::class, $decoded);
        $this->assertTrue($decoded->result);
        $this->assertInstanceOf(stdClass::class, $decoded->data->iax);
        $this->assertInstanceOf(stdClass::class, $decoded->data->map);
        $this->assertSame('a', $decoded->data->map->{'0'});
        $this->assertSame('b', $decoded->data->map->{'1'});
        $this->assertInstanceOf(stdClass::class, $decoded->data->nested->x);
        $this->assertIsArray($decoded->data->list);
        $this->assertNotEmpty($decoded->meta->timestamp);
        $this->assertNotEmpty($decoded->meta->hash);
        $this->assertStringContainsString('"iax":{}', $out);
    }

    public function testEmptyContentYieldsOnlyMeta(): void
    {
        $decoded = json_decode($this->sendContent(''));

        $this->assertInstanceOf(stdClass::class, $decoded);
        $this->assertSame(['meta'], array_keys(get_object_vars($decoded)));
        $this->assertNotEmpty($decoded->meta->timestamp);
        $this->assertNotEmpty($decoded->meta->hash);
    }

    public function testInvalidContentYieldsOnlyMeta(): void
    {
        $decoded = json_decode($this->sendContent('{not json'));

        $this->assertInstanceOf(stdClass::class, $decoded);
        $this->assertSame(['meta'], array_keys(get_object_vars($decoded)));
    }

    public function testTopLevelListBecomesObjectWithMeta(): void
    {
        $decoded = json_decode($this->sendContent('[1,2]'));

        $this->assertInstanceOf(stdClass::class, $decoded);
        $this->assertSame(['0', '1', 'meta'], array_map('strval', array_keys(get_object_vars($decoded))));
        $this->assertSame(1, $decoded->{'0'});
        $this->assertSame(2, $decoded->{'1'});
    }
}
