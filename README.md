# ConvertIQ

ConvertIQ is a SaaS platform that empowers small businesses to improve their website marketing and sales conversions independently. We provide accessible, data-driven analysis and actionable recommendations that were traditionally only available through expensive agencies.

## Overview

ConvertIQ analyzes existing ecommerce platforms or specific product/service pages to identify optimization opportunities. Our AI-powered analysis focuses on conversion psychology, UX/UI improvements, technical SEO, and performance optimization to help businesses increase their revenue.

### Target Audience

- **Local service businesses** (plumbers, electricians, beauty salons, consultants)
- **Creative businesses** (photographers, graphic designers, content creators, artists)  
- **E-commerce stores** (businesses selling physical or digital products online)

### Key Features

- **Website Audit & Analysis** - Comprehensive scanning of URLs for optimization opportunities
- **AI-Powered Recommendations** - Prioritized suggestions based on conversion psychology principles
- **Performance Benchmarking** - Compare against industry standards and track improvements
- **Integration Support** - Connect with Google Analytics, Shopify, WooCommerce, and more
- **Actionable Reports** - Step-by-step guidance for implementing improvements

## Tech Stack

- **Framework**: Next.js 15.4.1 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 (alpha)
- **Package Manager**: Bun
- **AI Integration**: Vercel AI SDK v5 with Anthropic Claude and OpenAI support
- **Planned**: tRPC, PostgreSQL, Redis, BetterAuth, Vercel hosting

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.2.14 or higher
- Node.js 18+ 
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/convertiq.git
cd convertiq
```

2. Install dependencies:
```bash
bun install
```

3. Run the development server:
```bash
bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The development server uses Turbopack for faster builds and hot reloading. You can start editing pages by modifying files in `src/app/` - changes will be reflected immediately.

### Available Scripts

```bash
# Start development server with Turbopack
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Run ESLint
bun run lint
```

## Project Structure

```
convertiq/
├── src/
│   └── app/          # Next.js App Router pages and layouts
├── _product/         # Product documentation (git-ignored)
├── CLAUDE.md         # AI development guidance
└── package.json
```

## Development

This project uses:
- **Next.js App Router** for routing and server components
- **TypeScript** with strict mode for type safety
- **Tailwind CSS v4** for styling
- **Bun** as the package manager and runtime
- **Vercel AI SDK v5** for AI integrations

## Polar Sandbox Configuration

ConvertIQ integrates with Polar for payment processing and subscription management. For development and testing, we use Polar's sandbox environment to safely test payment flows without affecting production systems.

### Current Configuration

- **Environment**: Sandbox mode (configured via `POLAR_ENVIRONMENT=sandbox`)
- **Database**: Pre-seeded with sandbox-specific price IDs
- **Testing**: Mock mode enabled for immediate testing without Polar account setup

### Testing Options

#### Option 1: Mock Mode (Default - No Setup Required)

The system automatically uses mock mode when sandbox price IDs don't exist in Polar:

- ✅ **Immediate testing** - Works out of the box for UI/UX development
- ✅ **No Polar account needed** - Perfect for frontend development
- ✅ **Full functionality** - Complete pricing page and subscription flow testing

**Test the pricing page**: Visit `http://localhost:3000/pricing` after running `bun run dev`

#### Option 2: Real Polar Sandbox (Full Integration Testing)

For complete payment integration testing:

1. **Create Sandbox Account**:
   - Visit [Polar Sandbox](https://sandbox.polar.sh/)
   - Create an account and organization

2. **Create Products & Prices**:
   ```
   Basic Plan:
   - Monthly: $19.00 (price ID: price_sandbox_basic_monthly)
   - Annual: $190.00 (price ID: price_sandbox_basic_annual)
   
   Pro Plan:  
   - Monthly: $49.00 (price ID: price_sandbox_pro_monthly)
   - Annual: $490.00 (price ID: price_sandbox_pro_annual)
   ```

3. **Configure Environment**:
   ```bash
   # Add to .env.local
   POLAR_ACCESS_TOKEN=your_sandbox_token
   POLAR_ENVIRONMENT=sandbox
   ```

4. **Re-seed Database**:
   ```bash
   bun run src/lib/reseed-plans.ts
   ```

### Database Commands

```bash
# Generate new migration
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Push schema changes directly (development)
bun run db:push --force

# Open database studio
bun run db:studio
```

### Testing Scenarios

The system supports comprehensive testing:

- **Plan Selection**: Both Basic and Pro plans with monthly/annual billing
- **Authentication Flow**: Redirects to login when not authenticated
- **Error Handling**: Clear error messages and loading states
- **Responsive Design**: Mobile and desktop compatibility
- **Mock Subscriptions**: 14-day trial simulation in mock mode

### Production Deployment

When ready for production:

1. Set `POLAR_ENVIRONMENT=production`
2. Use production Polar credentials
3. Create real products/prices in production Polar
4. Update price IDs in seed data
5. Test thoroughly in staging environment first

### Troubleshooting

- Check browser console for detailed environment logs
- Use `/api/test-subscription` endpoint for debugging
- All errors include specific details for easier debugging
- Environment indicators show whether you're in sandbox or production mode

## Contributing

We welcome contributions! Please see our contributing guidelines and development setup:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test thoroughly
4. Submit a pull request with a clear description

## Roadmap

### Phase 1 (MVP)
- [ ] User authentication and account management
- [ ] Single URL analysis and basic reporting
- [ ] Core AI-powered recommendations
- [ ] Basic task tracking for recommendations

### Phase 2
- [ ] Google Analytics integration
- [ ] E-commerce platform integrations (Shopify, WooCommerce)
- [ ] Historical performance tracking
- [ ] Advanced competitor analysis

### Phase 3
- [ ] Multi-site management
- [ ] White-label solutions
- [ ] Advanced integrations (CRM, email marketing)
- [ ] API access for third-party developers

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs/v4-alpha)
- [Bun Documentation](https://bun.sh/docs)

## License

This project is proprietary software. All rights reserved.

## Contact

For questions or support, please contact the development team.
