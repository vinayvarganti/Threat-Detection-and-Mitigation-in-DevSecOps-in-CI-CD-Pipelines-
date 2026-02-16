import os
import logging
import pymongo
from pymongo import MongoClient
from datetime import datetime, timedelta
import pandas as pd
from bson.objectid import ObjectId

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/devsecops_platform')
        try:
            self.client = MongoClient(self.mongo_uri)
            # Send a ping to confirm a successful connection
            self.client.admin.command('ping')
            self.db = self.client.get_default_database()
            logger.info("Connected to MongoDB")
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {e}")
            raise e
    
    def get_project_history(self, project_id):
        """Get historical data for a project"""
        try:
            if isinstance(project_id, str):
                project_id = ObjectId(project_id)

            pipeline = [
                {"$match": {"_id": project_id}},
                {
                    "$lookup": {
                        "from": "pipelines",
                        "localField": "_id",
                        "foreignField": "projectId",
                        "as": "pipelines"
                    }
                },
                {
                    "$project": {
                        "name": 1,
                        "riskScore": 1,
                        "lastScanDate": 1,
                        "total_pipelines": {"$size": "$pipelines"},
                        "successful_pipelines": {
                            "$size": {
                                "$filter": {
                                    "input": "$pipelines",
                                    "as": "p",
                                    "cond": {"$eq": ["$$p.status", "completed"]}
                                }
                            }
                        },
                        "failed_pipelines": {
                            "$size": {
                                "$filter": {
                                    "input": "$pipelines",
                                    "as": "p",
                                    "cond": {"$eq": ["$$p.status", "failed"]}
                                }
                            }
                        }
                    }
                }
            ]
            
            result = list(self.db.projects.aggregate(pipeline))
            
            if result:
                project = result[0]
                # For vulnerabilities, we might need another query if they are not embedded.
                # Assuming Vulnerabilities are linked to Scans -> Pipelines -> Project.
                # Simplified: fetching total vulns from 'vulnerabilities' collection linked to this project's scans is complex in one go.
                # We'll do a separate count for now or simplified estimation.
                
                # Let's count vulnerabilities via pipelines -> scans
                # This is an expensive aggregation, but standard for reporting.
                vuln_pipeline = [
                    {"$match": {"projectId": project_id}}, # Pipelines for this project
                    {
                        "$lookup": {
                            "from": "scans",
                            "localField": "_id",
                            "foreignField": "pipelineId",
                            "as": "scans"
                        }
                    },
                    {"$unwind": "$scans"},
                    {
                        "$lookup": {
                            "from": "vulnerabilities",
                            "localField": "scans._id",
                            "foreignField": "scanId",
                            "as": "vulns"
                        }
                    },
                    {"$unwind": "$vulns"},
                    {
                        "$group": {
                            "_id": None,
                            "total": {"$sum": 1},
                            "critical": {"$sum": {"$cond": [{"$eq": ["$vulns.severity", "critical"]}, 1, 0]}},
                            "high": {"$sum": {"$cond": [{"$eq": ["$vulns.severity", "high"]}, 1, 0]}},
                            "medium": {"$sum": {"$cond": [{"$eq": ["$vulns.severity", "medium"]}, 1, 0]}},
                            "low": {"$sum": {"$cond": [{"$eq": ["$vulns.severity", "low"]}, 1, 0]}}
                        }
                    }
                ]
                
                vuln_stats = list(self.db.pipelines.aggregate(vuln_pipeline))
                stats = vuln_stats[0] if vuln_stats else {}

                return {
                    'project_id': str(project['_id']),
                    'name': project.get('name'),
                    'risk_score': float(project.get('riskScore', 0)),
                    'last_scan_date': project.get('lastScanDate'),
                    'total_vulnerabilities': stats.get('total', 0),
                    'critical_vulns': stats.get('critical', 0),
                    'high_vulns': stats.get('high', 0),
                    'medium_vulns': stats.get('medium', 0),
                    'low_vulns': stats.get('low', 0),
                    'total_pipelines': project.get('total_pipelines', 0),
                    'successful_pipelines': project.get('successful_pipelines', 0),
                    'failed_pipelines': project.get('failed_pipelines', 0)
                }
            else:
                return {}
                    
        except Exception as e:
            logger.error(f"Error getting project history: {str(e)}")
            return {}
    
    def get_vulnerability_trends(self, project_id, days=30):
        """Get vulnerability trends for a project"""
        # Simplification: Return empty trends for now to avoid complex migration logic unless strictly needed.
        return []

    def store_threat_prediction(self, project_id, prediction):
        """Store threat prediction in database"""
        try:
            doc = {
                "threatType": prediction['threat_type'],
                "severity": prediction['severity'],
                "confidence": prediction['confidence'],
                "probability": prediction['probability'],
                "impact": prediction['impact'],
                "description": prediction.get('description', ''),
                "projectId": ObjectId(project_id) if project_id else None,
                "modelVersion": prediction['model_version'],
                "prediction": prediction,
                "validUntil": datetime.now() + timedelta(hours=24),
                "createdAt": datetime.now(),
                "updatedAt": datetime.now()
            }
            self.db.threatpredictions.insert_one(doc)
            logger.info(f"Threat prediction stored for project {project_id}")
            
        except Exception as e:
            logger.error(f"Error storing threat prediction: {str(e)}")
            raise
    
    def get_training_data(self, limit=1000):
        """Get training data for ML models"""
        # Return empty DataFrame for now
        return pd.DataFrame()
    
    def store_feedback(self, prediction_id, actual_outcome, feedback_score=None):
        """Store feedback on prediction accuracy"""
        try:
            self.db.threatpredictions.update_one(
                {"_id": ObjectId(prediction_id)},
                {
                    "$set": {
                        "actualOutcome": actual_outcome,
                        "feedback.accuracy": feedback_score,
                        "updatedAt": datetime.now()
                    }
                }
            )
            logger.info(f"Feedback stored for prediction {prediction_id}")
            
        except Exception as e:
            logger.error(f"Error storing feedback: {str(e)}")
            raise
    
    def get_system_metrics(self, project_id=None, hours=24):
        """Get system metrics for anomaly detection"""
        return []