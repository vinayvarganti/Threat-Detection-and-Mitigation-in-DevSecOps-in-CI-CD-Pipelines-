// Import models
const User = require('./User');
const Project = require('./Project');
const Pipeline = require('./Pipeline');
const Scan = require('./Scan');
const Vulnerability = require('./Vulnerability');
const ThreatPrediction = require('./ThreatPrediction');
// const MitigationAction = require('./MitigationAction'); // Pending migration
const AuditLog = require('./AuditLog');


module.exports = {
  User,
  Project,
  Pipeline,
  Scan,
  Vulnerability,
  ThreatPrediction,
  //   MitigationAction,
  AuditLog
};