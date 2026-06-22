'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Trash2, Copy, GripVertical, ChevronDown, ChevronUp,
  Key, Package, Repeat, Crown, Users
} from 'lucide-react'

export interface Variant {
  id: string
  variant_type: 'license' | 'wholesale' | 'subscription' | 'package' | 'membership'
  name: string
  price: string
  description: string
  duration_days: string
  device_limit: string
  min_quantity: string
  max_quantity: string
  billing_period: 'monthly' | 'quarterly' | 'yearly' | ''
  subscription_duration: string
  feature_list: string[]
  access_duration_days: string
  benefits: string[]
  sort_order: number
  is_expanded: boolean
}

interface VariantEditorProps {
  productId?: string
  variantsEnabled: boolean
  onVariantsEnabledChange: (enabled: boolean) => void
  variants: Variant[]
  onVariantsChange: (variants: Variant[]) => void
}

const VARIANT_TYPES = [
  { value: 'license', label: 'License', icon: Key },
  { value: 'wholesale', label: 'Wholesale', icon: Users },
  { value: 'subscription', label: 'Subscription', icon: Repeat },
  { value: 'package', label: 'Package', icon: Package },
  { value: 'membership', label: 'Membership', icon: Crown },
] as const

function createNewVariant(sortOrder: number): Variant {
  return {
    id: `new-${Math.random().toString(36).substring(2, 9)}`,
    variant_type: 'license',
    name: '',
    price: '',
    description: '',
    duration_days: '',
    device_limit: '',
    min_quantity: '',
    max_quantity: '',
    billing_period: '',
    subscription_duration: '',
    feature_list: [],
    access_duration_days: '',
    benefits: [],
    sort_order: sortOrder,
    is_expanded: true,
  }
}

function SortableVariantCard({
  variant,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  onToggleExpand,
}: {
  variant: Variant
  index: number
  onUpdate: (variant: Variant) => void
  onDelete: () => void
  onDuplicate: () => void
  onToggleExpand: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variant.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const variantType = VARIANT_TYPES.find((t) => t.value === variant.variant_type)
  const IconComponent = variantType?.icon || Key

  const renderFields = () => {
    switch (variant.variant_type) {
      case 'license':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duration (Days) *</Label>
                <Input
                  type="number"
                  value={variant.duration_days}
                  onChange={(e) => onUpdate({ ...variant, duration_days: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Device Limit</Label>
                <Input
                  type="number"
                  value={variant.device_limit}
                  onChange={(e) => onUpdate({ ...variant, device_limit: e.target.value })}
                  placeholder="1"
                />
              </div>
            </div>
          </>
        )
      case 'wholesale':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Min Quantity *</Label>
                <Input
                  type="number"
                  value={variant.min_quantity}
                  onChange={(e) => onUpdate({ ...variant, min_quantity: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Quantity</Label>
                <Input
                  type="number"
                  value={variant.max_quantity}
                  onChange={(e) => onUpdate({ ...variant, max_quantity: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>
          </>
        )
      case 'subscription':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Billing Period *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={variant.billing_period}
                  onChange={(e) => onUpdate({ ...variant, billing_period: e.target.value as any })}
                >
                  <option value="">Select</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (Days)</Label>
                <Input
                  type="number"
                  value={variant.subscription_duration}
                  onChange={(e) => onUpdate({ ...variant, subscription_duration: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>
          </>
        )
      case 'package':
        return (
          <div className="space-y-2">
            <Label className="text-xs">Features</Label>
            {variant.feature_list.map((feature, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={feature}
                  onChange={(e) => {
                    const newList = [...variant.feature_list]
                    newList[i] = e.target.value
                    onUpdate({ ...variant, feature_list: newList })
                  }}
                  placeholder="Feature name"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newList = variant.feature_list.filter((_, idx) => idx !== i)
                    onUpdate({ ...variant, feature_list: newList })
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onUpdate({ ...variant, feature_list: [...variant.feature_list, ''] })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Feature
            </Button>
          </div>
        )
      case 'membership':
        return (
          <>
            <div className="space-y-2">
              <Label className="text-xs">Access Duration (Days)</Label>
              <Input
                type="number"
                value={variant.access_duration_days}
                onChange={(e) => onUpdate({ ...variant, access_duration_days: e.target.value })}
                placeholder="365"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Benefits</Label>
              {variant.benefits.map((benefit, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={benefit}
                    onChange={(e) => {
                      const newList = [...variant.benefits]
                      newList[i] = e.target.value
                      onUpdate({ ...variant, benefits: newList })
                    }}
                    placeholder="Benefit"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newList = variant.benefits.filter((_, idx) => idx !== i)
                      onUpdate({ ...variant, benefits: newList })
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onUpdate({ ...variant, benefits: [...variant.benefits, ''] })}
              >
                <Plus className="h-3 w-3 mr-1" /> Add Benefit
              </Button>
            </div>
          </>
        )
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg bg-background overflow-hidden"
    >
      <div
        className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer"
        onClick={onToggleExpand}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <IconComponent className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">
            {variant.name || `Variant ${index + 1}`}
          </span>
          <span className="text-sm text-muted-foreground">
            {variant.price ? `$${variant.price}` : 'No price'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDuplicate()
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {variant.is_expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {variant.is_expanded && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Variant Type *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={variant.variant_type}
                onChange={(e) =>
                  onUpdate({ ...variant, variant_type: e.target.value as Variant['variant_type'] })
                }
              >
                {VARIANT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Variant Name *</Label>
              <Input
                value={variant.name}
                onChange={(e) => onUpdate({ ...variant, name: e.target.value })}
                placeholder="e.g., License 30 Days"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Price *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={variant.price}
                onChange={(e) => onUpdate({ ...variant, price: e.target.value })}
                placeholder="99.00"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={variant.description}
              onChange={(e) => onUpdate({ ...variant, description: e.target.value })}
              placeholder="Describe this variant..."
              rows={2}
            />
          </div>
          {renderFields()}
        </div>
      )}
    </div>
  )
}

export function VariantEditor({
  productId,
  variantsEnabled,
  onVariantsEnabledChange,
  variants,
  onVariantsChange,
}: VariantEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = variants.findIndex((item) => item.id === active.id)
      const newIndex = variants.findIndex((item) => item.id === over.id)
      const newItems = arrayMove(variants, oldIndex, newIndex)
      onVariantsChange(newItems.map((item, idx) => ({ ...item, sort_order: idx })))
    }
  }

  const addVariant = () => {
    const newVariant = createNewVariant(variants.length)
    onVariantsChange([...variants, newVariant])
  }

  const updateVariant = (updatedVariant: Variant) => {
    onVariantsChange(variants.map((v) => (v.id === updatedVariant.id ? updatedVariant : v)))
  }

  const deleteVariant = (id: string) => {
    onVariantsChange(variants.filter((v) => v.id !== id))
  }

  const duplicateVariant = (id: string) => {
    const variant = variants.find((v) => v.id === id)
    if (!variant) return
    const index = variants.findIndex((v) => v.id === id)
    const newVariant: Variant = {
      ...variant,
      id: `new-${Math.random().toString(36).substring(2, 9)}`,
      name: `${variant.name} (Copy)`,
      sort_order: variants.length,
      is_expanded: true,
    }
    const newVariants = [...variants]
    newVariants.splice(index + 1, 0, newVariant)
    onVariantsChange(newVariants.map((v, idx) => ({ ...v, sort_order: idx })))
  }

  const toggleExpand = (id: string) => {
    onVariantsChange(
      variants.map((v) => (v.id === id ? { ...v, is_expanded: !v.is_expanded } : v))
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/20">
        <input
          type="checkbox"
          id="variants_enabled"
          checked={variantsEnabled}
          onChange={(e) => onVariantsEnabledChange(e.target.checked)}
          className="h-4 w-4"
        />
        <div>
          <Label htmlFor="variants_enabled" className="font-medium">
            Enable Product Variants
          </Label>
          <p className="text-xs text-muted-foreground">
            Offer multiple pricing options for this product
          </p>
        </div>
      </div>

      {variantsEnabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Variants</h4>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>
              <Plus className="h-4 w-4 mr-1" /> Add Variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No variants yet. Click &quot;Add Variant&quot; to get started.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={variants.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {variants.map((variant, index) => (
                    <SortableVariantCard
                      key={variant.id}
                      variant={variant}
                      index={index}
                      onUpdate={updateVariant}
                      onDelete={() => deleteVariant(variant.id)}
                      onDuplicate={() => duplicateVariant(variant.id)}
                      onToggleExpand={() => toggleExpand(variant.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  )
}

export function validateVariants(variants: Variant[]): string | null {
  for (const v of variants) {
    if (!v.name.trim()) return 'Variant name is required'
    if (!v.variant_type) return 'Variant type is required'
    if (!v.price || parseFloat(v.price) < 0) return 'Variant price must be 0 or greater'

    switch (v.variant_type) {
      case 'license':
        if (!v.duration_days || parseInt(v.duration_days) <= 0)
          return `License duration is required for "${v.name}"`
        break
      case 'wholesale':
        if (!v.min_quantity || parseInt(v.min_quantity) <= 0)
          return `Min quantity is required for "${v.name}"`
        break
      case 'subscription':
        if (!v.billing_period) return `Billing period is required for "${v.name}"`
        break
    }
  }
  return null
}

export function prepareVariantForSave(variant: Variant, productId: string, sortOrder: number) {
  const base: Record<string, any> = {
    product_id: productId,
    variant_type: variant.variant_type,
    name: variant.name,
    price: parseFloat(variant.price) || 0,
    description: variant.description || null,
    sort_order: sortOrder,
    is_active: true,
  }

  switch (variant.variant_type) {
    case 'license':
      base.duration_days = parseInt(variant.duration_days) || null
      base.device_limit = parseInt(variant.device_limit) || null
      break
    case 'wholesale':
      base.min_quantity = parseInt(variant.min_quantity) || null
      base.max_quantity = parseInt(variant.max_quantity) || null
      break
    case 'subscription':
      base.billing_period = variant.billing_period || null
      base.subscription_duration = parseInt(variant.subscription_duration) || null
      break
    case 'package':
      base.feature_list = variant.feature_list.filter((f) => f.trim())
      break
    case 'membership':
      base.access_duration_days = parseInt(variant.access_duration_days) || null
      base.benefits = variant.benefits.filter((b) => b.trim())
      break
  }

  // Only include id for existing variants (updates)
  // Let Supabase auto-generate UUID for new variants
  if (!variant.id.startsWith('new-')) {
    base.id = variant.id
  }

  return base
}
