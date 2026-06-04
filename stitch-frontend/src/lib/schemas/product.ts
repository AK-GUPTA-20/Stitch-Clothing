import { z } from 'zod';

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, 'SKU is required'),
  color: z.string().optional(),
  size: z.string().optional(),
  price: z.number().min(0, 'Price must be 0 or more'),
  stock: z.number().int().min(0, 'Stock must be 0 or more'),
  image: z.string().url().optional().or(z.literal('')),
});

export const productSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(2, 'Category is required'),
  subCategory: z.string().optional(),
  brand: z.string().min(2, 'Brand is required'),
  tags: z.array(z.string()).default([]),
  
  // Pricing
  basePrice: z.number().min(1, 'Base price must be greater than 0'),
  compareAtPrice: z.number().optional(),
  
  // Media
  images: z.array(z.string().url()).min(1, 'At least one product image is required'),
  viewer3dUrl: z.string().url().optional().or(z.literal('')),
  videoUrl: z.string().url().optional().or(z.literal('')),
  
  // Inventory
  sku: z.string().min(2, 'Base SKU is required'),
  stock: z.number().int().min(0),
  
  // Variants
  variants: z.array(productVariantSchema).default([]),
  
  // Shipping
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0).optional(),
    width: z.number().min(0).optional(),
    height: z.number().min(0).optional(),
  }).optional(),
  
  // Status
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).default('draft'),
  isActive: z.boolean().default(true),
});

export type ProductVariantFormData = z.infer<typeof productVariantSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
