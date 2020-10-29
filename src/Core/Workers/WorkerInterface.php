<?php


namespace MikoPBX\Core\Workers;

use MikoPBX\Core\System\BeanstalkClient;

interface WorkerInterface
{
    /**
     * Workers constructor
     */
    public function __construct();

    /**
     * Ping callback for keep alive check
     *
     * @param BeanstalkClient $message
     */
    public function pingCallBack(BeanstalkClient $message): void;

    /**
     * Create PID file for worker
     */
    public function getPidFile(): string;

    /**
     * Worker entry point
     *
     * @param mixed $params
     */
    public function start($params): void;

}