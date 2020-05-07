<?php

use Nats\ConnectionOptions;

require_once __DIR__.'/../vendor/autoload.php';

$connectionOptions = new ConnectionOptions();
$connectionOptions->setHost('localhost')->setPort(4222);

echo 'Server: nats://'.$connectionOptions->getHost().':'.$connectionOptions->getPort().PHP_EOL;

$c = new Nats\Connection($connectionOptions);
$c->connect();


// TODO ping is not public.
$c->ping();
