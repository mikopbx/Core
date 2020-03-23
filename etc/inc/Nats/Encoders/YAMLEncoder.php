<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace Nats\Encoders;

/**
 * Class YAMLEncoder
 *
 * Encodes and decodes messages in YAML format.
 *
 * @package Nats
 */
class YAMLEncoder implements Encoder
{


    /**
     * Encodes a message to YAML.
     *
     * @param string $payload Message to decode.
     *
     * @return mixed
     */
    public function encode($payload)
    {
        $payload = yaml_emit($payload);
        return $payload;
    }

    /**
     * Decodes a message from YAML.
     *
     * @param string $payload Message to decode.
     *
     * @return mixed
     */
    public function decode($payload)
    {
        $payload = yaml_parse($payload);
        return $payload;
    }
}
