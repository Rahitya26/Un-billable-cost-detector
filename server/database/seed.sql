-- Drop table if exists to recreate with new schema
DROP TABLE IF EXISTS organization_metrics;

-- Create table
CREATE TABLE organization_metrics (
    id SERIAL PRIMARY KEY,
    month_year DATE NOT NULL,
    headcount INTEGER NOT NULL,
    software_costs NUMERIC(10, 2) NOT NULL,
    rent NUMERIC(10, 2) NOT NULL,
    utilization_percentage INTEGER NOT NULL,
    actual_unbillable_expenditure NUMERIC(10, 2) NOT NULL
);

-- Seed data generated using Mid-Market Formula:
-- Cost = Rent + Software + (Headcount * 75000 * (1 - Utilization/100)) + (Headcount * 5000)

INSERT INTO organization_metrics (month_year, headcount, software_costs, rent, utilization_percentage, actual_unbillable_expenditure) VALUES
-- Months 1-4: HC 40, Rent 250k, Soft 80k, Util 85% (Ineff 0.15)
-- Cost = 250k + 80k + (40*75k*0.15) + (40*5k) 
--      = 330k + 450k + 200k = 980,000
('2025-01-01', 40, 80000.00, 250000.00, 85, 980000.00),
('2025-02-01', 40, 80000.00, 250000.00, 85, 980000.00),
('2025-03-01', 40, 80000.00, 250000.00, 85, 980000.00),
('2025-04-01', 40, 80000.00, 250000.00, 85, 980000.00),

-- Months 5-8: HC 45, Rent 250k, Soft 90k, Util 70% (Ineff 0.30)
-- Cost = 250k + 90k + (45*75k*0.30) + (45*5k)
--      = 340k + 1,012,500 + 225,000 = 1,577,500
('2025-05-01', 45, 90000.00, 250000.00, 70, 1577500.00),
('2025-06-01', 45, 90000.00, 250000.00, 70, 1577500.00),
('2025-07-01', 45, 90000.00, 250000.00, 70, 1577500.00),
('2025-08-01', 45, 90000.00, 250000.00, 70, 1577500.00),

-- Months 9-12: HC 50, Rent 350k, Soft 110k, Util 92% (Ineff 0.08)
-- Cost = 350k + 110k + (50*75k*0.08) + (50*5k)
--      = 460k + 300,000 + 250,000 = 1,010,000
('2025-09-01', 50, 110000.00, 350000.00, 92, 1010000.00),
('2025-10-01', 50, 110000.00, 350000.00, 92, 1010000.00),
('2025-11-01', 50, 110000.00, 350000.00, 92, 1010000.00),
('2025-12-01', 50, 110000.00, 350000.00, 92, 1010000.00);
