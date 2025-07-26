#!/usr/bin/env bun

/**
 * Security Audit Script for ConvertIQ
 * 
 * This script performs comprehensive security checks:
 * - Dependency vulnerability scanning
 * - Environment variable validation
 * - Security header verification
 * - Code pattern analysis
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateEnv, redactEnvForLogs } from '../src/lib/env-validation';

interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'dependencies' | 'environment' | 'headers' | 'code' | 'configuration';
  description: string;
  recommendation: string;
  file?: string;
}

class SecurityAuditor {
  private issues: SecurityIssue[] = [];

  private addIssue(issue: SecurityIssue) {
    this.issues.push(issue);
  }

  private async checkDependencies() {
    console.log('🔍 Checking for dependency vulnerabilities...');
    
    try {
      // Check for known vulnerabilities
      const auditOutput = execSync('bun audit --json', { encoding: 'utf8' });
      const auditData = JSON.parse(auditOutput);
      
      if (auditData.vulnerabilities && Object.keys(auditData.vulnerabilities).length > 0) {
        for (const [packageName, vulns] of Object.entries(auditData.vulnerabilities)) {
          const vulnArray = vulns as any[];
          vulnArray.forEach((vuln: any) => {
            let severity: SecurityIssue['type'] = 'medium';
            if (vuln.severity === 'critical') severity = 'critical';
            else if (vuln.severity === 'high') severity = 'high';
            else if (vuln.severity === 'low') severity = 'low';

            this.addIssue({
              type: severity,
              category: 'dependencies',
              description: `Vulnerability in ${packageName}: ${vuln.title}`,
              recommendation: `Update ${packageName} to version ${vuln.patched_versions || 'latest'}`,
            });
          });
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not run bun audit:', error);
      this.addIssue({
        type: 'medium',
        category: 'dependencies',
        description: 'Unable to check for dependency vulnerabilities',
        recommendation: 'Run "bun audit" manually to check for vulnerabilities',
      });
    }
  }

  private async checkEnvironment() {
    console.log('🔍 Validating environment configuration...');
    
    try {
      const env = validateEnv();
      
      // Check for weak configurations
      if (env.NODE_ENV === 'production') {
        if (env.BETTER_AUTH_SECRET.length < 64) {
          this.addIssue({
            type: 'medium',
            category: 'environment',
            description: 'Auth secret is shorter than recommended 64 characters',
            recommendation: 'Generate a longer auth secret (64+ characters) for better security',
          });
        }

        if (!env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
          this.addIssue({
            type: 'critical',
            category: 'environment',
            description: 'App URL does not use HTTPS in production',
            recommendation: 'Ensure NEXT_PUBLIC_APP_URL uses HTTPS in production',
          });
        }
      }

      // Check for exposed sensitive data in logs
      const redacted = redactEnvForLogs(process.env);
      console.log('✅ Environment validation passed');
      console.log('📊 Environment variables (redacted):', redacted);

    } catch (error) {
      this.addIssue({
        type: 'critical',
        category: 'environment',
        description: `Environment validation failed: ${error}`,
        recommendation: 'Fix environment variable configuration before deployment',
      });
    }
  }

  private async checkSecurityHeaders() {
    console.log('🔍 Checking security headers configuration...');
    
    const vercelConfigPath = join(process.cwd(), 'vercel.json');
    if (existsSync(vercelConfigPath)) {
      try {
        const vercelConfig = JSON.parse(readFileSync(vercelConfigPath, 'utf8'));
        const headers = vercelConfig.headers || [];
        
        const globalHeaders = headers.find((h: any) => h.source === '/(.*)')?.headers || [];
        const headerNames = globalHeaders.map((h: any) => h.key);

        const requiredHeaders = [
          'Strict-Transport-Security',
          'Content-Security-Policy',
          'X-Frame-Options',
          'X-Content-Type-Options',
          'Referrer-Policy'
        ];

        for (const required of requiredHeaders) {
          if (!headerNames.includes(required)) {
            this.addIssue({
              type: 'high',
              category: 'headers',
              description: `Missing security header: ${required}`,
              recommendation: `Add ${required} header to vercel.json`,
              file: 'vercel.json',
            });
          }
        }

        // Check CSP header quality
        const cspHeader = globalHeaders.find((h: any) => h.key === 'Content-Security-Policy');
        if (cspHeader) {
          const cspValue = cspHeader.value;
          
          if (cspValue.includes("'unsafe-eval'")) {
            this.addIssue({
              type: 'medium',
              category: 'headers',
              description: 'CSP allows unsafe-eval',
              recommendation: 'Remove unsafe-eval from CSP if possible for better security',
              file: 'vercel.json',
            });
          }

          if (cspValue.includes("'unsafe-inline'")) {
            this.addIssue({
              type: 'medium',
              category: 'headers',
              description: 'CSP allows unsafe-inline',
              recommendation: 'Use nonces or hashes instead of unsafe-inline where possible',
              file: 'vercel.json',
            });
          }
        }

      } catch (error) {
        this.addIssue({
          type: 'medium',
          category: 'configuration',
          description: 'Could not parse vercel.json for security header validation',
          recommendation: 'Ensure vercel.json is valid JSON',
          file: 'vercel.json',
        });
      }
    } else {
      this.addIssue({
        type: 'high',
        category: 'headers',
        description: 'No vercel.json found for security header configuration',
        recommendation: 'Create vercel.json with proper security headers',
      });
    }
  }

  private async checkCodePatterns() {
    console.log('🔍 Scanning for security anti-patterns...');
    
    try {
      // Check for console.log with sensitive data patterns
      const grepResult = execSync(
        'find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "console.log.*password\\|console.log.*secret\\|console.log.*token\\|console.log.*key" || true',
        { encoding: 'utf8' }
      );

      if (grepResult.trim()) {
        this.addIssue({
          type: 'high',
          category: 'code',
          description: 'Potential sensitive data logging found',
          recommendation: 'Remove or redact sensitive data from console.log statements',
        });
      }

      // Check for SQL injection patterns
      const sqlResult = execSync(
        'find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "\\${.*}.*sql\\|\\`.*\\${.*}.*\\`" || true',
        { encoding: 'utf8' }
      );

      if (sqlResult.trim()) {
        this.addIssue({
          type: 'critical',
          category: 'code',
          description: 'Potential SQL injection vulnerability found',
          recommendation: 'Use parameterized queries instead of string interpolation',
        });
      }

    } catch (error) {
      console.warn('⚠️  Could not perform code pattern analysis:', error);
    }
  }

  private async checkFilePermissions() {
    console.log('🔍 Checking sensitive file permissions...');
    
    const sensitiveFiles = ['.env', '.env.local', '.env.production'];
    
    for (const file of sensitiveFiles) {
      if (existsSync(file)) {
        try {
          const stats = execSync(`ls -la ${file}`, { encoding: 'utf8' });
          if (!stats.includes('-rw-------') && !stats.includes('-rw-r-----')) {
            this.addIssue({
              type: 'medium',
              category: 'configuration',
              description: `File ${file} has overly permissive permissions`,
              recommendation: `Set restrictive permissions: chmod 600 ${file}`,
              file,
            });
          }
        } catch (error) {
          // File might not exist or permission denied
        }
      }
    }
  }

  public async runAudit(): Promise<SecurityIssue[]> {
    console.log('🚀 Starting security audit...\n');

    await this.checkDependencies();
    await this.checkEnvironment();
    await this.checkSecurityHeaders();
    await this.checkCodePatterns();
    await this.checkFilePermissions();

    return this.issues;
  }

  public generateReport(issues: SecurityIssue[]): string {
    const critical = issues.filter(i => i.type === 'critical').length;
    const high = issues.filter(i => i.type === 'high').length;
    const medium = issues.filter(i => i.type === 'medium').length;
    const low = issues.filter(i => i.type === 'low').length;

    let report = `
🔒 CONVERTIQ SECURITY AUDIT REPORT
==================================

📊 SUMMARY:
- Critical Issues: ${critical}
- High Priority: ${high}
- Medium Priority: ${medium}
- Low Priority: ${low}
- Total Issues: ${issues.length}

`;

    if (issues.length === 0) {
      report += '✅ No security issues found!\n';
      return report;
    }

    const groupedIssues = issues.reduce((acc, issue) => {
      if (!acc[issue.category]) acc[issue.category] = [];
      acc[issue.category].push(issue);
      return acc;
    }, {} as Record<string, SecurityIssue[]>);

    for (const [category, categoryIssues] of Object.entries(groupedIssues)) {
      report += `\n📁 ${category.toUpperCase()}:\n`;
      report += '─'.repeat(40) + '\n';

      categoryIssues.forEach((issue, index) => {
        const icon = {
          critical: '🚨',
          high: '⚠️',
          medium: '⚡',
          low: '💡',
          info: 'ℹ️'
        }[issue.type];

        report += `\n${index + 1}. ${icon} [${issue.type.toUpperCase()}] ${issue.description}\n`;
        report += `   💡 Recommendation: ${issue.recommendation}\n`;
        if (issue.file) {
          report += `   📄 File: ${issue.file}\n`;
        }
      });
    }

    report += '\n\n🎯 NEXT STEPS:\n';
    report += '1. Address all critical and high priority issues immediately\n';
    report += '2. Plan fixes for medium priority issues\n';
    report += '3. Schedule regular security audits (weekly/monthly)\n';
    report += '4. Consider automated security scanning in CI/CD\n';

    return report;
  }
}

// Main execution
async function main() {
  const auditor = new SecurityAuditor();
  
  try {
    const issues = await auditor.runAudit();
    const report = auditor.generateReport(issues);
    
    console.log(report);
    
    // Exit with error code if critical issues found
    const criticalIssues = issues.filter(i => i.type === 'critical').length;
    if (criticalIssues > 0) {
      console.error(`\n❌ Found ${criticalIssues} critical security issues. Fix before deployment!`);
      process.exit(1);
    }
    
    const highIssues = issues.filter(i => i.type === 'high').length;
    if (highIssues > 0) {
      console.warn(`\n⚠️  Found ${highIssues} high priority security issues. Address soon!`);
      process.exit(1);
    }
    
    console.log('\n✅ Security audit completed successfully!');
    
  } catch (error) {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}