<?php


namespace MikoPBX\Core\Workers;


interface WorkerInterface
{
    public function __construct();

    public function pingCallBack($message): void;

    public function getPidFile():string;

}