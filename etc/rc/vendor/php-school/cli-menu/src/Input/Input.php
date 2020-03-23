<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace PhpSchool\CliMenu\Input;

use PhpSchool\CliMenu\MenuStyle;

/**
 * @author Aydin Hassan <aydin@hotmail.co.uk>
 */
interface Input
{
    public function ask() : InputResult;

    public function validate(string $input) : bool;

    public function setPromptText(string $promptText) : Input;

    public function getPromptText() : string;

    public function setValidationFailedText(string $validationFailedText) : Input;

    public function getValidationFailedText() : string;

    public function setPlaceholderText(string $placeholderText) : Input;

    public function getPlaceholderText() : string;

    public function filter(string $value) : string;

    public function getStyle() : MenuStyle;
}
