import os
from datetime import datetime
import json
import time

from flask import Flask, render_template, redirect, url_for, request, jsonify, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_cors import CORS
import google.generativeai as genai

import smtplib
from email.mime.text import MIMEText

from dotenv import load_dotenv 

# ==================== CONFIGURATION ====================

basedir = os.path.abspath(os.path.dirname(__file__))
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database', 'medical_robot.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

CORS(app)

# 🔴 PASTE API KEY HERE
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

# AI Setup
AI_AVAILABLE = False
model = None
if "PASTE_YOUR_KEY_HERE" not in GOOGLE_API_KEY:
    try:
        genai.configure(api_key=GOOGLE_API_KEY)
        # Auto-detect best model
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                model = genai.GenerativeModel(m.name)
                AI_AVAILABLE = True
                print(f"✅ AI Connected: {m.name}")
                break
    except: pass

# ==================== DATABASE MODELS ====================
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    patients = db.relationship('Patient', backref='caregiver', lazy=True)

class Patient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    medications = db.relationship('Medication', backref='patient', lazy=True)

class Medication(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patient.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    dosage = db.Column(db.String(50))
    stock = db.Column(db.Integer, default=30)
    schedule_time = db.Column(db.String(5))
    instructions = db.Column(db.String(100))
    frequency = db.Column(db.String(20), default="Daily")
    days = db.Column(db.String(50), default="All")
    # === NEW COLUMN ===
    last_taken = db.Column(db.String(20)) # Stores date like "2025-01-05"

class ActivityLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False) # e.g. "Dispensed Metformin"
    timestamp = db.Column(db.DateTime, default=datetime.now)
    details = db.Column(db.String(200)) # e.g. "AI Response: ..."

class UserMap(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # We store the 2D grid as a long string (JSON)
    grid_data = db.Column(db.Text, nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ==================== HELPER FUNCTIONS ====================
def get_user_context():
    """Fetches real DB data including new instructions"""
    if not current_user.is_authenticated: return "No user logged in."
    
    context = []
    for patient in current_user.patients:
        p_info = f"PATIENT: {patient.name}\nMEDS:"
        for med in patient.medications:
            p_info += f"\n - {med.name} ({med.dosage}): Stock {med.stock}, Due {med.schedule_time}, Note: {med.instructions}"
        context.append(p_info)
    
    return "\n\n".join(context)

# ==================== ROUTES ====================
# (Login/Register/Logout routes remain the same as before - assumed standard)
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        # Case 1: User does not exist at all
        if not user:
            flash('Account not found. Redirecting to Registration...', 'error')
            return redirect(url_for('register'))
            
        # Case 2: User exists but wrong password
        if not check_password_hash(user.password, password):
            flash('Incorrect password. Please try again.', 'error')
            return redirect(url_for('login'))
            
        # Case 3: Success
        login_user(user)
        if not user.patients:
            return redirect(url_for('setup'))
        return redirect(url_for('index'))
        
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if User.query.filter_by(username=username).first():
            flash('Username exists'); return redirect(url_for('register'))
        new_user = User(username=username, password=generate_password_hash(password, method='pbkdf2:sha256'))
        db.session.add(new_user)
        db.session.commit()
        login_user(new_user)
        return redirect(url_for('setup'))
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/setup', methods=['GET', 'POST'])
@login_required
def setup():
    if request.method == 'POST':
        data = request.json
        # Clear old data to prevent duplicates if re-running setup
        Patient.query.filter_by(user_id=current_user.id).delete()
        
        for p_data in data.get('patients', []):
            new_patient = Patient(name=p_data['name'], user_id=current_user.id)
            db.session.add(new_patient)
            db.session.commit()
            
            for m_data in p_data['meds']:
                # Inside the setup route loop:
                new_med = Medication(
                    patient_id=new_patient.id,
                    name=m_data['name'],
                    dosage=m_data['dosage'],
                    stock=int(m_data['stock']),
                    schedule_time=m_data['time'],
                    instructions=m_data['instructions'],
                    # NEW FIELDS
                    frequency=m_data['frequency'], 
                    days=m_data['selected_days'] # We will send this from HTML as "Mon,Wed"
                )
                db.session.add(new_med)
        
        db.session.commit()
        return jsonify({'success': True, 'redirect': url_for('index')})
    return render_template('setup.html')

@app.route('/')
@login_required
def index(): return render_template('index.html', user=current_user)

@app.route('/logs')
@login_required
def logs_page(): return render_template('logs.html')

@app.route('/map')
@login_required
def map_page(): return render_template('map.html')

@app.route('/history')
@login_required
def history_page():
    """Serves the Activity History HTML"""
    # Fetch logs for the current user, newest first
    logs = ActivityLog.query.filter_by(user_id=current_user.id).order_by(ActivityLog.timestamp.desc()).all()
    return render_template('history.html', logs=logs)

@app.route('/api/map/save', methods=['POST'])
@login_required
def save_map():
    data = request.json
    grid = data.get('grid')
    
    # Check if map exists for user
    user_map = UserMap.query.filter_by(user_id=current_user.id).first()
    
    if user_map:
        user_map.grid_data = json.dumps(grid) # Update existing
    else:
        new_map = UserMap(user_id=current_user.id, grid_data=json.dumps(grid)) # Create new
        db.session.add(new_map)
    
    db.session.commit()
    return jsonify({'success': True, 'message': 'Map Layout Saved'})

@app.route('/api/map/load')
@login_required
def load_map():
    user_map = UserMap.query.filter_by(user_id=current_user.id).first()
    
    if user_map:
        return jsonify({'success': True, 'grid': json.loads(user_map.grid_data)})
    else:
        return jsonify({'success': False, 'message': 'No saved map found'})

# ==================== API ENDPOINTS ====================
@app.route('/api/schedule')
@login_required
def get_schedule():
    schedule = []
    now_time = datetime.now().strftime("%H:%M")
    today_str = datetime.now().strftime("%Y-%m-%d")
    today_day = datetime.now().strftime("%a") 
    
    for patient in current_user.patients:
        for med in patient.medications:
            is_today = False
            if med.frequency == "Daily": is_today = True
            elif med.days and today_day in med.days: is_today = True
            
            if is_today:
                # Check if taken TODAY
                is_done = (med.last_taken == today_str)
                status = 'completed' if is_done else ('upcoming' if med.schedule_time > now_time else 'pending')
                
                schedule.append({
                    "id": med.id,  # NEEDED FOR DELETING/EDITING
                    "day": "Today",
                    "time": med.schedule_time,
                    "task": f"{med.name}",
                    "patient": patient.name,
                    "type": "medicine",
                    "status": status,
                    "is_done": is_done
                })
    
    schedule.sort(key=lambda x: x['time'])
    return jsonify(schedule)

@app.route('/api/inventory')
@login_required
def get_inventory():
    inventory = []
    for patient in current_user.patients:
        for med in patient.medications:
            status = 'ok'
            if med.stock < 5: status = 'low'
            inventory.append({
                "name": f"{med.name} ({patient.name})",
                "dosage": med.dosage,
                "stock": med.stock,
                "total": 50,
                "unit": "tablets",
                "status": status,
                "instructions": med.instructions
            })
    return jsonify(inventory)

@app.route('/api/voice/process', methods=['POST'])
@login_required
def process_voice():
    user_text = request.json.get('text', '')
    if not AI_AVAILABLE: return jsonify({'success': True, 'message': "AI Missing", 'action': 'NONE'})

    context = get_user_context()
    
    # UPDATED PROMPT TO HANDLE UNKNOWN MEDS
    prompt = f"""
    You are MediBot.
    
    SYSTEM DATA (Only these meds exist):
    {context}
    
    USER COMMAND: "{user_text}"
    
    RULES:
    1. STRICTLY CHECK INVENTORY. If user asks for a med NOT in System Data, say "I don't have that medication in my records."
    2. CHECK INSTRUCTIONS. If dispensing, remind them of the instructions (e.g. "Take before food").
    3. Output JSON ONLY: {{"response": "text", "action": "NONE" or "DISPENSE"}}
    """
    
    try:
        res = model.generate_content(prompt)
        clean = res.text.replace('```json','').replace('```','').strip()
        parsed = json.loads(clean)
        return jsonify({'success': True, 'message': parsed['response'], 'action': parsed.get('action')})
    except:
        return jsonify({'success': False, 'error': "AI Error"})
    
# ==================== INTERACTIVE SCHEDULE API ====================

@app.route('/api/task/add', methods=['POST'])
@login_required
def add_task():
    data = request.json
    # Find patient (default to first one if not specified, or handle selection)
    patient_id = data.get('patient_id')
    if not patient_id:
        patient_id = current_user.patients[0].id

    new_med = Medication(
        patient_id=patient_id,
        name=data['name'],
        dosage=data.get('dosage', '1 pill'),
        stock=30,
        schedule_time=data['time'],
        instructions=data.get('instructions', 'None'),
        frequency="Daily",
        days="All"
    )
    db.session.add(new_med)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/task/delete', methods=['POST'])
@login_required
def delete_task():
    data = request.json
    med_id = data.get('id')
    Medication.query.filter_by(id=med_id).delete()
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/task/toggle', methods=['POST'])
@login_required
def toggle_task():
    data = request.json
    med_id = data.get('id')
    med = Medication.query.get(med_id)
    
    if not med:
        return jsonify({'success': False, 'message': 'Medication not found'})

    today_str = datetime.now().strftime("%Y-%m-%d")
    
    # CASE 1: UNDO (It was already taken today, user wants to uncheck it)
    if med.last_taken == today_str:
        med.last_taken = None 
        med.stock += 1 # Refund the stock
        
        # Log the undo
        undo_log = ActivityLog(
            user_id=current_user.id, 
            action=f"Undo: {med.name}", 
            details=f"Stock corrected to {med.stock}"
        )
        db.session.add(undo_log)

    # CASE 2: EXECUTE (User is taking the medicine now)
    else:
        if med.stock > 0:
            med.last_taken = today_str 
            med.stock -= 1 # Deduct the stock
            
            # Log the action
            new_log = ActivityLog(
                user_id=current_user.id, 
                action=f"Dispensed {med.name}", 
                details=f"Manual check-off. Stock remaining: {med.stock}"
            )
            db.session.add(new_log)
        else:
            # Prevent action if out of stock
            return jsonify({'success': False, 'message': f'Error: {med.name} is Out of Stock!'})
        
    db.session.commit()
    return jsonify({'success': True})

# ==================== MANUAL REQUEST API ====================
@app.route('/api/request', methods=['POST'])
@login_required
def handle_request():
    data = request.json
    req_type = data.get('type') # 'medicine', 'water', 'help'
    
    details = "Manual Request via Dashboard"
    action_log = f"Requested {req_type.capitalize()}"
    
    if req_type == 'help':
        action_log = "EMERGENCY ALERT"
        details = "Patient pressed Panic Button"
    
    # Log to History
    new_log = ActivityLog(
        user_id=current_user.id,
        action=action_log,
        details=details
    )
    db.session.add(new_log)
    db.session.commit()
    
    return jsonify({'success': True, 'message': f'{req_type} request received'})

# ==================== RUN APP ====================

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)