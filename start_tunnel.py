import os
import sys
import socket
import select
import threading
import paramiko
import time

VPS_IP = "194.226.163.67"
VPS_USER = "root"
REMOTE_PORT = 8000      # Port on the VPS Nginx proxies to (127.0.0.1:8000)
LOCAL_HOST = "127.0.0.1"
LOCAL_PORT = 8001       # Port of our local FastAPI server

def log(msg):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}")
    sys.stdout.flush()

def handler(chan, host, port):
    sock = socket.socket()
    try:
        sock.connect((host, port))
    except Exception as e:
        log(f"Forwarding request to local port {host}:{port} failed: {e}")
        chan.close()
        return

    log(f"Tunnel connection open: VPS client -> local {host}:{port}")
    try:
        while True:
            r, w, x = select.select([sock, chan], [], [])
            if sock in r:
                data = sock.recv(4096)
                if len(data) == 0:
                    break
                chan.send(data)
            if chan in r:
                data = chan.recv(4096)
                if len(data) == 0:
                    break
                sock.sendall(data)
    except Exception as e:
        # Connection closed or error
        pass
    finally:
        chan.close()
        sock.close()
        log("Tunnel connection closed")

def reverse_forward_loop(server_port, local_host, local_port, transport):
    log(f"Requesting reverse port forward for VPS port {server_port}...")
    transport.request_port_forward("", server_port)
    while True:
        chan = transport.accept(1000)
        if chan is None:
            continue
        thr = threading.Thread(target=handler, args=(chan, local_host, local_port))
        thr.daemon = True
        thr.start()

def main():
    ssh_dir = os.path.expanduser("~/.ssh")
    key_path = os.path.join(ssh_dir, "id_rsa")
    
    if not os.path.exists(key_path):
        log(f"Error: SSH private key not found at {key_path}. Run setup first.")
        sys.exit(1)
        
    log("Loading SSH private key...")
    try:
        pkey = paramiko.RSAKey.from_private_key_file(key_path)
    except Exception as e:
        log(f"Failed to load private key: {e}")
        sys.exit(1)

    while True:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            log(f"Connecting to VPS {VPS_IP} via SSH...")
            client.connect(
                VPS_IP,
                username=VPS_USER,
                pkey=pkey,
                look_for_keys=False,
                allow_agent=False,
                timeout=15
            )
            log("SSH connection established successfully!")
            
            transport = client.get_transport()
            # Start reverse forwarding loop in main thread
            reverse_forward_loop(REMOTE_PORT, LOCAL_HOST, LOCAL_PORT, transport)
            
        except Exception as e:
            log(f"SSH Tunnel Error: {e}")
        finally:
            try:
                client.close()
            except Exception:
                pass
            log("Reconnecting in 5 seconds...")
            time.sleep(5)

if __name__ == "__main__":
    main()
