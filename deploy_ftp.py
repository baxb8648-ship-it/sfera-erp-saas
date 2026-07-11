import ftplib
import os
import sys
import time

HOST = "rufree53.hostiman.ru"
USER = "s277085"
PASS = "PfBa9jXfzWUyMGzb"
REMOTE_DIR = "www/sferum.space"
LOCAL_DIR = "dist"

def connect_ftp():
    print(f"Connecting to {HOST}...")
    ftp = ftplib.FTP(HOST)
    ftp.login(USER, PASS)
    ftp.encoding = "utf-8"
    ftp.cwd(REMOTE_DIR)
    print("Connected and directory changed!")
    return ftp

def deploy():
    ftp = None
    try:
        ftp = connect_ftp()
    except Exception as e:
        print(f"Failed to connect initially: {e}")
        sys.exit(1)
        
    for root, dirs, files in os.walk(LOCAL_DIR):
        remote_path = root.replace(LOCAL_DIR, "").replace("\\", "/").lstrip("/")
        
        # Создаем папку на сервере
        if remote_path:
            retries = 3
            while retries > 0:
                try:
                    ftp.mkd(remote_path)
                    print(f"Created remote directory: {remote_path}")
                    break
                except ftplib.error_perm as ep:
                    # Если папка уже существует, это нормально
                    if "exists" in str(ep).lower() or "550" in str(ep):
                        break
                    print(f"Permission error creating directory {remote_path}: {ep}")
                    break
                except Exception as e:
                    print(f"Error creating directory {remote_path}: {e}. Reconnecting...")
                    retries -= 1
                    time.sleep(2)
                    try:
                        ftp = connect_ftp()
                    except Exception as ex:
                        print(f"Reconnection failed: {ex}")
            
        for file in files:
            local_file = os.path.join(root, file)
            remote_file = f"{remote_path}/{file}" if remote_path else file
            
            # Загружаем файл с повторными попытками в случае дисконнекта
            retries = 5
            while retries > 0:
                try:
                    print(f"Uploading {remote_file} (attempt {6 - retries}/5)...")
                    with open(local_file, "rb") as f:
                        ftp.storbinary(f"STOR {remote_file}", f)
                    print(f"Successfully uploaded {remote_file}")
                    break
                except Exception as e:
                    print(f"Upload failed for {remote_file}: {e}")
                    retries -= 1
                    if retries == 0:
                        print(f"Failed to upload {remote_file} after multiple attempts.")
                        sys.exit(1)
                    print("Reconnecting to FTP and retrying in 3 seconds...")
                    time.sleep(3)
                    try:
                        ftp = connect_ftp()
                    except Exception as ex:
                        print(f"Reconnection failed: {ex}")
                        
    try:
        ftp.quit()
    except Exception:
        pass
    print("Deployment complete!")

if __name__ == "__main__":
    deploy()
