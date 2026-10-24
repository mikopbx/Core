<?php

declare(strict_types=1);

namespace MikoPBX\Tests\Unit\PBXCoreREST\Http;

use MikoPBX\PBXCoreREST\Http\TrustedRouteResolver;
use PHPUnit\Framework\TestCase;

/**
 * Regression coverage for {@see TrustedRouteResolver::resolve()}.
 *
 * Guards GHSA-343m-2899-5qh3: REST routing must follow the single _url that
 * nginx injects into QUERY_STRING, never a client-supplied _url (second query
 * occurrence or body field). A regression here re-opens unauthenticated RCE,
 * because a public URI anchor would be authorised while _url routed elsewhere.
 */
class TrustedRouteResolverTest extends TestCase
{
    public function testSingleServerUrlResolvesToRoute(): void
    {
        $this->assertSame(
            '/pbxcore/api/v3/auth:login',
            TrustedRouteResolver::resolve('_url=/api/v3/auth:login', [])
        );
    }

    public function testClientQueryParamsAlongsideUrlArePreserved(): void
    {
        // nginx appends the client's original query after its own _url; a single
        // _url plus unrelated params is the normal case and must still resolve.
        $this->assertSame(
            '/pbxcore/api/v3/extensions',
            TrustedRouteResolver::resolve('_url=/api/v3/extensions&limit=10&offset=20', [])
        );
    }

    public function testDuplicateUrlInQueryIsRejected(): void
    {
        // The core attack: nginx _url first, attacker _url appended. last-key-wins
        // in PHP would surface the attacker value; we reject the whole request.
        $this->assertNull(
            TrustedRouteResolver::resolve(
                '_url=/api/v3/auth:login&_url=/api/v3/system:executeBashCommand',
                []
            )
        );
    }

    public function testUrlInPostBodyIsRejected(): void
    {
        // Body-based variant: _url=/api/v3/system:executeBashCommand in the POST
        // body. $_REQUEST (request_order=GP) would let it win; reject it.
        $this->assertNull(
            TrustedRouteResolver::resolve(
                '_url=/api/v3/auth:login',
                ['_url' => '/api/v3/system:executeBashCommand', 'command' => 'id']
            )
        );
    }

    public function testMissingUrlIsRejected(): void
    {
        // A request that never passed through the nginx rewrite has no _url.
        $this->assertNull(TrustedRouteResolver::resolve('', []));
        $this->assertNull(TrustedRouteResolver::resolve('foo=bar&baz=qux', []));
    }

    public function testUrlWithoutLeadingSlashIsRejected(): void
    {
        $this->assertNull(TrustedRouteResolver::resolve('_url=api/v3/auth:login', []));
        $this->assertNull(TrustedRouteResolver::resolve('_url=', []));
    }

    public function testSimilarlyNamedQueryKeyIsNotTreatedAsUrl(): void
    {
        // my_url / _urlx must not be mistaken for the _url route key.
        $this->assertNull(TrustedRouteResolver::resolve('my_url=/api/v3/auth:login', []));
        $this->assertNull(TrustedRouteResolver::resolve('_urlx=/api/v3/auth:login', []));
    }

    public function testPercentEncodedDuplicateKeyIsStillDetected(): void
    {
        // Encoding the duplicate key (%5Furl-style tricks) must not slip past the
        // duplicate check: the key is urldecoded before comparison.
        $this->assertNull(
            TrustedRouteResolver::resolve(
                '_url=/api/v3/auth:login&%5Furl=/api/v3/system:executeBashCommand',
                []
            )
        );
    }

    public function testEncodedPathValueIsDecoded(): void
    {
        $this->assertSame(
            '/pbxcore/api/v3/files/etc hosts',
            TrustedRouteResolver::resolve('_url=/api/v3/files/etc%20hosts', [])
        );
    }
}
