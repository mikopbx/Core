# CLAUDE.md - Cloud Provisioning System

This file provides guidance for working with MikoPBX's unified cloud provisioning system.

## Overview

The Cloud Provisioning system automatically configures MikoPBX during initial boot based on the deployment environment. It supports:

- **Docker containers** - Environment variables
- **LXC containers** - Environment variables and NoCloud datasources
- **Cloud platforms** - IMDS metadata services (AWS, Google Cloud, Azure, etc.)
- **On-premise virtualization** - NoCloud datasources (VMware, Proxmox, KVM)

**Key Features:**
- Unified configuration architecture across all deployment types
- User-data support for YAML/JSON cloud-init format
- Direct SQLite access (no Redis dependency during early boot)
- SSRF and SQL injection protections
- One-time provisioning (skipped on subsequent boots)

## Architecture

### Boot Sequence

```
Container/VM Start
    ↓
SystemLoader::start()
    ↓
CloudProvisioning::start() (line 368 in SystemLoader.php)
    ↓
Parallel Provider Detection (async promises, 3s timeout)
    ↓
First Available Provider
    ↓
provider->provision()
    ↓
Fetch metadata/ENV/files
    ↓
Parse user-data (if available)
    ↓
Build ProvisioningConfig
    ↓
applyConfigDirect(config)
    ↓
Direct SQLite updates
    ↓
Mark as complete (CLOUD_PROVISIONING=1)
```

### Provider Priority Order

1. **DockerCloud** - If `/.dockerenv` exists
2. **AWSCloud** - If EC2 IMDS responds with "aws"
3. **GoogleCloud** - If GCE metadata has Google service account
4. **AzureCloud** - If Azure IMDS responds with AzurePublicCloud
5. **YandexCloud** - If Yandex Cloud metadata detected
6. **DigitalOceanCloud** - If DigitalOcean vendor-data patterns found
7. **VultrCloud** - If Vultr instance-v2-id present
8. **VKCloud** - If VK Cloud OpenStack metadata detected
9. **AlibabaCloud** - If Alibaba Cloud IMDS (100.100.100.200) responds
10. **NoCloud** - Fallback for on-premise (ISO/seed/HTTP/cmdline)

**Note:** Only the first available provider is used. Detection stops after first successful match.

## ProvisioningConfig DTO

**Location:** `src/Core/System/CloudProvisioning/ProvisioningConfig.php`

**Purpose:** Unified data structure for configuration from any source (ENV, YAML, JSON, IMDS).

### Factory Methods

```php
// From Docker environment variables
$config = ProvisioningConfig::fromEnvironment();

// From YAML user-data (cloud-init format)
$config = ProvisioningConfig::fromYaml($yamlString);

// From JSON user-data
$config = ProvisioningConfig::fromJson($jsonString);

// From parsed array (internal use)
$config = ProvisioningConfig::fromArray($data);
```

### Properties

```php
public ?string $hostname;           // PBX hostname
public ?string $externalIp;         // External IP for SIP/NAT
public ?string $externalHostname;   // External hostname for SIP
public ?string $sshKeys;            // SSH authorized_keys (OpenSSH format)
public ?string $sshLogin;           // SSH username
public ?string $webPassword;        // Web admin password
public ?string $instanceId;         // Cloud instance ID
public ?string $topology;           // 'public' or 'private'
public array $pbxSettings;          // Key-value pairs for m_PbxSettings
public array $networkSettings;      // Key-value pairs for m_LanInterfaces
```

### Security

**Validation and Sanitization:**
- RFC 1123 hostname validation
- IPv4/IPv6 address validation
- Topology validation (public/private only)
- Max lengths: 1024 chars (general), 65536 chars (SSH keys), 253 chars (hostname)
- Control character removal (except newlines for SSH keys)
- XSS prevention for UI-displayed values

**SQL Injection Prevention:**
- Key validation against PbxSettings constants whitelist
- LAN column validation against VALID_LAN_COLUMNS whitelist
- Value escaping via escapeshellarg() before shell exec

**SSRF Protection (NoCloud HTTP):**
- Private IP addresses blocked by default
- Override: NOCLOUD_ALLOW_PRIVATE_IPS=1 for on-premise deployments

## User-Data Format

Cloud-init compatible YAML/JSON format with `mikopbx` section:

```yaml
#cloud-config
mikopbx:
  hostname: my-pbx-server
  web_password: SecurePassword123
  ssh_authorized_keys:
    - ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC... user@host
  pbx_settings:
    PBXLanguage: ru-ru
    SIPPort: 5060
  network:
    topology: private
    extipaddr: 203.0.113.10
```

## Provider Implementations

**DockerCloud** - Environment variables
**AWSCloud** - EC2 IMDS (169.254.169.254)
**GoogleCloud** - GCE metadata
**AzureCloud** - Azure IMDS
**YandexCloud** - Yandex Cloud metadata
**DigitalOceanCloud** - Droplet metadata
**VultrCloud** - Vultr instance metadata
**VKCloud** - VK Cloud OpenStack metadata
**AlibabaCloud** - Alibaba IMDS (100.100.100.200)
**NoCloud** - On-premise (ISO/seed/HTTP/cmdline)

All providers support user-data for custom configuration.

## Deployment Examples

### Docker

```bash
docker run -d \
  -e WEB_ADMIN_PASSWORD=SecurePassword123 \
  -e PBX_NAME=MyPBX \
  -e SSH_AUTHORIZED_KEYS="ssh-rsa AAAAB3..." \
  -e EXTERNAL_SIP_IP_ADDR=203.0.113.10 \
  -e ENABLE_USE_NAT=1 \
  mikopbx/mikopbx:latest
```

### LXC (Proxmox, Ubuntu)

LXC containers support both environment variables and NoCloud datasources:

**Option 1: Environment Variables** (passed via container config)
```bash
# In Proxmox UI or /etc/pve/lxc/100.conf
lxc.environment: WEB_ADMIN_PASSWORD=SecurePassword123
lxc.environment: PBX_NAME=MyPBX
lxc.environment: SSH_AUTHORIZED_KEYS=ssh-rsa AAAAB3...
```

**Option 2: NoCloud ISO** (attach as storage)
```bash
# Create cloud-init ISO (same as VMware example below)
# Attach to LXC container as additional storage device
# MikoPBX will auto-detect and provision
```

**LXC Network Configuration:**
- LXC containers can configure their own network (static IP, DHCP)
- Full support for IPv4/IPv6 DHCP clients
- Firewall support (requires `CAP_NET_ADMIN` capability)
- Unlike Docker, LXC does NOT skip network configuration

### VMware/Proxmox (NoCloud ISO)

```bash
# Create cloud-init files
cat > meta-data << EOF
instance-id: mikopbx-vm-001
local-hostname: mikopbx-prod
EOF

cat > user-data << EOF
#cloud-config
mikopbx:
  web_password: ProductionPassword123
  ssh_authorized_keys:
    - ssh-rsa AAAAB3...
  pbx_settings:
    PBXLanguage: en-en
EOF

# Create ISO
genisoimage -output seed.iso -volid CIDATA -joliet -rock meta-data user-data

# Attach ISO to VM and boot
```

### AWS EC2

```hcl
resource "aws_instance" "mikopbx" {
  ami           = "ami-xxxxxxxxx"
  instance_type = "t3.small"
  
  user_data = <<-EOF
    #cloud-config
    mikopbx:
      pbx_settings:
        PBXLanguage: en-en
      network:
        topology: private
  EOF
}
```

## Diagnostics

**CheckDockerPermissions** (`src/Core/Workers/Libs/WorkerPrepareAdvice/CheckDockerPermissions.php`):
- Detects Docker volume permission issues
- Tests write access to /cf and /storage
- Reports UID/GID mismatches between container and host
- Translation keys: `adv_DockerVolumePermissionIssues`

## Related Documentation

- **Main CLAUDE.md** - Cloud Provisioning overview in Core Components section
- **Workers CLAUDE.md** - Worker system architecture
- **System Messages** - Translation keys for user-facing messages

## Best Practices

1. Use user-data for environment-specific settings
2. Store sensitive data in IMDS/ENV (not version control)
3. Test provisioning with NoCloud seed directory
4. Validate YAML syntax before creating ISO
5. Monitor first boot logs to verify success
6. Don't re-run provisioning on existing systems
7. Use direct SQLite methods in new providers (avoid Redis dependency)
