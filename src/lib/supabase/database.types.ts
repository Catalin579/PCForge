
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "alerts": {
                  Row: {
                    "created_at": string,"currency_code": string | null,"id": string,"is_active": boolean,"last_notified_at": string | null,"region_code": string,"target_price": number | null,"type": Database["public"]['Enums']["alert_type"],"user_id": string,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency_code"?: string | null,"id"?: string,"is_active"?: boolean,"last_notified_at"?: string | null,"region_code": string,"target_price"?: number | null,"type": Database["public"]['Enums']["alert_type"],"user_id": string,"variant_id": string
                  }
                  Update: {
                    "created_at"?: string,"currency_code"?: string | null,"id"?: string,"is_active"?: boolean,"last_notified_at"?: string | null,"region_code"?: string,"target_price"?: number | null,"type"?: Database["public"]['Enums']["alert_type"],"user_id"?: string,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "alerts_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "alerts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"benchmarks": {
                  Row: {
                    "created_at": string,"higher_is_better": boolean,"id": string,"measured_at": string | null,"product_id": string,"score": number,"source_name": string | null,"source_url": string | null,"suite": string,"unit": string,"workload": Database["public"]['Enums']["use_case"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"higher_is_better"?: boolean,"id"?: string,"measured_at"?: string | null,"product_id": string,"score": number,"source_name"?: string | null,"source_url"?: string | null,"suite": string,"unit"?: string,"workload": Database["public"]['Enums']["use_case"]
                  }
                  Update: {
                    "created_at"?: string,"higher_is_better"?: boolean,"id"?: string,"measured_at"?: string | null,"product_id"?: string,"score"?: number,"source_name"?: string | null,"source_url"?: string | null,"suite"?: string,"unit"?: string,"workload"?: Database["public"]['Enums']["use_case"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "benchmarks_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"brands": {
                  Row: {
                    "created_at": string,"id": string,"logo_url": string | null,"name": string,"slug": string,"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"logo_url"?: string | null,"name": string,"slug": string,"website_url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"logo_url"?: string | null,"name"?: string,"slug"?: string,"website_url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"build_comments": {
                  Row: {
                    "author_id": string,"body": string,"build_id": string,"created_at": string,"id": string,"is_hidden": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"build_id": string,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"build_id"?: string,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "build_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "build_comments_build_id_fkey"
      columns: ["build_id"]
isOneToOne: false
      referencedRelation: "builds"
      referencedColumns: ["id"]
    }
                  ]
                },"build_items": {
                  Row: {
                    "build_id": string,"category_slug": string,"created_at": string,"id": string,"notes": string | null,"position": number,"quantity": number,"selected_offer_id": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "build_id": string,"category_slug": string,"created_at"?: string,"id"?: string,"notes"?: string | null,"position"?: number,"quantity"?: number,"selected_offer_id"?: string | null,"variant_id": string
                  }
                  Update: {
                    "build_id"?: string,"category_slug"?: string,"created_at"?: string,"id"?: string,"notes"?: string | null,"position"?: number,"quantity"?: number,"selected_offer_id"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "build_items_build_id_fkey"
      columns: ["build_id"]
isOneToOne: false
      referencedRelation: "builds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "build_items_category_slug_fkey"
      columns: ["category_slug"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "build_items_selected_offer_id_fkey"
      columns: ["selected_offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "build_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"build_ratings": {
                  Row: {
                    "build_id": string,"created_at": string,"rating": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "build_id": string,"created_at"?: string,"rating": number,"user_id": string
                  }
                  Update: {
                    "build_id"?: string,"created_at"?: string,"rating"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "build_ratings_build_id_fkey"
      columns: ["build_id"]
isOneToOne: false
      referencedRelation: "builds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "build_ratings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"builds": {
                  Row: {
                    "budget_amount": number | null,"created_at": string,"currency_code": string,"description": string | null,"forked_from_id": string | null,"id": string,"name": string,"owner_id": string,"power_draw_snapshot": number | null,"region_code": string,"share_slug": string,"total_price_snapshot": number | null,"updated_at": string,"use_case": Database["public"]['Enums']["use_case"] | null,"visibility": Database["public"]['Enums']["build_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_amount"?: number | null,"created_at"?: string,"currency_code": string,"description"?: string | null,"forked_from_id"?: string | null,"id"?: string,"name": string,"owner_id": string,"power_draw_snapshot"?: number | null,"region_code": string,"share_slug"?: string,"total_price_snapshot"?: number | null,"updated_at"?: string,"use_case"?: Database["public"]['Enums']["use_case"] | null,"visibility"?: Database["public"]['Enums']["build_visibility"]
                  }
                  Update: {
                    "budget_amount"?: number | null,"created_at"?: string,"currency_code"?: string,"description"?: string | null,"forked_from_id"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string,"power_draw_snapshot"?: number | null,"region_code"?: string,"share_slug"?: string,"total_price_snapshot"?: number | null,"updated_at"?: string,"use_case"?: Database["public"]['Enums']["use_case"] | null,"visibility"?: Database["public"]['Enums']["build_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "builds_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "builds_forked_from_id_fkey"
      columns: ["forked_from_id"]
isOneToOne: false
      referencedRelation: "builds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "builds_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "builds_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    }
                  ]
                },"categories": {
                  Row: {
                    "description": string | null,"icon": string | null,"is_core": boolean,"max_per_build": number | null,"name": string,"plural_name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"icon"?: string | null,"is_core"?: boolean,"max_per_build"?: number | null,"name": string,"plural_name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string | null,"icon"?: string | null,"is_core"?: boolean,"max_per_build"?: number | null,"name"?: string,"plural_name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"compatibility_rules": {
                  Row: {
                    "categories": (string)[],"code": string,"created_at": string,"description": string,"is_active": boolean,"name": string,"params": NonNullable<Json>,"severity": Database["public"]['Enums']["rule_severity"],"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "categories"?: (string)[],"code": string,"created_at"?: string,"description": string,"is_active"?: boolean,"name": string,"params"?: NonNullable<Json>,"severity"?: Database["public"]['Enums']["rule_severity"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "categories"?: (string)[],"code"?: string,"created_at"?: string,"description"?: string,"is_active"?: boolean,"name"?: string,"params"?: NonNullable<Json>,"severity"?: Database["public"]['Enums']["rule_severity"],"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"currencies": {
                  Row: {
                    "code": string,"created_at": string,"minor_units": number,"name": string,"symbol": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"minor_units"?: number,"name": string,"symbol": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"minor_units"?: number,"name"?: string,"symbol"?: string
                  }
                  Relationships: [
                    
                  ]
                },"exchange_rates": {
                  Row: {
                    "base_currency": string,"created_at": string,"id": number,"quote_currency": string,"rate": number,"source": string,"valid_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_currency": string,"created_at"?: string,"id"?: never,"quote_currency": string,"rate": number,"source"?: string,"valid_at"?: string
                  }
                  Update: {
                    "base_currency"?: string,"created_at"?: string,"id"?: never,"quote_currency"?: string,"rate"?: number,"source"?: string,"valid_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "exchange_rates_base_currency_fkey"
      columns: ["base_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "exchange_rates_quote_currency_fkey"
      columns: ["quote_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"favorites": {
                  Row: {
                    "created_at": string,"product_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"product_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"product_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "favorites_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"offers": {
                  Row: {
                    "created_at": string,"currency_code": string,"delivery_days_max": number | null,"delivery_days_min": number | null,"id": string,"is_active": boolean,"last_checked_at": string,"listing_type": Database["public"]['Enums']["listing_type"],"price": number,"price_includes_tax": boolean,"region_code": string,"retailer_id": string,"shipping_cost": number | null,"stock_status": Database["public"]['Enums']["stock_status"],"updated_at": string,"url": string | null,"variant_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency_code": string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"id"?: string,"is_active"?: boolean,"last_checked_at"?: string,"listing_type"?: Database["public"]['Enums']["listing_type"],"price": number,"price_includes_tax"?: boolean,"region_code": string,"retailer_id": string,"shipping_cost"?: number | null,"stock_status"?: Database["public"]['Enums']["stock_status"],"updated_at"?: string,"url"?: string | null,"variant_id": string
                  }
                  Update: {
                    "created_at"?: string,"currency_code"?: string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"id"?: string,"is_active"?: boolean,"last_checked_at"?: string,"listing_type"?: Database["public"]['Enums']["listing_type"],"price"?: number,"price_includes_tax"?: boolean,"region_code"?: string,"retailer_id"?: string,"shipping_cost"?: number | null,"stock_status"?: Database["public"]['Enums']["stock_status"],"updated_at"?: string,"url"?: string | null,"variant_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "offers_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "offers_retailer_id_fkey"
      columns: ["retailer_id"]
isOneToOne: false
      referencedRelation: "retailers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offers_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"price_history": {
                  Row: {
                    "currency_code": string,"id": number,"offer_id": string,"price": number,"recorded_at": string,"stock_status": Database["public"]['Enums']["stock_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "currency_code": string,"id"?: never,"offer_id": string,"price": number,"recorded_at"?: string,"stock_status": Database["public"]['Enums']["stock_status"]
                  }
                  Update: {
                    "currency_code"?: string,"id"?: never,"offer_id"?: string,"price"?: number,"recorded_at"?: string,"stock_status"?: Database["public"]['Enums']["stock_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "price_history_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "price_history_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "created_at": string,"ean": string | null,"id": string,"is_default": boolean,"label": string | null,"mpn": string | null,"product_id": string,"sku": string,"specs_override": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ean"?: string | null,"id"?: string,"is_default"?: boolean,"label"?: string | null,"mpn"?: string | null,"product_id": string,"sku": string,"specs_override"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ean"?: string | null,"id"?: string,"is_default"?: boolean,"label"?: string | null,"mpn"?: string | null,"product_id"?: string,"sku"?: string,"specs_override"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "brand_id": string,"category_slug": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"image_urls": (string)[],"model": string,"name": string,"performance_score": number | null,"power_draw_w": number | null,"release_date": string | null,"search_vector": unknown,"slug": string,"specs": NonNullable<Json>,"status": Database["public"]['Enums']["product_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_id": string,"category_slug": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"image_urls"?: (string)[],"model": string,"name": string,"performance_score"?: number | null,"power_draw_w"?: number | null,"release_date"?: string | null,"search_vector"?: unknown,"slug": string,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string
                  }
                  Update: {
                    "brand_id"?: string,"category_slug"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"image_urls"?: (string)[],"model"?: string,"name"?: string,"performance_score"?: number | null,"power_draw_w"?: number | null,"release_date"?: string | null,"search_vector"?: unknown,"slug"?: string,"specs"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["product_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_category_slug_fkey"
      columns: ["category_slug"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["slug"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"budget_amount": number | null,"created_at": string,"currency_code": string | null,"display_name": string | null,"id": string,"locale": string | null,"primary_use_case": Database["public"]['Enums']["use_case"] | null,"region_code": string | null,"role": Database["public"]['Enums']["user_role"],"updated_at": string,"username": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"budget_amount"?: number | null,"created_at"?: string,"currency_code"?: string | null,"display_name"?: string | null,"id": string,"locale"?: string | null,"primary_use_case"?: Database["public"]['Enums']["use_case"] | null,"region_code"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"username"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"budget_amount"?: number | null,"created_at"?: string,"currency_code"?: string | null,"display_name"?: string | null,"id"?: string,"locale"?: string | null,"primary_use_case"?: Database["public"]['Enums']["use_case"] | null,"region_code"?: string | null,"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string,"username"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "profiles_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    }
                  ]
                },"region_currencies": {
                  Row: {
                    "currency_code": string,"region_code": string
                  }
                  ComputedFields: never
                  Insert: {
                    "currency_code": string,"region_code": string
                  }
                  Update: {
                    "currency_code"?: string,"region_code"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "region_currencies_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "region_currencies_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    }
                  ]
                },"regions": {
                  Row: {
                    "code": string,"created_at": string,"default_currency": string,"default_locale": string,"is_active": boolean,"name": string,"prices_include_tax": boolean,"sort_order": number,"supported_locales": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"created_at"?: string,"default_currency": string,"default_locale": string,"is_active"?: boolean,"name": string,"prices_include_tax"?: boolean,"sort_order"?: number,"supported_locales"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"default_currency"?: string,"default_locale"?: string,"is_active"?: boolean,"name"?: string,"prices_include_tax"?: boolean,"sort_order"?: number,"supported_locales"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "regions_default_currency_fkey"
      columns: ["default_currency"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"retailer_regions": {
                  Row: {
                    "currency_code": string,"delivery_days_max": number | null,"delivery_days_min": number | null,"free_shipping_over": number | null,"is_active": boolean,"region_code": string,"retailer_id": string,"shipping_cost": number
                  }
                  ComputedFields: never
                  Insert: {
                    "currency_code": string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"free_shipping_over"?: number | null,"is_active"?: boolean,"region_code": string,"retailer_id": string,"shipping_cost"?: number
                  }
                  Update: {
                    "currency_code"?: string,"delivery_days_max"?: number | null,"delivery_days_min"?: number | null,"free_shipping_over"?: number | null,"is_active"?: boolean,"region_code"?: string,"retailer_id"?: string,"shipping_cost"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "retailer_regions_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "retailer_regions_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "retailer_regions_retailer_id_fkey"
      columns: ["retailer_id"]
isOneToOne: false
      referencedRelation: "retailers"
      referencedColumns: ["id"]
    }
                  ]
                },"retailers": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"is_marketplace": boolean,"logo_url": string | null,"name": string,"search_url_template": string | null,"slug": string,"updated_at": string,"website_url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_marketplace"?: boolean,"logo_url"?: string | null,"name": string,"search_url_template"?: string | null,"slug": string,"updated_at"?: string,"website_url": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"is_marketplace"?: boolean,"logo_url"?: string | null,"name"?: string,"search_url_template"?: string | null,"slug"?: string,"updated_at"?: string,"website_url"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reviews": {
                  Row: {
                    "author_id": string,"body": string | null,"created_at": string,"id": string,"is_hidden": boolean,"product_id": string,"rating": number,"region_code": string | null,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body"?: string | null,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"product_id": string,"rating": number,"region_code"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string | null,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"product_id"?: string,"rating"?: number,"region_code"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    }
                  ]
                },"search_events": {
                  Row: {
                    "category_slug": string | null,"created_at": string,"id": number,"query": string,"region_code": string | null,"result_count": number | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_slug"?: string | null,"created_at"?: string,"id"?: never,"query": string,"region_code"?: string | null,"result_count"?: number | null,"user_id"?: string | null
                  }
                  Update: {
                    "category_slug"?: string | null,"created_at"?: string,"id"?: never,"query"?: string,"region_code"?: string | null,"result_count"?: number | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "search_events_category_slug_fkey"
      columns: ["category_slug"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "search_events_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "search_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "build_id": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["submission_kind"],"message": string | null,"offer_id": string | null,"payload": NonNullable<Json>,"product_id": string | null,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["submission_status"],"submitted_by": string
                  }
                  ComputedFields: never
                  Insert: {
                    "build_id"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["submission_kind"],"message"?: string | null,"offer_id"?: string | null,"payload"?: NonNullable<Json>,"product_id"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitted_by": string
                  }
                  Update: {
                    "build_id"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["submission_kind"],"message"?: string | null,"offer_id"?: string | null,"payload"?: NonNullable<Json>,"product_id"?: string | null,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["submission_status"],"submitted_by"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_build_id_fkey"
      columns: ["build_id"]
isOneToOne: false
      referencedRelation: "builds"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tax_rules": {
                  Row: {
                    "category_slug": string | null,"created_at": string,"id": string,"name": string,"rate": number,"region_code": string,"valid_from": string,"valid_to": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_slug"?: string | null,"created_at"?: string,"id"?: string,"name": string,"rate": number,"region_code": string,"valid_from": string,"valid_to"?: string | null
                  }
                  Update: {
                    "category_slug"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"rate"?: number,"region_code"?: string,"valid_from"?: string,"valid_to"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tax_rules_category_slug_fkey"
      columns: ["category_slug"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["slug"]
    },{
      foreignKeyName: "tax_rules_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    }
                  ]
                }
          }
          Views: {
            "product_rating_summaries": {
                  Row: {
                    "average_rating": number | null,"product_id": string,"review_count": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "reviews_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"variant_region_prices": {
                  Row: {
                    "currency_code": string,"has_retail_offer": boolean | null,"in_stock_count": number | null,"last_checked_at": string | null,"max_price": number | null,"min_in_stock_price": number | null,"min_price": number | null,"offer_count": number | null,"region_code": string,"variant_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "offers_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "offers_region_code_fkey"
      columns: ["region_code"]
isOneToOne: false
      referencedRelation: "regions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "offers_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "can_view_build":
{ Args: { "p_build_id": string }; Returns: boolean
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"owns_build":
{ Args: { "p_build_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "alert_type": "price_drop"|"back_in_stock","build_visibility": "private"|"unlisted"|"public","listing_type": "retail"|"marketplace","product_status": "draft"|"published"|"archived","rule_severity": "error"|"warning"|"info","stock_status": "in_stock"|"low_stock"|"out_of_stock"|"preorder"|"backorder"|"unknown","submission_kind": "new_product"|"correction"|"report","submission_status": "pending"|"approved"|"rejected","use_case": "gaming"|"productivity"|"streaming"|"content_creation"|"workstation"|"home_office","user_role": "user"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "alert_type": ["price_drop", "back_in_stock"],"build_visibility": ["private", "unlisted", "public"],"listing_type": ["retail", "marketplace"],"product_status": ["draft", "published", "archived"],"rule_severity": ["error", "warning", "info"],"stock_status": ["in_stock", "low_stock", "out_of_stock", "preorder", "backorder", "unknown"],"submission_kind": ["new_product", "correction", "report"],"submission_status": ["pending", "approved", "rejected"],"use_case": ["gaming", "productivity", "streaming", "content_creation", "workstation", "home_office"],"user_role": ["user", "admin"]
          }
        }
} as const
