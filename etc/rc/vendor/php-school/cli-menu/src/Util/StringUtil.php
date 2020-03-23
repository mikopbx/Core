<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace PhpSchool\CliMenu\Util;

/**
 * @author Michael Woodward <mikeymike.mw@gmail.com>
 */
class StringUtil
{
    /**
     * Minimal multi-byte wordwrap implementation
     * which also takes break length into consideration
     */
    public static function wordwrap(string $string, int $width, string $break = "\n") : string
    {
        return implode(
            $break,
            array_map(function (string $line) use ($width, $break) {
                $line = rtrim($line);
                if (mb_strlen($line) <= $width) {
                    return $line;
                }
                
                $words  = explode(' ', $line);
                $line   = '';
                $actual = '';
                foreach ($words as $word) {
                    if (mb_strlen($actual . $word) <= $width) {
                        $actual .= $word . ' ';
                    } else {
                        if ($actual !== '') {
                            $line .= rtrim($actual) . $break;
                        }
                        $actual = $word . ' ';
                    }
                }
                return $line . trim($actual);
            }, explode("\n", $string))
        );
    }

    public static function stripAnsiEscapeSequence(string $str) : string
    {
        return (string) preg_replace('/\x1b[^m]*m/', '', $str);
    }

    public static function length(string $str, bool $ignoreAnsiEscapeSequence = true) : int
    {
        return mb_strlen($ignoreAnsiEscapeSequence ? self::stripAnsiEscapeSequence($str) : $str);
    }
}
