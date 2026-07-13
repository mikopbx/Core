# Incoming Route Provider Binding Preservation Design

## Context

GitHub issue `mikopbx/Core#1095` reports that a partial update of an incoming route silently clears its provider binding. `PATCH /pbxcore/api/v3/incoming-routes/{id}` currently injects `provider = null` whenever the request omits `providerid`, so an unrelated field update changes the route to "Any provider".

Two identifiers must remain distinct:

- `Providers.uniqid` is the stable identity of a provider.
- `IncomingRoutingTable.provider`, exposed through the REST API as `providerid`, is the mutable binding between an incoming route and a provider.

The route binding may be changed or explicitly cleared, but omission of `providerid` during an update must never alter it.

## Required Behavior

The save action must implement the following contract:

| Operation and input | Stored route binding |
| --- | --- |
| POST without `providerid` | `null` ("Any provider") |
| POST with a provider ID | Supplied provider ID |
| PUT or PATCH without `providerid` | Existing value is preserved |
| PUT or PATCH with a provider ID | Binding changes to the supplied provider |
| PUT or PATCH with `providerid: "none"` or `providerid: ""` | Binding is explicitly cleared to `null` |

The API continues to return `providerid: "none"` for an unbound route.

## Design

### Provider mapping order

Move the `providerid` API-field mapping out of Phase 1 sanitization. Keep the sanitized API field intact while the action:

1. Determines whether the request creates or updates a record.
2. Applies defaults only to a new record. The existing `providerid` default of `"none"` therefore applies to POST requests that omit the field.
3. Validates the API-shaped data against `DataStructure`.
4. Maps `providerid` to the model field `provider` immediately before the save phase.

The mapping must run only when `array_key_exists('providerid', $sanitizedData)` is true. An absent field must not create a `provider` key. When present, `"none"` and the empty string map to `null`; other values map unchanged. The API field is then removed from the model-shaped save data.

This order makes omission distinct from an explicit clear and avoids branching on the HTTP method during sanitization.

### Persistence

Keep the existing save guard:

```php
if (array_key_exists('provider', $sanitizedData)) {
    $route->provider = $sanitizedData['provider'];
}
```

It correctly supports both partial updates and an explicit `null`. No model or database-schema changes are required.

### API documentation

Add `providerid` to the PATCH request parameters in `IncomingRoutes/RestController.php`. The handler and administrative UI already support changing or clearing the route binding, so the generated API contract must expose the field.

Do not broaden this change to unrelated PATCH parameters or attempt to redesign general PUT semantics.

## Regression Coverage

Extend `tests/api/test_23_incoming_routes_default.py` using the provider-bound route created by the suite. Store its route ID and provider ID explicitly instead of relying on list position.

Cover these behaviors:

1. POST without `providerid` still creates an unbound route represented as `providerid: "none"`.
2. PATCH of an unrelated field without `providerid` preserves the existing provider ID.
3. PUT without `providerid` preserves the existing provider ID.
4. PATCH with `providerid: "none"` explicitly clears the binding.
5. PATCH with the original provider ID restores the binding.

The explicit-clear and restore assertions ensure the fix does not accidentally make the binding immutable.

## Verification

Run the focused incoming-routes API suite against the normal API-test environment. Confirm that the new preservation assertion fails on the original implementation and passes after the mapping change. Also run PHP syntax checks for the modified PHP files and the repository's applicable formatting/static checks.

## Scope

This change is limited to incoming-route provider binding semantics, its REST documentation, and regression coverage. It does not modify provider identity generation, database schema, outbound routes, or other REST resources.
