import psutil
import sys

pid = 12140
try:
    proc = psutil.Process(pid)
    print(f"Process Name: {proc.name()}")
    print(f"Exe: {proc.exe()}")
    print(f"Cmdline: {proc.cmdline()}")
except Exception as e:
    print(f"Error checking PID {pid}: {e}")
