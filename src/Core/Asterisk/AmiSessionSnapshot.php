<?php

declare(strict_types=1);

namespace MikoPBX\Core\Asterisk;

final readonly class AmiSessionSnapshot
{
    /**
     * @param list<int> $ownerPids
     */
    public function __construct(
        public int $fd,
        public int $serverInode,
        public ?int $clientInode,
        public string $serverAddress,
        public int $serverPort,
        public string $clientAddress,
        public int $clientPort,
        public int $sendQueueBytes,
        public int $receiveQueueBytes,
        public int $clientSendQueueBytes,
        public int $clientReceiveQueueBytes,
        public string $serverState,
        public string $clientState,
        public array $ownerPids,
        public string $username,
        public string $sessionStart,
    ) {
    }

    public function endpoint(): string
    {
        $address = str_contains($this->clientAddress, ':')
            ? '[' . $this->clientAddress . ']'
            : $this->clientAddress;
        return $address . ':' . $this->clientPort;
    }

    public function identity(): string
    {
        return implode('|', [
            $this->fd,
            $this->serverInode,
            $this->endpoint(),
            $this->username,
            $this->sessionStart,
        ]);
    }

    public function isLocalhost(): bool
    {
        return in_array($this->clientAddress, ['127.0.0.1', '::1'], true);
    }

    public function hasStrongStaleDescriptorEvidence(): bool
    {
        return count($this->ownerPids) !== 1 || $this->clientState === 'CLOSE_WAIT';
    }
}
