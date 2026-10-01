# Module Extension Dropdown Owner Resolution

## Problem

`Extensions\DropdownsAction` determines whether an extension of type `MODULES`
belongs to an enabled module by iterating every model related to the extension.
It stores a namespace segment from each relation as the candidate module ID.
After the extension is assigned to an incoming route, the later
`IncomingRoutingTable` relation overwrites the correct module ID. The module can
then no longer be resolved and its extension disappears from subsequent routing
dropdowns.

## Design

Module ownership must be derived only from related model classes whose namespace
matches `Modules\<ModuleUniqueID>\Models\...`. Core model relations and malformed
module namespaces are ignored. The first valid module owner is resolved through
`PbxExtensionModules` and returned immediately, so unrelated relations cannot
overwrite it.

The public REST response and database schema remain unchanged. Disabled modules
continue to be filtered by the existing `processExtension()` check.

## Testing

A focused unit test will cover the namespace-to-module-ID resolver. Its primary
regression case supplies a valid Smart IVR model relation followed by an incoming
route relation and asserts that `ModuleSmartIVR` remains the owner. Additional
cases verify that core relations and malformed module namespaces do not produce a
module ID.

The test must fail against the current implementation before production code is
changed, then pass after the minimal resolver integration. Related unit tests,
PHP syntax checks, and `git diff --check` complete verification.
