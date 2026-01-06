# """
# HC-05 Bluetooth Module Handler
# Reads patient vital signs from wearable device via serial communication
# Expected data format: "HR:72,SPO2:98,TEMP:36.5\n"
# """

# import serial
# import threading
# import time
# import random
# from config import Config

# class BluetoothVitalsReader:
#     def __init__(self):
#         self.serial_port = None
#         self.is_connected = False
#         self.latest_data = {
#             'heart_rate': 0,
#             'spo2': 0,
#             'temperature': 0.0,
#             'timestamp': None
#         }
#         self.lock = threading.Lock()
#         self.running = False
        
#         # Try to connect to HC-05
#         self.connect()
    
#     def connect(self):
#         """Establish serial connection with HC-05 module"""
#         try:
#             self.serial_port = serial.Serial(
#                 port=Config.BLUETOOTH_PORT,
#                 baudrate=Config.BLUETOOTH_BAUDRATE,
#                 timeout=Config.BLUETOOTH_TIMEOUT
#             )
#             self.is_connected = True
#             print(f"✓ HC-05 connected on {Config.BLUETOOTH_PORT}")
#         except (serial.SerialException, FileNotFoundError) as e:
#             print(f"✗ HC-05 connection failed: {e}")
#             print("  Running in SIMULATION mode with random vitals")
#             self.is_connected = False
    
#     def parse_vitals(self, data_string):
#         """
#         Parse incoming serial data
#         Expected format: "HR:72,SPO2:98,TEMP:36.5"
#         """
#         try:
#             parts = data_string.strip().split(',')
#             vitals = {}
            
#             for part in parts:
#                 if ':' in part:
#                     key, value = part.split(':')
#                     key = key.strip().lower()
                    
#                     if key == 'hr':
#                         vitals['heart_rate'] = int(value)
#                     elif key == 'spo2':
#                         vitals['spo2'] = int(value)
#                     elif key == 'temp':
#                         vitals['temperature'] = float(value)
            
#             return vitals
#         except Exception as e:
#             print(f"Parse error: {e}")
#             return None
    
#     def read_serial_data(self):
#         """Read data from HC-05 serial port"""
#         if self.serial_port and self.is_connected:
#             try:
#                 if self.serial_port.in_waiting > 0:
#                     line = self.serial_port.readline().decode('utf-8', errors='ignore')
#                     return self.parse_vitals(line)
#             except Exception as e:
#                 print(f"Serial read error: {e}")
#                 return None
#         return None
    
#     def simulate_vitals(self):
#         """Generate realistic simulated vital signs for testing"""
#         # Realistic ranges with slight variations
#         base_hr = 72
#         base_spo2 = 97
#         base_temp = 36.8
        
#         return {
#             'heart_rate': base_hr + random.randint(-5, 8),
#             'spo2': base_spo2 + random.randint(-2, 2),
#             'temperature': round(base_temp + random.uniform(-0.3, 0.3), 1)
#         }
    
#     def start_reading(self):
#         """Start background thread to continuously read vitals"""
#         self.running = True
#         thread = threading.Thread(target=self._read_loop, daemon=True)
#         thread.start()
#         print("✓ Vitals monitoring started")
    
#     def _read_loop(self):
#         """Background loop to read vitals continuously"""
#         while self.running:
#             # Try reading from HC-05
#             vitals = self.read_serial_data()
            
#             # Fallback to simulation if no real data
#             if vitals is None:
#                 vitals = self.simulate_vitals()
            
#             # Update latest data with thread safety
#             if vitals:
#                 with self.lock:
#                     self.latest_data.update(vitals)
#                     self.latest_data['timestamp'] = time.time()
            
#             time.sleep(2)  # Read every 2 seconds
    
#     def get_latest_vitals(self):
#         """Return most recent vital signs"""
#         with self.lock:
#             return self.latest_data.copy()
    
#     def stop(self):
#         """Stop reading and close connection"""
#         self.running = False
#         if self.serial_port and self.is_connected:
#             self.serial_port.close()
#             print("HC-05 connection closed")
    
#     def send_command(self, command):
#         """Send command to patient's wearable device"""
#         if self.serial_port and self.is_connected:
#             try:
#                 self.serial_port.write(f"{command}\n".encode())
#                 return True
#             except Exception as e:
#                 print(f"Command send error: {e}")
#                 return False
#         return False

# # Global Bluetooth instance
# bluetooth = BluetoothVitalsReader()


# Again i dont have this HC-05 module as its with Paulson

"""
Bluetooth HC-05 Handler (Windows Simulation Version)
Simulates data connection when real hardware is missing.
"""

import threading
import time
import random

class BluetoothManager:
    def __init__(self):
        self.is_connected = False  # False means we are in Simulation Mode
        self.running = False
        self.thread = None
        
        # Store latest simulated vitals
        self.latest_vitals = {
            'heart_rate': 0,
            'spo2': 0,
            'temperature': 0,
            'timestamp': None
        }
        
        print("⚠ Bluetooth hardware not found. Using SIMULATION MODE.")

    def start_reading(self):
        """Start the background thread to generate fake data"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._simulate_data_loop)
            self.thread.daemon = True
            self.thread.start()
            print("✓ Simulation Data Stream Started")

    def _simulate_data_loop(self):
        """Internal loop to generate random vital signs"""
        while self.running:
            # Generate realistic random values
            self.latest_vitals['heart_rate'] = random.randint(65, 85)
            self.latest_vitals['spo2'] = random.randint(96, 99)
            self.latest_vitals['temperature'] = round(random.uniform(36.5, 37.2), 1)
            self.latest_vitals['timestamp'] = time.time()
            
            # Update every 2 seconds
            time.sleep(2)

    def get_latest_vitals(self):
        """Return the current readings"""
        return self.latest_vitals

    def send_data(self, data):
        """Fake sending data to robot"""
        print(f"[SIMULATION] Sending command to Robot: {data}")

    def stop(self):
        """Stop the simulation thread"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
        print("Bluetooth simulation stopped")

# Create the global instance that app.py imports
bluetooth = BluetoothManager()