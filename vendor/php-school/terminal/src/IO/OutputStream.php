<?php

namespace PhpSchool\Terminal\IO;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
interface OutputStream
{
    /**
     * Write the buffer to the stream
     */
    public function write(string $buffer) : void;

    /**
     * Whether the stream is connected to an interactive terminal
     */
    public function isInteractive() : bool;
}
