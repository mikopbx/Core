<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace PhpSchool\CliMenu\Input;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
class InputResult
{
    /**
     * @var string
     */
    private $input;

    public function __construct(string $input)
    {
        $this->input = $input;
    }

    public function fetch() : string
    {
        return $this->input;
    }
}
