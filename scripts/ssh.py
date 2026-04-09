#!/usr/bin/env python3
"""
Run a command on the VPS.

Usage:
    python ssh.py "ls /var/www"
    python ssh.py "docker ps"
    python ssh.py "nginx -t && nginx -s reload"
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vps import get_ssh, run

if len(sys.argv) < 2:
    print('Usage: python ssh.py "<command>"')
    sys.exit(1)

cmd = ' '.join(sys.argv[1:])
ssh = get_ssh()
run(ssh, cmd)
ssh.close()
