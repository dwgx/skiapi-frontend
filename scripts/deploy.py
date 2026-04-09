#!/usr/bin/env python3
"""
Build and deploy the frontend to the test VPS.

Usage:
    python deploy.py              # build + deploy
    python deploy.py --no-build   # skip build, deploy existing dist/
    python deploy.py --nginx      # also re-write nginx config
"""
import os
import sys
import subprocess
import tarfile
import tempfile

# Allow running from any directory
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from config import REMOTE_DIR, FRONTEND_PORT, BACKEND_PORT
from vps import get_ssh, run, upload_file

DIST_DIR = os.path.join(PROJECT_DIR, 'dist')
NO_BUILD = '--no-build' in sys.argv
WRITE_NGINX = '--nginx' in sys.argv


def build():
    print('==> Building...')
    result = subprocess.run(
        ['npm', 'run', 'build'],
        cwd=PROJECT_DIR,
        shell=True,
    )
    if result.returncode != 0:
        print('Build failed!')
        sys.exit(1)
    print('==> Build complete.')


def make_tarball():
    tmp = tempfile.mktemp(suffix='.tar.gz')
    with tarfile.open(tmp, 'w:gz') as tar:
        tar.add(DIST_DIR, arcname='.')
    return tmp


NGINX_CONF_CONTENT = r"""server {
    listen """ + str(FRONTEND_PORT) + r""";
    listen [::]:{port};
    server_name _;

    root {remote_dir};
    index index.html;

    client_max_body_size 100m;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:{backend};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    location /v1/ {
        proxy_pass http://127.0.0.1:{backend};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        chunked_transfer_encoding on;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
""".replace('{port}', str(FRONTEND_PORT)).replace('{remote_dir}', REMOTE_DIR).replace('{backend}', str(BACKEND_PORT))


def deploy():
    print('==> Connecting to VPS...')
    ssh = get_ssh()

    print('==> Creating tarball...')
    tarball = make_tarball()

    print(f'==> Uploading ({os.path.getsize(tarball) // 1024} KB)...')
    upload_file(ssh, tarball, '/root/skiapi-new-frontend.tar.gz')
    os.unlink(tarball)

    print('==> Extracting...')
    run(ssh, f'rm -rf {REMOTE_DIR}/* && mkdir -p {REMOTE_DIR} && tar xzf /root/skiapi-new-frontend.tar.gz -C {REMOTE_DIR}/ && chown -R www-data:www-data {REMOTE_DIR}/', check=True)

    if WRITE_NGINX:
        print('==> Writing nginx config...')
        sftp = ssh.open_sftp()
        with sftp.open('/etc/nginx/sites-enabled/skiapi-new-frontend', 'w') as f:
            f.write(NGINX_CONF_CONTENT)
        sftp.close()

    print('==> Reloading nginx...')
    run(ssh, 'nginx -t 2>&1 && nginx -s reload 2>&1')

    print('==> Verifying...')
    out, _, _ = run(ssh, f'curl -s -o /dev/null -w "%{{http_code}}" http://127.0.0.1:{FRONTEND_PORT}/')
    if '200' in out:
        print(f'\n[OK] Deployed: http://43.153.139.136:{FRONTEND_PORT}')
    else:
        print(f'\n[FAIL] HTTP check returned: {out}')

    ssh.close()


if __name__ == '__main__':
    if not NO_BUILD:
        build()
    deploy()
