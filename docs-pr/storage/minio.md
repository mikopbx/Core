---
description: >-
  Instructions for connecting MinIO as cloud storage for automatic uploading
  of call recordings from MikoPBX
---

# Connecting MinIO Storage

[MinIO](https://min.io/) is a high-performance, S3-compatible object
store that runs equally well on a single laptop and on a multi-node
production cluster. It is the most common self-hosted S3 backend, and
MikoPBX integrates with it via the **MinIO** preset in the cloud-storage
configuration.

### About the MinIO preset in MikoPBX

Selecting **"MinIO"** in the **S3 storage provider** dropdown
automatically:

- Suggests an endpoint placeholder of `https://minio.example.com:9000`.
- Pre-fills the region with `us-east-1` (MinIO ignores the region but
  the AWS SDK requires a non-empty value for SigV4 signing).
- Enables **path-style URLs** — MinIO uses path-style by default; the
  virtual-hosted style requires extra DNS configuration that is rarely
  worth the effort.

### Deploying a single-node MinIO instance (for testing)

The following Docker command brings up a self-contained MinIO server
with the S3 API on port `9000` and the web console on `9001`:

```bash
docker run -d --name minio \
  -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v minio_data:/data \
  quay.io/minio/minio server /data --console-address ":9001"
```

Open <http://localhost:9001> and log in with `minioadmin`/`minioadmin`.

For production deployments follow the
[official MinIO documentation](https://min.io/docs/minio/linux/index.html)
and use distinct strong credentials.

### Creating a bucket and a service account

1. **Create a bucket.** In the web console click **"Buckets"** →
   **"Create Bucket"** and give it a name (for example
   `mikopbx-recordings`). Versioning, object locking and quotas are not
   required.

2. **Create a service account dedicated to MikoPBX.** Service accounts
   carry their own access/secret keys and can be revoked without rotating
   the root password.

   - Go to **"Identity"** → **"Service Accounts"** → **"Create service
     account"**.
   - Optionally restrict the policy with the inline JSON below to limit
     access to a single bucket (replace `mikopbx-recordings` with your
     bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::mikopbx-recordings",
        "arn:aws:s3:::mikopbx-recordings/*"
      ]
    }
  ]
}
```

   The console will show the **Access Key** and **Secret Key** — copy
   them now; the secret is shown only once.

   The same can be done from the command line with `mc`:

```bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc admin user svcacct add local minioadmin --policy /tmp/policy.json
```

### Connecting MinIO to MikoPBX

1. Go to **"Maintenance"** → **"Storage"** → **"S3 Cloud Storage"**.

2. Enable **Automatic recording upload to cloud storage**.

3. Choose **"MinIO"** in the **S3 storage provider** dropdown. The
   endpoint placeholder, default region, and path-style flag are filled
   in automatically. The hint below the dropdown links back to this
   guide.

4. Fill in the connection parameters:

   - **S3 endpoint URL** — the address of your MinIO API endpoint,
     including the scheme and port. Examples:
     `http://minio:9000` (when MikoPBX runs in the same Docker network),
     `https://minio.example.com` (with TLS).
   - **S3 region** — `us-east-1`. MinIO does not enforce a region; this
     value is sent in the SigV4 signature only.
   - **S3 bucket name** — the bucket you created above.
   - **Access key** and **Secret key** — the service-account credentials.

5. Click **"Save"**, then **"Test Connection"**. On success the banner
   **"S3 connection successful"** appears and synchronisation of
   recordings begins.

### Troubleshooting

- `EndpointConnectionException` / DNS error — MikoPBX cannot reach the
  endpoint. Verify connectivity (`curl -v http://minio:9000/minio/health/live`).
  If you turned path-style off, the SDK builds a virtual-hosted URL like
  `https://mikopbx-recordings.minio.example.com/...` which most MinIO
  installations cannot serve. Re-enable path-style.
- `SignatureDoesNotMatch` — the access or secret key is wrong, or the
  clocks of MinIO and MikoPBX differ by more than 15 minutes.
- `AccessDenied` — the service-account policy does not allow the
  requested action on the bucket. Compare with the JSON policy above.

### Production hardening

For real-world use, run MinIO in distributed mode (4+ nodes), serve the
S3 API behind TLS via a reverse proxy, rotate the root credentials away
from the defaults, and enable per-bucket lifecycle policies that mirror
the MikoPBX retention period (`PBX_RECORD_SAVE_PERIOD`).

### Limitations

MikoPBX uses `PutObject`, `GetObject`, `DeleteObject`, `HeadObject`, and
`ListObjectsV2`. All are supported by MinIO. Object ACLs, Tagging and
Object Lock are not used.
