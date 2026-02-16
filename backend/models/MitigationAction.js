module.exports = (sequelize, DataTypes) => {
  const MitigationAction = sequelize.define('MitigationAction', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    type: {
      type: DataTypes.ENUM(
        'patch_deployment',
        'configuration_change',
        'access_restriction',
        'service_isolation',
        'traffic_blocking',
        'rollback',
        'alert_escalation',
        'manual_intervention'
      ),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    priority: {
      type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
      allowNull: false
    },
    automated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    action: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        command: null,
        parameters: {},
        target: null,
        rollbackPlan: null
      }
    },
    executedBy: {
      type: DataTypes.UUID
    },
    executedAt: {
      type: DataTypes.DATE
    },
    completedAt: {
      type: DataTypes.DATE
    },
    results: {
      type: DataTypes.JSONB,
      defaultValue: {
        success: false,
        output: null,
        error: null,
        metrics: {}
      }
    },
    rollbackAction: {
      type: DataTypes.JSONB,
      defaultValue: null
    },
    approvalRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    approvedBy: {
      type: DataTypes.UUID
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    estimatedDuration: {
      type: DataTypes.INTEGER // in minutes
    },
    actualDuration: {
      type: DataTypes.INTEGER // in minutes
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  });

  return MitigationAction;
};