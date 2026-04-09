#!/usr/bin/env python3
"""
Build and deploy the frontend to VPS.

Usage:
    python deploy.py              # build + deploy SKIAPI frontend to test VPS
    python deploy.py --no-build   # skip build, deploy existing dist/
    python deploy.py --nginx      # also re-write nginx config
    python deploy.py --legacy     # build + deploy old NewAPI frontend at /legacy/
    python deploy.py --link-ui    # inject "SKIAPI" button into legacy frontend footer
    python deploy.py --prod       # deploy to production (skiapi.dev)
    python deploy.py --all        # deploy to both test VPS and production
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
from config import PROD_HOST, PROD_PORT, PROD_USER, PROD_PASSWORD, PROD_REMOTE_DIR
from vps import get_ssh, run, upload_file

DIST_DIR = os.path.join(PROJECT_DIR, 'dist')
NO_BUILD = '--no-build' in sys.argv
WRITE_NGINX = '--nginx' in sys.argv
LINK_UI = '--link-ui' in sys.argv
DEPLOY_LEGACY = '--legacy' in sys.argv
DEPLOY_PROD = '--prod' in sys.argv or '--all' in sys.argv
DEPLOY_TEST = '--prod' not in sys.argv or '--all' in sys.argv

LEGACY_PROJECT_DIR = os.path.join(os.path.dirname(PROJECT_DIR), 'new-api-main', 'web')
LEGACY_DIST_DIR = os.path.join(LEGACY_PROJECT_DIR, 'dist')
LEGACY_REMOTE_DIR = '/var/www/newapi-legacy-frontend'


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

    # ── Legacy (old NewAPI) frontend at /legacy/ ──
    location /legacy/ {
        alias /var/www/newapi-legacy-frontend/;
        try_files $uri $uri/ /legacy/index.html;
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


FOOTER_HTML = (
    '<div id="skiapi-switch" style="position:fixed;bottom:20px;right:20px;z-index:9999">'
    '<a href="/" '
    'style="display:flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;'
    'background:linear-gradient(135deg,#6366F1,#8B5CF6);color:#fff;text-decoration:none;'
    'font-size:13px;font-weight:600;box-shadow:0 4px 15px rgba(99,102,241,0.4);transition:all .3s">'
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
    '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
    'SKIAPI</a></div>'
)


def inject_link_ui(ssh):
    """Set backend Footer option to show a 'Try New UI' floating button in legacy frontend."""
    print('==> Injecting New UI link into legacy frontend...')
    sql = "INSERT OR REPLACE INTO options (key, value) VALUES ('Footer', '{}');".format(
        FOOTER_HTML.replace("'", "''")
    )
    sftp = ssh.open_sftp()
    with sftp.open('/tmp/skiapi_footer.sql', 'w') as f:
        f.write(sql)
    sftp.close()
    run(ssh, 'sqlite3 /opt/newapi/data/one-api.db < /tmp/skiapi_footer.sql && rm /tmp/skiapi_footer.sql', check=True)
    # Restart backend to reload options from DB
    run(ssh, 'docker restart newapi-app 2>&1 || true')
    print('==> Legacy frontend now links to New UI.')


def deploy_prod():
    """Deploy to production (skiapi.dev) via 1Panel OpenResty."""
    print('==> [PROD] Connecting to skiapi.dev...')
    import paramiko
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(PROD_HOST, port=PROD_PORT, username=PROD_USER, password=PROD_PASSWORD)

    print('==> [PROD] Creating tarball...')
    tarball = make_tarball()

    print(f'==> [PROD] Uploading ({os.path.getsize(tarball) // 1024} KB)...')
    sftp = ssh.open_sftp()
    sftp.put(tarball, '/root/skiapi-frontend.tar.gz')
    sftp.close()
    os.unlink(tarball)

    print('==> [PROD] Extracting...')
    stdin, stdout, stderr = ssh.exec_command(
        f'rm -rf {PROD_REMOTE_DIR}/* && tar xzf /root/skiapi-frontend.tar.gz -C {PROD_REMOTE_DIR}/'
    )
    stdout.read()

    print('==> [PROD] Verifying...')
    stdin, stdout, stderr = ssh.exec_command(
        'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:80/ -H "Host: skiapi.dev"'
    )
    code = stdout.read().decode().strip()
    if code == '200':
        print('[OK] Production deployed: https://skiapi.dev')
    else:
        print(f'[WARN] HTTP check returned: {code}')

    ssh.close()


def build_legacy():
    """Build the legacy NewAPI frontend with /legacy/ base path."""
    print('==> Building legacy frontend...')
    env = os.environ.copy()
    env['MSYS_NO_PATHCONV'] = '1'
    env['VITE_BASE_PATH'] = '/legacy/'
    result = subprocess.run(['bun', 'run', 'build'], cwd=LEGACY_PROJECT_DIR, shell=True, env=env)
    if result.returncode != 0:
        print('Legacy build failed!')
        sys.exit(1)
    print('==> Legacy build complete.')


def deploy_legacy():
    """Deploy legacy frontend to VPS at /legacy/ path."""
    print('==> Deploying legacy frontend...')
    ssh = get_ssh()
    tmp = tempfile.mktemp(suffix='.tar.gz')
    with tarfile.open(tmp, 'w:gz') as tar:
        tar.add(LEGACY_DIST_DIR, arcname='.')
    print(f'==> Uploading legacy ({os.path.getsize(tmp) // 1024} KB)...')
    upload_file(ssh, tmp, '/root/newapi-legacy-frontend.tar.gz')
    os.unlink(tmp)
    run(ssh, f'mkdir -p {LEGACY_REMOTE_DIR} && rm -rf {LEGACY_REMOTE_DIR}/* && '
        f'tar xzf /root/newapi-legacy-frontend.tar.gz -C {LEGACY_REMOTE_DIR}/ && '
        f'chown -R www-data:www-data {LEGACY_REMOTE_DIR}/', check=True)
    print(f'[OK] Legacy frontend deployed at /legacy/')
    ssh.close()


if __name__ == '__main__':
    if DEPLOY_LEGACY:
        if not NO_BUILD:
            build_legacy()
        deploy_legacy()
    else:
        if not NO_BUILD:
            build()
        if DEPLOY_TEST:
            deploy()
        if DEPLOY_PROD:
            deploy_prod()
    if LINK_UI:
        ssh = get_ssh()
        inject_link_ui(ssh)
        ssh.close()
