# """
# Pi Camera Stream Handler
# Captures and streams video feed with privacy mode support
# """

# import io
# import time
# import threading
# from PIL import Image, ImageFilter
# from config import Config

# try:
#     from picamera2 import Picamera2
#     CAMERA_AVAILABLE = True
# except ImportError:
#     CAMERA_AVAILABLE = False
#     print("Warning: picamera2 not available. Using simulated mode.")

# class CameraStream:
#     def __init__(self):
#         self.camera = None
#         self.frame = None
#         self.lock = threading.Lock()
#         self.privacy_mode = False
#         self.is_streaming = False
        
#         if CAMERA_AVAILABLE:
#             self.init_camera()
#         else:
#             self.create_dummy_frame()
    
#     def init_camera(self):
#         """Initialize Raspberry Pi Camera"""
#         try:
#             self.camera = Picamera2()
#             config = self.camera.create_video_configuration(
#                 main={"size": Config.CAMERA_RESOLUTION}
#             )
#             self.camera.configure(config)
#             self.camera.start()
#             time.sleep(2)  # Warm-up time
#             print("✓ Camera initialized successfully")
#         except Exception as e:
#             print(f"✗ Camera initialization failed: {e}")
#             self.camera = None
#             CAMERA_AVAILABLE = False
#             self.create_dummy_frame()
    
#     def create_dummy_frame(self):
#         """Create a placeholder frame for testing without camera"""
#         img = Image.new('RGB', Config.CAMERA_RESOLUTION, color=(30, 30, 45))
#         buffer = io.BytesIO()
#         img.save(buffer, format='JPEG')
#         self.frame = buffer.getvalue()
    
#     def capture_frame(self):
#         """Capture single frame from camera"""
#         if self.camera and CAMERA_AVAILABLE:
#             try:
#                 # Capture frame as numpy array
#                 frame_array = self.camera.capture_array()
#                 img = Image.fromarray(frame_array)
                
#                 # Apply privacy blur if enabled
#                 if self.privacy_mode:
#                     img = img.filter(ImageFilter.GaussianBlur(radius=20))
                
#                 # Convert to JPEG
#                 buffer = io.BytesIO()
#                 img.save(buffer, format='JPEG', quality=85)
#                 return buffer.getvalue()
#             except Exception as e:
#                 print(f"Frame capture error: {e}")
#                 return self.frame
#         return self.frame
    
#     def generate_stream(self):
#         """Generator function for MJPEG streaming"""
#         while True:
#             with self.lock:
#                 frame = self.capture_frame()
            
#             # Yield frame in multipart format
#             yield (b'--frame\r\n'
#                    b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            
#             time.sleep(1 / Config.CAMERA_FRAMERATE)
    
#     def toggle_privacy(self):
#         """Toggle privacy blur mode"""
#         self.privacy_mode = not self.privacy_mode
#         return self.privacy_mode
    
#     def cleanup(self):
#         """Release camera resources"""
#         if self.camera and CAMERA_AVAILABLE:
#             self.camera.stop()
#             print("Camera stopped")

# # Global camera instance
# camera = CameraStream()

# This is currently for the lap use as i dont have raspberry pi

"""
Laptop Camera Stream Handler (OpenCV)
Captures and streams video feed with privacy mode support
"""

import io
import time
import threading
import cv2  # Changed from picamera2 to cv2
import numpy as np
from PIL import Image, ImageFilter
from config import Config

# We no longer check for picamera2 since we are on Windows
CAMERA_AVAILABLE = True 

class CameraStream:
    def __init__(self):
        self.camera = None
        self.frame = None
        self.lock = threading.Lock()
        self.privacy_mode = False
        self.is_streaming = False
        
        # Initialize the laptop webcam
        self.init_camera()
    
    def init_camera(self):
        """Initialize Laptop Webcam using OpenCV"""
        try:
            # 0 is usually the default webcam on laptops
            self.camera = cv2.VideoCapture(0)
            
            if not self.camera.isOpened():
                raise Exception("Could not open video device")

            # Set resolution (Optional: OpenCV might not support all resolutions exactly)
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, Config.CAMERA_RESOLUTION[0])
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, Config.CAMERA_RESOLUTION[1])
            
            time.sleep(1)  # Brief warm-up
            print("✓ Laptop Camera initialized successfully")
            
        except Exception as e:
            print(f"✗ Camera initialization failed: {e}")
            self.camera = None
            self.create_dummy_frame()
    
    def create_dummy_frame(self):
        """Create a placeholder frame if camera fails"""
        img = Image.new('RGB', Config.CAMERA_RESOLUTION, color=(30, 30, 45))
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG')
        self.frame = buffer.getvalue()
    
    def capture_frame(self):
        """Capture single frame from camera"""
        if self.camera and self.camera.isOpened():
            try:
                # Read frame from OpenCV
                ret, frame_array = self.camera.read()
                
                if ret:
                    # OpenCV uses BGR, convert to RGB for PIL
                    frame_rgb = cv2.cvtColor(frame_array, cv2.COLOR_BGR2RGB)
                    img = Image.fromarray(frame_rgb)
                    
                    # Apply privacy blur if enabled
                    if self.privacy_mode:
                        img = img.filter(ImageFilter.GaussianBlur(radius=20))
                    
                    # Resize to match config exactly (in case webcam ignored settings)
                    if img.size != Config.CAMERA_RESOLUTION:
                         img = img.resize(Config.CAMERA_RESOLUTION)

                    # Convert to JPEG
                    buffer = io.BytesIO()
                    img.save(buffer, format='JPEG', quality=85)
                    return buffer.getvalue()
                else:
                    print("Failed to read frame")
                    return self.frame
            except Exception as e:
                print(f"Frame capture error: {e}")
                return self.frame
        return self.frame
    
    def generate_stream(self):
        """Generator function for MJPEG streaming"""
        while True:
            with self.lock:
                frame = self.capture_frame()
            
            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            
            time.sleep(1 / Config.CAMERA_FRAMERATE)
    
    def toggle_privacy(self):
        """Toggle privacy blur mode"""
        self.privacy_mode = not self.privacy_mode
        return self.privacy_mode
    
    def cleanup(self):
        """Release camera resources"""
        if self.camera:
            self.camera.release()
            print("Camera stopped")

# Global camera instance
camera = CameraStream()