<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace PhpSchool\CliMenu\Exception;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class InvalidShortcutException extends \RuntimeException
{
    public static function fromShortcut(string $shortcut) : self
    {
        return new self(sprintf('Shortcut key must be only one character. Got: "%s"', $shortcut));
    }
}
