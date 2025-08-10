# CLAUDE-activeContext.md

## Current Session State - DEV RESET ✅

**Date**: 2025-08-02  
**Branch**: dev (reset to main)  
**Session Goal**: Branch reset and environment stabilization  
**Status**: Dev branch successfully reset to main state

## Recent Major Action - Dev Branch Reset

### 🔄 Branch Reset Operation - COMPLETED
- **Action**: Reset dev branch to match main branch exactly
- **Reason**: Recent experimental changes weren't working and needed clean slate
- **Method**: Used `git reset --hard origin/main` + `git clean -fd`
- **Result**: Dev environment restored to stable main branch state
- **Files Removed**: All experimental analysis enhancements, visual analysis features, and related migrations

### 🧹 Cleanup Summary
- **Database Migrations**: Removed migrations 0013-0016 (experimental features)
- **API Routes**: Removed performance/, vision/, debug/ experimental endpoints
- **Components**: Removed experimental analysis components and dialogs
- **Libraries**: Removed experimental vectorization and analysis engines
- **Working Tree**: Now clean and matches main branch exactly

## Current Project Status

### ✅ Completed Core Features
- **Authentication**: BetterAuth with email OTP - fully implemented and stable
- **Onboarding**: Complete flow with plan selection and domain setup
- **Subscription Management**: Polar integration with Pro/Premium tiers and domain limits
- **Website Analysis**: AI-powered scanning with Anthropic Claude integration
- **Report System**: Full CRUD with archiving, restoration, and retrigger capabilities
- **User Management**: Profile forms, avatar uploads, domain ownership validation
- **Support Integration**: Linear SDK for automated ticket creation
- **Feature Gating**: Subscription-based access control system
- **Security Infrastructure**: Enterprise-grade security hardening (CON-16) ✅
- **Edge Runtime Compatibility**: Optimized middleware performance (CON-18) ✅

### 🎯 Production Ready Status
- **Security**: Enterprise-grade hardening with automated audit capabilities
- **Performance**: Optimized Edge Runtime compatibility with 92% bundle reduction
- **Build**: All builds successful without runtime warnings
- **Tests**: Comprehensive test coverage for security features
- **Deployment**: PR #41 ready for merge to main branch

### 📋 Current State
Working tree is clean after reset:
- All files now match main branch exactly
- No pending changes or uncommitted work
- Dev branch is ready for new development
- All experimental features cleanly removed

## Technical Architecture Status

### Implemented Stack
- **Frontend**: Next.js 15.4.1 with App Router ✅
- **Backend**: tRPC for type-safe APIs ✅
- **Database**: PostgreSQL with Drizzle ORM ✅
- **Auth**: BetterAuth with email OTP ✅
- **Payments**: Polar integration ✅
- **Email**: Resend with convertiq.cloud domain ✅
- **AI**: Anthropic Claude via Vercel AI SDK v5 ✅
- **Support**: Linear SDK integration ✅
- **Package Manager**: Bun v1.2.14 ✅

### Key Configuration Notes
- BetterAuth email OTP configuration is stable and should not be modified
- Domain validation system enforces Pro plan requirements
- Feature gating system controls access based on subscription tiers
- Report archiving uses soft-delete pattern for data preservation

## Next Development Priorities
1. **Stable Feature Development** - Build on proven foundation from main
2. **Integration Capabilities** - GA4 and e-commerce platform APIs (planned)
3. **Performance Optimization** - Caching layer with Redis (planned)
4. **Learning Resources** - Knowledge base and tutorials (planned)
5. **Analytics Enhancement** - Advanced tracking and metrics (planned)

## Development Guidelines
- Use `bun run dev` for development with Turbopack
- Database changes require migration generation (`bun run db:generate`)
- All AI features use Vercel AI SDK v5 with Anthropic provider
- Profile uploads stored in `public/uploads/avatars/`
- Support tickets automatically create Linear issues with session context