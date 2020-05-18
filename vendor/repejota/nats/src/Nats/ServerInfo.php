<?php
namespace Nats;

/**
 * Class ServerInfo
 *
 * @package Nats
 */
class ServerInfo
{

    /**
     * Server unique ID
     *
     * @var string
     */
    private $serverID;

    /**
     * Server hostname
     *
     * @var string
     */
    private $host;

    /**
     * Server port
     *
     * @var integer
     */
    private $port;

    /**
     * Server version number
     *
     * @var string
     */
    private $version;

    /**
     * Server Golang version
     *
     * @var string
     */
    private $goVersion;

    /**
     * Is authorization required?
     *
     * @var boolean
     */
    private $authRequired;

    /**
     * Is TLS required?
     *
     * @var boolean
     */
    private $TLSRequired;

    /**
     * Should TLS be verified?
     *
     * @var boolean
     */
    private $TLSVerify;

    /**
     * Is SSL required?
     *
     * @var boolean
     */
    private $SSLRequired;

    /**
     * Max payload size
     *
     * @var integer
     */
    private $maxPayload;

    /**
     * Connection URL list
     *
     * @var array
     */
    private $connectURLs;


    /**
     * ServerInfo constructor.
     *
     * @param string $connectionResponse Connection response Message.
     */
    public function __construct($connectionResponse)
    {
        $parts = explode(' ', $connectionResponse);
        $data  = json_decode($parts[1], true);

        $this->setServerID($data['server_id']);
        $this->setHost($data['host']);
        $this->setPort($data['port']);
        $this->setVersion($data['version']);
        $this->setGoVersion($data['go']);
        $this->setAuthRequired($data['auth_required']);
        $this->setTLSRequired($data['tls_required']);
        $this->setTLSVerify($data['tls_verify']);
        $this->setMaxPayload($data['max_payload']);

        if (version_compare($data['version'], '1.1.0') === -1) {
            $this->setSSLRequired($data['ssl_required']);
        }
    }

    /**
     * Get the server ID.
     *
     * @return string Server ID.
     */
    public function getServerID()
    {
        return $this->serverID;
    }

    /**
     * Set the server ID
     *
     * @param string $serverID Server ID.
     *
     * @return void
     */
    public function setServerID($serverID)
    {
        $this->serverID = $serverID;
    }

    /**
     * Get the server host name or ip.
     *
     * @return string Server host.
     */
    public function getHost()
    {
        return $this->host;
    }

    /**
     * Set the server host name or ip.
     *
     * @param string $host Server host.
     *
     * @return void
     */
    public function setHost($host)
    {
        $this->host = $host;
    }

    /**
     * Get server port number.
     *
     * @return integer Server port number.
     */
    public function getPort()
    {
        return $this->port;
    }

    /**
     * Set server port number.
     *
     * @param integer $port Server port number.
     *
     * @return void
     */
    public function setPort($port)
    {
        $this->port = $port;
    }

    /**
     * Get server version number.
     *
     * @return string Server version number.
     */
    public function getVersion()
    {
        return $this->version;
    }

    /**
     * Set server version number.
     *
     * @param string $version Server version number.
     *
     * @return void
     */
    public function setVersion($version)
    {
        $this->version = $version;
    }

    /**
     * Get the golang version number.
     *
     * @return string Go version number.
     */
    public function getGoVersion()
    {
        return $this->goVersion;
    }

    /**
     * Set the golang version number.
     *
     * @param string $goVersion Go version number.
     *
     * @return void
     */
    public function setGoVersion($goVersion)
    {
        $this->goVersion = $goVersion;
    }

    /**
     * Check if server requires authorization.
     *
     * @return boolean If auth is required.
     */
    public function isAuthRequired()
    {
        return $this->authRequired;
    }

    /**
     * Set if the server requires authorization.
     *
     * @param boolean $authRequired If auth is required.
     *
     * @return void
     */
    public function setAuthRequired($authRequired)
    {
        $this->authRequired = $authRequired;
    }

    /**
     * Check if server requires TLS.
     *
     * @return boolean If TLS is required.
     */
    public function isTLSRequired()
    {
        return $this->TLSRequired;
    }

    /**
     * Set if server requires TLS.
     *
     * @param boolean $TLSRequired If TLS is required.
     *
     * @return void
     */
    public function setTLSRequired($TLSRequired)
    {
        $this->TLSRequired = $TLSRequired;
    }

    /**
     * Check if TLS certificate is verified.
     *
     * @return boolean If TLS certificate is verified.
     */
    public function isTLSVerify()
    {
        return $this->TLSVerify;
    }

    /**
     * Set if server verifies TLS certificate.
     *
     * @param boolean $TLSVerify If TLS certificate is verified.
     *
     * @return void
     */
    public function setTLSVerify($TLSVerify)
    {
        $this->TLSVerify = $TLSVerify;
    }

    /**
     * Check if SSL is required.
     *
     * @return boolean If SSL is required.
     */
    public function isSSLRequired()
    {
        return $this->SSLRequired;
    }

    /**
     * Set if SSL is required.
     *
     * @param boolean $SSLRequired If SSL is required.
     *
     * @return void
     */
    public function setSSLRequired($SSLRequired)
    {
        $this->SSLRequired = $SSLRequired;
    }

    /**
     * Get the max size of the payload.
     *
     * @return integer Size in bytes.
     */
    public function getMaxPayload()
    {
        return $this->maxPayload;
    }

    /**
     * Set the max size of the payload.
     *
     * @param integer $maxPayload Size in bytes.
     *
     * @return void
     */
    public function setMaxPayload($maxPayload)
    {
        $this->maxPayload = $maxPayload;
    }

    /**
     * Get the server connection URLs.
     *
     * @return array List of server connection urls.
     */
    public function getConnectURLs()
    {
        return $this->connectURLs;
    }

    /**
     * Set the server connection URLs.
     *
     * @param array $connectURLs List of server connection urls.
     *
     * @return void
     */
    public function setConnectURLs(array $connectURLs)
    {
        $this->connectURLs = $connectURLs;
    }
}
