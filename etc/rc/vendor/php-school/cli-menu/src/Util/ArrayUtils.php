<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

declare(strict_types=1);

namespace PhpSchool\CliMenu\Util;

function mapWithKeys(array $array, callable $callback) : array
{
    return array_combine(
        array_keys($array),
        array_map($callback, array_keys($array), $array)
    );
}

function each(array $array, callable $callback) : void
{
    foreach ($array as $k => $v) {
        $callback($k, $v);
    }
}
