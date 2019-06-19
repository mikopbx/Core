<?php

namespace Http\Message\StreamFactory;

use function GuzzleHttp\Psr7\stream_for;
use Http\Message\StreamFactory;

/**
 * Creates Guzzle streams.
 *
 * @author Михаил Красильников <m.krasilnikov@yandex.ru>
 */
final class GuzzleStreamFactory implements StreamFactory
{
    /**
     * {@inheritdoc}
     */
    public function createStream($body = null)
    {
        return stream_for($body);
    }
}
