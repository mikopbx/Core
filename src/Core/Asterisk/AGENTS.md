# src/Core/Asterisk — agent notes

Asterisk config generation, AMI client, AGI scripts, CDR/astdb helpers. Repo-wide facts live in the root AGENTS.md; only directory-specific gotchas are listed here.

## Config generators (`Configs/`)

- Discovery is by filename glob: `AsteriskConfModulesProvider` instantiates every `Configs/*.php` that extends `AsteriskConfigClass`. A new generator needs no registration, but it must sit directly in `Configs/` (subfolders such as `Generators/` are not scanned). Anything else in `Configs/` that extends the base class will silently become a generator.
- Generator `$description` is the target filename; `saveConfig()` writes only under `Directories::AST_ETC_DIR`. Never write `/etc/asterisk` paths by hand.
- `hookModulesMethod()` merges core generators and enabled external modules, ordered by `getMethodPriority()` (lower runs first, default 1000), skips the calling class to avoid recursion, and swallows module exceptions into syslog. External module output is wrapped in `; ***** BEGIN/END BY <moduleUniqueId>` markers; when a fragment starts with `same` it is auto-indented with a tab. Hook method names must match the `AsteriskConfigInterface` constants exactly.
- Runtime regeneration is driven by `Workers/WorkerModelsEvents` through `ReloadXxxAction` classes: a model change maps to an action via `getDependenceModels()`. A generator that only runs at boot is a bug in that mapping, not in the generator.
- `SIPConf::reload()` and `ExtensionsConf::reload()` serialize under `SIPConf::MUTEX_ASTERISK_RELOAD` (concurrent pjsip.conf/extensions.conf writes have deadlocked Asterisk, see #1076). `reloadUnderLock()` variants assume the caller already holds it; go through `reload()` unless you are inside `ReloadPJSIPIdentifyAction`.
- `SIPConf::needAsteriskRestart()` compares an md5 of topology, ports, external host/IP, subnets and timezone against `CORE_VAR_ETC_DIR/topology_hash`. Add any new setting that changes transports to that hash, or changes will be reload-only and not take effect.
- `SIPConf` keeps a process-local memo of resolved provider IPs; call `SIPConf::resetResolvedIpsMemo()` before a standalone regeneration in a long-lived worker or stale IPs leak into pjsip.conf.
- `extensions.lua` is not generated: it is symlinked as-is into `/etc/asterisk` by `System/Storage`. `WorkerCallEvents` mirrors its recording-extension logic, keep both in sync.
- Codec defaults have two sources on purpose: `CodecSync::DEFAULT_CODEC_SET` (fresh install, gsm last) and `DEFAULT_AUDIO_PRIORITIES` (only for codecs discovered later). `gsm` is re-enabled if disabled because system sounds are GSM; `IGNORED_CODECS` are deleted from the DB on sync.

## AGI scripts (`agi-bin/`)

- Files are symlinked, not copied, into `AST_AGI_BIN_DIR` by `System/Storage`; dropping a `.php` here is enough to deploy it. `phpagi.php` is an empty license-header stub kept for compatibility; the real AGI API is `AGI.php`/`AGIBase.php`.
- `extract_did_cid.php` takes its regex base64-encoded (arg 1) because commas/semicolons in patterns break the extensions.conf parser. Keep that encoding when calling it from dialplan.

## AMI

- `AmiSessionWatchdog` kicks stuck AMI sessions with per-user and global cooldowns; its collaborators are injectable closures so tests run without Asterisk. Do not add direct socket or Asterisk calls to it.

## Tests

- Unit tests: `tests/Unit/Core/Asterisk` (AMI, watchdog) and `tests/Core/Asterisk/Configs` (SIPConf, ExtensionsConf, queue/conference security). Config generators are tested against fixtures there; extend those rather than adding integration steps.
- Project skills `asterisk-validator` (validate generated configs, read logs) and `asterisk-tester` (Local-channel call scenarios) live in `.claude/skills/` and are usable by any agent that can read them.
