<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\Core\Asterisk;

use MikoPBX\Core\Asterisk\AsteriskManager;
use PHPUnit\Framework\TestCase;
use RuntimeException;
use Throwable;

final class AsteriskManagerConnectionTest extends TestCase
{
    private string $transcriptFile;

    /** @var list<int> */
    private array $serverPids = [];

    public function setUp(): void
    {
        parent::setUp();
        if (!function_exists('pcntl_fork')) {
            self::markTestSkipped('pcntl is required for the AMI fixture');
        }
        $this->transcriptFile = sys_get_temp_dir() . '/mikopbx-ami-fixture-' . getmypid() . '-' . uniqid('', true);
    }

    public function tearDown(): void
    {
        foreach ($this->serverPids as $pid) {
            $status = 0;
            $result = pcntl_waitpid($pid, $status, WNOHANG);
            if ($result === 0) {
                posix_kill($pid, SIGTERM);
                pcntl_waitpid($pid, $status);
            }
        }
        @unlink($this->transcriptFile);
        parent::tearDown();
    }

    public function testDisconnectClearsSocketAndLoginStateWithoutReconnect(): void
    {
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Logoff', 'close' => true],
            ],
        ]);
        $manager = $this->newManager($port);

        self::assertTrue($manager->connect(null, null, null, 'off'));
        self::assertTrue($manager->isConnected());
        $manager->disconnect();

        self::assertFalse($manager->loggedIn());
        self::assertNull($manager->socket);
        $this->waitForServer();
        self::assertSame(['login', 'Logoff'], $this->actions());
    }

    public function testEofInvalidatesPreviouslyLoggedInStream(): void
    {
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['close' => true],
            ],
        ]);
        $manager = $this->newManager($port);

        self::assertTrue($manager->connect(null, null, null, 'off'));
        usleep(100_000);

        self::assertFalse($manager->isConnected());
        self::assertFalse($manager->loggedIn());
        self::assertNull($manager->socket);
    }

    public function testReadTimeoutWithoutEofKeepsConnectionUsable(): void
    {
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['sleep' => 1],
            ],
        ]);
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'off'));
        self::assertTrue($manager->setSocketTimeout(0, 100_000));

        self::assertSame([], $manager->waitResponse(true));
        self::assertTrue($manager->isConnected());

        $manager->disconnect();
    }

    public function testRequestReconnectsOnlyOnceAndPreservesEventMode(): void
    {
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Ping', 'close' => true],
            ],
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Ping', 'response' => $this->successResponse(['Ping' => 'Pong'])],
                ['action' => 'Logoff', 'close' => true],
            ],
        ]);
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'off'));

        $response = $manager->sendRequestTimeout('Ping');

        self::assertSame('Success', $response['Response'] ?? null);
        self::assertSame('Pong', $response['Ping'] ?? null);
        $manager->disconnect();
        $this->waitForServer();
        self::assertSame(['login', 'Ping', 'login', 'Ping', 'Logoff'], $this->actions());
        self::assertSame(['off', 'off'], $this->loginEventModes());
    }

    public function testLegacyConnectOverrideSynchronizesCoreLoginAndReconnectState(): void
    {
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Ping', 'close' => true],
            ],
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Ping', 'response' => $this->successResponse(['Ping' => 'Pong'])],
                ['action' => 'Logoff', 'close' => true],
            ],
        ]);
        $manager = $this->newLegacyConnectManager();

        self::assertTrue($manager->connect("127.0.0.1:$port", 'fixture', 'fixture-secret', 'off'));
        self::assertTrue($manager->loggedIn());

        $response = $manager->sendRequestTimeout('Ping');

        self::assertSame('Success', $response['Response'] ?? null);
        self::assertSame('Pong', $response['Ping'] ?? null);
        $manager->disconnect();
        $this->waitForServer();
        self::assertSame(['login', 'Ping', 'login', 'Ping', 'Logoff'], $this->actions());
        self::assertSame(['off', 'off'], $this->loginEventModes());
    }

    public function testLegacyConnectOverrideDoesNotCreateDynamicStateProperties(): void
    {
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Logoff', 'close' => true],
            ],
        ]);
        $manager = $this->newLegacyConnectManager();
        $dynamicPropertyWarnings = [];
        set_error_handler(
            static function (int $severity, string $message) use (&$dynamicPropertyWarnings): bool {
                if ($severity === E_DEPRECATED && str_contains($message, 'dynamic property')) {
                    $dynamicPropertyWarnings[] = $message;
                    return true;
                }
                return false;
            }
        );
        try {
            self::assertTrue($manager->connect("127.0.0.1:$port", 'fixture', 'fixture-secret', 'off'));
        } finally {
            restore_error_handler();
        }
        $manager->disconnect();
        $this->waitForServer();

        self::assertSame([], $dynamicPropertyWarnings);
    }

    public function testListResponseKeepsEventsSeparatedByBlankLines(): void
    {
        $actionId = 'contacts-fixture';
        $response = implode("\r\n", [
            'Response: Success',
            "ActionID: $actionId",
            'Message: A listing of Contacts follows, presented as ContactList events',
            '',
            'Event: ContactList',
            "ActionID: $actionId",
            'ObjectName: SIP-TRUNK-FIRST',
            'Status: Reachable',
            '',
            'Event: ContactList',
            "ActionID: $actionId",
            'ObjectName: SIP-TRUNK-SECOND',
            'Status: Reachable',
            '',
            'Event: ContactListComplete',
            "ActionID: $actionId",
            'EventList: Complete',
            'ListItems: 2',
            '',
            '',
        ]);
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'PJSIPShowContacts', 'response' => $response],
                ['action' => 'Logoff', 'close' => true],
            ],
        ]);
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'off'));

        $result = $manager->sendRequestTimeout('PJSIPShowContacts', ['ActionID' => $actionId]);

        self::assertSame(
            ['SIP-TRUNK-FIRST', 'SIP-TRUNK-SECOND'],
            array_column($result['data']['ContactList'] ?? [], 'ObjectName')
        );
        $manager->disconnect();
        $this->waitForServer();
    }

    public function testSecondBrokenConnectionDoesNotTriggerThirdLogin(): void
    {
        [$port] = $this->startServer([
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Ping', 'close' => true],
            ],
            [
                ['action' => 'login', 'response' => $this->successResponse()],
                ['action' => 'Ping', 'close' => true],
            ],
        ]);
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'off'));

        self::assertSame([], $manager->sendRequestTimeout('Ping'));

        $this->waitForServer();
        self::assertSame(['login', 'Ping', 'login', 'Ping'], $this->actions());
        self::assertSame(['off', 'off'], $this->loginEventModes());
        self::assertFalse($manager->isConnected());
    }

    public function testWriteFailureInvalidatesSocket(): void
    {
        if (!function_exists('stream_socket_pair')) {
            self::markTestSkipped('stream_socket_pair is required');
        }
        $pair = stream_socket_pair(STREAM_PF_UNIX, STREAM_SOCK_STREAM, 0);
        self::assertIsArray($pair);
        [$managerSocket, $peerSocket] = $pair;
        fclose($peerSocket);

        $manager = new AsteriskManager();
        $manager->socket = $managerSocket;
        $loggedIn = new \ReflectionProperty(AsteriskManager::class, '_loggedIn');
        $loggedIn->setValue($manager, true);

        self::assertSame([], $manager->sendRequest('Ping'));
        self::assertFalse($manager->loggedIn());
        self::assertNull($manager->socket);
    }

    public function testRepeatedWorkerPingAddsItsFilterOnlyOnce(): void
    {
        $port = $this->startPingServer();
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'user'));

        self::assertTrue($manager->pingAMIListener('WorkerOne'));
        self::assertTrue($manager->pingAMIListener('WorkerOne'));

        $manager->disconnect();
        $this->waitForServer();
        self::assertSame(['login', 'Filter', 'UserEvent', 'UserEvent', 'Logoff'], $this->actions());
    }

    public function testDifferentWorkerPingsAddUniqueFilters(): void
    {
        $port = $this->startPingServer();
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'user'));

        self::assertTrue($manager->pingAMIListener('WorkerOne'));
        self::assertTrue($manager->pingAMIListener('WorkerTwo'));

        $manager->disconnect();
        $this->waitForServer();
        self::assertSame(
            ['UserEvent: WorkerOnePong', 'UserEvent: WorkerTwoPong'],
            $this->filterExpressions()
        );
    }

    public function testReconnectAddsTheWorkerFilterToTheNewSession(): void
    {
        $port = $this->startPingServer(2);
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'user'));
        self::assertTrue($manager->pingAMIListener('WorkerOne'));
        $manager->disconnect();

        self::assertTrue($manager->connect(null, null, null, 'user'));
        self::assertTrue($manager->pingAMIListener('WorkerOne'));
        $manager->disconnect();

        $this->waitForServer();
        self::assertSame(2, count($this->filterExpressions()));
    }

    public function testFilterAddErrorIsRetriedAndPongStillRecognized(): void
    {
        $errorResponse = "Response: Error\r\nMessage: Filter failed\r\n\r\n";
        $port = $this->startPingServer(1, [$errorResponse, $this->successResponse()]);
        $manager = $this->newManager($port);
        self::assertTrue($manager->connect(null, null, null, 'user'));

        self::assertTrue($manager->pingAMIListener('WorkerOne'));
        self::assertTrue($manager->pingAMIListener('WorkerOne'));

        $manager->disconnect();
        $this->waitForServer();
        self::assertSame(2, count($this->filterExpressions()));
    }

    public function testFilterAddTimeoutIsNotCached(): void
    {
        $port = $this->startPingServer();
        $manager = $this->newFilterOutcomeManager($port, [[]]);
        self::assertTrue($manager->connect(null, null, null, 'user'));

        self::assertTrue($manager->pingAMIListener('WorkerOne'));
        self::assertTrue($manager->pingAMIListener('WorkerOne'));

        $manager->disconnect();
        $this->waitForServer();
        self::assertSame(['UserEvent: WorkerOnePong'], $this->filterExpressions());
    }

    public function testFilterAddExceptionIsNotCached(): void
    {
        $port = $this->startPingServer();
        $manager = $this->newFilterOutcomeManager($port, [new RuntimeException('AMI fixture failure')]);
        self::assertTrue($manager->connect(null, null, null, 'user'));

        try {
            $manager->pingAMIListener('WorkerOne');
            self::fail('The injected AMI exception must be observable');
        } catch (RuntimeException $exception) {
            self::assertSame('AMI fixture failure', $exception->getMessage());
        }
        self::assertTrue($manager->pingAMIListener('WorkerOne'));

        $manager->disconnect();
        $this->waitForServer();
        self::assertSame(['UserEvent: WorkerOnePong'], $this->filterExpressions());
    }

    /**
     * Start a permissive AMI fixture that records real requests and produces
     * the matching Pong event for every UserEvent ping.
     *
     * @param list<string> $filterResponses
     */
    private function startPingServer(int $connectionCount = 1, array $filterResponses = []): int
    {
        $server = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
        self::assertIsResource($server, $errorMessage);
        $address = (string)stream_socket_get_name($server, false);
        $port = (int)substr(strrchr($address, ':'), 1);
        $transcriptFile = $this->transcriptFile;

        $pid = pcntl_fork();
        self::assertGreaterThanOrEqual(0, $pid);
        if ($pid === 0) {
            pcntl_async_signals(true);
            pcntl_signal(SIGTERM, static fn() => exit(0));
            foreach (range(1, $connectionCount) as $_) {
                $client = @stream_socket_accept($server, 5);
                if (!is_resource($client)) {
                    exit(3);
                }
                stream_set_timeout($client, 2);
                fwrite($client, "Asterisk Call Manager/5.0\r\n");
                while (is_resource($client)) {
                    $request = $this->readRequest($client);
                    if ($request === []) {
                        break;
                    }
                    file_put_contents($transcriptFile, json_encode($request) . "\n", FILE_APPEND);
                    $action = $request['Action'] ?? '';
                    if ($action === 'Logoff') {
                        fclose($client);
                        break;
                    }
                    if ($action === 'Filter') {
                        fwrite($client, array_shift($filterResponses) ?? $this->successResponse());
                        continue;
                    }
                    if ($action === 'UserEvent') {
                        fwrite($client, $this->userEventResponse(($request['UserEvent'] ?? '') . 'Pong'));
                        continue;
                    }
                    fwrite($client, $this->successResponse());
                }
            }
            fclose($server);
            exit(0);
        }

        fclose($server);
        $this->serverPids[] = $pid;
        return $port;
    }

    /**
     * @param list<list<array{action?: string, response?: string, close?: bool, sleep?: int}>> $connections
     * @return array{int, int}
     */
    private function startServer(array $connections): array
    {
        $server = stream_socket_server('tcp://127.0.0.1:0', $errorCode, $errorMessage);
        self::assertIsResource($server, $errorMessage);
        $address = (string)stream_socket_get_name($server, false);
        $port = (int)substr(strrchr($address, ':'), 1);
        $transcriptFile = $this->transcriptFile;

        $pid = pcntl_fork();
        self::assertGreaterThanOrEqual(0, $pid);
        if ($pid === 0) {
            pcntl_async_signals(true);
            pcntl_signal(SIGTERM, static fn() => exit(0));
            foreach ($connections as $steps) {
                $client = @stream_socket_accept($server, 5);
                if (!is_resource($client)) {
                    exit(3);
                }
                stream_set_timeout($client, 2);
                fwrite($client, "Asterisk Call Manager/5.0\r\n");
                foreach ($steps as $step) {
                    if (isset($step['sleep'])) {
                        sleep($step['sleep']);
                        continue;
                    }
                    if (($step['close'] ?? false) && !isset($step['action'])) {
                        fclose($client);
                        continue 2;
                    }
                    $request = $this->readRequest($client);
                    if ($request !== []) {
                        file_put_contents($transcriptFile, json_encode($request) . "\n", FILE_APPEND);
                    }
                    if (($step['action'] ?? '') !== ($request['Action'] ?? '')) {
                        fclose($client);
                        exit(4);
                    }
                    if ($step['close'] ?? false) {
                        fclose($client);
                        continue 2;
                    }
                    fwrite($client, $step['response'] ?? $this->successResponse());
                }
                fclose($client);
            }
            fclose($server);
            exit(0);
        }

        fclose($server);
        $this->serverPids[] = $pid;
        return [$port, $pid];
    }

    /** @return array<string, string> */
    private function readRequest($client): array
    {
        $request = [];
        while (($line = fgets($client)) !== false) {
            $line = rtrim($line, "\r\n");
            if ($line === '') {
                break;
            }
            $separator = strpos($line, ':');
            if ($separator !== false) {
                $request[substr($line, 0, $separator)] = ltrim(substr($line, $separator + 1));
            }
        }
        return $request;
    }

    /** @param array<string, string> $fields */
    private function successResponse(array $fields = []): string
    {
        $response = ['Response' => 'Success'] + $fields;
        $lines = [];
        foreach ($response as $key => $value) {
            $lines[] = "$key: $value";
        }
        return implode("\r\n", $lines) . "\r\n\r\n";
    }

    private function userEventResponse(string $userEvent): string
    {
        return "Event: UserEvent\r\nUserEvent: $userEvent\r\n\r\n";
    }

    private function newManager(int $port): AsteriskManager
    {
        return new class (null, [
            'server' => "127.0.0.1:$port",
            'username' => 'fixture',
            'secret' => 'fixture-secret',
        ]) extends AsteriskManager {
            protected function isAsteriskListening(): bool
            {
                return true;
            }
        };
    }

    /** @param list<array<string, string>|Throwable> $filterOutcomes */
    private function newFilterOutcomeManager(int $port, array $filterOutcomes): AsteriskManager
    {
        return new class (null, [
            'server' => "127.0.0.1:$port",
            'username' => 'fixture',
            'secret' => 'fixture-secret',
        ], $filterOutcomes) extends AsteriskManager {
            /** @param list<array<string, string>|Throwable> $filterOutcomes */
            public function __construct(?string $config, array $optconfig, private array $filterOutcomes)
            {
                parent::__construct($config, $optconfig);
            }

            public function sendRequestTimeout(string $action, array $parameters = []): array
            {
                if ($action === 'Filter' && $this->filterOutcomes !== []) {
                    $outcome = array_shift($this->filterOutcomes);
                    if ($outcome instanceof Throwable) {
                        throw $outcome;
                    }
                    return $outcome;
                }
                return parent::sendRequestTimeout($action, $parameters);
            }

            protected function isAsteriskListening(): bool
            {
                return true;
            }
        };
    }

    private function newLegacyConnectManager(): AsteriskManager
    {
        return new class (null, [
            'server' => '127.0.0.1:1',
            'username' => 'wrong-default-user',
            'secret' => 'wrong-default-secret',
        ]) extends AsteriskManager {
            public function connect(
                ?string $server = null,
                ?string $username = null,
                ?string $secret = null,
                string $events = 'on'
            ): bool {
                $this->listenEvents = $events;
                $server = $server ?? $this->config['asmanager']['server'];
                $username = $username ?? $this->config['asmanager']['username'];
                $secret = $secret ?? $this->config['asmanager']['secret'];
                [$this->server, $port] = explode(':', $server, 2);
                $this->port = (int)$port;
                $errorCode = 0;
                $errorMessage = '';
                $this->socket = fsockopen($this->server, $this->port, $errorCode, $errorMessage, 2);
                if (!is_resource($this->socket)) {
                    return false;
                }
                stream_set_timeout($this->socket, 1);
                if (fgets($this->socket) === false) {
                    return false;
                }

                $response = $this->sendRequest('login', [
                    'Username' => $username,
                    'Secret' => $secret,
                    'Events' => $events,
                ]);

                $this->_loggedIn = ($response['Response'] ?? '') === 'Success';
                return $this->_loggedIn;
            }
        };
    }

    private function waitForServer(): void
    {
        foreach ($this->serverPids as $index => $pid) {
            $status = 0;
            pcntl_waitpid($pid, $status);
            unset($this->serverPids[$index]);
            self::assertTrue(pcntl_wifexited($status));
            self::assertSame(0, pcntl_wexitstatus($status));
        }
    }

    /** @return list<array<string, string>> */
    private function transcript(): array
    {
        if (!is_file($this->transcriptFile)) {
            return [];
        }
        $entries = [];
        foreach (file($this->transcriptFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
            $entry = json_decode($line, true);
            if (is_array($entry)) {
                $entries[] = $entry;
            }
        }
        return $entries;
    }

    /** @return list<string> */
    private function actions(): array
    {
        return array_values(array_map(static fn(array $entry): string => $entry['Action'] ?? '', $this->transcript()));
    }

    /** @return list<string> */
    private function loginEventModes(): array
    {
        $modes = [];
        foreach ($this->transcript() as $entry) {
            if (($entry['Action'] ?? '') === 'login') {
                $modes[] = $entry['Events'] ?? '';
            }
        }
        return $modes;
    }

    /** @return list<string> */
    private function filterExpressions(): array
    {
        $filters = [];
        foreach ($this->transcript() as $entry) {
            if (($entry['Action'] ?? '') === 'Filter') {
                $filters[] = $entry['Filter'] ?? '';
            }
        }
        return $filters;
    }
}
