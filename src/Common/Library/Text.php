<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace MikoPBX\Common\Library;

use Phalcon\Support\HelperFactory;

/**
 *
 */
class Text
{
    public static function camelize(string $text, string $delimiters = null, bool $lowerFirst = false):string
    {
        $helper = new HelperFactory();
        if ($delimiters === '\\') {
            $delimiters = preg_quote($delimiters, '\\');
        }
        return $helper->camelize($text, $delimiters, $lowerFirst);
    }

    public static function uncamelize(string $text, string $delimiter = '_'):string
    {
        $helper = new HelperFactory();
        if ($delimiter === '\\') {
            $delimiter = preg_quote($delimiter, '\\');
        }
        return $helper->uncamelize($text, $delimiter);
    }

    public static function startsWith(string $haystack, string $needle, bool $ignoreCase = true):bool
    {
        $helper = new HelperFactory();
        return $helper->startsWith($haystack, $needle, $ignoreCase);
    }

    public static function underscore(string $text):string{
        $helper = new HelperFactory();
        return $helper->underscore($text);
    }
}