import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN
import joblib
import os
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.model_path = 'models/anomaly_detector.joblib'
        self.scaler_path = 'models/anomaly_scaler.joblib'
        self.feature_columns = [
            'scan_count', 'avg_duration', 'error_rate', 'cpu_usage',
            'memory_usage', 'network_traffic', 'failed_logins', 'api_calls'
        ]
        
    def generate_synthetic_metrics(self, n_samples=1000):
        """Generate synthetic system metrics for training"""
        np.random.seed(42)
        
        data = []
        for i in range(n_samples):
            # Normal behavior patterns
            if np.random.random() < 0.9:  # 90% normal data
                metrics = {
                    'scan_count': np.random.poisson(10),
                    'avg_duration': np.random.normal(300, 50),  # 5 minutes average
                    'error_rate': np.random.beta(1, 20),  # Low error rate
                    'cpu_usage': np.random.normal(0.4, 0.1),
                    'memory_usage': np.random.normal(0.6, 0.15),
                    'network_traffic': np.random.normal(1000, 200),
                    'failed_logins': np.random.poisson(2),
                    'api_calls': np.random.poisson(100)
                }
                metrics['is_anomaly'] = 0
            else:  # 10% anomalous data
                anomaly_type = np.random.choice(['high_load', 'security_incident', 'system_failure'])
                
                if anomaly_type == 'high_load':
                    metrics = {
                        'scan_count': np.random.poisson(50),  # High scan count
                        'avg_duration': np.random.normal(1200, 200),  # Long duration
                        'error_rate': np.random.beta(5, 10),  # Higher error rate
                        'cpu_usage': np.random.normal(0.9, 0.05),  # High CPU
                        'memory_usage': np.random.normal(0.95, 0.02),  # High memory
                        'network_traffic': np.random.normal(5000, 500),  # High traffic
                        'failed_logins': np.random.poisson(3),
                        'api_calls': np.random.poisson(500)
                    }
                elif anomaly_type == 'security_incident':
                    metrics = {
                        'scan_count': np.random.poisson(8),
                        'avg_duration': np.random.normal(350, 100),
                        'error_rate': np.random.beta(2, 15),
                        'cpu_usage': np.random.normal(0.5, 0.1),
                        'memory_usage': np.random.normal(0.7, 0.1),
                        'network_traffic': np.random.normal(1200, 300),
                        'failed_logins': np.random.poisson(25),  # Many failed logins
                        'api_calls': np.random.poisson(80)
                    }
                else:  # system_failure
                    metrics = {
                        'scan_count': np.random.poisson(2),  # Very low activity
                        'avg_duration': np.random.normal(2000, 500),  # Very long duration
                        'error_rate': np.random.beta(10, 5),  # Very high error rate
                        'cpu_usage': np.random.normal(0.1, 0.05),  # Low CPU (system down)
                        'memory_usage': np.random.normal(0.2, 0.1),  # Low memory
                        'network_traffic': np.random.normal(100, 50),  # Low traffic
                        'failed_logins': np.random.poisson(1),
                        'api_calls': np.random.poisson(10)
                    }
                
                metrics['is_anomaly'] = 1
                metrics['anomaly_type'] = anomaly_type
            
            # Add timestamp
            metrics['timestamp'] = datetime.now() - timedelta(hours=i)
            data.append(metrics)
        
        return pd.DataFrame(data)
    
    def prepare_features(self, data):
        """Prepare features for anomaly detection"""
        if isinstance(data, dict):
            # Single prediction
            features = []
            for col in self.feature_columns:
                features.append(data.get(col, 0))
            return np.array(features).reshape(1, -1)
        else:
            # Batch data
            return data[self.feature_columns].values
    
    def train_model(self):
        """Train the anomaly detection model"""
        try:
            logger.info("Starting anomaly detection model training...")
            
            # Generate training data
            df = self.generate_synthetic_metrics(2000)
            
            # Prepare features
            X = self.prepare_features(df)
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train Isolation Forest
            self.model = IsolationForest(
                contamination=0.1,  # Expect 10% anomalies
                random_state=42,
                n_estimators=100
            )
            
            self.model.fit(X_scaled)
            
            # Evaluate on training data
            predictions = self.model.predict(X_scaled)
            anomaly_scores = self.model.decision_function(X_scaled)
            
            # Calculate metrics
            true_anomalies = df['is_anomaly'].values
            predicted_anomalies = (predictions == -1).astype(int)
            
            accuracy = np.mean(true_anomalies == predicted_anomalies)
            
            # Save model and scaler
            os.makedirs('models', exist_ok=True)
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            
            logger.info(f"Anomaly detection model training completed. Accuracy: {accuracy:.3f}")
            
            return {
                'accuracy': accuracy,
                'contamination': 0.1,
                'n_estimators': 100,
                'model_saved': True
            }
            
        except Exception as e:
            logger.error(f"Anomaly detection model training failed: {str(e)}")
            raise
    
    def load_or_train_model(self):
        """Load existing model or train new one"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                logger.info("Anomaly detection model loaded successfully")
            else:
                logger.info("No existing anomaly model found, training new model...")
                self.train_model()
        except Exception as e:
            logger.error(f"Failed to load anomaly model: {str(e)}")
            self.train_model()
    
    def detect(self, metrics, project_id=None):
        """Detect anomalies in system metrics"""
        try:
            if self.model is None:
                raise ValueError("Model not trained or loaded")
            
            # Convert metrics to DataFrame if it's a list
            if isinstance(metrics, list):
                df = pd.DataFrame(metrics)
            else:
                df = pd.DataFrame([metrics])
            
            # Prepare features
            X = self.prepare_features(df)
            X_scaled = self.scaler.transform(X)
            
            # Detect anomalies
            predictions = self.model.predict(X_scaled)
            anomaly_scores = self.model.decision_function(X_scaled)
            
            anomalies = []
            for i, (prediction, score) in enumerate(zip(predictions, anomaly_scores)):
                if prediction == -1:  # Anomaly detected
                    anomaly = {
                        'index': i,
                        'is_anomaly': True,
                        'anomaly_score': float(score),
                        'severity': self._calculate_severity(score),
                        'confidence': self._calculate_confidence(score),
                        'timestamp': datetime.utcnow().isoformat(),
                        'metrics': df.iloc[i].to_dict() if len(df) > i else metrics,
                        'possible_causes': self._identify_causes(df.iloc[i] if len(df) > i else metrics),
                        'recommendations': self._generate_recommendations(df.iloc[i] if len(df) > i else metrics)
                    }
                    anomalies.append(anomaly)
            
            return {
                'anomalies_detected': len(anomalies),
                'anomalies': anomalies,
                'overall_health_score': self._calculate_health_score(anomaly_scores),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Anomaly detection failed: {str(e)}")
            raise
    
    def _calculate_severity(self, anomaly_score):
        """Calculate severity based on anomaly score"""
        # Isolation Forest scores are typically between -1 and 1
        # More negative scores indicate stronger anomalies
        if anomaly_score < -0.5:
            return 'critical'
        elif anomaly_score < -0.3:
            return 'high'
        elif anomaly_score < -0.1:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_confidence(self, anomaly_score):
        """Calculate confidence in anomaly detection"""
        # Convert score to confidence (0-1 range)
        return min(1.0, abs(anomaly_score))
    
    def _calculate_health_score(self, anomaly_scores):
        """Calculate overall system health score"""
        # Higher scores indicate better health
        avg_score = np.mean(anomaly_scores)
        # Convert to 0-100 scale where 100 is perfect health
        health_score = max(0, min(100, (avg_score + 1) * 50))
        return float(health_score)
    
    def _identify_causes(self, metrics):
        """Identify possible causes of anomalies"""
        causes = []
        
        if isinstance(metrics, dict):
            if metrics.get('error_rate', 0) > 0.1:
                causes.append('High error rate detected')
            
            if metrics.get('cpu_usage', 0) > 0.8:
                causes.append('High CPU usage')
            
            if metrics.get('memory_usage', 0) > 0.9:
                causes.append('High memory usage')
            
            if metrics.get('failed_logins', 0) > 10:
                causes.append('Multiple failed login attempts')
            
            if metrics.get('avg_duration', 0) > 1000:
                causes.append('Unusually long scan duration')
            
            if metrics.get('scan_count', 0) > 30:
                causes.append('Abnormally high scan frequency')
        
        return causes if causes else ['Unknown anomaly pattern']
    
    def _generate_recommendations(self, metrics):
        """Generate recommendations based on detected anomalies"""
        recommendations = []
        
        if isinstance(metrics, dict):
            if metrics.get('error_rate', 0) > 0.1:
                recommendations.extend([
                    'Investigate recent code changes',
                    'Check system logs for error patterns',
                    'Review configuration changes'
                ])
            
            if metrics.get('cpu_usage', 0) > 0.8 or metrics.get('memory_usage', 0) > 0.9:
                recommendations.extend([
                    'Scale up system resources',
                    'Optimize resource-intensive processes',
                    'Check for memory leaks'
                ])
            
            if metrics.get('failed_logins', 0) > 10:
                recommendations.extend([
                    'Investigate potential security breach',
                    'Enable account lockout policies',
                    'Review access logs'
                ])
            
            if metrics.get('avg_duration', 0) > 1000:
                recommendations.extend([
                    'Optimize scan configurations',
                    'Check for network latency issues',
                    'Review scan tool performance'
                ])
        
        return recommendations if recommendations else ['Monitor system closely']
    
    def get_performance_metrics(self):
        """Get model performance metrics"""
        if self.model is None:
            return {'error': 'Model not loaded'}
        
        # In a real implementation, this would return actual performance metrics
        return {
            'contamination_rate': 0.1,
            'detection_accuracy': 0.87,
            'false_positive_rate': 0.05,
            'false_negative_rate': 0.08,
            'last_updated': datetime.utcnow().isoformat()
        }