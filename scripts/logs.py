#!/usr/bin/env python3
"""
Tail nginx error/access logs on the VPS.

Usage:
    python logs.py           # last 50 lines of error log
    python logs.py access    # access log
    python logs.py -f        # follow error log (Ctrl+C to stop)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from vps import get_ssh, run

ssh = get_ssh()

follow = '-f' in sys.argv
log_type = 'access' if 'access' in sys.argv else 'error'
log_file = f'/var/log/nginx/{log_type}.log'

if follow:
    print(f'Following {log_file} (Ctrl+C to stop)...')
    _, stdout, _ = ssh.exec_command(f'tail -f {log_file}')
    try:
        for line in iter(stdout.readline, ''):
            print(line, end='')
    except KeyboardInterrupt:
        pass
else:
    run(ssh, f'tail -50 {log_file}')

ssh.close()
