import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { CartItemModifier } from '@/types/cart';
import type { Item, ModifierGroupWithOptions } from '@/types/database';
import { formatCurrency } from '@/lib/calculations';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';

interface ModifierModalProps {
  item: (Item & { modifier_groups: ModifierGroupWithOptions[] }) | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (payload: { modifiers: CartItemModifier[]; quantity: number }) => void;
}

export function ModifierModal({
  item,
  open,
  onClose,
  onAddToCart,
}: ModifierModalProps) {
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!item || !open) return;

    const defaults: Record<string, string[]> = {};
    for (const group of item.modifier_groups) {
      if (group.is_required && group.selection_type === 'choose_one' && group.options.length > 0) {
        defaults[group.id] = [group.options[0].id];
      }
    }
    setSelectedModifiers(defaults);
    setQuantity(1);
  }, [item, open]);

  const validationErrors = useMemo(() => {
    if (!item) return [];

    return item.modifier_groups.flatMap((group) => {
      const selected = selectedModifiers[group.id] || [];
      if (selected.length < group.min_selections) {
        return [`${group.name}: select at least ${group.min_selections}`];
      }
      if (group.max_selections && selected.length > group.max_selections) {
        return [`${group.name}: select no more than ${group.max_selections}`];
      }
      if (group.is_required && selected.length === 0) {
        return [`${group.name}: selection required`];
      }
      return [];
    });
  }, [item, selectedModifiers]);

  const selectedModifierRecords = useMemo<CartItemModifier[]>(() => {
    if (!item) return [];

    return item.modifier_groups.flatMap((group) => {
      const selectedIds = selectedModifiers[group.id] || [];
      return selectedIds
        .map((optionId) => group.options.find((option) => option.id === optionId))
        .filter(Boolean)
        .map((option) => ({
          modifier_group_id: group.id,
          modifier_group_name: group.name,
          option_id: option!.id,
          option_name: option!.name,
          price_adjustment: option!.price_adjustment,
        }));
    });
  }, [item, selectedModifiers]);

  const unitPrice = useMemo(() => {
    const basePrice = item?.base_price || 0;
    const modifierTotal = selectedModifierRecords.reduce((sum, modifier) => sum + modifier.price_adjustment, 0);
    return basePrice + modifierTotal;
  }, [item, selectedModifierRecords]);

  const canSubmit = validationErrors.length === 0;

  const handleRadioChange = (groupId: string, optionId: string) => {
    setSelectedModifiers((current) => ({
      ...current,
      [groupId]: [optionId],
    }));
  };

  const handleCheckboxChange = (
    group: ModifierGroupWithOptions,
    optionId: string,
    checked: boolean
  ) => {
    setSelectedModifiers((current) => {
      const existing = current[group.id] || [];
      const next = checked
        ? [...existing, optionId]
        : existing.filter((value) => value !== optionId);

      if (group.max_selections && next.length > group.max_selections) {
        return current;
      }

      return {
        ...current,
        [group.id]: next,
      };
    });
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAddToCart({
      modifiers: selectedModifierRecords,
      quantity,
    });
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3">
            <span>{item.name}</span>
            <span className="text-base font-semibold text-primary">{formatCurrency(unitPrice)}</span>
          </DialogTitle>
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
          {item.modifier_groups.map((group) => {
            const selected = selectedModifiers[group.id] || [];
            const helperText =
              group.selection_type === 'choose_one'
                ? 'Choose one'
                : group.max_selections
                  ? `Choose ${group.min_selections} to ${group.max_selections}`
                  : `Choose at least ${group.min_selections}`;

            return (
              <div key={group.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{group.name}</h3>
                  {group.is_required && (
                    <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                      Required
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{helperText}</span>
                </div>

                {group.selection_type === 'choose_one' ? (
                  <RadioGroup
                    value={selected[0]}
                    onValueChange={(value) => handleRadioChange(group.id, value)}
                  >
                    {group.options.map((option) => (
                      <label
                        key={option.id}
                        htmlFor={`modifier-${group.id}-${option.id}`}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:border-primary"
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem id={`modifier-${group.id}-${option.id}`} value={option.id} />
                          <span className="text-sm text-foreground">{option.name}</span>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {option.price_adjustment > 0 ? '+' : ''}
                          {formatCurrency(option.price_adjustment)}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    {group.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`modifier-${group.id}-${option.id}`}
                            checked={selected.includes(option.id)}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(group, option.id, Boolean(checked))
                            }
                          />
                          <Label
                            htmlFor={`modifier-${group.id}-${option.id}`}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {option.name}
                          </Label>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {option.price_adjustment > 0 ? '+' : ''}
                          {formatCurrency(option.price_adjustment)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {validationErrors.length > 0 && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {validationErrors[0]}
          </div>
        )}

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">Quantity</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((current) => current + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              Add {quantity} • {formatCurrency(unitPrice * quantity)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
