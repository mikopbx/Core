<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 */

declare(strict_types=1);

namespace MikoPBX\Common\Library;

/**
 * Validates provider-controlled values before they reach Asterisk dialplan syntax.
 */
final class ProviderDialplanFieldValidator
{
    public const string HEADER_NAME_PATTERN = '\A(?:[A-Za-z0-9-]{1,100})?\z';
    public const string DELIMITER_PATTERN = '\A(?:[A-Za-z0-9<>\[\]:=\/._@#%+*\-])?\z';

    public static function isValidHeaderName(string $value): bool
    {
        return preg_match('/' . self::HEADER_NAME_PATTERN . '/D', $value) === 1;
    }

    public static function isValidDelimiter(string $value): bool
    {
        return preg_match('/' . self::DELIMITER_PATTERN . '/D', $value) === 1;
    }
}
