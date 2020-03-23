<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

declare(strict_types=1);

namespace PhpSchool\CliMenu\Exception;

use InvalidArgumentException;

class CannotShrinkMenuException extends InvalidArgumentException
{
    public static function fromMarginAndTerminalWidth(int $margin, int $terminalWidth) : self
    {
        return new self(
            sprintf(
                'Cannot shrink menu. Margin: %s * 2 with terminal width: %s leaves no space for menu',
                $margin,
                $terminalWidth
            )
        );
    }
}
