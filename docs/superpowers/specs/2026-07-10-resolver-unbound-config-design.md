# Resolver Unbound configuration generator

## Problem

MikoPBX loads `res_resolver_unbound.so`, but does not create
`/etc/asterisk/resolver_unbound.conf`. Asterisk accepts the missing file during
initial module load, but logs an error whenever the module is reloaded by
`core reload`.

## Design

Add `ResolverUnboundConf` to `src/Core/Asterisk/Configs`. The class extends
`AsteriskConfigClass`, sets its description to `resolver_unbound.conf`, and
writes this configuration through the existing `saveConfig()` mechanism:

```ini
[general]
hosts = system
resolv = system
debug = 0
```

The explicit values match Asterisk defaults. Using `resolv = system` preserves
the DNS server ordering maintained by MikoPBX in `/etc/resolv.conf`, including
Docker DNS and the local dnsmasq resolver. No explicit `nameserver` setting is
added.

`AsteriskConfModulesProvider` discovers the class automatically, so no service
registration or changes to `ModulesConf` are required.

## Testing

Add a focused unit test that invokes the generator with the existing test
infrastructure and verifies the generated filename and exact meaningful
configuration. The test must fail before the class exists and pass after it is
implemented. Run the focused test, PHP syntax validation, and the relevant
Asterisk configuration test suite.

## Scope

This change only generates the missing configuration. It does not alter DNS
server selection, Asterisk reload orchestration, or module-loading policy.
