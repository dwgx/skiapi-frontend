"""
VPS connection config — shared by all scripts.
Copy this file to config.py and fill in your credentials.
"""
HOST = '0.0.0.0'
PORT = 22
USER = 'root'
PASSWORD = 'your-password-here'

REMOTE_DIR = '/var/www/skiapi-new-frontend'
NGINX_CONF = '/etc/nginx/sites-enabled/skiapi-new-frontend'
BACKEND_PORT = 3001   # newapi-app Docker container
FRONTEND_PORT = 8080  # nginx serving new frontend
