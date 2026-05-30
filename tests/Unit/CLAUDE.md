# CLAUDE.md — Unit Tests

Plain PHPUnit unit tests (no Selenium, no container required for most). The
directory mirrors the `src/` layout:

```
tests/Unit/
├── phpunit.xml          # config only — NO <testsuites> defined (pass a path explicitly)
├── AbstractUnitTest.php # base class for unit tests
├── Core/                # System, Utilities, Workers
├── Common/              # Models, Providers
├── PBXCoreREST/         # Services, Http, Lib
└── Incubator/           # shared PHPUnit helpers and Traits
```

## Running this slice

`phpunit.xml` configures bootstrap + `processIsolation="true"` but defines no
test suites, so you must pass a path:

```bash
# whole unit suite
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit

# one subtree
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/System

# one file
vendor/bin/phpunit -c tests/Unit/phpunit.xml tests/Unit/Core/Utilities/IpAddressHelperTest.php

# one method
vendor/bin/phpunit -c tests/Unit/phpunit.xml --filter testIsIpv6 tests/Unit/Core/Utilities/IpAddressHelperTest.php
```

Run inside the PHP container so the `vendor/` autoloader and extensions match
production (see the `container-inspector` skill). `processIsolation="true"` runs
each test in a separate process — slower but avoids static/global state leaking
between tests.

> Other test slices: browser tests → `tests/AdminCabinet/CLAUDE.md`; REST API
> (pytest) → `tests/api/README.md`; call-flow → `tests/Calls/README.md` and
> `tests/pycalltests/README.md`.
