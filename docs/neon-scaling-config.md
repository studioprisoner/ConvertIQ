# Neon Database Scaling Configuration

## Production Scaling Settings

### Current Configuration
- **Database**: ep-blue-bird-a7bikuy7-pooler.ap-southeast-2.aws.neon.tech
- **Region**: Asia Pacific (Sydney)
- **Plan**: Scale Plan (recommended for production)

### Compute Scaling Settings

#### Recommended Production Configuration:
```yaml
Base Compute: 0.25 CU
  - 1/4 vCPU + 1GB RAM
  - Always-on minimum resources
  - Cost: ~$3/month baseline

Max Compute: 2 CU
  - 2 vCPU + 8GB RAM  
  - Handles traffic spikes and AI processing
  - Cost: ~$24/month at peak utilization

Autoscaling: Enabled
  - Scales automatically based on:
    * CPU utilization (>70% triggers scale up)
    * Memory pressure (>80% triggers scale up)
    * Active connections (>15 triggers scale up)
    * Query complexity (heavy AI operations)

Autosuspend: 5 minutes
  - Suspends compute after 5 minutes of inactivity
  - Instant resume on first query (< 1 second)
  - Saves ~90% on compute costs during idle periods
```

## ConvertIQ-Specific Scaling Triggers

### High Load Scenarios:
1. **AI Analysis Processing**
   - Multiple simultaneous website scans
   - Vector embedding generation
   - Large text processing

2. **Database Operations**
   - Vector similarity searches
   - Complex report queries
   - User onboarding spikes

3. **Traffic Spikes**
   - Marketing campaigns
   - Product launches
   - High user registration periods

### Scaling Response Times:
- **Scale Up**: 5-15 seconds
- **Scale Down**: 2-5 minutes (gradual)
- **Suspend**: 5 minutes after last activity
- **Resume**: < 1 second from suspend

## Cost Optimization

### Monthly Cost Estimates:
```
Low Usage (mostly idle):
- Base: 0.25 CU × 730 hours = $3.50/month
- Storage: 1GB = $0.50/month
- Total: ~$4/month

Medium Usage (4 hours/day active):
- Base: 0.25 CU × 610 hours = $2.90/month
- Active: 1 CU × 120 hours = $7.20/month
- Storage: 5GB = $2.50/month
- Total: ~$12.60/month

High Usage (peak times):
- Base: 0.25 CU × 400 hours = $1.90/month
- Peak: 2 CU × 330 hours = $39.60/month
- Storage: 10GB = $5.00/month
- Total: ~$46.50/month
```

## Monitoring and Alerts

### Key Metrics to Monitor:
1. **Compute Utilization**
   - CPU usage percentage
   - Memory consumption
   - Scale events frequency

2. **Performance Metrics**
   - Query response times
   - Connection pool usage
   - Vector search latency

3. **Cost Metrics**
   - Compute hours consumed
   - Storage growth
   - Data transfer costs

### Setting Up Alerts:
1. Go to Neon Console → Monitoring
2. Configure alerts for:
   - CPU > 80% for 5+ minutes
   - Memory > 90% for 2+ minutes
   - Unusual scaling frequency
   - Cost thresholds exceeded

## Best Practices

### 1. Gradual Scaling
- Start with 0.25-1 CU base
- Monitor usage patterns for 1-2 weeks
- Adjust max compute based on actual needs

### 2. Cost Management
- Use autosuspend for development/staging
- Monitor daily costs in console
- Set up billing alerts

### 3. Performance Optimization
- Optimize queries before scaling hardware
- Use connection pooling efficiently
- Index frequently queried columns

### 4. Emergency Scaling
- Keep max compute at reasonable level
- Monitor for scale-up storms
- Have manual override procedures

## Implementation Checklist

- [ ] Set base compute to 0.25 CU
- [ ] Set max compute to 2 CU
- [ ] Enable autoscaling
- [ ] Configure 5-minute autosuspend
- [ ] Set up monitoring alerts
- [ ] Test scaling under load
- [ ] Monitor costs for first week
- [ ] Adjust settings based on usage patterns