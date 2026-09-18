-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES profiles(organization_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    unit TEXT NOT NULL, -- e.g., 'un', 'ml', 'g'
    minimum_stock DECIMAL(10,2) DEFAULT 0,
    ideal_stock DECIMAL(10,2) DEFAULT 0,
    cost_price DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Transactions Table (Ledger for Stock)
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES profiles(organization_id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL, -- Optional, if linked to a checkout
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
    quantity DECIMAL(10,2) NOT NULL, -- Positive for 'in', negative for 'out'
    cost_at_time DECIMAL(10,2), -- The cost price of the product at the time of transaction
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service Products Table (Bill of Materials)
CREATE TABLE service_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES profiles(organization_id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    default_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(service_id, product_id)
);

-- Setup RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_products ENABLE ROW LEVEL SECURITY;

-- Products Policies
CREATE POLICY "Products are visible to org users" ON products
    FOR SELECT USING (organization_id = current_organization_id());
CREATE POLICY "Products can be managed by org users" ON products
    FOR ALL USING (organization_id = current_organization_id());

-- Transactions Policies
CREATE POLICY "Transactions are visible to org users" ON inventory_transactions
    FOR SELECT USING (organization_id = current_organization_id());
CREATE POLICY "Transactions can be managed by org users" ON inventory_transactions
    FOR ALL USING (organization_id = current_organization_id());

-- Service Products Policies
CREATE POLICY "Service products are visible to org users" ON service_products
    FOR SELECT USING (organization_id = current_organization_id());
CREATE POLICY "Service products can be managed by org users" ON service_products
    FOR ALL USING (organization_id = current_organization_id());
