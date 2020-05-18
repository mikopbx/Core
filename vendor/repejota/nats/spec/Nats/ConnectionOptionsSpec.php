<?php

namespace spec\Nats;

use PhpSpec\ObjectBehavior;
use Prophecy\Argument;

class ConnectionOptionsSpec extends ObjectBehavior
{

    function it_is_initializable()
    {
        $this->shouldHaveType('Nats\ConnectionOptions');
    }

    function it_has_default_host_value_as_localhost() {
        $this->getHost()->shouldEqual("localhost");
    }

    function it_has_default_port_value_as_4222() {
        $this->getPort()->shouldBe(4222);
    }

    function it_has_default_user_value_as_null() {
        $this->getUser()->shouldBe(null);
    }

    function it_has_default_pass_value_as_null() {
        $this->getPass()->shouldBe(null);
    }

    function it_has_default_lang_value_as_php() {
        $this->getLang()->shouldEqual("php");
    }

    function it_has_default_verbose_value_as_null() {
        $this->isVerbose()->shouldBe(false);
    }

    function it_has_default_pedantic_value_as_null() {
        $this->isPedantic()->shouldBe(false);
    }

    function it_has_default_reconnect_value_as_null() {
        $this->isReconnect()->shouldBe(true);
    }

    function it_returns_a_valid_default_address() {
        $this->getAddress()->shouldEqual("tcp://localhost:4222");
    }

    function it_options_can_be_overrided()
    {
        $options = array(
            'host' => 'remotehost.com',
            'port' => 4321,
            'user' => 'user',
            'pass' => 'pass',
            'token' => 'token',
            'lang' => 'php',
            'version' => '1.2.3',
            'verbose' => true,
            'pedantic' => true,
            'reconnect' => false,
        );
        $this->setConnectionOptions($options);
        $this->getHost()->shouldBe('remotehost.com');
        $this->getPort()->shouldBe(4321);
        $this->getUser()->shouldBe('user');
        $this->getPass()->shouldBe('pass');
        $this->getToken()->shouldBe('token');
        $this->getLang()->shouldBe('php');
        $this->getVersion()->shouldBe('1.2.3');
    }
}
