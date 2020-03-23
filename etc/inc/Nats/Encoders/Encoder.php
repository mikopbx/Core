<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

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
