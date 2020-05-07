<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace Nats;

/**
 * Class Php71RandomGenerator
 *
 * @package Nats
 */
class Php71RandomGenerator
{


    /**
     * A simple wrapper on random_bytes.
     *
     * @param integer $len Length of the string.
     *
     * @return string Random string.
     */
    public function generateString($len)
    {
        return bin2hex(random_bytes($len));
    }
}
