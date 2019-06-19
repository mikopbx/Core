<?php
namespace Nats\Encoders;

/**
 * Interface Encoder
 *
 * @package Nats\Encoders
 */
interface Encoder
{


    /**
     * Encodes a message.
     *
     * @param string $payload Message to decode.
     *
     * @return mixed
     */
    public function encode($payload);

    /**
     * Decodes a message.
     *
     * @param string $payload Message to decode.
     *
     * @return mixed
     */
    public function decode($payload);
}
