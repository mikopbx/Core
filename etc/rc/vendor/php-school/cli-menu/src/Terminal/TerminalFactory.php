<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace PhpSchool\CliMenu\Terminal;

use PhpSchool\Terminal\IO\ResourceInputStream;
use PhpSchool\Terminal\IO\ResourceOutputStream;
use PhpSchool\Terminal\Terminal;
use PhpSchool\Terminal\UnixTerminal;

/**
 * @author Michael Woodward <mikeymike.mw@gmail.com>
 */
class TerminalFactory
{
    public static function fromSystem() : Terminal
    {
        return new UnixTerminal(new ResourceInputStream, new ResourceOutputStream);
    }
}
