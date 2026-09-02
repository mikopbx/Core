# tests/Unit

PHPUnit 9 unit tests mirroring `src/`. Repo-wide facts live in the root `AGENTS.md`.

## Running

`phpunit.xml` here sets bootstrap and `processIsolation="true"` but defines no `<testsuites>`, so a path is mandatory:

```bash
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit                       # everything
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/System           # one subtree
vendor/bin/phpunit -c tests/Unit/phpunit.xml --filter testIsIpv6 tests/Unit/Core/Utilities/IpAddressHelperTest.php
```

There is no composer script for this; `composer.json` scripts only generate AdminCabinet browser tests.

## Requirements and gotchas

- `ext-phalcon` is required: even tests that extend plain `TestCase` load classes that extend `Phalcon\Di\Injectable`, and without the extension PHPUnit dies at load time. On a host without it run inside the dev container (`mikopbx-php83`, sources at `/usr/www`), e.g. `docker exec mikopbx-php83 sh -c 'cd /usr/www && vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit'`.
- Tests extending `AbstractUnitTest` boot the full DI (`RegisterDIServices::init()`) per test; keep new tests on plain `TestCase` unless DI is genuinely needed.
- `processIsolation` forks a process per test: slow but no static state leaks. Do not disable it to speed things up.
- Some tests self-skip outside Linux/Docker or without `MIKOPBX_TEST_REDIS_HOST` (must point at a throwaway Redis); a skip is not a failure.
- Do not commit `tests/Unit/.phpunit.result.cache`.
