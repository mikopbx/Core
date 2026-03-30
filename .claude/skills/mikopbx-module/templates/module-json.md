# Template: module.json

```json
{
  "moduleUniqueID": "Module{Feature}",
  "version": "1.0.0",
  "min_pbx_version": "2025.1.1",
  "developer": "MIKO",
  "support_email": "help@miko.ru",
  "wiki_links": ""
}
```

**Notes:**
- `moduleUniqueID` must match directory name exactly
- `min_pbx_version` always `2025.1.1` for new modules
- `version` can use `%ModuleVersion%` placeholder for CI builds
