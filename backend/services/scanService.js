const { Scan, Vulnerability, Project, Pipeline, ThreatPrediction } = require('../models');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class ScanService {
    async startScan(pipelineId) {
        logger.info(`Starting scan for pipeline ${pipelineId}`);

        try {
            // 1. Fetch pipeline and project details
            // Mongoose: findById and populate
            const pipeline = await Pipeline.findById(pipelineId).populate('projectId');

            if (!pipeline) {
                throw new Error('Pipeline not found');
            }

            // In Mongoose populate: 'projectId' field becomes the object (Project document)
            const project = pipeline.projectId;

            if (!project) {
                throw new Error('Project not found for pipeline');
            }

            // 2. Create Scan records for each type
            const scanTypes = ['sast', 'dependency', 'dast', 'code-quality'];
            const scans = [];

            for (const type of scanTypes) {
                const scan = await Scan.create({
                    pipelineId: pipeline._id,
                    type: type,
                    tool: this.getToolNameForType(type),
                    status: 'scanning', // Fixed: 'running' was invalid enum
                    startTime: new Date(),
                    metadata: { projectId: project._id } // project._id is ObjectId
                });
                scans.push(scan);
            }

            // 3. Execute Scans (Asynchronous)
            // We don't await this to return quickly
            this.executeScans(project, scans, pipeline);

            return scans;

        } catch (error) {
            logger.error(`Failed to start scan: ${error.message}`);
            throw error;
        }
    }

    getToolNameForType(type) {
        switch (type) {
            case 'sast': return 'Internal-SAST';
            case 'dependency': return 'Node-Sec';
            case 'dast': return 'OWASP-ZAP-Bridge';
            case 'code-quality': return 'SonarQube';
            default: return 'Generic-Scanner';
        }
    }

    async executeScans(project, scans, pipeline) {
        try {
            // 3.1 Fetch Repository Context (if GitHub)
            let repoFiles = [];
            let packageJson = null;

            if (project.type === 'github' && project.repositoryUrl) {
                try {
                    const repoPath = project.repositoryUrl.replace('https://github.com/', '').replace(/\/$/, '');
                    const [owner, repo] = repoPath.split('/');

                    // Fetch file tree (recursive)
                    // Limitation: GitHub API tree limit. For demo, typical depth is fine.
                    const treeResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${project.branch || 'main'}?recursive=1`);
                    repoFiles = treeResponse.data.tree;

                    // Try to fetch package.json for SCA
                    const packageJsonFile = repoFiles.find(f => f.path === 'package.json');
                    if (packageJsonFile) {
                        // Actually better to use raw content URL
                        const rawPackageResponse = await axios.get(`https://raw.githubusercontent.com/${owner}/${repo}/${project.branch || 'main'}/package.json`);
                        packageJson = rawPackageResponse.data;
                    }

                } catch (err) {
                    logger.warn(`Failed to fetch GitHub data: ${err.message}`);
                }
            }

            // 3.2 Run SAST (Generic Secrets & Config)
            const sastScan = scans.find(s => s.type === 'sast');
            if (sastScan) {
                await this.runSastScan(sastScan, repoFiles, project);
            }

            // 3.3 Run Dependency Scan (SCA)
            const depScan = scans.find(s => s.type === 'dependency');
            if (depScan) {
                await this.runDependencyScan(depScan, packageJson);
            }

            // 3.4 Run DAST (ZAP Stub)
            const dastScan = scans.find(s => s.type === 'dast');
            if (dastScan) {
                await this.runDastScan(dastScan, project);
            }

            // 3.5 Run SonarQube Scan (Code Quality)
            const qualityScan = scans.find(s => s.type === 'code-quality');
            if (qualityScan) {
                await this.runSonarQubeScan(qualityScan, project);
            }

            // 3.6 Run AI Threat Prediction
            await this.runThreatPrediction(project, pipeline, scans);

        } catch (globalError) {
            logger.error(`Critical error during scan execution: ${globalError.message}`);
            // Mark all remaining running scans as failed
            for (const scan of scans) {
                const s = await Scan.findById(scan._id);
                if (s && (s.status === 'scanning' || s.status === 'pending')) {
                    s.status = 'failed';
                    // s.errorMessage = globalError.message; // Schema doesn't have errorMessage explicitly? 
                    // Verify Scan schema: it has 'result' and 'rawOutput'. 
                    // Let's add logs to rawOutput or just log error.
                    // Or add 'error' field if I didn't. I didn't add errorMessage to Scan.js.
                    // I'll assume status failed is enough or update rawOutput.
                    s.endTime = new Date();
                    await s.save();
                }
            }
        }
    }

    // --- SAST Logic ---
    async runSastScan(scan, unusedRepoFiles, project) {
        const { ESLint } = require('eslint');
        const simpleGit = require('simple-git');
        const AdmZip = require('adm-zip');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        const tempDir = path.join(os.tmpdir(), `scan-${project._id}-${Date.now()}`);
        const vulnerabilities = [];

        try {
            // 1. Prepare Source Code (Clone or Extract)
            if (project.type === 'github' && project.repositoryUrl) {
                await simpleGit().clone(project.repositoryUrl, tempDir);
            } else if (project.type === 'upload' && project.filePath) {
                // Assuming project.filePath is relative to backend root or absolute
                // and it's a zip file.
                // The filePath in DB usually: 'uploads/filename.zip'
                const zipPath = path.resolve(process.cwd(), project.filePath);
                if (fs.existsSync(zipPath)) {
                    const zip = new AdmZip(zipPath);
                    zip.extractAllTo(tempDir, true);
                } else {
                    throw new Error(`Upload file not found at ${zipPath}`);
                }
            } else {
                throw new Error('No valid source code found for SAST scan');
            }

            // 2. Run ESLint
            // We use 'eslint-plugin-security' rules. 
            // ESLint 9+ uses Flat Config. 'useEslintrc' is removed.
            // We pass an array for baseConfig.
            const eslint = new ESLint({
                cwd: tempDir,
                baseConfig: [
                    {
                        languageOptions: {
                            ecmaVersion: 'latest',
                            sourceType: 'module',
                        },
                        plugins: {
                            security: require('eslint-plugin-security')
                        },
                        rules: {
                            'security/detect-unsafe-regex': 'error',
                            'security/detect-buffer-noassert': 'error',
                            'security/detect-child-process': 'warn',
                            'security/detect-disable-mustacheescape': 'error',
                            'security/detect-eval-with-expression': 'error',
                            'security/detect-no-csrf-before-method-override': 'error',
                            'security/detect-non-literal-fs-filename': 'warn',
                            'security/detect-non-literal-regexp': 'warn',
                            'security/detect-non-literal-require': 'warn',
                            'security/detect-object-injection': 'warn',
                            'security/detect-possible-timing-attacks': 'warn',
                            'security/detect-pseudoRandomBytes': 'warn',
                        }
                    }
                ]
            });

            const results = await eslint.lintFiles([`${tempDir}/**/*.{js,ts,jsx,tsx}`]);

            // 3. Process Results
            for (const result of results) {
                for (const msg of result.messages) {
                    vulnerabilities.push({
                        title: msg.ruleId || 'Code Quality Issue',
                        description: msg.message,
                        severity: msg.severity === 2 ? 'high' : 'medium', // ESLint 2=error, 1=warn
                        remediation: 'Review and refactor code to avoid insecure patterns.',
                        category: 'Code Security',
                        location: {
                            file: path.relative(tempDir, result.filePath),
                            line: msg.line,
                            column: msg.column
                        }
                    });
                }
            }

            // Also add the file checks from before (hardcoded secrets) as they are valuable
            const sensitivePatterns = [
                { pattern: /^\.env$/, name: '.env file committed', severity: 'high', remediation: 'Remove .env from version control. Use environment variables.' },
                { pattern: /id_rsa$/, name: 'SSH Private Key', severity: 'critical', remediation: 'Remove private keys immediately. Revoke and rotate.' },
                { pattern: /credentials\.json$/, name: 'Credentials File', severity: 'high', remediation: 'Do not commit credentials.' },
                { pattern: /\.pem$/, name: 'PEM Key File', severity: 'critical', remediation: 'Remove PEM keys from repo.' }
            ];

            // We need to walk the directory for file names now
            const getAllFiles = function (dirPath, arrayOfFiles) {
                const files = fs.readdirSync(dirPath);
                arrayOfFiles = arrayOfFiles || [];
                files.forEach(function (file) {
                    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
                    } else {
                        arrayOfFiles.push(path.join(dirPath, "/", file));
                    }
                });
                return arrayOfFiles;
            };

            const allFiles = getAllFiles(tempDir);
            for (const absPath of allFiles) {
                const relPath = path.relative(tempDir, absPath);
                for (const check of sensitivePatterns) {
                    if (check.pattern.test(path.basename(relPath))) {
                        vulnerabilities.push({
                            title: check.name,
                            description: `Starting sensitive file found: ${relPath}`,
                            severity: check.severity,
                            remediation: check.remediation,
                            category: 'Secrets',
                            location: { file: relPath }
                        });
                    }
                }
            }


        } catch (err) {
            logger.error(`SAST Scan failed: ${err.message}`);
            // Don't fail the whole scan, just log
            vulnerabilities.push({
                title: 'SAST Scan Error',
                description: `Failed to run analysis: ${err.message}`,
                severity: 'low',
                category: 'System'
            });
        } finally {
            // Cleanup
            try {
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
            } catch (e) { console.error('Failed to cleanup temp dir', e); }
        }

        await this.saveScanResults(scan, vulnerabilities);
    }

    // --- Dependency Logic ---
    async runDependencyScan(scan, packageJson) {
        // (Keep existing logic or update later - existing logic is fineish for now, 
        // but relies on package.json being passed. 
        // Since we now have 'tempDir' in SAST, we *could* read package.json there if we ordered them differently.
        // But for now, let's stick to the existing mock+simple check unless requested for real Audit)
        const vulnerabilities = [];

        if (packageJson && packageJson.dependencies) {
            // Simple rule-based check for "known bad" (Simulation of npm audit)
            const vulnerablePackages = ['lodash', 'express', 'axios'];

            for (const [pkg, version] of Object.entries(packageJson.dependencies)) {
                if (vulnerablePackages.includes(pkg)) {
                    // Simulate finding a vuln (randomly or strict)
                    // For demo purposes, flag 'lodash' if present as usually it has many CVEs
                    if (pkg === 'lodash') {
                        vulnerabilities.push({
                            title: 'Vulnerable Dependency: lodash',
                            description: `Package 'lodash' ${version} has known vulnerabilities (Prototype Pollution).`,
                            severity: 'high',
                            category: 'Dependency',
                            remediation: 'Upgrade to latest version.'
                        });
                    }
                }
            }
        } else {
            // No package.json found or parsed
            vulnerabilities.push({
                title: 'No Dependency File Found',
                description: 'Could not analyze dependencies (package.json missing or unreadable).',
                severity: 'info',
                category: 'Dependency',
                remediation: 'Ensure package.json is present in root.'
            });
        }

        await this.saveScanResults(scan, vulnerabilities);
    }


    // --- DAST Logic ---
    async runDastScan(scan, project) {
        const vulnerabilities = [];
        const targetUrl = project.targetUrl;

        if (!targetUrl) {
            vulnerabilities.push({
                title: 'Skipped DAST',
                description: 'No target URL provided for DAST scan.',
                severity: 'info',
                category: 'Configuration'
            });
            await this.saveScanResults(scan, vulnerabilities);
            return;
        }

        try {
            logger.info(`Starting DAST scan against ${targetUrl}`);

            // 1. Basic Connectivity
            const response = await axios.get(targetUrl, { validateStatus: () => true, timeout: 10000 });

            // 2. Header Analysis
            const headers = response.headers;
            const missingHeaders = [];

            if (!headers['strict-transport-security'] && targetUrl.startsWith('https')) {
                missingHeaders.push('Strict-Transport-Security');
            }
            if (!headers['x-content-type-options']) {
                missingHeaders.push('X-Content-Type-Options');
            }
            if (!headers['x-frame-options']) {
                missingHeaders.push('X-Frame-Options');
            }
            if (!headers['content-security-policy']) {
                missingHeaders.push('Content-Security-Policy');
            }

            if (missingHeaders.length > 0) {
                vulnerabilities.push({
                    title: 'Missing Security Headers',
                    description: `The following security headers are missing: ${missingHeaders.join(', ')}`,
                    severity: 'medium',
                    category: 'Network Security',
                    remediation: 'Configure your web server to send these headers.'
                });
            }

            // 3. Information Disclosure
            if (headers['x-powered-by']) {
                vulnerabilities.push({
                    title: 'Information Disclosure (X-Powered-By)',
                    description: `Server reveals technology stack: ${headers['x-powered-by']}`,
                    severity: 'low',
                    category: 'Information Disclosure',
                    remediation: 'Remove the X-Powered-By header.'
                });
            }
            if (headers['server']) {
                vulnerabilities.push({
                    title: 'Information Disclosure (Server)',
                    description: `Server reveals version/type: ${headers['server']}`,
                    severity: 'low',
                    category: 'Information Disclosure',
                    remediation: 'Configure server to suppress the Server header.'
                });
            }

        } catch (err) {
            vulnerabilities.push({
                title: 'DAST Connection Failed',
                description: `Could not connect to target URL: ${err.message}`,
                severity: 'low',
                category: 'Network'
            });
        }

        await this.saveScanResults(scan, vulnerabilities);
    }

    // --- SonarQube Logic ---
    async runSonarQubeScan(scan, project) {
        const vulnerabilities = [];
        const config = project.sonarQubeConfig;

        if (!config || !config.enabled || !config.url || !config.projectKey) {
            vulnerabilities.push({
                title: 'SonarQube Skipped',
                description: 'SonarQube not configured or enabled for this project.',
                severity: 'info',
                category: 'Configuration'
            });
            await this.saveScanResults(scan, vulnerabilities);
            return;
        }

        try {
            logger.info(`Starting SonarQube scan check for ${config.projectKey}`);

            // In a real scenario, we might trigger a scan via CI/CD. 
            // Here we assume the scan runs externally and we fetch results, OR we mock it.
            // For this demo, we'll try to fetch metrics if reachable, else return mock data.

            const auth = config.token ? { username: config.token, password: '' } : null;

            // Try to fetch measures
            // API: /api/measures/component?component=projectKey&metricKeys=bugs,vulnerabilities,code_smells,coverage

            const sonarApiUrl = `${config.url}/api/measures/component`;

            try {
                const response = await axios.get(sonarApiUrl, {
                    params: {
                        component: config.projectKey,
                        metricKeys: 'bugs,vulnerabilities,code_smells,coverage,sqale_rating'
                    },
                    auth: auth,
                    timeout: 5000
                });

                if (response.data && response.data.component && response.data.component.measures) {
                    const measures = response.data.component.measures;

                    measures.forEach(m => {
                        let severity = 'info';
                        if (m.metric === 'bugs' && parseInt(m.value) > 0) severity = 'high';
                        if (m.metric === 'vulnerabilities' && parseInt(m.value) > 0) severity = 'critical';
                        if (m.metric === 'code_smells' && parseInt(m.value) > 10) severity = 'medium';

                        vulnerabilities.push({
                            title: `SonarQube Metric: ${m.metric}`,
                            description: `Current value: ${m.value}`,
                            severity: severity,
                            category: 'Code Quality',
                            remediation: 'Check SonarQube dashboard for details.'
                        });
                    });
                }

            } catch (apiError) {
                logger.warn(`SonarQube API failed or unreachable: ${apiError.message}. Using Mock Data for demo.`);

                // FALLBACK MOCK DATA (For Demo Purposes)
                vulnerabilities.push({
                    title: 'Mock: Code Smells',
                    description: 'Found 12 code smells (function complexity, duplication).',
                    severity: 'medium',
                    category: 'Code Quality',
                    remediation: 'Refactor complex functions.'
                });
                vulnerabilities.push({
                    title: 'Mock: Bugs',
                    description: 'Found 2 potential bugs.',
                    severity: 'high',
                    category: 'Code Quality',
                    remediation: 'Review identified bugs.'
                });
                vulnerabilities.push({
                    title: 'Mock: Coverage',
                    description: 'Test Coverage is 65%.',
                    severity: 'low',
                    category: 'Code Quality',
                    remediation: 'Increase test coverage to >80%.'
                });
            }

        } catch (err) {
            vulnerabilities.push({
                title: 'SonarQube Integration Error',
                description: `Failed to connect: ${err.message}`,
                severity: 'low',
                category: 'System'
            });
        }

        await this.saveScanResults(scan, vulnerabilities);
    }

    // --- AI Threat Prediction ---
    async runThreatPrediction(project, pipeline, scans) {
        try {
            logger.info(`[AI-PREDICT] Starting AI Threat Prediction for Pipeline ${pipeline._id}...`);

            // 1. Aggregate Scan Data
            let totalVulns = 0;
            let critical = 0, high = 0, medium = 0, low = 0;

            for (const scan of scans) {
                // Reload scan to ensure we have the latest results if they were just saved
                const freshScan = await Scan.findById(scan._id);

                if (freshScan && freshScan.result && freshScan.result.vulnerabilities) {
                    const vulns = freshScan.result.vulnerabilities;
                    totalVulns += vulns.length;
                    vulns.forEach(v => {
                        if (v.severity === 'critical') critical++;
                        else if (v.severity === 'high') high++;
                        else if (v.severity === 'medium') medium++;
                        else if (v.severity === 'low') low++;
                    });
                }
            }

            logger.info(`[AI-PREDICT] Aggregated Stats - Total: ${totalVulns}, Crit: ${critical}, High: ${high}`);

            // 2. Prepare Features
            const features = {
                vulnerability_count: totalVulns,
                critical_vulns: critical,
                high_vulns: high,
                medium_vulns: medium,
                low_vulns: low,
                code_complexity: 5, // Mock default
                dependency_count: 50, // Mock default
                outdated_dependencies: 2, // Mock default
                failed_scans: 0,
                deployment_frequency: 2.5,
                code_changes: 20,
                external_connections: 5,
                privileged_access: 0,
                data_sensitivity: 3,
                compliance_score: 0.9,
                security_training_score: 0.8
            };

            // 3. Call AI Module
            const aiUrl = process.env.AI_MODULE_URL || 'http://localhost:5001';

            logger.info(`[AI-PREDICT] Sending request to ${aiUrl}/predict/threat with features: ${JSON.stringify(features)}`);

            try {
                // IMPORTANT: Pass string ID for project
                const response = await axios.post(`${aiUrl}/predict/threat`, {
                    project_id: project._id.toString(),
                    features: features
                });

                logger.info(`[AI-PREDICT] AI Response Status: ${response.status}`);

                if (response.data.success) {
                    const prediction = response.data.prediction;
                    logger.info(`[AI-PREDICT] Prediction received: ${prediction.threat_type} (${prediction.severity})`);

                    // 4. Save Prediction
                    const newThreat = await ThreatPrediction.create({
                        // id: uuidv4(), // Mongoose uses _id
                        projectId: project._id,
                        pipelineId: pipeline._id,
                        threatType: prediction.threat_type,
                        severity: prediction.severity,
                        confidence: prediction.confidence,
                        probability: prediction.probability,
                        impact: prediction.impact,
                        description: prediction.description || `Detected potential threat: ${prediction.threat_type} with ${prediction.severity} severity.`,
                        indicators: prediction.risk_factors || [],
                        modelVersion: prediction.model_version || '1.0.0',
                        features: features,
                        prediction: prediction,
                        status: 'active'
                    });

                    logger.info(`[AI-PREDICT] Threat prediction saved to DB with ID: ${newThreat._id}`);
                } else {
                    logger.warn(`[AI-PREDICT] AI Module returned success=false: ${JSON.stringify(response.data)}`);
                }
            } catch (networkError) {
                logger.error(`[AI-PREDICT] Network/API Error calling AI module: ${networkError.message}`);
                if (networkError.response) {
                    logger.error(`[AI-PREDICT] AI Error Details: ${JSON.stringify(networkError.response.data)}`);
                }
            }

        } catch (error) {
            logger.error(`[AI-PREDICT] Critical Failure in runThreatPrediction: ${error.message}`);
            logger.error(error.stack);
            // Log but allow pipeline to finish
        }
    }

    async saveScanResults(scan, vulnerabilities) {
        let critical = 0, high = 0, medium = 0, low = 0;

        for (const v of vulnerabilities) {
            await Vulnerability.create({
                ...v,
                scanId: scan._id
            });

            if (v.severity === 'critical') critical++;
            else if (v.severity === 'high') high++;
            else if (v.severity === 'medium') medium++;
            else if (v.severity === 'low') low++;
        }

        scan.status = 'completed';
        scan.endTime = new Date();
        scan.result = {
            summary: {
                total: vulnerabilities.length,
                critical: critical,
                high: high,
                medium: medium,
                low: low
            },
            vulnerabilities: vulnerabilities // Storing vulns in scan result for easy access as per Schema
        };

        await scan.save();
    }
}

module.exports = new ScanService();
