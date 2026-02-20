# Complete API Documentation

## Category + Subcategory System

---

## 📌 Base URL

```
http://localhost:3000/api/categories
```

---

## 🔑 Authentication

Protected routes require authentication (currently commented out in routes).

**When enabled:**

- Header: `Authorization: Bearer <token>`
- Admin role required for write operations

---

## 📋 Table of Contents

1. [Category Operations](#category-operations)
2. [Subcategory Operations](#subcategory-operations)
3. [Validation Rules](#validation-rules)
4. [Error Responses](#error-responses)

---

## CATEGORY OPERATIONS

### 1. Create Category

**POST** `/api/categories`

**Validation Rules:**

- `name`: Required, 2-100 chars, alphanumeric with spaces, hyphens, &
- `slug`: Optional, auto-generated if not provided, lowercase, alphanumeric with hyphens
- `description`: Optional, max 500 chars
- `parent`: Optional, valid MongoDB ID, category must exist and not exceed max nesting
- `images`: Optional array with `url` (required, valid URL), `alt`, `isPrimary`
- `displayOrder`: Optional, non-negative integer
- `isActive`: Optional, boolean
- `seo.title`: Optional, max 60 chars
- `seo.description`: Optional, max 160 chars
- `seo.keywords`: Optional array, each max 50 chars

**Request:**

```json
{
  "name": "Electronics",
  "description": "All electronic devices and accessories",
  "images": [
    {
      "url": "https://example.com/electronics.jpg",
      "alt": "Electronics banner",
      "isPrimary": true
    }
  ],
  "isActive": true,
  "displayOrder": 1,
  "seo": {
    "title": "Buy Electronics Online",
    "description": "Shop latest electronics with free shipping",
    "keywords": ["electronics", "gadgets", "tech"]
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Electronics",
    "slug": "electronics",
    "description": "All electronic devices and accessories",
    "parent": null,
    "level": 0,
    "path": "electronics",
    "images": [...],
    "isActive": true,
    "displayOrder": 1,
    "productCount": 0,
    "isDeleted": false,
    "seo": {...},
    "createdAt": "2025-02-08T10:00:00.000Z",
    "updatedAt": "2025-02-08T10:00:00.000Z"
  }
}
```

---

### 2. List Categories

**GET** `/api/categories`

**Query Parameters:**

- `page` (integer, min: 1, default: 1)
- `limit` (integer, 1-100, default: 20)
- `isActive` (boolean)
- `parent` (MongoDB ID or "null" for root categories)
- `search` (string, 1-100 chars)
- `sortBy` (enum: name|createdAt|displayOrder|productCount)
- `sortOrder` (enum: asc|desc, default: asc)

**Example:**

```
GET /api/categories?page=1&limit=10&isActive=true&sortBy=name&sortOrder=asc
```

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "categories": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Electronics",
        "slug": "electronics",
        "level": 0,
        "productCount": 150,
        "isActive": true,
        "primaryImage": {
          "url": "https://example.com/electronics.jpg",
          "alt": "Electronics"
        }
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "pages": 3
    }
  }
}
```

---

### 3. Get Category by ID

**GET** `/api/categories/:id`

**Validation:**

- `id`: Valid MongoDB ObjectId

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Electronics",
    "slug": "electronics",
    "description": "...",
    "parent": null,
    "level": 0,
    "images": [...],
    "productCount": 150
  }
}
```

---

### 4. Get Category by Slug

**GET** `/api/categories/slug/:slug`

**Validation:**

- `slug`: Non-empty, lowercase, alphanumeric with hyphens

**Example:**

```
GET /api/categories/slug/electronics
```

---

### 5. Update Category

**PUT** `/api/categories/:id`

**Validation:** Same as Create, all fields optional

**Request:**

```json
{
  "name": "Consumer Electronics",
  "description": "Updated description",
  "isActive": true
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Consumer Electronics",
    "slug": "consumer-electronics",
    "updatedAt": "2025-02-08T11:00:00.000Z"
  }
}
```

---

### 6. Delete Category (Soft)

**DELETE** `/api/categories/:id`

**Validation:**

- Cannot delete if has active children

**Response (200):**

```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isDeleted": true,
    "deletedAt": "2025-02-08T12:00:00.000Z"
  }
}
```

---

### 7. Restore Category

**POST** `/api/categories/:id/restore`

**Response (200):**

```json
{
  "success": true,
  "message": "Category restored successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isDeleted": false,
    "deletedAt": null,
    "isActive": true
  }
}
```

---

### 8. Get Category Tree

**GET** `/api/categories/tree`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Electronics",
      "slug": "electronics",
      "level": 0,
      "children": [
        {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Smartphones",
          "slug": "smartphones",
          "level": 1,
          "children": []
        }
      ]
    }
  ]
}
```

---

### 9. Get Statistics

**GET** `/api/categories/stats`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "total": 25,
    "active": 23,
    "inactive": 2,
    "deleted": 3,
    "roots": 5
  }
}
```

---

### 10. Bulk Update

**PATCH** `/api/categories/bulk`

**Validation:**

- `ids`: Array of valid MongoDB IDs (min 1)

**Request:**

```json
{
  "ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
  "isActive": false
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "2 categories updated",
  "data": {
    "matchedCount": 2,
    "modifiedCount": 2
  }
}
```

---

### 11. Bulk Delete

**POST** `/api/categories/bulk-delete`

**Request:**

```json
{
  "ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "2 categories deleted",
  "data": {
    "matchedCount": 2,
    "modifiedCount": 2
  }
}
```

---

## SUBCATEGORY OPERATIONS

### 12. Create Subcategory

**POST** `/api/categories/:parentId/subcategories`

**Validation:**

- `parentId`: Valid MongoDB ID, category must exist, not exceed level 3

**Request:**

```json
{
  "name": "Smartphones",
  "description": "Latest smartphones from top brands"
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Subcategory created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Smartphones",
    "slug": "smartphones",
    "parent": "507f1f77bcf86cd799439011",
    "level": 1,
    "path": "electronics/smartphones"
  }
}
```

---

### 13. Get Subcategories

**GET** `/api/categories/:parentId/subcategories`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Smartphones",
      "slug": "smartphones",
      "level": 1,
      "productCount": 45
    }
  ]
}
```

---

### 14. Get Subcategories with Counts

**GET** `/api/categories/:parentId/subcategories/with-counts`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Smartphones",
      "slug": "smartphones",
      "childCount": 3,
      "hasChildren": true
    }
  ]
}
```

---

### 15. Get Category Hierarchy

**GET** `/api/categories/:categoryId/hierarchy`

**Query Parameters:**

- `depth` (integer, 1-10, optional)

**Example:**

```
GET /api/categories/507f1f77bcf86cd799439011/hierarchy?depth=2
```

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Electronics",
    "slug": "electronics",
    "subcategories": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Smartphones",
        "subcategories": [...]
      }
    ]
  }
}
```

---

### 16. Get All Subcategories (Flat)

**GET** `/api/categories/:categoryId/all-subcategories`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Smartphones",
      "level": 1,
      "path": "electronics/smartphones"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "iPhone",
      "level": 2,
      "path": "electronics/smartphones/iphone"
    }
  ]
}
```

---

### 17. Get Breadcrumbs

**GET** `/api/categories/:categoryId/breadcrumbs`

**Response (200):**

```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Electronics",
      "slug": "electronics",
      "level": 0
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Smartphones",
      "slug": "smartphones",
      "level": 1
    }
  ]
}
```

---

### 18. Move Subcategory

**PATCH** `/api/subcategories/:subcategoryId/move`

**Validation:**

- Cannot move to itself
- Cannot create circular reference
- Cannot exceed max nesting level

**Request:**

```json
{
  "newParentId": "507f1f77bcf86cd799439014"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Subcategory moved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Smartphones",
    "parent": "507f1f77bcf86cd799439014",
    "level": 2
  }
}
```

---

### 19. Reorder Subcategories

**PUT** `/api/categories/:parentId/subcategories/reorder`

**Request:**

```json
{
  "orderData": [
    { "id": "507f1f77bcf86cd799439012", "displayOrder": 0 },
    { "id": "507f1f77bcf86cd799439013", "displayOrder": 1 }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Subcategories reordered successfully",
  "data": {
    "updated": 2
  }
}
```

---

### 20. Bulk Move Subcategories

**POST** `/api/subcategories/bulk-move`

**Request:**

```json
{
  "subcategoryIds": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "newParentId": "507f1f77bcf86cd799439014"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Moved 2 subcategories, 0 failed",
  "data": {
    "success": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
    "failed": []
  }
}
```

---

## VALIDATION RULES

### Field-Level Validation

| Field           | Rules                                         | Error Message                                                 |
| --------------- | --------------------------------------------- | ------------------------------------------------------------- |
| name            | Required, 2-100 chars, alphanumeric+space+-+& | Name must be between 2 and 100 characters                     |
| slug            | Optional, lowercase, a-z0-9-, unique          | Slug can only contain lowercase letters, numbers, and hyphens |
| description     | Max 500 chars                                 | Description cannot exceed 500 characters                      |
| parent          | Valid MongoDB ID, exists, not deleted         | Parent category not found                                     |
| images[].url    | Valid URL                                     | Invalid image URL                                             |
| images[].alt    | Max 200 chars                                 | Image alt text cannot exceed 200 characters                   |
| displayOrder    | Non-negative integer                          | Display order must be a non-negative integer                  |
| seo.title       | Max 60 chars                                  | SEO title cannot exceed 60 characters                         |
| seo.description | Max 160 chars                                 | SEO description cannot exceed 160 characters                  |
| seo.keywords[]  | Max 50 chars each                             | Each keyword cannot exceed 50 characters                      |

### Business Logic Validation

- **Max Nesting Level**: 3 (Root=0, Cat=1, Sub=2, Sub-sub=3)
- **Circular Reference**: Cannot set descendant as parent
- **Self-Reference**: Cannot be own parent
- **Delete with Children**: Cannot delete category with active children
- **Slug Uniqueness**: Auto-appends number if exists (e.g., category-2)

---

## ERROR RESPONSES

### Validation Error (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name must be between 2 and 100 characters",
      "value": "A"
    }
  ]
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "Category not found"
}
```

### Business Logic Error (400)

```json
{
  "success": false,
  "message": "Cannot delete category with active children"
}
```

### Server Error (500)

```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## 🔍 Query Examples

### Search categories

```
GET /api/categories?search=phone
```

### Get root categories only

```
GET /api/categories?parent=null
```

### Get active categories sorted by name

```
GET /api/categories?isActive=true&sortBy=name&sortOrder=asc
```

### Paginate results

```
GET /api/categories?page=2&limit=50
```

---

## ✅ Validation Testing Checklist

- [ ] Empty name → 400 error
- [ ] Invalid slug format → 400 error
- [ ] Duplicate slug → 400 error
- [ ] Invalid parent ID → 400 error
- [ ] Parent not found → 400 error
- [ ] Max nesting exceeded → 400 error
- [ ] Circular reference → 400 error
- [ ] Delete with children → 400 error
- [ ] Invalid image URL → 400 error
- [ ] SEO title too long → 400 error
