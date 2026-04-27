# Patch for `manual/maintenance/storage/README.md`

Append the following content-ref blocks after the existing `aws.md` block
(line 81) so all five provider guides are linked from the storage
overview. Order intentionally puts AWS first (most common SaaS),
self-hosted next (MinIO / Garage / Ceph), then a second SaaS bucket.

```markdown
{% content-ref url="minio.md" %}
[minio.md](minio.md)
{% endcontent-ref %}

{% content-ref url="garage.md" %}
[garage.md](garage.md)
{% endcontent-ref %}

{% content-ref url="ceph.md" %}
[ceph.md](ceph.md)
{% endcontent-ref %}
```

Also update the inline list in the introduction paragraph (around line
50, "...e.g.: Amazon S3, MinIO, Wasabi") to reflect the broader provider
support — suggested rewrite:

> This tab is used to configure automatic upload of call recordings to
> an external S3-compatible storage. The MikoPBX provider preset
> dropdown supports Amazon S3, MinIO, Garage, Ceph RadosGW, Wasabi,
> DigitalOcean Spaces, Yandex Object Storage, VK Cloud Storage, Selectel
> S3 — and a "Custom" option for any other S3-compatible service.

The preset dropdown pre-fills the endpoint placeholder, default region,
and the path-style flag — that last one is required for self-hosted
backends (MinIO, Garage, Ceph) and is enabled automatically when the
matching preset is chosen.
