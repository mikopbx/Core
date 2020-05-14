<?php
namespace Nats\tests\Encoders\Unit;

use Nats;
use Nats\ConnectionOptions;
use Nats\EncodedConnection;
use Nats\Encoders\JSONEncoder;

/**
 * Class JSONEncoderTest.
 */
class JSONEncoderTest extends \PHPUnit_Framework_TestCase
{

    /**
     * Client.
     *
     * @var Nats\Connection Client
     */
    private $c;


    /**
     * SetUp test suite.
     *
     * @return void
     */
    public function setUp()
    {
        $encoder = new JSONEncoder();
        $options = new ConnectionOptions();
        $this->c = new EncodedConnection($options, $encoder);
        $this->c->connect();
    }

    /**
     * Test Request command.
     *
     * @return void
     */
    public function testRequestArray()
    {
        $this->c->subscribe(
            'sayhello',
            function ($res) {
                $res->reply('Hello, '.$res->getBody()[1].' !!!');
            }
        );

        $this->c->request(
            'sayhello',
            [
             'foo',
             'McFly',
            ],
            function ($res) {
                $this->assertEquals('Hello, McFly !!!', $res->getBody());
            }
        );
        
        $this->c->wait(1);
    }
}
