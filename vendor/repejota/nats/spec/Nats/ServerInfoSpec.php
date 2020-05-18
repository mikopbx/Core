<?php
namespace spec\Nats;

use PhpSpec\ObjectBehavior;

class ServerInfoSpec extends ObjectBehavior
{
    function let()
    {
        $message = 'INFO {"server_id":"68mIHHvevtmp5b6AzxcBfn","version":"0.9.6","go":"go1.7.3","host":"0.0.0.0","port":4222,"auth_required":false,"ssl_required":false,"tls_required":false,"tls_verify":false,"max_payload":1048576}';
        $this->beConstructedWith($message);
    }

    function it_is_initializable()
    {
        $this->shouldHaveType('Nats\ServerInfo');
    }

    function it_has_server_id()
    {
        $this->getServerID()->shouldNotBeNull();
    }

    function it_has_server_host()
    {
        $this->getHost()->shouldBe("0.0.0.0");
    }

    function it_has_server_port()
    {
        $this->getPort()->shouldBe(4222);
    }

    function it_has_version()
    {
        $this->getVersion()->shouldBe("0.9.6");
    }

    function it_has_go_version()
    {
        $this->getGoVersion()->shouldBe("go1.7.3");
    }

    function it_has_is_auth_required()
    {
        $this->isAuthRequired()->shouldBeBoolean();
    }

    function it_has_is_tls_required()
    {
        $this->isTLSRequired()->shouldBeBoolean();
    }

    function it_has_is_tls_verified()
    {
        $this->isTLSVerify()->shouldBeBoolean();
    }

    function it_has_is_ssl_required()
    {
        $this->isSSLRequired()->shouldBeBoolean();
    }

    function it_has_max_payload()
    {
        $this->getMaxPayload()->shouldBe(1048576);
    }
}