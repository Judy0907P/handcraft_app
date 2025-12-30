# API Endpoints Reference

## Organizations

### Create Organization
```http
POST /organizations/
Content-Type: application/json

{
  "name": "My Handcraft Store"
}
```

### Get All Organizations
```http
GET /organizations/?skip=0&limit=100
```

### Get Organization by ID
```http
GET /organizations/{org_id}
```

## Part Types

### Create Part Type
```http
POST /part-types/
Content-Type: application/json

{
  "org_id": "22222222-2222-2222-2222-222222222222",
  "type_name": "Beads"
}
```

### Get Part Types by Organization
```http
GET /part-types/org/{org_id}?skip=0&limit=100
```

### Get Part Type by ID
```http
GET /part-types/{type_id}
```

## Part Subtypes

### Create Part Subtype
```http
POST /part-types/subtypes
Content-Type: application/json

{
  "type_id": "33333333-3333-3333-3333-333333333333",
  "subtype_name": "Glass Beads"
}
```

### Get Part Subtypes by Type
```http
GET /part-types/subtypes/type/{type_id}?skip=0&limit=100
```

### Get Part Subtype by ID
```http
GET /part-types/subtypes/{subtype_id}
```

## Product Types

### Create Product Type
```http
POST /product-types/
Content-Type: application/json

{
  "org_id": "22222222-2222-2222-2222-222222222222",
  "name": "Jewelry",
  "description": "Handmade jewelry items"
}
```

### Get Product Types by Organization
```http
GET /product-types/org/{org_id}?skip=0&limit=100
```

### Get Product Type by ID
```http
GET /product-types/{product_type_id}
```

## Product Subtypes

### Create Product Subtype
```http
POST /product-types/subtypes
Content-Type: application/json

{
  "product_type_id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  "name": "Bracelet",
  "description": "Wrist jewelry"
}
```

### Get Product Subtypes by Type
```http
GET /product-types/subtypes/type/{product_type_id}?skip=0&limit=100
```

### Get Product Subtype by ID
```http
GET /product-types/subtypes/{product_subtype_id}
```

## Parts

### Create Part
```http
POST /parts/
Content-Type: application/json

{
  "org_id": "22222222-2222-2222-2222-222222222222",
  "name": "Blue Glass Beads",
  "stock": 100,
  "unit_cost": "0.50",
  "unit": "piece",
  "subtype_id": "55555555-5555-5555-5555-555555555555"
}
```

### Get Parts by Organization
```http
GET /parts/org/{org_id}?skip=0&limit=100
```

### Get Part by ID
```http
GET /parts/{part_id}
```

### Update Part
```http
PATCH /parts/{part_id}
Content-Type: application/json

{
  "stock": 150,
  "unit_cost": "0.55"
}
```

## Products

### Create Product
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
  "quantity": 0,
  "alert_quantity": 5,
  "base_price": "15.00"
}
```

### Get Products by Organization
```http
GET /products/org/{org_id}?skip=0&limit=100
```

### Get Product by ID
```http
GET /products/{product_id}
```

### Update Product
```http
PATCH /products/{product_id}
Content-Type: application/json

{
  "quantity": 10,
  "base_price": "16.00"
}
```

## Production

### Build Product
```http
POST /production/build
Content-Type: application/json

{
  "product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "build_qty": "5"
}
```

## Sales

### Record Sale
```http
POST /sales/?org_id={org_id}
Content-Type: application/json

{
  "product_id": "11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "quantity": 2,
  "unit_price": "18.00",
  "notes": "Sold at craft fair"
}
```

### Get Sales by Organization
```http
GET /sales/org/{org_id}?skip=0&limit=100
```

### Get Sale by ID
```http
GET /sales/{sale_id}
```

### Get Sales by Product
```http
GET /sales/product/{product_id}
```

## Analytics

### Get Profit Summary
```http
GET /analytics/profit-summary/{org_id}
```

## Example Workflow

1. **Get or create an organization**
   ```bash
   GET /organizations/
   # Note the org_id from response
   ```

2. **Create a part type**
   ```bash
   POST /part-types/
   {
     "org_id": "...",
     "type_name": "Beads"
   }
   # Note the type_id from response
   ```

3. **Create a part subtype**
   ```bash
   POST /part-types/subtypes
   {
     "type_id": "...",
     "subtype_name": "Glass Beads"
   }
   # Note the subtype_id from response
   ```

4. **Create a part**
   ```bash
   POST /parts/
   {
     "org_id": "...",
     "name": "Blue Glass Beads",
     "stock": 100,
     "unit_cost": "0.50",
     "unit": "piece",
     "subtype_id": "..."  # from step 3
   }
   ```

5. **Create product type and subtype** (similar to steps 2-3)

6. **Create a product** (using org_id and product_subtype_id)

7. **Build the product**
   ```bash
   POST /production/build
   {
     "product_id": "...",
     "build_qty": "5"
   }
   ```

8. **Sell the product**
   ```bash
   POST /sales/?org_id=...
   {
     "product_id": "...",
     "quantity": 2,
     "unit_price": "18.00"
   }
   ```

