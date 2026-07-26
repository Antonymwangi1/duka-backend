# Duka (Shop Management System)

Duka is a simple POS and Inventory management system, and sales tracker system designed for local shops in Kenya. It gives shop owners and staff real time visibility of stock, sales and profit without needing accounting knowledge.

> Built from real experience working in a kenyan local shop.

## Live Demo

🔗 Coming soon

## The Problem

Most local shops in Kenya track inventory with pen and paper or basic spreadsheets which require a little bit of skills to setup. This makes it hard to:

- Know what is in stock withou physically counting
- Track daily profit accurately
- Manage multiple shop location from one place if they have multiple shops.

Duka solves this with a simple, fast POS system built specifically for the kenayn market.


## The Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js (Modular Monolith)
- **Database:** PostgreSQL + Prisma ORM
- **Cache:** Redis
- **Auth:** JWT (access token + refresh token)
- **Validation:** Zod
- **Deployment:** Railway

## Architecture Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Architecture | Modular Monolith | Single developer, microservices add unnecessary complexity |
| Database | PostgreSQL | Data is relational: users, shops, products and sales all have clear relationships requiring foreign keys and ACID transactions |
| Auth | Custom JWT | Full control over JWT payload needed to carry userId, shopId and role. No vendor dependency or per-user cost |
| Money fields | Decimal not Float | Float is imprecise for financial calculations. Decimal(10,2) guarantees accuracy |
| Sale corrections | Reversals not edits | Completed sales should never be edited. reversals preserve the financial audit trail |
| Stock on sale | PostgreSQL FOR UPDATE | Prevents race condition when two cashiers sell the last item simultaneously |
| Cache invalidation | Delete on write | Simpler and more reliable than TTL only for frequently changing data like stock quantities |
| IDs | UUID | Client generated IDs enable future offline support without server roundtrips |

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL
- Redis

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/duka-backend.git
cd duka-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your values in .env

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Environment Variables

```
DATABASE_URL=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
JWT_SECRET=
JWT_REFRESH_SECRET=
PORT=
NODE_ENV=
FRONTEND_URL=
```

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Auth
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/register` | No | None | Register owner and create shop |
| POST | `/auth/login` | No | Everyone | Login and receive tokens |
| POST | `/auth/logout` | Yes | Everyone | Logout and invalidate token |
| POST | `/auth/refresh` | No | None | Refresh access token |
| POST | `/auth/switch-shop` | Yes | Owner | switch shop |
| POST | `/auth/shops` | Yes | Owner | Create shops |
| GET | `/auth/shops` | Yes | Owner | List all shops |
| POST | `/auth/staff` | Yes | Owner | Create staff account |
| GET | `/auth/staff` | Yes | Owner | List all staff |
| PATCH | `/auth/staff/:id` | Yes | Owner | Update staff role or deactivate |
| DELETE | `/auth/staff/:id` | Yes | Owner | Remove staff access |

### Products
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/products` | Yes | Owner, Admin | Create product |
| GET | `/products` | Yes | All | List all products |
| GET | `/products/:id` | Yes | All | Get single product |
| PATCH | `/products/:id` | Yes | Owner, Admin | Update product |
| DELETE | `/products/:id` | Yes | Owner, Admin | Soft delete product |
| GET | `/products/search?q=` | Yes | All | Search by name |
| GET | `/products/search?barcode=` | Yes | All | Search by barcode |
| PATCH | `/products/:id/stock` | Yes | Owner, Admin | Adjust stock |
| GET | `/products/low-stock` | Yes | All | Products below threshold |

### Sales
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/sales` | Yes | All | Create a sale |
| GET | `/sales` | Yes | Owner, Admin | List all sales |
| GET | `/sales?staff_id=` | Yes | Owner, Admin | Sales by staff |
| GET | `/sales?date=` | Yes | Owner, Admin | Sales by date |
| GET | `/sales/:id` | Yes | All | Get single sale |
| GET | `/sales/:id/receipt` | Yes | All | Generate receipt |
| POST | `/sales/:id/reverse` | Yes | Owner, Admin | Reverse a sale |

### Reports
| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/reports/summary?period=&date=` | Yes | Owner, Admin | Sales summary |
| GET | `/reports/profit?period=&date=` | Yes | Owner, Admin | Profit report |
| GET | `/reports/low-stock` | Yes | Owner, Admin | Low stock report |
| GET | `/reports/top-products?period=` | Yes | Owner, Admin | Best sellers |
| GET | `/reports/staff?period=&date=` | Yes | Owner | Staff performance |

---

## Database Schema

Eight tables covering the full business domain:

```
users           → staff and owner accounts
shops           → shop details and settings
categories      → product organisation
products        → inventory with stock tracking
sales           → transaction records
sale_items      → line items per transaction
stock_movements → full audit log of stock changes
reports         → cached reports and analytics data
```

---

## Roadmap

**V1 (Current)**
- [x] Database schema and migrations
- [ ] Authentication and authorisation
- [ ] Products and inventory management
- [ ] Point of Sale
- [ ] Reports and analytics
- [ ] Deploy to Railwa