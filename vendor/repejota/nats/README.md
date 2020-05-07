phpnats
=======

**Travis**

| Master  | Develop |
| ------------- | ------------- |
| [![Build Status](https://travis-ci.org/repejota/phpnats.png?branch=master)](https://travis-ci.org/repejota/phpnats)  | [![Build Status](https://travis-ci.org/repejota/phpnats.png?branch=develop)](https://travis-ci.org/repejota/phpnats)  |

**Coverage**

| Master  | Develop |
| ------------- | ------------- |
| [![Coverage Status](https://coveralls.io/repos/repejota/phpnats/badge.svg?branch=master)](https://coveralls.io/r/repejota/phpnats?branch=master) | [![Coverage Status](https://coveralls.io/repos/repejota/phpnats/badge.svg?branch=develop)](https://coveralls.io/r/repejota/phpnats?branch=develop)  |

Introduction
------------

A PHP client for the [NATS messaging system](https://nats.io).

Requirements
------------

* php 5.6+
* [gnatsd](https://github.com/apcera/gnatsd)


Usage
-----

### Installation

Let's start by downloading composer into our project dir:
```
curl -O http://getcomposer.org/composer.phar
chmod +x composer.phar
```

Now let's tell composer about our project's dependancies, in this case, PHPNats. The way we do this is by creating a composer.json file, and placing it in the root folder of our project, right next to composer.phar

```
{
  "require": {
    "repejota/nats": "dev-master"
  }
}
```
Let's let Composer work its magic:
```
php composer.phar install
```
Composer will download all the dependencies defined in composer.json, and prepare all the files needed to autoload them.


### Basic Usage

```php
$client = new \Nats\Connection();
$client->connect();

// Publish Subscribe

// Simple Subscriber.
$client->subscribe(
    'foo',
    function ($message) {
        printf("Data: %s\r\n", $message->getBody());
    }
);

// Simple Publisher.
$client->publish('foo', 'Marty McFly');

// Wait for 1 message.
$client->wait(1);

// Request Response

// Responding to requests.
$sid = $client->subscribe(
    'sayhello',
    function ($message) {
        $message->reply('Reply: Hello, '.$message->getBody().' !!!');
    }
);

// Request.
$client->request(
    'sayhello',
    'Marty McFly',
    function ($message) {
        echo $message->getBody();
    }
);
```

### Encoded Connections

```php
$encoder = new \Nats\Encoders\JSONEncoder();
$options = new \Nats\ConnectionOptions();
$client = new \Nats\EncodedConnection($options, $encoder);
$client->connect();

// Publish Subscribe

// Simple Subscriber.
$client->subscribe(
    'foo',
    function ($payload) {
        printf("Data: %s\r\n", $payload->getBody()[1]);
    }
);

// Simple Publisher.
$client->publish(
    'foo',
    [
     'Marty',
     'McFly',
    ]
);

// Wait for 1 message.
$client->wait(1);

// Request Response

// Responding to requests.
$sid = $client->subscribe(
    'sayhello',
    function ($message) {
        $message->reply('Reply: Hello, '.$message->getBody()[1].' !!!');
    }
);

// Request.
$client->request(
    'sayhello',
    [
     'Marty',
     'McFly',
    ],
    function ($message) {
        echo $message->getBody();
    }
);
```


Developer's Information
-----------------------

### Releases

* [Latest stable](https://github.com/repejota/phpnats/tree/master)
* [Latest dev](https://github.com/repejota/phpnats/tree/develop)

* [PHPNats on Packagist](https://packagist.org/packages/repejota/nats)

### Tests

Tests are in the `tests` folder.
To run them, you need `PHPUnit` and execute `make test-tdd`.

We also have a BDD test suite under the `spec` folder.
To run the suite, you need `PHPSpec` and execute `make test-bdd`.

You can also execute the all suites ( TDD + BDD ) with `make test`.

### Code Quality

We are using [PHP Code Sniffer](http://pear.php.net/package/PHP_CodeSniffer/docs)
to ensure our code follow an high quality standard.

To perform an analysis of the code execute `make lint`.

There is currently three steps when we lint our code:

* First we lint with php itself `php -l`
* Then we lint with PSR2 standard
* And finally we lint with a custom [ruleset.xml](https://github.com/repejota/phpnats/blob/feature/lint-squiz/ruleset.xml) that checks dockblocks and different performance tips.


Creators
--------

**Raül Pérez**

- <https://twitter.com/repejota>
- <https://github.com/repejota>

License
-------

MIT, see [LICENSE](LICENSE)
