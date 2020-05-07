<?php

use Nats\ConnectionOptions;

require_once __DIR__.'/../vendor/autoload.php';

$connectionOptions = new ConnectionOptions();
$connectionOptions->setHost('localhost')->setPort(4222)->setToken('supersecrettoken');
$c = new Nats\Connection($connectionOptions);
$c->connect();
$c->close();
