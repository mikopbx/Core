<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace PhpSchool\Terminal\IO;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
interface InputStream
{
    /**
     * Callback should be called with the number of bytes requested
     * when ready.
     */
    public function read(int $numBytes, callable $callback) : void;

    /**
     * Whether the stream is connected to an interactive terminal
     */
    public function isInteractive() : bool;
}
