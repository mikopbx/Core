<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\PBXCoreREST\Lib;


class PBXApiResult
{
    public const SUCCESS = 'Success';

    public const ERROR = 'Error';

    /**
     * Request result
     *
     * @var bool
     */
    public bool $success = false;

    /**
     * Array of result fields
     *
     * @var array
     */
    public array $data;

    /**
     * Error messages, description of failure
     *
     * @var array
     */
    public array $messages;

    /**
     * Function and class name which process this request
     *
     * @var string
     */
    public string $processor;

    /**
     * Requested function
     *
     * @var string
     */
    public string $function;


    public function __construct()
    {
        $this->success   = false;
        $this->data      = [];
        $this->messages  = [];
        $this->function  = '';
        $this->processor = '';
    }


    /**
     * Prepare structured result
     *
     * @return array
     */
    public function getResult(): array
    {
        return [
            'result'    => $this->success,
            'data'      => $this->data,
            'messages'  => $this->messages,
            'function'  => $this->function,
            'processor' => $this->processor,
            'pid'       => getmypid(),
        ];
    }
}