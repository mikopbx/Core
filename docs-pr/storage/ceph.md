---
description: >-
  Instructions for connecting Ceph RadosGW as cloud storage for automatic
  uploading of call recordings from MikoPBX
---

# Connecting Ceph RadosGW Storage

[Ceph](https://ceph.io/) ships an S3-compatible gateway called **RadosGW**
(Rados Gateway). It is the standard self-hosted object-storage layer in
many enterprise and on-premise deployments and works as an S3 backend for
MikoPBX once the **Ceph RadosGW** preset is selected.

### About the Ceph RadosGW preset in MikoPBX

Selecting **"Ceph RadosGW"** in the **S3 storage provider** dropdown
automatically:

- Suggests an endpoint placeholder of `https://rgw.example.com`.
- Pre-fills the region with `default` (the value of the **zonegroup**
  configured at cluster initialisation; change it if you renamed yours).
- Enables **path-style URLs**. RadosGW supports virtual-hosted addressing
  too, but it requires DNS wildcards for `*.rgw.example.com`. Path-style
  works without any DNS setup, so it is the safe default.

### Prerequisites

This guide assumes you already have a running Ceph cluster with at least
one RadosGW daemon. Cluster bootstrap and high-availability deployment of
RadosGW are outside the scope of this document — see the
[official Ceph documentation](https://docs.ceph.com/en/latest/radosgw/).

If your gateway listens on plain HTTP, MikoPBX can still connect, but you
should put a TLS-terminating reverse proxy (nginx, HAProxy, Traefik) in
front of RadosGW for production use.

### Creating an S3 user and access keys

Run the following on a host with the Ceph admin tools (or inside a
RadosGW container):

```bash
radosgw-admin user create \
  --uid=mikopbx \
  --display-name="MikoPBX recordings" \
  --max-buckets=10
```

The command prints a JSON response containing the **access_key** and
**secret_key**. Save them — the secret cannot be retrieved later (you
would have to rotate it).

If you prefer to manage credentials separately:

```bash
radosgw-admin key create --uid=mikopbx --key-type=s3
radosgw-admin user info --uid=mikopbx | jq '.keys'
```

### Creating the bucket

The bucket can be created either by an S3-compatible client (e.g. `aws s3
mb` with the access key above) or via `radosgw-admin`:

```bash
radosgw-admin bucket link --bucket=mikopbx-recordings --uid=mikopbx
```

Note that `bucket link` only registers an existing bucket. To create the
bucket itself, use an S3 client:

```bash
AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=... \
aws --endpoint-url https://rgw.example.com \
    s3 mb s3://mikopbx-recordings
```

### Permissions

For the daily call-recording workload MikoPBX needs read/write/list on a
single bucket. RadosGW evaluates standard S3 ACLs and bucket policies; no
extra Ceph-side configuration is required if the bucket owner is the same
user whose credentials you give MikoPBX.

### Connecting Ceph RadosGW to MikoPBX

1. Go to **"Maintenance"** → **"Storage"** → **"S3 Cloud Storage"**.

2. Enable **Automatic recording upload to cloud storage**.

3. Choose **"Ceph RadosGW"** in the **S3 storage provider** dropdown.
   The endpoint placeholder, default region, and path-style flag are
   filled in automatically. The hint below the dropdown links back to
   this guide.

4. Fill in the connection parameters:

   - **S3 endpoint URL** — the public URL of your RadosGW (for example,
     `https://rgw.example.com`).
   - **S3 region** — the **zonegroup** name from your Ceph configuration.
     The Ceph default is `default`; if your cluster was bootstrapped with
     a custom value (`zonegroup_name` in the realm), use that.
   - **S3 bucket name** — the bucket you created above.
   - **Access key** and **Secret key** — the values from
     `radosgw-admin user create`.

5. Click **"Save"**, then **"Test Connection"**. On success the banner
   **"S3 connection successful"** appears and synchronisation of
   recordings begins.

### Troubleshooting

The most common failure modes:

- `SignatureDoesNotMatch` — the **S3 region** in MikoPBX does not match
  the cluster zonegroup. Run `radosgw-admin zonegroup get | jq .name` and
  copy the value into the region field.
- `EndpointConnectionException` / DNS error — the gateway hostname is
  not resolvable from the MikoPBX host, or path-style is off and the
  bucket-prefixed virtual-host URL has no DNS record. Path-style is
  enabled by default in this preset; if you disabled it, re-enable.
- `NoSuchBucket` — the bucket name is misspelt or the credentials belong
  to a different user. Verify with
  `radosgw-admin user info --uid=mikopbx`.

### Limitations

MikoPBX uses only `PutObject`, `GetObject`, `DeleteObject`, `HeadObject`,
and `ListObjectsV2`. RadosGW supports all of them. Advanced S3 features
(Object Lock, S3 Select, server-side encryption with customer keys) are
not used by MikoPBX.
