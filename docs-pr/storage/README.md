# Storage docs — pending PR to mikopbx/docs.mikopbx.com

These three files are new provider-specific guides for the
`docs.mikopbx.com/manual/maintenance/storage/` directory on the `english`
branch. Apply as a separate PR to the docs repo:

```
manual/maintenance/storage/
├── garage.md   ← from docs-pr/storage/garage.md
├── ceph.md     ← from docs-pr/storage/ceph.md
└── minio.md    ← from docs-pr/storage/minio.md
```

The corresponding `provider preset` dropdown in MikoPBX core links to the
relative paths `manual/maintenance/storage/{garage,ceph,minio}.md` (see
`src/Common/Library/S3ProviderPresets.php`).

Update the storage README.md to mention these three new providers in the
"Instructions for connecting cloud storage" content-ref block.
