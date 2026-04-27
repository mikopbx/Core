---
description: >-
  Instructions for connecting Garage as cloud storage for automatic uploading
  of call recordings from MikoPBX
---

# Connecting Garage Storage

[Garage](https://garagehq.deuxfleurs.fr/) is a lightweight, S3-compatible
distributed object store written in Rust. It is well-suited for self-hosted
geo-distributed deployments and works as a drop-in S3 backend for MikoPBX
when the **Garage** preset is selected in the cloud-storage configuration.

### About the Garage preset in MikoPBX

Selecting **"Garage"** in the **S3 storage provider** dropdown automatically:

- Suggests an endpoint placeholder of `https://garage.example.com:3900`.
- Pre-fills the region with `garage` (the Garage default — must match your
  cluster configuration if you changed it).
- Enables **path-style URLs** — Garage does not support virtual-hosted
  addressing.

The engine code itself stays provider-agnostic; the preset is purely a UI
helper that fills in safe defaults. You can override any of these values for
your specific deployment.

### Deploying a single-node Garage instance (for testing)

The fastest way to try the integration is a single-node Docker container
that exposes the S3 API on port `3900` and the admin RPC on `3902`.

1. Generate two random hex-encoded secrets — one for cluster RPC, one for
   the admin token.

```bash
openssl rand -hex 32   # rpc_secret
openssl rand -hex 32   # admin_token
```

2. Create `garage.toml`. Note the cluster RPC secret and admin token
   are NOT written to disk — they are passed in as environment variables
   when launching the container:

```toml
metadata_dir = "/var/lib/garage/meta"
data_dir     = "/var/lib/garage/data"
db_engine    = "sqlite"

replication_factor = 1
rpc_bind_addr      = "[::]:3901"

[s3_api]
s3_region     = "garage"
api_bind_addr = "[::]:3900"
root_domain   = ".s3.garage"

[admin]
api_bind_addr = "[::]:3902"
```

3. Launch the container, injecting the secrets via `-e` so they never
   land in source control:

```bash
docker run -d --name garage \
  -v "$(pwd)/garage.toml:/etc/garage.toml:ro" \
  -v garage_meta:/var/lib/garage/meta \
  -v garage_data:/var/lib/garage/data \
  -e GARAGE_RPC_SECRET="$(openssl rand -hex 32)" \
  -e GARAGE_ADMIN_TOKEN="$(openssl rand -hex 32)" \
  -p 3900:3900 -p 3902:3902 \
  dxflrs/garage:latest
```

4. Initialise the cluster layout (single node), create a bucket, generate
   an access key, and grant it permissions:

```bash
NODE_ID=$(docker exec garage /garage node id -q | cut -d@ -f1)

docker exec garage /garage layout assign -z dc1 -c 1G "$NODE_ID"
docker exec garage /garage layout apply --version 1

docker exec garage /garage bucket create mikopbx-recordings
docker exec garage /garage key create mikopbx-key
docker exec garage /garage bucket allow \
  --read --write --owner mikopbx-recordings --key mikopbx-key
```

The `garage key create` command prints the **Access key ID** and the
**Secret access key**. Save them — the secret is shown only once.

### Connecting Garage to MikoPBX

1. Go to **"Maintenance"** → **"Storage"** → **"S3 Cloud Storage"**.

2. Enable **Automatic recording upload to cloud storage**.

3. Choose **"Garage"** in the **S3 storage provider** dropdown. The
   endpoint placeholder, default region, and path-style flag are filled in
   automatically. The hint below the dropdown links back to this guide.

4. Fill in the connection parameters:

   - **S3 endpoint URL** — the address of your Garage cluster, including
     the port. For the local container example above:
     `http://garage:3900` (when MikoPBX runs in the same Docker network)
     or `http://<host-ip>:3900` from a different host.
   - **S3 region** — `garage` by default. Change only if you set a custom
     `s3_region` in `garage.toml`.
   - **S3 bucket name** — the bucket you created (e.g.
     `mikopbx-recordings`).
   - **Access key** and **Secret key** — the values printed by
     `garage key create`.

5. Click **"Save"**, then **"Test Connection"**. On success the banner
   **"S3 connection successful"** appears and synchronisation of
   recordings begins.

### Troubleshooting

If the connection fails, MikoPBX shows the underlying SDK error class
(for example `EndpointConnectionException`, `SignatureDoesNotMatch`,
`NoSuchBucket`) along with the AWS error code. The most common Garage
mistake — forgetting path-style — is impossible after selecting the
preset, since the flag is enabled by default. Other things to verify:

- The endpoint URL is reachable from the MikoPBX host (try
  `curl -v http://garage:3900/`).
- The region in **S3 region** matches `s3_region` in `garage.toml`.
- The bucket exists and the key has read/write/owner permissions on it.

### Limitations

Garage targets the core S3 API and does not implement every AWS-specific
extension. MikoPBX uses only `PutObject`, `GetObject`, `DeleteObject`,
`HeadObject`, and `ListObjectsV2`, all of which Garage supports. Object
ACLs, Tagging and Object Lock are not used.
