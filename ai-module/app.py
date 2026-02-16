from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import json

from threat_predictor import ThreatPredictor
from anomaly_detector import AnomalyDetector
from vulnerability_analyzer import VulnerabilityAnalyzer
from database import DatabaseManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize components
db_manager = DatabaseManager()
threat_predictor = ThreatPredictor()
anomaly_detector = AnomalyDetector()
vulnerability_analyzer = VulnerabilityAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })

@app.route('/predict/threat', methods=['POST'])
def predict_threat():
    """Predict potential threats based on project data"""
    try:
        data = request.get_json()
        project_id = data.get('project_id')
        features = data.get('features', {})
        
        if not project_id:
            return jsonify({'error': 'project_id is required'}), 400
        
        # Get historical data for the project
        historical_data = db_manager.get_project_history(project_id)
        
        # Generate threat prediction
        prediction = threat_predictor.predict(features, historical_data)
        
        # Store prediction in database
        # db_manager.store_threat_prediction(project_id, prediction)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        })
        
    except Exception as e:
        logger.error(f"Threat prediction error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/analyze/vulnerabilities', methods=['POST'])
def analyze_vulnerabilities():
    """Analyze vulnerabilities and provide risk assessment"""
    try:
        data = request.get_json()
        vulnerabilities = data.get('vulnerabilities', [])
        project_context = data.get('project_context', {})
        
        if not vulnerabilities:
            return jsonify({'error': 'vulnerabilities data is required'}), 400
        
        # Analyze vulnerabilities
        analysis = vulnerability_analyzer.analyze(vulnerabilities, project_context)
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Vulnerability analysis error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/detect/anomalies', methods=['POST'])
def detect_anomalies():
    """Detect anomalies in system behavior"""
    try:
        data = request.get_json()
        metrics = data.get('metrics', [])
        project_id = data.get('project_id')
        
        if not metrics:
            return jsonify({'error': 'metrics data is required'}), 400
        
        # Detect anomalies
        anomalies = anomaly_detector.detect(metrics, project_id)
        
        return jsonify({
            'success': True,
            'anomalies': anomalies
        })
        
    except Exception as e:
        logger.error(f"Anomaly detection error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/recommend/mitigations', methods=['POST'])
def recommend_mitigations():
    """Recommend mitigation actions based on threats and vulnerabilities"""
    try:
        data = request.get_json()
        threats = data.get('threats', [])
        vulnerabilities = data.get('vulnerabilities', [])
        project_context = data.get('project_context', {})
        
        # Generate mitigation recommendations
        recommendations = threat_predictor.recommend_mitigations(
            threats, vulnerabilities, project_context
        )
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        logger.error(f"Mitigation recommendation error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/train/model', methods=['POST'])
def train_model():
    """Train or retrain the threat prediction model"""
    try:
        data = request.get_json()
        model_type = data.get('model_type', 'threat_prediction')
        
        if model_type == 'threat_prediction':
            result = threat_predictor.train_model()
        elif model_type == 'anomaly_detection':
            result = anomaly_detector.train_model()
        else:
            return jsonify({'error': 'Invalid model type'}), 400
        
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Model training error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/model/performance', methods=['GET'])
def get_model_performance():
    """Get model performance metrics"""
    try:
        model_type = request.args.get('model_type', 'threat_prediction')
        
        if model_type == 'threat_prediction':
            performance = threat_predictor.get_performance_metrics()
        elif model_type == 'anomaly_detection':
            performance = anomaly_detector.get_performance_metrics()
        else:
            return jsonify({'error': 'Invalid model type'}), 400
        
        return jsonify({
            'success': True,
            'performance': performance
        })
        
    except Exception as e:
        logger.error(f"Performance metrics error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/feedback', methods=['POST'])
def submit_feedback():
    """Submit feedback on prediction accuracy"""
    try:
        data = request.get_json()
        prediction_id = data.get('prediction_id')
        actual_outcome = data.get('actual_outcome')
        feedback_score = data.get('feedback_score')
        
        if not all([prediction_id, actual_outcome]):
            return jsonify({'error': 'prediction_id and actual_outcome are required'}), 400
        
        # Store feedback
        db_manager.store_feedback(prediction_id, actual_outcome, feedback_score)
        
        # Update model with feedback
        threat_predictor.update_with_feedback(prediction_id, actual_outcome)
        
        return jsonify({
            'success': True,
            'message': 'Feedback submitted successfully'
        })
        
    except Exception as e:
        logger.error(f"Feedback submission error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Initialize models on startup
    try:
        threat_predictor.load_or_train_model()
        anomaly_detector.load_or_train_model()
        logger.info("AI models initialized successfully")
    except Exception as e:
        logger.error(f"Model initialization error: {str(e)}")
    
    # Start the Flask app
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_ENV') == 'development')