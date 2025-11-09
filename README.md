# MongoDB ReplicaSet Server — using Docker Compose (Dev → VPS Self-hosting)

This repository provides a ready-to-run MongoDB replica set using Docker Compose plus helper scripts to install, initialize, and remove the cluster on a developer machine or VPS.

The README below is written for developer and serverOps teams that will self-host the replica set on VPSes (Ubuntu/Debian/CentOS). It covers quickstart steps, folder layout, environment variables, keyfile handling, verification, troubleshooting and recommended production hardening.

## Repo layout

```
.
├── docker-compose.yml        # compose definition (3-node replica set + init + web UI)
├── scripts/
│   ├── init-replica.js      # rs.initiate() script used by init container
│   ├── install.sh           # convenience script to generate keyfile + bring up compose
│   ├── uninstall.sh         # convenience script to tear down and optionally remove data
│   └── .env.example         # example env vars
├── src/                     # example app + tests (not required for ops)
└── README.md
```

## Goals and constraints

- Simple, reproducible three-member MongoDB replica set for dev and small on-prem VPS deployments.
- Data persisted under `~/.containers/mongors` by default.
- Internal auth via a keyfile (recommended minimum for local clusters). Not intended as a hardened production deployment without additional hardening.

## Quickstart (VPS-friendly)

Prerequisites on the VPS:

- Docker Engine (v20+) and Docker Compose (v2+ via `docker compose`).
- Open ports (optional): 27017-27019 for intra-cluster mapping and 8091 for web UI (mongo-express), or restrict with firewall rules.

1. Clone/copy this repository to the VPS and cd into it.

2. (Optional) Copy/adjust environment variables (use `.env` or set in environment). See `scripts/.env.example`.

3. Run the installer script to generate the keyfile (if missing) and start the stack:

```bash
bash scripts/install.sh
```

What `install.sh` does:

- Creates directory `~/.containers/mongors` (default) and a `keyfile.key` (chmod 400).
- Runs `docker compose up -d` to start 3 mongod instances, a small init container that calls `init-replica.js`, and a mongo-express web UI.

4. Verify replica set status (from the host):

```bash
docker exec -it mongodb_clstr mongosh -u ${MONGO_ROOT_USER:-root} -p "${MONGO_ROOT_PASS:-pa55w0rd}" --eval 'rs.status()'
```

If you used ports mapped to the host (27017/27018/27019) you can also connect remotely with the replica-set connection string.

> [!NOTE]
> For local or development environment, you might be using docker to host it locally. Therefore, you will need to do something extra if u are a **LINUX** user like me. It's DNS resolve issue for nested networking layers with docker host-names exposes.
> Here, the solution:
>
> ```bash
> sudo nano /etc/hosts
> ```
>
> **Add this after existing `127.0.0.1` declares**
>
> ```hosts
> # MongoDB cluster DNS resolve from Docker Network & Hostnames
> 127.0.0.1    mongo_clstr0 mongo_clstr1 mongo_clstr2
> ```

## Environment variables

You can set these via a `.env` file or in the environment before running `docker compose` or `install.sh`.

- MONGO_ROOT_USER (default: root)
- MONGO_ROOT_PASS (default: pa55w0rd)
- MONGO_REPLICA_SET_NAME (default: rs0)

Example `.env` (copy `scripts/.env.example`):

```bash
MONGO_ROOT_USER=root
MONGO_ROOT_PASS=pa55w0rd
MONGO_REPLICA_SET_NAME=rs0
```

## How the keyfile is handled

- The compose uses a named docker volume `mongo-keyfile` to share the generated keyfile into the mongod containers (read-only). The `scripts/install.sh` also supports generating a keyfile under `~/.containers/mongors` if you prefer the host-managed keyfile.
- The keyfile must be chmod 400 and owned so MongoDB can read it (container UID 999 usually). The helper `keyfile-generator` service in `docker-compose.yml` ensures correct permissions when using the volume approach.

## Volumes & host paths

- By default the compose maps host directories under `~/.containers/mongors/data0`, `data1`, `data2` and config directories `config0`, `config1`, `config2`. Adjust these host paths if your VPS uses different storage locations.

## Init script

- `scripts/init-replica.js` performs the `rs.initiate()` call against the first node. The compose stack includes a short-lived init container that runs this script once the mongod nodes report healthy.

## Uninstall / Cleanup

To stop and remove containers and volumes (compose down + remove named volumes):

```bash
docker compose down -v
```

To use the provided convenience script which asks before removing host data:

```bash
bash scripts/uninstall.sh
```

## Troubleshooting

- If the replica set shows members in STARTUP2 or REMOVED states, check container logs:

```bash
docker compose logs mongo_clstr0
docker compose logs mongo_clstr1
docker compose logs mongo_clstr2
```

- If `mongosh` cannot authenticate, verify `MONGO_ROOT_USER`/`MONGO_ROOT_PASS` and that the init container finished successfully.
- If the init script fails, re-run it manually from an admin shell inside a running mongo container:

```bash
docker exec -it mongodb_clstr mongosh --file /init-replica.js
```

## Security & production recommendations

This repo is intended for dev and small on-prem VPS use. For production-grade deployments, consider:

- Enable TLS for mongod and use x.509 certificates.
- Use a dedicated network / firewall rules to restrict access to MongoDB ports.
- Run regular backups (mongodump or filesystem-level snapshots) and test restores.
- Use monitoring (MongoDB Cloud, Prometheus + exporters) and alerts for replication lag and disk pressure.
- Rotate admin passwords and limit privileges; avoid using default credentials in prod.

## Optional: systemd unit (VPS example)

Create a lightweight systemd service to run docker compose on boot (example for `/etc/systemd/system/mongors.service`):

```ini
[Unit]
Description=MongoRS Docker Compose
After=docker.service

[Service]
WorkingDirectory=/path/to/this/repo
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down

[Install]
WantedBy=multi-user.target
```

Enable with:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mongors.service
```

## Example access strings

- Replica set connection (from app):

```
mongodb://root:pa55w0rd@mongo_clstr0:27017,mongo_clstr1:27017,mongo_clstr2:27017/?replicaSet=rs0
```

- Mongo Express UI will be available on host port 8091 (see `docker-compose.yml`).

## Sample Testing with Node.js

> It is not like actual but for simple-tests or playground

```bash
src
├── app.e2e-test.ts
├── app.ts
└── db.ts
```

I have our sample `database` config and an application to use it. Used `express` with `mongodb` and `suptertest` + `vitest` for some simple demo tests.

## Next steps & recommendations

- Add automated backups (mongodump and S3/R2/MinIO etc.) and a small health-check script for replication lag.
- Consider using key management for the keyfile (HashiCorp Vault, or an orchestration secret store) when deploying across multiple VPSes.

## Contact / ownership

Built for dev-local environment first approach to help development and staging seamlessly. This demo is curated by [@mrmeaow](https://github.com/mrmeaow) and frequent helps/assistance from ChatGPT & Claude 4 as a _free user :)_

---

_Last updated:_ Nov 9, 2025
