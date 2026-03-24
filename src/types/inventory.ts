export type UOM = 'Kg' | 'Pcs' | 'Mtr' | 'Sqft' | 'Ltr';
export type ItemCategory = 'Raw Material' | 'Finished Good' | 'Consumable' | 'Hardware';

export interface InventoryItem {
  itemId: string;           // SMC-XXXX
  itemName: string;
  category: ItemCategory;
  dimensions: string;
  currentStock: number;
  uom: UOM;
  minAlertLevel: number;
  locationBin: string;
  // Computed fields (populated by calculations layer)
  committedQty?: number;
  availableQty?: number;
  lastPurchase?: string;
  avgMonthlyUse?: number;
  reorderQty?: number;
}
