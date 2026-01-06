"""
Database Manager for Medical Robot
Handles all SQLite operations for patient schedule, logs, and inventory
"""

import sqlite3
import json
from datetime import datetime, timedelta
from config import Config

class DatabaseManager:
    def __init__(self, db_path=Config.DATABASE_PATH):
        self.db_path = db_path
        self.init_database()
    
    def get_connection(self):
        """Create and return a database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dictionaries
        return conn
    
    def init_database(self):
        """Initialize all database tables"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Schedule Table: Doctor's prescribed timeline
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                time TEXT NOT NULL,
                task TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                completed_at TEXT,
                notes TEXT
            )
        ''')
        
        # Inventory Table: Track supplies
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS inventory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item TEXT UNIQUE NOT NULL,
                quantity INTEGER DEFAULT 0,
                unit TEXT,
                last_updated TEXT
            )
        ''')
        
        # Vitals Log: Patient health data history
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vitals_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                heart_rate INTEGER,
                spo2 INTEGER,
                temperature REAL,
                alert_triggered INTEGER DEFAULT 0
            )
        ''')
        
        # Robot Status: Current state
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS robot_status (
                id INTEGER PRIMARY KEY,
                battery_level INTEGER DEFAULT 100,
                location TEXT DEFAULT 'charging_dock',
                is_moving INTEGER DEFAULT 0,
                last_update TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        
        # Seed initial data
        self.seed_initial_data()
    
    def seed_initial_data(self):
        """Populate database with sample data for demo"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if data already exists
        cursor.execute("SELECT COUNT(*) as count FROM schedule")
        if cursor.fetchone()['count'] == 0:
            # Create today's schedule
            today = datetime.now().strftime('%Y-%m-%d')
            schedule_items = [
                (f'{today} 08:00', 'Morning Medicine', 'completed', f'{today} 08:05', 'Delivered successfully'),
                (f'{today} 10:00', 'Water Reminder', 'completed', f'{today} 10:02', 'Patient hydrated'),
                (f'{today} 12:00', 'Lunch Reminder', 'pending', None, None),
                (f'{today} 14:00', 'Afternoon Medicine', 'pending', None, None),
                (f'{today} 16:00', 'Water Reminder', 'pending', None, None),
                (f'{today} 20:00', 'Evening Medicine', 'pending', None, None),
            ]
            cursor.executemany('''
                INSERT INTO schedule (time, task, status, completed_at, notes)
                VALUES (?, ?, ?, ?, ?)
            ''', schedule_items)
        
        # Initialize inventory
        cursor.execute("SELECT COUNT(*) as count FROM inventory")
        if cursor.fetchone()['count'] == 0:
            inventory_items = [
                ('Medicine Pills', 25, 'pills', datetime.now().isoformat()),
                ('Water', 8, 'doses', datetime.now().isoformat()),
                ('Battery', 78, '%', datetime.now().isoformat()),
            ]
            cursor.executemany('''
                INSERT INTO inventory (item, quantity, unit, last_updated)
                VALUES (?, ?, ?, ?)
            ''', inventory_items)
        
        # Initialize robot status
        cursor.execute("SELECT COUNT(*) as count FROM robot_status")
        if cursor.fetchone()['count'] == 0:
            cursor.execute('''
                INSERT INTO robot_status (id, battery_level, location, is_moving, last_update)
                VALUES (1, 78, 'living_room', 0, ?)
            ''', (datetime.now().isoformat(),))
        
        conn.commit()
        conn.close()
    
    def get_today_schedule(self):
        """Retrieve today's schedule"""
        conn = self.get_connection()
        cursor = conn.cursor()
        today = datetime.now().strftime('%Y-%m-%d')
        
        cursor.execute('''
            SELECT * FROM schedule 
            WHERE time LIKE ? 
            ORDER BY time ASC
        ''', (f'{today}%',))
        
        schedule = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return schedule
    
    def update_task_status(self, task_id, status, notes=''):
        """Mark a task as completed or failed"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        completed_at = datetime.now().isoformat() if status == 'completed' else None
        cursor.execute('''
            UPDATE schedule 
            SET status = ?, completed_at = ?, notes = ?
            WHERE id = ?
        ''', (status, completed_at, notes, task_id))
        
        conn.commit()
        conn.close()
    
    def get_inventory(self):
        """Get current inventory levels"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM inventory')
        inventory = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return inventory
    
    def update_inventory(self, item, quantity):
        """Update inventory quantity"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE inventory 
            SET quantity = ?, last_updated = ?
            WHERE item = ?
        ''', (quantity, datetime.now().isoformat(), item))
        conn.commit()
        conn.close()
    
    def log_vitals(self, heart_rate, spo2, temperature=None):
        """Store patient vital signs"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Check if vitals trigger alert
        alert = 0
        if heart_rate < Config.HEART_RATE_MIN or heart_rate > Config.HEART_RATE_MAX:
            alert = 1
        if spo2 < Config.SPO2_MIN:
            alert = 1
        
        cursor.execute('''
            INSERT INTO vitals_log (timestamp, heart_rate, spo2, temperature, alert_triggered)
            VALUES (?, ?, ?, ?, ?)
        ''', (datetime.now().isoformat(), heart_rate, spo2, temperature, alert))
        
        conn.commit()
        conn.close()
        return alert
    
    def get_recent_vitals(self, limit=50):
        """Get recent vital readings for charts"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM vitals_log 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        vitals = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return vitals[::-1]  # Reverse to chronological order
    
    def get_robot_status(self):
        """Get current robot state"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM robot_status WHERE id = 1')
        status = dict(cursor.fetchone())
        conn.close()
        return status
    
    def update_robot_status(self, **kwargs):
        """Update robot status fields"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Build dynamic UPDATE query
        fields = ', '.join([f'{k} = ?' for k in kwargs.keys()])
        values = list(kwargs.values()) + [datetime.now().isoformat(), 1]
        
        cursor.execute(f'''
            UPDATE robot_status 
            SET {fields}, last_update = ?
            WHERE id = ?
        ''', values)
        
        conn.commit()
        conn.close()

    # ==========================================
    # NEW CODE FOR VOICE COMMANDS STARTS HERE
    # ==========================================
    
    def add_schedule_item(self, medicine, time_obj, instructions=""):
        """
        Add a new schedule item derived from voice command.
        
        Args:
            medicine (str): Name of the medication (e.g., "Paracetamol")
            time_obj (datetime): Python datetime object of when to take it
            instructions (str): Notes like "Before Food" or "After Food"
        """
        conn = self.get_connection()
        cursor = conn.cursor()

        # Convert datetime object to string format compatible with your DB
        # Your DB uses: 'YYYY-MM-DD HH:MM'
        if isinstance(time_obj, datetime):
            time_str = time_obj.strftime('%Y-%m-%d %H:%M')
        else:
            time_str = str(time_obj)

        cursor.execute('''
            INSERT INTO schedule (time, task, status, notes)
            VALUES (?, ?, ?, ?)
        ''', (time_str, medicine, 'pending', instructions))

        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return new_id