<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2020
 *
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