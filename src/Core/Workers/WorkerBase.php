<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;



use MikoPBX\Core\System\BeanstalkClient;
use Phalcon\Di;
use Phalcon\Text;

abstract class WorkerBase implements WorkerInterface
{

    /** @var \Phalcon\Di $di */
    protected $di;

    /**
     * Workers shared constructor
     */
    public function __construct()
    {
        $this->di = Di::getDefault();
        file_put_contents($this->getPidFile(), getmypid());
    }

    /**
     * Create PID file for worker
     */
    public function getPidFile(): string
    {
        $name = str_replace("\\", '-', self::class);

        return "/var/run/{$name}.pid";
    }

    /**
     * Ping callback for keep alive check
     *
     * @param BeanstalkClient $message
     */
    public function pingCallBack($message): void
    {
        $message->reply(json_encode($message->getBody() . ':pong'));
    }

    /**
     * Make ping tube from classname and ping word
     *
     * @param string $workerClassName
     *
     * @return string
     */
    public function makePingTubeName(string $workerClassName): string
    {
        return Text::camelize("ping_{$workerClassName}", '\\');
    }

    /**
     * If it was Ping request to check worker, we answer Pong and return True
     * @param $parameters
     *
     * @return bool
     */
    public function replyOnPingRequest($parameters):bool
    {
        $pingTube = $this->makePingTubeName(static::class);
        if ( $pingTube === $parameters['UserEvent']) {
            $this->am->UserEvent("{$pingTube}Pong", []);
            return true;
        }
        return false;
    }
}