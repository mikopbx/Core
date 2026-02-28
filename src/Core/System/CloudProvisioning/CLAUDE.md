# CLAUDE.md - Cloud Provisioning System

Unified system for automatic MikoPBX configuration during initial boot across all deployment environments.

## File Inventory (13 files)

```
CloudProvisioning/
├── CloudProvider.php          # Abstract base class (888 lines) - SQLite direct access, user-data parsing
├── ProvisioningConfig.php     # DTO (667 lines) - validation, sanitization, factory methods
├── DockerCloud.php            # Docker containers - ENV variables, every-start overrides
├── LxcCloud.php               # LXC containers (602 lines) - Proxmox files, network parsing
├── AWSCloud.php               # Amazon EC2 - IMDS at 169.254.169.254
├── GoogleCloud.php            # Google Cloud - Metadata-Flavor: Google header
├── AzureCloud.php             # Microsoft Azure - Metadata: true header
├── YandexCloud.php            # Yandex Cloud - Google-compatible API (no gserviceaccount)
├── DigitalOceanCloud.php      # DigitalOcean - vendor-data pattern detection
├── VultrCloud.php             # Vultr - instance-v2-id UUID detection
├── VKCloud.php                # VK Cloud - OpenStack multi-check detection
├── AlibabaCloud.php           # Alibaba Cloud - IMDS at 100.100.100.200
└── NoCloud.php                # On-premise (545 lines) - ISO/seed/HTTP/cmdline datasources
```

## Two-Phase Boot Architecture

### Phase 1: Environment Overrides (Every Container Start)
Called before one-time provisioning check. Uses ORM (Redis already running).

```
DockerCloud::applyEnvironmentOverrides()
  → Reads ENV variables, applies port settings to JSON, resets LAN to eth0

LxcCloud::applyProxmoxOverrides()
  → Reads Proxmox files (/etc/hostname, /etc/network/interfaces, /etc/shadow)
  → One-time credentials on first boot only
  → Calls Network::lanConfigure()
```

### Phase 2: One-Time Provisioning (First Boot Only)
Uses direct SQLite (no ORM/Redis dependency).

```
CloudProvisioning::start()
  → Check CLOUD_PROVISIONING flag (skip if already set)
  → Parallel provider detection (async promises, 3s timeout)
  → First available provider's provision() method
  → Fetch metadata from IMDS/ENV/files
  → Parse user-data (YAML/JSON auto-detection)
  → Merge configs (IMDS base + user-data override)
  → applyConfigDirect() → direct SQLite updates
  → Mark complete: CLOUD_PROVISIONING=1, enable firewall/fail2ban
```

## Provider Priority Order (11 providers)

1. **DockerCloud** - `/.dockerenv` exists
2. **LxcCloud** - `container=lxc` ENV
3. **AWSCloud** - IMDS partition=aws
4. **GoogleCloud** - GCE metadata with gserviceaccount
5. **AzureCloud** - Azure IMDS azEnvironment=AzurePublicCloud
6. **YandexCloud** - Google-compatible API without gserviceaccount
7. **DigitalOceanCloud** - vendor-data patterns (DigitalOcean resolver, DNS=67.207.67.)
8. **VultrCloud** - instance-v2-id UUID present
9. **VKCloud** - OpenStack metadata with project_id/vkcloud
10. **AlibabaCloud** - IMDS at 100.100.100.200
11. **NoCloud** - Fallback (ISO/seed/HTTP/cmdline)

## CloudProvider Base Class

### Abstract Methods
```php
abstract public function checkAvailability(): PromiseInterface;
abstract public function provision(): bool;
```

### Key Public Methods
```php
getHardwareTypeName(): string           // Hardware type for VirtualHardwareType setting
static isProvisioningCompleted(): bool  // Check CLOUD_PROVISIONING flag
getChangedSettings(): array             // List of modified PbxSettings keys
markProvisioningCompleteDirect(string $cloudName): void
```

### Direct SQLite Methods (Early Boot, No Redis)
```php
loadPbxSettingsDirectly(): array
getPbxSettingDirect(string $key): ?string
updatePbxSettingsDirect(string $key, string|int|null $value): bool
getLanSettingDirect(string $column): ?string
updateLanSettingDirect(string $column, string $value): bool
loadJsonSettings(): array
updateJsonSettingDirect(string $path, string $key, mixed $newValue): bool
applyConfigDirect(ProvisioningConfig $config): bool
applyExternalIpDirect(string $extipaddr): void
```

### ORM Methods (When Redis Available)
```php
updatePbxSettings(string $key, string|int|null $data): void
updateSSHKeys(string $data): void
updateHostName(string $hostname): void
updateLanSettings(string $extipaddr): void
updateSSHCredentials(string $sshLogin, string $hashSalt): void
updateWebPassword(string $webPassword): void
resetLanInterface(string $interfaceName): bool
applyConfig(ProvisioningConfig $config): bool
```

### User-Data Processing
```php
fetchUserData(): ?string                           // Override in providers
parseUserData(string $userData): ?ProvisioningConfig  // Auto-detects YAML/JSON
shouldSetCloudInstanceId(): bool                   // Cloud=true, Docker/NoCloud=false
```

## ProvisioningConfig DTO

### Properties
```php
public ?string $hostname;           // RFC 1123 validated
public ?string $externalIp;         // IPv4/IPv6 validated
public ?string $externalHostname;   // RFC 1123 validated
public ?string $sshKeys;            // OpenSSH format
public ?string $sshLogin;           // SSH username
public ?string $webPassword;        // Web admin password
public ?string $instanceId;         // Cloud instance ID
public ?string $topology;           // 'public' or 'private'
public array $pbxSettings;          // Key-value for m_PbxSettings
public array $networkSettings;      // Key-value for m_LanInterfaces
```

### Factory Methods
```php
static fromEnvironment(): self      // Docker ENV variables
static fromYaml(string): ?self      // Cloud-init YAML (#cloud-config)
static fromJson(string): ?self      // JSON format
static fromArray(array): self       // Internal parsing
merge(ProvisioningConfig): self     // Merge configs (other overrides this)
isEmpty(): bool                     // Check if all fields null/empty
```

### Validation Limits
- General: 1024 chars, Hostname: 253 chars, SSH keys: 65536 chars
- RFC 1123 hostname pattern, IPv4/IPv6 address validation
- Topology: 'public'/'private' only
- Key validation against PbxSettings constants whitelist
- LAN column validation against VALID_LAN_COLUMNS whitelist

## LxcCloud Details

Reads Proxmox-provided files:
- `/etc/hostname` - Container hostname
- `/root/.ssh/authorized_keys` - SSH keys (also checks SSH_AUTHORIZED_KEYS ENV)
- `/etc/network/interfaces` - Network config (IPv4/IPv6 static/DHCP)
- `/etc/shadow` - Root password hash (SHA-512 format)
- `/etc/resolv.conf` - DNS servers

Overrides: `shouldSetCloudInstanceId()` → false, `getHardwareTypeName()` → 'Lxc'

## NoCloud Datasources (Priority Order)

1. **Kernel cmdline**: `ds=nocloud;s=http://...`
2. **CIDATA ISO**: `/dev/sr0`, `/dev/sr1` with `LABEL=CIDATA`
3. **Seed directories**: `/var/lib/cloud/seed/nocloud/`, `nocloud-net/`
4. **HTTP endpoint**: URL from kernel cmdline `s=` parameter

## User-Data Format

```yaml
#cloud-config
mikopbx:
  hostname: my-pbx
  web_password: SecurePassword123
  ssh_authorized_keys:
    - ssh-rsa AAAAB3... user@host
  pbx_settings:
    PBXLanguage: ru-ru
    SIPPort: 5060
  network:
    topology: private
    extipaddr: 203.0.113.10
```

## Security

- **SQL Injection**: Key validation against whitelist, value escaping via `escapeshellarg()`
- **SSRF (NoCloud)**: Private IP blocked by default, override: `NOCLOUD_ALLOW_PRIVATE_IPS=1`
- **XSS**: Control character removal, length limits, hostname/IP validation
- **Passwords**: SHA-512 hashed via `PasswordService::generateSha512Hash()`
