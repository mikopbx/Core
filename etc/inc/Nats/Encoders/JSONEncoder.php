<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace Nats\Encoders;

/**
 * Class JSONEncoder
 *
 * Encodes and decodes messages in JSON format.
 *
 * @package Nats
 */
class JSONEncoder implements Encoder
{


    /**
     * Encodes a message to JSON.
     *
     * @param string $payload Message to decode.
     *
     * @return mixed
     */
    public function encode($payload)
    {
        $payload = json_encode($payload);
        return $payload;
    }

    /**
     * Decodes a message from JSON.
     *
     * @param string $payload Message to decode.
     *
     * @return mixed
     */
    public function decode($payload)
    {
        $payload = json_decode($payload, true);
        return $payload;
    }
}
