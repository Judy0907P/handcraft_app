# Recipe Management Guide

You can manage recipes (BOM - Bill of Materials) in two ways:

## Option 1: Create Recipe with Product (Recommended for Initial Setup)

When creating a product, you can include recipe lines in the same request:

```http
POST /products/
Content-Type: application/json

{
  "org_id": "22222222-2222-2222-2222-222222222222",
  "name": "Blue Bead Bracelet",
  "description": "Beautiful blue glass bead bracelet",
  "primary_color": "Blue",
  "secondary_color": "White",
  "product_subtype_id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
  "is_active": true,
  "is_self_made": true,
  "difficulty": "easy",
  "base_price": "15.00",
  "recipe_lines": [
    {
      "part_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "quantity": "10",
      "unit": "piece"
    },
    {
      "part_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "quantity": "0.5",
      "unit": "meter"
    }
  ]
}
```

The product and its recipe will be created in a single transaction.

## Option 2: Manage Recipes Separately (Recommended for Updates)

Use the dedicated Recipe API for more control:

### Get Recipe Lines for a Product
```http
GET /recipes/product/{product_id}
```

### Add a Recipe Line
```http
POST /recipes/product/{product_id}
Content-Type: application/json

{
  "part_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "quantity": "10",
  "unit": "piece"
}
```

### Update a Recipe Line
```http
PUT /recipes/product/{product_id}/part/{part_id}
Content-Type: application/json

{
  "part_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "quantity": "12",
  "unit": "piece"
}
```

### Delete a Recipe Line
```http
DELETE /recipes/product/{product_id}/part/{part_id}
```

### Bulk Create/Update Recipe Lines
```http
POST /recipes/product/{product_id}/bulk
Content-Type: application/json

[
  {
    "part_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "quantity": "10",
    "unit": "piece"
  },
  {
    "part_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "quantity": "0.5",
    "unit": "meter"
  }
]
```

## Getting Products with Recipes

When you get a product, recipe lines are automatically included:

```http
GET /products/{product_id}
```

Response includes:
```json
{
  "product_id": "...",
  "name": "Blue Bead Bracelet",
  ...
  "recipe_lines": [
    {
      "product_id": "...",
      "part_id": "...",
      "quantity": "10",
      "unit": "piece",
      "created_at": "2025-12-29T..."
    }
  ]
}
```

## Validation Rules

- Parts and products must belong to the same organization
- Each product can only have one recipe line per part (unique constraint)
- Quantity must be greater than 0
- If you try to add a duplicate recipe line, you'll get an error (use update instead)

## Example Workflow

1. **Create product with recipe (Option 1)**
   ```bash
   POST /products/
   # Include recipe_lines in the request
   ```

2. **Or create product first, then add recipe (Option 2)**
   ```bash
   POST /products/
   # Create product without recipe_lines
   
   POST /recipes/product/{product_id}/bulk
   # Add all recipe lines at once
   ```

3. **Update recipe later**
   ```bash
   PUT /recipes/product/{product_id}/part/{part_id}
   # Update quantity or other fields
   ```

4. **View product with recipe**
   ```bash
   GET /products/{product_id}
   # Recipe lines are included in response
   ```

## Benefits of Each Approach

**Option 1 (Create with Product):**
- ✅ Convenient for initial setup
- ✅ Atomic transaction (all or nothing)
- ✅ Less API calls

**Option 2 (Separate Recipe API):**
- ✅ More flexible for updates
- ✅ Can manage recipes independently
- ✅ Better for complex workflows
- ✅ Can add/remove individual recipe lines

Choose the approach that fits your workflow best!

