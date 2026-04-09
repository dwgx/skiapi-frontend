"""
Shared SSH/SFTP helpers.
"""
import paramiko
from config import HOST, PORT, USER, PASSWORD


def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, PORT, USER, PASSWORD, timeout=15)
    return ssh


def run(ssh, cmd, check=False):
    """Run a command, print output, return (stdout_str, stderr_str, exit_code)."""
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out:
        print(out.encode('ascii', errors='replace').decode(), end='')
    if err:
        print('[stderr]', err.encode('ascii', errors='replace').decode(), end='')
    if check and code != 0:
        raise RuntimeError(f'Command failed (exit {code}): {cmd}')
    return out, err, code


def upload_file(ssh, local_path, remote_path):
    sftp = ssh.open_sftp()
    sftp.put(local_path, remote_path)
    sftp.close()
