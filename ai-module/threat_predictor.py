import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import joblib
import os
import json
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ThreatPredictor:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = [
            'vulnerability_count', 'critical_vulns', 'high_vulns', 'medium_vulns', 'low_vulns',
            'code_complexity', 'dependency_count', 'outdated_dependencies',
            'failed_scans', 'deployment_frequency', 'code_changes',
            'external_connections', 'privileged_access', 'data_sensitivity',
            'compliance_score', 'security_training_score'
        ]
        self.threat_types = [
            'code_injection', 'data_breach', 'privilege_escalation',
            'denial_of_service', 'malware_infection', 'insider_threat',
            'supply_chain_attack', 'configuration_drift'
        ]
        self.model_path = 'models/threat_predictor.joblib'
        self.scaler_path = 'models/threat_scaler.joblib'
        
    def generate_synthetic_data(self, n_samples=1000):
        """Generate synthetic training data for demonstration"""
        np.random.seed(42)
        
        data = []
        for _ in range(n_samples):
            # Generate realistic feature values
            vuln_count = np.random.poisson(5)
            critical_vulns = np.random.poisson(max(0, vuln_count * 0.1))
            high_vulns = np.random.poisson(max(0, vuln_count * 0.2))
            medium_vulns = np.random.poisson(max(0, vuln_count * 0.4))
            low_vulns = max(0, vuln_count - critical_vulns - high_vulns - medium_vulns)
            
            features = {
                'vulnerability_count': vuln_count,
                'critical_vulns': critical_vulns,
                'high_vulns': high_vulns,
                'medium_vulns': medium_vulns,
                'low_vulns': low_vulns,
                'code_complexity': np.random.uniform(1, 10),
                'dependency_count': np.random.poisson(20),
                'outdated_dependencies': np.random.poisson(3),
                'failed_scans': np.random.poisson(1),
                'deployment_frequency': np.random.uniform(0.1, 5),
                'code_changes': np.random.poisson(10),
                'external_connections': np.random.poisson(5),
                'privileged_access': np.random.choice([0, 1], p=[0.7, 0.3]),
                'data_sensitivity': np.random.uniform(1, 5),
                'compliance_score': np.random.uniform(0.5, 1.0),
                'security_training_score': np.random.uniform(0.3, 1.0)
            }
            
            # Calculate threat probability based on features
            threat_score = (
                critical_vulns * 0.4 +
                high_vulns * 0.2 +
                features['code_complexity'] * 0.1 +
                features['outdated_dependencies'] * 0.1 +
                features['failed_scans'] * 0.1 +
                (1 - features['compliance_score']) * 0.1
            )
            
            # Determine threat type and probability
            threat_probability = min(1.0, threat_score / 10)
            has_threat = np.random.random() < threat_probability
            
            if has_threat:
                # Higher probability for certain threat types based on features
                if critical_vulns > 0:
                    threat_type = np.random.choice(['code_injection', 'privilege_escalation'])
                elif features['outdated_dependencies'] > 5:
                    threat_type = 'supply_chain_attack'
                elif features['external_connections'] > 10:
                    threat_type = 'data_breach'
                else:
                    threat_type = np.random.choice(self.threat_types)
            else:
                threat_type = 'no_threat'
            
            features['threat_type'] = threat_type
            features['threat_probability'] = threat_probability
            data.append(features)
        
        return pd.DataFrame(data)
    
    def prepare_features(self, data):
        """Prepare features for model training or prediction"""
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
        """Train the threat prediction model"""
        try:
            logger.info("Starting threat prediction model training...")
            
            # Generate or load training data
            df = self.generate_synthetic_data(2000)
            
            # Prepare features and labels
            X = self.prepare_features(df)
            y = df['threat_type'].values
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model = GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.1,
                max_depth=6,
                random_state=42
            )
            
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            train_score = self.model.score(X_train_scaled, y_train)
            test_score = self.model.score(X_test_scaled, y_test)
            
            # Cross-validation
            cv_scores = cross_val_score(self.model, X_train_scaled, y_train, cv=5)
            
            # Save model and scaler
            os.makedirs('models', exist_ok=True)
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            
            logger.info(f"Model training completed. Train score: {train_score:.3f}, Test score: {test_score:.3f}")
            
            return {
                'train_score': train_score,
                'test_score': test_score,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'model_saved': True
            }
            
        except Exception as e:
            logger.error(f"Model training failed: {str(e)}")
            raise
    
    def load_or_train_model(self):
        """Load existing model or train new one"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                logger.info("Threat prediction model loaded successfully")
            else:
                logger.info("No existing model found, training new model...")
                self.train_model()
        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            self.train_model()
    
    def predict(self, features, historical_data=None):
        """Predict threats for given features"""
        try:
            if self.model is None:
                raise ValueError("Model not trained or loaded")
            
            # Prepare features
            X = self.prepare_features(features)
            X_scaled = self.scaler.transform(X)
            
            # Get prediction and probabilities
            prediction = self.model.predict(X_scaled)[0]
            probabilities = self.model.predict_proba(X_scaled)[0]
            
            # Get class labels
            classes = self.model.classes_
            
            # Create probability dictionary
            prob_dict = dict(zip(classes, probabilities))
            
            # Calculate confidence and impact
            max_prob = max(probabilities)
            confidence = max_prob
            
            # Calculate impact based on vulnerability severity
            impact = self._calculate_impact(features)
            
            # Generate prediction result
            result = {
                'threat_type': prediction,
                'confidence': float(confidence),
                'probability': float(max_prob),
                'impact': float(impact),
                'severity': self._determine_severity(max_prob, impact),
                'probabilities': {k: float(v) for k, v in prob_dict.items()},
                'risk_factors': self._identify_risk_factors(features),
                'mitigation_suggestions': self._generate_mitigation_suggestions(prediction, features),
                'description': self._generate_description(prediction, features),
                'timestamp': datetime.utcnow().isoformat(),
                'model_version': '1.0.0'
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise
    
    def _calculate_impact(self, features):
        """Calculate potential impact score"""
        impact = 0.0
        
        # Vulnerability impact
        impact += features.get('critical_vulns', 0) * 0.4
        impact += features.get('high_vulns', 0) * 0.2
        impact += features.get('medium_vulns', 0) * 0.1
        
        # Data sensitivity impact
        impact += features.get('data_sensitivity', 1) * 0.2
        
        # Privileged access impact
        if features.get('privileged_access', 0):
            impact += 2.0
        
        # External connections impact
        impact += min(features.get('external_connections', 0) * 0.1, 1.0)
        
        return min(impact, 10.0)
    
    def _determine_severity(self, probability, impact):
        """Determine threat severity based on probability and impact"""
        risk_score = probability * impact
        
        if risk_score >= 7:
            return 'critical'
        elif risk_score >= 5:
            return 'high'
        elif risk_score >= 3:
            return 'medium'
        else:
            return 'low'
    
    def _identify_risk_factors(self, features):
        """Identify key risk factors"""
        risk_factors = []
        
        if features.get('critical_vulns', 0) > 0:
            risk_factors.append('Critical vulnerabilities present')
        
        if features.get('outdated_dependencies', 0) > 5:
            risk_factors.append('Multiple outdated dependencies')
        
        if features.get('failed_scans', 0) > 2:
            risk_factors.append('Recent scan failures')
        
        if features.get('compliance_score', 1) < 0.7:
            risk_factors.append('Low compliance score')
        
        if features.get('security_training_score', 1) < 0.5:
            risk_factors.append('Insufficient security training')
        
        return risk_factors
    
    def _generate_mitigation_suggestions(self, threat_type, features):
        """Generate mitigation suggestions based on threat type"""
        suggestions = []
        
        if threat_type == 'code_injection':
            suggestions.extend([
                'Implement input validation and sanitization',
                'Use parameterized queries',
                'Enable Content Security Policy (CSP)'
            ])
        elif threat_type == 'privilege_escalation':
            suggestions.extend([
                'Implement principle of least privilege',
                'Regular access reviews',
                'Enable multi-factor authentication'
            ])
        elif threat_type == 'supply_chain_attack':
            suggestions.extend([
                'Update outdated dependencies',
                'Implement dependency scanning',
                'Use software composition analysis'
            ])
        elif threat_type == 'data_breach':
            suggestions.extend([
                'Encrypt sensitive data',
                'Implement data loss prevention',
                'Regular security assessments'
            ])
        
        # General suggestions based on features
        if features.get('critical_vulns', 0) > 0:
            suggestions.append('Address critical vulnerabilities immediately')
        
        if features.get('compliance_score', 1) < 0.8:
            suggestions.append('Improve compliance posture')
        
        return suggestions
    
    def _generate_description(self, threat_type, features):
        """Generate a human-readable description of the threat"""
        risk_factors = self._identify_risk_factors(features)
        
        description_map = {
            'code_injection': "High risk of code injection attacks due to input validation weaknesses.",
            'privilege_escalation': "Potential for privilege escalation exploits detected.",
            'supply_chain_attack': "Supply chain vulnerabilities detected in dependencies.",
            'data_breach': "High probability of data exposure or breach.",
            'denial_of_service': "System shows susceptibility to Denial of Service attacks.",
            'malware_infection': "Indicators suggest possible malware infection vectors.",
            'insider_threat': "Anomalous patterns consistent with insider threat activity.",
            'configuration_drift': "Significant drift in security configurations detected.",
            'no_threat': "No significant threats detected at this time."
        }
        
        base_desc = description_map.get(threat_type, f"Potential {threat_type.replace('_', ' ')} detected.")
        
        if risk_factors:
            factors_str = ", ".join(risk_factors).lower()
            return f"{base_desc} primarily driven by {factors_str}."
        
        return base_desc
    
    def recommend_mitigations(self, threats, vulnerabilities, project_context):
        """Recommend mitigation actions"""
        recommendations = []
        
        for threat in threats:
            threat_type = threat.get('threat_type')
            severity = threat.get('severity')
            
            mitigation = {
                'threat_id': threat.get('id'),
                'type': self._get_mitigation_type(threat_type),
                'priority': self._get_priority(severity),
                'actions': self._get_mitigation_actions(threat_type, project_context),
                'estimated_effort': self._estimate_effort(threat_type),
                'automation_possible': self._can_automate(threat_type)
            }
            
            recommendations.append(mitigation)
        
        return recommendations
    
    def _get_mitigation_type(self, threat_type):
        """Get mitigation type for threat"""
        mitigation_map = {
            'code_injection': 'code_fix',
            'privilege_escalation': 'access_control',
            'supply_chain_attack': 'dependency_update',
            'data_breach': 'data_protection',
            'denial_of_service': 'infrastructure_hardening'
        }
        return mitigation_map.get(threat_type, 'manual_review')
    
    def _get_priority(self, severity):
        """Get priority based on severity"""
        priority_map = {
            'critical': 'critical',
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        }
        return priority_map.get(severity, 'medium')
    
    def _get_mitigation_actions(self, threat_type, context):
        """Get specific mitigation actions"""
        actions = {
            'code_injection': [
                'Update input validation rules',
                'Implement output encoding',
                'Deploy WAF rules'
            ],
            'supply_chain_attack': [
                'Update vulnerable dependencies',
                'Enable dependency scanning',
                'Implement SCA tools'
            ]
        }
        return actions.get(threat_type, ['Manual security review required'])
    
    def _estimate_effort(self, threat_type):
        """Estimate effort required for mitigation"""
        effort_map = {
            'code_injection': 'medium',
            'privilege_escalation': 'high',
            'supply_chain_attack': 'low',
            'data_breach': 'high'
        }
        return effort_map.get(threat_type, 'medium')
    
    def _can_automate(self, threat_type):
        """Check if mitigation can be automated"""
        automatable = ['supply_chain_attack', 'configuration_drift']
        return threat_type in automatable
    
    def update_with_feedback(self, prediction_id, actual_outcome):
        """Update model with feedback"""
        # In a real implementation, this would retrain the model
        # with the feedback data
        logger.info(f"Received feedback for prediction {prediction_id}: {actual_outcome}")
    
    def get_performance_metrics(self):
        """Get model performance metrics"""
        if self.model is None:
            return {'error': 'Model not loaded'}
        
        # In a real implementation, this would return actual performance metrics
        return {
            'accuracy': 0.85,
            'precision': 0.82,
            'recall': 0.88,
            'f1_score': 0.85,
            'last_updated': datetime.utcnow().isoformat()
        }