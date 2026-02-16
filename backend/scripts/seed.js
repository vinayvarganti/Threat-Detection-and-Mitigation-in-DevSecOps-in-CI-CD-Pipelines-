const { User, Project, Pipeline, Scan, Vulnerability, ThreatPrediction, MitigationAction } = require('../models');
const logger = require('../utils/logger');

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Create admin user
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@devsecops.com',
      password: 'admin123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    // Create developer user
    const devUser = await User.create({
      username: 'developer',
      email: 'dev@devsecops.com',
      password: 'dev123',
      firstName: 'John',
      lastName: 'Developer',
      role: 'developer'
    });

    // Create sample projects
    const project1 = await Project.create({
      name: 'E-commerce Web App',
      description: 'A full-stack e-commerce application with React and Node.js',
      type: 'github',
      repositoryUrl: 'https://github.com/example/ecommerce-app',
      branch: 'main',
      language: 'JavaScript',
      framework: 'React',
      userId: devUser.id,
      riskScore: 6.5,
      lastScanDate: new Date()
    });

    const project2 = await Project.create({
      name: 'Banking API',
      description: 'Secure banking API with authentication and transaction processing',
      type: 'github',
      repositoryUrl: 'https://github.com/example/banking-api',
      branch: 'main',
      language: 'Java',
      framework: 'Spring Boot',
      userId: devUser.id,
      riskScore: 8.2,
      lastScanDate: new Date()
    });

    // Create sample pipelines
    const pipeline1 = await Pipeline.create({
      name: 'Security Scan Pipeline',
      status: 'completed',
      stage: 'completed',
      triggerType: 'manual',
      startTime: new Date(Date.now() - 3600000), // 1 hour ago
      endTime: new Date(Date.now() - 1800000), // 30 minutes ago
      duration: 1800, // 30 minutes
      projectId: project1.id,
      results: {
        summary: {
          totalVulnerabilities: 12,
          criticalCount: 2,
          highCount: 4,
          mediumCount: 4,
          lowCount: 2
        },
        securityGate: {
          passed: false,
          blockers: ['Critical vulnerabilities found']
        }
      }
    });

    const pipeline2 = await Pipeline.create({
      name: 'Automated Security Scan',
      status: 'completed',
      stage: 'completed',
      triggerType: 'scheduled',
      startTime: new Date(Date.now() - 7200000), // 2 hours ago
      endTime: new Date(Date.now() - 5400000), // 1.5 hours ago
      duration: 1800,
      projectId: project2.id,
      results: {
        summary: {
          totalVulnerabilities: 8,
          criticalCount: 1,
          highCount: 2,
          mediumCount: 3,
          lowCount: 2
        },
        securityGate: {
          passed: false,
          blockers: ['Critical SQL injection vulnerability']
        }
      }
    });

    // Create sample scans
    const scan1 = await Scan.create({
      type: 'sast',
      tool: 'SonarQube',
      status: 'completed',
      startTime: new Date(Date.now() - 3600000),
      endTime: new Date(Date.now() - 3000000),
      duration: 600,
      pipelineId: pipeline1.id,
      results: {
        summary: {
          totalIssues: 8,
          criticalCount: 1,
          highCount: 2,
          mediumCount: 3,
          lowCount: 2
        }
      }
    });

    const scan2 = await Scan.create({
      type: 'dast',
      tool: 'OWASP ZAP',
      status: 'completed',
      startTime: new Date(Date.now() - 2400000),
      endTime: new Date(Date.now() - 1800000),
      duration: 600,
      pipelineId: pipeline1.id,
      results: {
        summary: {
          totalIssues: 4,
          criticalCount: 1,
          highCount: 2,
          mediumCount: 1,
          lowCount: 0
        }
      }
    });

    // Create sample vulnerabilities
    const vuln1 = await Vulnerability.create({
      title: 'SQL Injection in Login Form',
      description: 'The login form is vulnerable to SQL injection attacks due to improper input validation.',
      severity: 'critical',
      category: 'Injection',
      cweId: 'CWE-89',
      cveId: 'CVE-2023-1234',
      cvssScore: 9.8,
      status: 'open',
      scanId: scan1.id,
      location: {
        file: 'src/auth/login.js',
        line: 45,
        function: 'authenticateUser'
      },
      remediation: 'Use parameterized queries or prepared statements to prevent SQL injection.',
      riskScore: 9.5,
      exploitability: 'functional'
    });

    const vuln2 = await Vulnerability.create({
      title: 'Cross-Site Scripting (XSS)',
      description: 'User input is not properly sanitized, allowing XSS attacks.',
      severity: 'high',
      category: 'Cross-Site Scripting',
      cweId: 'CWE-79',
      cvssScore: 7.4,
      status: 'open',
      scanId: scan2.id,
      location: {
        file: 'src/components/UserProfile.js',
        line: 23,
        function: 'displayUserName'
      },
      remediation: 'Implement proper input validation and output encoding.',
      riskScore: 7.2,
      exploitability: 'proof_of_concept'
    });

    // Create sample threat predictions
    const threat1 = await ThreatPrediction.create({
      threatType: 'Data Breach',
      severity: 'critical',
      confidence: 0.85,
      probability: 0.75,
      impact: 9.2,
      description: 'High probability of data breach due to multiple critical vulnerabilities.',
      projectId: project1.id,
      modelVersion: '1.0.0',
      prediction: {
        timeframe: '24h',
        likelihood: 0.75,
        riskFactors: ['Critical SQL injection', 'Weak authentication'],
        mitigationSuggestions: ['Patch SQL injection', 'Implement MFA']
      },
      validUntil: new Date(Date.now() + 86400000) // 24 hours
    });

    const threat2 = await ThreatPrediction.create({
      threatType: 'Privilege Escalation',
      severity: 'high',
      confidence: 0.72,
      probability: 0.65,
      impact: 7.8,
      description: 'Potential privilege escalation through authentication bypass.',
      projectId: project2.id,
      modelVersion: '1.0.0',
      prediction: {
        timeframe: '48h',
        likelihood: 0.65,
        riskFactors: ['Weak session management', 'Insufficient access controls'],
        mitigationSuggestions: ['Strengthen session handling', 'Implement RBAC']
      },
      validUntil: new Date(Date.now() + 172800000) // 48 hours
    });

    // Create sample mitigation actions
    const mitigation1 = await MitigationAction.create({
      type: 'patch_deployment',
      status: 'pending',
      priority: 'critical',
      automated: false,
      title: 'Fix SQL Injection Vulnerability',
      description: 'Deploy patch to fix SQL injection in login form',
      vulnerabilityId: vuln1.id,
      action: {
        command: 'deploy_patch',
        parameters: {
          file: 'src/auth/login.js',
          patch: 'sql_injection_fix.patch'
        },
        target: 'production'
      },
      approvalRequired: true,
      estimatedDuration: 30
    });

    const mitigation2 = await MitigationAction.create({
      type: 'configuration_change',
      status: 'completed',
      priority: 'high',
      automated: true,
      title: 'Enable XSS Protection Headers',
      description: 'Configure security headers to prevent XSS attacks',
      vulnerabilityId: vuln2.id,
      executedAt: new Date(Date.now() - 1800000),
      completedAt: new Date(Date.now() - 1200000),
      action: {
        command: 'update_headers',
        parameters: {
          'X-XSS-Protection': '1; mode=block',
          'Content-Security-Policy': "default-src 'self'"
        }
      },
      results: {
        success: true,
        output: 'Security headers configured successfully'
      },
      actualDuration: 10
    });

    logger.info('Database seeding completed successfully');
    logger.info(`Created users: ${adminUser.email}, ${devUser.email}`);
    logger.info(`Created projects: ${project1.name}, ${project2.name}`);
    logger.info(`Created ${pipeline1.id ? 2 : 1} pipelines, ${scan1.id ? 2 : 1} scans, ${vuln1.id ? 2 : 1} vulnerabilities`);

  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  const { sequelize } = require('../models');
  
  sequelize.authenticate()
    .then(() => {
      logger.info('Database connected successfully');
      return seedDatabase();
    })
    .then(() => {
      logger.info('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;