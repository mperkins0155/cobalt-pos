-- ============================================================
-- COBALT POS — Development Seed Data (Coffee Shop)
-- Run after schema migration. Requires an existing org + location.
-- Replace the UUIDs below with your actual org/location IDs.
-- ============================================================

-- Use variables for org context
DO $$
DECLARE
  v_org_id UUID;
  v_loc_id UUID;
  v_owner_id UUID;
  -- Category IDs
  v_cat_coffee UUID := gen_random_uuid();
  v_cat_espresso UUID := gen_random_uuid();
  v_cat_tea UUID := gen_random_uuid();
  v_cat_pastry UUID := gen_random_uuid();
  v_cat_food UUID := gen_random_uuid();
  -- Item IDs
  v_drip UUID := gen_random_uuid();
  v_americano UUID := gen_random_uuid();
  v_latte UUID := gen_random_uuid();
  v_cappuccino UUID := gen_random_uuid();
  v_mocha UUID := gen_random_uuid();
  v_chai UUID := gen_random_uuid();
  v_matcha UUID := gen_random_uuid();
  v_croissant UUID := gen_random_uuid();
  v_muffin UUID := gen_random_uuid();
  v_scone UUID := gen_random_uuid();
  v_bagel UUID := gen_random_uuid();
  v_sandwich UUID := gen_random_uuid();
  v_salad UUID := gen_random_uuid();
  -- Modifier group IDs
  v_mg_size UUID := gen_random_uuid();
  v_mg_milk UUID := gen_random_uuid();
  v_mg_extras UUID := gen_random_uuid();
  v_mg_temp UUID := gen_random_uuid();
BEGIN
  -- Get first org and location
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  SELECT id INTO v_loc_id FROM locations WHERE org_id = v_org_id LIMIT 1;
  SELECT id INTO v_owner_id FROM profiles WHERE org_id = v_org_id AND role = 'owner' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Create one via onboarding first.';
  END IF;

  -- ---- Categories ----
  INSERT INTO categories (id, org_id, name, icon, color, sort_order) VALUES
    (v_cat_coffee, v_org_id, 'Drip Coffee', '☕', '#8B4513', 1),
    (v_cat_espresso, v_org_id, 'Espresso', '🫘', '#4A2C2A', 2),
    (v_cat_tea, v_org_id, 'Tea & Specialty', '🍵', '#228B22', 3),
    (v_cat_pastry, v_org_id, 'Pastries', '🥐', '#DAA520', 4),
    (v_cat_food, v_org_id, 'Food', '🥪', '#CD853F', 5);

  -- ---- Modifier Groups ----
  INSERT INTO modifier_groups (id, org_id, name, selection_type, is_required, min_selections, max_selections, sort_order) VALUES
    (v_mg_size, v_org_id, 'Size', 'choose_one', TRUE, 1, 1, 1),
    (v_mg_milk, v_org_id, 'Milk', 'choose_one', FALSE, 0, 1, 2),
    (v_mg_extras, v_org_id, 'Extras', 'choose_many', FALSE, 0, 5, 3),
    (v_mg_temp, v_org_id, 'Temperature', 'choose_one', FALSE, 0, 1, 4);

  -- Modifier Options: Size
  INSERT INTO modifier_options (modifier_group_id, name, price_adjustment, sort_order) VALUES
    (v_mg_size, 'Small (12oz)', 0, 1),
    (v_mg_size, 'Medium (16oz)', 0.50, 2),
    (v_mg_size, 'Large (20oz)', 1.00, 3);

  -- Modifier Options: Milk
  INSERT INTO modifier_options (modifier_group_id, name, price_adjustment, sort_order) VALUES
    (v_mg_milk, 'Whole Milk', 0, 1),
    (v_mg_milk, '2% Milk', 0, 2),
    (v_mg_milk, 'Oat Milk', 0.75, 3),
    (v_mg_milk, 'Almond Milk', 0.75, 4),
    (v_mg_milk, 'Coconut Milk', 0.75, 5),
    (v_mg_milk, 'Soy Milk', 0.50, 6);

  -- Modifier Options: Extras
  INSERT INTO modifier_options (modifier_group_id, name, price_adjustment, sort_order) VALUES
    (v_mg_extras, 'Extra Shot', 0.75, 1),
    (v_mg_extras, 'Vanilla Syrup', 0.50, 2),
    (v_mg_extras, 'Caramel Syrup', 0.50, 3),
    (v_mg_extras, 'Hazelnut Syrup', 0.50, 4),
    (v_mg_extras, 'Whipped Cream', 0.50, 5),
    (v_mg_extras, 'Chocolate Drizzle', 0.25, 6);

  -- Modifier Options: Temperature
  INSERT INTO modifier_options (modifier_group_id, name, price_adjustment, sort_order) VALUES
    (v_mg_temp, 'Hot', 0, 1),
    (v_mg_temp, 'Iced', 0, 2),
    (v_mg_temp, 'Blended', 0.50, 3);

  -- ---- Items ----

  -- Drip Coffee
  INSERT INTO items (id, org_id, category_id, name, base_price, taxable, sort_order) VALUES
    (v_drip, v_org_id, v_cat_coffee, 'Drip Coffee', 2.75, TRUE, 1);

  -- Espresso drinks
  INSERT INTO items (id, org_id, category_id, name, base_price, taxable, sort_order) VALUES
    (v_americano, v_org_id, v_cat_espresso, 'Americano', 3.50, TRUE, 1),
    (v_latte, v_org_id, v_cat_espresso, 'Latte', 4.75, TRUE, 2),
    (v_cappuccino, v_org_id, v_cat_espresso, 'Cappuccino', 4.50, TRUE, 3),
    (v_mocha, v_org_id, v_cat_espresso, 'Mocha', 5.25, TRUE, 4);

  -- Tea & Specialty
  INSERT INTO items (id, org_id, category_id, name, base_price, taxable, sort_order) VALUES
    (v_chai, v_org_id, v_cat_tea, 'Chai Latte', 4.95, TRUE, 1),
    (v_matcha, v_org_id, v_cat_tea, 'Matcha Latte', 5.50, TRUE, 2);

  -- Pastries
  INSERT INTO items (id, org_id, category_id, name, base_price, taxable, sort_order) VALUES
    (v_croissant, v_org_id, v_cat_pastry, 'Butter Croissant', 3.50, TRUE, 1),
    (v_muffin, v_org_id, v_cat_pastry, 'Blueberry Muffin', 3.25, TRUE, 2),
    (v_scone, v_org_id, v_cat_pastry, 'Cranberry Scone', 3.75, TRUE, 3);

  -- Food
  INSERT INTO items (id, org_id, category_id, name, base_price, taxable, sort_order) VALUES
    (v_bagel, v_org_id, v_cat_food, 'Bagel & Cream Cheese', 4.50, TRUE, 1),
    (v_sandwich, v_org_id, v_cat_food, 'Turkey Avocado Sandwich', 9.95, TRUE, 2),
    (v_salad, v_org_id, v_cat_food, 'Garden Salad', 8.50, TRUE, 3);

  -- ---- Link Modifier Groups to Items ----
  -- All drinks get size, milk, extras, temp
  INSERT INTO item_modifier_groups (item_id, modifier_group_id, sort_order)
  SELECT item_id, mg_id, mg_sort FROM (
    VALUES
      (v_drip, v_mg_size, 1), (v_drip, v_mg_temp, 2),
      (v_americano, v_mg_size, 1), (v_americano, v_mg_temp, 2), (v_americano, v_mg_extras, 3),
      (v_latte, v_mg_size, 1), (v_latte, v_mg_milk, 2), (v_latte, v_mg_temp, 3), (v_latte, v_mg_extras, 4),
      (v_cappuccino, v_mg_size, 1), (v_cappuccino, v_mg_milk, 2), (v_cappuccino, v_mg_temp, 3), (v_cappuccino, v_mg_extras, 4),
      (v_mocha, v_mg_size, 1), (v_mocha, v_mg_milk, 2), (v_mocha, v_mg_temp, 3), (v_mocha, v_mg_extras, 4),
      (v_chai, v_mg_size, 1), (v_chai, v_mg_milk, 2), (v_chai, v_mg_temp, 3), (v_chai, v_mg_extras, 4),
      (v_matcha, v_mg_size, 1), (v_matcha, v_mg_milk, 2), (v_matcha, v_mg_temp, 3), (v_matcha, v_mg_extras, 4)
  ) AS t(item_id, mg_id, mg_sort);

  -- ---- Sample Customers ----
  INSERT INTO customers (org_id, first_name, last_name, email, phone, visit_count, total_spent) VALUES
    (v_org_id, 'Alice', 'Johnson', 'alice@example.com', '555-0101', 12, 156.50),
    (v_org_id, 'Bob', 'Smith', 'bob@example.com', '555-0102', 8, 89.25),
    (v_org_id, 'Carol', 'Williams', NULL, '555-0103', 3, 42.00),
    (v_org_id, 'David', 'Brown', 'david@example.com', NULL, 25, 312.75),
    (v_org_id, 'Emma', 'Davis', 'emma@example.com', '555-0105', 1, 15.50);

  -- ---- Sample Discounts ----
  INSERT INTO discounts (org_id, name, discount_type, value, is_active) VALUES
    (v_org_id, '10% Off', 'percentage', 10, TRUE),
    (v_org_id, '20% Off', 'percentage', 20, TRUE),
    (v_org_id, '$2 Off', 'fixed', 2.00, TRUE),
    (v_org_id, '$5 Off', 'fixed', 5.00, TRUE);

  INSERT INTO discounts (org_id, name, discount_type, value, code, is_active, requires_role) VALUES
    (v_org_id, 'Employee Discount', 'percentage', 25, 'EMPLOYEE25', TRUE, 'manager');

  -- ---- Inventory ----
  INSERT INTO inventory (org_id, location_id, item_id, quantity_on_hand, low_stock_threshold) VALUES
    (v_org_id, v_loc_id, v_croissant, 24, 6),
    (v_org_id, v_loc_id, v_muffin, 18, 6),
    (v_org_id, v_loc_id, v_scone, 12, 4),
    (v_org_id, v_loc_id, v_bagel, 20, 5),
    (v_org_id, v_loc_id, v_sandwich, 10, 3),
    (v_org_id, v_loc_id, v_salad, 8, 3);

  RAISE NOTICE 'Seed data loaded for org %', v_org_id;
END;
$$;

