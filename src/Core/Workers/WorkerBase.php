<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\Workers;



use AGI_AsteriskManager;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use Phalcon\Di;
use Phalcon\Text;

abstract class WorkerBase implements WorkerInterface
{

    /** @var \Phalcon\Di $di */
    protected $di;
    /** @var string $className */
    protected string $className;

    protected AGI_AsteriskManager $am;

    /**
     * Workers shared constructor
     */
    public function __construct()
    {
        $this->di = Di::getDefault();
    }

    public function savePidFile($className){

        $this->className = $className;
        $myPid =  getmypid();
        $activeProcesses = Util::getPidOfProcess($this->className, $myPid);
        if(!empty($activeProcesses)){
            $killApp = Util::which('kill');
            // Завершаем старый процесс.
            Util::mwExec("{$killApp} {$activeProcesses}");
        }
        file_put_contents($this->getPidFile(), $myPid);
    }

    /**
     * Create PID file for worker
     */
    public function getPidFile(): string
    {
        if(!empty($this->className)){
            $className = $this->className;
        }else{
            // Всегда будет принимать значение "WorkerBase"
            // Для случая, если метод не переопределен в потомке.
            $className = self::class;
        }
        $name = str_replace("\\", '-', $className);
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